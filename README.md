# 🧳 TripNest — Smart Travel Planner & Booking

> Plan routes, compare travel modes, and find stays near your destination — all in one place.

TripNest is a full-stack travel planning web app that takes the chaos out of trip planning. From picking a destination and figuring out how to get there, to finding a place to stay and keeping track of your bookings — TripNest handles it all in a single, clean interface.

---

## ✨ What It Does

| Feature | Description |
|---|---|
| 🗺️ **Trip Planner** | Enter your origin, destination, and travel dates to kick off your itinerary |
| 🚌 **Transport Options** | Browse transport modes (flight, bus, train, etc.) and compare your options |
| 🏨 **Find Stays** | Search for hotels, guesthouses, and budget stays near your destination |
| 📋 **Itinerary Builder** | Get a structured day-by-day itinerary for your trip |
| 📊 **Dashboard** | Track your bookings, saved stays, and upcoming trips in one place |
| ❤️ **Wishlist** | Save stays or trips you're interested in for later |
| 🔐 **Auth** | Sign up/in with email & password, or continue with Google OAuth |

---

## 🛠️ Tech Stack

### Frontend
- **HTML5 / CSS3 / Vanilla JavaScript** — no framework overhead, just clean and fast
- **Flatpickr** — date picker for travel date selection
- **Font Awesome** — icons throughout the UI
- **Google Fonts** (Outfit + Space Grotesk) — clean, modern typography
- **Canvas API** — custom interactive globe renderer on the planning page (no external lib!)

### Backend
- **PHP** — REST API endpoints handling auth, bookings, wishlist, and user sessions
- **PDO (MySQL)** — database layer with prepared statements to prevent SQL injection
- **Google OAuth 2.0** — "Sign in with Google" support via the OAuth authorization code flow
- **bcrypt** — passwords are hashed with cost factor 12, with automatic rehashing
- **Session tokens** — secure HTTP-only cookies with `SameSite=Lax` and `Secure` flags

### Security
- `.htaccess` blocks direct access to `config/db.php`
- `Options -Indexes` disables directory browsing on the server
- CORS headers locked to trusted origins
- Timing-safe password verification (prevents user enumeration via timing attacks)
- `config/db.php` is `.gitignore`d — credentials never touch the repo

---

## 📁 Project Structure

```
Tripnest/
├── index.html               # Landing page
├── signin.html              # Sign in page
├── signup.html              # Sign up page
├── start-planning.html      # Trip origin/destination entry + globe
├── plan-selection.html      # Plan type selection
├── planner-setup.html       # Detailed trip setup
├── transport-options.html   # Transport mode comparison
├── transport-list.html      # Full transport listing
├── itinerary-results.html   # Generated itinerary view
├── find-stays.html          # Stay search form
├── stay-results.html        # Hotel/stay listings
├── dashboard.html           # User dashboard (bookings, profile, trips)
├── style.css                # Global styles
├── script.js                # Frontend logic (auth, bookings, wishlist, dashboard)
└── tripnest-backend/
    ├── api/
    │   ├── signup.php           # POST – create account
    │   ├── signin.php           # POST – email/password login
    │   ├── logout.php           # POST – destroy session
    │   ├── me.php               # GET  – current user info
    │   ├── google_login.php     # GET  – redirect to Google OAuth
    │   ├── google_callback.php  # GET  – handle OAuth callback
    │   ├── bookings.php         # GET/POST/DELETE – manage bookings
    │   ├── wishlist.php         # GET/POST/DELETE – manage wishlist
    │   └── dashboard.php        # GET  – stats + recent activity
    ├── middleware/
    │   └── auth.php             # Session validation, CORS, helpers
    └── config/
        └── db.php               # ⚠️ NOT in repo – you create this locally
```

---

## 🚀 Getting Started

### Prerequisites
- PHP 8.0+ with PDO and cURL extensions enabled
- MySQL / MariaDB
- A web server (Apache/Nginx) or something like XAMPP / Laragon locally
- A Google Cloud project with OAuth 2.0 credentials (for Google login)

### 1. Clone the repo
```bash
git clone https://github.com/Autumnfalls77777/Tripnest.git
cd Tripnest
```

### 2. Set up the database
Create a MySQL database and run your schema (create `users`, `sessions`, `bookings`, `wishlist` tables).

### 3. Create `tripnest-backend/config/db.php`
This file is **not included in the repo** for security reasons. Create it manually:

```php
<?php
// Database connection
define('DB_HOST', 'localhost');
define('DB_NAME', 'your_db_name');
define('DB_USER', 'your_db_user');
define('DB_PASS', 'your_db_password');

// Google OAuth
define('GOOGLE_CLIENT_ID',     'your-google-client-id');
define('GOOGLE_CLIENT_SECRET', 'your-google-client-secret');
define('GOOGLE_REDIRECT_URI',  'http://localhost/tripnest-backend/api/google_callback.php');

// Sessions
define('SESSION_COOKIE',   'tripnest_session');
define('SESSION_LIFETIME', 60 * 60 * 24 * 7); // 7 days

function getDB(): PDO {
    static $pdo = null;
    if (!$pdo) {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER, DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
             PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
        );
    }
    return $pdo;
}
```

### 4. Configure Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project → APIs & Services → Credentials
3. Create an OAuth 2.0 Client ID (Web application)
4. Add your redirect URI to the allowed list
5. Paste the Client ID and Secret into `db.php`

### 5. Point your web server at the project root and open `index.html`

---

## 🔒 Security Notes

- Database credentials and Google OAuth secrets live only in `config/db.php`, which is `.gitignore`d
- Passwords are hashed with `bcrypt` (cost 12) and never stored in plaintext
- Session tokens are cryptographically random (32 bytes via `random_bytes`)
- SQL queries use PDO prepared statements throughout — no raw interpolation
- HTTP-only, Secure, SameSite cookies protect session tokens from XSS/CSRF

---

## 🙌 Why TripNest?

Most travel tools make you jump between five different tabs — one for flights, one for hotels, one for itineraries, one for your bookings history. TripNest pulls all of that into a single flow. You start planning, pick how you're getting there, find somewhere to sleep, and your dashboard keeps track of everything. No juggling tabs, no re-entering the same destination four times.

It's also built lean — no heavy frameworks, no third-party bloat on the frontend. Just HTML, CSS, and JavaScript doing exactly what they're supposed to.

---

## 📄 License

MIT — do whatever you want with it, just don't blame us if your flight gets delayed.
