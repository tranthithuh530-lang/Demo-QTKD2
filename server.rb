
#!/usr/bin/env ruby
# encoding: UTF-8
require 'webrick'
require 'fileutils'
require 'json'
require 'net/http'
require 'uri'
require 'base64'
require 'tempfile'
require 'ipaddr'
require 'resolv'

root = File.expand_path(File.dirname(__FILE__))
env_path = File.join(root, '.env')

# Load .env configuration cleanly
config = {
  'MINHAN_API_KEY' => ENV['MINHAN_API_KEY'] || ENV['GEMINI_API_KEY'] || '',
  'GEMINI_MODEL' => ENV['GEMINI_MODEL'] || 'gemini-3-flash-preview',
  'PORT' => ENV['PORT'] || '8000',
  'LARK_APP_ID' => ENV['LARK_APP_ID'] || '',
  'LARK_APP_SECRET' => ENV['LARK_APP_SECRET'] || '',
  'LARK_BASE_TOKEN' => ENV['LARK_BASE_TOKEN'] || '',
  'LARK_TABLE_ID' => ENV['LARK_TABLE_ID'] || ''
}

def reload_env_config(path, cfg)
  return unless File.exist?(path)
  File.readlines(path, encoding: 'UTF-8').each do |line|
    clean = line.strip
    next if clean.empty? || clean.start_with?('#')
    key, val = clean.split('=', 2)
    cfg[key.strip] = val.strip if key && val
  end
end

reload_env_config(env_path, config)

port = (config['PORT'] || '8000').to_i

def mask_key(key)
  k = key.to_s.strip
  return 'Chưa cấu hình' if k.empty?
  return '***' if k.length <= 10
  "#{k[0, 7]}...#{k[-4, 4]}"
end

def json_response(res, status_code, payload)
  res.status = status_code
  res['Content-Type'] = 'application/json; charset=UTF-8'
  res['Cache-Control'] = 'no-store'
  res.body = JSON.generate(payload)
end

MINHAN_SYSTEM_INSTRUCTION = <<~SYS.freeze
  You are the B2B Sales Operation Agent for Minh An Company.
  Execute strictly in the 6-step sequential state machine (never skip steps, never guess numbers/rules, always invoke backend calculation/lookup tools):
  1. Ingestion & Loading: Ingest data from Excel, CSV, or public Lark/Google Sheet links, map semantically into 5 core fields (Product Category/Solution, Quantity, Budget, Implementation Deadline, Requested Discount %), and proceed automatically to Step 2.
  2. Validation & 5-Field Extraction (Condition 1): If any critical field is missing or ambiguous, stop calculation, set status to "Cần bổ sung thông tin", draft customer clarification email, and route back to Step 1. If complete, proceed to Step 3.
  3. Opportunity Profile & Assignment: Initialize Opportunity ID, store normalized data, and assign a Sales Representative (NVKD). Proceed to Step 4.
  4. Inventory & Pricing Appraisal: Call lookup tools to check unit prices, available stock, and fulfillment lead times. Proceed to Step 5.
  5. Proposal Calculation & Authorization Check (Condition 2): Calculate total proposal value, apply discount & MG% policies; if exceeding limit/special discount, set status to "Chờ duyệt" + Manager Approval Slip; else "Đủ điều kiện tiếp tục". Proceed to Step 6.
  6. Logging & Reporting (End Node): Output opportunity profiles, priority tiers (VIP / Hạng A / B / C), financial KPI/MG%, customer drafts, approval slips, and append an audit trail log (.json) recording all tool calls and rule applications.
SYS

