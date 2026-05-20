<?php
// ============================================================
//  api/dashboard.php  –  GET  → stats for the dashboard page
// ============================================================

require_once __DIR__ . '/../middleware/auth.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonOut(['error' => 'Method not allowed'], 405);
}

$user   = requireAuth();
$userId = (int) $user['id'];
$db     = getDB();

// Total bookings
$stmt = $db->prepare('SELECT COUNT(*) FROM bookings WHERE user_id = ?');
$stmt->execute([$userId]);
$totalBookings = (int) $stmt->fetchColumn();

// Wishlist count
$stmt = $db->prepare('SELECT COUNT(*) FROM wishlist WHERE user_id = ?');
$stmt->execute([$userId]);
$wishlistCount = (int) $stmt->fetchColumn();

// Recent bookings (last 5)
$stmt = $db->prepare(
    'SELECT id, place_name, category, location, price, image_url, booked_at
       FROM bookings
      WHERE user_id = ?
      ORDER BY booked_at DESC
      LIMIT 5'
);
$stmt->execute([$userId]);
$recentBookings = $stmt->fetchAll();

// Recent wishlist (last 5)
$stmt = $db->prepare(
    'SELECT id, place_name, category, location, price, image_url, saved_at
       FROM wishlist
      WHERE user_id = ?
      ORDER BY saved_at DESC
      LIMIT 5'
);
$stmt->execute([$userId]);
$recentWishlist = $stmt->fetchAll();

jsonOut([
    'user' => [
        'id'        => $user['id'],
        'full_name' => $user['full_name'],
        'email'     => $user['email'],
        'avatar_url'=> $user['avatar_url'],
    ],
    'stats' => [
        'total_bookings' => $totalBookings,
        'wishlist_count' => $wishlistCount,
    ],
    'recent_bookings' => $recentBookings,
    'recent_wishlist' => $recentWishlist,
]);
