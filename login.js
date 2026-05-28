/**
 * login.js — NexPort Nexus Secure Access Portal
 *
 * Responsibilities:
 *   1. Supabase Auth — signInWithPassword + session detection
 *   2. Redirect to index.html on authenticated session
 *   3. Form validation — client-side before Supabase call
 *   4. Show/hide password toggle
 *   5. Remember me — persist email in localStorage
 *   6. Button loading state
 *   7. Error display
 *   8. Particle canvas animation
 *   9. Live clock
 *  10. Redirect overlay on success
 *
 * PENTING: File ini standalone. Tidak menyentuh script.js / dashboard.
 */

/* ==========================================================================
   Supabase Config — sama dengan script.js (jangan ubah)
   ========================================================================== */
const SUPABASE_URL = "https://tolfokluxlhynudrxdta.supabase.co";
const SUPABASE_KEY = "sb_publishable_IKTkm1ZGmnvNKo8pG_sfBA_6FVZ5tTH";

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let sb = null;

/* ==========================================================================
   DOM References
   ========================================================================== */
const $ = (id) => document.getElementById(id);

const EL = {
  form:          $("login-form"),
  email:         $("email"),
  password:      $("password"),
  pwToggle:      $("pw-toggle"),
  rememberMe:    $("remember-me"),
  btnLogin:      $("btn-login"),
  btnText:       $("btn-login-text"),
  btnLoading:    $("btn-login-loading"),
  authError:     $("auth-error"),
  authErrorMsg:  $("auth-error-msg"),
  emailErr:      $("email-err"),
  passwordErr:   $("password-err"),
  sessionCheck:  $("session-check"),
  authClock:     $("auth-clock"),
  canvas:        $("particle-canvas"),
};

/* ==========================================================================
   Init — entry point
   ========================================================================== */
document.addEventListener("DOMContentLoaded", async () => {
  initClock();
  initParticles();
  initPasswordToggle();
  restoreRememberedEmail();
  attachLiveValidation();

  // Init Supabase and check for existing session
  try {
    sb = window.supabase?.createClient(SUPABASE_URL, SUPABASE_KEY);
    if (!sb) throw new Error("Supabase SDK not loaded");
    await checkExistingSession();
  } catch (err) {
    console.error("[login] Supabase init error:", err);
    hideSessionCheck();
  }

  EL.form?.addEventListener("submit", handleSubmit);
});

/* ==========================================================================
   Session Detection — redirect immediately if already logged in
   ========================================================================== */
async function checkExistingSession() {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      // Already authenticated — go to dashboard
      showRedirectOverlay();
      return;
    }
  } catch (err) {
    console.warn("[login] Session check failed:", err.message);
  } finally {
    hideSessionCheck();
  }
}

function hideSessionCheck() {
  EL.sessionCheck?.classList.add("is-hidden");
}

/* ==========================================================================
   Form Submit — Supabase signInWithPassword
   ========================================================================== */
async function handleSubmit(e) {
  e.preventDefault();

  // Client-side validation first
  const valid = validateForm();
  if (!valid) return;

  const email    = EL.email.value.trim();
  const password = EL.password.value;
  const remember = EL.rememberMe?.checked ?? false;

  setLoading(true);
  hideError();

  try {
    if (!sb) throw new Error("Database client not initialized. Please refresh.");

    const { data, error } = await sb.auth.signInWithPassword({ email, password });

    if (error) throw error;

    // Persist email if remember me is checked
    if (remember) {
      localStorage.setItem("nexport_remembered_email", email);
    } else {
      localStorage.removeItem("nexport_remembered_email");
    }

    // Success → show overlay then redirect
    showRedirectOverlay();

  } catch (err) {
    console.error("[login] Auth error:", err);
    setLoading(false);
    showError(mapAuthError(err.message));
    // Shake form on error
    EL.form?.classList.add("shake");
    setTimeout(() => EL.form?.classList.remove("shake"), 500);
  }
}

/* ==========================================================================
   Auth Error Messages — user-friendly Indonesian/English
   ========================================================================== */