def call_gemini_generate(api_key, model, prompt_or_parts, expect_json = true)
  return { ok: false, status: 400, error: 'API key chưa được cấu hình' } if api_key.to_s.strip.empty?

  parts = prompt_or_parts.is_a?(Array) ? prompt_or_parts : [{ text: prompt_or_parts.to_s }]

  endpoints = [
    {
      name: 'Gemini API (generativelanguage.googleapis.com)',
      url: "https://generativelanguage.googleapis.com/v1beta/models/#{URI.encode_www_form_component(model)}:generateContent?key=#{URI.encode_www_form_component(api_key)}"
    },
    {
      name: 'Vertex AI Express (aiplatform.googleapis.com)',
      url: "https://aiplatform.googleapis.com/v1/publishers/google/models/#{URI.encode_www_form_component(model)}:generateContent?key=#{URI.encode_www_form_component(api_key)}"
    }
  ]

  body_obj = {
    systemInstruction: {
      parts: [{ text: MINHAN_SYSTEM_INSTRUCTION }]
    },
    contents: [
      {
        role: 'user',
        parts: parts
      }
    ],
    generationConfig: {
      temperature: 0.15
    }
  }
  body_obj[:generationConfig][:responseMimeType] = 'application/json' if expect_json
  body_json = JSON.generate(body_obj)

  last_err = nil
  endpoints.each do |ep|
    uri = URI.parse(ep[:url])
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    http.open_timeout = 8
    http.read_timeout = 22

    req = Net::HTTP::Post.new(uri.request_uri)
    req['Content-Type'] = 'application/json'
    req.body = body_json

    begin
      resp = http.request(req)
      code = resp.code.to_i
      parsed = begin
        JSON.parse(resp.body)
      rescue StandardError
        { 'raw' => resp.body.to_s[0, 500] }
      end

      if code >= 200 && code < 300
        text = parsed.dig('candidates', 0, 'content', 'parts', 0, 'text').to_s
        return {
          ok: true,
          status: code,
          endpoint: ep[:name],
          model: model,
          text: text
        }
      else
        err_msg = parsed.dig('error', 'message') || "HTTP #{code}"
        last_err = { ok: false, status: code, endpoint: ep[:name], error: err_msg }
      end
    rescue StandardError => e
      last_err = { ok: false, status: 502, endpoint: ep[:name], error: e.message }
    end
  end

  last_err || { ok: false, status: 500, error: 'Không thể kết nối tới API' }
end

mime_types = WEBrick::HTTPUtils::DefaultMimeTypes
mime_types.store 'js', 'application/javascript'
mime_types.store 'css', 'text/css'
mime_types.store 'json', 'application/json'
mime_types.store 'png', 'image/png'
mime_types.store 'jpg', 'image/jpeg'
mime_types.store 'svg', 'image/svg+xml'

server = WEBrick::HTTPServer.new(
  :Port => port,
  :DocumentRoot => root,
  :MimeTypes => mime_types,
  :BindAddress => '127.0.0.1',
  :AccessLog => [],
  :Logger => WEBrick::Log.new(nil, WEBrick::BasicLog::WARN)
)

server.mount_proc '/api/status' do |req, res|
  reload_env_config(env_path, config)
  key = config['MINHAN_API_KEY'].to_s.strip
  lark_id = config['LARK_APP_ID'].to_s.strip
  json_response(res, 200, {
    ok: true,
    configured: !key.empty?,
    maskedKey: mask_key(key),
    model: config['GEMINI_MODEL'] || 'gemini-3-flash-preview',
    provider: 'Google AI / Gemini API',
    larkConfigured: !lark_id.empty?,
    larkAppId: mask_key(lark_id),
    larkBaseToken: mask_key(config['LARK_BASE_TOKEN']),
    larkTableId: config['LARK_TABLE_ID'].to_s
  })
end

server.mount_proc '/api/config' do |req, res|
  unless req.request_method == 'POST'
    next json_response(res, 405, { ok: false, error: 'Method Not Allowed' })
  end

  begin
    payload = JSON.parse(req.body.to_s)
    new_key = payload['apiKey'].to_s.strip.sub(/\.+\z/, '')
    new_model = payload['model'].to_s.strip

    config['MINHAN_API_KEY'] = new_key unless new_key.empty?
    config['GEMINI_MODEL'] = new_model unless new_model.empty?
    config['LARK_APP_ID'] = payload['larkAppId'].to_s.strip if payload.key?('larkAppId')
    config['LARK_APP_SECRET'] = payload['larkAppSecret'].to_s.strip if payload.key?('larkAppSecret')
    config['LARK_BASE_TOKEN'] = payload['larkBaseToken'].to_s.strip if payload.key?('larkBaseToken')
    config['LARK_TABLE_ID'] = payload['larkTableId'].to_s.strip if payload.key?('larkTableId')

    env_lines = [
      "MINHAN_API_KEY=#{config['MINHAN_API_KEY']}",
      "GEMINI_MODEL=#{config['GEMINI_MODEL']}",
      "PORT=#{port}",
      "LARK_APP_ID=#{config['LARK_APP_ID']}",
      "LARK_APP_SECRET=#{config['LARK_APP_SECRET']}",
      "LARK_BASE_TOKEN=#{config['LARK_BASE_TOKEN']}",
      "LARK_TABLE_ID=#{config['LARK_TABLE_ID']}"
    ].join("\n") + "\n"

    File.write(env_path, env_lines)
    json_response(res, 200, {
      ok: true,
      configured: !config['MINHAN_API_KEY'].to_s.empty?,
      maskedKey: mask_key(config['MINHAN_API_KEY']),
      model: config['GEMINI_MODEL'],
      larkConfigured: !config['LARK_APP_ID'].to_s.empty?
    })
  rescue StandardError => e
    json_response(res, 400, { ok: false, error: e.message })
  end
