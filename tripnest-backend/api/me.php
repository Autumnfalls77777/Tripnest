<?php
// ============================================================
//  api/me.php  –  GET  → returns current logged-in user data
// ============================================================

require_once __DIR__ . '/../middleware/auth.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonOut(['error' => 'Method not allowed'], 405);
}

$user = requireAuth();

jsonOut([
    'user' => [
        'id'        => $user['id'],
        'full_name' => $user['full_name'],
        'email'     => $user['email'],
        'avatar_url'=> $user['avatar_url'],
    ]
]);
