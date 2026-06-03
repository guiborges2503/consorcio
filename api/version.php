<?php
declare(strict_types=1);

require_once __DIR__ . '/settings/includes.php';
require_once __DIR__ . '/cors.php';

consorcio_json_headers();
setCorsHeaders();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido']);
    exit;
}

header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

echo json_encode([
    'success' => true,
    'appVersion' => APP_VERSION,
], JSON_UNESCAPED_UNICODE);