function mapAuthError(raw) {
  const msg = (raw || "").toLowerCase();

  if (msg.includes("invalid login credentials") || msg.includes("invalid email or password")) {
    return "Email atau password salah. Periksa kembali kredensial Anda.";
  }
  if (msg.includes("email not confirmed")) {
    return "Email belum dikonfirmasi. Cek inbox Anda untuk verifikasi.";
  }
  if (msg.includes("too many requests") || msg.includes("rate limit")) {
    return "Terlalu banyak percobaan login. Tunggu beberapa menit lalu coba lagi.";
  }
  if (msg.includes("user not found")) {
    return "Akun dengan email ini tidak ditemukan.";
  }
  if (msg.includes("network") || msg.includes("fetch")) {
    return "Koneksi gagal. Periksa jaringan internet Anda.";
  }
  if (msg.includes("database client not initialized")) {
    return "Koneksi ke server tidak tersedia. Refresh halaman dan coba lagi.";
  }

  // Fallback — show raw if it's short enough, otherwise generic
  return raw && raw.length < 120
    ? raw
    : "Terjadi kesalahan. Silakan coba lagi.";
}

/* ==========================================================================
   Client-side Validation
   ========================================================================== */
function validateForm() {
  let valid = true;

  // Clear previous errors
  clearFieldError(EL.email, EL.emailErr);
  clearFieldError(EL.password, EL.passwordErr);

  const email    = EL.email?.value?.trim() ?? "";
  const password = EL.password?.value ?? "";

  // Email validation
  if (!email) {
    setFieldError(EL.email, EL.emailErr, "Email wajib diisi.");
    valid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setFieldError(EL.email, EL.emailErr, "Format email tidak valid.");
    valid = false;
  }

  // Password validation
  if (!password) {
    setFieldError(EL.password, EL.passwordErr, "Password wajib diisi.");
    valid = false;
  } else if (password.length < 6) {
    setFieldError(EL.password, EL.passwordErr, "Password minimal 6 karakter.");
    valid = false;
  }

  return valid;
}

function setFieldError(inputEl, errEl, message) {
  inputEl?.classList.add("is-error");
  if (errEl) errEl.textContent = message;
}

function clearFieldError(inputEl, errEl) {
  inputEl?.classList.remove("is-error");
  if (errEl) errEl.textContent = "";
}

function attachLiveValidation() {
  EL.email?.addEventListener("input", () => clearFieldError(EL.email, EL.emailErr));
  EL.password?.addEventListener("input", () => clearFieldError(EL.password, EL.passwordErr));
}

/* ==========================================================================
   Button Loading State
   ========================================================================== */
function setLoading(loading) {
  if (!EL.btnLogin) return;

  EL.btnLogin.disabled = loading;

  if (loading) {
    EL.btnText.hidden    = true;
    EL.btnLoading.hidden = false;
    EL.btnLoading.removeAttribute("aria-hidden");
  } else {
    EL.btnText.hidden    = false;
    EL.btnLoading.hidden = true;
    EL.btnLoading.setAttribute("aria-hidden", "true");
  }
}

/* ==========================================================================
   Error Display
   ========================================================================== */
function showError(message) {
  if (!EL.authError || !EL.authErrorMsg) return;
  EL.authErrorMsg.textContent = message;
  EL.authError.hidden = false;
}

function hideError() {
  if (!EL.authError) return;
  EL.authError.hidden = true;
}

/* ==========================================================================
   Password Show/Hide Toggle
   ========================================================================== */
function initPasswordToggle() {
  EL.pwToggle?.addEventListener("click", () => {
    const isVisible = EL.password?.type === "text";
    if (EL.password) EL.password.type = isVisible ? "password" : "text";
    document.body.dataset.pwVisible = String(!isVisible);
    EL.pwToggle.setAttribute("aria-label", isVisible ? "Show password" : "Hide password");
  });
}

/* ==========================================================================
   Remember Me — restore saved email
   ========================================================================== */
function restoreRememberedEmail() {
  const saved = localStorage.getItem("nexport_remembered_email");
  if (saved && EL.email) {
    EL.email.value = saved;
    if (EL.rememberMe) EL.rememberMe.checked = true;
    // Focus password field instead since email is pre-filled
    EL.password?.focus();
  } else {
    EL.email?.focus();
  }
}

