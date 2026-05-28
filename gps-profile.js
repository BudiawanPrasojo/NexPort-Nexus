/**
 * gps-profile.js — NexPort Nexus · GPS + Profile Patch Module
 *
 * MODULES:
 *   1. User Profile & Role Badge System  (Task 2)
 *   2. GPS Map Vehicle CSS class injection (visual enhancement only)
 *
 * LOAD ORDER: after script.js, enhancements.js
 * DEPS: localStorage keys nexport_user, nexport_role (set by login.js / Supabase)
 */

/* ==========================================================================
   ROLE BADGE — config
   ========================================================================== */
const ROLE_CONFIG = {
  admin:    { label: "Admin",    cls: "role-badge--admin"    },
  operator: { label: "Operator", cls: "role-badge--operator" },
  viewer:   { label: "Viewer",   cls: "role-badge--viewer"   },
  default:  { label: "User",     cls: "role-badge--viewer"   },
};

/* ==========================================================================
   Derive initials from email or name string
   ========================================================================== */
function getInitials(email = "") {
  if (!email) return "NX";
  const local = email.split("@")[0];
  const parts = local.split(/[._\-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

/* ==========================================================================
   Apply role badge classes to an element
   ========================================================================== */
function applyRoleBadge(el, role) {
  if (!el) return;
  // Remove all role classes
  Object.values(ROLE_CONFIG).forEach(c => el.classList.remove(c.cls));
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.default;
  el.classList.add(cfg.cls);
  el.textContent = cfg.label;
}

/* ==========================================================================
   Render profile from localStorage / Supabase session
   ========================================================================== */
function renderUserProfile() {
  // Read stored values — populated by login.js after Supabase auth
  let userEmail = localStorage.getItem("nexport_user") || "";
  let userRole  = (localStorage.getItem("nexport_role") || "admin").toLowerCase();

  // Fallback: try reading from Supabase session if available
  if (!userEmail && window.supabase) {
    try {
      // Non-blocking — best effort
      const sb = window._nexportSB || null;
      if (sb) {
        sb.auth.getSession().then(({ data }) => {
          if (data?.session?.user?.email) {
            userEmail = data.session.user.email;
            _applyProfileUI(userEmail, userRole);
          }
        });
      }
    } catch (_) {}
  }

  _applyProfileUI(userEmail || "admin@nexport.id", userRole);
}

function _applyProfileUI(email, role) {
  const initials = getInitials(email);
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.default;

  // Topbar avatar initials
  const avatarEl = document.getElementById("profile-avatar");
  if (avatarEl) avatarEl.textContent = initials;

  // Topbar email label
  const emailEl = document.getElementById("profile-email");
  if (emailEl) emailEl.textContent = email.length > 22 ? email.split("@")[0] : email;

  // Topbar role badge
  const roleLabel = document.getElementById("profile-role-label");
  if (roleLabel) applyRoleBadge(roleLabel, role);

  // Dropdown avatar
  const ddAvatar = document.getElementById("dropdown-avatar-lg");
  if (ddAvatar) ddAvatar.textContent = initials;

  // Dropdown email
  const ddEmail = document.getElementById("dropdown-email");
  if (ddEmail) ddEmail.textContent = email;

  // Dropdown role badge
  const ddRole = document.getElementById("dropdown-role-badge");
  if (ddRole) applyRoleBadge(ddRole, role);

  // Show/hide admin-only elements based on role
  document.querySelectorAll(".action-admin-only").forEach(el => {
    el.style.display = (role === "admin") ? "" : "none";
  });
}

/* ==========================================================================
   Profile Dropdown — toggle
   ========================================================================== */
function initProfileDropdown() {
  const trigger = document.getElementById("topbar-profile");
  const dropdown = document.getElementById("profile-dropdown");
  if (!trigger || !dropdown) return;

  trigger.addEventListener("click", (e) => {
    const isOpen = dropdown.classList.contains("is-open");
    dropdown.classList.toggle("is-open", !isOpen);
    dropdown.setAttribute("aria-hidden", String(isOpen));
    e.stopPropagation();
  });

  // Close on outside click
  document.addEventListener("click", (e) => {
    if (!trigger.contains(e.target)) {
      dropdown.classList.remove("is-open");
      dropdown.setAttribute("aria-hidden", "true");
    }
  });

  // Logout button
  const logoutBtn = document.getElementById("profile-logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleProfileLogout);
  }
}

/* ==========================================================================
   Logout handler
   ========================================================================== */
async function handleProfileLogout() {
  try {
    // Attempt Supabase sign-out if SDK available
    if (window._nexportSB) {
      await window._nexportSB.auth.signOut();
    } else if (window.supabase?.createClient) {
      // Last resort: try re-creating client from known keys
      const SUPABASE_URL = "https://tolfokluxlhynudrxdta.supabase.co";
      const SUPABASE_KEY = "sb_publishable_IKTkm1ZGmnvNKo8pG_sfBA_6FVZ5tTH";
      const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      await sb.auth.signOut();
    }
  } catch (err) {
    console.warn("[profile] Supabase signOut error:", err);
  }

  // Clear local storage auth keys
  localStorage.removeItem("nexport_user");
  localStorage.removeItem("nexport_role");

  // Redirect to login
  window.location.href = "login.html";
}

/* ==========================================================================
   Init — DOMContentLoaded safe
   ========================================================================== */
function initGPSProfileModule() {
  renderUserProfile();
  initProfileDropdown();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initGPSProfileModule);
} else {
  initGPSProfileModule();
}
