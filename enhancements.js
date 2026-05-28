/**
 * enhancements.js — NexPort Nexus Enhancement Patch v1.0 (Batch 1)
 *
 * MODUL YANG DITAMBAHKAN:
 *   1. Advanced Filter System (container, vehicle, driver)
 *   2. Export CSV (container, vehicle, driver)
 *   3. Form Validation (required, duplicate, invalid)
 *   4. Button Loading State
 *
 * PENTING:
 *   - Tidak mengubah / menghapus fungsi di script.js
 *   - Semua filter memanggil ulang renderTable/renderVehicleTable/renderDriverTable
 *     via fungsi filter global yang di-patch setelah DOMContentLoaded
 *   - Semua validasi di-attach ke form submit SEBELUM insert ke Supabase
 *   - loadednya setelah script.js (urutan di HTML: script.js → enhancements.js)
 */

/* ==========================================================================
   UTIL — helpers internal modul ini
   ========================================================================== */

/** Set tombol ke state loading */
function setButtonLoading(btn, loadingText = "Saving...") {
  if (!btn) return;
  btn._originalText = btn.innerHTML;
  btn._originalDisabled = btn.disabled;
  btn.innerHTML = loadingText;
  btn.disabled = true;
  btn.classList.add("btn-loading");
}

/** Restore tombol dari state loading */
function restoreButton(btn) {
  if (!btn) return;
  btn.innerHTML = btn._originalText ?? btn.innerHTML;
  btn.disabled = btn._originalDisabled ?? false;
  btn.classList.remove("btn-loading");
}

/** Tampilkan pesan error pada field */
function showFieldError(inputEl, message) {
  if (!inputEl) return;
  inputEl.classList.add("field-error");
  const existingMsg = inputEl.parentElement?.querySelector(".field-error-msg");
  if (existingMsg) existingMsg.remove();
  const msg = document.createElement("span");
  msg.className = "field-error-msg";
  msg.textContent = message;
  inputEl.parentElement?.appendChild(msg);
}

/** Hapus pesan error dari field */
function clearFieldError(inputEl) {
  if (!inputEl) return;
  inputEl.classList.remove("field-error");
  inputEl.parentElement?.querySelector(".field-error-msg")?.remove();
}

/** Hapus semua error dari sebuah form */
function clearAllErrors(formEl) {
  if (!formEl) return;
  formEl.querySelectorAll(".field-error").forEach((el) => el.classList.remove("field-error"));
  formEl.querySelectorAll(".field-error-msg").forEach((el) => el.remove());
}

/**
 * Validasi form generic — cek semua field required + custom rules
 * @param {HTMLFormElement} formEl
 * @param {Array<{id: string, label: string, rules?: Array<'required'|'numeric'|'nonempty'>}>} schema
 * @returns {boolean} valid
 */
function validateForm(formEl, schema) {
  clearAllErrors(formEl);
  let valid = true;

  schema.forEach(({ id, label, rules = ["required"] }) => {
    const el = document.getElementById(id);
    if (!el) return;
    const val = el.value?.trim() ?? "";

    if (rules.includes("required") && val === "") {
      showFieldError(el, `${label} wajib diisi.`);
      valid = false;
      return;
    }

    if (rules.includes("numeric") && val !== "" && isNaN(parseFloat(val))) {
      showFieldError(el, `${label} harus berupa angka.`);
      valid = false;
      return;
    }

    if (rules.includes("nonempty") && val.length < 2) {
      showFieldError(el, `${label} terlalu pendek.`);
      valid = false;
    }
  });

  return valid;
}

/** Clear error saat user mengetik ulang */
function attachLiveValidation(formEl) {
  if (!formEl) return;
  formEl.querySelectorAll("input, select, textarea").forEach((el) => {
    el.addEventListener("input", () => clearFieldError(el), { passive: true });
    el.addEventListener("change", () => clearFieldError(el), { passive: true });
  });
}

