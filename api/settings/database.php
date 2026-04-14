<?php
/**
 * Banco: SQLite (padrão) ou MySQL.
 * Copie database.local.example.php → database.local.php para sobrescrever.
 */

if (is_file(__DIR__ . '/database.local.php')) {
    require_once __DIR__ . '/database.local.php';
}

if (!defined('CONSORCIO_DB_DRIVER')) {
    define('CONSORCIO_DB_DRIVER', 'sqlite');
}

if (CONSORCIO_DB_DRIVER === 'sqlite') {
    if (!defined('SQLITE_PATH')) {
        define('SQLITE_PATH', dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'database' . DIRECTORY_SEPARATOR . 'consorcio.sqlite');
    }
} else {
    if (!defined('DB_HOST')) {
        define('DB_HOST', '127.0.0.1');
    }
    if (!defined('DB_PORT')) {
        define('DB_PORT', '3306');
    }
    if (!defined('DB_NAME')) {
        define('DB_NAME', 'consorcio');
    }
    if (!defined('DB_USER')) {
        define('DB_USER', 'root');
    }
    if (!defined('DB_PASS')) {
        define('DB_PASS', '');
    }
}
