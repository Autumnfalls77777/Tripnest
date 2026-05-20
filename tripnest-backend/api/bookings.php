<?php
// ============================================================
//  api/bookings.php
//  GET  → list bookings for logged-in user
//  POST { place_name, category, location, price, image_url }  → add booking
// ============================================================

require_once __DIR__ . '/../middleware/auth.php';

setCorsHeaders();

$user   = requireAuth();
$userId = (int) $user['id'];
$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// ── GET: fetch all bookings ───────────────────────────────
if ($method === 'GET') {
    $stmt = $db->prepare(
        'SELECT id, place_name, category, location, price, image_url, booked_at
           FROM bookings
          WHERE user_id = ?
          ORDER BY booked_at DESC'
    );
    $stmt->execute([$userId]);
    jsonOut(['bookings' => $stmt->fetchAll()]);
}

// ── POST: add a booking ───────────────────────────────────
if ($method === 'POST') {
    $body      = json_decode(file_get_contents('php://input'), true) ?? [];
    $placeName = trim($body['place_name'] ?? '');
    $category  = trim($body['category']   ?? '');
    $location  = trim($body['location']   ?? '');
    $price     = trim($body['price']      ?? '');
    $imageUrl  = trim($body['image_url']  ?? '') ?: null;

    if (!$placeName || !$category || !$location || !$price) {
        jsonOut(['error' => 'place_name, category, location, and price are required'], 400);
    }

    $stmt = $db->prepare(
        'INSERT INTO bookings (user_id, place_name, category, location, price, image_url)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([$userId, $placeName, $category, $location, $price, $imageUrl]);

    jsonOut([
        'message' => 'Booking confirmed!',
        'booking' => [
            'id'         => (int) $db->lastInsertId(),
            'place_name' => $placeName,
            'category'   => $category,
            'location'   => $location,
            'price'      => $price,
            'image_url'  => $imageUrl,
            'booked_at'  => date('Y-m-d H:i:s'),
        ],
    ], 201);
}

// ── DELETE: remove a booking ──────────────────────────────
if ($method === 'DELETE') {
    $bookingId = (int) ($_GET['id'] ?? 0);
    if (!$bookingId) {
        jsonOut(['error' => 'id query param required'], 400);
    }

    // Only delete if it belongs to the current user
    $stmt = $db->prepare('DELETE FROM bookings WHERE id = ? AND user_id = ?');
    $stmt->execute([$bookingId, $userId]);

    if ($stmt->rowCount() === 0) {
        jsonOut(['error' => 'Booking not found'], 404);
    }

    jsonOut(['message' => 'Booking removed']);
}

jsonOut(['error' => 'Method not allowed'], 405);