/* ==========================================================================
   EXPORT CSV — utilitas
   ========================================================================== */

/**
 * Unduh data sebagai file CSV
 * @param {string} filename - nama file tanpa ekstensi
 * @param {string[]} headers - header kolom
 * @param {string[][]} rows - baris data
 */
function downloadCSV(filename, headers, rows) {
  const escape = (v) => {
    const str = String(v ?? "").replace(/"/g, '""');
    return /[",\n]/.test(str) ? `"${str}"` : str;
  };

  const csvContent =
    [headers, ...rows]
      .map((row) => row.map(escape).join(","))
      .join("\r\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ==========================================================================
   MODUL 1 — FILTER SYSTEM: Container
   State filter container terpisah dari searchQuery di script.js
   ========================================================================== */
const containerFilter = {
  status: "",
  destination: "",
};

function applyContainerFilter() {
  // Ambil daftar yang sudah difilter oleh search query dari script.js
  // getFilteredContainers() adalah fungsi global dari script.js
  let rows = typeof getFilteredContainers === "function" ? getFilteredContainers() : (window.containersList || []);

  if (containerFilter.status) {
    rows = rows.filter((c) => c.status?.toLowerCase() === containerFilter.status.toLowerCase());
  }
  if (containerFilter.destination) {
    rows = rows.filter((c) =>
      c.destination?.toLowerCase().includes(containerFilter.destination.toLowerCase())
    );
  }
  return rows;
}

/**
 * Inject filter bar ke dalam #monitoring section (sebelum table-toolbar)
 * Dipanggil sekali saat DOMContentLoaded
 */
function initContainerFilterBar() {
  const toolbar = document.querySelector("#monitoring .table-toolbar");
  if (!toolbar || document.getElementById("container-filter-bar")) return;

  const bar = document.createElement("div");
  bar.id = "container-filter-bar";
  bar.className = "filter-bar";
  bar.innerHTML = `
    <span class="filter-bar__label">Filter:</span>

    <select class="filter-select" id="filter-container-status" title="Filter Status">
      <option value="">Semua Status</option>
      <option value="Loading">Loading</option>
      <option value="Transit">Transit</option>
      <option value="Delayed">Delayed</option>
    </select>

    <select class="filter-select" id="filter-container-destination" title="Filter Destination">
      <option value="">Semua Destinasi</option>
    </select>

    <button type="button" class="filter-bar__reset" id="container-filter-reset">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
      Reset
    </button>
  `;
  toolbar.insertAdjacentElement("beforebegin", bar);

  // Isi opsi destinasi dari containersList
  const populateDestinations = () => {
    const sel = document.getElementById("filter-container-destination");
    if (!sel) return;
    const current = sel.value;
    const existing = sel.querySelectorAll("option:not([value=''])");
    existing.forEach((o) => o.remove());

    const destinations = [...new Set((window.containersList || []).map((c) => c.destination).filter(Boolean))].sort();
    destinations.forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d;
      if (d === current) opt.selected = true;
      sel.appendChild(opt);
    });
  };

  populateDestinations();
  // Refresh opsi destinasi tiap 5 detik jika data berubah
  setInterval(populateDestinations, 5000);

  const checkReset = () => {
    const resetBtn = document.getElementById("container-filter-reset");
    if (!resetBtn) return;
    const active = containerFilter.status || containerFilter.destination;
    resetBtn.classList.toggle("is-visible", !!active);
  };

  document.getElementById("filter-container-status")?.addEventListener("change", (e) => {
    containerFilter.status = e.target.value;
    checkReset();
    if (typeof renderTable === "function") renderTable();
  });

  document.getElementById("filter-container-destination")?.addEventListener("change", (e) => {
    containerFilter.destination = e.target.value;
    checkReset();
    if (typeof renderTable === "function") renderTable();
  });

  document.getElementById("container-filter-reset")?.addEventListener("click", () => {
    containerFilter.status = "";
    containerFilter.destination = "";
    const statusSel = document.getElementById("filter-container-status");
    const destSel = document.getElementById("filter-container-destination");
    if (statusSel) statusSel.value = "";
    if (destSel) destSel.value = "";
    checkReset();
    if (typeof renderTable === "function") renderTable();
  });
}

/**
 * Patch getFilteredContainers() agar menyertakan filter tambahan.
 * Dipanggil setelah script.js selesai inisialisasi (DOMContentLoaded akhir).
 */
function patchContainerFilter() {
  if (typeof getFilteredContainers !== "function") return;
  const _original = getFilteredContainers;
  window.getFilteredContainers = function () {
    let rows = _original();
    if (containerFilter.status) {
      rows = rows.filter((c) => c.status?.toLowerCase() === containerFilter.status.toLowerCase());
    }
    if (containerFilter.destination) {
      rows = rows.filter((c) =>
        c.destination?.toLowerCase().includes(containerFilter.destination.toLowerCase())
      );
    }
    return rows;
  };
}

/* ==========================================================================
   MODUL 2 — FILTER SYSTEM: Vehicle
   ========================================================================== */
const vehicleFilter = {
  type: "",
  status: "",
};

function initVehicleFilterBar() {
  const toolbar = document.querySelector("#vehicles-monitoring .table-toolbar");
  if (!toolbar || document.getElementById("vehicle-filter-bar")) return;

  const bar = document.createElement("div");
  bar.id = "vehicle-filter-bar";
  bar.className = "filter-bar";
  bar.innerHTML = `
    <span class="filter-bar__label">Filter:</span>

    <select class="filter-select" id="filter-vehicle-type" title="Filter Vehicle Type">
      <option value="">Semua Tipe</option>
    </select>

    <select class="filter-select" id="filter-vehicle-status" title="Filter Status">
      <option value="">Semua Status</option>
      <option value="Active">Active</option>
      <option value="Idle">Idle</option>
      <option value="Maintenance">Maintenance</option>
    </select>

    <button type="button" class="filter-bar__reset" id="vehicle-filter-reset">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
      Reset
    </button>
  `;
  toolbar.insertAdjacentElement("beforebegin", bar);

  const populateTypes = () => {
    const sel = document.getElementById("filter-vehicle-type");
    if (!sel) return;
    const current = sel.value;
    sel.querySelectorAll("option:not([value=''])").forEach((o) => o.remove());
    const types = [...new Set((window.vehiclesList || []).map((v) => v.vehicle_type).filter(Boolean))].sort();
    types.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      if (t === current) opt.selected = true;
      sel.appendChild(opt);
    });
  };

  populateTypes();
  setInterval(populateTypes, 5000);

  const checkReset = () => {
    const resetBtn = document.getElementById("vehicle-filter-reset");
    if (!resetBtn) return;
    resetBtn.classList.toggle("is-visible", !!(vehicleFilter.type || vehicleFilter.status));
  };

  document.getElementById("filter-vehicle-type")?.addEventListener("change", (e) => {
    vehicleFilter.type = e.target.value;
    checkReset();
    if (typeof renderVehicleTable === "function") renderVehicleTable();
  });

  document.getElementById("filter-vehicle-status")?.addEventListener("change", (e) => {
    vehicleFilter.status = e.target.value;
    checkReset();
    if (typeof renderVehicleTable === "function") renderVehicleTable();
  });

  document.getElementById("vehicle-filter-reset")?.addEventListener("click", () => {
    vehicleFilter.type = "";
    vehicleFilter.status = "";
    const typeSel = document.getElementById("filter-vehicle-type");
    const statusSel = document.getElementById("filter-vehicle-status");
    if (typeSel) typeSel.value = "";
    if (statusSel) statusSel.value = "";
    checkReset();
    if (typeof renderVehicleTable === "function") renderVehicleTable();
  });
}

