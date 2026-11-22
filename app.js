"use strict";

const STORAGE_KEY = "pau_ceng409_depo_state_v1";

const DEFAULT_PRODUCTS = [
  {
    sku: "URN-1042",
    name: "30/1 Penye Pamuk İpliği (Lot-884)",
    zone: "A1",
    shelf: "A1-K02-R04-G01",
    stock: 140,
    minStock: 50,
    unit: "Kg",
    version: 4,
    pendingTransfer: null
  },
  {
    sku: "URN-2019",
    name: "İndigo Çözgü Boya Varili",
    zone: "B2",
    shelf: "B2-K01-R02-G03",
    stock: 18,
    minStock: 25,
    unit: "Adet",
    version: 7,
    pendingTransfer: {
      id: "TRF-410",
      from: "A1-K01-R01-G02",
      to: "B2-K01-R02-G03",
      qty: 10,
      unit: "Adet",
      sender: "Ahmet Yılmaz"
    }
  },
  {
    sku: "URN-3085",
    name: "Endüstriyel Streç Film Rulo",
    zone: "C1",
    shelf: "C1-K04-R01-G02",
    stock: 4,
    minStock: 10,
    unit: "Koli",
    version: 11,
    pendingTransfer: null
  },
  {
    sku: "URN-4110",
    name: "20x20 Alüminyum Konveyör Profili",
    zone: "A1",
    shelf: "A1-K03-R05-G04",
    stock: 85,
    minStock: 30,
    unit: "Metre",
    version: 2,
    pendingTransfer: null
  },
  {
    sku: "URN-5024",
    name: "6204-2RS Rulman Seti",
    zone: "B2",
    shelf: "B2-K04-R03-G01",
    stock: 22,
    minStock: 20,
    unit: "Adet",
    version: 9,
    pendingTransfer: null
  },
  {
    sku: "URN-6190",
    name: "Oluklu Sevkiyat Karton Kolisi",
    zone: "C1",
    shelf: "C1-K01-R01-G05",
    stock: 310,
    minStock: 100,
    unit: "Adet",
    version: 5,
    pendingTransfer: null
  }
];

const DEFAULT_LOGS = [
  {
    id: "TXN-88411",
    timestamp: "10:14:22",
    type: "entry",
    sku: "URN-1042",
    qty: 60,
    unit: "Kg",
    actor: "Ahmet Yılmaz (Depo Personeli)",
    status: "ok",
    note: "Tedarikçi İrsaliyesi #IRS-5092 — A1-K02-R04-G01"
  },
  {
    id: "TXN-88409",
    timestamp: "09:48:05",
    type: "adjust",
    sku: "URN-3085",
    qty: -2,
    unit: "Koli",
    actor: "Ahmet Yılmaz (Depo Personeli)",
    status: "blocked",
    note: "Engellendi: Depo Personeli sayım farkı düzeltmesi yapamaz (RBAC)"
  },
  {
    id: "TRF-410",
    timestamp: "09:12:40",
    type: "transfer",
    sku: "URN-2019",
    qty: 10,
    unit: "Adet",
    actor: "Ahmet Yılmaz (Depo Personeli)",
    status: "queued",
    note: "A1 -> B2 transit bekliyor (Hedef depo teslim onayı bekleniyor)"
  }
];

const ROLE_PROFILES = {
  staff: {
    id: "staff",
    name: "Ahmet Yılmaz",
    label: "Depo Personeli"
  },
  supervisor: {
    id: "supervisor",
    name: "Merve Kaya",
    label: "Depo Sorumlusu"
  }
};

const OP_LABELS = {
  entry: "Stok Girişi",
  exit: "Stok Çıkışı",
  transfer: "Depo / Raf Transferi",
  adjust: "Sayım & Düzeltme"
};

let state = loadState();
let lastSubmittedIdempotencyKey = null;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.products) && parsed.products.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    // Fallback to initial synthetic dataset if storage cannot be parsed
  }
  return {
    role: "staff",
    zoneFilter: "ALL",
    catalogFilter: "all",
    searchQuery: "",
    selectedSku: "URN-1042",
    operation: "exit",
    isOffline: false,
    offlineQueue: [],
    nextTxnSeq: 88412,
    products: structuredClone(DEFAULT_PRODUCTS),
    logs: structuredClone(DEFAULT_LOGS)
  };
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    // Storage quota exceeded or blocked
  }
}

function getSelectedProduct() {
  return state.products.find((p) => p.sku === state.selectedSku) || state.products[0];
}

function currentActorDisplay() {
  const profile = ROLE_PROFILES[state.role];
  return `${profile.name} (${profile.label})`;
}

function nowTimeStr() {
  const d = new Date();
  return d.toTimeString().slice(0, 8);
}

function currentIdempotencyKey() {
  return `TXN-${state.nextTxnSeq}`;
}

