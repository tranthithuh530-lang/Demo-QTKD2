/* ==========================================================================
   MINH AN COMPANY — B2B SALES OPPORTUNITY AI AGENT WORKFLOW (6 STEPS + 2 GATES)
   Sequential Flow:
   Step 1 -> Step 2 [DK1] -> (False: Halts -> Clarify -> Loop to Step 1)
                          -> (True) -> Step 3 -> Step 4 -> Step 5 [DK2]
                          -> (True: Pending Manager Slip -> Step 6)
                          -> (False: Ready -> Step 6)
   ========================================================================== */

const POLICY = {
  maxSalesDiscountPercent: 5,
  minGrossMarginPercent: 15,
  vatRate: 0.1
};

const STAGE_ORDER = ['step1', 'step2', 'clarify', 'step3', 'step4', 'step5', 'manager', 'step6'];

const DEFAULT_PRODUCTS = [
  { sku: 'MA-LAP-01', name: 'Laptop Dell Latitude 7440', aliases: ['laptop', 'latitude', '7440', 'dell latitude'], category: 'Thiết bị Văn phòng', unit: 'Chiếc', listPrice: 28500000, cost: 21500000, stock: 30, leadTimeDays: 3 },
  { sku: 'MA-MON-02', name: 'Màn hình LG UltraWide 34"', aliases: ['màn hình', 'man hinh', 'lg', 'ultrawide', '34'], category: 'Thiết bị Văn phòng', unit: 'Chiếc', listPrice: 11500000, cost: 8200000, stock: 25, leadTimeDays: 4 },
  { sku: 'MA-SRV-03', name: 'Máy chủ Dell PowerEdge R750xs', aliases: ['máy chủ', 'may chu', 'server', 'poweredge', 'r750xs'], category: 'Hạ tầng & Bảo mật', unit: 'Bộ', listPrice: 145000000, cost: 108000000, stock: 6, leadTimeDays: 14 },
  { sku: 'MA-SW-04', name: 'Switch Cisco Catalyst 9200L-48P', aliases: ['switch', 'cisco', 'catalyst', '9200l'], category: 'Hạ tầng & Bảo mật', unit: 'Thiết bị', listPrice: 54000000, cost: 39500000, stock: 10, leadTimeDays: 10 },
  { sku: 'MA-FW-05', name: 'Firewall Fortinet FortiGate 100F', aliases: ['firewall', 'fortinet', 'fortigate', '100f', 'tường lửa'], category: 'Hạ tầng & Bảo mật', unit: 'Thiết bị', listPrice: 68000000, cost: 48000000, stock: 8, leadTimeDays: 7 },
  { sku: 'MA-UPS-06', name: 'Bộ lưu điện APC Smart-UPS 3000VA', aliases: ['ups', 'apc', 'bộ lưu điện', '3000va'], category: 'Hạ tầng & Bảo mật', unit: 'Bộ', listPrice: 29000000, cost: 21000000, stock: 12, leadTimeDays: 5 },
  { sku: 'MA-ERP-07', name: 'Phần mềm ERP & CRM Enterprise (1 năm)', aliases: ['erp', 'crm', 'phần mềm', 'phan mem', 'license'], category: 'Phần mềm & Dịch vụ', unit: 'Gói', listPrice: 180000000, cost: 85000000, stock: 999, leadTimeDays: 10 },
  { sku: 'MA-SLA-08', name: 'Dịch vụ triển khai & Bảo trì SLA 24/7', aliases: ['dịch vụ', 'dich vu', 'triển khai', 'trien khai', 'bảo trì', 'sla'], category: 'Phần mềm & Dịch vụ', unit: 'Gói', listPrice: 15000000, cost: 7500000, stock: 999, leadTimeDays: 2 }
];

const SCENARIO_PRESETS = {
  preset1: {
    key: 'preset1',
    company: 'Công ty CP Dược phẩm Hải An',
    contact: 'anh.tuan@haianpharma.vn',
    channel: 'Email',
    rawText: 'Kính gửi Minh An, chúng tôi cần triển khai 10 Laptop Dell Latitude 7440, 10 Màn hình LG UltraWide 34" và 1 Dịch vụ triển khai & Bảo trì SLA 24/7 cho khối văn phòng mới. Ngân sách: 450 triệu VND. Thời hạn: 12 ngày. Đề nghị chiết khấu: 4%.'
  },
  preset2: {
    key: 'preset2',
    company: 'Tập đoàn Logistics Đại Nam',
    contact: 'minh.chau@dainamlogistics.vn',
    channel: 'Biểu mẫu Web',
    rawText: 'Yêu cầu báo giá nâng cấp trung tâm dữ liệu: 3 Máy chủ Dell PowerEdge R750xs, 2 Switch Cisco Catalyst 9200L-48P và 2 Firewall Fortinet FortiGate 100F. Ngân sách: 950 triệu. Thời hạn: 20 ngày. Đề nghị chiết khấu: 12% cho đối tác chiến lược.'
  },
  preset3: {
    key: 'preset3',
    company: 'Công ty TNHH Thương mại Sao Việt',
    contact: 'hoa.nguyen@saoviettrading.vn',
    channel: 'Email',
    rawText: 'Chào Minh An, bên mình đang cần báo giá gấp 15 Laptop Dell Latitude 7440 và 2 Firewall Fortinet FortiGate 100F cho chi nhánh mới. Vui lòng gửi thông tin sớm nhé.'
  },
  preset4: {
    key: 'preset4',
    company: 'Ngân hàng TMCP Thịnh Phát',
    contact: 'procurement@thinhphatbank.vn',
    channel: 'File Excel / CSV',
    rawText: 'Đề nghị báo giá gói mở rộng core network: 25 Switch Cisco Catalyst 9200L-48P và 8 Máy chủ Dell PowerEdge R750xs. Ngân sách: 3.1 tỷ VND. Thời hạn: 5 ngày (triển khai hỏa tốc). Đề nghị chiết khấu: 5%.'
  }
};

const INITIAL_CRM_DEALS = [
  {
    id: 'OPP-2026-0081',
    company: 'Công ty CP Công nghệ Tân Tiến',
    contact: 'trienkhai@tantien.vn',
    channel: 'Email',
    owner: 'Nguyễn Hoàng Nam',
    category: 'Thiết bị Văn phòng',
    itemsSummary: '8x Laptop Dell Latitude 7440',
    totalValue: 240768000,
    discountPercent: 4,
    marginPercent: 21.4,
    statusKey: 'ready',
    statusLabel: 'Đủ điều kiện tiếp tục',
    note: 'Đã xuất báo giá chuẩn trong thẩm quyền NVKD'
  },
  {
    id: 'OPP-2026-0082',
    company: 'Tổng Công ty Xây dựng Miền Nam',
    contact: 'it@xaydungmiennam.vn',
    channel: 'Biểu mẫu Web',
    owner: 'Trần Minh Thư',
    category: 'Hạ tầng & Bảo mật',
    itemsSummary: '4x Máy chủ Dell PowerEdge R750xs',
    totalValue: 574200000,
    discountPercent: 10,
    marginPercent: 17.2,
    statusKey: 'pending',
    statusLabel: 'Chờ duyệt',
    note: 'Đã lập Phiếu trình Trưởng phòng do chiết khấu 10% > 5%'
  },
  {
    id: 'OPP-2026-0083',
    company: 'Công ty TNHH May Mặc Việt Hưng',
    contact: 'muahang@viethunggarment.vn',
    channel: 'Email',
    owner: 'Chưa phân công (Dừng bước 2)',
    category: 'Chưa chốt',
    itemsSummary: 'Phần mềm ERP & CRM Enterprise',
    totalValue: 0,
    discountPercent: 0,
    marginPercent: 0,
    statusKey: 'clarify',
    statusLabel: 'Cần bổ sung thông tin',
    note: 'Thiếu ngân sách dự kiến & thời hạn triển khai; đã gửi email hỏi KH'
  }
];

/* ==========================================================================
   CENTRAL APPLICATION STATE
   ========================================================================== */
const state = {
  products: DEFAULT_PRODUCTS.map(p => ({ ...p })),
  deals: INITIAL_CRM_DEALS.map(d => ({ ...d })),
  currentStage: 'step1',
  visitedStages: new Set(['step1']),
  completedStages: new Set(),
  isRunningAgent: false,
  runToken: 0,
  loopCount: 0,
  dataSourceName: 'Bảng giá & Kho chuẩn Minh An (Mặc định)',
  filterStatus: 'all',
  searchQuery: '',
  api: {
    configured: false,
    maskedKey: '',
    model: 'gemini-3-flash-preview',
    useLiveApi: true,
    lastEndpoint: ''
  },
  analytics: {
    importedRecords: [],
    groupField: 'owner',
    customFields: [],
    sourceLabels: [],
    lastSchemaSummary: '',
    aiReport: null,
    previewLimit: 100,
    currentDataset: null,
    currentColMap: {},
    columnMapPanelOpen: false
  },
  dealsPreviewLimit: 100,

  opp: createEmptyOpportunity()
};

const STANDARD_SYSTEM_FIELDS = [
  { key: 'company', label: 'Tên khách hàng / Công ty', required: true, note: 'Bắt buộc (hoặc có Nhu cầu/SP)' },
  { key: 'product', label: 'Sản phẩm / Giải pháp', required: true, note: 'Bắt buộc (hoặc có Khách hàng)' },
  { key: 'qty', label: 'Số lượng (Đơn vị)', required: false, note: 'Tùy chọn (Mặc định: 1 nếu thiếu)' },
  { key: 'budget', label: 'Ngân sách / Doanh thu', required: false, note: 'Tùy chọn (Ước tính theo niêm yết)' },
  { key: 'days', label: 'Thời hạn triển khai (ngày)', required: false, note: 'Tùy chọn (Mặc định: 14 ngày)' },
  { key: 'discount', label: 'Đề nghị chiết khấu (%)', required: false, note: 'Tùy chọn (Mặc định: 0%)' },
  { key: 'owner', label: 'NVKD Phụ trách', required: false, note: 'Tùy chọn (Loại trừ cột số tiền)' }
];

function createEmptyOpportunity(presetKey = 'preset1') {
  const preset = SCENARIO_PRESETS[presetKey] || SCENARIO_PRESETS.preset1;
  return {
    id: '',
    presetKey,
    company: preset.company,
    contact: preset.contact,
    channel: preset.channel,
    rawText: preset.rawText,
    rawRow: null,
    extracted: {
      productsText: '',
      totalQty: 0,
      items: [],
      budget: null,
      days: null,
      requestedDiscount: null
    },
    missingFields: [],
    assumptionsUsed: [],
    hasSoftWarnings: false,
    condition1Passed: true,
    calculationHalted: false,
    clarifyDraft: '',

    category: 'Hạ tầng & Bảo mật',
    owner: 'Nguyễn Hoàng Nam',
    opsTeam: 'Phạm Tuấn Anh (Vận hành)',

    toolTraces: [],
    appraisal: {
      rows: [],
      allInStock: false,
      maxLeadTime: 0,
      timelineOk: false
    },

    appliedDiscount: 0,
    subtotal: 0,
    discountAmt: 0,
    netRevenue: 0,
    vat: 0,
    grandTotal: 0,
    totalCost: 0,
    marginPercent: 0,
    budgetOk: true,
    proposalDraft: '',

    condition2Exceeded: false,
    exceedReasons: [],
    approvalSlip: '',
    approver: 'Lê Minh Quân (Trưởng phòng KD)',
    managerNote: '',
    managerApproved: false,

    statusKey: 'draft',
    statusLabel: 'Đang tiếp nhận',
    finalEmailDraft: '',
    auditLogs: []
  };
}

/* ==========================================================================
   SAFE DOM & FORMATTING HELPERS
   ========================================================================== */
function $(id) {
  return typeof document !== 'undefined' ? document.getElementById(id) : null;
}

function setText(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
}

function setHTML(id, html) {
  const el = $(id);
  if (el) el.innerHTML = html;
}

function setValue(id, value) {
  const el = $(id);
  if (el && el.value !== value) el.value = value;
}

function setSelectWithFallback(id, value) {
  const el = $(id);
  if (!el || !value) return;
  if (el.options && typeof document !== 'undefined') {
    const exists = Array.from(el.options).some(opt => opt.value === value);
    if (!exists) {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = value;
      el.appendChild(opt);
    }
  }
  el.value = value;
}

function formatVND(amount) {
  if (!Number.isFinite(amount)) return '0 ₫';
  return Math.round(amount).toLocaleString('vi-VN') + ' ₫';
}

function formatCompactMoney(amount) {
  if (!Number.isFinite(amount) || amount <= 0) return 'Chưa có';
  if (amount >= 1e9) return (amount / 1e9).toFixed(2).replace(/\.00$/, '') + ' tỷ ₫';
  if (amount >= 1e6) return Math.round(amount / 1e6) + ' triệu ₫';
  return formatVND(amount);
}