function patchVehicleFilter() {
  if (typeof getFilteredVehicles !== "function") return;
  const _original = getFilteredVehicles;
  window.getFilteredVehicles = function () {
    let rows = _original();
    if (vehicleFilter.type) {
      rows = rows.filter((v) => v.vehicle_type?.toLowerCase().includes(vehicleFilter.type.toLowerCase()));
    }
    if (vehicleFilter.status) {
      rows = rows.filter((v) => v.status?.toLowerCase() === vehicleFilter.status.toLowerCase());
    }
    return rows;
  };
}

/* ==========================================================================
   MODUL 3 — FILTER SYSTEM: Driver
   ========================================================================== */
const driverFilter = {
  shift: "",
  status: "",
};

function initDriverFilterBar() {
  const driverSection = document.querySelector("#drivers-monitoring");
  const driverToolbar = driverSection?.querySelector(".table-toolbar");
  const panelTable = driverSection?.querySelector(".panel--table");

  // Jika tidak ada toolbar, inject sebelum panel--table
  const insertTarget = driverToolbar || panelTable;
  if (!insertTarget || document.getElementById("driver-filter-bar")) return;

  const bar = document.createElement("div");
  bar.id = "driver-filter-bar";
  bar.className = "filter-bar";
  bar.innerHTML = `
    <span class="filter-bar__label">Filter:</span>

    <select class="filter-select" id="filter-driver-shift" title="Filter Shift">
      <option value="">Semua Shift</option>
    </select>

    <select class="filter-select" id="filter-driver-status" title="Filter Status">
      <option value="">Semua Status</option>
      <option value="Active">Active</option>
      <option value="Off Duty">Off Duty</option>
      <option value="Sick">Sick</option>
      <option value="Leave">Leave</option>
    </select>

    <button type="button" class="filter-bar__reset" id="driver-filter-reset">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
      Reset
    </button>
  `;

  if (driverToolbar) {
    driverToolbar.insertAdjacentElement("beforebegin", bar);
  } else {
    panelTable.insertAdjacentElement("beforebegin", bar);
  }

  const populateShifts = () => {
    const sel = document.getElementById("filter-driver-shift");
    if (!sel) return;
    const current = sel.value;
    sel.querySelectorAll("option:not([value=''])").forEach((o) => o.remove());
    const shifts = [...new Set((window.driversList || []).map((d) => d.shift_schedule).filter(Boolean))].sort();
    shifts.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s;
      if (s === current) opt.selected = true;
      sel.appendChild(opt);
    });
  };

  populateShifts();
  setInterval(populateShifts, 5000);

  const checkReset = () => {
    const resetBtn = document.getElementById("driver-filter-reset");
    if (!resetBtn) return;
    resetBtn.classList.toggle("is-visible", !!(driverFilter.shift || driverFilter.status));
  };

  document.getElementById("filter-driver-shift")?.addEventListener("change", (e) => {
    driverFilter.shift = e.target.value;
    checkReset();
    if (typeof renderDriverTable === "function") renderDriverTable();
  });

  document.getElementById("filter-driver-status")?.addEventListener("change", (e) => {
    driverFilter.status = e.target.value;
    checkReset();
    if (typeof renderDriverTable === "function") renderDriverTable();
  });

  document.getElementById("driver-filter-reset")?.addEventListener("click", () => {
    driverFilter.shift = "";
    driverFilter.status = "";
    const shiftSel = document.getElementById("filter-driver-shift");
    const statusSel = document.getElementById("filter-driver-status");
    if (shiftSel) shiftSel.value = "";
    if (statusSel) statusSel.value = "";
    checkReset();
    if (typeof renderDriverTable === "function") renderDriverTable();
  });
}

