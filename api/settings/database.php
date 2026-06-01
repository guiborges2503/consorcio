<?php
/**
 * MySQL via PDO.
 * Copie database.local.example.php → database.local.php para credenciais (gitignored).
 */

if (is_file(__DIR__ . '/database.local.php')) {
    require_once __DIR__ . '/database.local.php';
}

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
