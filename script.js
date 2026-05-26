/**
 * script.js — NexPort Nexus Control Center
 * Logika UI utama · komentar Bahasa Indonesia
 *
 * Audit & Perbaikan:
 * - CRUD Vehicle full berjalan (CREATE, READ, UPDATE, DELETE)
 * - Modal vehicle menggunakan classList.add/remove("is-open")
 * - Edit row vehicle → data masuk form, selectedVehicleId terisi
 * - Submit form: selectedVehicleId ada → UPDATE, tidak ada → INSERT
 * - Hapus duplicate "if (error) throw error;"
 * - Delete vehicle: hapus dari DB, tutup modal, reset form, refresh table
 * - Search vehicle realtime berjalan
 * - Tidak ada variable undefined / duplicate listener
 * - Semua modal ditutup dengan benar
 */

/* ==========================================================================
   Supabase — client (URL project, BUKAN /rest/v1/)
   ========================================================================== */
const SUPABASE_URL = "https://tolfokluxlhynudrxdta.supabase.co";
const SUPABASE_KEY = "sb_publishable_IKTkm1ZGmnvNKo8pG_sfBA_6FVZ5tTH";

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let supabaseClient = null;

function initSupabaseClient() {
  if (!window.supabase?.createClient) {
    console.error("[Supabase] SDK belum dimuat. Pastikan script @supabase/supabase-js di-load sebelum script.js");
    return null;
  }
  return window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

/* ==========================================================================
   State Global
   ========================================================================== */
/** @type {Array<object>} */
let containersList = [];
let vehiclesList = [];
let driversList = [];

let searchQuery = "";
let vehicleSearchQuery = "";
let selectedContainer = null;
let selectedContainerId = null;
let selectedVehicleId = null;
let selectedDriverId = null;
let driverSearchQuery = "";
let chartInstances = [];
let mapInterval = null;
let alertInterval = null;
let feedInterval = null;
let kpiInterval = null;

const MIN_LOADER_MS = 700;

/* ==========================================================================
   Referensi DOM
   ========================================================================== */
const DOM = {
  skeleton: document.getElementById("skeleton-loader"),
  sidebar: document.getElementById("sidebar"),
  mainWrapper: document.getElementById("main-wrapper"),
  sidebarToggle: document.getElementById("sidebar-toggle"),
  sidebarCollapse: document.getElementById("sidebar-collapse"),
  sidebarOverlay: document.getElementById("sidebar-overlay"),
  datetime: document.getElementById("datetime"),
  kpiGrid: document.getElementById("kpi-grid"),
  aiPanel: document.getElementById("ai-insights-panel"),
  activityFeed: document.getElementById("activity-feed"),
  tableBody: document.getElementById("table-body"),
  vehicleTableBody: document.getElementById("vehicle-table-body"),
  vehicleRecordCount: document.getElementById("vehicle-record-count"),
  vehicleSearch: document.getElementById("vehicle-search"),
  recordCount: document.getElementById("record-count"),
  tableSearch: document.getElementById("table-search"),
  globalSearch: document.getElementById("global-search"),
  mapZones: document.getElementById("map-zones"),
  mapRoutes: document.getElementById("map-routes"),
  mapDocks: document.getElementById("map-docks"),
  mapTooltip: document.getElementById("map-tooltip"),
  mapContainer: document.getElementById("port-map-container"),
  mapActiveRoutes: document.getElementById("map-active-routes"),
  modalOverlay: document.getElementById("modal-overlay"),
  modalClose: document.getElementById("modal-close"),
  modalTitle: document.getElementById("modal-title"),
  modalStatus: document.getElementById("modal-status"),
  modalBody: document.getElementById("modal-body"),
  toastContainer: document.getElementById("toast-container"),
  fabGroup: document.querySelector(".fab-group"),
  fabMain: document.getElementById("fab-main"),
  fabAlert: document.getElementById("fab-alert"),
  fabRefresh: document.getElementById("fab-refresh"),
  brandVersion: document.getElementById("brand-version"),
  charts: {
    shipment: document.getElementById("chart-shipment"),
    throughput: document.getElementById("chart-throughput"),
    delay: document.getElementById("chart-delay"),
    vehicle: document.getElementById("chart-vehicle"),
    efficiency: document.getElementById("chart-efficiency"),
  },
  // Container CRUD Modal
  addModalOverlay: document.getElementById("add-container-modal"),
  closeAddModal: document.getElementById("close-add-modal"),
  btnAddContainer: document.getElementById("btn-add-container"),
  addContainerForm: document.getElementById("add-container-form"),
  // Vehicle CRUD Modal
  addVehicleModal: document.getElementById("add-vehicle-modal"),
  closeAddVehicleModal: document.getElementById("close-add-vehicle-modal"),
  btnAddVehicle: document.getElementById("btn-add-vehicle"),
  addVehicleForm: document.getElementById("add-vehicle-form"),
  deleteVehicleBtn: document.getElementById("delete-vehicle-btn"),
  // Driver Management
  driverTableBody: document.getElementById("driver-table-body"),
  driverRecordCount: document.getElementById("driver-record-count"),
  driverSearch: document.getElementById("driver-search"),
  addDriverModal: document.getElementById("add-driver-modal"),
  closeAddDriverModal: document.getElementById("close-add-driver-modal"),
  btnAddDriver: document.getElementById("btn-add-driver"),
  addDriverForm: document.getElementById("add-driver-form"),
  deleteDriverBtn: document.getElementById("delete-driver-btn"),
};

/* ==========================================================================
   Tema Chart.js — palet premium logistics
   ========================================================================== */
const CHART = {
  cyan: "#3CF2FF",
  blue: "#4DA8FF",
  emerald: "#4ADE80",
  orange: "#FF8A3D",
  red: "#FF5D73",
  grid: "rgba(148, 163, 184, 0.12)",
  text: "#94A3B8",
  textLight: "#F5F7FA",
};

/* ==========================================================================
   Skeleton loader — tampilkan / sembunyikan
   ========================================================================== */
function hideSkeletonLoader() {
  if (!DOM.skeleton) return;
  DOM.skeleton.classList.add("is-hidden");
  DOM.skeleton.setAttribute("aria-busy", "false");
}

function initBrandMeta() {
  if (DOM.brandVersion && typeof BRAND !== "undefined") {
    DOM.brandVersion.textContent = BRAND.version;
  }
}

/** Tunggu minimal durasi loader agar transisi halus */
function waitMinLoader(startedAt) {
  const elapsed = Date.now() - startedAt;
  const remain = Math.max(0, MIN_LOADER_MS - elapsed);
  return new Promise((resolve) => setTimeout(resolve, remain));
}

/* ==========================================================================
   Sidebar — collapse desktop & toggle mobile
   ========================================================================== */
function initSidebar() {
  DOM.sidebarCollapse?.addEventListener("click", () => {
    document.body.classList.toggle("sidebar-collapsed");
  });

  const open = () => {
    DOM.sidebar.classList.add("is-open");
    DOM.sidebarOverlay?.classList.add("is-visible");
    DOM.sidebarToggle?.setAttribute("aria-expanded", "true");
  };

  const close = () => {
    DOM.sidebar.classList.remove("is-open");
    DOM.sidebarOverlay?.classList.remove("is-visible");
    DOM.sidebarToggle?.setAttribute("aria-expanded", "false");
  };

  DOM.sidebarToggle?.addEventListener("click", () => {
    DOM.sidebar.classList.contains("is-open") ? close() : open();
  });

  DOM.sidebarOverlay?.addEventListener("click", close);

  document.querySelectorAll(".sidebar__link").forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      if (!href || href === "#") {
        e.preventDefault();
        return;
      }
      document.querySelectorAll(".sidebar__link").forEach((l) => l.classList.remove("sidebar__link--active"));
      link.classList.add("sidebar__link--active");
      if (window.innerWidth <= 768) close();
    });
  });
}

