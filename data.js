/**
 * data.js — NexPort Nexus Control Center
 * Port Tanjung Priok — sumber data terpusat
 */

const BRAND = {
  name: "NexPort Nexus",
  tagline: "Smart Port · Tanjung Priok",
  version: "v3.2 Nexus",
};

/** Metrik KPI — 6 kartu overview */
const METRICS = {
  activeContainers: {
    label: "Active Containers",
    value: 3248,
    delta: "+8.4% minggu ini",
    trend: "up",
    accent: "cyan",
    pulse: true,
  },
  delayed: {
    label: "Delayed Shipments",
    value: 31,
    delta: "3 prioritas kritis",
    trend: "alert",
    accent: "red",
    pulse: true,
  },
  shipsToday: {
    label: "Ships Today",
    value: 18,
    delta: "6 sandar · 12 berangkat",
    trend: "up",
    accent: "blue",
  },
  portActivity: {
    label: "Port Activity",
    value: "92%",
    delta: "Puncak 14:00–18:00 WIB",
    trend: "neutral",
    accent: "emerald",
    pulse: true,
  },
  throughput: {
    label: "Throughput",
    value: "1.24K",
    delta: "TEU/hari rata-rata",
    trend: "up",
    accent: "cyan",
  },
  efficiency: {
    label: "Operational Efficiency",
    value: "94.2%",
    delta: "+1.1% vs target KPI",
    trend: "up",
    accent: "emerald",
    pulse: true,
  },
};

const SHIPMENT_TREND = {
  labels: ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"],
  inbound: [520, 610, 580, 720, 690, 420, 350],
  outbound: [480, 560, 620, 680, 710, 450, 380],
};

const DAILY_THROUGHPUT = {
  labels: ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"],
  values: [920, 1080, 1150, 1280, 1210, 780, 590],
};

const DELAY_STATS = {
  labels: ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"],
  values: [12, 18, 14, 22, 19, 8, 6],
};

const VEHICLE_ACTIVITY = {
  labels: ["06", "09", "12", "15", "18", "21", "00"],
  active: [45, 78, 112, 134, 98, 62, 28],
  idle: [20, 15, 8, 12, 18, 25, 35],
};

const EFFICIENCY_TREND = {
  labels: ["W1", "W2", "W3", "W4", "W5", "W6"],
  values: [88, 90, 91, 93, 94.2, 95],
};

const CONTAINERS = [
  { id: "TPK-8842-A", cargoType: "Electronics", weight: "18.5 ton", destination: "Singapore", eta: "24 Mei 2026, 14:30", status: "Loading", truckId: "TRK-1024", licensePlate: "B 7824 TPK", driverName: "Budi Santoso", route: "Terminal 1 → Gate A → Tol Dalam Kota" },
  { id: "TPK-7721-B", cargoType: "Textiles", weight: "22.0 ton", destination: "Rotterdam", eta: "26 Mei 2026, 09:15", status: "Transit", truckId: "TRK-2088", licensePlate: "B 4512 TPK", driverName: "Andi Wijaya", route: "Terminal 2 → Yard B → Pelabuhan Utama" },
  { id: "TPK-9103-C", cargoType: "Machinery", weight: "31.2 ton", destination: "Hamburg", eta: "28 Mei 2026, 18:00", status: "Delayed", truckId: "TRK-3156", licensePlate: "B 9033 TPK", driverName: "Rudi Hartono", route: "Terminal 3 → Customs → Delay Lane" },
  { id: "TPK-4456-D", cargoType: "Chemicals", weight: "15.8 ton", destination: "Dubai", eta: "25 Mei 2026, 11:45", status: "Transit", truckId: "TRK-4412", licensePlate: "B 2218 TPK", driverName: "Eko Prasetyo", route: "Terminal 1 → Hazard Zone → Gate C" },
  { id: "TPK-3312-E", cargoType: "Consumer Goods", weight: "12.4 ton", destination: "Shanghai", eta: "24 Mei 2026, 16:00", status: "Loading", truckId: "TRK-5501", licensePlate: "B 6671 TPK", driverName: "Hendra Gunawan", route: "Terminal 2 → Loading Bay 4" },
  { id: "TPK-6678-F", cargoType: "Automotive Parts", weight: "26.7 ton", destination: "Barcelona", eta: "27 Mei 2026, 22:30", status: "Delayed", truckId: "TRK-6789", licensePlate: "B 3345 TPK", driverName: "Joko Susilo", route: "Terminal 3 → Inspection → Hold" },
  { id: "TPK-2290-G", cargoType: "Food Products", weight: "9.6 ton", destination: "Los Angeles", eta: "29 Mei 2026, 07:20", status: "Transit", truckId: "TRK-7720", licensePlate: "B 8890 TPK", driverName: "Agus Setiawan", route: "Cold Storage → Terminal 1 → Gate B" },
  { id: "TPK-5589-H", cargoType: "Steel Coils", weight: "28.3 ton", destination: "Oslo", eta: "24 Mei 2026, 20:10", status: "Loading", truckId: "TRK-8812", licensePlate: "B 1123 TPK", driverName: "Dedi Kurniawan", route: "Yard C → Terminal 2 → Berth 7" },
  { id: "TPK-1190-I", cargoType: "Pharmaceuticals", weight: "6.2 ton", destination: "Tokyo", eta: "25 Mei 2026, 06:00", status: "Transit", truckId: "TRK-9901", licensePlate: "B 5567 TPK", driverName: "Fajar Nugroho", route: "Secure Zone → Terminal 1 → Gate D" },
  { id: "TPK-7744-J", cargoType: "Furniture", weight: "14.1 ton", destination: "Melbourne", eta: "26 Mei 2026, 13:45", status: "Delayed", truckId: "TRK-1045", licensePlate: "B 4456 TPK", driverName: "Iwan Permana", route: "Terminal 2 → Queue → Berth 3" },
];

