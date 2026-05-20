<?php
// ============================================================
//  api/wishlist.php
//  GET    → list wishlist items for logged-in user
//  POST   { place_name, category, location, price, image_url } → save item
//  DELETE ?id=N  → remove item
// ============================================================

require_once __DIR__ . '/../middleware/auth.php';

setCorsHeaders();

$user   = requireAuth();
$userId = (int) $user['id'];
$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// ── GET ───────────────────────────────────────────────────
if ($method === 'GET') {
    $stmt = $db->prepare(
        'SELECT id, place_name, category, location, price, image_url, saved_at
           FROM wishlist
          WHERE user_id = ?
          ORDER BY saved_at DESC'
    );
    $stmt->execute([$userId]);
    jsonOut(['wishlist' => $stmt->fetchAll()]);
}

// ── POST: save to wishlist ────────────────────────────────
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
    #400 = error

    // INSERT IGNORE honours the UNIQUE KEY so double-saves are silent
    $stmt = $db->prepare(
        'INSERT IGNORE INTO wishlist (user_id, place_name, category, location, price, image_url)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([$userId, $placeName, $category, $location, $price, $imageUrl]);

    $isNew = $stmt->rowCount() > 0;

    jsonOut([
        'message'  => $isNew ? 'Saved to wishlist!' : 'Already in wishlist',
        'is_new'   => $isNew,
        'wishlist_item' => [
            'place_name' => $placeName,
            'category'   => $category,
            'location'   => $location,
            'price'      => $price,
            'image_url'  => $imageUrl,
        ],
    ], $isNew ? 201 : 200);
}

// ── DELETE ────────────────────────────────────────────────
if ($method === 'DELETE') {
    $itemId = (int) ($_GET['id'] ?? 0);
    if (!$itemId) {
        jsonOut(['error' => 'id query param required'], 400);
    }

    $stmt = $db->prepare('DELETE FROM wishlist WHERE id = ? AND user_id = ?');
    $stmt->execute([$itemId, $userId]);

    if ($stmt->rowCount() === 0) {
        jsonOut(['error' => 'Wishlist item not found'], 404);
    }

    jsonOut(['message' => 'Removed from wishlist']);
}

jsonOut(['error' => 'Method not allowed'], 405);