/* ==========================================================================
   Jam real-time — topbar command center
   ========================================================================== */
function initClock() {
  const format = (d) =>
    d.toLocaleString("id-ID", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

  const tick = () => {
    const now = new Date();
    if (DOM.datetime) {
      DOM.datetime.textContent = format(now);
      DOM.datetime.setAttribute("datetime", now.toISOString());
    }
  };
  tick();
  setInterval(tick, 1000);
}

/* ==========================================================================
   KPI Cards — render interaktif dengan pulse
   ========================================================================== */
const KPI_ICONS = {
  container: "▣",
  clock: "◷",
  ship: "⛴",
  activity: "◉",
  throughput: "↗️",
  efficiency: "◎",
};

function renderKPIs() {
  if (!DOM.kpiGrid) return;
  DOM.kpiGrid.innerHTML = Object.entries(METRICS)
    .map(([, m]) => {
      const val =
        typeof m.value === "number" ? m.value.toLocaleString("id-ID") : m.value;
      const pulse = m.pulse ? " kpi-card--pulse" : "";
      const deltaClass =
        m.trend === "alert"
          ? "kpi-card__delta--alert"
          : m.trend === "up"
            ? "kpi-card__delta--up"
            : "";
      return `
        <article class="panel kpi-card kpi-card--${m.accent}${pulse}" data-metric>
          <div class="kpi-card__icon">${KPI_ICONS[m.icon] || "◉"}</div>
          <p class="kpi-card__label">${m.label}</p>
          <p class="kpi-card__value">${val}</p>
          <p class="kpi-card__delta ${deltaClass}">${m.delta}</p>
        </article>
      `;
    })
    .join("");
}

/** Simulasi live tick pada angka KPI */
function simulateKPIPulse() {
  const delayed = METRICS.delayed;
  if (typeof delayed.value === "number") {
    const delta = Math.random() > 0.5 ? 1 : -1;
    delayed.value = Math.max(20, delayed.value + delta);
    renderKPIs();
  }
}

/* ==========================================================================
   Panel AI Insights — rekomendasi operasional
   ========================================================================== */
function renderAIInsights() {
  if (!DOM.aiPanel) return;
  DOM.aiPanel.innerHTML = AI_INSIGHTS.map(
    (ins) => `
    <article class="ai-insight ai-insight--${ins.type}">
      <div class="ai-insight__icon">${ins.icon}</div>
      <div>
        <p class="ai-insight__text">${ins.text}</p>
        <p class="ai-insight__conf">Confidence ${ins.confidence}% · Nexus AI</p>
      </div>
    </article>
  `
  ).join("");
}

/* ==========================================================================
   Activity Feed — stream aktivitas live
   ========================================================================== */
function renderActivityFeed(items = ACTIVITY_FEED) {
  if (!DOM.activityFeed) return;
  DOM.activityFeed.innerHTML = items
    .map(
      (item) => `
    <div class="activity-item activity-item--${item.type}">
      <span class="activity-item__time">${item.time}</span>
      <span>${item.text}</span>
    </div>
  `
    )
    .join("");
}

function prependFeedItem(item) {
  if (!DOM.activityFeed) return;
  const el = document.createElement("div");
  el.className = `activity-item activity-item--${item.type}`;
  el.innerHTML = `<span class="activity-item__time">${item.time}</span><span>${item.text}</span>`;
  DOM.activityFeed.prepend(el);
  if (DOM.activityFeed.children.length > 12) {
    DOM.activityFeed.lastElementChild?.remove();
  }
}

function simulateFeedUpdate() {
  const tpl = LIVE_FEED_TEMPLATES[Math.floor(Math.random() * LIVE_FEED_TEMPLATES.length)];
  const zone = PORT_ZONES[Math.floor(Math.random() * PORT_ZONES.length)];
  const pool = containersList.length ? containersList : CONTAINERS;
  const container = pool[Math.floor(Math.random() * pool.length)];
  if (!container) return;
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  let text = tpl.text
    .replace("{zone}", zone.name)
    .replace("{id}", container.id)
    .replace("{dock}", zone.dock)
    .replace("{route}", container.route?.split("→")[0]?.trim() || "Route A");

  prependFeedItem({ time, type: tpl.type, text });
}

/* ==========================================================================
   Badge status kontainer
   ========================================================================== */
function getBadgeClass(status) {
  return (
    {
      Loading: "badge--loading",
      Transit: "badge--transit",
      Delayed: "badge--delayed",
    }[status] || "badge--transit"
  );
}

/* ==========================================================================
   Supabase — normalisasi baris DB ke format UI
   ========================================================================== */
function escapeHtml(value) {
  const el = document.createElement("span");
  el.textContent = value == null ? "" : String(value);
  return el.innerHTML;
}

function formatEta(eta) {
  if (!eta) return "—";
  const d = new Date(eta);
  if (Number.isNaN(d.getTime())) return String(eta);
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeStatus(status) {
  if (!status) return "Transit";
  const s = String(status).trim().toLowerCase();
  if (s === "loading") return "Loading";
  if (s === "transit" || s === "in transit") return "Transit";
  if (s === "delayed" || s === "delay") return "Delayed";
  const str = String(status).trim();
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : "Transit";
}

/** Map kolom Supabase → properti camelCase untuk UI */
function normalizeContainer(row) {
  return {
    id: row.id ?? "—",
    containerId: row.container_id ?? "—",
    cargoType: row.cargo_type ?? "—",
    weight: row.weight ?? "—",
    destination: row.destination ?? "—",
    eta: formatEta(row.eta),
    status: normalizeStatus(row.status),
    driverName: row.driver_name ?? "—",
    licensePlate: row.license_plate ?? "—",
    route: row.route ?? "—",
    truckId: row.truck_id ?? "—",
  };
}

/**
 * Fetch kontainer dari Supabase table `containers`
 * @returns {{ ok: boolean, data: object[], message?: string }}
 */
async function getContainers() {
  if (!supabaseClient) {
    return {
      ok: false,
      data: [...CONTAINERS],
      message: "Klien Supabase tidak tersedia — menggunakan data lokal.",
    };
  }

  try {
    const { data, error } = await supabaseClient
      .from("containers")
      .select(
        "id, container_id, cargo_type, weight, destination, eta, status, driver_name, license_plate, route, truck_id"
      )
      .order("id", { ascending: true });

    if (error) throw error;

    const normalized = (data ?? []).map(normalizeContainer);
    return { ok: true, data: normalized };
  } catch (err) {
    console.error("[getContainers]", err);
    return {
      ok: false,
      data: [...CONTAINERS],
      message: err.message || "Gagal memuat data kontainer.",
    };
  }
}

/** Muat data + render tabel */
async function loadContainersData() {
  const result = await getContainers();
  containersList = result.data;

  if (!result.ok) {
    showToast("delay", "Database Error", result.message ?? "Gagal memuat dari Supabase.");
  }

  renderTable();
  return result;
}

function getFilteredContainers() {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return containersList;
  return containersList.filter((c) => {
    const haystack = [
      c.containerId,
      c.driverName,
      c.licensePlate,
      c.route,
      c.cargoType,
      c.destination,
      c.status,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

/* ==========================================================================
   Tabel monitoring — #table-body, sticky header, klik modal
   ========================================================================== */
function renderTable() {
  if (!DOM.tableBody) {
    console.error("[renderTable] Elemen #table-body tidak ditemukan.");
    return;
  }

  const rows = getFilteredContainers();

  if (rows.length === 0) {
    DOM.tableBody.innerHTML = `
    <tr>
      <td colspan="9" class="table-empty">
        <div class="empty-state">
          <span style="font-size:2rem;">📦</span>
          <p style="margin-top:0.5rem;">
            No container data available
          </p>
        </div>
      </td>
    </tr>
  `;
  
} else {
  DOM.tableBody.innerHTML = rows
    .map(
      (c) => `
      <tr data-id="${escapeHtml(c.id)}" tabindex="0">
        <td>${escapeHtml(c.containerId)}</td>
        <td>${escapeHtml(c.cargoType)}</td>
        <td>${escapeHtml(c.weight)}</td>
        <td>${escapeHtml(c.destination)}</td>
        <td>${escapeHtml(c.eta)}</td>
        <td>${escapeHtml(c.driverName)}</td>
        <td>${escapeHtml(c.licensePlate)}</td>
        <td title="${escapeHtml(c.route)}">${escapeHtml(c.route)}</td>
        <td><span class="badge ${getBadgeClass(c.status)}">${escapeHtml(c.status)}</span></td>
      </tr>
    `
    )
    .join("");
}

if (DOM.recordCount) {
  DOM.recordCount.textContent = `${rows.length} / ${containersList.length} records`;
}

DOM.tableBody.querySelectorAll("tr[data-id]").forEach((tr) => {
  const open = () => {
    const item = containersList.find((c) => String(c.id) === tr.dataset.id);
    if (item) openModal(item);
  };
  tr.addEventListener("click", open);
  tr.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  });
});
}

function initSearch() {
  const apply = (v) => {
    searchQuery = v;
    renderTable();
  };
  DOM.tableSearch?.addEventListener("input", (e) => {
    apply(e.target.value);
    if (DOM.globalSearch) DOM.globalSearch.value = e.target.value;
  });
  DOM.globalSearch?.addEventListener("input", (e) => {
    apply(e.target.value);
    if (DOM.tableSearch) DOM.tableSearch.value = e.target.value;
  });
}

/* ==========================================================================
   Modal detail shipment (Container)
   ========================================================================== */
function openModal(item) {
  selectedContainerId = item.id;
  if (DOM.modalTitle) {
    DOM.modalTitle.textContent = item.containerId;
  }
  DOM.modalStatus.textContent = item.status;
  DOM.modalStatus.className = `badge ${getBadgeClass(item.status)}`;

  DOM.modalBody.innerHTML = `
    <div class="modal__grid">
      <div class="modal__field"><label>Cargo Type</label><span>${item.cargoType}</span></div>
      <div class="modal__field"><label>Weight</label><span>${item.weight}</span></div>
      <div class="modal__field"><label>Destination</label><span>${item.destination}</span></div>
      <div class="modal__field"><label>ETA</label><span>${item.eta}</span></div>
      <div class="modal__field"><label>Truck ID</label><span>${item.truckId}</span></div>
      <div class="modal__field"><label>License Plate</label><span>${item.licensePlate}</span></div>
      <div class="modal__field"><label>Driver Name</label><span>${item.driverName}</span></div>
      <div class="modal__field"><label>Status</label><span>${item.status}</span></div>
      <div class="modal__field modal__field--full">
        <label>Route</label>
        <p class="modal__route">${item.route}</p>
      </div>
    </div>
  `;

  DOM.modalOverlay.classList.add("is-open");
  DOM.modalOverlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  DOM.modalOverlay.classList.remove("is-open");
  DOM.modalOverlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function initModal() {
  DOM.modalClose?.addEventListener("click", closeModal);
  DOM.modalOverlay?.addEventListener("click", (e) => {
    if (e.target === DOM.modalOverlay) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
      closeVehicleModal();
      closeDriverModal();
      closeAddContainerModal();
    }
  });
}

/* ==========================================================================
   Container CRUD — Edit Status & Delete
   ========================================================================== */
function initContainerCRUD() {
  document.getElementById("edit-container-btn")?.addEventListener("click", async () => {
    if (!selectedContainerId) {
      showToast("delay", "Error", "Container tidak ditemukan.");
      return;
    }

    try {
      const { error } = await supabaseClient
        .from("containers")
        .update({ status: "Delayed" })
        .eq("id", selectedContainerId);

      if (error) throw error;

      showToast("success", "Updated", "Status berhasil diubah.");
      closeModal();
      await loadContainersData();
    } catch (err) {
      console.error("[editContainer]", err);
      showToast("delay", "Update Failed", err.message);
    }
  });

  document.getElementById("delete-container-btn")?.addEventListener("click", async () => {
    if (!selectedContainerId) {
      showToast("delay", "Error", "Container tidak ditemukan.");
      return;
    }

    const confirmDelete = confirm("Yakin ingin menghapus container ini?");
    if (!confirmDelete) return;

    try {
      const { error } = await supabaseClient
        .from("containers")
        .delete()
        .eq("id", selectedContainerId);

      if (error) throw error;

      showToast("success", "Deleted", "Container berhasil dihapus.");
      closeModal();
      await loadContainersData();
    } catch (err) {
      console.error("[deleteContainer]", err);
      showToast("delay", "Delete Failed", err.message);
    }
  });
}

/* ==========================================================================
   Modal Add New Container (CRUD - Create)
   ========================================================================== */
function openAddContainerModal() {
  if (!DOM.addModalOverlay) return;
  DOM.addModalOverlay.classList.add("is-open");
  DOM.addModalOverlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeAddContainerModal() {
  if (!DOM.addModalOverlay) return;
  DOM.addModalOverlay.classList.remove("is-open");
  DOM.addModalOverlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  DOM.addContainerForm?.reset();
}

function initAddContainerModal() {
  DOM.btnAddContainer?.addEventListener("click", openAddContainerModal);
  DOM.closeAddModal?.addEventListener("click", closeAddContainerModal);

  DOM.addModalOverlay?.addEventListener("click", (e) => {
    if (e.target === DOM.addModalOverlay) closeAddContainerModal();
  });

  DOM.addContainerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!supabaseClient) {
      showToast("delay", "Insert Failed", "Klien database Supabase belum terinisialisasi.");
      return;
    }

    const containerIdVal = document.getElementById("container-id")?.value?.trim();
    const cargoTypeVal = document.getElementById("cargo-type")?.value?.trim();
    const weightVal = document.getElementById("weight")?.value?.trim();
    const destinationVal = document.getElementById("destination")?.value?.trim();
    const driverNameVal = document.getElementById("driver-name")?.value?.trim();
    const licensePlateVal = document.getElementById("license-plate")?.value?.trim();
    const routeVal = document.getElementById("route")?.value?.trim();

    const defaultStatus = "Transit";
    const autoEta = new Date().toISOString();
    const randomTruckId = `TRK-${Math.floor(100 + Math.random() * 900)}`;

    try {
      const { error } = await supabaseClient.from("containers").insert([
        {
          container_id: containerIdVal,
          cargo_type: cargoTypeVal,
          weight: weightVal,
          destination: destinationVal,
          status: defaultStatus,
          eta: autoEta,
          driver_name: driverNameVal,
          license_plate: licensePlateVal,
          route: routeVal,
          truck_id: randomTruckId,
        },
      ]);

      if (error) throw error;

      showToast("success", "Container Added", "New container berhasil ditambahkan.");
      closeAddContainerModal();
      await loadContainersData();
    } catch (err) {
      console.error("[addContainer]", err);
      showToast("delay", "Insert Failed", err.message);
    }
  });
}

/* ==========================================================================
   Vehicle Management — Badge Status
   ========================================================================== */
function getVehicleBadge(status) {
  const map = {
    Active: "badge--loading",
    Idle: "badge--transit",
    Maintenance: "badge--delayed",
  };
  return map[status] || "badge--transit";
}

/* ==========================================================================
   Vehicle Management — Load & Render Table (READ)
   ========================================================================== */
async function loadVehiclesData() {
  if (!supabaseClient) return;

  try {
    const { data, error } = await supabaseClient
      .from("vehicles")
      .select("*")
      .order("id", { ascending: true });

    if (error) throw error;

    vehiclesList = data || [];
    renderVehicleTable();
  } catch (err) {
    console.error("[loadVehiclesData]", err);
    showToast("delay", "Vehicle Error", err.message);
  }
}

function getFilteredVehicles() {
  const q = vehicleSearchQuery.trim().toLowerCase();
  if (!q) return vehiclesList;
  return vehiclesList.filter((v) =>
    [v.vehicle_code, v.driver_name, v.license_plate, v.vehicle_type, v.route, v.status]
      .join(" ")
      .toLowerCase()
      .includes(q)
  );
}

function renderVehicleTable() {
  if (!DOM.vehicleTableBody) return;

  const rows = getFilteredVehicles();

  if (rows.length === 0) {
    DOM.vehicleTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="table-empty">Tidak ada data vehicle untuk ditampilkan.</td>
      </tr>
    `;
  } else {
    DOM.vehicleTableBody.innerHTML = rows
      .map(
        (v) => `
      <tr data-vehicle-id="${escapeHtml(v.id)}" tabindex="0" style="cursor:pointer;">
        <td>${escapeHtml(v.vehicle_code)}</td>
        <td>${escapeHtml(v.driver_name)}</td>
        <td>${escapeHtml(v.license_plate)}</td>
        <td>${escapeHtml(v.vehicle_type)}</td>
        <td><span class="badge ${getVehicleBadge(v.status)}">${escapeHtml(v.status)}</span></td>
        <td>${escapeHtml(v.route)}</td>
        <td>${escapeHtml(v.last_activity)}</td>
      </tr>
    `
      )
      .join("");
  }

  if (DOM.vehicleRecordCount) {
    DOM.vehicleRecordCount.textContent = `${vehiclesList.length} fleets`;
  }

  // Pasang event listener klik tiap baris → buka modal edit
  DOM.vehicleTableBody.querySelectorAll("tr[data-vehicle-id]").forEach((tr) => {
    tr.addEventListener("click", () => {
      const vid = tr.dataset.vehicleId;
      const vehicle = vehiclesList.find((v) => String(v.id) === String(vid));
      if (!vehicle) return;
      openVehicleModalForEdit(vehicle);
    });
    tr.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        tr.click();
      }
    });
  });
}

/* ==========================================================================
   Vehicle Management — Modal Helpers
   ========================================================================== */
function openVehicleModal() {
  if (!DOM.addVehicleModal) return;
  DOM.addVehicleModal.classList.add("is-open");
  DOM.addVehicleModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeVehicleModal() {
  if (!DOM.addVehicleModal) return;
  DOM.addVehicleModal.classList.remove("is-open");
  DOM.addVehicleModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  DOM.addVehicleForm?.reset();
  selectedVehicleId = null;

  // Sembunyikan tombol delete saat modal ditutup (akan diset ulang saat edit)
  if (DOM.deleteVehicleBtn) DOM.deleteVehicleBtn.style.display = "none";
}

/**
 * Buka modal vehicle dalam mode EDIT.
 * Mengisi semua field form dengan data vehicle yang dipilih.
 * @param {object} vehicle - Baris data vehicle dari Supabase
 */
function openVehicleModalForEdit(vehicle) {
  selectedVehicleId = vehicle.id;

  // Isi field form
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val ?? "";
  };

  setVal("vehicle-code", vehicle.vehicle_code);
  setVal("vehicle-driver-name", vehicle.driver_name);
  setVal("vehicle-license-plate", vehicle.license_plate);
  setVal("vehicle-type", vehicle.vehicle_type);
  setVal("vehicle-status", vehicle.status);
  setVal("vehicle-route", vehicle.route);
  setVal("vehicle-last-activity", vehicle.last_activity);

  // Tampilkan tombol delete saat mode edit
  if (DOM.deleteVehicleBtn) DOM.deleteVehicleBtn.style.display = "";

  openVehicleModal();
}

/**
 * Buka modal vehicle dalam mode CREATE.
 * Reset form dan kosongkan selectedVehicleId.
 */
function openVehicleModalForCreate() {
  selectedVehicleId = null;
  DOM.addVehicleForm?.reset();

  // Sembunyikan tombol delete saat mode create
  if (DOM.deleteVehicleBtn) DOM.deleteVehicleBtn.style.display = "none";

  openVehicleModal();
}

/* ==========================================================================
   Vehicle Management — CRUD Full (CREATE / UPDATE / DELETE)
   ========================================================================== */
function initVehicleManagement() {
  // Buka modal untuk CREATE
  DOM.btnAddVehicle?.addEventListener("click", openVehicleModalForCreate);

  // Tutup modal
  DOM.closeAddVehicleModal?.addEventListener("click", closeVehicleModal);

  // Klik backdrop → tutup modal
  DOM.addVehicleModal?.addEventListener("click", (e) => {
    if (e.target === DOM.addVehicleModal) closeVehicleModal();
  });

  // Realtime search vehicle
  DOM.vehicleSearch?.addEventListener("input", (e) => {
    vehicleSearchQuery = e.target.value;
    renderVehicleTable();
  });

  // Submit form → CREATE atau UPDATE berdasarkan selectedVehicleId
  DOM.addVehicleForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!supabaseClient) {
      showToast("delay", "Error", "Klien database Supabase belum terinisialisasi.");
      return;
    }

    const getVal = (id) => document.getElementById(id)?.value?.trim() ?? "";

    const vehicleCode = getVal("vehicle-code");
    const driverName = getVal("vehicle-driver-name");
    const licensePlate = getVal("vehicle-license-plate");
    const vehicleType = getVal("vehicle-type");
    const vehicleStatus = getVal("vehicle-status");
    const vehicleRoute = getVal("vehicle-route");
    const vehicleActivity = getVal("vehicle-last-activity");

    const payload = {
      vehicle_code: vehicleCode,
      driver_name: driverName,
      license_plate: licensePlate,
      vehicle_type: vehicleType,
      status: vehicleStatus,
      route: vehicleRoute,
      last_activity: vehicleActivity,
    };

    try {
      let error;

      if (selectedVehicleId) {
        // UPDATE
        const result = await supabaseClient
          .from("vehicles")
          .update(payload)
          .eq("id", selectedVehicleId);
        error = result.error;
      } else {
        // INSERT
        const result = await supabaseClient
          .from("vehicles")
          .insert([payload]);
        error = result.error;
      }

      if (error) throw error;

      showToast(
        "success",
        selectedVehicleId ? "Vehicle Updated" : "Vehicle Added",
        selectedVehicleId ? "Vehicle berhasil diupdate." : "Vehicle berhasil ditambahkan."
      );

      closeVehicleModal();
      await loadVehiclesData();
    } catch (err) {
      console.error("[vehicleFormSubmit]", err);
      showToast("delay", "Operation Failed", err.message);
    }
  });

  // DELETE vehicle
  DOM.deleteVehicleBtn?.addEventListener("click", async () => {
    if (!selectedVehicleId) {
      showToast("delay", "Delete Failed", "Vehicle tidak ditemukan.");
      return;
    }

    const confirmDelete = confirm("Yakin ingin menghapus vehicle ini?");
    if (!confirmDelete) return;

    try {
      const { error } = await supabaseClient
        .from("vehicles")
        .delete()
        .eq("id", selectedVehicleId);

      if (error) throw error;

      showToast("success", "Vehicle Deleted", "Vehicle berhasil dihapus.");
      closeVehicleModal();
      await loadVehiclesData();
    } catch (err) {
      console.error("[deleteVehicle]", err);
      showToast("delay", "Delete Failed", err.message);
    }
  });
}

/* ==========================================================================
   Driver Management — Badge Status
   ========================================================================== */
function getDriverBadge(status) {
  const map = {
    Active: "badge--loading",
    "Off Duty": "badge--transit",
    Sick: "badge--delayed",
    Leave: "badge--delayed",
  };
  return map[status] || "badge--transit";
}

/* ==========================================================================
   Driver Management — Load & Render Table (READ)
   ========================================================================== */
async function loadDriversData() {
  if (!supabaseClient) return;

  try {
    const { data, error } = await supabaseClient
      .from("drivers")
      .select("*")
      .order("id", { ascending: true });

    if (error) throw error;

    driversList = data || [];
    renderDriverTable();
  } catch (err) {
    console.error("[loadDriversData]", err);
    showToast("delay", "Driver Error", err.message);
  }
}

function getFilteredDrivers() {
  const q = driverSearchQuery.trim().toLowerCase();
  if (!q) return driversList;
  return driversList.filter((d) =>
    [
      d.driver_code,
      d.full_name,
      d.license_type,
      d.phone_number,
      d.shift_schedule,
      d.assigned_vehicle,
      d.status,
    ]
      .join(" ")
      .toLowerCase()
      .includes(q)
  );
}

function renderDriverTable() {
  if (!DOM.driverTableBody) return;

  const rows = getFilteredDrivers();

  if (rows.length === 0) {
    DOM.driverTableBody.innerHTML = `
      <tr>
        <td colspan="9" class="table-empty">Tidak ada data driver untuk ditampilkan.</td>
      </tr>
    `;
  } else {
    DOM.driverTableBody.innerHTML = rows
      .map(
        (d) => `
        <tr data-driver-id="${escapeHtml(d.id)}" tabindex="0" style="cursor:pointer;">
          <td>${escapeHtml(d.driver_code)}</td>
          <td>${escapeHtml(d.full_name)}</td>
          <td>${escapeHtml(d.age)}</td>
          <td>${escapeHtml(d.license_type)}</td>
          <td>${escapeHtml(d.phone_number)}</td>
          <td>${escapeHtml(d.shift_schedule)}</td>
          <td>${escapeHtml(d.assigned_vehicle)}</td>
          <td><span class="badge ${getDriverBadge(d.status)}">${escapeHtml(d.status)}</span></td>
          <td>${escapeHtml(d.performance_score)}</td>
        </tr>
      `
      )
      .join("");
  }

  if (DOM.driverRecordCount) {
    DOM.driverRecordCount.textContent = `${driversList.length} drivers`;
  }

  // Event listener klik baris → buka modal edit
  DOM.driverTableBody.querySelectorAll("tr[data-driver-id]").forEach((tr) => {
    tr.addEventListener("click", () => {
      const did = tr.dataset.driverId;
      const driver = driversList.find((d) => String(d.id) === String(did));
      if (!driver) return;
      openDriverModalForEdit(driver);
    });
    tr.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        tr.click();
      }
    });
  });
}

/* ==========================================================================
   Driver Management — Modal Helpers
   ========================================================================== */
function openDriverModal() {
  if (!DOM.addDriverModal) return;
  DOM.addDriverModal.classList.add("is-open");
  DOM.addDriverModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeDriverModal() {
  if (!DOM.addDriverModal) return;
  DOM.addDriverModal.classList.remove("is-open");
  DOM.addDriverModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  DOM.addDriverForm?.reset();
  selectedDriverId = null;

  if (DOM.deleteDriverBtn) DOM.deleteDriverBtn.style.display = "none";
}

/**
 * Buka modal driver dalam mode EDIT.
 * @param {object} driver - Baris data driver dari Supabase
 */
function openDriverModalForEdit(driver) {
  selectedDriverId = driver.id;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val ?? "";
  };

  setVal("driver-code", driver.driver_code);
  setVal("driver-full-name", driver.full_name);
  setVal("driver-age", driver.age);
  setVal("driver-license-type", driver.license_type);
  setVal("driver-phone-number", driver.phone_number);
  setVal("driver-shift-schedule", driver.shift_schedule);
  setVal("driver-assigned-vehicle", driver.assigned_vehicle);
  setVal("driver-status", driver.status);
  setVal("driver-performance-score", driver.performance_score);

  if (DOM.deleteDriverBtn) DOM.deleteDriverBtn.style.display = "";

  openDriverModal();
}

/**
 * Buka modal driver dalam mode CREATE.
 */
function openDriverModalForCreate() {
  selectedDriverId = null;
  DOM.addDriverForm?.reset();

  if (DOM.deleteDriverBtn) DOM.deleteDriverBtn.style.display = "none";

  openDriverModal();
}

/* ==========================================================================
   Driver Management — CRUD Full (CREATE / UPDATE / DELETE)
   ========================================================================== */
function initDriverManagement() {
  // Buka modal CREATE
  DOM.btnAddDriver?.addEventListener("click", openDriverModalForCreate);

  // Tutup modal
  DOM.closeAddDriverModal?.addEventListener("click", closeDriverModal);

  // Klik backdrop → tutup modal
  DOM.addDriverModal?.addEventListener("click", (e) => {
    if (e.target === DOM.addDriverModal) closeDriverModal();
  });

  // Realtime search driver
  DOM.driverSearch?.addEventListener("input", (e) => {
    driverSearchQuery = e.target.value;
    renderDriverTable();
  });

  // Submit form → CREATE atau UPDATE berdasarkan selectedDriverId
  DOM.addDriverForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!supabaseClient) {
      showToast("delay", "Error", "Klien database Supabase belum terinisialisasi.");
      return;
    }

    const getVal = (id) => document.getElementById(id)?.value?.trim() ?? "";

    const payload = {
      driver_code: getVal("driver-code"),
      full_name: getVal("driver-full-name"),
      age: getVal("driver-age"),
      license_type: getVal("driver-license-type"),
      phone_number: getVal("driver-phone-number"),
      shift_schedule: getVal("driver-shift-schedule"),
      assigned_vehicle: getVal("driver-assigned-vehicle"),
      status: getVal("driver-status"),
      performance_score: getVal("driver-performance-score"),
    };

    try {
      let error;

      if (selectedDriverId) {
        // UPDATE
        const result = await supabaseClient
          .from("drivers")
          .update(payload)
          .eq("id", selectedDriverId);
        error = result.error;
      } else {
        // INSERT
        const result = await supabaseClient
          .from("drivers")
          .insert([payload]);
        error = result.error;
      }

      if (error) throw error;

      showToast(
        "success",
        selectedDriverId ? "Driver Updated" : "Driver Added",
        selectedDriverId ? "Driver berhasil diupdate." : "Driver berhasil ditambahkan."
      );

      closeDriverModal();
      await loadDriversData();
    } catch (err) {
      console.error("[driverFormSubmit]", err);
      showToast("delay", "Operation Failed", err.message);
    }
  });

  // DELETE driver
  DOM.deleteDriverBtn?.addEventListener("click", async () => {
    if (!selectedDriverId) {
      showToast("delay", "Delete Failed", "Driver tidak ditemukan.");
      return;
    }

    const confirmDelete = confirm("Yakin ingin menghapus driver ini?");
    if (!confirmDelete) return;

    try {
      const { error } = await supabaseClient
        .from("drivers")
        .delete()
        .eq("id", selectedDriverId);

      if (error) throw error;

      showToast("success", "Driver Deleted", "Driver berhasil dihapus.");
      closeDriverModal();
      await loadDriversData();
    } catch (err) {
      console.error("[deleteDriver]", err);
      showToast("delay", "Delete Failed", err.message);
    }
  });
}

/* ==========================================================================
   Chart.js — helper gradient & opsi dasar
   ========================================================================== */
function makeGradient(ctx, c1, c2, h = 260) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  return g;
}

function baseChartOptions(extra = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 1400, easing: "easeOutCubic" },
    plugins: {
      legend: {
        labels: {
          color: CHART.textLight,
          font: { family: "Inter", size: 11 },
          usePointStyle: true,
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: "rgba(22, 50, 79, 0.95)",
        titleColor: CHART.textLight,
        bodyColor: CHART.text,
        borderColor: "rgba(60, 242, 255, 0.35)",
        borderWidth: 1,
        padding: 14,
        animation: { duration: 200 },
        displayColors: true,
      },
    },
    scales: {
      x: {
        grid: { color: CHART.grid },
        ticks: { color: CHART.text, font: { family: "Inter", size: 10 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: CHART.grid },
        ticks: { color: CHART.text, font: { family: "Inter", size: 10 } },
      },
    },
    ...extra,
  };
}

/* ==========================================================================
   Render semua grafik analitik (5 chart)
   ========================================================================== */
function initCharts() {
  if (!DOM.charts.shipment) return;

  const ctxS = DOM.charts.shipment.getContext("2d");
  const gIn = makeGradient(ctxS, "rgba(60,242,255,0.4)", "rgba(60,242,255,0.02)");
  const gOut = makeGradient(ctxS, "rgba(77,168,255,0.35)", "rgba(77,168,255,0.02)");

  chartInstances.push(
    new Chart(ctxS, {
      type: "line",
      data: {
        labels: SHIPMENT_TREND.labels,
        datasets: [
          {
            label: "Inbound",
            data: SHIPMENT_TREND.inbound,
            borderColor: CHART.cyan,
            backgroundColor: gIn,
            fill: true,
            tension: 0.42,
            borderWidth: 2.5,
            pointRadius: 4,
            pointHoverRadius: 8,
            pointBackgroundColor: CHART.cyan,
            pointBorderColor: "#07111F",
            pointBorderWidth: 2,
          },
          {
            label: "Outbound",
            data: SHIPMENT_TREND.outbound,
            borderColor: CHART.blue,
            backgroundColor: gOut,
            fill: true,
            tension: 0.42,
            borderWidth: 2.5,
            pointRadius: 4,
            pointHoverRadius: 8,
            pointBackgroundColor: CHART.blue,
          },
        ],
      },
      options: { ...baseChartOptions(), interaction: { mode: "index", intersect: false } },
    })
  );

  const ctxT = DOM.charts.throughput.getContext("2d");
  chartInstances.push(
    new Chart(ctxT, {
      type: "bar",
      data: {
        labels: DAILY_THROUGHPUT.labels,
        datasets: [
          {
            label: "TEU",
            data: DAILY_THROUGHPUT.values,
            backgroundColor: (c) => {
              const g = c.chart.ctx.createLinearGradient(0, 0, 0, 220);
              g.addColorStop(0, "rgba(60, 242, 255, 0.85)");
              g.addColorStop(1, "rgba(77, 168, 255, 0.35)");
              return g;
            },
            borderRadius: 8,
            borderSkipped: false,
          },
        ],
      },
      options: {
        ...baseChartOptions(),
        plugins: { ...baseChartOptions().plugins, legend: { display: false } },
      },
    })
  );

  chartInstances.push(
    new Chart(DOM.charts.delay.getContext("2d"), {
      type: "line",
      data: {
        labels: DELAY_STATS.labels,
        datasets: [
          {
            label: "Delays",
            data: DELAY_STATS.values,
            borderColor: CHART.red,
            backgroundColor: "rgba(255, 93, 115, 0.15)",
            fill: true,
            tension: 0.35,
            pointBackgroundColor: CHART.red,
            pointRadius: 4,
          },
        ],
      },
      options: {
        ...baseChartOptions(),
        plugins: { ...baseChartOptions().plugins, legend: { display: false } },
      },
    })
  );

  chartInstances.push(
    new Chart(DOM.charts.vehicle.getContext("2d"), {
      type: "bar",
      data: {
        labels: VEHICLE_ACTIVITY.labels,
        datasets: [
          {
            label: "Active",
            data: VEHICLE_ACTIVITY.active,
            backgroundColor: "rgba(74, 222, 128, 0.75)",
            borderRadius: 4,
          },
          {
            label: "Idle",
            data: VEHICLE_ACTIVITY.idle,
            backgroundColor: "rgba(148, 163, 184, 0.4)",
            borderRadius: 4,
          },
        ],
      },
      options: {
        ...baseChartOptions(),
        scales: {
          ...baseChartOptions().scales,
          x: { ...baseChartOptions().scales.x, stacked: true },
          y: { ...baseChartOptions().scales.y, stacked: true },
        },
      },
    })
  );

  const ctxE = DOM.charts.efficiency.getContext("2d");
  chartInstances.push(
    new Chart(ctxE, {
      type: "line",
      data: {
        labels: EFFICIENCY_TREND.labels,
        datasets: [
          {
            label: "Efficiency %",
            data: EFFICIENCY_TREND.values,
            borderColor: CHART.emerald,
            backgroundColor: makeGradient(ctxE, "rgba(74,222,128,0.35)", "rgba(74,222,128,0.02)"),
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointHoverRadius: 9,
          },
        ],
      },
      options: {
        ...baseChartOptions(),
        plugins: { ...baseChartOptions().plugins, legend: { display: false } },
        scales: {
          ...baseChartOptions().scales,
          y: { ...baseChartOptions().scales.y, min: 80, max: 100 },
        },
      },
    })
  );
}

function simulateChartLiveUpdate() {
  const chart = chartInstances[1];
  if (!chart) return;
  const ds = chart.data.datasets[0];
  const idx = Math.floor(Math.random() * ds.data.length);
  ds.data[idx] = Math.max(400, ds.data[idx] + Math.floor(Math.random() * 80 - 40));
  chart.update("active");
}

/* ==========================================================================
   Smart Port Map — rute, zona, tooltip, simulasi kepadatan
   ========================================================================== */
function densityToLevel(d) {
  if (d < 50) return "low";
  if (d < 75) return "medium";
  return "high";
}

function renderMapRoutes() {
  if (!DOM.mapRoutes) return;
  DOM.mapRoutes.innerHTML = MAP_ROUTES.map((r) => {
    const [x1, y1] = r.from;
    const [x2, y2] = r.to;
    const cls = r.active ? "map-route map-route--active" : "map-route";
    return `<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="url(#routeGrad)" stroke-width="0.6"/>`;
  }).join("");

  const active = MAP_ROUTES.filter((r) => r.active).length;
  if (DOM.mapActiveRoutes) DOM.mapActiveRoutes.textContent = `${active} active routes`;
}

function renderPortMap(zones = PORT_ZONES) {
  if (!DOM.mapZones) return;
  DOM.mapZones.innerHTML = zones
    .map((z) => {
      const level = z.level || densityToLevel(z.density);
      return `
        <g class="map-zone map-zone--${level}" data-id="${z.id}"
           data-name="${z.name}" data-dock="${z.dock}" data-density="${z.density}" data-ships="${z.ships}"
           transform="translate(${z.x}, ${z.y})">
          <circle class="zone-halo" r="6" fill="none" stroke-width="0.5" opacity="0.5"/>
          <circle class="zone-core" r="2.8"/>
        </g>
      `;
    })
    .join("");

  DOM.mapZones.querySelectorAll(".map-zone").forEach((g) => {
    g.addEventListener("mouseenter", (e) => showMapTooltip(e, g));
    g.addEventListener("mousemove", positionMapTooltip);
    g.addEventListener("mouseleave", () => {
      if (DOM.mapTooltip) DOM.mapTooltip.hidden = true;
    });
  });
}

function showMapTooltip(e, g) {
  if (!DOM.mapTooltip) return;
  DOM.mapTooltip.hidden = false;
  DOM.mapTooltip.innerHTML = `
    <strong>${g.dataset.name}</strong>
    Dock: ${g.dataset.dock}<br/>
    Density: <b>${g.dataset.density}%</b> · Ships: ${g.dataset.ships}
  `;
  positionMapTooltip(e);
}

function positionMapTooltip(e) {
  if (!DOM.mapTooltip || !DOM.mapContainer) return;
  const rect = DOM.mapContainer.getBoundingClientRect();
  DOM.mapTooltip.style.left = `${e.clientX - rect.left}px`;
  DOM.mapTooltip.style.top = `${e.clientY - rect.top}px`;
}

function simulatePortCongestion() {
  PORT_ZONES.forEach((z) => {
    const delta = Math.floor(Math.random() * 17) - 8;
    z.density = Math.max(12, Math.min(98, z.density + delta));
    z.level = densityToLevel(z.density);
  });
  renderPortMap();

  const critical = PORT_ZONES.filter((z) => z.level === "high");
  if (critical.length && Math.random() > 0.65) {
    const z = critical[Math.floor(Math.random() * critical.length)];
    showToast("congestion", "Congestion Detected", `${z.name}: density ${z.density}%`);
    prependFeedItem({
      time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      type: "congestion",
      text: `Congestion detected at ${z.name.split("—")[0]?.trim() || z.name}`,
    });
  }
}

function initPortMap() {
  renderMapRoutes();
  renderPortMap();
  mapInterval = setInterval(simulatePortCongestion, 5000);
}

/* ==========================================================================
   Toast notifications
   ========================================================================== */
function showToast(type, title, message) {
  if (!DOM.toastContainer) return;
  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `<p class="toast__title">${title}</p><p class="toast__msg">${message}</p>`;
  DOM.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("is-leaving");
    setTimeout(() => toast.remove(), 350);
  }, 5500);
}

function initSmartAlerts() {
  setTimeout(() => {
    showToast("info", "NexPort Nexus Online", "Command center · Tanjung Priok — all systems operational.");
  }, 1700);

  alertInterval = setInterval(() => {
    if (Math.random() > 0.5) return;
    const a = ALERT_MESSAGES[Math.floor(Math.random() * ALERT_MESSAGES.length)];
    showToast(a.type, a.title, a.message);
  }, 14000);
}

/* ==========================================================================
   FAB — quick actions
   ========================================================================== */
function initFAB() {
  DOM.fabMain?.addEventListener("click", () => {
    DOM.fabGroup?.classList.toggle("is-open");
    DOM.fabMain.setAttribute("aria-expanded", DOM.fabGroup?.classList.contains("is-open"));
  });

  DOM.fabAlert?.addEventListener("click", () => {
    const a = ALERT_MESSAGES[Math.floor(Math.random() * ALERT_MESSAGES.length)];
    showToast(a.type, a.title, a.message);
    DOM.fabGroup?.classList.remove("is-open");
  });

  DOM.fabRefresh?.addEventListener("click", async () => {
    await Promise.all([
      loadContainersData(),
      loadVehiclesData(),
      loadDriversData(),
    ]);
    renderKPIs();
    simulateChartLiveUpdate();
    showToast("success", "Data Refreshed", "Container, vehicle & driver registry synchronized with Supabase.");
    DOM.fabGroup?.classList.remove("is-open");
  });
}

/* ==========================================================================
   Inisialisasi UI statis (tanpa data tabel)
   ========================================================================== */
function initStaticUI() {
  initBrandMeta();
  initSidebar();
  initClock();
  renderKPIs();
  renderAIInsights();
  renderActivityFeed();
  initSearch();
  initModal();
  initCharts();
  initPortMap();
  initSmartAlerts();
  initFAB();
  initAddContainerModal();
  initContainerCRUD();
  initVehicleManagement();
  initDriverManagement();

  feedInterval = setInterval(simulateFeedUpdate, 8000);
  kpiInterval = setInterval(simulateKPIPulse, 15000);
  setInterval(simulateChartLiveUpdate, 12000);
}

/* ==========================================================================
   Bootstrap — entry point aplikasi
   ========================================================================== */
async function bootstrap() {
  const startedAt = Date.now();

  try {
    supabaseClient = initSupabaseClient();

    initStaticUI();

    await Promise.all([
      loadContainersData(),
      loadVehiclesData(),
      loadDriversData(),
    ]);

    if (supabaseClient) {
      // Realtime listener — containers
      supabaseClient
        .channel("realtime-containers")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "containers" },
          async () => {
            await loadContainersData();
          }
        )
        .subscribe();

      // Realtime listener — vehicles
      supabaseClient
        .channel("realtime-vehicles")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "vehicles" },
          async () => {
            await loadVehiclesData();
          }
        )
        .subscribe();

      // Realtime listener — drivers
      supabaseClient
        .channel("realtime-drivers")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "drivers" },
          async () => {
            await loadDriversData();
          }
        )
        .subscribe();
    }
  } catch (err) {
    console.error("[bootstrap - Fatal Error]", err);

    containersList = [...CONTAINERS];
    try {
      renderTable();
    } catch (e) {
      console.error("Gagal merender tabel darurat:", e);
    }

    showToast("delay", "Initialization Error", err.message || "Terjadi kesalahan sistem saat memuat data.");
  } finally {
    await waitMinLoader(startedAt);
    hideSkeletonLoader();
  }
}

/* ==========================================================================
   Entry Point
   ========================================================================== */
document.addEventListener("DOMContentLoaded", bootstrap);