function patchDriverFilter() {
  if (typeof getFilteredDrivers !== "function") return;
  const _original = getFilteredDrivers;
  window.getFilteredDrivers = function () {
    let rows = _original();
    if (driverFilter.shift) {
      rows = rows.filter((d) => d.shift_schedule?.toLowerCase().includes(driverFilter.shift.toLowerCase()));
    }
    if (driverFilter.status) {
      rows = rows.filter((d) => d.status?.toLowerCase() === driverFilter.status.toLowerCase());
    }
    return rows;
  };
}

/* ==========================================================================
   MODUL 4 — EXPORT CSV BUTTONS
   ========================================================================== */

/** Inject tombol Export ke section header */
function injectExportButton(sectionId, btnId, label) {
  if (document.getElementById(btnId)) return; // sudah ada
  const section = document.getElementById(sectionId);
  if (!section) return;

  const headerActions = section.querySelector(".section-head--row > div:last-child, .section-head > div:last-child");
  if (!headerActions) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.id = btnId;
  btn.className = "btn-export";
  btn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <path d="M12 3v12M7 14l5 5 5-5M4 19h16"/>
    </svg>
    ${label}
  `;
  headerActions.appendChild(btn);
}

function initExportContainerCSV() {
  injectExportButton("monitoring", "btn-export-containers", "Export CSV");

  document.getElementById("btn-export-containers")?.addEventListener("click", () => {
    const data = typeof getFilteredContainers === "function"
      ? getFilteredContainers()
      : (window.containersList || []);

    const headers = ["Container ID", "Cargo Type", "Weight", "Destination", "ETA", "Driver Name", "License Plate", "Route", "Status"];
    const rows = data.map((c) => [
      c.containerId, c.cargoType, c.weight, c.destination, c.eta,
      c.driverName, c.licensePlate, c.route, c.status,
    ]);

    downloadCSV("containers_nexport", headers, rows);
    if (typeof showToast === "function") {
      showToast("success", "CSV Exported", `${data.length} container records diunduh.`);
    }
  });
}

function initExportVehicleCSV() {
  injectExportButton("vehicles-monitoring", "btn-export-vehicles", "Export CSV");

  document.getElementById("btn-export-vehicles")?.addEventListener("click", () => {
    const data = typeof getFilteredVehicles === "function"
      ? getFilteredVehicles()
      : (window.vehiclesList || []);

    const headers = ["Vehicle Code", "Driver", "License Plate", "Type", "Status", "Route", "Last Activity"];
    const rows = data.map((v) => [
      v.vehicle_code, v.driver_name, v.license_plate,
      v.vehicle_type, v.status, v.route, v.last_activity,
    ]);

    downloadCSV("vehicles_nexport", headers, rows);
    if (typeof showToast === "function") {
      showToast("success", "CSV Exported", `${data.length} vehicle records diunduh.`);
    }
  });
}

function initExportDriverCSV() {
  // Driver section ada di dalam vehicles-monitoring (nested), cari by ID
  const driverSection = document.getElementById("drivers-monitoring");
  if (!driverSection || document.getElementById("btn-export-drivers")) return;

  const headerActions = driverSection.querySelector(".section-head--row > div:last-child");
  if (!headerActions) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.id = "btn-export-drivers";
  btn.className = "btn-export";
  btn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <path d="M12 3v12M7 14l5 5 5-5M4 19h16"/>
    </svg>
    Export CSV
  `;
  headerActions.appendChild(btn);

  btn.addEventListener("click", () => {
    const data = typeof getFilteredDrivers === "function"
      ? getFilteredDrivers()
      : (window.driversList || []);

    const headers = ["Driver Code", "Full Name", "Age", "License Type", "Phone", "Shift", "Assigned Vehicle", "Status", "Performance Score"];
    const rows = data.map((d) => [
      d.driver_code, d.full_name, d.age, d.license_type, d.phone_number,
      d.shift_schedule, d.assigned_vehicle, d.status, d.performance_score,
    ]);

    downloadCSV("drivers_nexport", headers, rows);
    if (typeof showToast === "function") {
      showToast("success", "CSV Exported", `${data.length} driver records diunduh.`);
    }
  });
}