/* ==========================================================================
   Redirect Overlay — shown on successful authentication
   ========================================================================== */
function showRedirectOverlay() {
  const overlay = document.createElement("div");
  overlay.className = "redirect-overlay";
  overlay.setAttribute("role", "status");
  overlay.setAttribute("aria-live", "assertive");
  overlay.innerHTML = `
    <div class="redirect-overlay__logo">
      <svg width="72" height="72" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="redirectLogoGrad" x1="0" y1="0" x2="48" y2="48">
            <stop offset="0%" stop-color="#3CF2FF"/>
            <stop offset="100%" stop-color="#4DA8FF"/>
          </linearGradient>
        </defs>
        <rect x="8" y="18" width="28" height="16" rx="2"
          stroke="url(#redirectLogoGrad)" stroke-width="2"
          style="filter:drop-shadow(0 0 8px rgba(60,242,255,0.7))" />
        <path d="M12 18V12h20v6" stroke="url(#redirectLogoGrad)" stroke-width="2"/>
        <path d="M4 36 Q24 28 44 36" stroke="#3CF2FF" stroke-width="1.5" opacity="0.6"/>
        <circle cx="14" cy="38" r="2" fill="#3CF2FF"/>
        <circle cx="24" cy="35" r="1.5" fill="#4ADE80"/>
        <circle cx="34" cy="38" r="2" fill="#4DA8FF"/>
      </svg>
    </div>
    <p class="redirect-overlay__text">ACCESS GRANTED · LOADING DASHBOARD</p>
    <div class="redirect-overlay__bar">
      <div class="redirect-overlay__bar-fill"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Redirect after progress bar animation completes (1.2s bar + 0.6s offset + buffer)
  setTimeout(() => {
    window.location.href = "index.html";
  }, 2000);
}

/* ==========================================================================
   Live Clock — auth panel bottom
   ========================================================================== */
function initClock() {
  const tick = () => {
    if (!EL.authClock) return;
    const now = new Date();
    EL.authClock.textContent = now.toLocaleString("id-ID", {
      weekday: "short",
      day:     "2-digit",
      month:   "short",
      year:    "numeric",
      hour:    "2-digit",
      minute:  "2-digit",
      second:  "2-digit",
      hour12:  false,
    }) + " WIB";
  };
  tick();
  setInterval(tick, 1000);
}

/* ==========================================================================
   Particle Canvas — floating dots with connections
   ========================================================================== */
function initParticles() {
  const canvas = EL.canvas;
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  let W, H, particles;

  const PARTICLE_COUNT = 55;
  const MAX_DIST       = 130;
  const PARTICLE_SPEED = 0.35;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  class Particle {
    constructor() { this.reset(true); }

    reset(initial = false) {
      this.x  = Math.random() * W;
      this.y  = initial ? Math.random() * H : (Math.random() < 0.5 ? -4 : H + 4);
      this.vx = (Math.random() - 0.5) * PARTICLE_SPEED;
      this.vy = (Math.random() - 0.5) * PARTICLE_SPEED;
      this.r  = Math.random() * 1.5 + 0.5;
      // Random color from brand palette
      const colors = ["rgba(60,242,255,", "rgba(77,168,255,", "rgba(74,222,128,"];
      this.color = colors[Math.floor(Math.random() * colors.length)];
      this.alpha = Math.random() * 0.5 + 0.2;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < -10 || this.x > W + 10 || this.y < -10 || this.y > H + 10) {
        this.reset();
      }
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = this.color + this.alpha + ")";
      ctx.fill();
    }
  }

  function initParticleArray() {
    particles = Array.from({ length: PARTICLE_COUNT }, () => new Particle());
  }

  function drawConnections() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i];
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < MAX_DIST) {
          const alpha = (1 - dist / MAX_DIST) * 0.12;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(60,242,255,${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }
  }

  function loop() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach((p) => { p.update(); p.draw(); });
    drawConnections();
    requestAnimationFrame(loop);
  }

  resize();
  initParticleArray();
  loop();

  window.addEventListener("resize", () => {
    resize();
    initParticleArray();
  }, { passive: true });
}
