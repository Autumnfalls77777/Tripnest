// ============================================================
//  TripNest – Frontend Script (MySQL Backend Version)
//  All auth, bookings, wishlist now talk to /tripnest-backend/api/
// ============================================================

const API = '../tripnest-backend/api';   // adjust if hosted differently

// ── Auth helpers ──────────────────────────────────────────
async function apiFetch(endpoint, options = {}) {
  const res = await fetch(`${API}/${endpoint}`, {
    credentials: 'include',             // send session cookie automatically
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  return res;
}

async function checkAuth() {
  try {
    const res = await apiFetch('me.php');
    if (!res.ok) return null;
    const data = await res.json();
    return data.user || null;
  } catch {
    return null;
  }
}

// ── Protect pages before DOMContentLoaded ────────────────
(async () => {
  const protectedPages = [
    'dashboard.html', 'start-planning.html', 'planner-setup.html',
    'itinerary-results.html', 'plan-selection.html', 'transport-options.html',
    'transport-list.html', 'find-stays.html', 'stay-results.html'
  ];
  const current = location.pathname.split('/').pop();
  if (protectedPages.includes(current)) {
    const user = await checkAuth();
    if (!user) { location.href = 'signin.html'; }
  }
})();

// ── Main DOMContentLoaded ─────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const currentUser = await checkAuth();

  updateUI(currentUser);
  attachGlobalListeners(currentUser);

  const path = window.location.pathname;
  if (path.includes('signin.html'))           initSignin();
  else if (path.includes('signup.html'))      initSignup();
  else if (path.includes('dashboard.html'))   initDashboard(currentUser);
  else if (path.includes('start-planning.html')) initStartPlanning();
  else if (path.includes('itinerary-results.html')) initItineraryResults();
  else if (path.includes('plan-selection.html'))    initPlanSelection();
  else if (path.includes('planner-setup.html'))     initPlannerSetup();
  else if (path.includes('transport-options.html')) initTransportOptions();
  else if (path.includes('transport-list.html'))    initTransportList();
  else if (path.includes('find-stays.html'))        initFindStays();
  else if (path.includes('stay-results.html'))      initStayResults();

  // Fade-in page transitions
  document.querySelectorAll('a[href]').forEach(a => {
    if (!a.href.startsWith('#') && a.href !== window.location.href) {
      a.addEventListener('click', e => {
        e.preventDefault();
        const href = a.href;
        document.body.style.opacity = '0';
        document.body.style.transition = 'opacity 0.25s ease';
        setTimeout(() => { window.location = href; }, 260);
      });
    }
  });
});

// ── UI Helpers ─────────────────────────────────────────────
function updateUI(user) {
  const authLink = document.getElementById('authLink');
  if (user && authLink) {
    authLink.innerHTML = `<i class="fa-solid fa-user"></i> ${user.full_name.split(' ')[0]}`;
    authLink.href = 'dashboard.html';
  }
}

function setTextIfFound(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerText = text;
}
function setValueIfFound(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

// ── Validation ────────────────────────────────────────────
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());
}

// ── Toast ─────────────────────────────────────────────────
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  let iconClass = 'fa-circle-info';
  if (type === 'success') iconClass = 'fa-check';
  if (type === 'error')   iconClass = 'fa-xmark';
  toast.innerHTML = `<i class="fa-solid ${iconClass}"></i><span>${message}</span>`;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => toast.remove());
  }, 3500);
}

// ── Confirm Modal ─────────────────────────────────────────
function showCustomConfirm(title, message, onConfirm) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal-box';
  modal.innerHTML = `
    <div class="modal-icon"><i class="fa-solid fa-right-from-bracket"></i></div>
    <div class="modal-title">${title}</div>
    <div class="modal-desc">${message}</div>
    <div class="modal-actions">
      <button class="modal-btn cancel">Cancel</button>
      <button class="modal-btn confirm">Logout</button>
    </div>`;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));
  const close = () => {
    overlay.classList.remove('show');
    setTimeout(() => overlay.remove(), 300);
  };
  modal.querySelector('.cancel').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  modal.querySelector('.confirm').addEventListener('click', () => { close(); setTimeout(onConfirm, 300); });
}

// ── Safe JSON/localStorage for trip DRAFT only ─────────────
// (draft is non-sensitive planning state, not user data)
function getDraft()         { try { return JSON.parse(localStorage.getItem('tnDraft') || 'null'); } catch { return null; } }
function setDraft(obj)      { localStorage.setItem('tnDraft', JSON.stringify(obj)); }
function clearDraft()       { localStorage.removeItem('tnDraft'); }

