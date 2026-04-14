<?php
require_once __DIR__ . '/settings/includes.php';
require_once __DIR__ . '/cors.php';

consorcio_json_headers();
setCorsHeaders();

$payload = [
    'ok' => true,
    'app' => APP_NAME,
    'time' => date('c'),
];
if (defined('DEBUG_MODE') && DEBUG_MODE) {
    $payload['php'] = PHP_VERSION;
    $payload['pdo_sqlite'] = extension_loaded('pdo_sqlite');
    if (function_exists('consorcio_is_sqlite') && consorcio_is_sqlite() && defined('SQLITE_PATH')) {
        $payload['sqlite_path'] = SQLITE_PATH;
        $payload['sqlite_dir_writable'] = is_writable(dirname(SQLITE_PATH));
    }
}

echo json_encode($payload, JSON_UNESCAPED_UNICODE);
