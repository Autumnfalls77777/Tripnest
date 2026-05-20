<?php
// ============================================================
//  api/logout.php  –  POST  (no body needed, uses cookie/header)
// ============================================================

require_once __DIR__ . '/../middleware/auth.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonOut(['error' => 'Method not allowed'], 405);
}

$token = getBearerToken();

if ($token) {
    destroySession($token);
}

jsonOut(['message' => 'Logged out successfully']);