function nowTimeStr() {
  const d = new Date();
  return d.toTimeString().slice(0, 8);
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(message, type = 'info') {
  const container = $('toast-stream');
  if (!container || typeof document === 'undefined') return;
  const pill = document.createElement('div');
  pill.className = 'toast-pill';
  const icon = type === 'warn' ? '⚠️' : type === 'success' ? '✅' : '🤖';
  pill.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span><div class="toast-progress"></div>`;
  pill.onclick = () => pill.remove();
  container.appendChild(pill);
  setTimeout(() => {
    pill.classList.add('removing');
    setTimeout(() => pill.remove(), 260);
  }, 3400);
}

function addAuditLog(title, desc, level = 'info', node = '') {
  const entry = {
    time: nowTimeStr(),
    node: node || state.currentStage,
    title,
    desc,
    level
  };
  state.opp.auditLogs.unshift(entry);
  renderAuditTimeline();
}

function renderAuditTimeline() {
  setText('audit-count-pill', String(state.opp.auditLogs.length));
  const listEl = $('audit-log-list');
  if (!listEl) return;
  if (!state.opp.auditLogs.length) {
    listEl.innerHTML = '<div class="audit-entry info"><div class="audit-title">Sẵn sàng khởi chạy</div><div class="audit-desc">Chọn tình huống mẫu hoặc nhập yêu cầu để bắt đầu.</div></div>';
    return;
  }
  listEl.innerHTML = state.opp.auditLogs
    .map(log => `
      <div class="audit-entry ${escapeHtml(log.level)}">
        <div class="audit-time">${escapeHtml(log.time)} • ${escapeHtml(log.node.toUpperCase())}</div>
        <div class="audit-title">${escapeHtml(log.title)}</div>
        <div class="audit-desc">${escapeHtml(log.desc)}</div>
      </div>`)
    .join('');
}

/* ==========================================================================
   NAVIGATION & STAGE RENDERING
   ========================================================================== */
function goToStage(stageName) {
  if (!STAGE_ORDER.includes(stageName)) return;

  // Enforce sequential guards so invalid jumps are prevented cleanly
  if (['step3', 'step4', 'step5', 'manager'].includes(stageName) && !state.opp.condition1Passed) {
    showToast('Chưa đạt Điều kiện 1 (Đủ 5 thông tin bắt buộc). Luồng đang dừng hoặc cần bổ sung!', 'warn');
    stageName = state.opp.missingFields.length ? 'clarify' : 'step2';
  }
  if (stageName === 'step6' && state.opp.calculationHalted) {
    showToast('Luồng đã dừng ở Bước 2 do thiếu thông tin. Hãy bổ sung ở nhánh Làm rõ KH!', 'warn');
    stageName = 'clarify';
  }

  state.currentStage = stageName;
  state.visitedStages.add(stageName);

  STAGE_ORDER.forEach(st => {
    const card = $(`stage-${st}`);
    if (card) card.classList.toggle('active', st === stageName);

    const rail = $(`rail-step-${st.replace('step', '')}`);
    if (rail) {
      rail.classList.toggle('active', st === stageName);
      rail.classList.toggle('completed', state.completedStages.has(st) && st !== stageName);
    }
  });

  renderAllLivePanels();
}

function markStageCompleted(stageName) {
  state.completedStages.add(stageName);
  const rail = $(`rail-step-${stageName.replace('step', '')}`);
  if (rail) rail.classList.add('completed');
}

function renderAllLivePanels() {
  renderSnapshotSidebar();
  updateMinimap();
  if ($('flowchart-modal')?.classList.contains('active')) {
    setHTML('flowchart-modal-svg', buildFlowchartSvg('full'));
  }
}

/* ==========================================================================
   STEP 1: TIẾP NHẬN YÊU CẦU (START NODE)
   ========================================================================== */
function selectScenario(presetKey) {
  const preset = SCENARIO_PRESETS[presetKey];
  if (!preset) return;
  state.runToken += 1;
  state.isRunningAgent = false;
  state.loopCount = 0;
  state.visitedStages = new Set(['step1']);
  state.completedStages = new Set();
  state.opp = createEmptyOpportunity(presetKey);

  setValue('inp-company', state.opp.company);
  setValue('inp-contact', state.opp.contact);
  setSelectWithFallback('inp-channel', state.opp.channel);
  setValue('inp-raw-text', state.opp.rawText);

  if (typeof document !== 'undefined') {
    document.querySelectorAll('.preset-chip').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.preset === presetKey);
    });
  }

  addAuditLog('Bước 1: Tiếp nhận yêu cầu', `Đã nạp hồ sơ từ ${state.opp.company} (${state.opp.channel})`, 'info', 'step1');
  goToStage('step1');
}

function onStep1Input() {
  state.opp.company = ($('inp-company')?.value || '').trim();
  state.opp.contact = ($('inp-contact')?.value || '').trim();
  state.opp.channel = $('inp-channel')?.value || 'Email';
  state.opp.rawText = $('inp-raw-text')?.value || '';
  renderSnapshotSidebar();
}

function startNewOpportunity() {
  state.runToken += 1;
  state.isRunningAgent = false;
  state.loopCount = 0;
  state.visitedStages = new Set(['step1']);
  state.completedStages = new Set();
  state.opp = createEmptyOpportunity('preset1');
  state.opp.company = '';
  state.opp.contact = '';
  state.opp.rawText = '';
  state.opp.statusLabel = 'Chờ nhập yêu cầu';

  setValue('inp-company', '');
  setValue('inp-contact', '');
  setValue('inp-channel', 'Email');
  setValue('inp-raw-text', '');
  if (typeof document !== 'undefined') {
    document.querySelectorAll('.preset-chip').forEach(btn => btn.classList.remove('active'));
  }

  addAuditLog('Khởi tạo cơ hội mới', 'Đã làm mới biểu mẫu Bước 1 để tiếp nhận yêu cầu mới.', 'info', 'step1');
  goToStage('step1');
  scrollToWorkspace();
}

async function handleRequestFileUpload(event) {
  const file = event?.target?.files?.[0];
  if (!file) return;
  try {
    const parsed = await parseUploadedFileObject(file);
    if (!parsed.rows.length) {
      showToast(`Không đọc được dữ liệu hợp lệ từ file ${file.name}`, 'warn');
      return;
    }
    const normalized = await ingestDatasetRecords(parsed.rows, file.name, parsed.detectedSource);
    if (normalized.length) {
      loadImportedRecordToStep1(normalized[0].id);
      if (normalized.length > 1) {
        generateAiExecutiveReport(true);
      }
      showToast(`✅ Đã nạp thành công ${normalized.length} bản ghi`, 'success');
      proceedStep1ToStep2();
    }
  } catch (err) {
    showToast(`Lỗi đọc file ${file.name}: ${err.message}`, 'warn');
  } finally {
    if (event?.target) event.target.value = '';
  }
}

function proceedStep1ToStep2() {
  onStep1Input();
  if (!state.opp.rawText.trim()) {
    showToast('Vui lòng nhập nội dung yêu cầu khách hàng trước khi chuyển Bước 2!', 'warn');
    return;
  }
  markStageCompleted('step1');
  parseAndEvaluateStep2();
  goToStage('step2');
}

/* ==========================================================================
   STEP 2: PHÂN LOẠI, BÓC TÁCH 5 TRƯỜNG & ĐIỀU KIỆN 1 [CÓ ĐỦ THÔNG TIN?]
   ========================================================================== */
let _compiledProductMatchersKey = '';
let _compiledProductMatchers = [];

function getCompiledProductMatchers() {
  const key = state.products.map(p => `${p.sku}:${p.name}:${(p.aliases || []).join(',')}`).join('|');
  if (key === _compiledProductMatchersKey && _compiledProductMatchers.length) {
    return _compiledProductMatchers;
  }
  _compiledProductMatchersKey = key;
  _compiledProductMatchers = state.products.map(prod => {
    const keywords = [prod.name.toLowerCase(), ...(prod.aliases || []).map(a => a.toLowerCase())];
    const escaped = keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    if (!escaped) return null;
    return {
      prod,
      reBefore: new RegExp(`(\\d+)\\s*(?:x|bộ|chiếc|cái|gói|thiết bị)?\\s*(?:${escaped})`, 'i'),
      reAfter: new RegExp(`(?:${escaped})[^\\n.,;]{0,25}?(?:x|sl|số\\s*lượng|:)\\s*(\\d+)`, 'i'),
      reOnly: new RegExp(`(?:${escaped})`, 'i')
    };
  }).filter(Boolean);
  return _compiledProductMatchers;
}

function extractProductLines(rawText) {
  const items = [];
  const normalized = rawText.toLowerCase();
  const matchers = getCompiledProductMatchers();

  for (let idx = 0; idx < matchers.length; idx++) {
    const m = matchers[idx];
    const matchA = m.reBefore.exec(normalized);
    const matchB = !matchA ? m.reAfter.exec(normalized) : null;
    const matchKeywordOnly = !matchA && !matchB ? m.reOnly.exec(normalized) : null;

    if (matchA || matchB) {
      const qty = Math.max(1, parseInt((matchA || matchB)[1], 10));
      items.push({ ...m.prod, qty });
    } else if (matchKeywordOnly) {
      items.push({ ...m.prod, qty: 0 });
    }
  }

  // Fallback for custom unrecognized product mentioning quantity before a capitalized noun
  if (!items.length) {
    const generic = /(\d+)\s*(?:x|chiếc|bộ|gói|license)\s+([A-Za-z0-9À-ỹ"'\-\s]{3,40})/i.exec(rawText);
    if (generic) {
      items.push({
        sku: 'MA-CUSTOM-01',
        name: generic[2].trim(),
        category: 'Thiết bị Văn phòng',
        unit: 'Bộ',
        listPrice: 25000000,
        cost: 18500000,
        stock: 10,
        leadTimeDays: 7,
        qty: parseInt(generic[1], 10)
      });
    }
  }

  return items;
}

function normalizeLocaleDecimal(numStr) {
  const s = String(numStr || '').trim();
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) return parseFloat(s.replace(/\./g, ''));
  return parseFloat(s.replace(/,/g, '.'));
}

function collectRawRowNotesText(rawRow) {
  if (!rawRow || typeof rawRow !== 'object') return '';
  return Object.entries(rawRow)
    .filter(([k, v]) => !k.startsWith('_') && v !== undefined && v !== null && String(v).trim() !== '')
    .map(([k, v]) => `${k}: ${String(v).trim()}`)
    .join(' | ');
}

function parseMoneyMatchToVnd(numStr, unitRaw) {
  const unit = (unitRaw || '').toLowerCase();
  if (unit === 'tỷ' || unit === 'ty') {
    const val = normalizeLocaleDecimal(numStr);
    return Number.isFinite(val) && val > 0 ? Math.round(val * 1e9) : null;
  }
  if (unit === 'triệu' || unit === 'trieu' || unit === 'tr' || unit === 'm') {
    const val = normalizeLocaleDecimal(numStr);
    return Number.isFinite(val) && val > 0 ? Math.round(val * 1e6) : null;
  }
  const cleanNum = parseFloat(String(numStr).replace(/\./g, '').replace(/,/g, ''));
  if (!Number.isFinite(cleanNum) || cleanNum <= 0) return null;
  if (unit === 'vnđ' || unit === 'vnd' || unit === 'đ') {
    return cleanNum < 10000 ? null : Math.round(cleanNum);
  }
  return cleanNum < 10000 ? Math.round(cleanNum * 1e6) : Math.round(cleanNum);
}

function parseBudgetVnd(rawText) {
  const text = String(rawText || '');
  const prefixed = /(?:ngân\s*sách|budget|dự\s*trù|hạn\s*mức\s*chi|kinh\s*phí|dự\s*toán|giá\s*trị\s*(?:đơn|dự\s*kiến|gói)?)(?:\s*(?:dự\s*kiến|ước\s*tính|tối\s*đa|khoảng|tầm|là|:|-))*\s*([\d.,]+)\s*(tỷ|ty|triệu|trieu|tr|m|vnđ|vnd|đ)?/i.exec(text);
  if (prefixed) {
    const val = parseMoneyMatchToVnd(prefixed[1].trim(), prefixed[2]);
    if (val) return val;
  }
  // Fallback: scan full text/notes for standalone monetary expressions (excluding %)
  const standaloneRe = /([\d.,]+)\s*(tỷ|ty|triệu|trieu|tr(?=\b)|vnđ|vnd|đ(?=\s|$|[,.;|]))\b/gi;
  let match;
  while ((match = standaloneRe.exec(text)) !== null) {
    const val = parseMoneyMatchToVnd(match[1].trim(), match[2]);
    if (val && val >= 100000) return val;
  }
  return null;
}

function parseRelativeDeadlinePhrase(text) {
  const s = String(text || '').trim();
  if (!s) return 0;

  const explicitUnit = /(\d+(?:[.,]\d+)?)\s*(ngày|tuần|tuan|tháng|thang|week|month|w\b)/i.exec(s);
  if (explicitUnit) {
    const n = parseFloat(explicitUnit[1].replace(',', '.'));
    const unit = explicitUnit[2].toLowerCase();
    if (Number.isFinite(n) && n > 0) {
      if (unit.includes('tuần') || unit.includes('tuan') || unit.includes('week') || unit === 'w') return Math.max(1, Math.round(n * 7));
      if (unit.includes('tháng') || unit.includes('thang') || unit.includes('month')) return Math.max(1, Math.round(n * 30));
      return Math.max(1, Math.round(n));
    }
  }

  const isoMatch = /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(s);
  if (isoMatch) {
    const dt = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    const diff = Math.ceil((dt.getTime() - Date.now()) / 86400000);
    if (Number.isFinite(diff)) return Math.max(1, Math.min(365, diff));
  }

  const vnDateMatch = /(\d{1,2})[-/](\d{1,2})(?:[-/](\d{2,4}))?/.exec(s);
  if (vnDateMatch && (vnDateMatch[3] || /\b(ngày|hạn|deadline|trước)\b/i.test(s))) {
    const now = new Date();
    const yrRaw = vnDateMatch[3] ? Number(vnDateMatch[3]) : now.getFullYear();
    const yr = yrRaw < 100 ? 2000 + yrRaw : yrRaw;
    let dt = new Date(yr, Number(vnDateMatch[2]) - 1, Number(vnDateMatch[1]));
    if (!vnDateMatch[3] && dt.getTime() < now.getTime()) {
      dt = new Date(yr + 1, Number(vnDateMatch[2]) - 1, Number(vnDateMatch[1]));
    }
    const diff = Math.ceil((dt.getTime() - now.getTime()) / 86400000);
    if (Number.isFinite(diff)) return Math.max(1, Math.min(365, diff));
  }

  const qMatch = /\b(?:q|quý|quy)\s*([1-4])\b/i.exec(s);
  if (qMatch) {
    const q = Number(qMatch[1]);
    const now = new Date();
    let endMonth = q * 3; // 3, 6, 9, 12
    let targetYear = now.getFullYear();
    let qEnd = new Date(targetYear, endMonth, 0); // last day of quarter
    if (qEnd.getTime() < now.getTime()) {
      qEnd = new Date(targetYear + 1, endMonth, 0);
    }
    const diff = Math.ceil((qEnd.getTime() - now.getTime()) / 86400000);
    return Math.max(14, Math.min(365, diff));
  }

  if (/tuần\s*(?:sau|tới)|next\s*week/i.test(s)) return 14;
  if (/(?:trong\s*)?tuần\s*này|cuối\s*tuần\s*này|this\s*week/i.test(s)) {
    const day = new Date().getDay();
    return day === 0 ? 7 : Math.max(2, 7 - day);
  }
  if (/tháng\s*(?:tới|sau)|next\s*month/i.test(s)) return 30;
  if (/(?:trong\s*)?tháng\s*này|cuối\s*tháng|this\s*month/i.test(s)) {
    const now = new Date();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return Math.max(7, Math.ceil((monthEnd.getTime() - now.getTime()) / 86400000));
  }
  if (/\b(?:gấp|hỏa\s*tốc|khẩn\s*cấp|khẩn|urgent|asap|ngay\s*lập\s*tức)\b/i.test(s)) return 3;

  return 0;
}

function parseDeliveryDays(rawText) {
  const s = String(rawText || '');
  const m = /(?:thời\s*hạn|tiến\s*độ|giao\s*(?:hàng|trong)|triển\s*khai(?:\s*trong)?|trong\s*vòng|deadline|due\s*date)(?:\s*(?:dự\s*kiến|mong\s*muốn|gấp|hỏa\s*tốc|tối\s*đa|:|-))*\s*(\d+)\s*(ngày|tuần|tháng)/i.exec(s);
  if (m) {
    const n = parseInt(m[1], 10);
    if (Number.isFinite(n) && n > 0) {
      const unit = m[2].toLowerCase();
      if (unit.includes('tuần')) return n * 7;
      if (unit.includes('tháng')) return n * 30;
      return n;
    }
  }
  const rel = parseRelativeDeadlinePhrase(s);
  return rel > 0 ? rel : null;
}

function parseRequestedDiscount(rawText) {
  const s = String(rawText || '');
  if (/không\s*(?:cần|yêu\s*cầu)?\s*chiết\s*khấu/i.test(s)) return 0;
  const m = /(?:chiết\s*khấu|giảm\s*giá|discount|\bck\b)(?:\s*(?:đặc\s*biệt|đề\s*nghị|đề\s*xuất|mong\s*muốn|mức|:|-))*\s*(\d+(?:[.,]\d+)?)\s*%/i.exec(s);
  if (!m) return 0;
  const val = parseFloat(m[1].replace(',', '.'));
  return Number.isFinite(val) && val >= 0 ? val : 0;
}

function parseAndEvaluateStep2() {
  onStep1Input();
  const raw = state.opp.rawText;
  const combinedRaw = [raw, collectRawRowNotesText(state.opp.rawRow)].filter(Boolean).join(' | ');
  const items = extractProductLines(raw);
  const validQtyItems = items.filter(it => it.qty > 0);
  const totalQty = validQtyItems.reduce((sum, it) => sum + it.qty, 0);
  const budget = parseBudgetVnd(combinedRaw);
  const days = parseDeliveryDays(combinedRaw);
  const requestedDiscount = parseRequestedDiscount(combinedRaw);

  const productsText = items.length
    ? items.map(it => (it.qty > 0 ? `${it.qty}x ${it.name}` : it.name)).join('; ')
    : '';

  state.opp.extracted = {
    productsText,
    totalQty,
    items: validQtyItems,
    budget,
    days,
    requestedDiscount: Number.isFinite(requestedDiscount) ? requestedDiscount : 0
  };

  const missing = [];
  if (!items.length) missing.push('Danh mục sản phẩm / giải pháp cụ thể');
  if (totalQty <= 0) missing.push('Số lượng chi tiết từng sản phẩm');
  if (budget === null || budget <= 0) missing.push('Ngân sách dự kiến');
  if (days === null || days <= 0) missing.push('Thời hạn triển khai mong muốn');

  state.opp.missingFields = missing;
  state.opp.condition1Passed = missing.length === 0;

  // Assign default category based on dominant item
  if (validQtyItems.length) {
    state.opp.category = validQtyItems[0].category;
    const ownerMap = {
      'Hạ tầng & Bảo mật': 'Nguyễn Hoàng Nam',
      'Thiết bị Văn phòng': 'Trần Minh Thư',
      'Phần mềm & Dịch vụ': 'Lê Quốc Bảo'
    };
    state.opp.owner = ownerMap[state.opp.category] || 'Nguyễn Hoàng Nam';
  }

  renderStep2UI();
  addAuditLog(
    'Bước 2: Phân loại & Bóc tách',
    state.opp.condition1Passed
      ? `Đủ 5/5 thông tin: ${totalQty} sp, Ngân sách ${formatCompactMoney(budget)}, ${days} ngày, CK ${requestedDiscount}%`
      : `Phát hiện thiếu ${missing.length}/5 trường bắt buộc: ${missing.join(', ')}`,
    state.opp.condition1Passed ? 'gate-pass' : 'gate-warn',
    'step2'
  );
}

function renderStep2UI() {
  const ext = state.opp.extracted;
  const fields = [
    {
      label: '1. Danh mục sản phẩm',
      value: ext.items.length ? `${ext.items.length} dòng sản phẩm` : 'Chưa xác định',
      ok: ext.items.length > 0,
      hint: ext.items.length ? ext.items.map(i => i.sku).join(', ') : 'Thiếu tên sản phẩm'
    },
    {
      label: '2. Số lượng',
      value: ext.totalQty > 0 ? `${ext.totalQty} đơn vị` : 'Thiếu số lượng',
      ok: ext.totalQty > 0,
      hint: ext.totalQty > 0 ? ext.items.map(i => `${i.qty} ${i.unit}`).join(' + ') : 'Cần nêu rõ số lượng'
    },
    {
      label: '3. Ngân sách',
      value: ext.budget ? formatCompactMoney(ext.budget) : 'Chưa có ngân sách',
      ok: Boolean(ext.budget && ext.budget > 0),
      hint: ext.budget ? formatVND(ext.budget) : 'Cần ngân sách dự kiến'
    },
    {
      label: '4. Thời hạn triển khai',
      value: ext.days ? `${ext.days} ngày` : 'Chưa nêu thời hạn',
      ok: Boolean(ext.days && ext.days > 0),
      hint: ext.days ? 'Đáp ứng đánh giá SLA' : 'Cần mốc ngày giao hàng'
    },
    {
      label: '5. Đề nghị chiết khấu',
      value: ext.requestedDiscount !== null ? `${ext.requestedDiscount}%` : 'Chưa đề cập CK',
      ok: ext.requestedDiscount !== null,
      hint: ext.requestedDiscount !== null
        ? (ext.requestedDiscount > POLICY.maxSalesDiscountPercent ? 'Vượt hạn mức NVKD 5%' : 'Trong hạn mức 5%')
        : 'Cần xác nhận % CK (hoặc 0%)'
    }
  ];

  setHTML('step2-extracted-cards', fields.map(f => `
    <div class="extracted-card ${f.ok ? 'is-ok' : 'is-missing'}">
      <span class="extracted-card-label">${escapeHtml(f.label)}</span>
      <strong class="extracted-card-value">${escapeHtml(f.value)}</strong>
      <span class="extracted-card-state">${f.ok ? '✓ ' : '✗ '}${escapeHtml(f.hint)}</span>
    </div>`).join(''));

  const box = $('diamond-box-1');
  if (box) {
    box.classList.toggle('is-ok', state.opp.condition1Passed);
    box.classList.toggle('is-fail', !state.opp.condition1Passed);
  }
  const pill = $('diamond-1-status');
  if (pill) {
    pill.textContent = state.opp.condition1Passed ? 'Đạt 5/5 thông tin (CÓ)' : `Thiếu ${state.opp.missingFields.length} trường (KHÔNG)`;
    pill.className = `status-pill ${state.opp.condition1Passed ? '' : 'fail'}`.trim();
  }

  setHTML('diamond-1-checklist', fields.map(f => `
    <li class="check-item ${f.ok ? 'pass' : 'fail'}">
      ${f.ok ? '✅' : '❌'} ${escapeHtml(f.label)}: ${escapeHtml(f.value)}
    </li>`).join(''));

  const callout = $('diamond-1-callout');
  if (callout) {
    if (state.opp.condition1Passed) {
      callout.className = 'decision-callout ok';
      callout.textContent = '✓ Kết luận Điều kiện 1: CÓ — Đủ toàn bộ 5 trường trọng yếu. Hợp lệ để tạo Hồ sơ Cơ hội tại Bước 3.';
    } else {
      callout.className = 'decision-callout fail';
      callout.textContent = `⛔ Kết luận Điều kiện 1: KHÔNG — DỪNG luồng tính toán! Thiếu: ${state.opp.missingFields.join(', ')}. Chuyển nhánh Yêu cầu KH làm rõ.`;
    }
  }

  const btnTrue = $('btn-dk1-true');
  if (btnTrue) btnTrue.disabled = !state.opp.condition1Passed;
}

function triggerCondition1False() {
  state.opp.calculationHalted = true;
  state.opp.condition1Passed = false;
  // Reset any downstream computed financials strictly per rule "Dừng luồng tính toán"
  state.opp.subtotal = 0;
  state.opp.discountAmt = 0;
  state.opp.netRevenue = 0;
  state.opp.vat = 0;
  state.opp.grandTotal = 0;
  state.opp.marginPercent = 0;
  state.opp.approvalSlip = '';
  state.opp.statusKey = 'clarify';
  state.opp.statusLabel = 'Cần bổ sung thông tin';

  if (!state.opp.missingFields.length) {
    state.opp.missingFields = ['Yêu cầu xác nhận lại cấu hình / thông số bổ sung từ khách hàng'];
  }

  state.opp.clarifyDraft = buildClarificationEmail();
  setHTML('clarify-missing-tags', state.opp.missingFields.map(f => `<span class="missing-tag-pill">⚠️ Thiếu: ${escapeHtml(f)}</span>`).join(''));
  setValue('clarify-email-draft', state.opp.clarifyDraft);

  // Pre-fill quick loop hints safely
  setValue('loop-budget', state.opp.extracted.budget ? formatCompactMoney(state.opp.extracted.budget) : '420 triệu VND');
  setValue('loop-days', state.opp.extracted.days ? String(state.opp.extracted.days) : '14');
  setValue('loop-discount', state.opp.extracted.requestedDiscount !== null ? String(state.opp.extracted.requestedDiscount) : '4');

  markStageCompleted('step2');
  addAuditLog(
    'Điều kiện 1 = KHÔNG (Dừng luồng)',
    `Gắn trạng thái "Cần bổ sung thông tin". Dừng toàn bộ tính toán báo giá và soạn email hỏi KH.`,
    'gate-warn',
    'clarify'
  );
  goToStage('clarify');
  showToast('Điều kiện 1 = KHÔNG: Đã dừng tính toán và xuất bản nháp email hỏi khách hàng.', 'warn');
}

function triggerCondition1True() {
  parseAndEvaluateStep2();
  if (!state.opp.condition1Passed) {
    showToast('Vẫn còn thông tin thiếu, chưa thể rẽ nhánh CÓ sang Bước 3!', 'warn');
    return;
  }
  state.opp.calculationHalted = false;
  markStageCompleted('step2');
  initializeStep3Record();
  goToStage('step3');
}

function buildClarificationEmail() {
  const company = state.opp.company || 'Quý Công ty';
  const missingBullets = state.opp.missingFields.map((f, i) => `  ${i + 1}. ${f}`).join('\n');
  const existing = state.opp.extracted.productsText
    ? `Hiện chúng tôi đã ghi nhận sơ bộ nhu cầu: ${state.opp.extracted.productsText}.`
    : 'Hiện chúng tôi đã tiếp nhận yêu cầu sơ bộ từ Quý Công ty.';

  return `Tiêu đề: [Công ty Minh An] Đề nghị bổ sung thông tin để lập báo giá B2B - ${company}

Kính gửi Quý đối tác ${company},

Bộ phận Kinh doanh B2B Công ty Minh An xin chân thành cảm ơn Quý Công ty đã gửi yêu cầu hợp tác qua kênh ${state.opp.channel}.
${existing}

Để đội ngũ Giải pháp và Vận hành của Minh An có cơ sở kiểm tra chính xác đơn giá, tồn kho khả dụng và tiến độ giao hàng, kính mong Quý Công ty vui lòng bổ sung thêm các thông tin còn thiếu sau:

${missingBullets}

Ngay sau khi nhận được phản hồi của Quý Công ty, hệ thống của chúng tôi sẽ lập tức hoàn thiện Hồ sơ cơ hội và gửi Báo giá chi tiết trong thời gian sớm nhất.

Trân trọng,
Bộ phận Giải pháp Doanh nghiệp B2B — Công ty Minh An`;
}

function copyClarifyDraft() {
  const text = $('clarify-email-draft')?.value || state.opp.clarifyDraft;
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
  showToast('Đã sao chép bản nháp email yêu cầu bổ sung!', 'success');
}

function saveClarifySnapshotToCrm() {
  state.opp.id = state.opp.id || generateOpportunityId();
  upsertCrmDeal({
    id: state.opp.id,
    company: state.opp.company || 'Khách hàng mới',
    contact: state.opp.contact || 'Chưa rõ',
    channel: state.opp.channel,
    owner: state.opp.owner || 'Chưa gán (Dừng bước 2)',
    category: state.opp.category || 'Đang làm rõ',
    itemsSummary: state.opp.extracted.productsText || 'Thiếu thông tin sản phẩm',
    totalValue: 0,
    discountPercent: 0,
    marginPercent: 0,
    statusKey: 'clarify',
    statusLabel: 'Cần bổ sung thông tin',
    note: `Thiếu: ${state.opp.missingFields.join(', ')}`
  });
  addAuditLog('Lưu CRM trạng thái Chờ bổ sung', `Mã ${state.opp.id} được ghi nhận chờ phản hồi từ khách hàng.`, 'gate-warn', 'clarify');
  showToast(`Đã lưu ${state.opp.id} với trạng thái "Cần bổ sung thông tin"`, 'success');
}

function loopBackToStep1() {
  const budgetTxt = ($('loop-budget')?.value || '').trim();
  const daysVal = ($('loop-days')?.value || '').trim();
  const discountVal = ($('loop-discount')?.value || '').trim();
  const ext = state.opp.extracted || {};

  const additions = [];
  if (budgetTxt && (!ext.budget || ext.budget <= 0)) additions.push(`Ngân sách: ${budgetTxt}`);
  if (daysVal && (!ext.days || ext.days <= 0)) additions.push(`Thời hạn: ${daysVal} ngày`);
  if (discountVal !== '' && (ext.requestedDiscount === null || ext.requestedDiscount === undefined)) {
    additions.push(`Đề nghị chiết khấu: ${discountVal}%`);
  }

  if (additions.length) {
    state.opp.rawText = state.opp.rawText.trim() + ' ' + additions.join('. ') + '.';
    setValue('inp-raw-text', state.opp.rawText);
  }

  state.loopCount += 1;
  state.opp.calculationHalted = false;
  state.opp.statusKey = 'draft';
  state.opp.statusLabel = `Bổ sung lần ${state.loopCount} — Tiếp nhận lại`;

  addAuditLog(
    `Vòng lặp (Loop #${state.loopCount}) -> Bước 1`,
    `Khách hàng bổ sung dữ liệu (${additions.join('; ') || 'đã cập nhật trực tiếp'}). Quay lại Bước 1 kiểm tra từ đầu.`,
    'info',
    'step1'
  );
  goToStage('step1');
  showToast(`Vòng lặp #${state.loopCount}: Đã cập nhật thông tin và quay lại Bước 1!`, 'success');
}

/* ==========================================================================
   STEP 3: TẠO HỒ SƠ CƠ HỘI & GÁN NGƯỜI PHỤ TRÁCH
   ========================================================================== */
function generateOpportunityId() {
  const seq = String(84 + state.deals.length).padStart(4, '0');
  return `OPP-2026-${seq}`;
}

function initializeStep3Record() {
  if (!state.opp.id) {
    state.opp.id = generateOpportunityId();
  }
  state.opp.statusKey = 'processing';
  state.opp.statusLabel = 'Đã tạo hồ sơ — Đang xử lý';

  setValue('assign-deal-id', state.opp.id);
  setValue('assign-category', state.opp.category);
  setSelectWithFallback('assign-owner', state.opp.owner);
  setValue('assign-ops', state.opp.opsTeam);
  renderStep3Summary();

  addAuditLog(
    'Bước 3: Tạo Hồ sơ & Gán NVKD',
    `Khởi tạo ${state.opp.id} | Nhóm: ${state.opp.category} | NVKD: ${state.opp.owner}`,
    'gate-pass',
    'step3'
  );
}

function syncStep3Assignment() {
  state.opp.category = $('assign-category')?.value || state.opp.category;
  state.opp.owner = $('assign-owner')?.value || state.opp.owner;
  state.opp.opsTeam = $('assign-ops')?.value || state.opp.opsTeam;
  renderStep3Summary();
  renderSnapshotSidebar();
}

function renderStep3Summary() {
  const ext = state.opp.extracted;
  setHTML('step3-standardized-summary', `
    <div><strong>Mã cơ hội:</strong> <span class="deal-id-code">${escapeHtml(state.opp.id)}</span> &nbsp;|&nbsp; <strong>Khách hàng:</strong> ${escapeHtml(state.opp.company)} (${escapeHtml(state.opp.contact || 'Chưa có email')})</div>
    <div style="margin-top:0.4rem;"><strong>Danh mục & Số lượng chuẩn hóa:</strong> ${escapeHtml(ext.productsText || '—')} (Tổng: ${ext.totalQty} đơn vị)</div>
    <div style="margin-top:0.35rem;"><strong>Ngân sách:</strong> ${formatVND(ext.budget)} &nbsp;|&nbsp; <strong>Thời hạn yêu cầu:</strong> ${ext.days} ngày &nbsp;|&nbsp; <strong>Đề nghị chiết khấu:</strong> ${ext.requestedDiscount}%</div>
    <div style="margin-top:0.35rem;"><strong>Phân công:</strong> NVKD ${escapeHtml(state.opp.owner)} phối hợp ${escapeHtml(state.opp.opsTeam)}</div>
  `);
}

function proceedStep3ToStep4() {
  syncStep3Assignment();
  markStageCompleted('step3');
  runStep4ToolAppraisal();
  goToStage('step4');
}

/* ==========================================================================
   STEP 4: THẨM ĐỊNH TỒN KHO & GIÁ (NVKD & BỘ PHẬN VẬN HÀNH)
   ========================================================================== */
function toolLookupPricelist(items) {
  return items.map(item => {
    const catalogMatch = state.products.find(p => p.sku === item.sku) || item;
    return {
      ...item,
      listPrice: catalogMatch.listPrice,
      cost: catalogMatch.cost,
      stock: catalogMatch.stock,
      leadTimeDays: catalogMatch.leadTimeDays
    };
  });
}

function runStep4ToolAppraisal() {
  const items = state.opp.extracted.items || [];
  const enriched = toolLookupPricelist(items);
  state.opp.extracted.items = enriched;

  let allInStock = enriched.length > 0;
  let maxLeadTime = 0;

  const rows = enriched.map(item => {
    const inStock = item.stock >= item.qty;
    if (!inStock) allInStock = false;
    if (item.leadTimeDays > maxLeadTime) maxLeadTime = item.leadTimeDays;
    return {
      ...item,
      inStock,
      lineTotal: item.listPrice * item.qty,
      lineCost: item.cost * item.qty
    };
  });

  const requestedDays = state.opp.extracted.days || 0;
  const timelineOk = requestedDays >= maxLeadTime;

  state.opp.appraisal = { rows, allInStock, maxLeadTime, timelineOk };
  state.opp.toolTraces = [
    {
      fn: 'tool_lookup_pricelist()',
      status: 'OK',
      detail: `Tra ${rows.length} SKU từ "${state.dataSourceName}"`
    },
    {
      fn: 'tool_check_inventory()',
      status: allInStock ? 'ĐỦ TỒN' : 'THIẾU TỒN',
      detail: allInStock ? '100% số lượng sẵn kho' : rows.filter(r => !r.inStock).map(r => `${r.sku}: cần ${r.qty}/tồn ${r.stock}`).join('; ')
    },
    {
      fn: 'tool_check_leadtime()',
      status: timelineOk ? 'ĐẠT TIẾN ĐỘ' : 'VƯỢT SLA',
      detail: `Yêu cầu ${requestedDays} ngày vs Lead-time max ${maxLeadTime} ngày`
    }
  ];

  // Set default slider discount to requested discount if not touched or keep synced
  state.opp.appliedDiscount = state.opp.extracted.requestedDiscount ?? 0;
  renderStep4UI();

  addAuditLog(
    'Bước 4: Thẩm định Tồn kho & Giá',
    `Tồn kho: ${allInStock ? 'Đủ hàng' : 'Thiếu hàng'} | Lead-time max: ${maxLeadTime} ngày vs Yêu cầu ${requestedDays} ngày`,
    allInStock && timelineOk ? 'gate-pass' : 'gate-warn',
    'step4'
  );
}

function adjustStep4Qty(index, delta) {
  const item = state.opp.extracted.items[index];
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  state.opp.extracted.totalQty = state.opp.extracted.items.reduce((s, x) => s + x.qty, 0);
  state.opp.extracted.productsText = state.opp.extracted.items.map(i => `${i.qty}x ${i.name}`).join('; ');
  runStep4ToolAppraisal();
  renderSnapshotSidebar();
}

function removeStep4Item(index) {
  if (state.opp.extracted.items.length <= 1) {
    showToast('Phải giữ ít nhất 1 dòng sản phẩm trong hồ sơ cơ hội!', 'warn');
    return;
  }
  state.opp.extracted.items.splice(index, 1);
  state.opp.extracted.totalQty = state.opp.extracted.items.reduce((s, x) => s + x.qty, 0);
  state.opp.extracted.productsText = state.opp.extracted.items.map(i => `${i.qty}x ${i.name}`).join('; ');
  runStep4ToolAppraisal();
  renderSnapshotSidebar();
}

function renderStep4UI() {
  setHTML('step4-tool-traces', state.opp.toolTraces.map(t => `
    <div class="tool-trace-card">
      <strong>&gt; ${escapeHtml(t.fn)}</strong>
      <span class="${t.status === 'OK' || t.status === 'ĐỦ TỒN' || t.status === 'ĐẠT TIẾN ĐỘ' ? 'tool-badge-ok' : 'tool-badge-warn'}">[${escapeHtml(t.status)}]</span>
      <span>${escapeHtml(t.detail)}</span>
    </div>`).join(''));

  const tbody = $('step4-appraisal-tbody');
  if (tbody) {
    tbody.innerHTML = state.opp.appraisal.rows.map((row, idx) => `
      <tr>
        <td>
          <strong>${escapeHtml(row.name)}</strong><br/>
          <small style="color:#64748b">${escapeHtml(row.sku)} • Vốn: ${formatVND(row.cost)}</small>
        </td>
        <td>
          <div class="qty-stepper">
            <button type="button" class="qty-btn" onclick="adjustStep4Qty(${idx}, -1)">-</button>
            <span class="qty-val">${row.qty}</span>
            <button type="button" class="qty-btn" onclick="adjustStep4Qty(${idx}, 1)">+</button>
          </div>
        </td>
        <td>${formatVND(row.listPrice)}</td>
        <td>
          <span class="deal-tag ${row.inStock ? 'ready' : 'pending'}">
            ${row.stock} ${escapeHtml(row.unit)} ${row.inStock ? '✓ Đủ' : `✗ Thiếu ${row.qty - row.stock}`}
          </span>
        </td>
        <td>${row.leadTimeDays} ngày</td>
        <td><strong>${formatVND(row.lineTotal)}</strong></td>
        <td><button type="button" class="btn-remove-item" onclick="removeStep4Item(${idx})" title="Xóa dòng">×</button></td>
      </tr>`).join('');
  }

  const callout = $('step4-appraisal-callout');
  if (callout) {
    const { allInStock, timelineOk, maxLeadTime } = state.opp.appraisal;
    const reqDays = state.opp.extracted.days || 0;
    if (allInStock && timelineOk) {
      callout.className = 'appraise-summary-bar ok';
      callout.textContent = `✅ Đủ khả năng đáp ứng: Toàn bộ tồn kho khả dụng đạt 100% và thời gian giao hàng (${reqDays} ngày ≥ Lead-time ${maxLeadTime} ngày).`;
    } else {
      const issues = [];
      if (!allInStock) issues.push('tồn kho tức thì chưa đủ số lượng đặt');
      if (!timelineOk) issues.push(`thời hạn khách yêu cầu (${reqDays} ngày) ngắn hơn lead-time thực tế (${maxLeadTime} ngày)`);
      callout.className = 'appraise-summary-bar warn';
      callout.textContent = `⚠️ Cảnh báo Vận hành: ${issues.join(' & ')}. Hệ thống sẽ gắn cờ kiểm soát thẩm quyền ở Bước 5.`;
    }
  }
}

function proceedStep4ToStep5() {
  markStageCompleted('step4');
  computeStep5QuoteAndCondition2();
  goToStage('step5');
}

/* ==========================================================================
   STEP 5: LẬP BÁO GIÁ & ĐIỀU KIỆN 2 [VƯỢT THẨM QUYỀN / CHIẾT KHẤU ĐẶC BIỆT?]
   ========================================================================== */
function computeStep5QuoteAndCondition2() {
  const rows = state.opp.appraisal.rows || [];
  const subtotal = rows.reduce((s, r) => s + r.lineTotal, 0);
  const totalCost = rows.reduce((s, r) => s + r.lineCost, 0);
  const discountPct = Number(state.opp.appliedDiscount || 0);
  const discountAmt = Math.round(subtotal * (discountPct / 100));
  const netRevenue = Math.max(0, subtotal - discountAmt);
  const vat = Math.round(netRevenue * POLICY.vatRate);
  const grandTotal = netRevenue + vat;
  const marginPercent = netRevenue > 0 ? ((netRevenue - totalCost) / netRevenue) * 100 : 0;

  const budget = state.opp.extracted.budget || 0;
  const budgetOk = budget <= 0 || grandTotal <= budget;

  const exceedReasons = [];
  if (discountPct > POLICY.maxSalesDiscountPercent) {
    exceedReasons.push(`Chiết khấu ${discountPct}% vượt hạn mức tự duyệt NVKD (${POLICY.maxSalesDiscountPercent}%)`);
  }
  if (marginPercent < POLICY.minGrossMarginPercent) {
    exceedReasons.push(`Biên lợi nhuận gộp ${marginPercent.toFixed(1)}% thấp hơn ngưỡng sàn ${POLICY.minGrossMarginPercent}%`);
  }
  if (!state.opp.appraisal.allInStock) {
    const shortList = rows.filter(r => !r.inStock).map(r => `${r.name} (cần ${r.qty}/tồn ${r.stock})`).join(', ');
    exceedReasons.push(`Vượt tồn kho khả dụng hiện tại: ${shortList}`);
  }
  if (!state.opp.appraisal.timelineOk) {
    exceedReasons.push(`Thời hạn gấp (${state.opp.extracted.days} ngày) < Lead-time tối thiểu (${state.opp.appraisal.maxLeadTime} ngày)`);
  }
  if (!budgetOk) {
    exceedReasons.push(`Tổng đề xuất (${formatVND(grandTotal)}) vượt ngân sách khách hàng (${formatVND(budget)})`);
  }

  state.opp.subtotal = subtotal;
  state.opp.discountAmt = discountAmt;
  state.opp.netRevenue = netRevenue;
  state.opp.vat = vat;
  state.opp.grandTotal = grandTotal;
  state.opp.totalCost = totalCost;
  state.opp.marginPercent = marginPercent;
  state.opp.budgetOk = budgetOk;
  state.opp.exceedReasons = exceedReasons;
  state.opp.condition2Exceeded = exceedReasons.length > 0;
  state.opp.proposalDraft = buildProposalDraftText();

  renderStep5UI();
}

function updateStep5Discount(value) {
  state.opp.appliedDiscount = parseFloat(value) || 0;
  computeStep5QuoteAndCondition2();
  renderSnapshotSidebar();
}

function buildProposalDraftText() {
  const rows = state.opp.appraisal.rows || [];
  const lineSummary = rows
    .map((r, i) => `  ${i + 1}. ${r.name}: ${r.qty} ${r.unit} × ${formatVND(r.listPrice)} = ${formatVND(r.lineTotal)}`)
    .join('\n');

  return `DỰ THẢO ĐỀ XUẤT BÁO GIÁ B2B — CÔNG TY MINH AN
Mã cơ hội: ${state.opp.id} | Khách hàng: ${state.opp.company}
Người phụ trách: ${state.opp.owner}

CHI TIẾT HẠNG MỤC:
${lineSummary}

TỔNG HỢP TÀI CHÍNH:
- Tổng giá trị niêm yết: ${formatVND(state.opp.subtotal)}
- Chiết khấu áp dụng (${state.opp.appliedDiscount}%): -${formatVND(state.opp.discountAmt)}
- Giá trị trước thuế: ${formatVND(state.opp.netRevenue)}
- Thuế GTGT (10%): ${formatVND(state.opp.vat)}
- TỔNG GIÁ TRỊ ĐỀ XUẤT: ${formatVND(state.opp.grandTotal)}
- Đối chiếu ngân sách KH (${formatVND(state.opp.extracted.budget)}): ${state.opp.budgetOk ? 'PHÙ HỢP' : 'VƯỢT NGÂN SÁCH'}
- Thời gian triển khai dự kiến: ${Math.max(state.opp.extracted.days || 0, state.opp.appraisal.maxLeadTime)} ngày kể từ ngày ký PO.`;
}

function regenerateProposalDraft() {
  state.opp.proposalDraft = buildProposalDraftText();
  setValue('step5-draft-editor', state.opp.proposalDraft);
  showToast('Đã đồng bộ lại Dự thảo đề xuất từ số liệu mới nhất!', 'info');
}

function renderStep5UI() {
  setValue('step5-discount-slider', String(state.opp.appliedDiscount));
  setText('step5-discount-badge', `${state.opp.appliedDiscount}%`);
  setText('step5-subtotal', formatVND(state.opp.subtotal));
  setText('step5-discount-amt', '-' + formatVND(state.opp.discountAmt));
  setText('step5-vat', formatVND(state.opp.vat));
  setText('step5-margin', `${state.opp.marginPercent.toFixed(1)}% (Sàn ≥ ${POLICY.minGrossMarginPercent}%)`);
  setText('step5-budget-check', state.opp.budgetOk ? `Đạt (≤ ${formatCompactMoney(state.opp.extracted.budget)})` : `Vượt ${formatVND(state.opp.grandTotal - state.opp.extracted.budget)}`);
  setText('step5-grand-total', formatVND(state.opp.grandTotal));
  setValue('step5-draft-editor', state.opp.proposalDraft);

  const box2 = $('diamond-box-2');
  if (box2) {
    box2.classList.toggle('is-warn', state.opp.condition2Exceeded);
    box2.classList.toggle('is-ok', !state.opp.condition2Exceeded);
  }
  const pill2 = $('diamond-2-status');
  if (pill2) {
    pill2.textContent = state.opp.condition2Exceeded ? 'CÓ — Vượt thẩm quyền' : 'KHÔNG — Hợp lệ NVKD';
    pill2.className = `status-pill ${state.opp.condition2Exceeded ? 'warn' : ''}`.trim();
  }
  const reasonEl = $('diamond-2-reason');
  if (reasonEl) {
    if (state.opp.condition2Exceeded) {
      reasonEl.className = 'decision-callout warn';
      reasonEl.innerHTML = `⚠️ <strong>Điều kiện 2 = CÓ</strong> — Lý do cần trình Trưởng phòng duyệt: <ul style="margin:0.35rem 0 0 1.2rem;">${state.opp.exceedReasons.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>`;
    } else {
      reasonEl.className = 'decision-callout ok';
      reasonEl.textContent = `✅ Điều kiện 2 = KHÔNG — Chiết khấu (${state.opp.appliedDiscount}% ≤ 5%), biên lợi nhuận (${state.opp.marginPercent.toFixed(1)}% ≥ 15%), tồn kho & tiến độ đều hợp lệ. Có thể đi thẳng Bước 6!`;
    }
  }

  const btnDk2False = $('btn-dk2-false');
  if (btnDk2False) btnDk2False.disabled = state.opp.condition2Exceeded;
}

function triggerCondition2True() {
  state.opp.proposalDraft = $('step5-draft-editor')?.value || state.opp.proposalDraft;
  state.opp.condition2Exceeded = true;
  if (!state.opp.exceedReasons.length) {
    state.opp.exceedReasons = ['NVKD chuyển trình phê duyệt bổ sung điều khoản đặc biệt theo quy trình'];
  }
  state.opp.statusKey = 'pending';
  state.opp.statusLabel = 'Chờ duyệt';
  state.opp.managerApproved = false;
  state.opp.approvalSlip = buildManagerApprovalSlip();

  setText('approval-slip-preview', state.opp.approvalSlip);
  setValue('manager-approver', state.opp.approver);
  setValue('manager-note', state.opp.managerNote);

  markStageCompleted('step5');
  addAuditLog(
    'Điều kiện 2 = CÓ (Chờ duyệt)',
    `Xuất Phiếu trình Trưởng phòng duyệt: ${state.opp.exceedReasons.join('; ')}`,
    'gate-warn',
    'manager'
  );
  goToStage('manager');
  showToast('Điều kiện 2 = CÓ: Đã xuất Phiếu trình Trưởng phòng duyệt!', 'warn');
}

function triggerCondition2False() {
  computeStep5QuoteAndCondition2();
  if (state.opp.condition2Exceeded) {
    showToast('Hồ sơ đang vượt thẩm quyền NVKD, bắt buộc rẽ nhánh "CÓ -> Trưởng phòng duyệt"!', 'warn');
    return;
  }
  state.opp.proposalDraft = $('step5-draft-editor')?.value || state.opp.proposalDraft;
  state.opp.statusKey = 'ready';
  state.opp.statusLabel = 'Đủ điều kiện tiếp tục';
  state.opp.approvalSlip = '';

  markStageCompleted('step5');
  addAuditLog(
    'Điều kiện 2 = KHÔNG (Hợp lệ)',
    `Chiết khấu ${state.opp.appliedDiscount}% và biên ${state.opp.marginPercent.toFixed(1)}% hợp lệ. Gắn trạng thái "Đủ điều kiện tiếp tục".`,
    'gate-pass',
    'step5'
  );
  prepareStep6Outputs();
  goToStage('step6');
}

function buildManagerApprovalSlip() {
  const reasonsList = state.opp.exceedReasons.map((r, i) => `  ${i + 1}. ${r}`).join('\n');
  return `====================================================================
PHIẾU TRÌNH DUYỆT CƠ HỘI BÁN HÀNG B2B VƯỢT THẨM QUYỀN
CÔNG TY MINH AN
====================================================================
Mã cơ hội       : ${state.opp.id}
Khách hàng      : ${state.opp.company}
NVKD phụ trách  : ${state.opp.owner}
Phối hợp Vận hành: ${state.opp.opsTeam}
Trạng thái      : CHỜ DUYỆT (Trình ${state.opp.approver})

1. TÓM TẮT ĐỀ XUẤT TÀI CHÍNH:
   - Tổng giá niêm yết : ${formatVND(state.opp.subtotal)}
   - Mức chiết khấu    : ${state.opp.appliedDiscount}% (-${formatVND(state.opp.discountAmt)})
   - Tổng sau thuế VAT : ${formatVND(state.opp.grandTotal)}
   - Ngân sách KH      : ${formatVND(state.opp.extracted.budget)}
   - Biên lợi nhuận gộp: ${state.opp.marginPercent.toFixed(1)}% (Chính sách chuẩn ≥ ${POLICY.minGrossMarginPercent}%)

2. LÝ DO VƯỢT THẨM QUYỀN / CHIẾT KHẤU ĐẶC BIỆT:
${reasonsList}

3. KIẾN NGHỊ ĐỐI VỚI TRƯỞNG PHÒNG:
   Đề nghị Trưởng phòng Kinh doanh xem xét phê duyệt mức chiết khấu / điều kiện giao hàng đặc biệt nêu trên để NVKD tiến hành chốt báo giá ở Bước 6.
====================================================================`;
}

function copyApprovalSlip() {
  const text = state.opp.approvalSlip || '';
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
  showToast('Đã sao chép Phiếu trình Trưởng phòng duyệt!', 'success');
}

function proceedManagerPendingToStep6() {
  state.opp.approver = $('manager-approver')?.value || state.opp.approver;
  state.opp.managerNote = $('manager-note')?.value || '';
  state.opp.statusKey = 'pending';
  state.opp.statusLabel = 'Chờ duyệt';
  state.opp.managerApproved = false;
  state.opp.approvalSlip = buildManagerApprovalSlip();

  markStageCompleted('manager');
  addAuditLog(
    'Trình Trưởng phòng (Trạng thái Chờ duyệt)',
    `Đã xuất Phiếu chuyển duyệt gửi ${state.opp.approver} và chuyển sang Bước 6 theo dõi.`,
    'gate-warn',
    'manager'
  );
  prepareStep6Outputs();
  goToStage('step6');
}

function approveManagerAndGoStep6() {
  state.opp.approver = $('manager-approver')?.value || state.opp.approver;
  state.opp.managerNote = $('manager-note')?.value || 'Đồng ý phê duyệt ngoại lệ theo phiếu trình.';
  state.opp.managerApproved = true;
  state.opp.statusKey = 'ready';
  state.opp.statusLabel = 'Đủ điều kiện tiếp tục';

  markStageCompleted('manager');
  addAuditLog(
    'Trưởng phòng Đã phê duyệt',
    `${state.opp.approver} đã ký duyệt ngoại lệ (${state.opp.managerNote}). Chuyển trạng thái "Đủ điều kiện tiếp tục".`,
    'gate-pass',
    'manager'
  );
  prepareStep6Outputs();
  goToStage('step6');
  showToast('Trưởng phòng đã ký duyệt! Chuyển sang Bước 6 hoàn tất hồ sơ.', 'success');
}

/* ==========================================================================
   STEP 6: CẬP NHẬT & THEO DÕI (END NODE)
   ========================================================================== */
function prepareStep6Outputs() {
  markStageCompleted('step6');

  setHTML('step6-final-summary', `
    <div><strong>Hồ sơ cơ hội:</strong> <span class="deal-id-code">${escapeHtml(state.opp.id)}</span> — <strong>${escapeHtml(state.opp.company)}</strong></div>
    <div style="margin-top:0.35rem;"><strong>Phụ trách:</strong> ${escapeHtml(state.opp.owner)} &nbsp;|&nbsp; <strong>Tổng giá trị đề xuất:</strong> <span style="color:#0284c7;font-weight:800">${formatVND(state.opp.grandTotal)}</span> (Chiết khấu ${state.opp.appliedDiscount}%, Biên LN ${state.opp.marginPercent.toFixed(1)}%)</div>
  `);

  const statusPill = $('step6-status-pill');
  if (statusPill) {
    statusPill.textContent = state.opp.statusLabel;
    statusPill.className = `status-pill ${state.opp.statusKey === 'pending' ? 'warn' : ''}`.trim();
  }

  const evidenceItems = [
    {
      label: 'Căn cứ 1: Thông tin đầu vào (ĐK1)',
      value: `Đủ 5/5 trường • Ngân sách ${formatCompactMoney(state.opp.extracted.budget)} • ${state.opp.extracted.days} ngày`
    },
    {
      label: 'Căn cứ 2: Bảng giá & Tồn kho',
      value: state.opp.appraisal.allInStock
        ? `Đủ tồn kho 100% (Lead-time max ${state.opp.appraisal.maxLeadTime} ngày)`
        : `Thiếu tồn kho tức thì / Lead-time max ${state.opp.appraisal.maxLeadTime} ngày`
    },
    {
      label: 'Căn cứ 3: Chính sách Tài chính & Thẩm quyền',
      value: `Chiết khấu ${state.opp.appliedDiscount}% (Ngưỡng ${POLICY.maxSalesDiscountPercent}%) • Biên ${state.opp.marginPercent.toFixed(1)}% (Sàn ${POLICY.minGrossMarginPercent}%)`
    },
    {
      label: 'Căn cứ 4: Luồng phê duyệt (ĐK2)',
      value: state.opp.condition2Exceeded
        ? (state.opp.managerApproved ? `Đã được ${state.opp.approver} ký duyệt` : `Xuất Phiếu trình ${state.opp.approver} (${state.opp.statusLabel})`)
        : 'Nằm trong thẩm quyền NVKD — Đi thẳng End Node'
    }
  ];

  setHTML('step6-evidence-box', evidenceItems.map(ev => `
    <div class="evidence-item">
      <span>${escapeHtml(ev.label)}</span>
      <strong>${escapeHtml(ev.value)}</strong>
    </div>`).join(''));

  state.opp.finalEmailDraft = buildCustomerFinalEmail();
  setValue('step6-email-preview', state.opp.finalEmailDraft);

  const fullLogText = state.opp.auditLogs
    .slice()
    .reverse()
    .map(l => `[${l.time}] [${l.node.toUpperCase()}] ${l.title} -> ${l.desc}`)
    .join('\n') + (state.opp.approvalSlip ? `\n\n${state.opp.approvalSlip}` : '');
  setValue('step6-log-preview', fullLogText);

  saveFinalRecordToCrm(false);
}

function buildCustomerFinalEmail() {
  const company = state.opp.company || 'Quý Công ty';
  const statusNote = state.opp.statusKey === 'pending'
    ? 'Báo giá đang áp dụng chính sách ưu đãi đặc biệt và hiện được trình Ban Lãnh đạo Minh An phê duyệt nhanh trong 04 giờ làm việc để chính thức phát hành.'
    : 'Báo giá đã hoàn tất thẩm định tồn kho và giá, sẵn sàng triển khai ngay theo đúng tiến độ Quý Công ty yêu cầu.';

  return `Tiêu đề: [Minh An Company] Hồ sơ Đề xuất Báo giá B2B - Mã ${state.opp.id} (${company})

Kính gửi Quý Công ty ${company},

Công ty Minh An xin trân trọng gửi đến Quý Công ty kết quả thẩm định và dự thảo báo giá cho mã cơ hội ${state.opp.id}:

1. Danh mục sản phẩm / giải pháp: ${state.opp.extracted.productsText}
2. Tổng giá trị đề xuất (đã gồm 10% VAT): ${formatVND(state.opp.grandTotal)}
3. Mức chiết khấu đề xuất: ${state.opp.appliedDiscount}% (-${formatVND(state.opp.discountAmt)})
4. Tình trạng hồ sơ: ${state.opp.statusLabel}

Ghi chú xử lý: ${statusNote}

Quý Công ty vui lòng xem chi tiết các hạng mục đính kèm và phản hồi cho Chuyên viên phụ trách ${state.opp.owner} nếu cần điều chỉnh thêm.

Trân trọng,
${state.opp.owner} — Bộ phận Kinh doanh B2B, Công ty Minh An`;
}

function copyFinalProposalEmail() {
  const text = $('step6-email-preview')?.textContent || $('step6-email-preview')?.value || state.opp.finalEmailDraft || '';
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
  showToast('Đã sao chép bản nháp email phản hồi khách hàng!', 'success');
}

function downloadExecutionLog() {
  const content = $('step6-log-preview')?.textContent || $('step6-log-preview')?.value || state.opp.approvalSlip || '';
  if (typeof document === 'undefined' || typeof Blob === 'undefined') return;
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${state.opp.id || 'MinhAn-B2B'}-execution-log.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('Đã tải xuống Log thực thi & Hồ sơ đối chiếu!', 'success');
}

function buildFiveFieldSchemaObject(ext = {}) {
  return {
    danh_muc_san_pham: ext.productsText || null,
    so_luong: ext.totalQty > 0 ? ext.totalQty : null,
    ngan_sach: ext.budget > 0 ? ext.budget : null,
    thoi_han_trien_khai: ext.days > 0 ? ext.days : null,
    de_nghi_chiet_khau: ext.requestedDiscount !== null && ext.requestedDiscount !== undefined ? ext.requestedDiscount : 0
  };
}

function buildStructuredAuditRecord() {
  const opp = state.opp;
  return {
    schema: 'minh-an-b2b-audit/v1',
    exportedAt: new Date().toISOString(),
    opportunityId: opp.id || null,
    company: opp.company,
    contact: opp.contact,
    channel: opp.channel,
    owner: opp.owner,
    workflowState: {
      currentStage: state.currentStage,
      statusKey: opp.statusKey,
      statusLabel: opp.statusLabel,
      loopCount: state.loopCount,
      condition1Passed: opp.condition1Passed,
      missingFields: opp.missingFields,
      condition2Exceeded: opp.condition2Exceeded,
      exceedReasons: opp.exceedReasons
    },
    extractedFields: opp.extracted,
    extracted5FieldsSchema: buildFiveFieldSchemaObject(opp.extracted),
    appraisal: opp.appraisal,
    financials: {
      subtotal: opp.subtotal,
      discountAmount: opp.discountAmount,
      vatAmount: opp.vatAmount,
      grandTotal: opp.grandTotal,
      marginPercent: Number((opp.marginPercent || 0).toFixed(1)),
      budgetGap: opp.budgetGap
    },
    toolCalls: [
      { step: 1, tool: 'data_ingestion_loader', status: 'ok' },
      { step: 2, tool: 'extract_and_validate_5_fields', status: opp.condition1Passed ? 'complete' : 'missing_fields' },
      { step: 3, tool: 'opportunity_profile_init', oppId: opp.id || null, owner: opp.owner },
      { step: 4, tool: 'catalog_inventory_leadtime_lookup', itemsChecked: (opp.extracted?.items || []).length },
      { step: 5, tool: 'proposal_margin_policy_calculator', marginPercent: Number((opp.marginPercent || 0).toFixed(1)) }
    ],
    ruleApplications: {
      condition1_completeness: opp.condition1Passed ? 'TRUE -> Step 3' : `FALSE (${(opp.missingFields || []).join(', ')}) -> Clarify & Loop Step 1`,
      condition2_authorization: opp.condition2Exceeded ? `TRUE (${(opp.exceedReasons || []).join('; ')}) -> Chờ duyệt` : 'FALSE -> Đủ điều kiện tiếp tục',
      maxSalesDiscountPercent: POLICY.maxSalesDiscountPercent,
      minGrossMarginPercent: POLICY.minGrossMarginPercent,
      vatRate: POLICY.vatRate
    },
    auditLogs: Array.isArray(opp.auditLogs) ? opp.auditLogs.slice(0, 30) : []
  };
}

function persistAuditRecordToServer(record) {
  if (typeof fetch !== 'function' || typeof window === 'undefined') return;
  try {
    fetch('/api/audit-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    }).catch(() => {});
  } catch (_) {}
}

function exportStructuredAuditJson() {
  const record = buildStructuredAuditRecord();
  persistAuditRecordToServer(record);
  const payload = JSON.stringify(record, null, 2);
  if (typeof document === 'undefined' || typeof Blob === 'undefined') return payload;
  const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${state.opp.id || 'MinhAn-B2B'}-audit-log.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('Đã xuất & lưu Audit Trail (.json)!', 'success');
  return payload;
}

function upsertCrmDeal(record, skipRender = false) {
  const idx = state.deals.findIndex(d => d.id === record.id);
  if (idx >= 0) {
    state.deals[idx] = record;
  } else {
    state.deals.unshift(record);
  }
  if (!skipRender) {
    renderDealsTable(record.id);
    if (typeof renderAnalyticsDashboard === 'function') {
      renderAnalyticsDashboard();
    }
  }
}

function batchUpsertCrmDeals(records) {
  if (!Array.isArray(records) || !records.length) return;
  const indexById = new Map();
  state.deals.forEach((d, idx) => indexById.set(d.id, idx));
  const newlyAdded = [];
  records.forEach(r => {
    const existingIdx = indexById.get(r.id);
    if (existingIdx !== undefined) {
      state.deals[existingIdx] = r;
    } else {
      indexById.set(r.id, state.deals.length + newlyAdded.length);
      newlyAdded.push(r);
    }
  });
  if (newlyAdded.length) {
    state.deals = newlyAdded.concat(state.deals);
  }
  renderDealsTable();
}

function saveFinalRecordToCrm(notifyUser = true) {
  const deal = {
    id: state.opp.id || generateOpportunityId(),
    company: state.opp.company,
    contact: state.opp.contact || 'Chưa có',
    channel: state.opp.channel,
    owner: state.opp.owner,
    category: state.opp.category,
    itemsSummary: state.opp.extracted.productsText,
    totalValue: state.opp.grandTotal,
    discountPercent: state.opp.appliedDiscount,
    marginPercent: Number(state.opp.marginPercent.toFixed(1)),
    statusKey: state.opp.statusKey === 'pending' ? 'pending' : state.opp.statusKey === 'clarify' ? 'clarify' : 'ready',
    statusLabel: state.opp.statusLabel,
    note: state.opp.exceedReasons.length ? state.opp.exceedReasons.join(' | ') : 'Đạt chuẩn thẩm định 6 bước'
  };
  state.opp.id = deal.id;
  upsertCrmDeal(deal);
  persistAuditRecordToServer(buildStructuredAuditRecord());
  if (notifyUser) {
    addAuditLog('Cập nhật Bảng theo dõi CRM', `Đã đồng bộ mã ${deal.id} (${deal.statusLabel}) vào CRM Minh An.`, 'gate-pass', 'step6');
    showToast(`Đã cập nhật hồ sơ ${deal.id} vào Bảng theo dõi CRM!`, 'success');
    scrollToTracking();
  }
}

/* ==========================================================================
   AI AGENT SEQUENTIAL AUTO-EXECUTION RUNNER
   ========================================================================== */
function waitStepDelay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function executeAgentSequentially(fastMode = false) {
  const delay = fastMode ? 0 : 480;
  const myToken = ++state.runToken;
  state.isRunningAgent = true;

  onStep1Input();
  if (!state.opp.rawText.trim()) {
    state.isRunningAgent = false;
    showToast('Vui lòng nhập yêu cầu khách hàng hoặc chọn 1 tình huống mẫu ở Bước 1!', 'warn');
    return;
  }

  // Step 1
  goToStage('step1');
  addAuditLog('AI Agent Bắt đầu thực thi tuần tự', `Tiếp nhận yêu cầu từ ${state.opp.company}`, 'info', 'step1');
  if (delay) await waitStepDelay(delay);
  if (state.runToken !== myToken) return;
  markStageCompleted('step1');

  // Step 2 + DK1
  if (state.api.configured && state.api.useLiveApi && typeof fetch === 'function') {
    addAuditLog('AI API Bóc tách dữ liệu', `Gửi yêu cầu tới ${state.api.model} (${state.api.maskedKey})...`, 'info', 'step2');
    await parseAndEvaluateStep2WithApi();
  } else {
    parseAndEvaluateStep2();
  }
  goToStage('step2');
  if (delay) await waitStepDelay(delay + 120);
  if (state.runToken !== myToken) return;

  if (!state.opp.condition1Passed) {
    triggerCondition1False();
    state.isRunningAgent = false;
    return;
  }

  markStageCompleted('step2');

  // Step 3
  initializeStep3Record();
  goToStage('step3');
  if (delay) await waitStepDelay(delay);
  if (state.runToken !== myToken) return;
  markStageCompleted('step3');

  // Step 4
  runStep4ToolAppraisal();
  goToStage('step4');
  if (delay) await waitStepDelay(delay + 120);
  if (state.runToken !== myToken) return;
  markStageCompleted('step4');

  // Step 5 + DK2
  computeStep5QuoteAndCondition2();
  goToStage('step5');
  if (delay) await waitStepDelay(delay + 120);
  if (state.runToken !== myToken) return;

  if (state.opp.condition2Exceeded) {
    triggerCondition2True();
    if (delay) await waitStepDelay(delay + 120);
    if (state.runToken !== myToken) return;
    // Automatically advance pending dossier + approval slip to Step 6 tracking while retaining "Chờ duyệt" status
    proceedManagerPendingToStep6();
  } else {
    triggerCondition2False();
  }

  state.isRunningAgent = false;
  showToast(`AI Agent hoàn tất 6 bước cho ${state.opp.id}: ${state.opp.statusLabel}`, 'success');
}

/* ==========================================================================
   EXPORTS (EXCEL & PRINT-READY PDF)
   ========================================================================== */
function exportProposalExcel() {
  const filename = `${state.opp.id || 'BaoGia-MinhAn'}.xlsx`;
  if (typeof XLSX === 'undefined') {
    const csvLines = [
      'SKU,SanPham,SoLuong,DonGia,TonKho,LeadTime,ThanhTien',
      ...(state.opp.appraisal.rows || []).map(r => `${r.sku},"${r.name}",${r.qty},${r.listPrice},${r.stock},${r.leadTimeDays},${r.lineTotal}`),
      `,,,"Chiet khau (${state.opp.appliedDiscount}%)",,,-${state.opp.discountAmt}`,
      `,,,"VAT (10%)",,,${state.opp.vat}`,
      `,,,"TONG DE XUAT (${state.opp.statusLabel})",,,${state.opp.grandTotal}`
    ].join('\n');
    if (typeof document !== 'undefined' && typeof Blob !== 'undefined') {
      const blob = new Blob([csvLines], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${state.opp.id || 'BaoGia-MinhAn'}.csv`;
      a.click();
    }
    showToast('Đã xuất bảng tính báo giá định dạng CSV.', 'success');
    return;
  }

  const sheetData = [
    ['CÔNG TY MINH AN — HỒ SƠ BÁO GIÁ B2B', '', '', '', '', ''],
    ['Mã cơ hội', state.opp.id, 'Khách hàng', state.opp.company, 'Trạng thái', state.opp.statusLabel],
    ['NVKD phụ trách', state.opp.owner, 'Chiết khấu áp dụng', `${state.opp.appliedDiscount}%`, 'Biên lợi nhuận', `${state.opp.marginPercent.toFixed(1)}%`],
    [],
    ['SKU', 'Tên sản phẩm', 'Số lượng', 'Đơn giá niêm yết', 'Tồn khả dụng', 'Thành tiền'],
    ...(state.opp.appraisal.rows || []).map(r => [r.sku, r.name, r.qty, r.listPrice, r.stock, r.lineTotal]),
    ['', '', '', '', 'Tạm tính', state.opp.subtotal],
    ['', '', '', '', `Chiết khấu (${state.opp.appliedDiscount}%)`, -state.opp.discountAmt],
    ['', '', '', '', 'VAT (10%)', state.opp.vat],
    ['', '', '', '', 'TỔNG CỘNG', state.opp.grandTotal]
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(wb, ws, 'BaoGia_B2B');
  XLSX.writeFile(wb, filename);
  showToast(`Đã xuất file Excel ${filename}`, 'success');
}

function exportProposalPdf() {
  if (typeof window === 'undefined' || !window.open) return;
  const win = window.open('', '_blank', 'width=900,height=720');
  if (!win) {
    showToast('Trình duyệt đang chặn popup. Vui lòng cho phép mở cửa sổ in PDF!', 'warn');
    return;
  }
  const rowsHtml = (state.opp.appraisal.rows || [])
    .map(r => `<tr><td>${escapeHtml(r.sku)}</td><td>${escapeHtml(r.name)}</td><td>${r.qty}</td><td>${formatVND(r.listPrice)}</td><td>${formatVND(r.lineTotal)}</td></tr>`)
    .join('');

  win.document.write(`
    <!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><title>${escapeHtml(state.opp.id)} - Báo giá Minh An</title>
    <style>body{font-family:Arial,sans-serif;padding:28px;color:#0f172a;line-height:1.5}h1{font-size:20px;margin:0 0 6px}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{border:1px solid #cbd5e1;padding:8px;font-size:13px;text-align:left}th{background:#f1f5f9}pre{background:#fffbeb;border:1px solid #f59e0b;padding:12px;font-size:12px;white-space:pre-wrap}</style>
    </head><body>
      <h1>CÔNG TY MINH AN — HỒ SƠ THẨM ĐỊNH & BÁO GIÁ B2B</h1>
      <p><strong>Mã cơ hội:</strong> ${escapeHtml(state.opp.id)} | <strong>Khách hàng:</strong> ${escapeHtml(state.opp.company)} | <strong>Trạng thái:</strong> ${escapeHtml(state.opp.statusLabel)}</p>
      <p><strong>Phụ trách:</strong> ${escapeHtml(state.opp.owner)} & ${escapeHtml(state.opp.opsTeam)}</p>
      <table><thead><tr><th>SKU</th><th>Sản phẩm</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody>${rowsHtml}</tbody></table>
      <p><strong>Tổng đề xuất (gồm VAT 10%, CK ${state.opp.appliedDiscount}%):</strong> ${formatVND(state.opp.grandTotal)} | <strong>Biên lợi nhuận:</strong> ${state.opp.marginPercent.toFixed(1)}%</p>
      ${state.opp.approvalSlip ? `<h3>Phiếu trình Trưởng phòng duyệt</h3><pre>${escapeHtml(state.opp.approvalSlip)}</pre>` : ''}
      <script>window.print();<\/script>
    </body></html>`);
  win.document.close();
}

/* ==========================================================================
   SIDEBAR SNAPSHOT & LIVE SVG FLOWCHART
   ========================================================================== */
function isLikelyIdOrNumeric(val) {
  const s = String(val ?? '').trim();
  if (!s) return true;
  if (isNumericLikeValue(s)) return true;
  return /^(?:id|kh|opp|rec|deal)[-_]?\d{3,}$/i.test(s);
}

function resolveBestCompanyName(rawRow, currentCompany) {
  const cur = String(currentCompany || '').trim();
  if (rawRow && typeof rawRow === 'object') {
    const keys = Object.keys(rawRow).filter(k => !k.startsWith('_'));
    const nameKey = findColumnByAlias(
      keys,
      ['tên khách hàng', 'ten khach hang', 'tên công ty', 'ten cong ty', 'company name', 'customer name', 'client name', 'tên đơn vị', 'tên đối tác', 'company', 'client', 'công ty', 'đối tác', 'khách hàng'],
      ['id', 'mã ', 'ma ', 'mã_', 'ma_', 'code', 'stt', 'số thứ tự', 'phone', 'sdt', 'sđt', 'tel', 'email', 'mail']
    );
    if (nameKey) {
      const candidate = String(rawRow[nameKey] ?? '').trim();
      if (candidate && !isLikelyIdOrNumeric(candidate)) {
        if (!cur || isLikelyIdOrNumeric(cur) || /^(?:Khách hàng|Đơn vị)\s*#\d+$/i.test(cur)) {
          return candidate;
        }
      }
    }
  }
  if (cur && !isLikelyIdOrNumeric(cur)) return cur;
  return cur;
}

function renderSnapshotSidebar() {
  setText('snap-deal-id', state.opp.id || 'CHƯA CẤP MÃ');
  const displayCompany = resolveBestCompanyName(state.opp.rawRow, state.opp.company);
  if (displayCompany && displayCompany !== state.opp.company) {
    state.opp.company = displayCompany;
  }
  setText('snap-company', displayCompany || 'Chưa nhập tên khách hàng');
  setText('snap-owner', `Phụ trách: ${state.opp.owner || 'Chưa phân công'}`);

  const badge = $('snap-status-badge');
  if (badge) {
    badge.textContent = state.opp.statusLabel;
    badge.className = `snapshot-status-badge ${state.opp.statusKey === 'clarify' ? 'clarify' : state.opp.statusKey === 'pending' ? 'pending' : state.opp.statusKey === 'ready' ? 'ready' : ''}`.trim();
  }

  setText('snap-items-count', state.opp.extracted.totalQty > 0 ? `${state.opp.extracted.totalQty} đơn vị` : '—');
  setText('snap-discount', state.opp.calculationHalted ? 'Đã dừng' : `${state.opp.appliedDiscount ?? state.opp.extracted.requestedDiscount ?? 0}%`);
  setText('snap-budget', state.opp.extracted.budget ? formatCompactMoney(state.opp.extracted.budget) : 'Chưa rõ');
  setText('snap-margin', state.opp.calculationHalted || !state.opp.grandTotal ? '—' : `${state.opp.marginPercent.toFixed(1)}%`);
  setText('snap-grand-total', state.opp.calculationHalted ? '0 ₫ (Đang dừng)' : formatVND(state.opp.grandTotal));
}

function buildFlowchartSvg(mode = 'mini') {
  const cur = state.currentStage;
  const vis = state.visitedStages;
  const done = state.completedStages;

  function boxStyle(stageKey, baseFill, baseStroke) {
    if (cur === stageKey) return { fill: '#eff6ff', stroke: '#2563eb', sw: 2.8, textFill: '#1e3a8a' };
    if (done.has(stageKey)) return { fill: '#ecfdf5', stroke: '#16a34a', sw: 2.1, textFill: '#14532d' };
    if (vis.has(stageKey)) return { fill: baseFill, stroke: baseStroke, sw: 1.8, textFill: '#0f172a' };
    return { fill: baseFill, stroke: baseStroke, sw: 1.3, textFill: '#334155' };
  }

  const s1 = boxStyle('step1', '#dcfce7', '#16a34a');
  const s2 = boxStyle('step2', '#dbeafe', '#2563eb');
  const sClar = boxStyle('clarify', '#fef3c7', '#d97706');
  const s3 = boxStyle('step3', '#dbeafe', '#2563eb');
  const s4 = boxStyle('step4', '#dbeafe', '#2563eb');
  const s5 = boxStyle('step5', '#dbeafe', '#2563eb');
  const sMgr = boxStyle('manager', '#ffedd5', '#ea580c');
  const s6 = boxStyle('step6', '#fee2e2', '#ef4444');

  const w = mode === 'full' ? 780 : 320;
  const h = mode === 'full' ? 470 : 250;

  return `
  <svg viewBox="0 0 780 470" width="100%" height="auto" style="max-width:${w}px;max-height:${h}px;display:block;margin:0 auto;font-family:Plus Jakarta Sans,sans-serif;">
    <defs>
      <marker id="arrow-${mode}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 10 5 L 0 9 z" fill="#1e40af"/>
      </marker>
    </defs>

    <!-- Arrows matching official diagram -->
    <line x1="125" y1="62" x2="125" y2="95" stroke="#1e40af" stroke-width="2" marker-end="url(#arrow-${mode})"/>
    <line x1="220" y1="125" x2="295" y2="125" stroke="#1e40af" stroke-width="2" marker-end="url(#arrow-${mode})"/>
    <!-- Diamond 1 KHONG -> Clarify -> Loop to Step 1 -->
    <polyline points="470,125 650,125 650,76" fill="none" stroke="#b45309" stroke-width="2" marker-end="url(#arrow-${mode})"/>
    <text x="530" y="117" font-size="13" font-weight="800" fill="#b45309">Không</text>
    <polyline points="555,44 226,44" fill="none" stroke="#b45309" stroke-width="2" marker-end="url(#arrow-${mode})"/>
    <line x1="382" y1="44" x2="382" y2="85" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4 3"/>

    <!-- Diamond 1 CO -> Step 3 -> Step 4 -> Step 5 -> Diamond 2 -->
    <line x1="382" y1="164" x2="382" y2="188" stroke="#1e40af" stroke-width="2" marker-end="url(#arrow-${mode})"/>
    <text x="394" y="180" font-size="13" font-weight="800" fill="#15803d">Có</text>
    <line x1="382" y1="234" x2="382" y2="250" stroke="#1e40af" stroke-width="2" marker-end="url(#arrow-${mode})"/>
    <line x1="382" y1="292" x2="382" y2="306" stroke="#1e40af" stroke-width="2" marker-end="url(#arrow-${mode})"/>
    <line x1="382" y1="348" x2="382" y2="365" stroke="#1e40af" stroke-width="2" marker-end="url(#arrow-${mode})"/>

    <!-- Diamond 2 CO -> Manager -> Step 6; KHONG -> Step 6 -->
    <line x1="472" y1="396" x2="548" y2="396" stroke="#c2410c" stroke-width="2" marker-end="url(#arrow-${mode})"/>
    <text x="492" y="388" font-size="13" font-weight="800" fill="#c2410c">Có</text>
    <polyline points="635,420 635,444 480,444" fill="none" stroke="#c2410c" stroke-width="2" marker-end="url(#arrow-${mode})"/>
    <line x1="382" y1="427" x2="382" y2="434" stroke="#1e40af" stroke-width="2"/>
    <text x="394" y="424" font-size="12" font-weight="800" fill="#15803d">Không</text>

    <!-- Start Node: Step 1 -->
    <g style="cursor:pointer" onclick="goToStage('step1')">
      <rect x="28" y="20" width="194" height="44" rx="22" fill="${s1.fill}" stroke="${s1.stroke}" stroke-width="${s1.sw}"/>
      <text x="125" y="39" text-anchor="middle" font-size="13" font-weight="800" fill="${s1.textFill}">Bắt đầu:</text>
      <text x="125" y="55" text-anchor="middle" font-size="12.5" font-weight="700" fill="${s1.textFill}">Tiếp nhận yêu cầu</text>
    </g>

    <!-- Step 2 -->
    <g style="cursor:pointer" onclick="goToStage('step2')">
      <rect x="30" y="99" width="190" height="52" rx="6" fill="${s2.fill}" stroke="${s2.stroke}" stroke-width="${s2.sw}"/>
      <text x="125" y="121" text-anchor="middle" font-size="13" font-weight="800" fill="${s2.textFill}">Phân loại &amp; Kiểm tra</text>
      <text x="125" y="139" text-anchor="middle" font-size="12.5" font-weight="700" fill="${s2.textFill}">thông tin</text>
    </g>

    <!-- Diamond 1 -->
    <g style="cursor:pointer" onclick="goToStage('step2')">
      <polygon points="382,87 470,125 382,163 295,125" fill="#fed7aa" stroke="#ea580c" stroke-width="2"/>
      <text x="382" y="121" text-anchor="middle" font-size="13" font-weight="800" fill="#7c2d12">Có đủ</text>
      <text x="382" y="138" text-anchor="middle" font-size="13" font-weight="800" fill="#7c2d12">thông tin?</text>
    </g>

    <!-- Clarify Node -->
    <g style="cursor:pointer" onclick="goToStage('clarify')">
      <rect x="556" y="20" width="190" height="52" rx="6" fill="${sClar.fill}" stroke="${sClar.stroke}" stroke-width="${sClar.sw}"/>
      <text x="651" y="42" text-anchor="middle" font-size="13" font-weight="800" fill="${sClar.textFill}">Yêu cầu KH</text>
      <text x="651" y="59" text-anchor="middle" font-size="12.5" font-weight="700" fill="${sClar.textFill}">làm rõ / bổ sung</text>
    </g>

    <!-- Step 3 -->
    <g style="cursor:pointer" onclick="goToStage('step3')">
      <rect x="275" y="191" width="214" height="43" rx="6" fill="${s3.fill}" stroke="${s3.stroke}" stroke-width="${s3.sw}"/>
      <text x="382" y="210" text-anchor="middle" font-size="13" font-weight="800" fill="${s3.textFill}">Tạo Hồ sơ Cơ hội &amp;</text>
      <text x="382" y="226" text-anchor="middle" font-size="12" font-weight="700" fill="${s3.textFill}">Gán người phụ trách</text>
    </g>

    <!-- Step 4 -->
    <g style="cursor:pointer" onclick="goToStage('step4')">
      <rect x="275" y="253" width="214" height="39" rx="6" fill="${s4.fill}" stroke="${s4.stroke}" stroke-width="${s4.sw}"/>
      <text x="382" y="277" text-anchor="middle" font-size="13" font-weight="800" fill="${s4.textFill}">Thẩm định tồn kho &amp; giá</text>
      <text x="502" y="268" font-size="11.5" font-weight="700" fill="#475569">NVKD &amp; Bộ</text>
      <text x="502" y="284" font-size="11.5" font-weight="700" fill="#475569">phận Vận hành</text>
    </g>

    <!-- Step 5 -->
    <g style="cursor:pointer" onclick="goToStage('step5')">
      <rect x="275" y="309" width="214" height="39" rx="6" fill="${s5.fill}" stroke="${s5.stroke}" stroke-width="${s5.sw}"/>
      <text x="382" y="333" text-anchor="middle" font-size="13" font-weight="800" fill="${s5.textFill}">Lập Báo giá &amp; Dự thảo đề xuất</text>
    </g>

    <!-- Diamond 2 -->
    <g style="cursor:pointer" onclick="goToStage('step5')">
      <polygon points="382,366 472,396 382,426 292,396" fill="#fed7aa" stroke="#ea580c" stroke-width="2"/>
      <text x="382" y="392" text-anchor="middle" font-size="11" font-weight="800" fill="#7c2d12">Vượt thẩm quyền /</text>
      <text x="382" y="407" text-anchor="middle" font-size="11" font-weight="800" fill="#7c2d12">CK đặc biệt?</text>
    </g>

    <!-- Manager Node -->
    <g style="cursor:pointer" onclick="goToStage('manager')">
      <rect x="550" y="372" width="170" height="46" rx="6" fill="${sMgr.fill}" stroke="${sMgr.stroke}" stroke-width="${sMgr.sw}"/>
      <text x="635" y="392" text-anchor="middle" font-size="13" font-weight="800" fill="${sMgr.textFill}">Trưởng phòng</text>
      <text x="635" y="409" text-anchor="middle" font-size="13" font-weight="800" fill="${sMgr.textFill}">duyệt</text>
    </g>

    <!-- Step 6 End Node -->
    <g style="cursor:pointer" onclick="goToStage('step6')">
      <rect x="285" y="428" width="194" height="36" rx="18" fill="${s6.fill}" stroke="${s6.stroke}" stroke-width="${s6.sw}"/>
      <text x="382" y="451" text-anchor="middle" font-size="12.5" font-weight="800" fill="${s6.textFill}">Kết thúc: Cập nhật &amp; Theo dõi</text>
    </g>
  </svg>`;
}

function updateMinimap() {
  setHTML('live-minimap-svg', buildFlowchartSvg('mini'));
}

/* ==========================================================================
   CRM TRACKING TABLE & FILTERS
   ========================================================================== */
function filterDeals(status) {
  state.filterStatus = status;
  if (typeof document !== 'undefined') {
    document.querySelectorAll('.f-pill').forEach(btn => {
      const m = btn.getAttribute('onclick') || '';
      btn.classList.toggle('active', m.includes(`'${status}'`));
    });
  }
  renderDealsTable();
}

function handleSearchDeals(q) {
  state.searchQuery = (q || '').trim().toLowerCase();
  const clearBtn = $('clear-search-btn');
  if (clearBtn) clearBtn.classList.toggle('visible', state.searchQuery.length > 0);
  renderDealsTable();
}

function clearSearchDeals() {
  state.searchQuery = '';
  setValue('deal-search-input', '');
  const clearBtn = $('clear-search-btn');
  if (clearBtn) clearBtn.classList.remove('visible');
  renderDealsTable();
}

function resetDealFilters() {
  state.filterStatus = 'all';
  clearSearchDeals();
  filterDeals('all');
}

function renderDealsTable(highlightId = '') {
  const counts = {
    all: state.deals.length,
    ready: state.deals.filter(d => d.statusKey === 'ready').length,
    pending: state.deals.filter(d => d.statusKey === 'pending').length,
    clarify: state.deals.filter(d => d.statusKey === 'clarify').length
  };

  setText('count-all', String(counts.all));
  setText('count-ready', String(counts.ready));
  setText('count-pending', String(counts.pending));
  setText('count-clarify', String(counts.clarify));
  setText('tracking-total-badge', `${counts.all} hồ sơ`);

  const filtered = state.deals.filter(d => {
    const matchStatus = state.filterStatus === 'all' || d.statusKey === state.filterStatus;
    const hay = `${d.id} ${d.company} ${d.owner} ${d.itemsSummary} ${d.statusLabel}`.toLowerCase();
    const matchSearch = !state.searchQuery || hay.includes(state.searchQuery);
    return matchStatus && matchSearch;
  });

  const tbody = $('deals-table-tbody');
  const emptyBox = $('deals-empty-state');
  if (!tbody) return;

  if (!filtered.length) {
    tbody.innerHTML = '';
    if (emptyBox) emptyBox.style.display = 'block';
    return;
  }
  if (emptyBox) emptyBox.style.display = 'none';

  const limit = state.dealsPreviewLimit || 100;
  const visible = filtered.slice(0, limit);
  const moreRow = filtered.length > limit
    ? `<tr><td colspan="8" style="text-align:center; padding:0.75rem; background:#f8fafc;">
         <span style="font-size:0.78rem; color:#475569; margin-right:0.65rem;">Đang hiển thị ${visible.length} / ${filtered.length} hồ sơ</span>
         <button type="button" class="btn-row-action" onclick="showMoreDeals()">Xem thêm (+200)</button>
       </td></tr>`
    : '';

  tbody.innerHTML = visible.map(d => `
    <tr class="deal-row ${highlightId === d.id ? 'row-highlight' : ''}">
      <td><span class="deal-id-code">${escapeHtml(d.id)}</span></td>
      <td><strong>${escapeHtml(d.company)}</strong><br/><small style="color:#64748b">${escapeHtml(d.channel)} • ${escapeHtml(d.contact)}</small></td>
      <td>${escapeHtml(d.owner)}</td>
      <td>${escapeHtml(d.itemsSummary)}</td>
      <td><strong>${d.totalValue > 0 ? formatVND(d.totalValue) : '— (Đã dừng)'}</strong><br/><small style="color:#64748b">Biên: ${d.marginPercent}%</small></td>
      <td><strong>${typeof d.discountPercent === 'number' ? `${d.discountPercent}%` : escapeHtml(String(d.discountPercent || 'Thiếu'))}</strong></td>
      <td><span class="deal-tag ${escapeHtml(d.statusKey)}">${escapeHtml(d.statusLabel)}</span><br/><small style="color:#64748b">${escapeHtml(d.note)}</small></td>
      <td style="text-align:center;"><button type="button" class="btn-row-action" onclick="loadDealToWorkspace('${escapeHtml(d.id)}')">Mở xử lý</button></td>
    </tr>`).join('') + moreRow;
}

function showMoreDeals() {
  state.dealsPreviewLimit = (state.dealsPreviewLimit || 100) + 200;
  renderDealsTable();
}

function loadDealToWorkspace(dealId) {
  const deal = state.deals.find(d => d.id === dealId);
  if (!deal) return;

  const matchingPreset = Object.values(SCENARIO_PRESETS).find(p => p.company === deal.company);
  state.opp = createEmptyOpportunity(matchingPreset ? matchingPreset.key : 'preset1');
  state.opp.id = deal.id;
  state.opp.company = deal.company;
  state.opp.contact = deal.contact;
  state.opp.channel = deal.channel;
  state.opp.owner = deal.owner;
  if (!matchingPreset) {
    state.opp.rawText = `${deal.itemsSummary}. Ngân sách: ${Math.max(100, Math.round((deal.totalValue || 300e6) / 1e6))} triệu VND. Thời hạn: 14 ngày. Đề nghị chiết khấu: ${deal.discountPercent}%.`;
  }

  setValue('inp-company', state.opp.company);
  setValue('inp-contact', state.opp.contact);
  setSelectWithFallback('inp-channel', state.opp.channel);
  setValue('inp-raw-text', state.opp.rawText);

  addAuditLog('Mở lại hồ sơ từ CRM', `Đang nạp ${deal.id} (${deal.company}) vào Không gian thực thi.`, 'info', 'step1');
  goToStage('step1');
  scrollToWorkspace();
  showToast(`Đã nạp ${deal.id} để xử lý lại qua luồng 6 bước`, 'info');
}

/* ==========================================================================
   MASTER DATA CATALOG & MODALS
   ========================================================================== */
function openCatalogModal() {
  renderCatalogModalTable();
  $('catalog-modal')?.classList.add('active');
}

function closeCatalogModal() {
  $('catalog-modal')?.classList.remove('active');
}

function openFlowchartModal() {
  setHTML('flowchart-modal-svg', buildFlowchartSvg('full'));
  $('flowchart-modal')?.classList.add('active');
}

function closeFlowchartModal() {
  $('flowchart-modal')?.classList.remove('active');
}

function renderCatalogModalTable() {
  const tbody = $('catalog-modal-tbody');
  if (!tbody) return;
  tbody.innerHTML = state.products.map(p => `
    <tr>
      <td><span class="deal-id-code">${escapeHtml(p.sku)}</span></td>
      <td><strong>${escapeHtml(p.name)}</strong></td>
      <td><small style="color:#64748b">${escapeHtml(p.category)}</small></td>
      <td>${formatVND(p.listPrice)}</td>
      <td>${formatVND(p.cost)}</td>
      <td style="text-align:center;"><strong>${p.stock}</strong> ${escapeHtml(p.unit)}</td>
      <td style="text-align:center;">${p.leadTimeDays} ngày</td>
    </tr>`).join('');
}

function resetDefaultMasterData() {
  state.products = DEFAULT_PRODUCTS.map(p => ({ ...p }));
  state.dataSourceName = 'Bảng giá & Kho chuẩn Minh An (Mặc định)';
  setText('data-status-text', `Nguồn dữ liệu hiện tại: ${state.dataSourceName} (${state.products.length} SKU).`);
  renderCatalogModalTable();
  showToast('Đã khôi phục Bảng giá & Tồn kho mặc định Minh An!', 'info');
}

function connectGoogleSheet() {
  const url = ($('gsheet-url')?.value || '').trim();
  if (!url) {
    showToast('Vui lòng dán URL Google Sheets hoặc tải tệp Excel/CSV!', 'warn');
    return;
  }
  state.dataSourceName = `Google Sheet đồng bộ (${url.slice(0, 36)}...)`;
  setText('data-status-text', `Nguồn dữ liệu hiện tại: ${state.dataSourceName} (${state.products.length} SKU).`);
  showToast('Đã kết nối nguồn Google Sheets vào công cụ Bước 4!', 'success');
}

function handleFileUpload(event) {
  const file = event?.target?.files?.[0];
  if (!file) return;
  if (typeof Papa !== 'undefined' && file.name.toLowerCase().endsWith('.csv')) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: res => applyImportedProducts(res.data, file.name)
    });
    return;
  }
  if (typeof XLSX !== 'undefined') {
    const reader = new FileReader();
    reader.onload = e => {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      applyImportedProducts(rows, file.name);
    };
    reader.readAsArrayBuffer(file);
  }
}

function applyImportedProducts(rows, fileName) {
  if (!Array.isArray(rows) || !rows.length) {
    showToast('Tệp tải lên không có dữ liệu sản phẩm hợp lệ!', 'warn');
    return;
  }
  const parsed = rows
    .filter(r => r.name || r.Name || r['Sản phẩm'])
    .map((r, i) => ({
      sku: String(r.sku || r.SKU || `IMP-${i + 1}`),
      name: String(r.name || r.Name || r['Sản phẩm']),
      aliases: [String(r.name || r.Name || r['Sản phẩm']).toLowerCase()],
      category: String(r.category || r.Category || 'Thiết bị Văn phòng'),
      unit: String(r.unit || r.Unit || 'Bộ'),
      listPrice: Number(r.listPrice || r.Price || r['Đơn giá'] || 10000000),
      cost: Number(r.cost || r.Cost || r['Giá vốn'] || 7000000),
      stock: Number(r.stock || r.Stock || r['Tồn kho'] || 10),
      leadTimeDays: Number(r.leadTimeDays || r.LeadTime || r['LeadTime'] || 5)
    }));

  if (parsed.length) {
    state.products = parsed;
    state.dataSourceName = `File ${fileName}`;
    setText('data-status-text', `Nguồn dữ liệu hiện tại: ${state.dataSourceName} (${state.products.length} SKU).`);
    renderCatalogModalTable();
    showToast(`Đã nạp ${parsed.length} sản phẩm từ ${fileName}`, 'success');
  }
}

/* ==========================================================================
   AI API PROXY INTEGRATION (SERVER.RB /api/*)
   ========================================================================== */
function updateApiStatusUI() {
  const btn = $('btn-api-status');
  const badge = $('api-status-badge');
  const detail = $('api-modal-status-detail');
  const modelSel = $('api-model-select');

  if (btn) btn.classList.toggle('is-offline', !state.api.configured);
  if (badge) {
    badge.textContent = state.api.configured
      ? `API: ${state.api.maskedKey} (${state.api.model})`
      : 'API: Chế độ nội bộ (Chưa gắn key)';
  }
  if (detail) {
    detail.innerHTML = state.api.configured
      ? `✅ <strong>Đã gắn API Key trên Localhost:</strong> <code>${escapeHtml(state.api.maskedKey)}</code> &nbsp;|&nbsp; <strong>Model:</strong> <code>${escapeHtml(state.api.model)}</code>`
      : '⚠️ Server chưa có API Key. Đang dùng bộ quy tắc bóc tách nội bộ.';
  }
  if (modelSel && state.api.model) {
    modelSel.value = state.api.model;
  }
}

async function fetchApiStatus() {
  if (typeof fetch !== 'function') return;
  try {
    const res = await fetch('/api/status');
    if (!res.ok) return;
    const data = await res.json();
    state.api.configured = Boolean(data.configured);
    state.api.maskedKey = data.maskedKey || '';
    state.api.model = data.model || state.api.model;
    updateApiStatusUI();
  } catch (err) {
    updateApiStatusUI();
  }
}

function openApiModal() {
  updateApiStatusUI();
  $('api-modal')?.classList.add('active');
}

function closeApiModal() {
  $('api-modal')?.classList.remove('active');
}

function toggleLiveApiMode(enabled) {
  state.api.useLiveApi = Boolean(enabled);
  showToast(enabled ? 'Đã bật gọi AI API trực tiếp khi phân tích Bước 2' : 'Đã chuyển sang bộ xử lý quy tắc nội bộ', 'info');
}

async function saveApiConfig() {
  if (typeof fetch !== 'function') return;
  const apiKey = ($('api-key-input')?.value || '').trim();
  const model = $('api-model-select')?.value || state.api.model;
  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, model })
    });
    const data = await res.json();
    if (data.ok) {
      state.api.configured = Boolean(data.configured);
      state.api.maskedKey = data.maskedKey || state.api.maskedKey;
      state.api.model = data.model || model;
      setValue('api-key-input', '');
      updateApiStatusUI();
      showToast(`Đã lưu cấu hình API (${state.api.maskedKey}) lên server!`, 'success');
    } else {
      showToast(`Lỗi lưu cấu hình: ${data.error || 'Không xác định'}`, 'warn');
    }
  } catch (err) {
    showToast(`Không kết nối được server localhost: ${err.message}`, 'warn');
  }
}

async function testApiConnection() {
  if (typeof fetch !== 'function') return;
  const out = $('api-test-output');
  if (out) {
    out.style.display = 'block';
    out.textContent = 'Đang gửi yêu cầu kiểm tra kết nối tới Google AI / Gemini API...';
  }
  try {
    const res = await fetch('/api/test', { method: 'POST' });
    const data = await res.json();
    if (out) {
      out.textContent = JSON.stringify(data, null, 2);
      out.style.borderColor = data.ok ? '#16a34a' : '#f59e0b';
    }
    if (data.ok) {
      state.api.lastEndpoint = data.endpoint || '';
      showToast(`Kết nối API thành công (${data.latencyMs || 0}ms)!`, 'success');
    } else {
      showToast(`API phản hồi lỗi (${data.status || 'ERR'}): vẫn giữ chế độ dự phòng nội bộ an toàn.`, 'warn');
    }
  } catch (err) {
    if (out) out.textContent = `Lỗi kết nối localhost: ${err.message}`;
    showToast('Không thể kiểm tra API lúc này.', 'warn');
  }
}

async function parseAndEvaluateStep2WithApi() {
  // Always compute baseline deterministic extraction first as safety guarantee
  parseAndEvaluateStep2();
  if (!state.api.configured || !state.api.useLiveApi || typeof fetch !== 'function') return;

  try {
    const rawRowPayload = {
      ...(state.opp.rawRow && typeof state.opp.rawRow === 'object' ? state.opp.rawRow : {}),
      khach_hang: state.opp.company || '',
      lien_he: state.opp.contact || '',
      kenh: state.opp.channel || '',
      nguoi_phu_trach_hien_tai: state.opp.owner || '',
      noi_dung_yeu_cau: state.opp.rawText || ''
    };
    const rawRowJson = JSON.stringify(rawRowPayload);
    const allRowText = [state.opp.rawText, collectRawRowNotesText(state.opp.rawRow)].filter(Boolean).join(' | ');

    const res = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'extract_and_validate',
        data: {
          today: new Date().toISOString().slice(0, 10),
          rawText: state.opp.rawText,
          rawRowJson,
          catalog: state.products.map(p => ({ sku: p.sku, name: p.name, category: p.category }))
        }
      })
    });
    if (!res.ok) return;
    const payload = await res.json();
    if (!payload.ok || !payload.data) {
      addAuditLog('AI API Fallback', `API (${payload.error || 'offline'}) -> Đã dùng bộ quy tắc nội bộ chuẩn xác.`, 'info', 'step2');
      return;
    }

    const ai = payload.data;
    const aiBudget = ai.ngan_sach !== undefined ? ai.ngan_sach : ai.budget;
    let parsedBudget = aiBudget !== undefined && aiBudget !== null
      ? (parseMoneyNumber(aiBudget) || Number(aiBudget) || null)
      : state.opp.extracted.budget;
    if (!parsedBudget || parsedBudget <= 0) {
      parsedBudget = parseBudgetVnd(allRowText) || null;
    }
    const parsedAiQty = ai.so_luong !== undefined && ai.so_luong !== null ? parseInt(ai.so_luong, 10) : NaN;
    const safeAiQty = Number.isFinite(parsedAiQty) && parsedAiQty > 0 ? parsedAiQty : 0;

    const matchedItems = Array.isArray(ai.items)
      ? ai.items
          .map(aiItem => {
            const cat = state.products.find(p => p.sku === aiItem.sku)
              || state.products.find(p => p.name.toLowerCase().includes(String(aiItem.name || '').toLowerCase()));
            const qty = parseInt(aiItem.qty, 10) || safeAiQty || 0;
            if (cat && qty > 0) return { ...cat, qty };
            if (!cat && qty > 0 && aiItem.name) {
              const estPrice = parsedBudget && qty > 0 ? Math.round(parsedBudget / qty) : 25000000;
              return {
                sku: aiItem.sku || 'MA-CUSTOM-01',
                name: String(aiItem.name),
                category: ai.category || 'Thiết bị Văn phòng',
                unit: 'Bộ',
                listPrice: estPrice,
                cost: Math.round(estPrice * 0.72),
                stock: 10,
                leadTimeDays: 7,
                qty
              };
            }
            return null;
          })
          .filter(Boolean)
      : [];

    if (matchedItems.length) {
      state.opp.extracted.items = matchedItems;
      state.opp.extracted.totalQty = matchedItems.reduce((s, it) => s + it.qty, 0);
      state.opp.extracted.productsText = matchedItems.map(it => `${it.qty}x ${it.name}`).join('; ');
    } else if (ai.danh_muc_san_pham && String(ai.danh_muc_san_pham).trim()) {
      const prodName = String(ai.danh_muc_san_pham).trim();
      const cat = state.products.find(p => p.name.toLowerCase().includes(prodName.toLowerCase()) || prodName.toLowerCase().includes(p.name.toLowerCase()));
      const qty = safeAiQty || state.opp.extracted.totalQty || 0;
      if (qty > 0) {
        const synthItem = cat
          ? { ...cat, qty }
          : {
              sku: 'MA-CUSTOM-01',
              name: prodName,
              category: ai.category || 'Thiết bị Văn phòng',
              unit: 'Bộ',
              listPrice: parsedBudget ? Math.round(parsedBudget / qty) : 25000000,
              cost: parsedBudget ? Math.round((parsedBudget / qty) * 0.72) : 18000000,
              stock: 10,
              leadTimeDays: 7,
              qty
            };
        state.opp.extracted.items = [synthItem];
        state.opp.extracted.totalQty = qty;
        state.opp.extracted.productsText = `${qty}x ${synthItem.name}`;
      } else if (!state.opp.extracted.productsText) {
        state.opp.extracted.productsText = prodName;
      }
    }
    if (safeAiQty > 0 && state.opp.extracted.totalQty <= 0) {
      state.opp.extracted.totalQty = safeAiQty;
    }
    state.opp.extracted.budget = parsedBudget;

    const aiDays = ai.thoi_han_trien_khai !== undefined ? ai.thoi_han_trien_khai : ai.days;
    let resolvedDays = aiDays
      ? (parseDeadlineToDays(aiDays) || parseDeliveryDays(String(aiDays)) || Number(aiDays) || null)
      : null;
    if (!resolvedDays || resolvedDays <= 0) {
      resolvedDays = parseDeliveryDays(allRowText) || state.opp.extracted.days || null;
    }
    state.opp.extracted.days = resolvedDays && resolvedDays > 0 ? Math.round(resolvedDays) : null;

    // Mặc định chiết khấu = 0% nếu không đề cập (tuyệt đối không báo thiếu)
    const aiDisc = ai.de_nghi_chiet_khau !== undefined ? ai.de_nghi_chiet_khau : ai.requestedDiscount;
    const parsedDisc = (aiDisc !== undefined && aiDisc !== null && String(aiDisc).trim() !== '')
      ? parseNumberLoose(aiDisc)
      : 0;
    state.opp.extracted.requestedDiscount = Number.isFinite(parsedDisc) && parsedDisc >= 0 ? parsedDisc : 0;

    if (ai.ten_khach_hang !== undefined && ai.ten_khach_hang !== null) {
      const candidateCompany = String(ai.ten_khach_hang).trim();
      if (candidateCompany && !isLikelyIdOrNumeric(candidateCompany) && !/^(null|none|n\/a)$/i.test(candidateCompany)) {
        const curComp = String(state.opp.company || '').trim();
        if (!curComp || isLikelyIdOrNumeric(curComp) || /^(?:Khách hàng|Đơn vị)\s*#\d+$/i.test(curComp)) {
          state.opp.company = candidateCompany;
          setValue('inp-company', candidateCompany);
        }
      }
    }
    const bestName = resolveBestCompanyName(state.opp.rawRow, state.opp.company);
    if (bestName && bestName !== state.opp.company) {
      state.opp.company = bestName;
      setValue('inp-company', bestName);
    }

    if (ai.nguoi_phu_trach !== undefined && ai.nguoi_phu_trach !== null) {
      const candidateOwner = String(ai.nguoi_phu_trach).trim();
      if (candidateOwner && !isNumericLikeValue(candidateOwner) && !/^(null|none|n\/a)$/i.test(candidateOwner)) {
        state.opp.owner = candidateOwner;
      }
    }
    if (ai.category) state.opp.category = ai.category;

    const ext = state.opp.extracted;
    const missing = [];
    if (!ext.items.length) missing.push('Danh mục sản phẩm / giải pháp cụ thể');
    if (ext.totalQty <= 0) missing.push('Số lượng chi tiết từng sản phẩm');
    if (!ext.budget || ext.budget <= 0) missing.push('Ngân sách dự kiến');
    if (!ext.days || ext.days <= 0) missing.push('Thời hạn triển khai mong muốn');

    state.opp.missingFields = missing;
    state.opp.condition1Passed = missing.length === 0;
    renderStep2UI();
    renderSnapshotSidebar();
    addAuditLog(
      `AI API (${payload.model}) bóc tách xong`,
      `Endpoint: ${payload.endpoint || 'Gemini'} | Kết quả ĐK1: ${state.opp.condition1Passed ? 'Đủ 5/5' : `Thiếu ${missing.length} trường`}`,
      state.opp.condition1Passed ? 'gate-pass' : 'gate-warn',
      'step2'
    );
  } catch (err) {
    addAuditLog('AI API Fallback', `Dùng bộ quy tắc nội bộ (${err.message}).`, 'info', 'step2');
  }
}

/* ==========================================================================
   MULTI-FORMAT FILE READER (EXCEL / LARK / CSV / TSV / JSON / TXT)
   & REVENUE / GROUPED PERFORMANCE ANALYTICS
   ========================================================================== */
function stripBom(str) {
  return String(str || '').replace(/^\uFEFF/, '');
}

function splitCsvLine(line, delimiter) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

function findHeaderRowIndex(matrix) {
  const limit = Math.min(matrix.length, 20);
  const headerHints = [
    'khách', 'customer', 'client', 'company', 'công ty', 'đối tác',
    'sản phẩm', 'product', 'item', 'solution', 'hạng mục', 'dịch vụ', 'thiết bị',
    'số lượng', 'qty', 'quantity', 'sl', 'units',
    'ngân sách', 'budget', 'doanh thu', 'revenue', 'thành tiền', 'amount', 'price', 'giá trị',
    'chiết khấu', 'discount', 'ck', 'rebate',
    'thời hạn', 'deadline', 'ngày', 'date', 'sla', 'timeline',
    'email', 'liên hệ', 'nvkd', 'owner', 'sales', 'kênh', 'channel', 'nhóm', 'category'
  ];

  let bestIdx = 0;
  let bestScore = -1;
  for (let r = 0; r < limit; r++) {
    const row = Array.isArray(matrix[r]) ? matrix[r] : [];
    const nonEmptyCells = row.map(c => String(c ?? '').trim()).filter(Boolean);
    if (nonEmptyCells.length < 2) continue;

    let textCellCount = 0;
    let hintScore = 0;
    for (let c = 0; c < nonEmptyCells.length; c++) {
      const cell = nonEmptyCells[c];
      if (!/^[\d.,\s₫đ%+-]+$/i.test(cell)) textCellCount += 1;
      const lower = cell.toLowerCase();
      for (let h = 0; h < headerHints.length; h++) {
        if (lower.includes(headerHints[h])) {
          hintScore += 3;
          break;
        }
      }
    }
    const score = textCellCount * 2 + hintScore;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = r;
    }
  }
  return bestIdx;
}

function extractMatrixToRecords(matrix, sheetLabel = '') {
  if (!Array.isArray(matrix) || matrix.length < 2) return [];
  const hdrIdx = findHeaderRowIndex(matrix);
  const rawHeaderRow = Array.isArray(matrix[hdrIdx]) ? matrix[hdrIdx] : [];
  if (!rawHeaderRow.length) return [];

  const seenNames = new Map();
  const colMeta = [];
  for (let c = 0; c < rawHeaderRow.length; c++) {
    let name = String(rawHeaderRow[c] ?? '').replace(/\s+/g, ' ').trim();
    if (!name) {
      // Only keep unnamed column if at least one of the next 5 data rows has a value in this column
      let hasDataBelow = false;
      for (let r = hdrIdx + 1; r < Math.min(matrix.length, hdrIdx + 6); r++) {
        if (String((matrix[r] && matrix[r][c]) ?? '').trim()) {
          hasDataBelow = true;
          break;
        }
      }
      if (!hasDataBelow) continue;
      name = `Cột_${c + 1}`;
    }
    const count = (seenNames.get(name) || 0) + 1;
    seenNames.set(name, count);
    if (count > 1) name = `${name}_${count}`;
    colMeta.push({ idx: c, name });
  }
  if (!colMeta.length) return [];

  const records = [];
  for (let r = hdrIdx + 1; r < matrix.length; r++) {
    const rowArr = Array.isArray(matrix[r]) ? matrix[r] : [];
    const obj = {};
    let nonEmptyCount = 0;
    let firstText = '';
    for (let m = 0; m < colMeta.length; m++) {
      const { idx, name } = colMeta[m];
      const rawVal = rowArr[idx];
      const cleaned = rawVal === null || rawVal === undefined ? '' : (typeof rawVal === 'string' ? rawVal.trim() : rawVal);
      if (cleaned !== '') {
        nonEmptyCount += 1;
        if (!firstText) firstText = String(cleaned).toLowerCase();
      }
      obj[name] = cleaned;
    }
    if (nonEmptyCount === 0) continue;
    // Skip summary/footer rows such as "Tổng cộng" or "Grand Total" that only have 1-2 cells
    if (nonEmptyCount <= 2 && /^(tổng cộng|tong cong|grand total|total:?)$/.test(firstText)) continue;
    if (sheetLabel) obj._sheetName = sheetLabel;
    records.push(obj);
  }
  return records;
}

function detectDelimiterInLines(lines) {
  const sample = lines.slice(0, 15);
  const candidates = ['\t', ';', ','];
  let bestDelim = ',';
  let bestScore = 0;
  for (const delim of candidates) {
    let maxCols = 0;
    for (const line of sample) {
      const cnt = splitCsvLine(line, delim).length;
      if (cnt > maxCols) maxCols = cnt;
    }
    if (maxCols > bestScore) {
      bestScore = maxCols;
      bestDelim = delim;
    }
  }
  return bestDelim;
}

function parseDelimitedText(text, sheetLabel = '') {
  const clean = stripBom(text).trim();
  if (!clean) return [];

  if (typeof Papa !== 'undefined') {
    const res = Papa.parse(clean, { header: false, skipEmptyLines: true });
    if (res && Array.isArray(res.data) && res.data.length >= 2) {
      const extracted = extractMatrixToRecords(res.data, sheetLabel);
      if (extracted.length) return extracted;
    }
  }

  const lines = clean.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];
  const delimiter = detectDelimiterInLines(lines);
  const matrix = lines.map(line => splitCsvLine(line, delimiter));
  return extractMatrixToRecords(matrix, sheetLabel);
}

function flattenLarkValue(val) {
  if (val === null || val === undefined) return '';
  if (Array.isArray(val)) {
    return val.map(v => flattenLarkValue(v)).filter(Boolean).join(', ');
  }
  if (typeof val === 'object') {
    if (val.text !== undefined) return String(val.text);
    if (val.name !== undefined) return String(val.name);
    if (val.en_name !== undefined) return String(val.en_name);
    if (val.email !== undefined) return String(val.email);
    if (val.value !== undefined) return flattenLarkValue(val.value);
    return Object.values(val).map(v => flattenLarkValue(v)).filter(Boolean).join(' ');
  }
  return String(val);
}

function extractLarkOrJsonRecords(text, sourceName = 'Lark JSON') {
  const raw = JSON.parse(stripBom(text));
  let arr = [];
  if (Array.isArray(raw)) {
    arr = raw;
  } else if (raw && Array.isArray(raw?.data?.items)) {
    arr = raw.data.items;
  } else if (raw && Array.isArray(raw?.items)) {
    arr = raw.items;
  } else if (raw && Array.isArray(raw?.records)) {
    arr = raw.records;
  } else if (raw && typeof raw === 'object') {
    arr = [raw];
  }

  return arr.map((item, idx) => {
    const src = (item && item.fields && typeof item.fields === 'object') ? item.fields : item;
    const flat = { _sheetName: sourceName, _rowNo: idx + 1 };
    if (src && typeof src === 'object') {
      Object.keys(src).forEach(k => {
        flat[k] = flattenLarkValue(src[k]);
      });
    }
    return flat;
  });
}

function parsePlainTextRecords(text, fileName) {
  const clean = stripBom(text).trim();
  if (!clean) return [];
  // If pasted tab/csv-like structured text
  if (clean.includes('\n') && (clean.includes('\t') || clean.split('\n')[0].split(',').length >= 3)) {
    const tabular = parseDelimitedText(clean);
    if (tabular.length) return tabular;
  }
  const companyMatch = /(?:công ty|khách hàng|company|đơn vị)[:\s-]+([^\n]+)/i.exec(clean);
  const emailMatch = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/.exec(clean);
  return [{
    _sheetName: fileName,
    company: companyMatch ? companyMatch[1].trim() : fileName.replace(/\.[^.]+$/, ''),
    contact: emailMatch ? emailMatch[1] : '',
    channel: 'File TXT',
    rawText: clean
  }];
}

function parseUploadedFileObject(file) {
  return new Promise((resolve, reject) => {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const reader = new FileReader();

    if (ext === 'xlsx' || ext === 'xls') {
      if (typeof XLSX === 'undefined') {
        reject(new Error('Thư viện đọc Excel (SheetJS) chưa sẵn sàng.'));
        return;
      }
      reader.onload = e => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'array' });
          const allRows = [];
          const activeSheets = [];
          wb.SheetNames.forEach(sheetName => {
            const ws = wb.Sheets[sheetName];
            const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
            const sheetRows = extractMatrixToRecords(matrix, `${file.name} [${sheetName}]`);
            if (sheetRows.length) {
              activeSheets.push(`${sheetName} (${sheetRows.length})`);
              for (let i = 0; i < sheetRows.length; i++) allRows.push(sheetRows[i]);
            }
          });
          resolve({
            rows: allRows,
            detectedSource: `Excel (${activeSheets.length ? activeSheets.join(', ') : `${wb.SheetNames.length} sheet`})`
          });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Không đọc được tệp Excel'));
      reader.readAsArrayBuffer(file);
      return;
    }

    // Binary Documents / PDF / Word / Images -> send Base64 to server AI parser (/api/parse-file)
    if (['pdf', 'docx', 'doc', 'rtf', 'odt', 'png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
      reader.onload = async e => {
        try {
          const dataUrl = String(e.target?.result || '');
          const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : '';
          if (typeof fetch === 'function') {
            const resp = await fetch('/api/parse-file', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileName: file.name,
                mimeType: file.type || '',
                base64Data,
                catalog: state.products.map(p => ({ sku: p.sku, name: p.name, category: p.category }))
              })
            });
            const json = await resp.json();
            if (json.ok && json.data && Array.isArray(json.data.records) && json.data.records.length) {
              const rows = json.data.records.map(r => ({ _sheetName: file.name, ...r }));
              resolve({
                rows,
                detectedSource: `AI Đọc ${ext.toUpperCase()}`,
                aiSummary: json.data.datasetSummary || '',
                recommendedGroupField: json.data.recommendedGroupField || 'priorityTier'
              });
              return;
            }
            if (json.extractedText) {
              resolve({ rows: parsePlainTextRecords(json.extractedText, file.name), detectedSource: ext.toUpperCase() });
              return;
            }
            reject(new Error(json.error || `Không trích xuất được dữ liệu từ ${file.name}`));
          } else {
            reject(new Error('Cần chạy server localhost để đọc tệp nhị phân bằng AI.'));
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error(`Không đọc được file ${file.name}`));
      reader.readAsDataURL(file);
      return;
    }

    // Text, JSON, Lark, CSV, TSV, MD, EML
    reader.onload = async e => {
      try {
        const text = String(e.target?.result || '');
        if (ext === 'json') {
          const rows = extractLarkOrJsonRecords(text, file.name);
          resolve({ rows, detectedSource: 'Lark / JSON' });
          return;
        }
        if (ext === 'csv' || ext === 'tsv') {
          const rows = parseDelimitedText(text).map(r => ({ _sheetName: file.name, ...r }));
          resolve({ rows, detectedSource: ext.toUpperCase() + ' / Lark' });
          return;
        }
        const tabular = parseDelimitedText(text);
        if (tabular.length >= 1 && Object.keys(tabular[0]).length >= 3) {
          resolve({ rows: tabular.map(r => ({ _sheetName: file.name, ...r })), detectedSource: 'Tabular Text' });
          return;
        }
        // Unstructured text/email/markdown -> try AI file extraction first
        if (state.api.configured && state.api.useLiveApi && typeof fetch === 'function') {
          try {
            const resp = await fetch('/api/parse-file', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileName: file.name,
                mimeType: file.type || 'text/plain',
                textContent: text,
                catalog: state.products.map(p => ({ sku: p.sku, name: p.name, category: p.category }))
              })
            });
            const json = await resp.json();
            if (json.ok && json.data && Array.isArray(json.data.records) && json.data.records.length) {
              resolve({
                rows: json.data.records.map(r => ({ _sheetName: file.name, ...r })),
                detectedSource: `AI Đọc ${ext.toUpperCase() || 'TXT'}`,
                aiSummary: json.data.datasetSummary || ''
              });
              return;
            }
          } catch (_) {
            // Fallback cleanly to local parser
          }
        }
        const rows = parsePlainTextRecords(text, file.name);
        resolve({ rows, detectedSource: 'Text' });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Không đọc được nội dung tệp'));
    reader.readAsText(file, 'UTF-8');
  });
}

function parseMoneyNumber(val) {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  const s = String(val || '').trim().toLowerCase();
  if (!s) return 0;
  const numRaw = s.replace(/[^0-9.,]/g, '');
  if (!numRaw) return 0;
  if (/tỷ|ty/.test(s)) {
    const n = normalizeLocaleDecimal(numRaw);
    return Number.isFinite(n) ? Math.round(n * 1e9) : 0;
  }
  if (/triệu|trieu|\btr\b|\bm\b/.test(s)) {
    const n = normalizeLocaleDecimal(numRaw);
    return Number.isFinite(n) ? Math.round(n * 1e6) : 0;
  }
  const digits = s.replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

function parseNumberLoose(val) {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  const m = String(val || '').replace(',', '.').match(/-?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

function parseDeadlineToDays(val) {
  if (val === null || val === undefined || String(val).trim() === '') return 0;
  if (typeof val === 'number' && Number.isFinite(val)) {
    // Handle Excel date serial (> 30000) vs plain number of days
    if (val > 30000) {
      const targetMs = (val - 25569) * 86400000;
      const diffDays = Math.ceil((targetMs - Date.now()) / 86400000);
      return Math.max(1, Math.min(365, diffDays));
    }
    return val > 0 ? Math.round(val) : 0;
  }
  const rel = parseRelativeDeadlinePhrase(val);
  if (rel > 0) return rel;
  const n = parseNumberLoose(val);
  return n !== null && n > 0 ? Math.round(n) : 0;
}

function normalizeHeaderForMatch(str) {
  return String(str || '').toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function isNumericLikeValue(val) {
  const s = String(val ?? '').trim();
  if (!s) return false;
  return /^[\d.,\s₫đVNDvnd%+-]+$/.test(s) && /\d/.test(s);
}

function findColumnByAlias(headers, aliases, excludeTokens = []) {
  const cleanHeaders = headers.filter(h => !h.startsWith('_'));
  const isExcluded = h => {
    const norm = normalizeHeaderForMatch(h);
    const words = norm.split(' ');
    return excludeTokens.some(tok => {
      const t = tok.trim();
      if (t.length <= 3) return words.includes(t);
      return norm.includes(t);
    });
  };
  for (const alias of aliases) {
    const found = cleanHeaders.find(h => normalizeHeaderForMatch(h) === alias && !isExcluded(h));
    if (found) return found;
  }
  for (const alias of aliases) {
    const found = cleanHeaders.find(h => normalizeHeaderForMatch(h).includes(alias) && !isExcluded(h));
    if (found) return found;
  }
  return null;
}

const COMPANY_COLUMN_EXCLUDES = [
  'id', 'mã', 'ma', 'code', 'stt', 'số thứ tự', 'phone', 'sdt', 'sđt', 'tel', 'email', 'mail'
];

const OWNER_COLUMN_EXCLUDES = [
  'amount', 'price', 'total', 'value', 'revenue', 'budget', 'cost',
  'giá', 'tiền', 'doanh thu', 'doanh số', 'ngân sách', 'sl', 'qty', 'chiết khấu', 'discount'
];

function detectSchemaHeuristically(headers) {
  return {
    company: findColumnByAlias(headers, [
      'tên khách hàng', 'ten khach hang', 'tên công ty', 'ten cong ty',
      'company name', 'customer name', 'client name', 'tên đơn vị', 'tên đối tác',
      'khách hàng', 'cong ty', 'công ty', 'company', 'client', 'customer', 'đối tác', 'ten kh'
    ], COMPANY_COLUMN_EXCLUDES),
    contact: findColumnByAlias(headers, ['email', 'liên hệ', 'contact', 'sdt', 'phone']),
    channel: findColumnByAlias(headers, ['kênh', 'nguồn', 'channel', 'source']),
    owner: findColumnByAlias(headers, ['người phụ trách', 'phụ trách', 'nvkd', 'sales rep', 'sales owner', 'salesperson', 'account manager', 'owner', 'nhân viên', 'pic', 'sales'], OWNER_COLUMN_EXCLUDES),
    category: findColumnByAlias(headers, ['nhóm', 'nhóm sản phẩm', 'category', 'loại', 'phân loại', 'ngành']),
    product: findColumnByAlias(headers, ['danh mục sản phẩm', 'danh muc san pham', 'sản phẩm', 'tên hàng', 'hàng hóa', 'thiết bị', 'giải pháp', 'product name', 'product', 'solution', 'equipment', 'item', 'dịch vụ', 'hạng mục', 'package']),
    qty: findColumnByAlias(headers, ['số lượng', 'so luong', 'sl', 'qty', 'quantity', 'units', 'count', 'pcs', 'volume']),
    budget: findColumnByAlias(headers, ['ngân sách', 'ngan sach', 'budget', 'dự trù', 'dự toán', 'total price', 'total amount', 'hạn mức']),
    revenue: findColumnByAlias(headers, ['doanh thu', 'thành tiền', 'tổng tiền', 'tổng đề xuất', 'total price', 'total amount', 'giá trị', 'revenue', 'amount', 'total', 'gmv']),
    cost: findColumnByAlias(headers, ['giá vốn', 'chi phí', 'cost', 'vốn']),
    discount: findColumnByAlias(headers, ['đề nghị chiết khấu', 'de nghi chiet khau', 'chiết khấu', '% giảm giá', 'giảm giá', 'discount %', 'discount', 'rebate', 'ưu đãi', 'ck']),
    days: findColumnByAlias(headers, ['thời hạn triển khai', 'thoi han trien khai', 'hạn triển khai', 'hạn giao', 'thời hạn', 'thời gian triển khai', 'thời gian giao', 'ngày giao', 'tiến độ', 'số ngày', 'triển khai', 'implementation date', 'deadline', 'due date', 'delivery', 'timeline', 'days', 'sla', 'time']),
    status: findColumnByAlias(headers, ['trạng thái', 'tình trạng', 'status', 'stage']),
    rawText: findColumnByAlias(headers, ['yêu cầu', 'mô tả', 'nội dung', 'ghi chú', 'note', 'description', 'rawtext'])
  };
}

function classifyPriorityTier(rec, totalValue, marginPercent, dk1Passed) {
  if (rec.priorityTier && ['VIP', 'Hạng A', 'Hạng B', 'Hạng C'].includes(rec.priorityTier)) {
    return rec.priorityTier;
  }
  if (!dk1Passed) return 'Hạng C';
  const companyLower = String(rec.company || '').toLowerCase();
  const isStrategicOrg = /tập đoàn|ngân hàng|bệnh viện|tổng công ty|bank|group/.test(companyLower);
  if (totalValue >= 500e6 || (isStrategicOrg && totalValue >= 250e6) || (totalValue >= 300e6 && marginPercent >= 20)) {
    return 'VIP';
  }
  if (totalValue >= 200e6 || rec.statusKey === 'pending') return 'Hạng A';
  return 'Hạng B';
}

function classifyProjectType(rec, category) {
  if (rec.projectType) return rec.projectType;
  const text = `${rec.product || ''} ${rec.rawText || ''} ${category || ''}`.toLowerCase();
  if (/máy chủ|server|switch|firewall|hạ tầng|core network/.test(text)) return 'Dự án Hạ tầng & Bảo mật';
  if (/erp|crm|phần mềm|sla|chuyển đổi số/.test(text)) return 'Dự án Phần mềm & SLA';
  if (/laptop|màn hình|văn phòng/.test(text)) return 'Trang bị Thiết bị Văn phòng';
  return category || 'Dự án B2B Tổng hợp';
}

function evaluateSingleRecordThroughWorkflow(rec) {
  // Construct rawText if missing so Step 2 parser can validate all 5 mandatory fields uniformly
  let raw = rec.rawText || '';
  if (!raw.trim()) {
    const parts = [];
    if (rec.product) {
      parts.push(rec.qty > 0 ? `${rec.qty} ${rec.product}` : rec.product);
    }
    if (rec.budget > 0) parts.push(`Ngân sách: ${formatCompactMoney(rec.budget)}`);
    else if (rec.revenue > 0) parts.push(`Ngân sách: ${formatCompactMoney(rec.revenue)}`);
    if (rec.days > 0) parts.push(`Thời hạn: ${rec.days} ngày`);
    if (rec.discount !== null && rec.discount !== undefined) parts.push(`Đề nghị chiết khấu: ${rec.discount}%`);
    raw = parts.join('. ');
  }

  const combinedRaw = [raw, collectRawRowNotesText(rec.rawRow)].filter(Boolean).join(' | ');
  const items = extractProductLines(raw);
  const validItems = items.filter(i => i.qty > 0);
  const matchedQty = validItems.reduce((s, i) => s + i.qty, 0) || (rec.qty > 0 ? rec.qty : 0);
  const budgetVal = rec.budget > 0 ? rec.budget : (parseBudgetVnd(combinedRaw) || (rec.revenue > 0 ? rec.revenue : null));
  const daysVal = rec.days > 0 ? rec.days : parseDeliveryDays(combinedRaw);
  const discountVal = rec.discount !== null && rec.discount !== undefined ? rec.discount : parseRequestedDiscount(combinedRaw);

  // Check core mandatory fields (CK mặc định 0% nếu không đề cập, không báo thiếu)
  const missing = [];
  if (!rec.product && !items.length) missing.push('Danh mục sản phẩm');
  if (matchedQty <= 0) missing.push('Số lượng');
  if ((!budgetVal || budgetVal <= 0) && (!rec.revenue || rec.revenue <= 0)) missing.push('Ngân sách / Giá trị');
  if (!daysVal || daysVal <= 0) missing.push('Thời hạn triển khai');

  const dk1Passed = missing.length === 0;
  if (!dk1Passed) {
    const resolvedCat = rec.category || (items[0]?.category || 'Chưa xác định');
    const summaryFallback = rec.product
      ? `${matchedQty > 0 ? matchedQty + 'x ' : ''}${rec.product}`
      : (validItems.map(i => `${i.qty}x ${i.name}`).join('; ') || 'Chưa xác định');
    const clarifyDraft = `Kính gửi ${rec.company || 'Quý Khách hàng'}, để lập báo giá chính xác theo quy trình B2B Minh An, vui lòng bổ sung các thông tin còn thiếu: ${missing.join(', ')}. Trân trọng!`;
    return {
      ...rec,
      product: rec.product || 'Chưa xác định',
      rawText: raw,
      category: resolvedCat,
      projectType: classifyProjectType(rec, resolvedCat),
      priorityTier: 'Hạng C',
      itemsSummary: summaryFallback,
      totalQty: matchedQty,
      budget: budgetVal || 0,
      days: daysVal || 0,
      discountPercent: discountVal !== null && discountVal !== undefined ? discountVal : 'Thiếu',
      totalValue: 0,
      costTotal: 0,
      marginPercent: 0,
      dk1Passed: false,
      dk2Exceeded: false,
      statusKey: 'clarify',
      statusLabel: 'Cần bổ sung thông tin',
      missingFields: missing,
      clarifyDraft,
      exceedReasons: [],
      note: `Thiếu thông tin (${missing.length}/5): ${missing.join(', ')}`
    };
  }

  // Step 4 & 5 calculations (Catalog lookup or explicit revenue/cost from Excel/Lark)
  let subtotal = 0;
  let totalCost = 0;
  let allInStock = true;
  let maxLeadTime = 0;

  if (validItems.length) {
    validItems.forEach(it => {
      subtotal += it.listPrice * it.qty;
      totalCost += it.cost * it.qty;
      if (it.stock < it.qty) allInStock = false;
      if (it.leadTimeDays > maxLeadTime) maxLeadTime = it.leadTimeDays;
    });
  }

  let grandTotal = rec.revenue > 0 ? rec.revenue : 0;
  if (grandTotal <= 0 && subtotal > 0) {
    const discAmt = Math.round(subtotal * (discountVal / 100));
    const net = Math.max(0, subtotal - discAmt);
    grandTotal = net + Math.round(net * POLICY.vatRate);
  } else if (grandTotal <= 0 && budgetVal > 0) {
    // Custom item parsed by AI/document without exact catalog match -> estimate from budget/quantity
    grandTotal = budgetVal;
    totalCost = rec.cost > 0 ? rec.cost : Math.round(grandTotal * 0.72);
  } else if (grandTotal > 0 && totalCost <= 0) {
    totalCost = rec.cost > 0 ? rec.cost : Math.round(grandTotal * 0.72);
  }

  if (rec.cost > 0) totalCost = rec.cost;
  const netForMargin = rec.revenue > 0 ? rec.revenue : Math.round(grandTotal / (1 + POLICY.vatRate));
  const marginPercent = netForMargin > 0 ? ((netForMargin - totalCost) / netForMargin) * 100 : 0;

  const exceedReasons = [];
  if (discountVal > POLICY.maxSalesDiscountPercent) exceedReasons.push(`CK ${discountVal}% > ${POLICY.maxSalesDiscountPercent}%`);
  if (marginPercent < POLICY.minGrossMarginPercent) exceedReasons.push(`MG ${marginPercent.toFixed(1)}% < ${POLICY.minGrossMarginPercent}%`);
  if (!allInStock) exceedReasons.push('Thiếu tồn kho');
  if (maxLeadTime > 0 && daysVal < maxLeadTime) exceedReasons.push(`Hạn ${daysVal}n < Lead ${maxLeadTime}n`);
  if (budgetVal > 0 && grandTotal > budgetVal) exceedReasons.push('Vượt ngân sách');

  const dk2Exceeded = exceedReasons.length > 0;
  const itemsSummary = validItems.length
    ? validItems.map(i => `${i.qty}x ${i.name}`).join('; ')
    : `${matchedQty}x ${rec.product}`;
  const resolvedCategory = rec.category || (validItems[0]?.category || 'Hạ tầng & Bảo mật');
  const statusKey = dk2Exceeded ? 'pending' : 'ready';

  return {
    ...rec,
    rawText: raw,
    category: resolvedCategory,
    projectType: classifyProjectType(rec, resolvedCategory),
    priorityTier: classifyPriorityTier({ ...rec, statusKey }, grandTotal, marginPercent, true),
    itemsSummary,
    totalQty: matchedQty,
    budget: budgetVal || grandTotal,
    days: daysVal,
    discountPercent: discountVal,
    totalValue: grandTotal,
    costTotal: totalCost,
    marginPercent: Number(marginPercent.toFixed(1)),
    dk1Passed: true,
    dk2Exceeded,
    statusKey,
    statusLabel: dk2Exceeded ? 'Chờ duyệt' : 'Đủ điều kiện tiếp tục',
    missingFields: [],
    exceedReasons,
    note: dk2Exceeded ? `Vượt ĐK2: ${exceedReasons.join(' | ')}` : 'Đạt chuẩn 6 bước trong thẩm quyền NVKD'
  };
}

async function ingestDatasetRecords(rawRows, fileName, detectedSource) {
  if (!Array.isArray(rawRows) || !rawRows.length) return [];
  const headerSample = rawRows.slice(0, 20);
  const headerSet = new Set();
  for (let i = 0; i < headerSample.length; i++) {
    const rowObj = headerSample[i];
    if (rowObj && typeof rowObj === 'object') {
      Object.keys(rowObj).forEach(k => headerSet.add(k));
    }
  }
  const headers = Array.from(headerSet);
  let colMap = detectSchemaHeuristically(headers);
  let datasetSummary = `Đã đọc ${rawRows.length} dòng từ ${fileName} (${detectedSource})`;

  // Skip slow LLM round-trip if heuristic schema already matched >= 3 core columns cleanly;
  // otherwise ask Gemini once with a fast 2.5s timeout so batch ingestion never stalls.
  const matchedCoreCount = ['company', 'product', 'qty', 'budget', 'revenue', 'days', 'discount'].filter(k => Boolean(colMap[k])).length;
  if (matchedCoreCount < 3 && state.api.configured && state.api.useLiveApi && typeof fetch === 'function') {
    let timer = null;
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      if (controller) timer = setTimeout(() => controller.abort(), 2500);
      const resp = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller ? controller.signal : undefined,
        body: JSON.stringify({
          action: 'analyze_dataset',
          data: { headers: headers.filter(h => !h.startsWith('_')), sampleRows: rawRows.slice(0, 5) }
        })
      });
      if (resp.ok) {
        const aiRes = await resp.json();
        if (aiRes.ok && aiRes.data && aiRes.data.columnMap) {
          Object.keys(colMap).forEach(k => {
            if (aiRes.data.columnMap[k] && headers.includes(aiRes.data.columnMap[k])) {
              colMap[k] = aiRes.data.columnMap[k];
            }
          });
          if (aiRes.data.datasetSummary) {
            datasetSummary = `🤖 AI nhận diện (${fileName}): ${aiRes.data.datasetSummary}`;
          }
          if (aiRes.data.recommendedGroupField) {
            state.analytics.groupField = aiRes.data.recommendedGroupField;
          }
        }
      }
    } catch (_) {
      // Fallback cleanly to heuristic column mapping
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  const validateTextColumn = (col, checkId = false) => {
    if (!col) return null;
    const samples = rawRows.slice(0, 10).map(r => r && r[col]).filter(v => v !== undefined && v !== null && String(v).trim() !== '');
    if (!samples.length) return col;
    const invalidCount = samples.filter(v => (checkId ? isLikelyIdOrNumeric(v) : isNumericLikeValue(v))).length;
    return invalidCount * 2 >= samples.length ? null : col;
  };
  colMap.owner = validateTextColumn(colMap.owner, false);
  colMap.company = validateTextColumn(colMap.company, true);

  // Detect extra categorical columns useful for grouping (e.g. Khu vực, Phòng ban, Tháng)
  const mappedVals = new Set(Object.values(colMap).filter(Boolean));
  const extraCols = headers.filter(h => !h.startsWith('_') && !mappedVals.has(h)).slice(0, 4);

  const normalized = new Array(rawRows.length);
  for (let idx = 0; idx < rawRows.length; idx++) {
    const row = rawRows[idx] || {};
    const rawRow = {};
    Object.keys(row).forEach(k => {
      if (!k.startsWith('_')) rawRow[k] = row[k];
    });
    const rawCompanyVal = colMap.company ? row[colMap.company] : (row.company || '');
    const company = resolveBestCompanyName(rawRow, rawCompanyVal) || `Khách hàng #${idx + 1}`;
    const contact = String(colMap.contact ? row[colMap.contact] : (row.contact || '')).trim();
    const channel = String(colMap.channel ? row[colMap.channel] : (row.channel || detectedSource)).trim();
    const ownerCandidate = colMap.owner ? row[colMap.owner] : row.owner;
    const ownerClean = ownerCandidate !== undefined && ownerCandidate !== null && !isNumericLikeValue(ownerCandidate)
      ? String(ownerCandidate).trim()
      : '';
    const owner = ownerClean || (colMap.owner ? 'Chưa phân công' : 'Chưa phân công');
    const category = String(colMap.category ? row[colMap.category] : (row.category || '')).trim();
    const product = String(colMap.product ? row[colMap.product] : (row.product || '')).trim();
    const qty = colMap.qty ? (parseNumberLoose(row[colMap.qty]) || 0) : 0;
    const budget = colMap.budget ? parseMoneyNumber(row[colMap.budget]) : 0;
    const revenue = colMap.revenue ? parseMoneyNumber(row[colMap.revenue]) : 0;
    const cost = colMap.cost ? parseMoneyNumber(row[colMap.cost]) : 0;
    const discountRaw = colMap.discount ? row[colMap.discount] : null;
    const discount = discountRaw !== null && String(discountRaw).trim() !== '' ? parseNumberLoose(discountRaw) : null;
    const daysRaw = colMap.days ? row[colMap.days] : null;
    const days = daysRaw !== null && String(daysRaw).trim() !== '' ? parseDeadlineToDays(daysRaw) : 0;
    let rawText = String(colMap.rawText ? row[colMap.rawText] : (row.rawText || '')).trim();
    if (!rawText && Object.keys(rawRow).length) {
      rawText = Object.entries(rawRow)
        .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
        .map(([k, v]) => `${k}: ${v}`)
        .join(' | ');
    }

    const customMeta = {};
    for (let c = 0; c < extraCols.length; c++) {
      const colName = extraCols[c];
      customMeta[colName] = String(row[colName] ?? '').trim() || 'Khác';
    }

    const base = {
      id: `IMP-${String(idx + 1).padStart(4, '0')}`,
      sourceSheet: row._sheetName || fileName,
      company: company || `Đơn vị #${idx + 1}`,
      contact,
      channel,
      owner,
      category,
      product,
      projectType: String(row.projectType || '').trim(),
      priorityTier: String(row.priorityTier || '').trim(),
      qty,
      budget,
      revenue,
      cost,
      discount,
      days,
      rawText,
      rawRow,
      customMeta
    };
    normalized[idx] = evaluateSingleRecordThroughWorkflow(base);
  }

  const mapSummary5 = [
    `SP="${colMap.product || 'Chưa xác định'}"`,
    `SL="${colMap.qty || 'Chưa xác định'}"`,
    `NS="${colMap.budget || colMap.revenue || 'Chưa xác định'}"`,
    `Hạn="${colMap.days || 'Chưa xác định'}"`,
    `CK="${colMap.discount || 'Chưa xác định'}"`
  ].join(' • ');

  state.analytics.importedRecords = normalized;
  state.analytics.customFields = extraCols;
  state.analytics.lastSchemaSummary = `${datasetSummary} | Ánh xạ 5 trường: ${mapSummary5}`;
  state.analytics.previewLimit = 100;
  if (!state.analytics.sourceLabels.includes(fileName)) {
    state.analytics.sourceLabels.push(fileName);
  }

  batchUpsertCrmDeals(normalized.map(rec => ({
    id: rec.id,
    company: rec.company,
    contact: rec.contact || 'Chưa rõ',
    channel: rec.channel,
    owner: rec.owner,
    category: rec.category,
    projectType: rec.projectType,
    priorityTier: rec.priorityTier,
    itemsSummary: rec.itemsSummary,
    totalValue: rec.totalValue,
    discountPercent: rec.discountPercent,
    marginPercent: rec.marginPercent,
    statusKey: rec.statusKey,
    statusLabel: rec.statusLabel,
    note: rec.note
  })));

  renderAnalyticsDashboard();
  renderGroupSelectorPills();
  return normalized;
}

async function handleMultiDatasetUpload(event) {
  const files = Array.from(event?.target?.files || []);
  if (!files.length) return;

  let combinedRows = [];
  const names = [];
  let sourceSummary = '';

  showToast(`Đang đọc nhanh ${files.length} file...`, 'info');
  for (const file of files) {
    try {
      const parsed = await parseUploadedFileObject(file);
      combinedRows = combinedRows.concat(parsed.rows);
      names.push(file.name);
      sourceSummary = parsed.detectedSource;
    } catch (err) {
      showToast(`Lỗi đọc ${file.name}: ${err.message}`, 'warn');
    }
  }

  if (combinedRows.length) {
    await ingestDatasetRecords(combinedRows, names.join(', '), sourceSummary || 'Multi-file');
    showToast(`✅ Đã nạp thành công ${combinedRows.length} bản ghi`, 'success');
    generateAiExecutiveReport(true);
  }
  if (event?.target) event.target.value = '';
}

function toggleLarkPasteBox(force) {
  const box = $('lark-paste-box');
  if (!box) return;
  const show = force !== undefined ? force : box.style.display === 'none';
  box.style.display = show ? 'block' : 'none';
}

async function parsePastedLarkData() {
  const raw = ($('lark-raw-input')?.value || '').trim();
  if (!raw) {
    showToast('Vui lòng dán dữ liệu từ Lark Sheet / Lark Base / Excel!', 'warn');
    return;
  }
  try {
    let rows = [];
    let src = 'Lark Sheet Paste';
    if (raw.startsWith('{') || raw.startsWith('[')) {
      rows = extractLarkOrJsonRecords(raw, 'Lark JSON Paste');
      src = 'Lark Base JSON';
    } else {
      rows = parseDelimitedText(raw).map(r => ({ _sheetName: 'Lark Paste', ...r }));
    }
    if (!rows.length) {
      showToast('Không tách được dòng dữ liệu hợp lệ từ nội dung vừa dán!', 'warn');
      return;
    }
    await ingestDatasetRecords(rows, 'Lark_Sheet_Paste', src);
    toggleLarkPasteBox(false);
    showToast(`✅ Đã nạp thành công ${rows.length} bản ghi`, 'success');
    generateAiExecutiveReport(true);
  } catch (err) {
    showToast(`Lỗi đọc dữ liệu dán: ${err.message}`, 'warn');
  }
}

function toggleUrlImportBox(force) {
  const box = $('url-import-box');
  if (!box) return;
  const show = force !== undefined ? force : box.style.display === 'none';
  box.style.display = show ? 'block' : 'none';
}

async function fetchDatasetFromUrl() {
  const url = ($('dataset-url-input')?.value || '').trim();
  if (!url) {
    showToast('Vui lòng nhập đường dẫn Google Sheets, CSV, JSON hoặc Lark link!', 'warn');
    return;
  }
  showToast('Đang nạp dữ liệu từ đường dẫn...', 'info');
  try {
    const res = await fetch('/api/fetch-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const json = await res.json();
    if (!json.ok || !json.content) {
      showToast(json.error || 'Không tải được dữ liệu từ link này.', 'warn');
      return;
    }

    const content = json.content.trim();
    const resolvedUrl = json.resolvedUrl || url;
    const isGoogleSheet = /docs\.google\.com\/spreadsheets/i.test(url);
    const sourceLabel = isGoogleSheet ? 'Google Sheets Link' : 'Web / URL Link';

    let rows = [];
    if (content.startsWith('{') || content.startsWith('[')) {
      rows = extractLarkOrJsonRecords(content, sourceLabel);
    } else if (!/^<!doctype|^<html/i.test(content)) {
      rows = parseDelimitedText(content).map(r => ({ _sheetName: sourceLabel, ...r }));
    }

    if (!rows.length && state.api.configured && state.api.useLiveApi) {
      const parseRes = await fetch('/api/parse-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: 'linked_source.txt',
          mimeType: json.contentType || 'text/plain',
          textContent: content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 28000),
          catalog: state.products.map(p => ({ sku: p.sku, name: p.name, category: p.category }))
        })
      });
      if (parseRes.ok) {
        const aiParsed = await parseRes.json();
        if (aiParsed.ok && aiParsed.data && Array.isArray(aiParsed.data.records)) {
          rows = aiParsed.data.records.map(r => ({ _sheetName: sourceLabel, ...r }));
        }
      }
    }

    if (!rows.length) {
      showToast('Link không chứa bảng CSV/JSON hoặc dữ liệu hợp lệ để phân tích.', 'warn');
      return;
    }

    await ingestDatasetRecords(rows, resolvedUrl.slice(0, 48), sourceLabel);
    toggleUrlImportBox(false);
    showToast(`✅ Đã nạp thành công ${rows.length} bản ghi`, 'success');
    generateAiExecutiveReport(true);
  } catch (err) {
    showToast(`Lỗi tải từ link: ${err.message}`, 'warn');
  }
}

function loadSampleLarkDataset() {
  const sampleCsv = [
    'Khách hàng,Email,Kênh,NVKD,Danh mục,Sản phẩm,Số lượng,Ngân sách,Thời hạn,Chiết khấu,Khu vực',
    'Công ty CP MedTech Việt Nam,muahang@medtech.vn,Lark Base,Nguyễn Hoàng Nam,Thiết bị Văn phòng,Laptop Dell Latitude 7440,12,380 triệu,10 ngày,4%,Hà Nội',
    'Tập đoàn Thép Hòa Phát,it@hoaphat.vn,Excel Export,Trần Minh Thư,Hạ tầng & Bảo mật,Máy chủ Dell PowerEdge R750xs,4,650 triệu,20 ngày,11%,Hà Nội',
    'Công ty Logistics Á Châu,ops@achau.vn,Lark Sheet,Lê Quốc Bảo,Hạ tầng & Bảo mật,Firewall Fortinet FortiGate 100F,3,240 triệu,12 ngày,5%,TP.HCM',
    'Hệ thống Bán lẻ An Khang,proc@ankhang.vn,CSV CRM,Nguyễn Hoàng Nam,Phần mềm & Dịch vụ,Phần mềm ERP & CRM Enterprise (1 năm),2,400 triệu,15 ngày,4%,TP.HCM',
    'Công ty TNHH Minh Khôi,info@minhkhoi.vn,Lark Base,Trần Minh Thư,Thiết bị Văn phòng,Màn hình LG UltraWide 34",, , , ,Đà Nẵng',
    'Ngân hàng Số TimoTech,tech@timotech.vn,Excel Export,Lê Quốc Bảo,Hạ tầng & Bảo mật,Switch Cisco Catalyst 9200L-48P,20,1.2 tỷ,4 ngày,6%,TP.HCM',
    'Bệnh viện Đa khoa Tâm Đức,vt@tamduc.vn,Lark Sheet,Nguyễn Hoàng Nam,Hạ tầng & Bảo mật,Bộ lưu điện APC Smart-UPS 3000VA,6,210 triệu,7 ngày,3%,TP.HCM',
    'Công ty CP Thực phẩm Xanh,ceo@thucphamxanh.vn,Email,Trần Minh Thư,Phần mềm & Dịch vụ,Dịch vụ triển khai & Bảo trì SLA 24/7,4,70 triệu,5 ngày,0%,Hà Nội'
  ].join('\n');

  const rows = parseDelimitedText(sampleCsv).map(r => ({ _sheetName: 'Lark_B2B_Q4.csv', ...r }));
  ingestDatasetRecords(rows, 'Lark_B2B_Q4.csv', 'Lark Base / Excel Mẫu');
  showToast(`✅ Đã nạp thành công ${rows.length} bản ghi`, 'success');
}

function runBatchDatasetThrough6Steps(silent = false) {
  if (!state.analytics.importedRecords.length) {
    if (!silent) showToast('Chưa có dữ liệu file tải lên! Hãy chọn file Excel/Lark/CSV hoặc bấm "Dữ liệu mẫu".', 'warn');
    return;
  }
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const processed = new Array(state.analytics.importedRecords.length);
  for (let i = 0; i < state.analytics.importedRecords.length; i++) {
    processed[i] = evaluateSingleRecordThroughWorkflow(state.analytics.importedRecords[i]);
  }
  state.analytics.importedRecords = processed;

  batchUpsertCrmDeals(processed.map(rec => ({
    id: rec.id,
    company: rec.company,
    contact: rec.contact || 'Chưa rõ',
    channel: rec.channel,
    owner: rec.owner,
    category: rec.category,
    projectType: rec.projectType,
    priorityTier: rec.priorityTier,
    itemsSummary: rec.itemsSummary,
    totalValue: rec.totalValue,
    discountPercent: rec.discountPercent,
    marginPercent: rec.marginPercent,
    statusKey: rec.statusKey,
    statusLabel: rec.statusLabel,
    note: rec.note
  })));

  renderAnalyticsDashboard();
  const elapsedMs = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0);
  if (!silent) showToast(`Đã xử lý theo lô ${processed.length} dòng qua Luồng 6 bước trong ${elapsedMs}ms!`, 'success');
}

function clearImportedDataset() {
  state.analytics.importedRecords = [];
  state.analytics.customFields = [];
  state.analytics.sourceLabels = [];
  state.analytics.lastSchemaSummary = '';
  state.analytics.aiReport = null;
  state.analytics.previewLimit = 100;
  if (!['owner', 'priorityTier', 'projectType', 'category', 'channel', 'statusLabel'].includes(state.analytics.groupField)) {
    state.analytics.groupField = 'owner';
  }
  renderGroupSelectorPills();
  renderAnalyticsDashboard();
  showToast('Đã xóa dữ liệu file tạm, quay về thống kê từ Bảng CRM.', 'info');
}

function loadImportedRecordToStep1(recId) {
  const rec = state.analytics.importedRecords.find(r => r.id === recId);
  if (!rec) return;
  state.opp = createEmptyOpportunity('preset1');
  state.opp.id = rec.id;
  state.opp.company = rec.company;
  state.opp.contact = rec.contact;
  state.opp.channel = rec.channel;
  state.opp.owner = rec.owner;
  state.opp.rawRow = rec.rawRow || null;
  state.opp.rawText = rec.rawText || (rec.rawRow ? JSON.stringify(rec.rawRow, null, 2) : '');

  setValue('inp-company', state.opp.company);
  setValue('inp-contact', state.opp.contact);
  setSelectWithFallback('inp-channel', state.opp.channel);
  setValue('inp-raw-text', state.opp.rawText);
  renderSnapshotSidebar();

  addAuditLog('Nạp dòng từ File vào Bước 1', `Hồ sơ ${rec.id} (${rec.company}) từ nguồn ${rec.sourceSheet}`, 'info', 'step1');
  goToStage('step1');
  scrollToWorkspace();
  showToast(`Đã nạp ${rec.company} vào Bước 1 để kiểm tra/chạy AI Agent`, 'info');
}

function setAnalyticsGroupField(field) {
  state.analytics.groupField = field;
  renderGroupSelectorPills();
  renderAnalyticsDashboard();
}

function getPriorityBadgeClass(tier = '') {
  const s = String(tier).toLowerCase();
  if (s.includes('vip')) return 'vip';
  if (s.includes('hạng a')) return 'tier-a';
  if (s.includes('hạng c') || s.includes('bổ sung')) return 'tier-c';
  return 'tier-b';
}

function renderGroupSelectorPills() {
  const wrap = $('group-by-pills');
  if (!wrap) return;
  const baseFields = [
    { key: 'owner', label: 'NVKD phụ trách' },
    { key: 'priorityTier', label: 'Ưu tiên KH' },
    { key: 'projectType', label: 'Loại dự án' },
    { key: 'category', label: 'Nhóm sản phẩm' },
    { key: 'channel', label: 'Kênh / Nguồn file' },
    { key: 'statusLabel', label: 'Trạng thái 6 bước' }
  ];
  const custom = (state.analytics.customFields || []).map(f => ({ key: f, label: `Cột: ${f}` }));
  const all = baseFields.concat(custom);

  wrap.innerHTML = all.map(item => `
    <button type="button" class="f-pill ${state.analytics.groupField === item.key ? 'active' : ''}" data-group="${escapeHtml(item.key)}" onclick="setAnalyticsGroupField('${escapeHtml(item.key)}')">
      ${escapeHtml(item.label)}
    </button>`).join('');
}

function getUnifiedAnalyticsRecords() {
  const byId = new Map();
  state.deals.forEach(d => {
    const net = d.totalValue > 0 ? Math.round(d.totalValue / (1 + POLICY.vatRate)) : 0;
    const profit = net > 0 ? Math.round(net * ((d.marginPercent || 0) / 100)) : 0;
    const priorityTier = d.priorityTier || classifyPriorityTier(d, d.totalValue, d.marginPercent || 0, d.statusKey !== 'clarify');
    const projectType = d.projectType || classifyProjectType({ product: d.itemsSummary, itemsSummary: d.itemsSummary }, d.category);
    byId.set(d.id, { ...d, priorityTier, projectType, profitEstimate: profit, customMeta: {} });
  });
  state.analytics.importedRecords.forEach(r => {
    const net = r.totalValue > 0 ? Math.round(r.totalValue / (1 + POLICY.vatRate)) : 0;
    const profit = net > 0 ? Math.round(net * ((r.marginPercent || 0) / 100)) : 0;
    byId.set(r.id, { ...r, profitEstimate: profit });
  });
  return Array.from(byId.values());
}

function computeAnalyticsSnapshot() {
  const records = getUnifiedAnalyticsRecords();
  const total = records.length;
  let totalRevenue = 0;
  let readyRevenue = 0;
  let pendingRevenue = 0;
  let totalProfit = 0;
  let marginWeightedSum = 0;
  let marginWeightCount = 0;
  let discountSum = 0;
  let dk1PassedCount = 0;
  let autoApproveCount = 0;
  let clarifyCount = 0;
  let pendingCount = 0;

  const groupMap = new Map();
  const field = state.analytics.groupField || 'owner';

  records.forEach(r => {
    const val = Number(r.totalValue || 0);
    totalRevenue += val;
    if (r.statusKey === 'ready') {
      readyRevenue += val;
      dk1PassedCount += 1;
      autoApproveCount += 1;
    } else if (r.statusKey === 'pending') {
      pendingRevenue += val;
      dk1PassedCount += 1;
      pendingCount += 1;
    } else if (r.statusKey === 'clarify') {
      clarifyCount += 1;
    }

    totalProfit += Number(r.profitEstimate || 0);
    if (val > 0) {
      marginWeightedSum += Number(r.marginPercent || 0);
      marginWeightCount += 1;
    }
    const discNum = typeof r.discountPercent === 'number' && Number.isFinite(r.discountPercent)
      ? r.discountPercent
      : (parseFloat(r.discountPercent) || 0);
    discountSum += discNum;

    const groupKey = String((r[field] !== undefined ? r[field] : (r.customMeta && r.customMeta[field])) || 'Chưa phân loại').trim() || 'Chưa phân loại';
    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, { key: groupKey, count: 0, revenue: 0, discountSum: 0, marginSum: 0, marginCount: 0, readyCount: 0 });
    }
    const g = groupMap.get(groupKey);
    g.count += 1;
    g.revenue += val;
    g.discountSum += discNum;
    if (val > 0) {
      g.marginSum += Number(r.marginPercent || 0);
      g.marginCount += 1;
    }
    if (r.statusKey === 'ready') g.readyCount += 1;
  });

  const groups = Array.from(groupMap.values())
    .map(g => ({
      key: g.key,
      count: g.count,
      revenue: g.revenue,
      sharePercent: totalRevenue > 0 ? (g.revenue / totalRevenue) * 100 : (total > 0 ? (g.count / total) * 100 : 0),
      avgDiscount: g.count > 0 ? g.discountSum / g.count : 0,
      avgMargin: g.marginCount > 0 ? g.marginSum / g.marginCount : 0,
      readyRate: g.count > 0 ? (g.readyCount / g.count) * 100 : 0
    }))
    .sort((a, b) => b.revenue - a.revenue || b.count - a.count);

  const avgMarginPercent = marginWeightCount > 0 ? marginWeightedSum / marginWeightCount : 0;
  const avgDiscountPercent = total > 0 ? discountSum / total : 0;
  const dk1PassRate = total > 0 ? (dk1PassedCount / total) * 100 : 0;
  const autoApproveRate = dk1PassedCount > 0 ? (autoApproveCount / dk1PassedCount) * 100 : 0;

  return {
    totalRecords: total,
    totalRevenue,
    readyRevenue,
    pendingRevenue,
    totalProfit,
    avgMarginPercent,
    avgDiscountPercent,
    dk1PassRate,
    autoApproveRate,
    clarifyCount,
    pendingCount,
    riskCount: pendingCount + clarifyCount,
    groupField: field,
    groups
  };
}

