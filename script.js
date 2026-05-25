/**
 * script.js — NexPort Nexus Control Center
 * Logika UI utama · komentar Bahasa Indonesia
 */

/* ==========================================================================
   Supabase — client (URL project, BUKAN /rest/v1/)
   ========================================================================== */
const SUPABASE_URL = "https://tolfokluxlhynudrxdta.supabase.co";
const SUPABASE_KEY = "sb_publishable_IKTkm1ZGmnvNKo8pG_sfBA_6FVZ5tTH";

// PERBAIKAN 1: Mengubah nama variabel agar tidak bentrok dengan global object dari CDN
/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let supabaseClient = null;

function initSupabaseClient() {
  // window.supabase tetap digunakan karena ini object bawaan dari CDN index.html
  if (!window.supabase?.createClient) {
    console.error("[Supabase] SDK belum dimuat. Pastikan script @supabase/supabase-js di-load sebelum script.js");
    return null;
  }
  return window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

/* ==========================================================================
   Data kontainer — dari Supabase (utama) atau fallback data.js
   ========================================================================== */
/** @type {Array<object>} */
let containersList = [];

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
  // FITUR BARU: Referensi DOM untuk Modal Add New Container
  addModalOverlay: document.getElementById("add-container-modal"),
  closeAddModal: document.getElementById("close-add-modal"),
  btnAddContainer: document.getElementById("btn-add-container"),
  addContainerForm: document.getElementById("add-container-form")
};

let searchQuery = "";
let selectedContainer = null;
let selectedContainerId = null; // Menambahkan deklarasi eksplisit untuk tracking ID kontainer aktif
let chartInstances = [];
let mapInterval = null;
let alertInterval = null;
let feedInterval = null;
let kpiInterval = null;

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
   Skeleton loader — tampilkan / sembunyikan (selalu hide di finally)
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
    DOM.datetime.textContent = format(now);
    DOM.datetime.setAttribute("datetime", now.toISOString());
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
  DOM.kpiGrid.innerHTML = Object.entries(METRICS)
    .map(([, m]) => {
      const val =
        typeof m.value === "number" ? m.value.toLocaleString("id-ID") : m.value;
      const pulse = m.pulse ? " kpi-card--pulse" : "";
      const deltaClass =
        m.trend === "alert" ? "kpi-card__delta--alert" : m.trend === "up" ? "kpi-card__delta--up" : "";
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
    .replace("{route}", container.route.split("→")[0]?.trim() || "Route A");

  prependFeedItem({ time, type: tpl.type, text });
}

/* ==========================================================================
   Badge status kontainer
   ========================================================================== */
function getBadgeClass(status) {
  return (
    { Loading: "badge--loading", Transit: "badge--transit", Delayed: "badge--delayed" }[
    status
    ] || "badge--transit"
  );
}

/* ==========================================================================
   Supabase — normalisasi baris DB (snake_case) ke format UI
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

    if (error) {
      throw error;
    }

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

/** Muat data + render tabel (dipanggil saat init & refresh) */
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
        <td colspan="9" class="table-empty">Tidak ada data kontainer untuk ditampilkan.</td>
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
   Modal detail shipment
   ========================================================================== */
function openModal(item) {
  selectedContainerId = item.id;
  DOM.modalTitle.textContent = item.containerId;
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
    if (e.key === "Escape") closeModal();
  });
}

/* ==========================================================================
   FITUR BARU: Modal Add New Container (CRUD System - Create)
   ========================================================================== */
