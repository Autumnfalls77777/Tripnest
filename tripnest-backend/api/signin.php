<?php
// ============================================================
//  api/signin.php  –  POST  { email, password }
// ============================================================

require_once __DIR__ . '/../middleware/auth.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonOut(['error' => 'Method not allowed'], 405);
}

// ── Read JSON body ────────────────────────────────────────
$body     = json_decode(file_get_contents('php://input'), true) ?? [];
$email    = strtolower(trim($body['email'] ?? ''));
$password = $body['password'] ?? '';

if (!$email || !$password) {
    jsonOut(['error' => 'Email and password are required'], 400);
}

// ── Lookup user ───────────────────────────────────────────
$db   = getDB();
$stmt = $db->prepare('SELECT id, full_name, email, password, avatar_url FROM users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
$user = $stmt->fetch();

// Constant-time check even on missing user (prevents timing attacks)
$dummyHash = '$2y$12$InvalidHashForTimingProtection00000000000000000000000000';
$hash      = $user['password'] ?? $dummyHash;

if (!$user || !password_verify($password, $hash)) {
    jsonOut(['error' => 'Invalid email or password'], 401);
}

// Re-hash if bcrypt cost changed
if (password_needs_rehash($hash, PASSWORD_BCRYPT, ['cost' => 12])) {
    $newHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    $db->prepare('UPDATE users SET password = ? WHERE id = ?')
       ->execute([$newHash, $user['id']]);
}

// ── Create session ────────────────────────────────────────
$token = createSession((int) $user['id']);

jsonOut([
    'message' => 'Signed in successfully',
    'token'   => $token,
    'user'    => [
        'id'        => $user['id'],
        'full_name' => $user['full_name'],
        'email'     => $user['email'],
        'avatar_url'=> $user['avatar_url'],
    ],
]);
