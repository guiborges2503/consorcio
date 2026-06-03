<?php
declare(strict_types=1);

require_once __DIR__ . '/lib/bootstrap.php';
require_once __DIR__ . '/lib/transform.php';

consorcio_api_begin();
$user = consorcio_require_consorcio_access();
$pdo = consorcio_pdo();
if (!$pdo) {
    consorcio_json_exit(['success' => false, 'message' => 'Banco indisponível'], 503);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    consorcio_json_exit(['success' => false, 'message' => 'Use POST'], 405);
}

$uid = (int) $user['id'];
$in = consorcio_input_array();
$id = (int) ($in['id'] ?? 0);
$action = trim((string) ($in['action'] ?? $in['status'] ?? ''));

if ($id < 1) {
    consorcio_json_exit(['success' => false, 'message' => 'ID inválido'], 400);
}

$st = $pdo->prepare('SELECT * FROM consorcio_sales WHERE id = ? AND usuario_id = ?');
$st->execute([$id, $uid]);
$r = $st->fetch(PDO::FETCH_ASSOC);
if (!$r) {
    consorcio_json_exit(['success' => false, 'message' => 'Venda não encontrada'], 404);
}

$cur = $r['status'];
$new = $cur;

if ($action === 'approve' || $action === 'approved') {
    if ($cur === 'pending') {
        $new = 'approved';
    }
} elseif ($action === 'pay' || $action === 'paid' || $action === 'confirm') {
    if ($cur === 'approved' || $cur === 'pending') {
        $new = 'paid';
    }
} elseif (in_array($action, ['pending', 'approved', 'paid'], true)) {
    $new = $action;
} else {
    consorcio_json_exit(['success' => false, 'message' => 'Ação inválida'], 400);
}

if ($new === $cur) {
    consorcio_json_exit(['success' => false, 'message' => 'Transição não permitida'], 400);
}

$pdo->prepare('UPDATE consorcio_sales SET status = ? WHERE id = ? AND usuario_id = ?')->execute([$new, $id, $uid]);
$st = $pdo->prepare('SELECT * FROM consorcio_sales WHERE id = ? AND usuario_id = ?');
$st->execute([$id, $uid]);
$r = $st->fetch(PDO::FETCH_ASSOC);
consorcio_json_exit(['success' => true, 'sale' => consorcio_sale_to_api($r)]);
