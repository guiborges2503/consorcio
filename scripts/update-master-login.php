<?php
/** One-off: alinha login master ao usuário esperado. Rode: php scripts/update-master-login.php */
require_once __DIR__ . '/../api/settings/includes.php';

$pdo = consorcio_pdo();
if (!$pdo) {
    fwrite(STDERR, "Banco indisponível\n");
    exit(1);
}

$pdo->exec("UPDATE consorcio_usuarios SET login = 'adriano.riquetti' WHERE id = 1 AND role = 'MASTER'");
$row = $pdo->query("SELECT id, login, email, role FROM consorcio_usuarios WHERE id = 1")->fetch(PDO::FETCH_ASSOC);
echo json_encode($row, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL;