/** Zona peta — dock info untuk tooltip */
const PORT_ZONES = [
  { id: "z1", name: "Terminal 1 — Kalibaru", dock: "Dock A1–A4", x: 16, y: 30, density: 42, level: "low", ships: 3 },
  { id: "z2", name: "Terminal 2 — Koja", dock: "Dock B1–B6", x: 40, y: 24, density: 71, level: "medium", ships: 5 },
  { id: "z3", name: "Terminal 3 — Priok", dock: "Dock C1–C8", x: 66, y: 28, density: 89, level: "high", ships: 7 },
  { id: "z4", name: "IPC Container Yard", dock: "Yard IPC-1", x: 32, y: 50, density: 58, level: "medium", ships: 0 },
  { id: "z5", name: "Gate A — Utara", dock: "Gate Access", x: 10, y: 56, density: 35, level: "low", ships: 0 },
  { id: "z6", name: "Gate B — Timur", dock: "Gate Access", x: 80, y: 52, density: 93, level: "high", ships: 0 },
  { id: "z7", name: "Customs & Inspection", dock: "Inspection Bay", x: 52, y: 66, density: 52, level: "medium", ships: 2 },
  { id: "z8", name: "Berth 5–7", dock: "Deep Water Berth", x: 84, y: 36, density: 74, level: "medium", ships: 4 },
];

/** Rute animasi di peta (koordinat SVG) */
const MAP_ROUTES = [
  { id: "r1", from: [16, 30], to: [40, 24], active: true },
  { id: "r2", from: [40, 24], to: [66, 28], active: true },
  { id: "r3", from: [32, 50], to: [52, 66], active: false },
  { id: "r4", from: [66, 28], to: [84, 36], active: true },
];

/** Insight AI operasional */
const AI_INSIGHTS = [
  { type: "warning", icon: "⚡", text: "Prediksi kepadatan di Dock 4 dalam 2 jam — rekomendasikan alih truk ke Gate A.", confidence: 87 },
  { type: "success", icon: "↗", text: "Throughput operasional meningkat 12% dibanding minggu lalu.", confidence: 94 },
  { type: "critical", icon: "!", text: "3 kontainer tertunda memerlukan penanganan prioritas di Terminal 3.", confidence: 91 },
  { type: "info", icon: "◉", text: "Efisiensi bongkar-muat Terminal 2 optimal — pertahankan shift saat ini.", confidence: 78 },
];

/** Feed aktivitas live */
const ACTIVITY_FEED = [
  { time: "14:32", type: "congestion", text: "Congestion detected at Terminal 3" },
  { time: "14:28", type: "delay", text: "Shipment delay warning — TPK-9103-C" },
  { time: "14:21", type: "success", text: "Dock loading completed — Berth 7" },
  { time: "14:15", type: "info", text: "MV Pacific Star berthed at Dock C2" },
  { time: "14:08", type: "success", text: "Gate A throughput normalized — 62%" },
  { time: "14:02", type: "warning", text: "Vehicle queue building at Customs zone" },
];

const ALERT_MESSAGES = [
  { type: "congestion", title: "Congestion Alert", message: "Terminal 3 — Priok mencapai ambang kritis (89%)." },
  { type: "delay", title: "Shipment Delay", message: "TPK-9103-C — estimasi keterlambatan +6 jam." },
  { type: "success", title: "Dock Complete", message: "Loading selesai di Berth 7 — TPK-5589-H." },
  { type: "congestion", title: "Gate Congestion", message: "Gate B — Timur: density 93%. Rute alternatif aktif." },
  { type: "info", title: "NexPort Online", message: "Semua sensor & AI engine terhubung." },
];

const LIVE_FEED_TEMPLATES = [
  { type: "congestion", text: "Congestion detected at {zone}" },
  { type: "delay", text: "Shipment delay warning — {id}" },
  { type: "success", text: "Dock loading completed — {dock}" },
  { type: "info", text: "Route optimization applied — {route}" },
];
