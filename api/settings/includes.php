<?php
if (ob_get_level() === 0) {
    ob_start();
}
require_once __DIR__ . '/app_config.php';
require_once __DIR__ . '/../lib/db_dialect.php';

date_default_timezone_set('America/Sao_Paulo');

function consorcio_pdo(): ?PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    try {
        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
            DB_HOST,
            DB_PORT,
            DB_NAME
        );
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => true,
        ]);
    } catch (Throwable $e) {
        if (defined('DEBUG_MODE') && DEBUG_MODE) {
            error_log('[consorcio] PDO: ' . $e->getMessage());
        }
        return null;
    }
    return $pdo;
}

function consorcio_sessao_iniciar(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    ini_set('session.use_strict_mode', '1');
    $secure =
        (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (isset($_SERVER['HTTP_X_FORWARDED_PROTO'])
            && strtolower((string) $_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https');
    if (PHP_VERSION_ID >= 70300) {
        session_set_cookie_params([
            'lifetime' => SESSION_LIFETIME,
            'path' => SESSION_COOKIE_PATH,
            'httponly' => true,
            'secure' => $secure,
            'samesite' => 'Lax',
        ]);
    } else {
        session_set_cookie_params((int) SESSION_LIFETIME, SESSION_COOKIE_PATH, '', $secure, true);
    }
    session_start();
}

function consorcio_json_headers(): void
{
    if (ob_get_level() > 0) {
        ob_clean();
    }
    header('Content-Type: application/json; charset=utf-8');
}
