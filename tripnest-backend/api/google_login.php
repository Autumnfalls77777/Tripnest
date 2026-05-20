<?php
// ============================================================
//  api/google_login.php  –  GET  → redirects to Google OAuth
//  The browser opens this URL directly (not a fetch/XHR call).
// ============================================================

require_once __DIR__ . '/../config/db.php';

$params = http_build_query([
    'client_id'     => GOOGLE_CLIENT_ID,
    'redirect_uri'  => GOOGLE_REDIRECT_URI,
    'response_type' => 'code',
    'scope'         => 'openid email profile',
    'access_type'   => 'online',
    'prompt'        => 'select_account',
]);

$googleAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' . $params;

header('Location: ' . $googleAuthUrl);
exit;