end

server.mount_proc '/api/test' do |req, res|
  t0 = Process.clock_gettime(Process::CLOCK_MONOTONIC)
  result = call_gemini_generate(
    config['MINHAN_API_KEY'],
    config['GEMINI_MODEL'],
    'Trả lời duy nhất JSON {"status":"ok","service":"Minh An B2B Agent"}',
    true
  )
  elapsed_ms = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - t0) * 1000).round
  result[:latencyMs] = elapsed_ms
  json_response(res, result[:ok] ? 200 : 200, result)
end

audit_trail_path = File.join(root, 'audit_trail.json')
audit_mutex = Mutex.new

server.mount_proc '/api/audit-log' do |req, res|
  if req.request_method == 'GET'
    entries = audit_mutex.synchronize do
      if File.exist?(audit_trail_path)
        begin
          JSON.parse(File.read(audit_trail_path, encoding: 'UTF-8'))
        rescue StandardError
          []
        end
      else
        []
      end
    end
    next json_response(res, 200, { ok: true, count: entries.length, entries: entries })
  end

  unless req.request_method == 'POST'
    next json_response(res, 405, { ok: false, error: 'Method Not Allowed' })
  end

  begin
    payload = JSON.parse(req.body.to_s)
    total_count = 0
    audit_mutex.synchronize do
      existing = if File.exist?(audit_trail_path)
                   begin
                     JSON.parse(File.read(audit_trail_path, encoding: 'UTF-8'))
                   rescue StandardError
                     []
                   end
                 else
                   []
                 end
      existing = [] unless existing.is_a?(Array)
      existing.unshift(payload)
      existing = existing.first(500)
      File.write(audit_trail_path, JSON.pretty_generate(existing), encoding: 'UTF-8')
      total_count = existing.length
    end
    json_response(res, 200, { ok: true, savedCount: total_count, file: 'audit_trail.json' })
  rescue StandardError => e
    json_response(res, 400, { ok: false, error: e.message })
  end
end