function renderAnalyticsDashboard() {
  const snap = computeAnalyticsSnapshot();

  setText('analytics-record-count', String(snap.totalRecords));
  setText('dataset-source-pill', state.analytics.sourceLabels.length
    ? `Nguồn: CRM + ${state.analytics.sourceLabels.slice(-2).join(', ')}`
    : 'Nguồn: Dữ liệu CRM + File tải lên');

  if (state.analytics.lastSchemaSummary) {
    setText('dataset-schema-summary', `${state.analytics.lastSchemaSummary} — Tổng ${snap.totalRecords} bản ghi.`);
  }

  setText('kpi-total-revenue', formatVND(snap.totalRevenue));
  setText('kpi-revenue-split', `Đủ ĐK: ${formatCompactMoney(snap.readyRevenue)} • Chờ duyệt: ${formatCompactMoney(snap.pendingRevenue)}`);
  setText('kpi-margin-avg', `${snap.avgMarginPercent.toFixed(1)}%`);
  setText('kpi-profit-amount', `Lợi nhuận ước tính: ${formatVND(snap.totalProfit)}`);
  setText('kpi-workflow-eff', `${snap.dk1PassRate.toFixed(0)}%`);
  setText('kpi-workflow-detail', `Đạt ĐK1: ${snap.dk1PassRate.toFixed(0)}% • Tự duyệt NVKD: ${snap.autoApproveRate.toFixed(0)}%`);
  setText('kpi-discount-risk', `${snap.avgDiscountPercent.toFixed(1)}%`);
  setText('kpi-risk-detail', `${snap.pendingCount} chờ duyệt • ${snap.clarifyCount} thiếu thông tin`);

  const groupTbody = $('grouped-analytics-tbody');
  if (groupTbody) {
    groupTbody.innerHTML = snap.groups.map(g => `
      <tr>
        <td><strong>${escapeHtml(g.key)}</strong></td>
        <td style="text-align:center;"><span class="badge-count-pill">${g.count}</span></td>
        <td><strong>${g.revenue > 0 ? formatVND(g.revenue) : '0 ₫'}</strong></td>
        <td>
          <div class="share-bar-wrap">
            <div class="share-bar-track"><div class="share-bar-fill" style="width:${Math.min(100, g.sharePercent).toFixed(1)}%"></div></div>
            <small style="font-weight:700;">${g.sharePercent.toFixed(1)}%</small>
          </div>
        </td>
        <td style="text-align:center;">${g.avgDiscount.toFixed(1)}%</td>
        <td style="text-align:center;">${g.avgMargin.toFixed(1)}%</td>
        <td style="text-align:center;"><span class="deal-tag ${g.readyRate >= 60 ? 'ready' : g.readyRate >= 30 ? 'pending' : 'clarify'}">${g.readyRate.toFixed(0)}%</span></td>
      </tr>`).join('');
  }

  const previewWrap = $('imported-rows-preview-wrap');
  const previewTbody = $('imported-rows-tbody');
  if (previewWrap && previewTbody) {
    if (!state.analytics.importedRecords.length) {
      previewWrap.style.display = 'none';
      previewTbody.innerHTML = '';
    } else {
      previewWrap.style.display = 'block';
      const limit = state.analytics.previewLimit || 100;
      const totalImported = state.analytics.importedRecords.length;
      const visibleRows = state.analytics.importedRecords.slice(0, limit);
      const moreRow = totalImported > limit
        ? `<tr><td colspan="9" style="text-align:center; padding:0.75rem; background:#f8fafc;">
             <span style="font-size:0.78rem; color:#475569; margin-right:0.65rem;">Đang hiển thị ${visibleRows.length} / ${totalImported} bản ghi</span>
             <button type="button" class="btn-row-action" onclick="showMoreImportedRows()">Xem thêm (+200)</button>
           </td></tr>`
        : '';
      previewTbody.innerHTML = visibleRows.map((r, i) => `
        <tr>
          <td>${i + 1}</td>
          <td><small>${escapeHtml(r.sourceSheet)}<br/>(${escapeHtml(r.channel)})</small></td>
          <td>
            <strong>${escapeHtml(r.company)}</strong><br/>
            <span class="priority-badge ${getPriorityBadgeClass(r.priorityTier)}">${escapeHtml(r.priorityTier || 'Hạng B - Tiêu chuẩn')}</span>
          </td>
          <td>
            <strong>${escapeHtml(r.projectType || r.category || 'Hợp đồng B2B')}</strong><br/>
            <small>${escapeHtml(r.itemsSummary)}</small>
          </td>
          <td>
            <strong>${r.totalValue > 0 ? formatVND(r.totalValue) : '— (Dừng ĐK1)'}</strong><br/>
            <small>MG: <strong>${r.marginPercent || 0}%</strong></small>
          </td>
          <td>CK: ${typeof r.discountPercent === 'number' ? `${r.discountPercent}%` : escapeHtml(String(r.discountPercent || 'Thiếu'))}<br/><small>${r.days > 0 ? `${r.days} ngày` : 'Thiếu hạn'}</small></td>
          <td>${escapeHtml(r.owner)}</td>
          <td><span class="deal-tag ${escapeHtml(r.statusKey)}">${escapeHtml(r.statusLabel)}</span></td>
          <td><button type="button" class="btn-row-action" onclick="loadImportedRecordToStep1('${escapeHtml(r.id)}')">Đưa vào B1</button></td>
        </tr>`).join('') + moreRow;
    }
  }
}