// ── Signin Page ───────────────────────────────────────────
function initSignin() {
  // Add Google button dynamically
  const card = document.querySelector('.auth-card');
  if (card && !document.getElementById('googleBtn')) {
    const divider = document.createElement('div');
    divider.style.cssText = 'display:flex;align-items:center;gap:12px;margin:18px 0;opacity:0.5;';
    divider.innerHTML = '<div style="flex:1;height:1px;background:rgba(245,230,200,0.2)"></div><span style="font-size:12px;white-space:nowrap">OR CONTINUE WITH</span><div style="flex:1;height:1px;background:rgba(245,230,200,0.2)"></div>';

    const googleBtn = document.createElement('a');
    googleBtn.id = 'googleBtn';
    googleBtn.href = `${API}/google_login.php`;
    googleBtn.style.cssText = `
      display:flex;align-items:center;justify-content:center;gap:10px;
      width:100%;padding:13px;border-radius:14px;
      background:rgba(255,255,255,0.06);border:1px solid rgba(245,230,200,0.15);
      color:#F5E6C8;font-family:'Space Grotesk',sans-serif;font-size:14px;font-weight:600;
      cursor:pointer;text-decoration:none;transition:background 0.2s;`;
    googleBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.7 2.5 30.2 0 24 0 14.6 0 6.6 5.6 2.7 13.8l7.8 6C12.4 13.3 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.9 7.2l7.6 5.9c4.5-4.1 7.1-10.2 7.1-17.1z"/><path fill="#FBBC05" d="M10.5 28.2A14.6 14.6 0 0 1 9.5 24c0-1.5.3-2.9.7-4.2l-7.8-6A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6.5z"/><path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.6-5.9c-2 1.4-4.6 2.2-7.6 2.2-6.3 0-11.6-4.2-13.5-9.9l-7.9 6.4C6.5 42.3 14.6 48 24 48z"/></svg>
      Sign in with Google`;
    googleBtn.addEventListener('mouseenter', () => googleBtn.style.background = 'rgba(255,255,255,0.1)');
    googleBtn.addEventListener('mouseleave', () => googleBtn.style.background = 'rgba(255,255,255,0.06)');

    const footer = card.querySelector('.auth-footer');
    if (footer) {
      card.insertBefore(divider, footer);
      card.insertBefore(googleBtn, footer);
    }
  }

  // Check for Google error in URL
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('error')) {
    showToast('Google sign-in failed. Please try again.', 'error');
  }

  const form = document.getElementById('loginForm') || document.querySelector('.auth-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailEl = document.getElementById('username');
    const passEl  = document.getElementById('password');
    const email   = emailEl.value.trim();
    const password = passEl.value.trim();

    if (!validateEmail(email)) {
      showToast('Please enter a valid email address', 'error');
      emailEl.classList.add('error');
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = 'Signing in… <i class="fa-solid fa-spinner fa-spin"></i>';

    try {
      const res  = await apiFetch('signin.php', { method: 'POST', body: JSON.stringify({ email, password }) });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Sign in failed', 'error');
        btn.disabled = false;
        btn.innerHTML = 'Sign In &nbsp;<i class="fa-solid fa-arrow-right-to-bracket"></i>';
        return;
      }

      showToast('Signed in successfully!', 'success');
      setTimeout(() => { window.location.href = 'index.html'; }, 1000);
    } catch {
      showToast('Network error. Please try again.', 'error');
      btn.disabled = false;
      btn.innerHTML = 'Sign In &nbsp;<i class="fa-solid fa-arrow-right-to-bracket"></i>';
    }
  });
}

// ── Signup Page ───────────────────────────────────────────
function initSignup() {
  // Add Google button on signup too
  const card = document.querySelector('.auth-card');
  if (card && !document.getElementById('googleBtn')) {
    const divider = document.createElement('div');
    divider.style.cssText = 'display:flex;align-items:center;gap:12px;margin:18px 0;opacity:0.5;';
    divider.innerHTML = '<div style="flex:1;height:1px;background:rgba(245,230,200,0.2)"></div><span style="font-size:12px;white-space:nowrap">OR SIGN UP WITH</span><div style="flex:1;height:1px;background:rgba(245,230,200,0.2)"></div>';

    const googleBtn = document.createElement('a');
    googleBtn.id = 'googleBtn';
    googleBtn.href = `${API}/google_login.php`;
    googleBtn.style.cssText = `
      display:flex;align-items:center;justify-content:center;gap:10px;
      width:100%;padding:13px;border-radius:14px;
      background:rgba(255,255,255,0.06);border:1px solid rgba(245,230,200,0.15);
      color:#F5E6C8;font-family:'Space Grotesk',sans-serif;font-size:14px;font-weight:600;
      cursor:pointer;text-decoration:none;transition:background 0.2s;`;
    googleBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.7 2.5 30.2 0 24 0 14.6 0 6.6 5.6 2.7 13.8l7.8 6C12.4 13.3 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.9 7.2l7.6 5.9c4.5-4.1 7.1-10.2 7.1-17.1z"/><path fill="#FBBC05" d="M10.5 28.2A14.6 14.6 0 0 1 9.5 24c0-1.5.3-2.9.7-4.2l-7.8-6A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6.5z"/><path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.6-5.9c-2 1.4-4.6 2.2-7.6 2.2-6.3 0-11.6-4.2-13.5-9.9l-7.9 6.4C6.5 42.3 14.6 48 24 48z"/></svg>
      Sign up with Google`;
    googleBtn.addEventListener('mouseenter', () => googleBtn.style.background = 'rgba(255,255,255,0.1)');
    googleBtn.addEventListener('mouseleave', () => googleBtn.style.background = 'rgba(255,255,255,0.06)');

    const footer = card.querySelector('.auth-footer');
    if (footer) {
      card.insertBefore(divider, footer);
      card.insertBefore(googleBtn, footer);
    }
  }

  const form = document.getElementById('signupForm') || document.querySelector('.auth-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name     = document.getElementById('fullname').value.trim();
    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirm  = document.getElementById('confirm_password').value;

    if (!validateEmail(email)) { showToast('Invalid email address', 'error'); return; }
    if (password !== confirm)  { showToast('Passwords do not match!', 'error'); return; }
    if (password.length < 6)   { showToast('Password must be at least 6 characters', 'error'); return; }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = 'Creating Account… <i class="fa-solid fa-spinner fa-spin"></i>';

    try {
      const res  = await apiFetch('signup.php', { method: 'POST', body: JSON.stringify({ full_name: name, email, password }) });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Signup failed', 'error');
        btn.disabled = false;
        btn.innerHTML = 'Create Account &nbsp;<i class="fa-solid fa-user-plus"></i>';
        return;
      }

      showToast('Account created successfully!', 'success');
      setTimeout(() => { window.location.href = 'index.html'; }, 1200);
    } catch {
      showToast('Network error. Please try again.', 'error');
      btn.disabled = false;
      btn.innerHTML = 'Create Account &nbsp;<i class="fa-solid fa-user-plus"></i>';
    }
  });
}

