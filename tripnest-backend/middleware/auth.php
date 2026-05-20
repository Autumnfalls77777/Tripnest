<?php
// ============================================================
//  middleware/auth.php  –  CORS headers + session guard
// ============================================================

require_once __DIR__ . '/../config/db.php';

// -------------------------------------------------------
//  CORS – allow the frontend origin to call this API
//  (Change the origin if your frontend is hosted elsewhere)
// -------------------------------------------------------
function setCorsHeaders(): void {
    $allowed = ['http://localhost', 'http://127.0.0.1', 'null'];
    $origin  = $_SERVER['HTTP_ORIGIN'] ?? '';

    if (in_array($origin, $allowed, true) || $origin === '') {
        header('Access-Control-Allow-Origin: ' . ($origin ?: '*'));
    }

    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Content-Type: application/json; charset=utf-8');

    // Preflight
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

// -------------------------------------------------------
//  JSON helper
// -------------------------------------------------------
function jsonOut(array $data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

// -------------------------------------------------------
//  Read token from cookie OR Authorization header
// -------------------------------------------------------

function getBearerToken(): ?string {
    // 1. Cookie (set by login)
    if (!empty($_COOKIE[SESSION_COOKIE])) {
        return $_COOKIE[SESSION_COOKIE];
    }

    // 2. Authorization: Bearer <token>
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/^Bearer\s+(\S+)$/i', $authHeader, $m)) {
        return $m[1];
    }

    return null;
}

// -------------------------------------------------------
//  Validate session – returns user row or exits with 401
// -------------------------------------------------------
function requireAuth(): array {
    $token = getBearerToken();

    if (!$token) {
        jsonOut(['error' => 'Not authenticated'], 401);
    }

    $db  = getDB();
    $sql = 'SELECT u.id, u.full_name, u.email, u.avatar_url
              FROM sessions s
              JOIN users    u ON u.id = s.user_id
             WHERE s.token = ?
               AND s.expires_at > NOW()
             LIMIT 1';

    $stmt = $db->prepare($sql);
    $stmt->execute([$token]);
    $user = $stmt->fetch();

    if (!$user) {
        jsonOut(['error' => 'Session expired or invalid'], 401);
    }

    return $user;
}

// -------------------------------------------------------
//  Create a new session and set cookie
// -------------------------------------------------------

function createSession(int $userId): string {
    $token     = bin2hex(random_bytes(32));       // 64-char hex
    $expiresAt = date('Y-m-d H:i:s', time() + SESSION_LIFETIME);

    $db   = getDB();
    $stmt = $db->prepare('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)');
    $stmt->execute([$userId, $token, $expiresAt]);

    // Set HTTP-only cookie (Secure flag on HTTPS)
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    setcookie(
        SESSION_COOKIE,
        $token,
        [
            'expires'  => time() + SESSION_LIFETIME,
            'path'     => '/',
            'httponly' => true,
            'secure'   => $secure,
            'samesite' => 'Lax',
        ]
    );

    return $token;
}

// -------------------------------------------------------
//  Delete session (logout)
// -------------------------------------------------------
function destroySession(string $token): void {
    $db   = getDB();
    $stmt = $db->prepare('DELETE FROM sessions WHERE token = ?');
    $stmt->execute([$token]);

    // Clear cookie
    setcookie(SESSION_COOKIE, '', time() - 3600, '/', '', false, true);
}