function showMoreImportedRows() {
  state.analytics.previewLimit = (state.analytics.previewLimit || 100) + 200;
  renderAnalyticsDashboard();
}

async function generateAiExecutiveReport(silent = false) {
  const snap = computeAnalyticsSnapshot();
  const box = $('ai-report-box');
  if (box) box.innerHTML = '⏳ Đang tổng hợp số liệu tài chính (KPI / MG%), phân loại khách hàng ưu tiên & phân tích AI...';

  let report = null;
  if (state.api.configured && state.api.useLiveApi && typeof fetch === 'function') {
    let timer = null;
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      if (controller) timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller ? controller.signal : undefined,
        body: JSON.stringify({
          action: 'executive_report',
          data: {
            totalRecords: snap.totalRecords,
            totalRevenueVND: snap.totalRevenue,
            readyRevenueVND: snap.readyRevenue,
            pendingRevenueVND: snap.pendingRevenue,
            totalProfitVND: snap.totalProfit,
            avgMarginPercent: Number(snap.avgMarginPercent.toFixed(1)),
            avgDiscountPercent: Number(snap.avgDiscountPercent.toFixed(1)),
            dk1PassRatePercent: Number(snap.dk1PassRate.toFixed(1)),
            autoApproveRatePercent: Number(snap.autoApproveRate.toFixed(1)),
            clarifyCount: snap.clarifyCount,
            pendingCount: snap.pendingCount,
            groupField: snap.groupField,
            topGroups: snap.groups.slice(0, 6)
          }
        })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.ok && json.data && json.data.headline) report = json.data;
      }
    } catch (_) {
      // Fallback cleanly
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  if (!report) {
    const allRecs = getUnifiedAnalyticsRecords();
    const vipCount = allRecs.filter(r => String(r.priorityTier || '').toLowerCase().includes('vip')).length;
    const tierACount = allRecs.filter(r => String(r.priorityTier || '').toLowerCase().includes('hạng a')).length;
    const topGroup = snap.groups[0];
    report = {
      headline: `Tổng hợp ${snap.totalRecords} dự án đạt doanh thu ${formatVND(snap.totalRevenue)} (KPI MG% TB: ${snap.avgMarginPercent.toFixed(1)}%).`,
      financialSummary: `Lợi nhuận gộp (MG) ước tính ${formatVND(snap.totalProfit)} trên tổng doanh thu ${formatVND(snap.totalRevenue)} (Chiết khấu TB ${snap.avgDiscountPercent.toFixed(1)}%). Doanh thu sẵn sàng chốt: ${formatVND(snap.readyRevenue)}.`,
      prioritySummary: `Phân loại theo dữ liệu: ${vipCount} khách hàng VIP (Ưu tiên 1), ${tierACount} khách Hạng A; tổng ${snap.clarifyCount} hồ sơ thiếu dữ liệu cần khách hàng bổ sung.`,
      highlights: [
        topGroup ? `Nhóm dẫn đầu theo "${snap.groupField}": ${topGroup.key} chiếm ${topGroup.sharePercent.toFixed(1)}% (${formatVND(topGroup.revenue)}, MG TB ${topGroup.avgMargin.toFixed(1)}%).` : 'Chưa có nhóm nổi bật.',
        `Hiệu suất đạt ĐK1 đầu vào: ${snap.dk1PassRate.toFixed(0)}%; Tỷ lệ tự duyệt trong thẩm quyền NVKD: ${snap.autoApproveRate.toFixed(0)}%.`
      ],
      risks: [
        `Có ${snap.pendingCount} hồ sơ đang "Chờ duyệt" (${formatCompactMoney(snap.pendingRevenue)}) do vượt chiết khấu > 5% hoặc tồn kho/SLA.`,
        `Có ${snap.clarifyCount} hồ sơ dừng ở Bước 2 ("Cần bổ sung thông tin") do thiếu ngân sách/thời hạn/chiết khấu.`
      ],
      recommendations: [
        'Ưu tiên Trưởng phòng duyệt nhanh các dự án VIP / Hạng A có biên MG ≥ 15% để chốt doanh thu ngay.',
        'Chuẩn hóa biểu mẫu Lark/Excel/PDF đủ 5 trường bắt buộc để giảm vòng lặp Bước 2→1.',
        'Theo dõi các nhóm sản phẩm có tỷ lệ chờ duyệt cao để tối ưu tồn kho & chính sách chiết khấu.'
      ]
    };
  }

  state.analytics.aiReport = report;
  const renderAiField = val => {
    if (Array.isArray(val)) {
      return `<ul class="ai-report-list">${val.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`;
    }
    return `<p style="margin:0 0 0.4rem;">${escapeHtml(String(val || ''))}</p>`;
  };
  if (box) {
    const srcLabel = state.analytics.sourceLabels.length ? state.analytics.sourceLabels.join(', ') : 'Bảng CRM Minh An';
    box.innerHTML = `
      <div class="ai-report-headline">📈 ${escapeHtml(report.headline)}</div>
      ${report.financialSummary ? `<div class="ai-report-section-title">Thống kê Tài chính & KPI MG%</div>${renderAiField(report.financialSummary)}` : ''}
      ${report.prioritySummary ? `<div class="ai-report-section-title">Phân loại Khách hàng Ưu tiên & Dự án</div>${renderAiField(report.prioritySummary)}` : ''}
      <div class="ai-report-section-title">Điểm nổi bật theo nhóm</div>
      <ul class="ai-report-list">${(report.highlights || []).map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>
      <div class="ai-report-section-title">Cảnh báo rủi ro</div>
      <ul class="ai-report-list">${(report.risks || []).map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>
      <div class="ai-report-section-title">Đề xuất hành động</div>
      <ul class="ai-report-list">${(report.recommendations || []).map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>
      <div style="margin-top:0.65rem; padding-top:0.45rem; border-top:1px dashed #cbd5e1; font-size:0.75rem; color:#64748b; font-style:italic;">
        (Nguồn dữ liệu: ${escapeHtml(srcLabel)} - Đã tự động chuẩn hóa ${snap.totalRecords} dòng dữ liệu)
      </div>
    `;
  }
  if (!silent) showToast('Đã hoàn tất Báo cáo Tài chính (MG%), Ưu tiên KH & Phân tích AI!', 'success');
}

