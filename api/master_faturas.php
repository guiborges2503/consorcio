<?php
declare(strict_types=1);

require_once __DIR__ . '/lib/bootstrap.php';
require_once __DIR__ . '/lib/billing.php';
require_once __DIR__ . '/lib/audit.php';

consorcio_api_begin();
$master = consorcio_require_master();
$pdo = consorcio_pdo();
if (!$pdo) {
    consorcio_json_exit(['success' => false, 'message' => 'Banco indisponível'], 503);
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    if (isset($_GET['resumo']) && $_GET['resumo'] === '1') {
        try {
            $st = $pdo->query('SELECT * FROM vw_faturas_financeiro_geral LIMIT 1');
            $geral = $st->fetch(PDO::FETCH_ASSOC) ?: [];
        } catch (Throwable $e) {
            $geral = ['a_receber' => 0, 'a_pagar' => 0, 'total_em_aberto' => 0, 'total_pago' => 0];
        }

        $porEmpresa = [];
        try {
            $st = $pdo->query(
                'SELECT empresa_id, empresa_nome, tipo_movimento, status,
                        SUM(valor_total) AS valor_total, SUM(saldo_aberto) AS saldo_aberto
                 FROM vw_faturas_resumo GROUP BY empresa_id, empresa_nome, tipo_movimento, status'
            );
            while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
                $porEmpresa[] = $row;
            }
        } catch (Throwable $e) {
            $porEmpresa = [];
        }

        consorcio_json_exit([
            'success' => true,
            'geral' => [
                'aReceber' => (float) ($geral['a_receber'] ?? 0),
                'aPagar' => (float) ($geral['a_pagar'] ?? 0),
                'totalEmAberto' => (float) ($geral['total_em_aberto'] ?? 0),
                'totalPago' => (float) ($geral['total_pago'] ?? 0),
            ],
            'porEmpresa' => $porEmpresa,
        ]);
    }

    $empresaId = isset($_GET['empresa_id']) ? (int) $_GET['empresa_id'] : 0;
    $faturaId = isset($_GET['id']) ? (int) $_GET['id'] : 0;
    $status = strtoupper(trim((string) ($_GET['status'] ?? '')));

    if ($faturaId > 0) {
        $st = $pdo->prepare(
            'SELECT f.*, e.nome AS empresa_nome FROM consorcio_faturas f
             INNER JOIN consorcio_empresas e ON e.id = f.empresa_id WHERE f.id = ? LIMIT 1'
        );
        $st->execute([$faturaId]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            consorcio_json_exit(['success' => false, 'message' => 'Fatura não encontrada'], 404);
        }
        $itens = consorcio_fetch_fatura_itens($pdo, $faturaId);
        consorcio_json_exit(['success' => true, 'fatura' => consorcio_fatura_to_api($row, $itens)]);
    }

    $sql = 'SELECT f.*, e.nome AS empresa_nome FROM consorcio_faturas f
            INNER JOIN consorcio_empresas e ON e.id = f.empresa_id WHERE 1=1';
    $params = [];
    if ($empresaId > 0) {
        $sql .= ' AND f.empresa_id = ?';
        $params[] = $empresaId;
    }
    if ($status !== '' && in_array($status, ['ABERTA', 'PAGA', 'PARCIAL', 'VENCIDA', 'CANCELADA'], true)) {
        $sql .= ' AND f.status = ?';
        $params[] = $status;
    }
    $sql .= ' ORDER BY f.vencimento DESC, f.id DESC LIMIT 200';

    $st = $pdo->prepare($sql);
    $st->execute($params);
    $list = [];
    while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
        $list[] = consorcio_fatura_to_api($row);
    }

    consorcio_json_exit(['success' => true, 'faturas' => $list]);
}

if ($method === 'POST') {
    $in = consorcio_input_array();
    $action = strtolower(trim((string) ($in['action'] ?? '')));

    if ($action === 'gerar') {
        $empresaId = (int) ($in['empresaId'] ?? 0);
        if ($empresaId <= 0) {
            consorcio_json_exit(['success' => false, 'message' => 'empresaId é obrigatório'], 400);
        }
        try {
            $fatura = consorcio_gerar_fatura_empresa($pdo, $empresaId, (int) $master['id']);
            consorcio_audit_log(
                $pdo,
                'FATURA_GERADA',
                'Fatura gerada',
                $master,
                $empresaId,
                'faturas',
                (string) $fatura['id'],
                'INFO',
                ['numero' => $fatura['numero'], 'valor' => $fatura['valor']]
            );
            consorcio_json_exit(['success' => true, 'fatura' => $fatura]);
        } catch (RuntimeException $e) {
            consorcio_json_exit(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    if ($action === 'baixa_item') {
        $itemId = (int) ($in['itemId'] ?? 0);
        if ($itemId <= 0) {
            consorcio_json_exit(['success' => false, 'message' => 'itemId é obrigatório'], 400);
        }
        try {
            $fatura = consorcio_baixa_fatura_item($pdo, $itemId, $master, $in);
            consorcio_audit_log(
                $pdo,
                'FATURA_BAIXA_ITEM',
                'Pagamento individual validado',
                $master,
                (int) $fatura['empresaId'],
                'faturas',
                (string) $fatura['id'],
                'INFO',
                ['itemId' => $itemId, 'valorPago' => $fatura['valorPago'], 'saldo' => $fatura['saldo']]
            );
            consorcio_json_exit(['success' => true, 'fatura' => $fatura]);
        } catch (RuntimeException $e) {
            consorcio_json_exit(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    if ($action === 'baixa') {
        $faturaId = (int) ($in['faturaId'] ?? 0);
        if ($faturaId <= 0) {
            consorcio_json_exit(['success' => false, 'message' => 'faturaId é obrigatório'], 400);
        }
        try {
            $fatura = consorcio_baixa_fatura($pdo, $faturaId, $master, $in);
            consorcio_audit_log(
                $pdo,
                'FATURA_BAIXA',
                'Pagamento validado pelo master',
                $master,
                (int) $fatura['empresaId'],
                'faturas',
                (string) $faturaId,
                'INFO',
                ['status' => $fatura['status'], 'valorPago' => $fatura['valorPago']]
            );
            consorcio_json_exit(['success' => true, 'fatura' => $fatura]);
        } catch (RuntimeException $e) {
            consorcio_json_exit(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    consorcio_json_exit(['success' => false, 'message' => 'Ação inválida'], 400);
}

consorcio_json_exit(['success' => false, 'message' => 'Método não permitido'], 405);
