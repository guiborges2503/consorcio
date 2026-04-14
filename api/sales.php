<?php
declare(strict_types=1);

require_once __DIR__ . '/lib/bootstrap.php';
require_once __DIR__ . '/lib/transform.php';

consorcio_api_begin();
$user = consorcio_require_login();
$pdo = consorcio_pdo();
if (!$pdo) {
    consorcio_json_exit(['success' => false, 'message' => 'Banco indisponível'], 503);
}

$uid = (int) $user['id'];
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $status = trim((string) ($_GET['status'] ?? 'all'));
    $sql = 'SELECT * FROM consorcio_sales WHERE usuario_id = ?';
    $params = [$uid];
    if ($status !== '' && $status !== 'all') {
        $sql .= ' AND status = ?';
        $params[] = $status;
    }
    $sql .= ' ORDER BY sale_date DESC, id DESC';
    $st = $pdo->prepare($sql);
    $st->execute($params);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);
    $list = array_map('consorcio_sale_to_api', $rows);
    consorcio_json_exit(['success' => true, 'sales' => $list]);
}

if ($method === 'POST') {
    $in = consorcio_input_array();
    $clientName = trim((string) ($in['clientName'] ?? ''));
    $cpf = trim((string) ($in['cpf'] ?? ''));
    $phone = trim((string) ($in['phone'] ?? ''));
    if ($clientName === '' || $cpf === '' || $phone === '') {
        consorcio_json_exit(['success' => false, 'message' => 'Nome, CPF e telefone são obrigatórios'], 400);
    }
    $cardValue = (float) ($in['cardValue'] ?? 0);
    if ($cardValue <= 0) {
        consorcio_json_exit(['success' => false, 'message' => 'Valor da carta inválido'], 400);
    }
    $email = trim((string) ($in['email'] ?? ''));
    $productType = trim((string) ($in['productType'] ?? 'Automóvel'));
    $commissionPercent = (float) ($in['commissionPercent'] ?? 4);
    $commission = round($cardValue * $commissionPercent / 100, 2);
    $saleDate = trim((string) ($in['saleDate'] ?? date('Y-m-d')));
    $notes = trim((string) ($in['notes'] ?? ''));
    $installments = (int) ($in['installments'] ?? 80);
    $adminFee = (float) ($in['adminFee'] ?? 20);
    $installmentValue = isset($in['installmentValue']) ? (float) $in['installmentValue'] : null;
    $leadId = isset($in['leadId']) ? (int) $in['leadId'] : null;
    if ($leadId !== null && $leadId > 0) {
        $st = $pdo->prepare('SELECT id FROM consorcio_leads WHERE id = ? AND usuario_id = ?');
        $st->execute([$leadId, $uid]);
        if (!$st->fetchColumn()) {
            $leadId = null;
        }
    } else {
        $leadId = null;
    }

    $st = $pdo->prepare(
        'INSERT INTO consorcio_sales (usuario_id, lead_id, client_name, cpf, phone, email, product_type, card_value, commission, status, sale_date, notes, installments, admin_fee, commission_percent, installment_value)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, \'pending\', ?, ?, ?, ?, ?, ?)'
    );
    $st->execute([
        $uid,
        $leadId,
        $clientName,
        $cpf,
        $phone,
        $email,
        $productType,
        $cardValue,
        $commission,
        $saleDate,
        $notes,
        $installments,
        $adminFee,
        $commissionPercent,
        $installmentValue,
    ]);
    $id = (int) $pdo->lastInsertId();
    $st = $pdo->prepare('SELECT * FROM consorcio_sales WHERE id = ? AND usuario_id = ?');
    $st->execute([$id, $uid]);
    $r = $st->fetch(PDO::FETCH_ASSOC);
    consorcio_json_exit(['success' => true, 'sale' => consorcio_sale_to_api($r)]);
}

consorcio_json_exit(['success' => false, 'message' => 'Método não permitido'], 405);