/* DOM References */
const els = {
  roleButtons: document.querySelectorAll(".role-btn"),
  zoneSelect: document.getElementById("zoneSelect"),
  networkToggleBtn: document.getElementById("networkToggleBtn"),
  networkLabel: document.getElementById("networkLabel"),
  queueCounter: document.getElementById("queueCounter"),
  securityInfoBtn: document.getElementById("securityInfoBtn"),
  architectureDrawer: document.getElementById("architectureDrawer"),
  drawerActorName: document.getElementById("drawerActorName"),
  resetDemoBtn: document.getElementById("resetDemoBtn"),

  searchInput: document.getElementById("searchInput"),
  clearSearchBtn: document.getElementById("clearSearchBtn"),
  toggleScannerBtn: document.getElementById("toggleScannerBtn"),
  scannerDrawer: document.getElementById("scannerDrawer"),
  scanSimButtons: document.querySelectorAll(".scan-sim-btn"),
  filterChips: document.querySelectorAll(".filter-chip"),
  productList: document.getElementById("productList"),
  productCountBadge: document.getElementById("productCountBadge"),
  emptyCatalogState: document.getElementById("emptyCatalogState"),
  resetFiltersBtn: document.getElementById("resetFiltersBtn"),

  bandSku: document.getElementById("bandSku"),
  bandProductName: document.getElementById("bandProductName"),
  bandSourceBin: document.getElementById("bandSourceBin"),
  bandTargetLabel: document.getElementById("bandTargetLabel"),
  bandCurrentQty: document.getElementById("bandCurrentQty"),
  bandDeltaQty: document.getElementById("bandDeltaQty"),
  bandProjectedQty: document.getElementById("bandProjectedQty"),
  bandUnit: document.getElementById("bandUnit"),
  wayfindingBand: document.getElementById("wayfindingBand"),

  specUnit: document.getElementById("specUnit"),
  specMinStock: document.getElementById("specMinStock"),
  specVersion: document.getElementById("specVersion"),
  specHealth: document.getElementById("specHealth"),

  pendingTransferBanner: document.getElementById("pendingTransferBanner"),
  pendingTransferDesc: document.getElementById("pendingTransferDesc"),
  acceptTransferBtn: document.getElementById("acceptTransferBtn"),
  rejectTransferBtn: document.getElementById("rejectTransferBtn"),

  opTabs: document.querySelectorAll(".op-tab"),
  movementForm: document.getElementById("movementForm"),
  qtyInputLabel: document.getElementById("qtyInputLabel"),
  qtyInput: document.getElementById("qtyInput"),
  qtyMinusBtn: document.getElementById("qtyMinusBtn"),
  qtyPlusBtn: document.getElementById("qtyPlusBtn"),
  unitSelect: document.getElementById("unitSelect"),
  sourceShelfInput: document.getElementById("sourceShelfInput"),
  targetLabel: document.getElementById("targetLabel"),
  targetShelfSelect: document.getElementById("targetShelfSelect"),
  noteInput: document.getElementById("noteInput"),
  idempotencyKeyDisplay: document.getElementById("idempotencyKeyDisplay"),
  permissionStatusDisplay: document.getElementById("permissionStatusDisplay"),
  duplicateTestBtn: document.getElementById("duplicateTestBtn"),
  submitMovementBtn: document.getElementById("submitMovementBtn"),

  diagnosticPanel: document.getElementById("diagnosticPanel"),
  diagIcon: document.getElementById("diagIcon"),
  diagTitle: document.getElementById("diagTitle"),
  diagSummary: document.getElementById("diagSummary"),
  diagAnalysisGrid: document.getElementById("diagAnalysisGrid"),
  diagRecoveryBar: document.getElementById("diagRecoveryBar"),
  closeDiagBtn: document.getElementById("closeDiagBtn"),

  qTrigger: document.getElementById("qTrigger"),
  qKnowledge: document.getElementById("qKnowledge"),
  qUserView: document.getElementById("qUserView"),
  qDecision: document.getElementById("qDecision"),
  qPersisted: document.getElementById("qPersisted"),
  qNotified: document.getElementById("qNotified"),
  qRecovery: document.getElementById("qRecovery"),

  labButtons: document.querySelectorAll(".lab-btn"),
  auditCountBadge: document.getElementById("auditCountBadge"),
  criticalAlertsList: document.getElementById("criticalAlertsList"),
  auditLogList: document.getElementById("auditLogList")
};

function renderAll() {
  renderShell();
  renderCatalog();
  renderStage();
  renderAuditAndCritical();
  saveState();
}

function renderShell() {
  els.roleButtons.forEach((btn) => {
    const active = btn.dataset.role === state.role;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", String(active));
  });
  els.zoneSelect.value = state.zoneFilter;
  els.drawerActorName.textContent = currentActorDisplay();

  els.networkToggleBtn.classList.toggle("offline", state.isOffline);
  els.networkToggleBtn.classList.toggle("online", !state.isOffline);
  els.networkToggleBtn.setAttribute("aria-pressed", String(state.isOffline));
  els.networkLabel.textContent = state.isOffline ? "Çevrimdışı" : "Çevrimiçi";

  if (state.offlineQueue.length > 0) {
    els.queueCounter.classList.remove("hidden");
    els.queueCounter.textContent = `${state.offlineQueue.length} kuyrukta`;
  } else {
    els.queueCounter.classList.add("hidden");
  }
}

function getFilteredProducts() {
  const q = state.searchQuery.trim().toLowerCase();
  return state.products.filter((p) => {
    if (state.zoneFilter !== "ALL" && p.zone !== state.zoneFilter) {
      return false;
    }
    if (state.catalogFilter === "critical" && p.stock > p.minStock) {
      return false;
    }
    if (state.catalogFilter === "low-lock" && p.stock > 10) {
      return false;
    }
    if (state.catalogFilter === "pending-transfer" && !p.pendingTransfer) {
      return false;
    }
    if (q) {
      const hay = `${p.sku} ${p.name} ${p.shelf}`.toLowerCase();
      return hay.includes(q);
    }
    return true;
  });
}

function renderCatalog() {
  const list = getFilteredProducts();
  els.productCountBadge.textContent = `${list.length} SKU`;
  els.clearSearchBtn.classList.toggle("hidden", state.searchQuery.length === 0);

  els.filterChips.forEach((chip) => {
    const active = chip.dataset.filter === state.catalogFilter;
    chip.classList.toggle("active", active);
    chip.setAttribute("aria-selected", String(active));
  });

  if (list.length === 0) {
    els.productList.innerHTML = "";
    els.emptyCatalogState.classList.remove("hidden");
    return;
  }

  els.emptyCatalogState.classList.add("hidden");
  els.productList.innerHTML = list
    .map((p) => {
      const isSelected = p.sku === state.selectedSku;
      let statusHtml = `<span class="status-tag normal">Normal</span>`;
      if (p.pendingTransfer) {
        statusHtml = `<span class="status-tag transit">Transit Bekliyor</span>`;
      } else if (p.stock <= p.minStock) {
        statusHtml = `<span class="status-tag critical">Kritik Stok</span>`;
      }
      return `
        <button type="button" class="product-card ${isSelected ? "selected" : ""}" data-sku="${p.sku}" role="option" aria-selected="${isSelected}">
          <div class="product-top">
            <span class="sku-tag mono">${p.sku}</span>
            <span class="bin-tag mono">${p.shelf}</span>
          </div>
          <div class="product-title">${p.name}</div>
          <div class="product-bottom">
            <span class="qty-pill mono">${p.stock} ${p.unit} <small>(Min ${p.minStock})</small></span>
            ${statusHtml}
          </div>
        </button>
      `;
    })
    .join("");

  els.productList.querySelectorAll(".product-card").forEach((card) => {
    card.addEventListener("click", () => {
      state.selectedSku = card.dataset.sku;
      const p = getSelectedProduct();
      els.unitSelect.value = p.unit;
      clearDiagnostic();
      renderAll();
    });
  });
}