// ── Dashboard ─────────────────────────────────────────────
async function initDashboard(currentUser) {
  if (!currentUser) return;

  // Load stats + recent data
  try {
    const res  = await apiFetch('dashboard.php');
    const data = await res.json();

    const { user, stats, recent_bookings, recent_wishlist } = data;

    setTextIfFound('dashProfileName',  user.full_name);
    setTextIfFound('dashProfileEmail', user.email);
    setTextIfFound('savedTripsCount',  stats.total_bookings);
    setTextIfFound('upcomingTripsCount', stats.total_bookings); // re-use
    setTextIfFound('savedHotelsCount', stats.wishlist_count);

    // Profile avatar
    const avatarEl = document.getElementById('dashProfileImg');
    if (avatarEl && user.avatar_url) avatarEl.src = user.avatar_url;

    renderMiniWishlist(recent_wishlist);
    renderBookingsGrid(recent_bookings);
    renderWishlistGrid(recent_wishlist);
  } catch {
    showToast('Failed to load dashboard data', 'error');
  }

  // View switching
  const navLinks = document.querySelectorAll('.nav-link[data-view]');
  navLinks.forEach(link => {
    link.addEventListener('click', async () => {
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      document.querySelectorAll('.view-section').forEach(v => v.style.display = 'none');
      const targetView = link.getAttribute('data-view');
      document.getElementById(targetView).style.display = 'block';

      if (targetView === 'view-trips') {
        const res  = await apiFetch('bookings.php');
        const data = await res.json();
        renderBookingsGrid(data.bookings || []);
      } else if (targetView === 'view-stays') {
        const res  = await apiFetch('wishlist.php');
        const data = await res.json();
        renderWishlistGrid(data.wishlist || []);
      } else if (targetView === 'view-profile') {
        renderProfile(currentUser);
      }
    });
  });

  // Search input (bookings)
  const searchInput = document.getElementById('dashboardSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', async (e) => {
      const q = e.target.value.toLowerCase();
      const res  = await apiFetch('bookings.php');
      const data = await res.json();
      const filtered = (data.bookings || []).filter(b =>
        b.place_name.toLowerCase().includes(q) || b.location.toLowerCase().includes(q)
      );
      renderBookingsGrid(filtered);
    });
  }

  // Logout
  const logoutBtn = document.getElementById('dashLogoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      showCustomConfirm('Logging Out', 'Are you sure you want to end your session?', async () => {
        await apiFetch('logout.php', { method: 'POST' });
        window.location.href = 'index.html';
      });
    });
  }
}