server.mount_proc '/api/agent' do |req, res|
  unless req.request_method == 'POST'
    next json_response(res, 405, { ok: false, error: 'Method Not Allowed' })
  end

  begin
    payload = JSON.parse(req.body.to_s)
    action = payload['action'].to_s
    data = payload['data'] || {}
    model = config['GEMINI_MODEL']

    prompt = case action
             when 'extract_and_validate'
               catalog = (data['catalog'] || []).map { |c| "- #{c['sku']}: #{c['name']} (#{c['category']})" }.join("\n")
               raw_row_json = data['rawRowJson']
               row_section = raw_row_json && !raw_row_json.to_s.strip.empty? ? "Dữ liệu dòng khách hàng dạng JSON thô:\n#{raw_row_json}\n\n" : ''
               today_str = (data['today'] && !data['today'].to_s.strip.empty?) ? data['today'].to_s : Time.now.strftime('%Y-%m-%d')
               <<~PROMPT
                 Bạn là AI Agent B2B của Công ty Minh An (Hôm nay là #{today_str}). Hãy quét TOÀN BỘ các cột trong dữ liệu JSON thô của dòng khách hàng (kể cả cột Ghi chú / Mô tả / Yêu cầu / Note / Description) và nội dung yêu cầu, tự suy luận theo ngữ nghĩa để bóc tách chính xác 7 trường thông tin dưới dạng JSON thuần (không markdown) theo đúng schema sau:
                 {
                   "ten_khach_hang": "Tên khách hàng / Tên công ty tìm được (tuyệt đối KHÔNG lấy mã số ID thuần số như 977966899 nếu có tên công ty/khách hàng) hoặc null",
                   "danh_muc_san_pham": "Tên sản phẩm / giải pháp tìm được hoặc null",
                   "so_luong": số_nguyên_hoặc_null,
                   "ngan_sach": số_tiền_VND_đã_quy_đổi_hoặc_null,
                   "thoi_han_trien_khai": "Mốc thời gian hoặc số ngày triển khai tìm được (VD: '15 ngày', 'trong tuần này', 'tháng tới', 'Q4', 'gấp', '2026-12-15') hoặc null",
                   "de_nghi_chiet_khau": số_phần_trăm_hoặc_0,
                   "nguoi_phu_trach": "Họ tên nhân viên / người phụ trách (tuyệt đối KHÔNG lấy số tiền, doanh số hay mã số như 24450000) hoặc null",
                   "items": [{"sku": "SKU khớp nhất hoặc CUSTOM", "name": "tên sản phẩm", "qty": số_nguyên_hoặc_0_nếu_thiếu}],
                   "category": "Hạ tầng & Bảo mật" | "Thiết bị Văn phòng" | "Phần mềm & Dịch vụ",
                   "summaryNote": "tóm tắt 1 câu"
                 }
                 Quy tắc bắt buộc khi bóc tách:
                 1. Mặc định chiết khấu = 0%: Nếu toàn bộ dữ liệu khách hàng KHÔNG đề cập đến chiết khấu / giảm giá / discount / CK / % giảm, BẮT BUỘC trả về "de_nghi_chiet_khau": 0 (TUYỆT ĐỐI không trả về null).
                 2. Suy luận thông minh Ngân sách & Thời hạn từ TẤT CẢ các cột (kể cả Ghi chú, Mô tả, Yêu cầu, Note, Budget, Giá trị...):
                    - Quét tìm mọi số tiền kèm đơn vị/ngữ cảnh (VNĐ, đ, triệu, tr, tỷ, budget, ngân sách, giá trị đơn, tổng tiền...) để quy đổi thành số nguyên VND gán vào "ngan_sach" (VD: "24.45 triệu" -> 24450000, "1.2 tỷ" -> 1200000000).
                    - Quét tìm mọi mốc thời gian (ngày/tháng/năm, "X ngày", "X tuần", "trong tuần này", "tuần sau", "tháng này", "tháng tới", "Q1/Q2/Q3/Q4", "gấp", "hỏa tốc", "ngay"...) để gán vào "thoi_han_trien_khai".
                 3. Tên khách hàng (ten_khach_hang): Ưu tiên cột Tên khách hàng / Tên công ty / Company Name / Client Name; tuyệt đối không lấy dãy số ID (ví dụ 977966899) làm tên khách hàng nếu trong dữ liệu có tên công ty hoặc tên khách.
                 4. Người phụ trách (nguoi_phu_trach): Tuyệt đối không nhầm cột doanh số/giá trị/Sales Amount (ví dụ 24450000) thành nguoi_phu_trach. Nếu chỉ thấy số thì trả về null.
                 Danh mục sản phẩm chuẩn Minh An:
                 #{catalog}

                 #{row_section}Nội dung yêu cầu khách hàng:
                 #{data['rawText']}
               PROMPT
             when 'polish_email'
               <<~PROMPT
                 Bạn là chuyên viên B2B Công ty Minh An. Hãy viết bản nháp email tiếng Việt chuyên nghiệp, lịch sự dựa trên dữ liệu sau (trả JSON {"email": "nội dung email"}):
                 Khách hàng: #{data['company']}
                 Loại email: #{data['kind']}
                 Thông tin chi tiết: #{data['context']}
               PROMPT
             when 'analyze_dataset'
               headers = Array(data['headers']).join(', ')
               sample_rows = JSON.generate(Array(data['sampleRows']).first(5))
               <<~PROMPT
                 Bạn là Chuyên gia Dữ liệu & AI Agent của Công ty Minh An. Hãy phân tích tiêu đề cột và dữ liệu mẫu từ file (Excel / Lark / CSV / JSON / TSV) dưới đây và ánh xạ chuẩn xác sang schema xử lý cơ hội & doanh thu B2B dưới dạng JSON thuần.
                 Quy tắc ánh xạ linh hoạt đa ngôn ngữ (tiếng Việt, tiếng Anh, viết tắt):
                 - "company": Tìm cột khách hàng (Buyer, Customer, Client, KH, Tên KH, Đối tác, Đơn vị, Company Name...). Tuyệt đối KHÔNG chọn cột ID/Mã KH thuần số như 977966899.
                 - "product": Tìm cột sản phẩm / giải pháp (Product, Solution, Item, Hạng mục, Gói thiết bị, Tên SP, SP, Package, Dịch vụ...).
                 - "qty": Tìm cột số lượng (Quantity, Units, Volume, SL, Count, Pcs...).
                 - "budget": Tìm cột ngân sách / dự trù / kinh phí (Budget, Kinh phí, Dự toán, Dự trù, NS...).
                 - "revenue": Tìm cột doanh thu / thành tiền / giá trị (Amount, Total, Total Amount, Doanh thu, Thành tiền, Giá trị...).
                 - "cost": Tìm cột chi phí / giá vốn (Cost, Chi phí, Giá vốn...).
                 - "discount": Tìm cột chiết khấu (Discount, Rebate, CK, CK%, Chiết khấu, % giảm giá, Ưu đãi...).
                 - "days": Tìm cột thời hạn / tiến độ / hạn giao (Timeline, Delivery, Deadline, Due Date, Thời hạn, Hạn, Hạn hoàn thành, Số ngày, SLA...).
                 - "owner": Tìm cột người phụ trách / NVKD (Sales Rep, Sales Owner, PIC, NVKD, Account Manager, Chuyên viên phụ trách, Người phụ trách). TUYỆT ĐỐI KHÔNG chọn cột số tiền, doanh số hay giá trị (như Sales Amount, Doanh số, 24450000). Nếu chỉ thấy số tiền hoặc không có cột NVKD thì trả về null.
                 - Cột nào không tìm thấy khớp thì để null.
                 Schema JSON trả về:
                 {
                   "datasetKind": "opportunities" | "revenue_report" | "catalog" | "mixed",
                   "recommendedGroupField": "owner" | "category" | "channel" | "statusLabel" | "priorityTier",
                   "datasetSummary": "Mô tả ngắn gọn 1 câu file này chứa gì",
                   "columnMap": {
                     "company": "tên cột khách hàng hoặc null",
                     "contact": "tên cột email/liên hệ hoặc null",
                     "channel": "tên cột kênh/nguồn hoặc null",
                     "owner": "tên cột NVKD phụ trách (tuyệt đối không lấy cột số tiền) hoặc null",
                     "category": "tên cột nhóm sản phẩm/danh mục hoặc null",
                     "product": "tên cột sản phẩm hoặc null",
                     "qty": "tên cột số lượng hoặc null",
                     "budget": "tên cột ngân sách hoặc null",
                     "revenue": "tên cột doanh thu/giá trị/thành tiền hoặc null",
                     "cost": "tên cột chi phí/giá vốn hoặc null",
                     "discount": "tên cột chiết khấu % hoặc null",
                     "days": "tên cột thời hạn/số ngày hoặc null",
                     "status": "tên cột trạng thái hoặc null",
                     "rawText": "tên cột mô tả yêu cầu chi tiết hoặc null"
                   }
                 }
                 Danh sách cột (headers): #{headers}
                 5 dòng dữ liệu mẫu: #{sample_rows}
               PROMPT
             when 'executive_report'
               <<~PROMPT
                 Bạn là Giám đốc Phân tích Dự án & Tài chính B2B Công ty Minh An. Dựa trên số liệu thống kê tổng hợp từ quy trình 6 bước & dữ liệu file (Excel/Lark/CSV/PDF/Word) sau, hãy phân tích toàn diện dự án, KPI & Biên lợi nhuận MG (%), phân loại tài chính, khách hàng ưu tiên và phân nhóm dữ liệu dưới dạng JSON thuần:
                 {
                   "headline": "1 câu kết luận tổng quan ngắn gọn kèm doanh thu, biên MG% và hiệu suất 6 bước",
                   "financialSummary": ["2 nhận định về Doanh thu, Chi phí, Lợi nhuận, Biên MG% và rủi ro Chiết khấu"],
                   "prioritySummary": ["2 phân loại về Khách hàng ưu tiên (VIP / Hạng A / Hạng B / C) và nhóm dự án trọng điểm"],
                   "highlights": ["2 điểm nổi bật về nhóm dẫn đầu và hiệu suất quy trình 6 bước"],
                   "risks": ["2 rủi ro về chiết khấu vượt 5%, MG < 15%, tồn kho hoặc hồ sơ dừng Bước 2"],
                   "recommendations": ["3 đề xuất hành động cụ thể theo sơ đồ 6 bước cho Ban Giám đốc & NVKD"]
                 }
                 Số liệu thống kê:
                 #{JSON.generate(data)}
               PROMPT
             else
               return json_response(res, 400, { ok: false, error: "Unsupported action: #{action}" })
             end

    res_ai = call_gemini_generate(config['MINHAN_API_KEY'], model, prompt, true)
    if res_ai[:ok]
      parsed_json = begin
        JSON.parse(res_ai[:text].gsub(/\A```json\s*|\s*```\z/, '').strip)
      rescue StandardError
        nil
      end
      json_response(res, 200, {
        ok: true,
        endpoint: res_ai[:endpoint],
        model: res_ai[:model],
        data: parsed_json,
        rawText: res_ai[:text]
      })
    else
      json_response(res, 200, res_ai)
    end
  rescue StandardError => e
    json_response(res, 400, { ok: false, error: e.message })
  end
end

server.mount_proc '/api/parse-file' do |req, res|
  unless req.request_method == 'POST'
    next json_response(res, 405, { ok: false, error: 'Method Not Allowed' })
  end

  begin
    payload = JSON.parse(req.body.to_s)
    file_name = payload['fileName'].to_s
    mime_type = payload['mimeType'].to_s
    base64_data = payload['base64Data'].to_s
    text_content = payload['textContent'].to_s
    catalog = Array(payload['catalog']).map { |c| "- #{c['sku']}: #{c['name']} (#{c['category']})" }.join("\n")
    ext = File.extname(file_name).downcase

    # Extract text for Word/RTF binary docs on macOS using textutil
    if text_content.strip.empty? && !base64_data.empty? && %w[.docx .doc .rtf .odt].include?(ext)
      raw_bytes = Base64.decode64(base64_data)
      tmp = Tempfile.new(['minhan_upload', ext])
      begin
        tmp.binmode
        tmp.write(raw_bytes)
        tmp.close
        extracted = IO.popen(['/usr/bin/textutil', '-convert', 'txt', '-stdout', tmp.path], &:read)
        text_content = extracted.to_s.force_encoding('UTF-8').scrub
      ensure
        tmp.close! unless tmp.closed?
        tmp.unlink if File.exist?(tmp.path)
      end
    end

    instruction = <<~PROMPT
      Bạn là AI Agent B2B Công ty Minh An. Hãy đọc toàn bộ nội dung tệp "#{file_name}" và trích xuất danh sách TẤT CẢ các dự án / yêu cầu / đơn hàng B2B có trong tệp để đưa vào quy trình 6 bước.
      Trả về duy nhất JSON thuần (không markdown):
      {
        "datasetSummary": "Tóm tắt nội dung tệp 1 câu",
        "recommendedGroupField": "owner" | "category" | "priorityTier" | "projectType" | "channel",
        "records": [
          {
            "company": "Tên khách hàng / công ty",
            "contact": "Email hoặc SĐT nếu có",
            "channel": "Email" | "Lark" | "Excel" | "PDF/Word",
            "owner": "Tên NVKD phụ trách hoặc để trống",
            "category": "Hạ tầng & Bảo mật" | "Thiết bị Văn phòng" | "Phần mềm & Dịch vụ",
            "projectType": "Loại dự án (VD: Hạ tầng Server, Mở rộng Văn phòng, Chuyển đổi số ERP, Bảo mật...)",
            "priorityTier": "VIP" | "Hạng A" | "Hạng B" | "Hạng C",
            "product": "Tên sản phẩm / hạng mục chính",
            "qty": số_lượng_số_nguyên_hoặc_0,
            "budget": ngân_sách_VND_số_nguyên_hoặc_0,
            "revenue": doanh_thu_nếu_có_hoặc_0,
            "cost": chi_phí_nếu_có_hoặc_0,
            "discount": chiết_khấu_phần_trăm_hoặc_null,
            "days": số_ngày_triển_khai_hoặc_0,
            "rawText": "Mô tả đầy đủ yêu cầu của dòng này để kiểm tra 5 trường ở Bước 2"
          }
        ]
      }
      Danh mục sản phẩm chuẩn Minh An:
      #{catalog}
    PROMPT

    parts = if !text_content.strip.empty?
              [{ text: "#{instruction}\n\nNỘI DUNG TỆP:\n#{text_content[0, 30000]}" }]
            elsif !base64_data.empty? && (ext == '.pdf' || mime_type.start_with?('image/'))
              effective_mime = ext == '.pdf' ? 'application/pdf' : mime_type
              [
                { text: instruction },
                { inlineData: { mimeType: effective_mime, data: base64_data } }
              ]
            else
              return json_response(res, 200, { ok: false, error: 'Định dạng tệp chưa có nội dung đọc được', extractedText: '' })
            end

    res_ai = call_gemini_generate(config['MINHAN_API_KEY'], config['GEMINI_MODEL'], parts, true)
    if res_ai[:ok]
      parsed_json = begin
        JSON.parse(res_ai[:text].gsub(/\A```json\s*|\s*```\z/, '').strip)
      rescue StandardError
        nil
      end
      json_response(res, 200, {
        ok: true,
        endpoint: res_ai[:endpoint],
        model: res_ai[:model],
        extractedText: text_content[0, 4000],
        data: parsed_json
      })
    else
      json_response(res, 200, { ok: false, error: res_ai[:error], extractedText: text_content[0, 4000] })
    end
  rescue StandardError => e
    json_response(res, 400, { ok: false, error: e.message })
  end
end

def safe_public_http_uri?(uri)
  return false unless uri.is_a?(URI::HTTP) || uri.is_a?(URI::HTTPS)
  host = uri.host.to_s.strip
  return false if host.empty? || host.downcase == 'localhost'

  addrs = Resolv.getaddresses(host)
  return false if addrs.empty?

  blocked_ranges = [
    IPAddr.new('127.0.0.0/8'),
    IPAddr.new('10.0.0.0/8'),
    IPAddr.new('172.16.0.0/12'),
    IPAddr.new('192.168.0.0/16'),
    IPAddr.new('169.254.0.0/16'),
    IPAddr.new('0.0.0.0/8'),
    IPAddr.new('::1/128'),
    IPAddr.new('fc00::/7'),
    IPAddr.new('fe80::/10')
  ]
  addrs.none? do |addr_str|
    ip = IPAddr.new(addr_str)
    blocked_ranges.any? { |net| net.include?(ip) }
  end
rescue StandardError
  false
end

def normalize_sheet_export_url(raw_url)
  u = raw_url.to_s.strip
  if u =~ %r{https?://docs\.google\.com/spreadsheets/d/([a-zA-Z0-9_-]+)}
    sheet_id = Regexp.last_match(1)
    gid = u =~ /gid=(\d+)/ ? Regexp.last_match(1) : nil
    base = "https://docs.google.com/spreadsheets/d/#{sheet_id}/export?format=csv"
    return gid ? "#{base}&gid=#{gid}" : base
  end
  u
end

server.mount_proc '/api/fetch-url' do |req, res|
  unless req.request_method == 'POST'
    next json_response(res, 405, { ok: false, error: 'Method Not Allowed' })
  end

  begin
    payload = JSON.parse(req.body.to_s)
    raw_url = payload['url'].to_s.strip
    return json_response(res, 400, { ok: false, error: 'Thiếu đường dẫn URL' }) if raw_url.empty?

    target_url = normalize_sheet_export_url(raw_url)
    current_uri = URI.parse(target_url)
    unless safe_public_http_uri?(current_uri)
      return json_response(res, 400, { ok: false, error: 'URL không hợp lệ hoặc thuộc mạng nội bộ không được phép' })
    end

    response = nil
    3.times do
      http = Net::HTTP.new(current_uri.host, current_uri.port)
      http.use_ssl = current_uri.is_a?(URI::HTTPS)
      http.open_timeout = 8
      http.read_timeout = 15

      get_req = Net::HTTP::Get.new(current_uri.request_uri)
      get_req['User-Agent'] = 'MinhAn-B2B-Agent/1.0'
      response = http.request(get_req)

      if response.is_a?(Net::HTTPRedirection) && response['location']
        next_uri = URI.join(current_uri.to_s, response['location'])
        unless safe_public_http_uri?(next_uri)
          return json_response(res, 400, { ok: false, error: 'Redirect tới địa chỉ không hợp lệ' })
        end
        current_uri = next_uri
      else
        break
      end
    end

    code = response ? response.code.to_i : 0
    if code >= 200 && code < 300
      body_utf8 = response.body.to_s.force_encoding('UTF-8').scrub[0, 150_000]
      json_response(res, 200, {
        ok: true,
        resolvedUrl: current_uri.to_s,
        contentType: response['content-type'].to_s,
        content: body_utf8
      })
    else
      json_response(res, 200, { ok: false, error: "Không tải được dữ liệu từ link (HTTP #{code}). Nếu là Google Sheets / Lark, hãy bật quyền xem công khai." })
    end
  rescue StandardError => e
    json_response(res, 400, { ok: false, error: e.message })
  end
end

server.mount_proc '/api/lark/fetch' do |req, res|
  unless req.request_method == 'POST'
    next json_response(res, 405, { ok: false, error: 'Method Not Allowed' })
  end

  begin
    reload_env_config(env_path, config)
    payload = JSON.parse(req.body.to_s)
    raw_url = payload['url'].to_s.strip
    app_token = payload['appToken'].to_s.strip
    table_id = payload['tableId'].to_s.strip

    if !raw_url.empty?
      if raw_url =~ %r{/base/([a-zA-Z0-9_-]+)}
        app_token = Regexp.last_match(1) if app_token.empty?
      end
      if raw_url =~ /[?&]table=([a-zA-Z0-9_-]+)/
        table_id = Regexp.last_match(1) if table_id.empty?
      end
    end

    app_token = config['LARK_BASE_TOKEN'] if app_token.empty? && !config['LARK_BASE_TOKEN'].to_s.empty?
    table_id = config['LARK_TABLE_ID'] if table_id.empty? && !config['LARK_TABLE_ID'].to_s.empty?

    app_id = config['LARK_APP_ID'].to_s.strip
    app_secret = config['LARK_APP_SECRET'].to_s.strip

    if app_id.empty? || app_secret.empty?
      next json_response(res, 200, {
        ok: false,
        error: 'Chưa cấu hình LARK_APP_ID / LARK_APP_SECRET trong file .env. Bạn có thể cập nhật .env hoặc tải tệp CSV xuất từ Lark Base lên thay thế.',
        fallbackToCsv: true
      })
    end

    if app_token.empty? || table_id.empty?
      next json_response(res, 200, {
        ok: false,
        error: 'Thiếu Base Token hoặc Table ID của Lark Base. Vui lòng nhập link Lark Base hoặc điền Base Token & Table ID.',
        fallbackToCsv: true
      })
    end

    token_endpoints = [
      'https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal',
      'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal'
    ]
    tenant_token = nil
    token_err = nil

    token_endpoints.each do |t_url|
      uri = URI.parse(t_url)
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = true
      http.open_timeout = 8
      http.read_timeout = 12

      req_tok = Net::HTTP::Post.new(uri.request_uri)
      req_tok['Content-Type'] = 'application/json'
      req_tok.body = JSON.generate({ app_id: app_id, app_secret: app_secret })

      begin
        resp = http.request(req_tok)
        parsed = JSON.parse(resp.body)
        if parsed['code'] == 0 && parsed['tenant_access_token']
          tenant_token = parsed['tenant_access_token']
          break
        else
          token_err = parsed['msg'] || "HTTP #{resp.code}"
        end
      rescue StandardError => e
        token_err = e.message
      end
    end

    unless tenant_token
      next json_response(res, 200, {
        ok: false,
        error: "Xác thực Lark Open API không thành công: #{token_err}. Bạn có thể tải file CSV export thay thế.",
        fallbackToCsv: true
      })
    end

    records_url = "https://open.larksuite.com/open-apis/bitable/v1/apps/#{app_token}/tables/#{table_id}/records?page_size=100"
    uri_rec = URI.parse(records_url)
    http_rec = Net::HTTP.new(uri_rec.host, uri_rec.port)
    http_rec.use_ssl = true
    http_rec.open_timeout = 8
    http_rec.read_timeout = 15

    get_req = Net::HTTP::Get.new(uri_rec.request_uri)
    get_req['Authorization'] = "Bearer #{tenant_token}"
    get_req['Content-Type'] = 'application/json'

    resp_rec = http_rec.request(get_req)
    parsed_rec = JSON.parse(resp_rec.body)

    if parsed_rec['code'] == 0 && parsed_rec['data'] && parsed_rec['data']['items']
      items = parsed_rec['data']['items']
      rows = items.map do |it|
        fields = it['fields'] || {}
        row = { '_sheetName' => "Lark Base [#{table_id}]" }
        fields.each { |k, v| row[k] = v }
        row
      end
      json_response(res, 200, {
        ok: true,
        sourceName: "Lark Base (#{app_token[0, 8]}...)",
        records: rows,
        total: rows.length
      })
    else
      err_msg = parsed_rec['msg'] || "HTTP #{resp_rec.code}"
      json_response(res, 200, {
        ok: false,
        error: "Lỗi đọc dữ liệu Lark Bitable: #{err_msg}. Bạn có thể tải file CSV export từ Lark Base thay thế.",
        fallbackToCsv: true
      })
    end
  rescue StandardError => e
    json_response(res, 200, {
      ok: false,
      error: "Lỗi kết nối Lark Open API: #{e.message}. Bạn có thể tải file CSV export từ Lark Base thay thế.",
      fallbackToCsv: true
    })
  end
end

trap('INT') { server.shutdown }
trap('TERM') { server.shutdown }

puts "========================================================"
puts "  MINH AN COMPANY - B2B AI AGENT SALES SYSTEM"
puts "  Server dang chay tai: http://localhost:#{port}"
puts "  API Key da gan: #{mask_key(config['MINHAN_API_KEY'])} (#{config['GEMINI_MODEL']})"
puts "  Nhan Ctrl + C de dung server"
puts "========================================================"

system("open http://localhost:#{port} >/dev/null 2>&1 &") unless ENV['NO_OPEN'] == '1'

server.start