function renderStage() {
  const product = getSelectedProduct();
  if (!product) return;

  els.opTabs.forEach((tab) => {
    const active = tab.dataset.op === state.operation;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });

  // Ensure unit matches when switching items unless user manually tests mismatch
  if (!els.unitSelect.dataset.manualOverride) {
    els.unitSelect.value = product.unit;
  }

  els.bandSku.textContent = product.sku;
  els.bandProductName.textContent = product.name;
  els.bandSourceBin.textContent = product.shelf;
  els.specUnit.textContent = product.unit;
  els.specMinStock.textContent = `${product.minStock} ${product.unit}`;
  els.specVersion.textContent = `v${product.version}`;

  if (product.stock <= product.minStock) {
    els.specHealth.textContent = "Kritik Eşik Altında";
    els.specHealth.style.color = "var(--state-err)";
  } else {
    els.specHealth.textContent = "Normal Seviye";
    els.specHealth.style.color = "var(--state-ok)";
  }

  // Pending transfer banner
  if (product.pendingTransfer) {
    els.pendingTransferBanner.classList.remove("hidden");
    const trf = product.pendingTransfer;
    els.pendingTransferDesc.textContent = `${trf.id}: ${trf.from} konumundan ${trf.qty} ${trf.unit} transfer hedef depoda teslim bekliyor.`;
  } else {
    els.pendingTransferBanner.classList.add("hidden");
  }

  // Configure form labels & projected balance based on active operation
  els.sourceShelfInput.value = product.shelf;
  els.idempotencyKeyDisplay.textContent = currentIdempotencyKey();

  if (state.operation === "adjust") {
    els.qtyInputLabel.textContent = "Fiziksel Sayım Miktarı (Yeni Bakiye)";
    els.targetLabel.textContent = "Sayım Fark Nedeni";
    els.submitMovementBtn.textContent = "Sayım Düzeltmesini Kaydet";
    els.bandTargetLabel.textContent = "Sayım / Fiziksel Eşitleme";
  } else if (state.operation === "entry") {
    els.qtyInputLabel.textContent = "Giriş Miktarı";
    els.targetLabel.textContent = "Teslim Alınan Ambar / Raf";
    els.submitMovementBtn.textContent = "Stok Girişini Kaydet";
    els.bandTargetLabel.textContent = `${product.shelf} (Stoğa Giriş)`;
  } else if (state.operation === "transfer") {
    els.qtyInputLabel.textContent = "Transfer Miktarı";
    els.targetLabel.textContent = "Hedef Ambar / Raf";
    els.submitMovementBtn.textContent = "Transferi Başlat";
    els.bandTargetLabel.textContent = els.targetShelfSelect.value;
  } else {
    els.qtyInputLabel.textContent = "Çıkış Miktarı";
    els.targetLabel.textContent = "Sevk / Üretim Hedefi";
    els.submitMovementBtn.textContent = "Stok Çıkışını Onayla ve Kaydet";
    els.bandTargetLabel.textContent = els.targetShelfSelect.value;
  }

  // Role permission feedback
  if (state.operation === "adjust" && state.role !== "supervisor") {
    els.permissionStatusDisplay.textContent = "Yetkisiz: Depo Sorumlusu Gerekli";
    els.permissionStatusDisplay.style.color = "var(--state-err)";
  } else {
    els.permissionStatusDisplay.textContent = `${ROLE_PROFILES[state.role].label} (Uygun)`;
    els.permissionStatusDisplay.style.color = "var(--state-ok)";
  }

  updateProjectedWayfinding(product);
}

function updateProjectedWayfinding(product) {
  const rawQty = Number(els.qtyInput.value);
  const qty = Number.isFinite(rawQty) ? rawQty : 0;

  let delta = 0;
  let projected = product.stock;

  if (state.operation === "entry") {
    delta = qty;
    projected = product.stock + qty;
  } else if (state.operation === "exit" || state.operation === "transfer") {
    delta = -qty;
    projected = product.stock - qty;
  } else if (state.operation === "adjust") {
    delta = qty - product.stock;
    projected = qty;
  }

  els.bandCurrentQty.textContent = String(product.stock);
  els.bandDeltaQty.textContent = delta > 0 ? `+${delta}` : String(delta);
  els.bandProjectedQty.innerHTML = `${projected} <small id="bandUnit">${product.unit}</small>`;

  const projWrap = els.bandProjectedQty.parentElement;
  projWrap.classList.toggle("negative", projected < 0);
}