// ── Dashboard render helpers ──────────────────────────────
function renderMiniWishlist(items = []) {
  const list = document.querySelector('.saved-list');
  if (!list) return;
  if (!items.length) {
    list.innerHTML = '<li style="opacity:0.6">No saved items yet.</li>';
    return;
  }
  list.innerHTML = '';
  items.slice(0, 3).forEach(item => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="item-info" style="display:flex;flex-direction:column">
        <strong>${item.place_name}</strong>
        <span>${item.category} • ${item.price}</span>
      </div>
      <span>${new Date(item.saved_at).toLocaleDateString(undefined,{month:'short',year:'numeric'})}</span>`;
    list.appendChild(li);
  });
}

function renderBookingsGrid(bookings = []) {
  const grid = document.getElementById('tripsGrid');
  if (!grid) return;
  if (!bookings.length) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:40px;border:1px dashed rgba(245,230,200,0.1);border-radius:20px;">
        <i class="fa-solid fa-map-location-dot" style="font-size:40px;color:#2EC4B6;margin-bottom:20px;"></i>
        <h3 style="margin-bottom:10px;color:#F5E6C8;">No bookings yet</h3>
        <p style="opacity:0.6;margin-bottom:20px;">Start exploring and book your first stay!</p>
        <a href="find-stays.html" class="btn2 primary">Find Stays</a>
      </div>`;
    return;
  }
  grid.innerHTML = '';
  bookings.forEach(b => {
    const card = document.createElement('div');
    card.className = 'plan-card';
    card.innerHTML = `
      <div class="plan-tag">${b.category.toUpperCase()}</div>
      ${b.image_url ? `<img src="${b.image_url}" style="width:100%;height:160px;object-fit:cover;border-radius:14px;margin-bottom:12px;">` : ''}
      <div class="plan-title" style="font-size:18px;">${b.place_name}</div>
      <div class="plan-meta"><span><i class="fa-solid fa-location-dot"></i> ${b.location}</span></div>
      <div class="plan-price" style="font-size:20px;">${b.price}</div>
      <div style="font-size:11px;opacity:0.5;margin-top:6px;">Booked ${new Date(b.booked_at).toLocaleDateString()}</div>
      <button class="btn2 ghost" onclick="deleteBooking(${b.id}, this)"
        style="width:100%;justify-content:center;margin-top:12px;color:#FF4D6D;border-color:#FF4D6D;">
        <i class="fa-solid fa-trash"></i> Remove
      </button>`;
    grid.appendChild(card);
  });
}

function renderWishlistGrid(items = []) {
  const grid = document.getElementById('staysGrid');
  if (!grid) return;
  if (!items.length) {
    grid.innerHTML = '<div style="color:#F5E6C8;opacity:0.5;">No saved items yet.</div>';
    return;
  }
  grid.innerHTML = '';
  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'plan-card';
    card.innerHTML = `
      <div class="plan-tag">${item.category.toUpperCase()}</div>
      ${item.image_url ? `<img src="${item.image_url}" style="width:100%;height:160px;object-fit:cover;border-radius:14px;margin-bottom:12px;">` : ''}
      <div class="plan-title" style="margin-top:0;font-size:20px;">${item.place_name}</div>
      <div class="plan-price" style="font-size:22px;">${item.price}<span>/night</span></div>
      <div style="font-size:11px;opacity:0.5;margin-top:6px;">Saved ${new Date(item.saved_at).toLocaleDateString()}</div>
      <button class="btn2 ghost" onclick="removeWishlistItem(${item.id}, this)"
        style="width:100%;justify-content:center;margin-top:10px;color:#FF4D6D;border-color:#FF4D6D;">
        <i class="fa-solid fa-bookmark-slash"></i> Unsave
      </button>`;
    grid.appendChild(card);
  });
}

function renderProfile(user) {
  setTextIfFound('pNameMain', user.full_name);
  setTextIfFound('pEmail',    user.email);
}

// ── Global delete/wishlist actions ────────────────────────
window.deleteBooking = async function(id, btn) {
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; }
  const res = await apiFetch(`bookings.php?id=${id}`, { method: 'DELETE' });
  if (res.ok) {
    showToast('Booking removed', 'info');
    btn?.closest('.plan-card')?.remove();
  } else {
    showToast('Failed to remove booking', 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-trash"></i> Remove'; }
  }
};

window.removeWishlistItem = async function(id, btn) {
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; }
  const res = await apiFetch(`wishlist.php?id=${id}`, { method: 'DELETE' });
  if (res.ok) {
    showToast('Removed from wishlist', 'info');
    btn?.closest('.plan-card')?.remove();
  } else {
    showToast('Failed to remove item', 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-bookmark-slash"></i> Unsave'; }
  }
};

// ── Save Hotel (wishlist) – called from card buttons ──────
window.saveHotel = async function(btn, name, img, price, type) {
  const user = await checkAuth();
  if (!user) { showToast('Please sign in to save stays', 'error'); return; }

  const payload = {
    place_name: name,
    category:   type || 'stay',
    location:   'Unknown',
    price:      price,
    image_url:  img,
  };

  if (btn) { btn.disabled = true; }

  const res  = await apiFetch('wishlist.php', { method: 'POST', body: JSON.stringify(payload) });
  const data = await res.json();

  if (res.ok) {
    showToast(data.is_new ? 'Saved to Dashboard!' : 'Already saved!', data.is_new ? 'success' : 'info');
    if (btn) {
      btn.classList.add('saved');
      btn.innerHTML = '<i class="fa-solid fa-bookmark"></i>';
    }
  } else {
    showToast(data.error || 'Failed to save', 'error');
    if (btn) btn.disabled = false;
  }
};

