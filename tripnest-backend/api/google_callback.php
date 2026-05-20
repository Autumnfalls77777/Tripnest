<?php
// ============================================================
//  api/google_callback.php
//  Google redirects here after user approves.
//  Exchanges code → tokens → user info → session → redirect to index.html
// ============================================================

require_once __DIR__ . '/../middleware/auth.php';

// ── 1. Get authorization code ─────────────────────────────
$code  = $_GET['code']  ?? '';
$error = $_GET['error'] ?? '';

if ($error || !$code) {
    header('Location: ../signin.html?error=google_denied');
    exit;
}

// ── 2. Exchange code for tokens ───────────────────────────
$tokenRes = curlPost('https://oauth2.googleapis.com/token', [
    'code'          => $code,
    'client_id'     => GOOGLE_CLIENT_ID,
    'client_secret' => GOOGLE_CLIENT_SECRET,
    'redirect_uri'  => GOOGLE_REDIRECT_URI,
    'grant_type'    => 'authorization_code',
]);

if (empty($tokenRes['access_token'])) {
    header('Location: ../signin.html?error=google_token_fail');
    exit;
}

// ── 3. Fetch user info from Google ────────────────────────
$userInfo = curlGet(
    'https://www.googleapis.com/oauth2/v3/userinfo',
    $tokenRes['access_token']
);

if (empty($userInfo['sub'])) {
    header('Location: ../signin.html?error=google_userinfo_fail');
    exit;
}

$googleId  = $userInfo['sub'];
$email     = strtolower(trim($userInfo['email'] ?? ''));
$fullName  = trim($userInfo['name'] ?? 'Google User');
$avatarUrl = $userInfo['picture'] ?? null;

if (!$email) {
    header('Location: ../signin.html?error=google_no_email');
    exit;
}

// ── 4. Existing/New user in DB ──────────────────────────────────
$db   = getDB();

// Check by google_id first, then by email (account merging)
$stmt = $db->prepare('SELECT id FROM users WHERE google_id = ? OR email = ? LIMIT 1');
$stmt->execute([$googleId, $email]);
$existing = $stmt->fetch();

if ($existing) {
    $userId = (int) $existing['id'];
    // Update google_id + avatar if needed
    $db->prepare('UPDATE users SET google_id = ?, avatar_url = ?, full_name = ? WHERE id = ?')
       ->execute([$googleId, $avatarUrl, $fullName, $userId]);
} else {
    // New user via Google (no password)
    $stmt = $db->prepare(
        'INSERT INTO users (full_name, email, google_id, avatar_url) VALUES (?, ?, ?, ?)'
    );
    $stmt->execute([$fullName, $email, $googleId, $avatarUrl]);
    $userId = (int) $db->lastInsertId();
}

// ── 5. Create session ─────────────────────────────────────
createSession($userId);   // sets the cookie automatically

// ── 6. Redirect to frontend ───────────────────────────────
// Go two levels up from /tripnest-backend/api/ → /
header('Location: ../../tripnest/index.html');
exit;

// ── Helpers ───────────────────────────────────────────────
function curlPost(string $url, array $data): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => http_build_query($data),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);
    $body = curl_exec($ch);
    curl_close($ch);
    return json_decode((string) $body, true) ?? [];
}

function curlGet(string $url, string $accessToken): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $accessToken],
    ]);
    $body = curl_exec($ch);
    curl_close($ch);
    return json_decode((string) $body, true) ?? [];
}