function renderAuditAndCritical() {
  const criticalItems = state.products.filter((p) => p.stock <= p.minStock);
  els.criticalAlertsList.innerHTML =
    criticalItems.length === 0
      ? `<div class="audit-meta">Kritik eşik altında ürün bulunmuyor.</div>`
      : criticalItems
          .map(
            (p) => `
          <button type="button" class="crit-item" data-sku="${p.sku}">
            <span><strong class="mono">${p.sku}</strong> — ${p.name}</span>
            <span class="mono" style="color:var(--state-err);font-weight:700;">${p.stock}/${p.minStock} ${p.unit}</span>
          </button>
        `
          )
          .join("");

  els.criticalAlertsList.querySelectorAll(".crit-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.selectedSku = btn.dataset.sku;
      clearDiagnostic();
      renderAll();
    });
  });

  els.auditCountBadge.textContent = `${state.logs.length} Kayıt`;
  els.auditLogList.innerHTML = state.logs
    .map((log) => {
      const badgeClass = log.status === "ok" ? "ok" : log.status === "blocked" ? "blocked" : "queued";
      const badgeLabel =
        log.status === "ok" ? "ONAYLANDI" : log.status === "blocked" ? "ENGELLENDİ" : "BEKLEMEDE";
      const sign = log.qty > 0 && log.type === "entry" ? `+${log.qty}` : String(log.qty);
      return `
        <article class="audit-card">
          <div class="audit-top">
            <span class="audit-badge ${badgeClass}">${badgeLabel} • ${OP_LABELS[log.type] || log.type}</span>
            <span class="audit-time mono">${log.timestamp}</span>
          </div>
          <div class="audit-main"><span class="mono">${log.id}</span> • ${log.sku} (${sign} ${log.unit})</div>
          <div class="audit-meta">${log.actor}</div>
          <div class="audit-meta">${log.note}</div>
        </article>
      `;
    })
    .join("");
}