// ── Book a stay – called from card buttons ────────────────
window.bookStay = async function(btn, name, img, price, type, location) {
  const user = await checkAuth();
  if (!user) {
    showToast('Please sign in to book', 'error');
    setTimeout(() => { window.location.href = 'signin.html'; }, 1200);
    return;
  }

  const payload = {
    place_name: name,
    category:   type || 'hotel',
    location:   location || 'Unknown',
    price:      price,
    image_url:  img,
  };

  if (btn) { btn.disabled = true; btn.innerHTML = 'Booking… <i class="fa-solid fa-spinner fa-spin"></i>'; }

  const res  = await apiFetch('bookings.php', { method: 'POST', body: JSON.stringify(payload) });
  const data = await res.json();

  if (res.ok) {
    showToast('Booking Confirmed! ✓', 'success');
    if (btn) { btn.innerHTML = '<i class="fa-solid fa-check"></i> Booked!'; }
  } else {
    showToast(data.error || 'Booking failed', 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = 'Book Stay'; }
  }
};

// ── Global listeners (plan/stay buttons on index) ─────────
function attachGlobalListeners(user) {
  const planBtn = document.getElementById('planBtn');
  const stayBtn = document.getElementById('stayBtn');

  const blockAccess = (e) => {
    if (!user) {
      e.preventDefault();
      e.stopImmediatePropagation();
      showToast('Please Sign In to access this feature!', 'error');
      setTimeout(() => { window.location.href = 'signin.html'; }, 1500);
    }
  };

  if (planBtn) planBtn.addEventListener('click', blockAccess);
  if (stayBtn) stayBtn.addEventListener('click', blockAccess);
}

// ── Start Planning ────────────────────────────────────────
function initStartPlanning() {
  if (document.getElementById('startDate')) {
    flatpickr('#startDate', { theme: 'dark', minDate: 'today', dateFormat: 'Y-m-d', disableMobile: true });
  }

  const personInput = document.getElementById('personCount');
  const minusBtn    = document.querySelector('.step-btn.minus');
  const plusBtn     = document.querySelector('.step-btn.plus');

  if (personInput && minusBtn && plusBtn) {
    minusBtn.addEventListener('click', () => { let v = parseInt(personInput.value) || 1; if (v > 1) personInput.value = v - 1; });
    plusBtn.addEventListener ('click', () => { let v = parseInt(personInput.value) || 1; personInput.value = v + 1; });
  }

  const form = document.getElementById('planForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const from   = document.getElementById('currentLocation').value;
      const to     = document.getElementById('destination').value;
      const date   = document.getElementById('startDate').value;
      const person = document.getElementById('personCount').value;
      if (from && to && date && person) {
        setDraft({ from, to, date, person });
        showToast(`Awesome! Let's plan ${to}…`, 'success');
        setTimeout(() => { window.location.href = 'plan-selection.html'; }, 1500);
      } else {
        showToast('Please fill all details.', 'error');
      }
    });
  }
}

// ── Plan Selection ────────────────────────────────────────
function initPlanSelection() {
  const draft = getDraft();
  if (draft) {
    const titleEl = document.getElementById('planTitle');
    if (titleEl && draft.to) {
      titleEl.innerHTML = `Planning for <span style="color:#FF9F1C">${draft.to}</span>`;
    }
  }

  const optPlanner   = document.getElementById('optPlanner');
  const optTransport = document.getElementById('optTransport');
  if (optPlanner)   optPlanner.addEventListener  ('click', () => { window.location.href = 'planner-setup.html'; });
  if (optTransport) optTransport.addEventListener('click', () => { window.location.href = 'transport-options.html'; });
}

// ── Planner Setup ─────────────────────────────────────────
function initPlannerSetup() {
  const draft = getDraft();
  if (draft) {
    const nameEl = document.getElementById('destName');
    if (nameEl && draft.to) nameEl.innerText = draft.to;
    if (document.getElementById('returnDate')) {
      flatpickr('#returnDate', { theme: 'dark', minDate: draft.date, dateFormat: 'Y-m-d', disableMobile: true });
    }
  }

  const form = document.getElementById('prefForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const returnDate = document.getElementById('returnDate').value;
      if (returnDate) {
        const d = getDraft() || {};
        d.returnDate = returnDate;
        setDraft(d);
        showToast('Generating magical itineraries…', 'success');
        setTimeout(() => { window.location.href = 'itinerary-results.html'; }, 2000);
      } else {
        showToast('Please select a return date.', 'error');
      }
    });
  }
}

// ── Transport Options ─────────────────────────────────────
function initTransportOptions() {
  ['optRoad','optRail','optAir'].forEach((id, i) => {
    const types = ['road','rail','air'];
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', () => { window.location.href = `transport-list.html?type=${types[i]}`; });
  });
}