function exportAnalyticsReportExcel() {
  const snap = computeAnalyticsSnapshot();
  const records = getUnifiedAnalyticsRecords();
  if (typeof XLSX === 'undefined') {
    showToast('Chưa tải được thư viện Excel (SheetJS) để xuất .xlsx.', 'warn');
    return;
  }
  const wb = XLSX.utils.book_new();
  const kpiSheet = [
    ['BÁO CÁO THỐNG KÊ DOANH THU, KPI MG% & PHÂN LOẠI DỰ ÁN — MINH AN'],
    ['Tổng số hồ sơ', snap.totalRecords, 'Tổng doanh thu', snap.totalRevenue],
    ['Doanh thu Đủ ĐK tiếp tục', snap.readyRevenue, 'Doanh thu Chờ duyệt', snap.pendingRevenue],
    ['Lợi nhuận ước tính', snap.totalProfit, 'KPI MG% TB (%)', Number(snap.avgMarginPercent.toFixed(1))],
    ['Hiệu suất Đạt ĐK1 (%)', Number(snap.dk1PassRate.toFixed(1)), 'Tỷ lệ Tự duyệt NVKD (%)', Number(snap.autoApproveRate.toFixed(1))]
  ];
  const groupSheet = [
    [`Phân nhóm theo: ${snap.groupField}`, 'Số lượng', 'Doanh thu', 'Tỷ trọng %', 'CK TB %', 'MG% TB', 'Hiệu suất đạt %'],
    ...snap.groups.map(g => [g.key, g.count, g.revenue, Number(g.sharePercent.toFixed(1)), Number(g.avgDiscount.toFixed(1)), Number(g.avgMargin.toFixed(1)), Number(g.readyRate.toFixed(1))])
  ];
  const detailSheet = [
    ['Mã', 'Khách hàng', 'Ưu tiên KH', 'Loại dự án', 'NVKD', 'Kênh/Nguồn', 'Danh mục', 'Sản phẩm', 'Giá trị', 'CK %', 'MG %', 'Trạng thái', 'Ghi chú'],
    ...records.map(r => [r.id, r.company, r.priorityTier || '', r.projectType || '', r.owner, r.channel, r.category, r.itemsSummary, r.totalValue, r.discountPercent, r.marginPercent, r.statusLabel, r.note])
  ];

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(kpiSheet), 'TongQuan_KPI');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(groupSheet), 'PhanNhom');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(detailSheet), 'ChiTiet_6Buoc');
  XLSX.writeFile(wb, 'MinhAn-BaoCao-ThongKe-HieuSuat.xlsx');
  showToast('Đã xuất Báo cáo Thống kê 3 sheet (.xlsx)!', 'success');
}

