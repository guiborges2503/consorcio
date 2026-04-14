<?php
if (!defined('APP_NAME')) {
    require_once __DIR__ . '/settings/app_config.php';
}

function setCorsHeaders(): void
{
    $allowed = CORS_ALLOWED_ORIGINS;
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $fb = CORS_FALLBACK_ORIGIN;

    if (is_array($allowed) && $allowed !== [] && $origin !== '' && in_array($origin, $allowed, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Credentials: true');
    } elseif ($fb !== '' && $fb !== '*') {
        header('Access-Control-Allow-Origin: ' . $fb);
        header('Access-Control-Allow-Credentials: true');
    }

    header('Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, PATCH, DELETE');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Access-Control-Max-Age: 86400');

    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}
