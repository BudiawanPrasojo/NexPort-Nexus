/* ==========================================================================
   NexPort Nexus — Notification Polish Patch v2 (FINAL)
   Phase 1 Complete: Badge · Toggle · Delete · Clear · Toast · Global API
   PATCH ONLY — no rewrites of script.js, preserves all Supabase integration
   ========================================================================== */

(function (global) {
  "use strict";

  const TOAST_DURATION = 4200;      // ms before auto-dismiss
  const MAX_NOTIFICATIONS = 50;     // panel history cap

  /* ─────────────────────────────────────────────────────────────────
     UNREAD BADGE STATE
  ───────────────────────────────────────────────────────────────── */
  let _unread = 0;
  let _panelOpen = false;

  function setUnread(n) {
    _unread = Math.max(0, n);
    _syncBadge();
  }

  function incUnread() {
    if (_panelOpen) return; // panel is open → don't increment
    _unread++;
    _syncBadge();
  }

  function resetUnread() {
    _unread = 0;
    _syncBadge();
  }

  function _syncBadge() {
    const el = document.getElementById("notification-count");
    if (!el) return;
    if (_unread > 0) {
      el.textContent = _unread > 99 ? "99+" : String(_unread);
      el.classList.add("has-unread");
    } else {
      el.textContent = "";
      el.classList.remove("has-unread");
    }
  }

  /* ─────────────────────────────────────────────────────────────────
     PANEL TOGGLE — replaces old listener, adds badge-reset on open
  ───────────────────────────────────────────────────────────────── */
  function patchPanelToggle() {
    const btn = document.getElementById("notification-toggle");
    const panel = document.getElementById("notification-panel");
    if (!btn || !panel) return;

    // Clone to remove any old listeners attached by script.js
    const fresh = btn.cloneNode(true);
    btn.parentNode.replaceChild(fresh, btn);

    fresh.addEventListener("click", (e) => {
      e.stopPropagation();
      _panelOpen = !panel.classList.contains("is-open");
      panel.classList.toggle("is-open", _panelOpen);
      if (_panelOpen) {
        resetUnread();
        _markItemsRead();
      }
    });

    // Close on outside click
    document.addEventListener("click", (e) => {
      const currentBtn = document.getElementById("notification-toggle");
      if (
        _panelOpen &&
        !panel.contains(e.target) &&
        !currentBtn?.contains(e.target)
      ) {
        panel.classList.remove("is-open");
        _panelOpen = false;
      }
    }, true);

    // Close on Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && _panelOpen) {
        panel.classList.remove("is-open");
        _panelOpen = false;
      }
    });
  }

  function _markItemsRead() {
    document.querySelectorAll(".notification-item.is-unread")
      .forEach(el => el.classList.remove("is-unread"));
  }

  /* ─────────────────────────────────────────────────────────────────
     PANEL HEADER ACTIONS — inject "Clear all" button
  ───────────────────────────────────────────────────────────────── */
  function injectPanelActions() {
    const header = document.querySelector(".notification-panel__header");
    if (!header || header.querySelector(".notification-panel__actions")) return;

    const wrap = document.createElement("div");
    wrap.className = "notification-panel__actions";
    wrap.innerHTML =
      '<button class="notif-action-btn" id="nex-notif-clear" title="Clear all">Clear all</button>';
    header.appendChild(wrap);

    document.getElementById("nex-notif-clear")
      ?.addEventListener("click", _clearAll);
  }

  function _clearAll() {
    const list = document.getElementById("notification-list");
    if (!list) return;
    const items = [...list.querySelectorAll(".notification-item")];
    // Stagger removal for smooth cascade
    items.forEach((item, i) => {
      setTimeout(() => _removeItem(item, true), i * 30);
    });
    // After all gone → show empty state + reset total
    setTimeout(() => {
      _ensureEmpty(list);
      _updateTotal(0);
    }, items.length * 30 + 380);
    resetUnread();
  }

  /* ─────────────────────────────────────────────────────────────────
     NOTIFICATION ITEM ENHANCEMENT
     MutationObserver watches list → enriches every new item
  ───────────────────────────────────────────────────────────────── */
  function watchNotificationList() {
    const list = document.getElementById("notification-list");
    if (!list) return;

    // Enrich any items already present (edge case)
    list.querySelectorAll(".notification-item").forEach(_enrichItem);

    const obs = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        m.addedNodes.forEach((node) => {
          if (node.nodeType !== 1 || !node.classList?.contains("notification-item")) return;
          _enrichItem(node);
          // Trigger slide-in
          node.classList.add("is-new");
          setTimeout(() => node.classList.remove("is-new"), 350);
          // Mark unread dot
          if (!_panelOpen) node.classList.add("is-unread");
          incUnread();
          // Trim history
          _trimList(list);
          // Update total count
          _updateTotal(list.querySelectorAll(".notification-item").length);
        });
      });
    });

    obs.observe(list, { childList: true });

    // Swipe observer too
    const swipeObs = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        m.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && node.classList?.contains("notification-item")) {
            _initSwipe(node);
          }
        });
      });
    });
    swipeObs.observe(list, { childList: true });
  }

  function _enrichItem(item) {
    if (item.dataset.enriched) return;
    item.dataset.enriched = "1";
    // Inject delete button
    const btn = document.createElement("button");
    btn.className = "notif-delete-btn";
    btn.title = "Dismiss";
    btn.textContent = "✕";
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      _removeItem(item);
    });
    item.appendChild(btn);
    // Mobile swipe
    _initSwipe(item);
  }

  function _removeItem(item, skipCount) {
    if (item.dataset.removing) return;
    item.dataset.removing = "1";
    // Set explicit height before collapsing
    item.style.maxHeight = item.scrollHeight + "px";
    // Trigger reflow
    void item.offsetHeight;
    item.classList.add("is-removing");

    setTimeout(() => {
      const list = item.closest("#notification-list");
      item.remove();
      if (list) {
        const remaining = list.querySelectorAll(".notification-item").length;
        if (remaining === 0) _ensureEmpty(list);
        if (!skipCount) _updateTotal(remaining);
      }
    }, 380);
  }

  function _trimList(list) {
    const items = list.querySelectorAll(".notification-item");
    if (items.length > MAX_NOTIFICATIONS) {
      items[items.length - 1]?.remove();
    }
  }

  function _ensureEmpty(list) {
    if (!list.querySelector(".notification-empty")) {
      const el = document.createElement("div");
      el.className = "notification-empty";
      el.textContent = "All clear — no notifications";
      list.appendChild(el);
    }
  }

  function _updateTotal(n) {
    const el = document.getElementById("notification-total");
    if (el) el.textContent = n === 0 ? "No alerts" : `${n} alert${n !== 1 ? "s" : ""}`;
  }

  /* ─────────────────────────────────────────────────────────────────
     SWIPE TO DISMISS (mobile)
  ───────────────────────────────────────────────────────────────── */
  function _initSwipe(item) {
    let x0 = 0, dx = 0, active = false;
    const THRESHOLD = 75;

    item.addEventListener("touchstart", (e) => {
      x0 = e.touches[0].clientX;
      active = true;
    }, { passive: true });

    item.addEventListener("touchmove", (e) => {
      if (!active) return;
      dx = e.touches[0].clientX - x0;
      if (dx > 0) {
        item.style.transform = `translateX(${dx}px)`;
        item.style.opacity = String(Math.max(0, 1 - dx / 130));
      }
    }, { passive: true });

    item.addEventListener("touchend", () => {
      if (!active) return;
      active = false;
      if (dx > THRESHOLD) {
        _removeItem(item);
      } else {
        item.style.transform = "";
        item.style.opacity = "";
      }
      dx = 0;
    });
  }

  /* ─────────────────────────────────────────────────────────────────
     TOAST PATCH — wraps showToast for enhanced UX
     Preserves: addNotification feed, Supabase hooks, all callers
  ───────────────────────────────────────────────────────────────── */
  function patchShowToast() {
    // Wait until script.js has defined showToast (it runs synchronously on DOMContentLoaded)
    if (typeof global.showToast !== "function") return;

    const _orig = global.showToast;

    global.showToast = function (type, title, message) {
      const container = document.getElementById("toast-container");

      if (!container) {
        // Fallback to original if container missing
        _orig.call(this, type, title, message);
        return;
      }

      // Build enhanced toast (replaces original DOM creation)
      const toast = document.createElement("div");
      toast.className = `toast toast--${type}`;
      toast.style.setProperty("--toast-duration", TOAST_DURATION + "ms");
      toast.innerHTML = `
        <p class="toast__title">${_esc(title)}</p>
        <p class="toast__msg">${_esc(message)}</p>
        <button class="toast__close" aria-label="Dismiss notification">✕</button>
        <div class="toast__progress" aria-hidden="true"></div>
      `;
      container.appendChild(toast);

      // Feed into notification panel (replicate what original does)
      if (typeof global.addNotification === "function") {
        global.addNotification(type, title, message);
      }

      // Close button
      toast.querySelector(".toast__close").addEventListener("click", () => {
        _dismissToast(toast, "up");
      });

      // Drag-to-dismiss
      _initToastDrag(toast);

      // Auto-dismiss
      const timer = setTimeout(() => _dismissToast(toast, "right"), TOAST_DURATION);
      toast._timer = timer;
    };
  }

  function _dismissToast(toast, dir) {
    if (toast._gone) return;
    toast._gone = true;
    clearTimeout(toast._timer);
    toast.classList.add(dir === "up" ? "is-leaving-up" : "is-leaving");
    setTimeout(() => toast.remove(), 320);
  }

  function _initToastDrag(toast) {
    let x0 = 0, dx = 0, dragging = false;
    const THRESHOLD = 85;

    // Mouse
    toast.addEventListener("mousedown", (e) => {
      if (e.target.classList.contains("toast__close")) return;
      x0 = e.clientX; dragging = true;
      toast.classList.add("is-dragging");
      clearTimeout(toast._timer);
    });

    const onMove = (e) => {
      if (!dragging) return;
      dx = e.clientX - x0;
      if (dx > 0) {
        toast.style.transform = `translateX(${dx}px)`;
        toast.style.opacity = String(Math.max(0, 1 - dx / 160));
      }
    };

    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      toast.classList.remove("is-dragging");
      if (dx > THRESHOLD) {
        _dismissToast(toast, "right");
      } else {
        toast.style.transform = "";
        toast.style.opacity = "";
        // Restart timer with remaining ~half time
        toast._timer = setTimeout(() => _dismissToast(toast, "right"), TOAST_DURATION / 2);
      }
      dx = 0;
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    // Cleanup on remove
    toast.addEventListener("animationend", () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }, { once: true });

    // Touch
    toast.addEventListener("touchstart", (e) => {
      x0 = e.touches[0].clientX;
      dragging = true;
      clearTimeout(toast._timer);
    }, { passive: true });

    toast.addEventListener("touchmove", (e) => {
      if (!dragging) return;
      dx = e.touches[0].clientX - x0;
      if (dx > 0) {
        toast.style.transform = `translateX(${dx}px)`;
        toast.style.opacity = String(Math.max(0, 1 - dx / 140));
      }
    }, { passive: true });

    toast.addEventListener("touchend", () => {
      if (!dragging) return;
      dragging = false;
      if (dx > THRESHOLD) {
        _dismissToast(toast, "right");
      } else {
        toast.style.transform = "";
        toast.style.opacity = "";
        toast._timer = setTimeout(() => _dismissToast(toast, "right"), TOAST_DURATION / 2);
      }
      dx = 0;
    });
  }

  /* ─────────────────────────────────────────────────────────────────
     GLOBAL NOTIFICATION API
     window.NexNotification — accessible from any page/module
  ───────────────────────────────────────────────────────────────── */
  global.NexNotification = {
    /**
     * Fire a notification from anywhere (analytics, fleet, vehicles, etc.)
     * @param {'info'|'success'|'danger'|'delay'|'congestion'} type
     * @param {string} title
     * @param {string} message
     */
    notify(type, title, message) {
      if (typeof global.showToast === "function") {
        global.showToast(type, title, message);
      } else if (typeof global.addNotification === "function") {
        global.addNotification(type, title, message);
      }
    },

    /** Manually reset badge (e.g. after reading all on another page) */
    reset: resetUnread,

    /** Get current unread count */
    getUnread: () => _unread,

    /** Check if panel is open */
    isPanelOpen: () => _panelOpen,
  };

  /* ─────────────────────────────────────────────────────────────────
     HTML ESCAPE UTIL
  ───────────────────────────────────────────────────────────────── */
  function _esc(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ─────────────────────────────────────────────────────────────────
     INIT — wait one tick after DOMContentLoaded so script.js
     bootstrap() has finished and showToast is available
  ───────────────────────────────────────────────────────────────── */
  function init() {
    // Small delay ensures script.js bootstrap() has run
    setTimeout(() => {
      patchPanelToggle();
      injectPanelActions();
      watchNotificationList();
      patchShowToast();
      // Ensure badge starts at zero-hidden
      _syncBadge();
    }, 120);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})(window);