/* ==========================================================================
   PRIMARY VIEW TABS, COLLAPSIBLE SIDE UTILITY DRAWER & SCROLL
   ========================================================================== */
function switchPrimaryView(viewName = 'workflow') {
  const sections = {
    workflow: 'workspace-section',
    analytics: 'analytics-hub-section',
    crm: 'tracking-section'
  };
  Object.keys(sections).forEach(key => {
    const el = $(sections[key]);
    if (el) el.classList.toggle('is-view-hidden', key !== viewName);
  });
  if (typeof document !== 'undefined') {
    document.querySelectorAll('.view-tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.view === viewName);
    });
    document.querySelectorAll('.nav-link-item[data-view-tab]').forEach(a => {
      a.classList.toggle('active', a.dataset.viewTab === viewName);
    });
  }
}

function toggleUtilityDrawer(tabName) {
  const drawer = $('utility-drawer');
  const backdrop = $('utility-drawer-backdrop');
  if (!drawer) return;
  const isOpen = drawer.classList.contains('open');
  if (tabName && isOpen) {
    switchDrawerTab(tabName);
    return;
  }
  const nextOpen = !isOpen;
  drawer.classList.toggle('open', nextOpen);
  if (backdrop) backdrop.classList.toggle('open', nextOpen);
  if (nextOpen && tabName) switchDrawerTab(tabName);
}

