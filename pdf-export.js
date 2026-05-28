/**
 * pdf-export.js — NexPort Nexus PDF Report Engine
 *
 * Standalone module. Zero coupling to script.js internals.
 * Reads global state (containersList, vehiclesList, driversList,
 * METRICS, notifications, activityLogs) already defined by script.js.
 *
 * Requires: jsPDF (loaded via CDN before this file)
 *
 * Public API:
 *   NexPDF.export()  — called by the Export PDF button
 */

const NexPDF = (() => {

  /* ── Palette (mirrored from CSS vars, jsPDF needs hex) ─────────────── */
  const C = {
    bg:        [7,   17,  31],   // #07111f
    panel:     [14,  30,  54],   // ~panel background
    cyan:      [60,  242, 255],  // #3cf2ff
    blue:      [77,  168, 255],  // #4da8ff
    emerald:   [74,  222, 128],  // #4ade80
    red:       [255, 80,  100],  // alert red
    white:     [255, 255, 255],
    muted:     [120, 150, 180],
    border:    [30,  60,  100],
  };

  /* ── Layout constants ───────────────────────────────────────────────── */
  const PAGE_W  = 210;   // A4 mm
  const PAGE_H  = 297;
  const MARGIN  = 14;
  const COL_W   = PAGE_W - MARGIN * 2;

  /* ── State ──────────────────────────────────────────────────────────── */
  let doc, y;

  /* ================================================================
     HELPERS
     ================================================================ */

  function newPage() {
    doc.addPage();
    y = MARGIN + 4;
    drawPageHeader();
  }

  function ensureSpace(needed) {
    if (y + needed > PAGE_H - MARGIN) newPage();
  }

  function rgb(arr) { return { r: arr[0], g: arr[1], b: arr[2] }; }

  function setFill(arr)   { doc.setFillColor(...arr); }
  function setDraw(arr)   { doc.setDrawColor(...arr); }
  function setTextColor(arr) { doc.setTextColor(...arr); }
  function setFont(style, size) { doc.setFont("helvetica", style); doc.setFontSize(size); }

  function rect(x, w, h, fill) {
    setFill(fill);
    doc.rect(x, y, w, h, "F");
  }

  function hline(alpha = 40) {
    doc.setDrawColor(C.cyan[0], C.cyan[1], C.cyan[2]);
    doc.setLineWidth(0.15);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 2;
  }

  function text(str, x, opts = {}) {
    doc.text(String(str), x, y, opts);
  }

  function label(str, x, val, valColor = C.white) {
    setFont("normal", 7.5);
    setTextColor(C.muted);
    text(str, x);
    setFont("bold", 7.5);
    setTextColor(valColor);
    text(val, x + 28);
  }

  /* ── Glow-line section header ──────────────────────────────────── */
  function sectionHeader(title, icon = "◈") {
    ensureSpace(16);
    y += 3;

    // Accent bar
    setFill(C.cyan);
    doc.rect(MARGIN, y, 3, 6, "F");

    // Title
    setFont("bold", 10);
    setTextColor(C.cyan);
    text(`${icon}  ${title}`, MARGIN + 6);
    y += 10;

    hline();
  }

  /* ── Repeating page header (logo + brand) ──────────────────────── */
  function drawPageHeader() {
    // Background bar
    setFill(C.panel);
    doc.rect(0, 0, PAGE_W, 18, "F");

    // Left: brand
    setFont("bold", 9);
    setTextColor(C.cyan);
    doc.text("NEXPORT NEXUS", MARGIN, 7);
    setFont("normal", 6.5);
    setTextColor(C.muted);
    doc.text("ENTERPRISE CONTROL SYSTEM  ·  PORT TANJUNG PRIOK", MARGIN, 12);

    // Right: report badge
    setFill(C.cyan);
    doc.roundedRect(PAGE_W - MARGIN - 28, 4, 28, 9, 2, 2, "F");
    setFont("bold", 6);
    setTextColor(C.bg);
    doc.text("OPERATIONAL REPORT", PAGE_W - MARGIN - 26, 9.5);

    // Bottom border glow
    setFill(C.cyan);
    doc.rect(0, 17.5, PAGE_W, 0.4, "F");

    y = 24;
  }

  /* ── Page footer ────────────────────────────────────────────────── */
  function drawFooters() {
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      const fy = PAGE_H - 7;

      setFill(C.border);
      doc.rect(0, PAGE_H - 10, PAGE_W, 10, "F");

      setFont("normal", 6);
      setTextColor(C.muted);
      doc.text("CONFIDENTIAL — NexPort Nexus Intelligence Platform", MARGIN, fy);
      doc.text(`Page ${i} of ${totalPages}`, PAGE_W - MARGIN, fy, { align: "right" });
    }
  }

  /* ================================================================
     SECTION RENDERERS
     ================================================================ */

  /* ── 1. Cover / Title block ─────────────────────────────────────── */
  function renderCover(timestamp) {
    // Hero background
    setFill(C.bg);
    doc.rect(0, 0, PAGE_W, PAGE_H, "F");

    // Top accent strip
    setFill(C.panel);
    doc.rect(0, 0, PAGE_W, 60, "F");
    setFill(C.cyan);
    doc.rect(0, 59.5, PAGE_W, 0.5, "F");

    // Logo circle
    setFill(C.cyan);
    doc.circle(PAGE_W / 2, 22, 10, "F");
    setFont("bold", 14);
    setTextColor(C.bg);
    doc.text("N", PAGE_W / 2, 25.5, { align: "center" });

    // Title
    setFont("bold", 22);
    setTextColor(C.white);
    doc.text("NEXPORT NEXUS", PAGE_W / 2, 46, { align: "center" });

    setFont("normal", 9);
    setTextColor(C.cyan);
    doc.text("ENTERPRISE OPERATIONAL REPORT", PAGE_W / 2, 54, { align: "center" });

    // Metadata box
    const bx = 30, by = 72, bw = PAGE_W - 60, bh = 44;
    setFill(C.panel);
    doc.roundedRect(bx, by, bw, bh, 4, 4, "F");
    setDraw(C.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(bx, by, bw, bh, 4, 4, "S");

    const lx = bx + 8;
    y = by + 10;

    label("Generated",   lx,       timestamp);                       y += 7;
    label("Facility",    lx,       "Port Tanjung Priok — Terminal 3"); y += 7;
    label("System",      lx,       "NexPort Nexus v3.2 Nexus");       y += 7;
    label("Cleared By",  lx,       "Nexus AI Intelligence Engine", C.cyan);

    // Disclaimer
    y = by + bh + 10;
    setFont("normal", 6.5);
    setTextColor(C.muted);
    doc.text("This document contains confidential port operational data. For authorized personnel only.", PAGE_W / 2, y, { align: "center" });

    // Decorative grid lines
    setDraw(C.border);
    doc.setLineWidth(0.08);
    for (let lyi = 130; lyi < PAGE_H - 20; lyi += 12) {
      doc.line(MARGIN, lyi, PAGE_W - MARGIN, lyi);
    }

    // Bottom tag
    setFont("bold", 7);
    setTextColor(C.cyan);
    doc.text("SMART PORT · REAL-TIME INTELLIGENCE · OPERATIONAL EXCELLENCE", PAGE_W / 2, PAGE_H - 16, { align: "center" });

    doc.addPage();
    drawPageHeader();
  }

  /* ── 2. KPI Summary ─────────────────────────────────────────────── */
  function renderKPISection() {
    sectionHeader("KPI Dashboard Summary", "◈");

    const kpis = Object.values(typeof METRICS !== "undefined" ? METRICS : {});
    if (!kpis.length) {
      setFont("normal", 8); setTextColor(C.muted);
      text("No KPI data available.", MARGIN); y += 8;
      return;
    }

    const cardW  = (COL_W - 8) / 3;
    const cardH  = 22;
    const gap    = 4;
    const startX = MARGIN;

    // Draw 2 rows of 3
    for (let i = 0; i < kpis.length; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const cx  = startX + col * (cardW + gap);
      const cy  = y + row * (cardH + gap);

      // Card background
      setFill(C.panel);
      doc.roundedRect(cx, cy, cardW, cardH, 3, 3, "F");

      // Accent left bar (color by trend)
      const barColor = kpis[i].trend === "alert" ? C.red
                     : kpis[i].trend === "up"    ? C.emerald
                     : C.cyan;
      setFill(barColor);
      doc.rect(cx, cy, 2.5, cardH, "F");

      // Label
      setFont("normal", 6.5);
      setTextColor(C.muted);
      doc.text(kpis[i].label ?? "", cx + 5, cy + 7);

      // Value
      setFont("bold", 11);
      setTextColor(C.white);
      const val = typeof kpis[i].value === "number"
        ? kpis[i].value.toLocaleString("id-ID")
        : String(kpis[i].value ?? "—");
      doc.text(val, cx + 5, cy + 15);

      // Delta
      setFont("normal", 6);
      setTextColor(barColor);
      doc.text(kpis[i].delta ?? "", cx + 5, cy + 20);
    }

    const rows = Math.ceil(kpis.length / 3);
    y += rows * (cardH + gap) + 6;
  }

  /* ── 3. Generic table renderer ──────────────────────────────────── */
  function renderTable(headers, rows, colWidths) {
    if (!rows.length) {
      setFont("normal", 8); setTextColor(C.muted);
      text("No records found.", MARGIN); y += 8;
      return;
    }

    const rowH   = 7;
    const headH  = 8;

    // Header row
    ensureSpace(headH + rowH);
    setFill(C.panel);
    doc.rect(MARGIN, y, COL_W, headH, "F");
    setFill(C.cyan);
    doc.rect(MARGIN, y, COL_W, 0.6, "F");

    setFont("bold", 6.5);
    setTextColor(C.cyan);
    let hx = MARGIN + 2;
    headers.forEach((h, i) => {
      doc.text(h, hx, y + 5.5);
      hx += colWidths[i];
    });
    y += headH;

    // Data rows
    rows.forEach((row, ri) => {
      ensureSpace(rowH + 2);

      // Alternating row background
      if (ri % 2 === 0) {
        setFill([12, 24, 44]);
        doc.rect(MARGIN, y, COL_W, rowH, "F");
      }

      setFont("normal", 6.5);
      setTextColor(C.white);

      let rx = MARGIN + 2;
      row.forEach((cell, ci) => {
        // Status badge coloring
        let color = C.white;
        const cellStr = String(cell ?? "—");
        if (ci === 2) { // status column heuristic
          if (/active|on duty|ok/i.test(cellStr))      color = C.emerald;
          else if (/delay|critical|suspend/i.test(cellStr)) color = C.red;
          else if (/transit|idle|maint/i.test(cellStr)) color = C.blue;
        }
        doc.setTextColor(...color);
        doc.text(cellStr.substring(0, 28), rx, y + 5);
        rx += colWidths[ci];
      });
      y += rowH;
    });

    // Bottom border
    setDraw(C.border);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 5;
  }

  /* ── 4. Container Registry ──────────────────────────────────────── */
  function renderContainerSection() {
    sectionHeader("Container Registry", "▣");

    const list = (typeof containersList !== "undefined" ? containersList : []).slice(0, 30);
    const total = typeof containersList !== "undefined" ? containersList.length : 0;

    // Summary row
    ensureSpace(10);
    setFont("normal", 7.5);
    setTextColor(C.muted);
    text(`Total records: `, MARGIN);
    setFont("bold", 7.5);
    setTextColor(C.cyan);
    text(`${total} containers`, MARGIN + 22);
    if (total > 30) {
      setFont("normal", 6.5);
      setTextColor(C.muted);
      text(`(showing first 30)`, MARGIN + 50);
    }
    y += 8;

    const headers   = ["Container ID", "Status", "Destination", "Driver", "Plate", "Route"];
    const colWidths = [30, 24, 30, 28, 24, 46];

    const rows = list.map(c => [
      c.container_id ?? c.id ?? "—",
      c.status       ?? "—",
      c.destination  ?? "—",
      c.driver_name  ?? "—",
      c.license_plate ?? "—",
      c.route        ?? "—",
    ]);

    renderTable(headers, rows, colWidths);
  }

  /* ── 5. Vehicle Fleet ───────────────────────────────────────────── */
  function renderVehicleSection() {
    sectionHeader("Vehicle Fleet Summary", "⬡");

    const list = (typeof vehiclesList !== "undefined" ? vehiclesList : []).slice(0, 20);
    const total = typeof vehiclesList !== "undefined" ? vehiclesList.length : 0;

    ensureSpace(10);
    setFont("normal", 7.5); setTextColor(C.muted);
    text("Fleet vehicles: ", MARGIN);
    setFont("bold", 7.5);  setTextColor(C.cyan);
    text(`${total} units`, MARGIN + 24);
    y += 8;

    // Quick stat pills
    const statuses = (typeof vehiclesList !== "undefined" ? vehiclesList : [])
      .reduce((acc, v) => {
        const s = v.status ?? "Unknown";
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {});

    ensureSpace(12);
    let sx = MARGIN;
    Object.entries(statuses).forEach(([status, count]) => {
      const color = /active/i.test(status) ? C.emerald
                  : /maint/i.test(status)  ? C.red
                  : C.blue;
      setFill([...color.map ? color : color, 0]);
      setFill(C.panel);
      doc.roundedRect(sx, y, 36, 9, 2, 2, "F");
      setFill(color);
      doc.rect(sx, y, 2, 9, "F");
      setFont("normal", 6); setTextColor(C.muted);
      doc.text(status, sx + 4, y + 4);
      setFont("bold", 7); setTextColor(C.white);
      doc.text(String(count), sx + 4, y + 8);
      sx += 40;
    });
    y += 14;

    const headers   = ["Code", "Status", "Driver", "Plate", "Type", "Route"];
    const colWidths = [22, 22, 32, 26, 28, 52];

    const rows = list.map(v => [
      v.vehicle_code  ?? "—",
      v.status        ?? "—",
      v.driver_name   ?? "—",
      v.license_plate ?? "—",
      v.type          ?? "—",
      v.route         ?? "—",
    ]);

    renderTable(headers, rows, colWidths);
  }

  /* ── 6. Driver Roster ───────────────────────────────────────────── */
  function renderDriverSection() {
    sectionHeader("Driver Roster", "◎");

    const list = (typeof driversList !== "undefined" ? driversList : []).slice(0, 20);
    const total = typeof driversList !== "undefined" ? driversList.length : 0;

    ensureSpace(10);
    setFont("normal", 7.5); setTextColor(C.muted);
    text("Registered drivers: ", MARGIN);
    setFont("bold", 7.5); setTextColor(C.cyan);
    text(`${total} personnel`, MARGIN + 30);
    y += 8;

    const headers   = ["Driver Code", "Full Name", "Status", "License", "Shift", "Vehicle", "Score"];
    const colWidths = [24, 34, 20, 16, 22, 22, 14];

    const rows = list.map(d => [
      d.driver_code       ?? "—",
      d.full_name         ?? "—",
      d.status            ?? "—",
      d.license_type      ?? "—",
      d.shift_schedule    ?? "—",
      d.assigned_vehicle  ?? "—",
      String(d.performance_score ?? "—"),
    ]);

    renderTable(headers, rows, colWidths);
  }

  /* ── 7. Activity Log ────────────────────────────────────────────── */
  function renderActivitySection() {
    sectionHeader("Activity Log (Recent)", "◌");

    const logs = (typeof activityLogs !== "undefined" ? activityLogs : []).slice(0, 15);

    if (!logs.length) {
      setFont("normal", 8); setTextColor(C.muted);
      text("No activity logs recorded in this session.", MARGIN); y += 8;
      return;
    }

    logs.forEach((log, i) => {
      ensureSpace(14);

      // Row background
      if (i % 2 === 0) {
        setFill([12, 24, 44]);
        doc.rect(MARGIN, y, COL_W, 12, "F");
      }

      // Dot indicator
      setFill(C.cyan);
      doc.circle(MARGIN + 4, y + 6, 1.5, "F");

      // Title
      setFont("bold", 7.5); setTextColor(C.white);
      doc.text(String(log.title ?? "Event"), MARGIN + 9, y + 5);

      // Description
      setFont("normal", 6.5); setTextColor(C.muted);
      const desc = String(log.description ?? "").substring(0, 80);
      doc.text(desc, MARGIN + 9, y + 10);

      // Timestamp
      const timeStr = log.time
        ? new Date(log.time).toLocaleTimeString("id-ID")
        : "—";
      setFont("normal", 6); setTextColor(C.blue);
      doc.text(timeStr, PAGE_W - MARGIN, y + 5, { align: "right" });

      y += 13;
    });

    y += 3;
  }

  /* ── 8. Notification Summary ────────────────────────────────────── */
  function renderNotificationSection() {
    sectionHeader("Notification Summary", "◉");

    const notes = (typeof notifications !== "undefined" ? notifications : []).slice(0, 12);

    if (!notes.length) {
      setFont("normal", 8); setTextColor(C.muted);
      text("No notifications recorded in this session.", MARGIN); y += 8;
      return;
    }

    notes.forEach((n, i) => {
      ensureSpace(14);

      if (i % 2 === 0) {
        setFill([12, 24, 44]);
        doc.rect(MARGIN, y, COL_W, 12, "F");
      }

      // Type badge
      const badgeColor = /success/.test(n.type) ? C.emerald
                       : /danger|delay/.test(n.type) ? C.red
                       : C.blue;
      setFill(badgeColor);
      doc.roundedRect(MARGIN, y + 2, 18, 7, 1.5, 1.5, "F");
      setFont("bold", 5.5); setTextColor(C.bg);
      const typeLabel = String(n.type ?? "info").toUpperCase().substring(0, 7);
      doc.text(typeLabel, MARGIN + 9, y + 6.5, { align: "center" });

      // Title
      setFont("bold", 7.5); setTextColor(C.white);
      doc.text(String(n.title ?? ""), MARGIN + 22, y + 5);

      // Message
      setFont("normal", 6.5); setTextColor(C.muted);
      doc.text(String(n.message ?? "").substring(0, 75), MARGIN + 22, y + 10);

      // Timestamp
      const ts = n.time ? new Date(n.time).toLocaleTimeString("id-ID") : "—";
      setFont("normal", 6); setTextColor(C.blue);
      doc.text(ts, PAGE_W - MARGIN, y + 5, { align: "right" });

      y += 13;
    });

    y += 3;
  }

  /* ── 9. Sign-off block ──────────────────────────────────────────── */
  function renderSignOff(timestamp) {
    ensureSpace(36);
    y += 6;

    setFill(C.panel);
    doc.roundedRect(MARGIN, y, COL_W, 28, 4, 4, "F");
    setFill(C.cyan);
    doc.rect(MARGIN, y, COL_W, 0.5, "F");

    setFont("bold", 8); setTextColor(C.cyan);
    doc.text("◈  REPORT CERTIFICATION", MARGIN + 6, y + 8);

    setFont("normal", 7); setTextColor(C.muted);
    doc.text(`This report was automatically generated by the NexPort Nexus Intelligence Platform on ${timestamp}.`, MARGIN + 6, y + 15, { maxWidth: COL_W - 12 });
    doc.text("All data reflects real-time operational state at the time of export.", MARGIN + 6, y + 21);

    setFont("bold", 7); setTextColor(C.emerald);
    doc.text("✓  Nexus AI Verified  ·  Port Authority Tanjung Priok  ·  CONFIDENTIAL", MARGIN + 6, y + 27);

    y += 32;
  }

  /* ================================================================
     BUTTON STATE
     ================================================================ */

  function setButtonLoading(loading) {
    const btn  = document.getElementById("nexport-export-pdf-btn");
    const icon = document.getElementById("nexport-pdf-icon");
    const lbl  = document.getElementById("nexport-pdf-label");
    if (!btn) return;

    btn.disabled = loading;
    if (loading) {
      if (icon) icon.textContent = "⏳";
      if (lbl)  lbl.textContent  = "Generating…";
      btn.style.opacity = "0.7";
    } else {
      if (icon) icon.textContent = "📄";
      if (lbl)  lbl.textContent  = "Export PDF";
      btn.style.opacity = "1";
    }
  }

  /* ================================================================
     MAIN EXPORT ENTRY
     ================================================================ */

  async function exportReport() {
    // Guard: ensure jsPDF is loaded
    if (typeof window.jspdf === "undefined" && typeof window.jsPDF === "undefined") {
      alert("jsPDF library not loaded. Please check your internet connection and refresh.");
      return;
    }

    setButtonLoading(true);

    // Small defer so button state paints before heavy PDF work
    await new Promise(r => setTimeout(r, 60));

    try {
      const jsPDFClass = window.jspdf?.jsPDF ?? window.jsPDF;
      doc = new jsPDFClass({ unit: "mm", format: "a4", orientation: "portrait" });

      const timestamp = new Date().toLocaleString("id-ID", {
        weekday: "long", day: "2-digit", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
      }) + " WIB";

      // ── Page 1: Cover ────────────────────────────────────────
      renderCover(timestamp);

      // ── Page 2+: Content ─────────────────────────────────────
      renderKPISection();
      renderContainerSection();
      renderVehicleSection();
      renderDriverSection();
      renderActivitySection();
      renderNotificationSection();
      renderSignOff(timestamp);

      // ── Apply footers to all pages ────────────────────────────
      drawFooters();

      // ── Download ──────────────────────────────────────────────
      const filename = `NexPort-Report-${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(filename);

      // ── Post-export hooks (safe — uses existing globals) ───────
      const summary = `${containersList?.length ?? 0} containers · ${vehiclesList?.length ?? 0} vehicles · ${driversList?.length ?? 0} drivers`;

      if (typeof addActivityLog === "function") {
        addActivityLog("PDF Report Exported", `Operational report downloaded: ${filename} — ${summary}`);
      }

      if (typeof addNotification === "function") {
        addNotification("success", "Report Exported", `PDF generated successfully · ${summary}`);
      }

      if (typeof showToast === "function") {
        showToast("success", "Export Complete", `Report saved as ${filename}`);
      }

    } catch (err) {
      console.error("[NexPDF] Export failed:", err);

      if (typeof showToast === "function") {
        showToast("delay", "Export Failed", err.message || "Unexpected error during PDF generation.");
      } else {
        alert("PDF export failed: " + err.message);
      }
    } finally {
      setButtonLoading(false);
    }
  }

  /* ================================================================
     INIT — wire up button after DOM ready
     ================================================================ */

  function init() {
    const btn = document.getElementById("nexport-export-pdf-btn");
    if (btn) {
      btn.addEventListener("click", exportReport);
    } else {
      console.warn("[NexPDF] Export button #nexport-export-pdf-btn not found in DOM.");
    }
  }

  // Auto-init when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  return { export: exportReport };

})();