function showDiagnostic(kind, title, summary, analysis = null, recoveryActions = []) {
  els.diagnosticPanel.className = `diagnostic-panel state-${kind}`;

  if (kind === "error") {
    els.diagIcon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/></svg>`;
  } else if (kind === "warning") {
    els.diagIcon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M10.3 3.8L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>`;
  } else {
    els.diagIcon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></svg>`;
  }

  els.diagTitle.textContent = title;
  els.diagSummary.textContent = summary;

  if (analysis) {
    els.diagAnalysisGrid.classList.remove("hidden");
    els.qTrigger.textContent = analysis.trigger;
    els.qKnowledge.textContent = analysis.knowledge;
    els.qUserView.textContent = analysis.userView;
    els.qDecision.textContent = analysis.decision;
    els.qPersisted.textContent = analysis.persisted;
    els.qNotified.textContent = analysis.notified;
    els.qRecovery.textContent = analysis.recovery;
  } else {
    els.diagAnalysisGrid.classList.add("hidden");
  }

  els.diagRecoveryBar.innerHTML = "";
  if (recoveryActions.length > 0) {
    els.diagRecoveryBar.classList.remove("hidden");
    recoveryActions.forEach((act) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-inline-recovery";
      btn.textContent = act.label;
      btn.addEventListener("click", act.onClick);
      els.diagRecoveryBar.appendChild(btn);
    });
  } else {
    els.diagRecoveryBar.classList.add("hidden");
  }
}

function clearDiagnostic() {
  els.diagnosticPanel.classList.add("hidden");
}

function addLog(entry) {
  state.logs.unshift({
    id: entry.id || currentIdempotencyKey(),
    timestamp: nowTimeStr(),
    type: entry.type,
    sku: entry.sku,
    qty: entry.qty,
    unit: entry.unit,
    actor: currentActorDisplay(),
    status: entry.status,
    note: entry.note
  });
}

function executeMovement({ forceDuplicate = false, simulatedConcurrencyConflict = false } = {}) {
  const product = getSelectedProduct();
  const qty = Number(els.qtyInput.value);
  const selectedUnit = els.unitSelect.value;
  const key = forceDuplicate && lastSubmittedIdempotencyKey ? lastSubmittedIdempotencyKey : currentIdempotencyKey();

  // 1. Role Authorization Check (RBAC)
  if (state.operation === "adjust" && state.role !== "supervisor") {
    addLog({
      id: key,
      type: "adjust",
      sku: product.sku,
      qty,
      unit: selectedUnit,
      status: "blocked",
      note: "Yetkisiz sayım düzeltme girişimi engellendi (Depo Sorumlusu gerekli)"
    });
    showDiagnostic(
      "error",
      "Yetkisiz İşlem Engellendi (RBAC)",
      `${ROLE_PROFILES[state.role].label} rolü fiziksel sayım farkı düzeltmesi onaylayamaz.`,
      {
        trigger: "Depo Personeli rolündeki kullanıcı 'Sayım & Düzeltme' işlemini göndermeye çalıştı.",
        knowledge: "Sistem aktif rolü (staff) biliyor; sayım farkının kasıtsız hata mı hırsızlık/fire mi olduğunu bilmiyor.",
        userView: "İşlem butonu öncesi yetki uyarısı ve kırmızı engelleme kartı görür.",
        decision: "Kesinlikle ENGELLENİR. Veritabanı RLS politikası da yazmayı reddeder.",
        persisted: "Denetim günlüğüne 'Engellendi (RBAC)' satırı kaydedilir; stok miktarı değişmez.",
        notified: "Depo Personeline onay talebi yönlendirilir; Depo Sorumlusu denetim kaydında görür.",
        recovery: "Üst çubuktan Depo Sorumlusu rolüne geçin veya sayım farkını sorumlu onayına iletin."
      },
      [
        {
          label: "Depo Sorumlusu Rolüne Geç",
          onClick: () => {
            state.role = "supervisor";
            clearDiagnostic();
            renderAll();
          }
        }
      ]
    );
    renderAuditAndCritical();
    saveState();
    return;
  }

  // 2. Duplicate / Idempotency Key Check
  if (forceDuplicate || key === lastSubmittedIdempotencyKey) {
    showDiagnostic(
      "warning",
      "Mükerrer Gönderim Engellendi (Idempotency Kilidi)",
      `${key} numaralı işlem anahtarı az önce işlendiği için ikinci kez uygulanmadı.`,
      {
        trigger: "Çift tıklama veya ağ yenilemesi nedeniyle aynı TXN idempotency anahtarı tekrar gönderildi.",
        knowledge: "Sistem TXN anahtarının daha önce işlendiğini biliyor; kullanıcının ikinci bir gerçek sevkiyat isteyip istemediğini bilmiyor.",
        userView: "Çift düşüm yapılmadığına dair sarı koruma uyarısı görür.",
        decision: "İkinci gönderim ENGELLENİR (İdempotent yanıt döner).",
        persisted: "Yeni stok hareketi kaydedilmez; ilk hareket tekil kalır.",
        notified: "İşlemi yapan kullanıcı arayüzden bilgilendirilir.",
        recovery: "Gerçekten yeni bir işlem yapacaksanız yeni TXN anahtarı üretin."
      },
      [
        {
          label: "Yeni İşlem Anahtarı Üret",
          onClick: () => {
            lastSubmittedIdempotencyKey = null;
            state.nextTxnSeq += 1;
            clearDiagnostic();
            renderAll();
          }
        }
      ]
    );
    return;
  }

  // 3. Quantity Validation
  if (!Number.isFinite(qty) || qty <= 0) {
    showDiagnostic("error", "Geçersiz Miktar", "İşlem miktarı sıfırdan büyük pozitif bir sayı olmalıdır.");
    return;
  }

  // 4. Unit of Measure Check
  if (selectedUnit !== product.unit) {
    addLog({
      id: key,
      type: state.operation,
      sku: product.sku,
      qty,
      unit: selectedUnit,
      status: "blocked",
      note: `Birim uyumsuzluğu (${selectedUnit} != ${product.unit})`
    });
    showDiagnostic(
      "error",
      "Ölçü Birimi Uyumsuzluğu Engellendi",
      `${product.sku} kartı "${product.unit}" biriminde tanımlı; "${selectedUnit}" ile doğrudan hareket işlenemez.`,
      {
        trigger: `Ürün birimi (${product.unit}) yerine farklı ölçü birimi (${selectedUnit}) seçildi.`,
        knowledge: `Sistem ürünün ana ölçü biriminin ${product.unit} olduğunu biliyor; koli/adet dönüşüm katsayısı seçilmeden çevrimi varsaymıyor.`,
        userView: "Birim uyuşmazlığı hatası ve kilitli birim düzeltme düğmesi görür.",
        decision: "ENGELLENİR. Yanlış katsayı ile stok bozulması önlenir.",
        persisted: "Hatalı deneme denetim günlüğüne kaydedilir; stok miktarı korunur.",
        notified: "Operatör anında uyarılır.",
        recovery: `Ölçü birimini ürünün kilitli birimi olan '${product.unit}' değerine geri alın.`
      },
      [
        {
          label: `Birimi '${product.unit}' Olarak Düzelt`,
          onClick: () => {
            delete els.unitSelect.dataset.manualOverride;
            els.unitSelect.value = product.unit;
            clearDiagnostic();
            renderStage();
          }
        }
      ]
    );
    renderAuditAndCritical();
    saveState();
    return;
  }

  // 5. Optimistic Concurrency Conflict Check
  if (simulatedConcurrencyConflict) {
    showDiagnostic(
      "error",
      "Eşzamanlı Son Stok Çakışması (Optimistic Lock)",
      `İşlem başlatılırken ${product.sku} kaydı v${product.version} idi; başka bir personel az önce stoğu güncelledi (v${product.version + 1}).`,
      {
        trigger: "İki depo kullanıcısı aynı anda son kalan stok miktarı üzerinden işlem başlattı.",
        knowledge: `Sistem sürüm uyuşmazlığını (v${product.version} != v${product.version + 1}) ve güncel bakiye değişimini biliyor.`,
        userView: "Kayıt kilidi çakışma uyarısı ve güncel stoğu yeniden yükleme seçeneği görür.",
        decision: "ENGELLENİR. İlk onaylanan işlem geçerlidir; ikinci işlem güncel stokla yeniden doğrulanır.",
        persisted: "Çakışan ikinci yazma reddedilir; veri bütünlüğü korunur.",
        notified: "İkinci işlemi gönderen kullanıcı uyarılır.",
        recovery: "Güncel stok sürümünü senkronize edip kalan miktara göre işlemi tekrarlayın."
      },
      [
        {
          label: "Güncel Stok Sürümünü Yenile",
          onClick: () => {
            product.version += 1;
            clearDiagnostic();
            renderAll();
          }
        }
      ]
    );
    return;
  }

  // 6. Insufficient Stock Check (Exit & Transfer)
  if ((state.operation === "exit" || state.operation === "transfer") && qty > product.stock) {
    addLog({
      id: key,
      type: state.operation,
      sku: product.sku,
      qty: -qty,
      unit: product.unit,
      status: "blocked",
      note: `Yetersiz stok: İstenen ${qty} > Mevcut ${product.stock} ${product.unit}`
    });
    showDiagnostic(
      "error",
      "Yetersiz Stok — Negatif Stok Engellendi",
      `${product.sku} için ${qty} ${product.unit} çıkışı istendi ancak rafta yalnızca ${product.stock} ${product.unit} mevcut.`,
      {
        trigger: `Girilen çıkış/transfer miktarı (${qty}) mevcut stoktan (${product.stock}) büyük.`,
        knowledge: `Sistem kayıtlı bakiyeyi (${product.stock}) biliyor; rafta sayılmamış fazla fiziksel stok olup olmadığını bilmiyor.`,
        userView: "Negatif bakiye engeli, 7 maddelik analiz ve mevcut maksimuma çekme butonu görür.",
        decision: "ENGELLENİR. İş kuralı gereği stok eksiye düşemez.",
        persisted: "Reddedilen işlem denetim günlüğüne kaydedilir; mevcut stok korunur.",
        notified: "Operatör uyarılır; fiziksel stok varsa Depo Sorumlusu sayım düzeltmesine yönlendirilir.",
        recovery: `Miktarı mevcut maksimum olan ${product.stock} ${product.unit} değerine çekin veya sorumlu sayım düzeltmesi açın.`
      },
      [
        {
          label: `Miktarı Maksimuma (${product.stock}) Çek`,
          onClick: () => {
            els.qtyInput.value = String(product.stock);
            clearDiagnostic();
            renderStage();
          }
        }
      ]
    );
    renderAuditAndCritical();
    saveState();
    return;
  }

  // 7. Offline / Network Delay Queue Handling
  if (state.isOffline) {
    state.offlineQueue.push({
      id: key,
      type: state.operation,
      sku: product.sku,
      qty,
      unit: product.unit
    });
    addLog({
      id: key,
      type: state.operation,
      sku: product.sku,
      qty: state.operation === "exit" || state.operation === "transfer" ? -qty : qty,
      unit: product.unit,
      status: "queued",
      note: "Çevrimdışı kuyruğa alındı — bağlantı gelince sunucuya gönderilecek"
    });
    lastSubmittedIdempotencyKey = key;
    state.nextTxnSeq += 1;
    showDiagnostic(
      "warning",
      "Bağlantı Kesintisi: İşlem Güvenli Kuyruğa Alındı",
      `${key} hareketi internet yokken cihazda şifreli yerel kuyruğa alındı; çift kayıt oluşmaz.`,
      {
        trigger: "Kayıt onayı sırasında ağ bağlantısı kesik veya sunucu yanıtı zaman aşımında.",
        knowledge: "Sistem cihazın çevrimdışı olduğunu ve işlemin TXN anahtarını biliyor; bu arada başka bir cihazın aynı stoğu tüketip tüketmediğini henüz bilmiyor.",
        userView: "İşlemin kuyruğa alındığını ve bağlantı açıldığında eşitleneceğini görür.",
        decision: "UYARI + Yerel Kuyruk. Veri kaybı önlenir, kesin sunucu yazımı bağlantı sonrası doğrulanır.",
        persisted: "Yerel depoda bekleyen kuyruk kaydı ve 'Beklemede' log satırı kaydedilir.",
        notified: "Operatör üst çubuktaki kuyruk sayacından görür.",
        recovery: "Bağlantıyı çevrimiçine çevirip bekleyen kuyruğu senkronize edin."
      },
      [
        {
          label: "Bağlantıyı Aç ve Kuyruğu Eşitle",
          onClick: () => {
            flushOfflineQueue();
          }
        }
      ]
    );
    renderAll();
    return;
  }

  // 8. Commit Valid Movement
  commitMovementToState(product, qty, key);
}

function commitMovementToState(product, qty, key) {
  const noteText = els.noteInput.value.trim() || "Standart depo hareketi";

  if (state.operation === "entry") {
    product.stock += qty;
    product.version += 1;
    addLog({
      id: key,
      type: "entry",
      sku: product.sku,
      qty,
      unit: product.unit,
      status: "ok",
      note: `${noteText} • Yeni bakiye: ${product.stock} ${product.unit}`
    });
    showDiagnostic("success", "Stok Girişi Kaydedildi", `${product.sku} stoğu +${qty} ${product.unit} artırılarak ${product.stock} ${product.unit} oldu.`);
  } else if (state.operation === "exit") {
    product.stock -= qty;
    product.version += 1;
    addLog({
      id: key,
      type: "exit",
      sku: product.sku,
      qty: -qty,
      unit: product.unit,
      status: "ok",
      note: `${els.targetShelfSelect.value} — ${noteText} • Kalan: ${product.stock} ${product.unit}`
    });
    const critWarn = product.stock <= product.minStock ? " (Kritik stok eşiği uyarısı tetiklendi!)" : "";
    showDiagnostic("success", "Stok Çıkışı Onaylandı", `${product.sku} stoğundan ${qty} ${product.unit} düşüldü. Güncel bakiye: ${product.stock} ${product.unit}.${critWarn}`);
  } else if (state.operation === "transfer") {
    product.stock -= qty;
    product.version += 1;
    const targetBin = els.targetShelfSelect.value;
    product.pendingTransfer = {
      id: key,
      from: product.shelf,
      to: targetBin,
      qty,
      unit: product.unit,
      sender: ROLE_PROFILES[state.role].name
    };
    addLog({
      id: key,
      type: "transfer",
      sku: product.sku,
      qty: -qty,
      unit: product.unit,
      status: "queued",
      note: `${product.shelf} -> ${targetBin} transfer yola çıktı (Teslim onayı bekliyor)`
    });
    showDiagnostic(
      "warning",
      "Transfer Başlatıldı — Hedef Depo Teslim Onayı Bekleniyor",
      `${qty} ${product.unit} kaynak raftan düşüldü ve 'Transit Bekliyor' durumuna alındı. Hedef depo teslim alana kadar kaybolma riski izlenir.`,
      {
        trigger: "Depolar arası transfer başlatıldı ancak hedef depo henüz fiziksel teslim alımı onaylamadı.",
        knowledge: "Sistem çıkış rafını ve transfer miktarını biliyor; ürünün fiziksel olarak hedef rafa ulaşıp ulaşmadığını onay gelene kadar bilmiyor.",
        userView: "Ürün kartında 'Transit Bekliyor' etiketi ve teslim alma/reddetme çubuğu görür.",
        decision: "UYARI ile ara transit durumu oluşturulur; stok havada kaybolmaz.",
        persisted: "pendingTransfer kaydı ve transit logu kalıcı olarak saklanır.",
        notified: "Hedef depo sorumlusu teslim bekleyenler listesinde görür.",
        recovery: "Yukarıdaki sarı teslim çubuğundan 'Teslim Al' veya 'Teslim Reddi / İade' adımını uygulayın."
      }
    );
  } else if (state.operation === "adjust") {
    const diff = qty - product.stock;
    product.stock = qty;
    product.version += 1;
    addLog({
      id: key,
      type: "adjust",
      sku: product.sku,
      qty: diff,
      unit: product.unit,
      status: "ok",
      note: `Sayım düzeltmesi (${diff >= 0 ? "+" : ""}${diff} ${product.unit}) • ${noteText}`
    });
    showDiagnostic("success", "Sayım Düzeltmesi Onaylandı", `${product.sku} fiziksel sayım miktarı ${qty} ${product.unit} olarak eşitlendi (Fark: ${diff >= 0 ? "+" : ""}${diff}).`);
  }

  lastSubmittedIdempotencyKey = key;
  state.nextTxnSeq += 1;
  renderAll();
}

function flushOfflineQueue() {
  state.isOffline = false;
  const count = state.offlineQueue.length;
  while (state.offlineQueue.length > 0) {
    const item = state.offlineQueue.shift();
    const product = state.products.find((p) => p.sku === item.sku);
    if (product) {
      if (item.type === "entry") product.stock += item.qty;
      else if (item.type === "exit" && product.stock >= item.qty) product.stock -= item.qty;
      product.version += 1;
    }
    const existingLog = state.logs.find((l) => l.id === item.id);
    if (existingLog) {
      existingLog.status = "ok";
      existingLog.note = "Çevrimdışı kuyruktan sunucuya başarıyla senkronize edildi";
    }
  }
  showDiagnostic("success", "Bağlantı Kuruldu ve Kuyruk Eşitlendi", `${count} bekleyen işlem tekil anahtarlarıyla kalıcı veriye işlendi.`);
  renderAll();
}

/* Event Bindings */
els.roleButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    state.role = btn.dataset.role;
    clearDiagnostic();
    renderAll();
  });
});

els.zoneSelect.addEventListener("change", () => {
  state.zoneFilter = els.zoneSelect.value;
  const filtered = getFilteredProducts();
  if (filtered.length > 0 && !filtered.some((p) => p.sku === state.selectedSku)) {
    state.selectedSku = filtered[0].sku;
  }
  renderAll();
});

els.networkToggleBtn.addEventListener("click", () => {
  if (state.isOffline && state.offlineQueue.length > 0) {
    flushOfflineQueue();
  } else {
    state.isOffline = !state.isOffline;
    renderAll();
  }
});

els.securityInfoBtn.addEventListener("click", () => {
  const expanded = els.securityInfoBtn.getAttribute("aria-expanded") === "true";
  els.securityInfoBtn.setAttribute("aria-expanded", String(!expanded));
  els.architectureDrawer.classList.toggle("hidden", expanded);
});

els.resetDemoBtn.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  lastSubmittedIdempotencyKey = null;
  state = loadState();
  delete els.unitSelect.dataset.manualOverride;
  els.qtyInput.value = "35";
  showDiagnostic("success", "Sentetik Veriler Sıfırlandı", "Tüm ürün bakiyeleri, roller ve hareket geçmişi ilk demo durumuna döndürüldü.");
  renderAll();
});

els.searchInput.addEventListener("input", () => {
  state.searchQuery = els.searchInput.value;
  renderCatalog();
});

els.clearSearchBtn.addEventListener("click", () => {
  state.searchQuery = "";
  els.searchInput.value = "";
  renderCatalog();
});

els.resetFiltersBtn.addEventListener("click", () => {
  state.searchQuery = "";
  state.zoneFilter = "ALL";
  state.catalogFilter = "all";
  els.searchInput.value = "";
  renderAll();
});

els.filterChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    state.catalogFilter = chip.dataset.filter;
    renderCatalog();
  });
});

els.toggleScannerBtn.addEventListener("click", () => {
  const expanded = els.toggleScannerBtn.getAttribute("aria-expanded") === "true";
  els.toggleScannerBtn.setAttribute("aria-expanded", String(!expanded));
  els.scannerDrawer.classList.toggle("hidden", expanded);
});

els.scanSimButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const code = btn.dataset.scan;
    if (code === "UNREADABLE") {
      showDiagnostic(
        "error",
        "Barkod / QR Okunamadı",
        "Etiket hasarlı veya ışık yansıması nedeniyle kamera kodu çözemedi.",
        {
          trigger: "Hasarlı barkod etiketi tarandı.",
          knowledge: "Sistem kameradan geçerli bir SKU metni alınamadığını biliyor; raftaki ürünün hangisi olduğunu bilmiyor.",
          userView: "Okuma hatası ve manuel SKU arama kutusuna odaklanma seçeneği görür.",
          decision: "ENGELLENİR. Yanlış ürüne işlem yapılmasını önlemek için manuel SKU girişi istenir.",
          persisted: "Veritabanına stok hareketi yazılmaz.",
          notified: "Depo Personeline manuel arama önerilir.",
          recovery: "Arama kutusuna SKU kodunu veya ürün adını elle yazarak ürünü seçin."
        },
        [
          {
            label: "Arama Kutusuna Odaklan",
            onClick: () => {
              els.searchInput.focus();
              clearDiagnostic();
            }
          }
        ]
      );
      return;
    }

    const found = state.products.find((p) => p.sku === code);
    if (!found) {
      showDiagnostic(
        "error",
        `Ürün Sistemde Bulunamadı (${code})`,
        `${code} kodlu ürün aktif ambar kataloğunda kayıtlı değil.`,
        {
          trigger: `Tanımsız veya hatalı ürün kodu (${code}) okutuldu.`,
          knowledge: `Sistem ${code} kodunun veritabanında olmadığını biliyor; etiketin eski parti veya başka işletmeye ait olup olmadığını bilmiyor.`,
          userView: "Kayıtsız ürün uyarısı görür.",
          decision: "ENGELLENİR. Tanımsız SKU ile stok hareketi açılamaz.",
          persisted: "Stok hareketi kaydedilmez.",
          notified: "Depo Sorumlusuna yeni ürün kartı talebi iletilmelidir.",
          recovery: "Doğru kodu tekrar okutun veya katalogdan mevcut bir ürün seçin."
        }
      );
      return;
    }

    state.selectedSku = found.sku;
    state.zoneFilter = "ALL";
    state.catalogFilter = "all";
    state.searchQuery = "";
    els.searchInput.value = "";
    delete els.unitSelect.dataset.manualOverride;
    showDiagnostic("success", "Barkod Başarıyla Okundu", `${found.sku} — ${found.name} (${found.shelf}) seçildi.`);
    renderAll();
  });
});

els.opTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    state.operation = tab.dataset.op;
    clearDiagnostic();
    renderStage();
  });
});

els.qtyMinusBtn.addEventListener("click", () => {
  const cur = Math.max(1, Number(els.qtyInput.value || 1) - 1);
  els.qtyInput.value = String(cur);
  updateProjectedWayfinding(getSelectedProduct());
});

els.qtyPlusBtn.addEventListener("click", () => {
  const cur = Math.max(0, Number(els.qtyInput.value || 0)) + 1;
  els.qtyInput.value = String(cur);
  updateProjectedWayfinding(getSelectedProduct());
});

els.qtyInput.addEventListener("input", () => {
  updateProjectedWayfinding(getSelectedProduct());
});

els.unitSelect.addEventListener("change", () => {
  els.unitSelect.dataset.manualOverride = "1";
});

els.targetShelfSelect.addEventListener("change", () => {
  renderStage();
});

els.movementForm.addEventListener("submit", (e) => {
  e.preventDefault();
  executeMovement();
});

els.duplicateTestBtn.addEventListener("click", () => {
  if (!lastSubmittedIdempotencyKey) {
    executeMovement();
  }
  executeMovement({ forceDuplicate: true });
});

els.closeDiagBtn.addEventListener("click", clearDiagnostic);

els.acceptTransferBtn.addEventListener("click", () => {
  const product = getSelectedProduct();
  if (!product || !product.pendingTransfer) return;
  const trf = product.pendingTransfer;
  product.stock += trf.qty;
  product.version += 1;
  product.pendingTransfer = null;
  addLog({
    id: `${trf.id}-OK`,
    type: "entry",
    sku: product.sku,
    qty: trf.qty,
    unit: product.unit,
    status: "ok",
    note: `${trf.id} hedef depoda teslim alındı (+${trf.qty} ${product.unit})`
  });
  showDiagnostic("success", "Transfer Teslim Alındı", `${trf.id} kapsamındaki ${trf.qty} ${product.unit} hedef stok bakiyesine eklendi.`);
  renderAll();
});

els.rejectTransferBtn.addEventListener("click", () => {
  const product = getSelectedProduct();
  if (!product || !product.pendingTransfer) return;
  const trf = product.pendingTransfer;
  product.stock += trf.qty;
  product.version += 1;
  product.pendingTransfer = null;
  addLog({
    id: `${trf.id}-RET`,
    type: "transfer",
    sku: product.sku,
    qty: trf.qty,
    unit: product.unit,
    status: "blocked",
    note: `${trf.id} hedef depo tarafından reddedildi — kaynak rafa iade edildi`
  });
  showDiagnostic("warning", "Transfer Teslimatı Reddedildi", `${trf.qty} ${product.unit} kaynak rafa güvenli şekilde iade edildi.`);
  renderAll();
});

/* Quick Exception Scenario Simulator Buttons */
els.labButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const scenario = btn.dataset.scenario;
    const product = getSelectedProduct();
    delete els.unitSelect.dataset.manualOverride;

    if (scenario === "insufficient") {
      state.operation = "exit";
      els.unitSelect.value = product.unit;
      els.qtyInput.value = String(product.stock + 25);
      renderStage();
      executeMovement();
    } else if (scenario === "duplicate") {
      state.operation = "exit";
      els.unitSelect.value = product.unit;
      els.qtyInput.value = "5";
      renderStage();
      executeMovement();
      executeMovement({ forceDuplicate: true });
    } else if (scenario === "offline") {
      state.isOffline = true;
      state.operation = "entry";
      els.unitSelect.value = product.unit;
      els.qtyInput.value = "12";
      renderAll();
      executeMovement();
    } else if (scenario === "concurrency") {
      state.operation = "exit";
      els.unitSelect.value = product.unit;
      els.qtyInput.value = String(Math.min(product.stock, 4));
      renderStage();
      executeMovement({ simulatedConcurrencyConflict: true });
    } else if (scenario === "unauthorized") {
      state.role = "staff";
      state.operation = "adjust";
      els.unitSelect.value = product.unit;
      els.qtyInput.value = String(product.stock + 3);
      renderAll();
      executeMovement();
    } else if (scenario === "unit-mismatch") {
      state.operation = "exit";
      const wrongUnit = product.unit === "Koli" ? "Adet" : "Koli";
      els.unitSelect.value = wrongUnit;
      els.unitSelect.dataset.manualOverride = "1";
      els.qtyInput.value = "5";
      renderStage();
      executeMovement();
    } else if (scenario === "pending-handoff") {
      state.selectedSku = "URN-2019";
      state.zoneFilter = "ALL";
      state.catalogFilter = "all";
      state.operation = "transfer";
      const target = getSelectedProduct();
      if (!target.pendingTransfer) {
        target.pendingTransfer = {
          id: `TRF-${state.nextTxnSeq}`,
          from: "A1-K01-R01-G02",
          to: "B2-K01-R02-G03",
          qty: 10,
          unit: target.unit,
          sender: "Ahmet Yılmaz"
        };
      }
      renderAll();
      showDiagnostic(
        "warning",
        "Transfer Başlatıldı Ancak Hedef Depo Henüz Teslim Almadı",
        `${target.sku} ürünü için ${target.pendingTransfer.id} kodlu transfer ara transit durumunda bekliyor.`,
        {
          trigger: "Transfer çıkışı onaylandı; hedef raf sorumlusu henüz teslimatı onaylamadı.",
          knowledge: "Sistem çıkış rafından düşüm yapıldığını biliyor; ürünün teslim edilip edilmediğini onay gelene kadar bilmiyor.",
          userView: "Üstte sarı teslim alma/reddetme çubuğu ve 'Transit Bekliyor' etiketi görür.",
          decision: "UYARI ile transit kaydı açık tutulur.",
          persisted: "pendingTransfer varlığı korunur; stok askıda kaybolmaz.",
          notified: "Hedef depo sorumlusu bilgilendirilir.",
          recovery: "Yukarıdaki sarı şeritten 'Teslim Al' veya 'Teslim Reddi / İade' düğmesine basın."
        }
      );
    }
  });
});

renderAll();