function initAddContainerModal() {
  DOM.btnAddContainer?.addEventListener("click", () => {
    if (DOM.addModalOverlay) {
      DOM.addModalOverlay.classList.add("is-open");
      DOM.addModalOverlay.setAttribute("aria-hidden", "false");
    }
  });

  const closeAddModalFunc = () => {
    if (DOM.addModalOverlay) {
      DOM.addModalOverlay.classList.remove("is-open");
      DOM.addModalOverlay.setAttribute("aria-hidden", "true");
    }
    DOM.addContainerForm?.reset();
  };

  DOM.closeAddModal?.addEventListener("click", closeAddModalFunc);

  DOM.addModalOverlay?.addEventListener("click", (e) => {
    if (e.target === DOM.addModalOverlay) {
      closeAddModalFunc();
    }
  });

  DOM.addContainerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!supabaseClient) {
      showToast("delay", "Insert Failed", "Klien database Supabase belum terinisialisasi.");
      return;
    }

    const containerIdVal = document.getElementById("container-id")?.value;
    const cargoTypeVal = document.getElementById("cargo-type")?.value;
    const weightVal = document.getElementById("weight")?.value;
    const destinationVal = document.getElementById("destination")?.value;
    const driverNameVal = document.getElementById("driver-name")?.value;
    const licensePlateVal = document.getElementById("license-plate")?.value;
    const routeVal = document.getElementById("route")?.value;

    const defaultStatus = "Transit";
    const autoEta = new Date().toISOString();
    const randomTruckId = `TRK-${Math.floor(100 + Math.random() * 900)}`;

    try {
      const { data, error } = await supabaseClient
        .from("containers")
        .insert([
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
            truck_id: randomTruckId
          }
        ]);

      if (error) throw error;

      showToast("success", "Container Added", "New container berhasil ditambahkan.");
      closeAddModalFunc();
      await loadContainersData();

    } catch (error) {
      console.error(error);
      showToast("delay", "Insert Failed", error.message);
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
   ========================================================================= */
function densityToLevel(d) {
  if (d < 50) return "low";
  if (d < 75) return "medium";
  return "high";
}

function renderMapRoutes() {
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
      DOM.mapTooltip.hidden = true;
    });
  });
}

function showMapTooltip(e, g) {
  DOM.mapTooltip.hidden = false;
  DOM.mapTooltip.innerHTML = `
    <strong>${g.dataset.name}</strong>
    Dock: ${g.dataset.dock}<br/>
    Density: <b>${g.dataset.density}%</b> · Ships: ${g.dataset.ships}
  `;
  positionMapTooltip(e);
}

function positionMapTooltip(e) {
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
    await loadContainersData();
    renderKPIs();
    simulateChartLiveUpdate();
    showToast("success", "Data Refreshed", "Container registry synchronized with Supabase.");
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

  feedInterval = setInterval(simulateFeedUpdate, 8000);
  kpiInterval = setInterval(simulateKPIPulse, 15000);
  setInterval(simulateChartLiveUpdate, 12000);
}

/* ==========================================================================
   Bootstrap — Perbaikan arsitektur penanganan error loader
   ========================================================================== */
async function bootstrap() {
  const startedAt = Date.now();

  try {
    supabaseClient = initSupabaseClient();

    initStaticUI();

    await loadContainersData();

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
   Event Listeners — Operasi Kontrol CRUD (Update & Delete)
   ========================================================================== */
document
  .getElementById("edit-container-btn")
  ?.addEventListener("click", async () => {
    if (!selectedContainerId) {
      showToast("delay", "Error", "Container tidak ditemukan.");
      return;
    }

    try {
      const { error } = await supabaseClient
        .from("containers")
        .update({
          status: "Delayed"
        })
        .eq("id", selectedContainerId);

      if (error) throw error;

      showToast("success", "Updated", "Status berhasil diubah.");
      closeModal();
      await loadContainersData();

    } catch (err) {
      console.error(err);
      showToast("delay", "Update Failed", err.message);
    }
  });

// STEP 2: Tambahkan Event Delete di script.js di bawah Event Edit Status
document
  .getElementById("delete-container-btn")
  ?.addEventListener("click", async () => {
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
      console.error(err);
      showToast("delay", "Delete Failed", err.message);
    }
  });

document.addEventListener("DOMContentLoaded", bootstrap);