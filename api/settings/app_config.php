<?php
/**
 * Configuração central do backend PHP (mesmo padrão de pastas do Nortrek: api/settings).
 */

function consorcio_get_environment(): string
{
    $host = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? 'localhost';
    $fwd = $_SERVER['HTTP_X_FORWARDED_HOST'] ?? '';
    $isLocal = function (string $h): bool {
        return strpos($h, 'localhost') !== false || strpos($h, '127.0.0.1') !== false;
    };
    if ($isLocal($host) || ($fwd !== '' && $isLocal($fwd))) {
        return 'development';
    }
    return 'production';
}

$consorcioEnv = consorcio_get_environment();

if ($consorcioEnv === 'development') {
    define('DEBUG_MODE', true);
    define('CORS_ALLOWED_ORIGINS', [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
    ]);
    define('CORS_FALLBACK_ORIGIN', 'http://localhost:5173');
} else {
    define('DEBUG_MODE', false);
    define('CORS_ALLOWED_ORIGINS', []);
    /** Em produção, defina aqui a URL exata do front (ex.: https://app.exemplo.com). */
    define('CORS_FALLBACK_ORIGIN', '');
}

define('APP_NAME', 'consorcio');
define('SESSION_KEY', 'consorcio_user');
/** Path '/' para cookie funcionar com proxy do Vite (mesma origem lógica em dev). */
define('SESSION_COOKIE_PATH', '/');
define('SESSION_LIFETIME', 60 * 60 * 24 * 7);

require_once __DIR__ . '/database.php';