// ── Transport List ────────────────────────────────────────
function initTransportList() {
  const params = new URLSearchParams(window.location.search);
  const type   = params.get('type') || 'road';
  const draft  = getDraft() || { from: 'Origin', to: 'Destination' };

  setTextIfFound('transportTypeTitle', type.charAt(0).toUpperCase() + type.slice(1));
  setTextIfFound('routeFrom', draft.from);
  setTextIfFound('routeTo',   draft.to);

  const grid = document.getElementById('transportGrid');
  if (!grid) return;

  const data = {
    air: [
      { name:'Indigo', code:'6E-404', time:'06:30 AM - 08:30 AM', duration:'2h 00m', price:'₹4,500', icon:'fa-plane', url:'https://www.goindigo.in/' },
      { name:'Air India', code:'AI-901', time:'10:00 AM - 12:15 PM', duration:'2h 15m', price:'₹5,200', icon:'fa-plane', url:'https://www.airindia.com/' },
      { name:'SpiceJet', code:'SG-110', time:'05:45 PM - 08:00 PM', duration:'2h 15m', price:'₹6,100', icon:'fa-plane-up', url:'https://www.spicejet.com/' },
    ],
    rail: [
      { name:'Shatabdi Express', code:'12001', time:'06:00 AM - 11:30 AM', duration:'5h 30m', price:'₹1,200', icon:'fa-train', url:'https://www.irctc.co.in/' },
      { name:'Rajdhani Superfast', code:'12951', time:'04:30 PM - 09:00 PM', duration:'4h 30m', price:'₹2,100', icon:'fa-train-subway', url:'https://www.irctc.co.in/' },
      { name:'Intercity Rail', code:'19022', time:'08:00 AM - 03:00 PM', duration:'7h 00m', price:'₹850', icon:'fa-train-tram', url:'https://www.irctc.co.in/' },
    ],
    road: [
      { name:'VoltBus Travels', code:'AC-Sleeper', time:'09:00 PM - 06:00 AM', duration:'9h 00m', price:'₹1,200', icon:'fa-bus', url:'https://www.redbus.in/' },
      { name:'GreenLine Intercity', code:'Volvo Multi-Axle', time:'08:00 AM - 04:00 PM', duration:'8h 00m', price:'₹1,500', icon:'fa-van-shuttle', url:'https://www.redbus.in/' },
      { name:'CityCab One', code:'Sedan', time:'Anytime', duration:'6h 30m', price:'₹4,500', icon:'fa-taxi', url:'https://www.uber.com/' },
    ],
  }[type] || [];

  setTimeout(() => {
    grid.innerHTML = '';
    data.forEach(item => {
      const card = document.createElement('div');
      card.className = 'ticket';
      card.innerHTML = `
        <div class="ticket-top">
          <div class="ticket-chip"><i class="fa-solid ${item.icon}"></i></div>
          <div class="ticket-title"><div class="t-head">${item.name}</div><div class="t-sub">${item.code}</div></div>
          <div class="ticket-stamp">AVAILABLE</div>
        </div>
        <div class="ticket-body">
          <div class="route-row">
            <div class="ticket-code">${draft.from.substring(0,3).toUpperCase()}</div>
            <div class="dot-dot"><div class="dot start"></div><div class="dash"></div><div class="dot end"></div></div>
            <div class="ticket-code">${draft.to.substring(0,3).toUpperCase()}</div>
          </div>
          <div class="route-text" style="display:flex;justify-content:space-between;text-align:center;">
            <div><div class="big">${item.time.split('-')[0]}</div><div class="small">Departure</div></div>
            <div><div class="big" style="opacity:0.6;font-size:13px;">${item.duration}</div></div>
            <div><div class="big">${item.time.split('-')[1]}</div><div class="small">Arrival</div></div>
          </div>
        </div>
        <div class="ticket-bottom">
          <div style="font-size:20px;font-weight:900;color:#2EC4B6;">${item.price}</div>
          <button class="btn2 primary" onclick="bookTransport(this,'${item.name}','${item.price}','${type}','${draft.from} → ${draft.to}')" style="padding:8px 16px;font-size:11px;">BOOK NOW</button>
        </div>`;
      grid.appendChild(card);
    });
  }, 1200);
}

// Book transport to MySQL
window.bookTransport = async function(btn, name, price, type, location) {
  const user = await checkAuth();
  if (!user) { showToast('Please sign in to book', 'error'); return; }

  if (btn) { btn.disabled = true; btn.textContent = 'Booking…'; }

  const res = await apiFetch('bookings.php', {
    method: 'POST',
    body: JSON.stringify({ place_name: name, category: type, location, price, image_url: null }),
  });

  if (res.ok) {
    showToast(`${name} booked successfully!`, 'success');
    if (btn) { btn.innerHTML = '<i class="fa-solid fa-check"></i> Booked!'; }
  } else {
    showToast('Booking failed. Try again.', 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'BOOK NOW'; }
  }
};