/* ==========================================================================
   MODUL 5 — FORM VALIDATION + BUTTON LOADING: Container
   ========================================================================== */
function patchContainerFormValidation() {
  const form = document.getElementById("add-container-form");
  const saveBtn = document.getElementById("save-container-btn");
  if (!form) return;

  attachLiveValidation(form);

  // Schema validasi
  const schema = [
    { id: "container-id", label: "Container ID", rules: ["required", "nonempty"] },
    { id: "cargo-type", label: "Cargo Type", rules: ["required"] },
    { id: "weight", label: "Weight", rules: ["required"] },
    { id: "destination", label: "Destination", rules: ["required"] },
    { id: "driver-name", label: "Driver Name", rules: ["required"] },
    { id: "license-plate", label: "License Plate", rules: ["required"] },
    { id: "route", label: "Route", rules: ["required"] },
  ];

  // Intercept submit sebelum Supabase insert
  form.addEventListener(
    "submit",
    async (e) => {
      // Validasi form — jika gagal, stop propagasi ke listener di script.js
      const valid = validateForm(form, schema);
      if (!valid) {
        e.stopImmediatePropagation();
        e.preventDefault();
        // Scroll ke error pertama
        form.querySelector(".field-error")?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      // Cek duplikat container ID (client-side)
      const newId = document.getElementById("container-id")?.value?.trim().toUpperCase();
      const duplicate = (window.containersList || []).some(
        (c) => String(c.containerId || c.container_id || "").toUpperCase() === newId
      );
      if (duplicate) {
        e.stopImmediatePropagation();
        e.preventDefault();
        showFieldError(document.getElementById("container-id"), "Container ID sudah ada dalam database.");
        return;
      }

      // Loading state
      setButtonLoading(saveBtn, "Saving...");

      // Restore setelah selesai (script.js closeAddContainerModal dipanggil duluan,
      // tapi restore tetap diperlukan jika error)
      const cleanup = () => restoreButton(saveBtn);
      setTimeout(cleanup, 4000); // fallback restore
    },
    true // capture = true → jalan sebelum listener di script.js
  );
}

/* ==========================================================================
   MODUL 6 — FORM VALIDATION + BUTTON LOADING: Vehicle
   ========================================================================== */
function patchVehicleFormValidation() {
  const form = document.getElementById("add-vehicle-form");
  const saveBtn = document.getElementById("save-vehicle-btn");
  if (!form) return;

  attachLiveValidation(form);

  const schema = [
    { id: "vehicle-code", label: "Vehicle Code", rules: ["required", "nonempty"] },
    { id: "vehicle-driver-name", label: "Driver Name", rules: ["required"] },
    { id: "vehicle-license-plate", label: "License Plate", rules: ["required"] },
    { id: "vehicle-type", label: "Vehicle Type", rules: ["required"] },
    { id: "vehicle-route", label: "Route", rules: ["required"] },
    { id: "vehicle-last-activity", label: "Last Activity", rules: ["required"] },
  ];

  form.addEventListener(
    "submit",
    async (e) => {
      const valid = validateForm(form, schema);
      if (!valid) {
        e.stopImmediatePropagation();
        e.preventDefault();
        form.querySelector(".field-error")?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      // Cek duplikat vehicle code (hanya saat CREATE)
      if (!window.selectedVehicleId) {
        const newCode = document.getElementById("vehicle-code")?.value?.trim().toUpperCase();
        const duplicate = (window.vehiclesList || []).some(
          (v) => String(v.vehicle_code || "").toUpperCase() === newCode
        );
        if (duplicate) {
          e.stopImmediatePropagation();
          e.preventDefault();
          showFieldError(document.getElementById("vehicle-code"), "Vehicle Code sudah terdaftar.");
          return;
        }
      }

      setButtonLoading(saveBtn, "Saving...");
      setTimeout(() => restoreButton(saveBtn), 4000);
    },
    true
  );
}

/* ==========================================================================
   MODUL 7 — FORM VALIDATION + BUTTON LOADING: Driver
   ========================================================================== */
function patchDriverFormValidation() {
  const form = document.getElementById("add-driver-form");
  if (!form) return;

  attachLiveValidation(form);

  const schema = [
    { id: "driver-code", label: "Driver Code", rules: ["required", "nonempty"] },
    { id: "driver-full-name", label: "Full Name", rules: ["required"] },
    { id: "driver-license-type", label: "License Type", rules: ["required"] },
    { id: "driver-shift-schedule", label: "Shift Schedule", rules: ["required"] },
  ];

  // Cari tombol save driver
  const saveBtn = form.querySelector('button[type="submit"]');

  form.addEventListener(
    "submit",
    async (e) => {
      const valid = validateForm(form, schema);
      if (!valid) {
        e.stopImmediatePropagation();
        e.preventDefault();
        form.querySelector(".field-error")?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      // Cek duplikat driver code (hanya saat CREATE)
      if (!window.selectedDriverId) {
        const newCode = document.getElementById("driver-code")?.value?.trim().toUpperCase();
        const duplicate = (window.driversList || []).some(
          (d) => String(d.driver_code || "").toUpperCase() === newCode
        );
        if (duplicate) {
          e.stopImmediatePropagation();
          e.preventDefault();
          showFieldError(document.getElementById("driver-code"), "Driver Code sudah terdaftar.");
          return;
        }
      }

      if (saveBtn) setButtonLoading(saveBtn, "Saving...");
      setTimeout(() => { if (saveBtn) restoreButton(saveBtn); }, 4000);
    },
    true
  );
}

/* ==========================================================================
   MODUL 8 — BUTTON LOADING: Edit & Delete Container
   ========================================================================== */
function patchContainerCRUDButtons() {
  const editBtn = document.getElementById("edit-container-btn");
  const deleteBtn = document.getElementById("delete-container-btn");

  editBtn?.addEventListener(
    "click",
    () => {
      setButtonLoading(editBtn, "Updating...");
      setTimeout(() => restoreButton(editBtn), 4000);
    },
    true
  );

  deleteBtn?.addEventListener(
    "click",
    (e) => {
      // Loading state hanya jika confirm OK — tapi confirm() sudah di script.js
      // Kita set setelah event ini selesai (tidak bisa intercept confirm)
      setTimeout(() => {
        if (document.getElementById("modal-overlay")?.classList.contains("is-open")) {
          setButtonLoading(deleteBtn, "Deleting...");
        }
      }, 10);
      setTimeout(() => restoreButton(deleteBtn), 4000);
    },
    false
  );
}

/* ==========================================================================
   INIT — Bootstrap semua enhancement setelah DOM ready
   ========================================================================== */
function initEnhancements() {
  // Patch filter functions (sebelum data load)
  patchContainerFilter();
  patchVehicleFilter();
  patchDriverFilter();

  // Filter Bars
  initContainerFilterBar();
  initVehicleFilterBar();
  initDriverFilterBar();

  // Export CSV
  initExportContainerCSV();
  initExportVehicleCSV();
  initExportDriverCSV();

  // Form Validation + Loading States
  patchContainerFormValidation();
  patchVehicleFormValidation();
  patchDriverFormValidation();
  patchContainerCRUDButtons();

  console.log("[NexPort Enhancements] Batch 1 loaded ✓");
}

// Tunggu DOMContentLoaded — sama seperti bootstrap() di script.js
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initEnhancements);
} else {
  // DOM sudah ready (script di-load defer/async atau taruh bawah body)
  initEnhancements();
}
