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
    if (!consorcio_parcelas_table_exists($pdo)) {
        consorcio_json_exit([
            'success' => false,
            'message' => 'Tabela de parcelas não existe. Execute database/schema.sql no phpMyAdmin.',
            'code' => 'SCHEMA',
        ], 503);
    }

    $syncUserId = consorcio_is_admin($user) ? null : $uid;
    if (consorcio_is_admin($user) && isset($_GET['usuario_id']) && (int) $_GET['usuario_id'] > 0) {
        $syncUserId = (int) $_GET['usuario_id'];
    }
    $synced = consorcio_sync_missing_installments($pdo, $syncUserId);

    $saleId = isset($_GET['sale_id']) ? (int) $_GET['sale_id'] : 0;
    $status = trim((string) ($_GET['status'] ?? 'all'));

    if ($saleId > 0) {
        $st = $pdo->prepare('SELECT id FROM consorcio_sales WHERE id = ? AND usuario_id = ?');
        if (consorcio_is_admin($user)) {
            $st = $pdo->prepare('SELECT id FROM consorcio_sales WHERE id = ?');
            $st->execute([$saleId]);
        } else {
            $st->execute([$saleId, $uid]);
        }
        if (!$st->fetchColumn()) {
            consorcio_json_exit(['success' => false, 'message' => 'Contrato não encontrado'], 404);
        }
        consorcio_refresh_sale_client_status($pdo, $saleId);

        $sql = 'SELECT p.*, s.client_name, s.product_type FROM consorcio_parcelas p
                JOIN consorcio_sales s ON s.id = p.sale_id WHERE p.sale_id = ?';
        $params = [$saleId];
        if ($status !== '' && $status !== 'all') {
            $sql .= ' AND p.status = ?';
            $params[] = $status;
        }
        $sql .= ' ORDER BY p.numero ASC';
        $st = $pdo->prepare($sql);
        $st->execute($params);
        $list = [];
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $item = consorcio_parcela_to_api($r);
            $item['clientName'] = $r['client_name'];
            $item['productType'] = $r['product_type'];
            $list[] = $item;
        }
        consorcio_json_exit(['success' => true, 'parcelas' => $list, 'synced' => $synced]);
    }

    $sql = 'SELECT p.*, s.client_name, s.product_type, s.usuario_id
            FROM consorcio_parcelas p
            JOIN consorcio_sales s ON s.id = p.sale_id
            WHERE 1=1';
    $params = [];
    if (!consorcio_is_admin($user)) {
        $sql .= ' AND s.usuario_id = ?';
        $params[] = $uid;
    } elseif (isset($_GET['usuario_id']) && (int) $_GET['usuario_id'] > 0) {
        $sql .= ' AND s.usuario_id = ?';
        $params[] = (int) $_GET['usuario_id'];
    }
    if ($status !== '' && $status !== 'all') {
        $sql .= ' AND p.status = ?';
        $params[] = $status;
    }
    $sql .= ' ORDER BY p.due_date ASC, p.numero ASC LIMIT 200';
    $st = $pdo->prepare($sql);
    $st->execute($params);
    $list = [];
    foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $item = consorcio_parcela_to_api($r);
        $item['clientName'] = $r['client_name'];
        $item['productType'] = $r['product_type'];
        $list[] = $item;
    }
    consorcio_json_exit(['success' => true, 'parcelas' => $list, 'synced' => $synced]);
}

if ($method === 'POST') {
    $in = consorcio_input_array();
    $parcelaId = (int) ($in['id'] ?? 0);
    $action = trim((string) ($in['action'] ?? 'pay'));

    if ($parcelaId <= 0) {
        consorcio_json_exit(['success' => false, 'message' => 'Parcela inválida'], 400);
    }

    $sql = 'SELECT p.*, s.usuario_id FROM consorcio_parcelas p
            JOIN consorcio_sales s ON s.id = p.sale_id WHERE p.id = ?';
    $st = $pdo->prepare($sql);
    $st->execute([$parcelaId]);
    $parcela = $st->fetch(PDO::FETCH_ASSOC);
    if (!$parcela) {
        consorcio_json_exit(['success' => false, 'message' => 'Parcela não encontrada'], 404);
    }
    if (!consorcio_is_admin($user) && (int) $parcela['usuario_id'] !== (int) $user['id']) {
        consorcio_json_exit(['success' => false, 'message' => 'Sem permissão'], 403);
    }

    if ($action === 'pay') {
        $paidAt = trim((string) ($in['paidAt'] ?? date('Y-m-d')));
        $pdo->prepare("UPDATE consorcio_parcelas SET status = 'paga', paid_at = ? WHERE id = ?")
            ->execute([$paidAt, $parcelaId]);
    } elseif ($action === 'unpay') {
        $pdo->prepare("UPDATE consorcio_parcelas SET status = 'pendente', paid_at = NULL WHERE id = ?")
            ->execute([$parcelaId]);
    } else {
        consorcio_json_exit(['success' => false, 'message' => 'Ação inválida'], 400);
    }

    consorcio_refresh_sale_client_status($pdo, (int) $parcela['sale_id']);
    $st = $pdo->prepare('SELECT * FROM consorcio_parcelas WHERE id = ?');
    $st->execute([$parcelaId]);
    consorcio_json_exit(['success' => true, 'parcela' => consorcio_parcela_to_api($st->fetch(PDO::FETCH_ASSOC))]);
}

consorcio_json_exit(['success' => false, 'message' => 'Método não permitido'], 405);
