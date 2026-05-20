<?php
// ============================================================
//  api/signup.php  –  POST  { full_name, email, password }
// ============================================================

require_once __DIR__ . '/../middleware/auth.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonOut(['error' => 'Method not allowed'], 405);
}

// ── Read JSON body ────────────────────────────────────────
$body     = json_decode(file_get_contents('php://input'), true) ?? [];
$fullName = trim($body['full_name'] ?? '');
$email    = strtolower(trim($body['email'] ?? ''));
$password = $body['password'] ?? '';

// ── Validate ──────────────────────────────────────────────
if (!$fullName || !$email || !$password) {
    jsonOut(['error' => 'All fields are required'], 400);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonOut(['error' => 'Invalid email address'], 400);
}

if (strlen($password) < 6) {
    jsonOut(['error' => 'Password must be at least 6 characters'], 400);
}

// ── Check duplicate ───────────────────────────────────────
$db   = getDB();
$stmt = $db->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);

if ($stmt->fetch()) {
    jsonOut(['error' => 'Email already registered. Please sign in.'], 409);
}

// ── Insert user ───────────────────────────────────────────
$hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
$stmt = $db->prepare('INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)');
$stmt->execute([$fullName, $email, $hash]);

$userId = (int) $db->lastInsertId();

// ── Create session ────────────────────────────────────────
$token = createSession($userId);

jsonOut([
    'message' => 'Account created successfully',
    'token'   => $token,
    'user'    => [
        'id'        => $userId,
        'full_name' => $fullName,
        'email'     => $email,
        'avatar_url'=> null,
    ],
], 201);