// ── Find Stays ────────────────────────────────────────────
function initFindStays() {
  if (document.getElementById('checkInDate')) {
    flatpickr('#checkInDate', { theme: 'dark', minDate: 'today', dateFormat: 'Y-m-d' });
  }

  const personInput = document.getElementById('guestCount');
  const minusBtn    = document.querySelector('.step-btn.minus');
  const plusBtn     = document.querySelector('.step-btn.plus');
  if (personInput && minusBtn && plusBtn) {
    minusBtn.addEventListener('click', () => { let v = parseInt(personInput.value)||1; if(v>1) personInput.value=v-1; });
    plusBtn.addEventListener ('click', () => { let v = parseInt(personInput.value)||1; personInput.value=v+1; });
  }

  const form = document.getElementById('findStaysForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const dest   = document.getElementById('stayDestination').value;
      const date   = document.getElementById('checkInDate').value;
      const guests = document.getElementById('guestCount').value;
      if (dest && date && guests) {
        window.location.href = `stay-results.html?dest=${encodeURIComponent(dest)}&date=${date}&guests=${guests}`;
      } else {
        showToast('Please fill all details', 'error');
      }
    });
  }
}

// ── Stay Results ──────────────────────────────────────────
async function initStayResults() {
  const params = new URLSearchParams(window.location.search);
  const dest   = params.get('dest')   || 'Paradise';
  const date   = params.get('date')   || 'Today';
  const guests = params.get('guests') || 2;

  setTextIfFound('stayDestTitle', dest);
  setTextIfFound('stayDate',   date);
  setTextIfFound('stayGuests', guests);

  const grid = document.getElementById('staysGrid');
  if (!grid) return;

  // Check wishlist first to mark saved state
  let savedNames = new Set();
  try {
    const wRes  = await apiFetch('wishlist.php');
    const wData = await wRes.json();
    savedNames  = new Set((wData.wishlist || []).map(i => i.place_name));
  } catch { /* ignore */ }

  const hotels = [
    { name:'Grand Horizon Hotel',  img:'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80', rating:4.8, type:'Luxury',   price:'₹12,500' },
    { name:'Seaside Boutique Stay', img:'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80', rating:4.5, type:'Boutique', price:'₹7,800' },
    { name:'Urban Comforts Inn',    img:'https://images.unsplash.com/photo-1596436889106-be35e843f974?auto=format&fit=crop&w=600&q=80', rating:4.2, type:'Budget',   price:'₹3,500' },
    { name:'The Royal Heritage',    img:'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=600&q=80', rating:4.9, type:'Heritage', price:'₹18,000' },
    { name:'Cozy Corner B&B',       img:'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80', rating:4.0, type:'Boutique', price:'₹5,200' },
  ];

  setTimeout(() => {
    grid.innerHTML = '';
    hotels.forEach(h => {
      const isSaved   = savedNames.has(h.name);
      const iconClass = isSaved ? 'fa-solid' : 'fa-regular';
      const btnClass  = isSaved ? 'saved' : '';

      const card = document.createElement('div');
      card.className = 'plan-card';
      card.innerHTML = `
        <div class="plan-tag">${h.type.toUpperCase()}</div>
        <img src="${h.img}" style="width:100%;height:180px;object-fit:cover;border-radius:18px;margin-bottom:14px;border:1px solid rgba(245,230,200,0.1);">
        <div class="plan-title" style="margin-top:0;font-size:20px;">${h.name}</div>
        <div class="plan-meta" style="margin-bottom:10px;">
          <span><i class="fa-solid fa-star" style="color:#FF9F1C;"></i> ${h.rating}</span>
          <span><i class="fa-solid fa-location-dot"></i> ${dest}</span>
        </div>
        <div style="display:flex;gap:10px;margin-bottom:14px;opacity:0.7;">
          <i class="fa-solid fa-wifi" title="Free Wifi"></i>
          <i class="fa-solid fa-utensils" title="Breakfast"></i>
          <i class="fa-solid fa-person-swimming" title="Pool"></i>
        </div>
        <div class="plan-price" style="font-size:24px;">${h.price}<span>/night</span></div>
        <div style="display:flex;gap:10px;">
          <button class="btn2 primary" onclick="bookStay(this,'${h.name}','${h.img}','${h.price}','${h.type}','${dest}')" style="flex:1;justify-content:center;">Book Stay</button>
          <button class="btn2 secondary ${btnClass}" onclick="saveHotel(this,'${h.name}','${h.img}','${h.price}','${h.type}')" style="width:50px;justify-content:center;"><i class="${iconClass} fa-bookmark"></i></button>
        </div>`;
      grid.appendChild(card);
    });
  }, 1200);
}

