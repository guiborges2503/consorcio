<?php
declare(strict_types=1);

/**
 * Cria o arquivo SQLite e aplica database/schema.sqlite.sql (primeira execução).
 */
function consorcio_sqlite_install(): void
{
    if (!defined('SQLITE_PATH')) {
        throw new RuntimeException('SQLITE_PATH não definido');
    }
    $schemaFile = dirname(SQLITE_PATH) . DIRECTORY_SEPARATOR . 'schema.sqlite.sql';
    if (!is_readable($schemaFile)) {
        throw new RuntimeException('Arquivo não encontrado: ' . $schemaFile);
    }
    $dir = dirname(SQLITE_PATH);
    if (!is_dir($dir)) {
        if (!mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new RuntimeException('Não foi possível criar: ' . $dir);
        }
    }
    $sql = file_get_contents($schemaFile);
    if ($sql === false) {
        throw new RuntimeException('Falha ao ler schema SQLite');
    }
    $dsn = 'sqlite:' . str_replace('\\', '/', (string) SQLITE_PATH);
    $pdo = new PDO($dsn, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
    $pdo->exec('PRAGMA foreign_keys = OFF');
    $parts = preg_split('/;\s*\R/', $sql);
    if ($parts === false) {
        $parts = [];
    }
    foreach ($parts as $chunk) {
        $stmt = trim($chunk);
        if ($stmt === '') {
            continue;
        }
        $stmt = trim((string) preg_replace('/^\s*--[^\n]*\R?/m', '', $stmt));
        if ($stmt === '') {
            continue;
        }
        $pdo->exec($stmt);
    }
    $pdo->exec('PRAGMA foreign_keys = ON');
}
