<?php
declare(strict_types=1);

require_once __DIR__ . '/lib/bootstrap.php';
require_once __DIR__ . '/lib/transform.php';
require_once __DIR__ . '/lib/installments.php';

consorcio_api_begin();
$user = consorcio_require_login();
$pdo = consorcio_pdo();
if (!$pdo) {
    consorcio_json_exit(['success' => false, 'message' => 'Banco indisponível'], 503);
}

$uid = consorcio_scoped_user_id($user, isset($_GET['usuario_id']) ? (int) $_GET['usuario_id'] : null);
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $status = trim((string) ($_GET['status'] ?? 'all'));
    if (consorcio_is_admin($user)) {
        $sql = 'SELECT * FROM consorcio_sales WHERE 1=1';
        $params = [];
        if (isset($_GET['usuario_id']) && (int) $_GET['usuario_id'] > 0) {
            $sql .= ' AND usuario_id = ?';
            $params[] = (int) $_GET['usuario_id'];
        }
    } else {
        $sql = 'SELECT * FROM consorcio_sales WHERE usuario_id = ?';
        $params = [$uid];
    }
    if ($status !== '' && $status !== 'all') {
        $sql .= ' AND status = ?';
        $params[] = $status;
    }
    $sql .= ' ORDER BY sale_date DESC, id DESC';
    $st = $pdo->prepare($sql);
    $st->execute($params);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);
    $paidBySale = consorcio_paid_installments_by_sale($pdo, array_column($rows, 'id'));
    $list = [];
    $totalEntrada = 0.0;
    $totalRecebido = 0.0;
    foreach ($rows as $row) {
        $saleId = (int) $row['id'];
        $paid = $paidBySale[$saleId] ?? 0.0;
        $list[] = consorcio_sale_to_api($row, $paid);
        $totalEntrada += (float) ($row['down_payment'] ?? 0);
        $totalRecebido += $paid;
    }
    consorcio_json_exit([
        'success' => true,
        'sales' => $list,
        'summary' => [
            'totalEntrada' => round($totalEntrada, 2),
            'totalRecebido' => round($totalRecebido, 2),
        ],
    ]);
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
        consorcio_json_exit(['success' => false, 'message' => 'Valor do contrato inválido'], 400);
    }
    $downPayment = max(0, (float) ($in['downPayment'] ?? 0));
    if ($downPayment >= $cardValue) {
        consorcio_json_exit(['success' => false, 'message' => 'Entrada deve ser menor que o valor total'], 400);
    }
    $email = trim((string) ($in['email'] ?? ''));
    $productType = trim((string) ($in['productType'] ?? 'Automóvel'));
    $commissionPercent = (float) ($in['commissionPercent'] ?? 4);
    $commission = round($cardValue * $commissionPercent / 100, 2);
    $saleDate = trim((string) ($in['saleDate'] ?? date('Y-m-d')));
    $notes = trim((string) ($in['notes'] ?? ''));
    $installments = (int) ($in['installments'] ?? 80);
    $adminFee = (float) ($in['adminFee'] ?? 20);
    $installmentValue = isset($in['installmentValue']) ? round((float) $in['installmentValue'], 2) : null;

    $remaining = round($cardValue - $downPayment, 2);
    $totalFinanced = round($remaining + ($remaining * $adminFee / 100), 2);

    if ($installmentValue === null || $installmentValue <= 0) {
        $installmentValue = $installments > 0 ? round($totalFinanced / $installments, 2) : 0;
    }

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
        'INSERT INTO consorcio_sales (usuario_id, lead_id, client_name, cpf, phone, email, product_type, card_value, down_payment, commission, status, client_status, sale_date, notes, installments, admin_fee, commission_percent, installment_value)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, \'pending\', \'ativo\', ?, ?, ?, ?, ?, ?)'
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
        $downPayment,
        $commission,
        $saleDate,
        $notes,
        $installments,
        $adminFee,
        $commissionPercent,
        $installmentValue,
    ]);
    $id = (int) $pdo->lastInsertId();
    try {
        consorcio_create_installments($pdo, $id, $saleDate, $installments, $totalFinanced, $installmentValue);
    } catch (Throwable $e) {
        if (defined('DEBUG_MODE') && DEBUG_MODE) {
            error_log('[consorcio] parcelas: ' . $e->getMessage());
        }
        consorcio_json_exit([
            'success' => false,
            'message' => 'Contrato salvo, mas falhou ao gerar parcelas. Verifique se a tabela consorcio_parcelas existe no banco.',
        ], 500);
    }

    $st = $pdo->prepare('SELECT * FROM consorcio_sales WHERE id = ? AND usuario_id = ?');
    $st->execute([$id, $uid]);
    $r = $st->fetch(PDO::FETCH_ASSOC);
    consorcio_json_exit(['success' => true, 'sale' => consorcio_sale_to_api($r)]);
}

consorcio_json_exit(['success' => false, 'message' => 'Método não permitido'], 405);