// ── Itinerary Results ─────────────────────────────────────
function initItineraryResults() {
  const urlParams  = new URLSearchParams(window.location.search);
  const savedId    = urlParams.get('savedId');
  const viewIndex  = urlParams.get('viewIndex');
  const draft      = getDraft();

  if (!draft && savedId === null && viewIndex === null) {
    window.location.href = 'index.html';
    return;
  }

  const safeDraft = draft || { to:'Your Destination', from:'', date:'', returnDate:'', person:1 };
  setTextIfFound('resultDest', safeDraft.to);

  let duration = 3;
  if (safeDraft.date && safeDraft.returnDate) {
    const diff = new Date(safeDraft.returnDate) - new Date(safeDraft.date);
    duration   = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  }
  const people = parseInt(safeDraft.person) || 1;
  const plans  = generateDemoPlans(safeDraft, duration, people);
  window.currentResults = plans;

  const grid = document.getElementById('itineraryGrid');
  if (!grid) return;

  if (viewIndex !== null && plans[viewIndex]) {
    const plan = plans[viewIndex];
    const headerTitle = document.querySelector('.results-header h2');
    const headerDesc  = document.querySelector('.results-header p');
    if (headerTitle) headerTitle.innerText = 'Itinerary Details';
    if (headerDesc)  headerDesc.innerText  = `Trip to ${plan.to || safeDraft.to}`;
    grid.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'plan-card highlight';
    card.style.border = '2px solid #2EC4B6';
    card.innerHTML = `
      <div class="plan-tag">${plan.tag}</div>
      <button class="save-btn" onclick="savePlanToBooking(this, ${viewIndex})"><i class="fa-regular fa-bookmark"></i></button>
      <div class="plan-title">${plan.title}</div>
      <div class="plan-meta">
        <span><i class="fa-regular fa-clock"></i> ${plan.duration} Days</span>
        <span><i class="fa-solid fa-user-group"></i> ${people} Person(s)</span>
      </div>
      <div class="plan-price">₹${plan.price.toLocaleString()}<span>/person</span></div>
      <div class="plan-activities">
        ${plan.activities.map(a=>`<div class="activity-item"><i class="fa-solid fa-check"></i><span>${a}</span></div>`).join('')}
      </div>
      <div style="display:flex;gap:10px;margin-top:20px;">
        <button class="btn2 ghost" onclick="history.back()" style="flex:1;">Back</button>
        <button class="btn2 primary" onclick="savePlanToBooking(this, ${viewIndex})" style="flex:1;">Book Now</button>
      </div>`;
    grid.appendChild(card);
    return;
  }

  setTimeout(() => {
    grid.innerHTML = '';
    plans.forEach((plan, index) => {
      const card = document.createElement('div');
      card.className = `plan-card ${index === 1 ? 'highlight' : ''}`;
      card.innerHTML = `
        <div class="plan-tag">${plan.tag}</div>
        <button class="save-btn" onclick="savePlan(this, ${index})"><i class="fa-regular fa-bookmark"></i></button>
        <div class="plan-title">${plan.title}</div>
        <div class="plan-meta">
          <span><i class="fa-regular fa-clock"></i> ${plan.duration} Days</span>
          <span><i class="fa-solid fa-user-group"></i> ${safeDraft.person} Person(s)</span>
        </div>
        <div class="plan-price">₹${plan.price.toLocaleString()}<span>/person</span></div>
        <button class="btn2 ${index===1?'primary':'ghost'}" onclick="window.location.href='itinerary-results.html?viewIndex=${index}'"
          style="width:100%;margin-top:20px;justify-content:center;">View Details</button>`;
      grid.appendChild(card);
    });
  }, 1500);
}

function generateDemoPlans(draft, duration, people) {
  const dest = draft.to;
  return [
    { title:`Essential ${dest}`, tag:'Saver',     price:3500*duration*people, duration, activities:['Budget friendly city tour','Local street food walk','Public transport pass included'] },
    { title:`Best of ${dest}`,   tag:'Top Rated', price:8000*duration*people, duration, activities:['Top 5 tourist attractions entry','4-star hotel stay with breakfast','Private cab for sightseeing'] },
    { title:`Luxury ${dest} Escape`, tag:'Premium', price:18000*duration*people, duration, activities:['Private yacht or exclusive tour','5-star hotel suite','Gourmet dining experience','Personal concierge service'] },
  ];
}

window.savePlan = async function(btn, index) {
  const plan  = window.currentResults?.[index];
  const draft = getDraft() || {};
  if (!plan) return;

  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; }

  const res = await apiFetch('bookings.php', {
    method: 'POST',
    body: JSON.stringify({
      place_name: plan.title,
      category:   'itinerary',
      location:   draft.to || 'Unknown',
      price:      `₹${plan.price.toLocaleString()}`,
      image_url:  null,
    }),
  });

  if (res.ok) {
    showToast('Plan saved to Dashboard!', 'success');
    if (btn) { btn.classList.add('saved'); btn.innerHTML = '<i class="fa-solid fa-bookmark"></i>'; }
  } else {
    showToast('Failed to save plan', 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-regular fa-bookmark"></i>'; }
  }
};

window.savePlanToBooking = window.savePlan;