function closeUtilityDrawer() {
  $('utility-drawer')?.classList.remove('open');
  $('utility-drawer-backdrop')?.classList.remove('open');
}

function switchDrawerTab(tabName = 'notes') {
  if (typeof document !== 'undefined') {
    document.querySelectorAll('[data-drawer-tab]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.drawerTab === tabName);
    });
    document.querySelectorAll('.drawer-pane').forEach(p => p.classList.remove('active'));
  }
  $(`drawer-pane-${tabName}`)?.classList.add('active');
  if (tabName === 'map') updateMinimap();
}

function scrollToWorkspace() {
  switchPrimaryView('workflow');
  $('workspace-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function scrollToAnalytics() {
  switchPrimaryView('analytics');
  $('analytics-hub-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function scrollToTracking() {
  switchPrimaryView('crm');
  $('tracking-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function scrollToTop() {
  if (typeof window !== 'undefined' && window.scrollTo) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function bindMultiFileDropZone() {
  const dz = $('multi-file-dropzone');
  if (!dz || typeof dz.addEventListener !== 'function') return;
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
  dz.addEventListener('drop', e => {
    e.preventDefault();
    dz.classList.remove('drag-over');
    if (e.dataTransfer?.files?.length) {
      handleMultiDatasetUpload({ target: { files: e.dataTransfer.files } });
    }
  });
}

function initApp() {
  switchPrimaryView('workflow');
  selectScenario('preset1');
  renderDealsTable();
  renderGroupSelectorPills();
  renderAnalyticsDashboard();
  renderAllLivePanels();
  fetchApiStatus();
  bindMultiFileDropZone();

  if (typeof window !== 'undefined') {
    window.addEventListener('scroll', () => {
      const btn = $('back-to-top');
      if (btn) btn.classList.toggle('visible', window.scrollY > 420);
    });
  }

  if (typeof document !== 'undefined') {
    document.querySelectorAll('.reveal-up').forEach(el => el.classList.add('is-visible'));
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
}
