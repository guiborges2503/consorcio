<?php
declare(strict_types=1);

/** Gera parcelas; a última absorve centavos quando a divisão não fecha. */
function consorcio_create_installments(
    PDO $pdo,
    int $saleId,
    string $saleDate,
    int $installments,
    float $totalFinanced,
    ?float $installmentPerMonth = null
): void {
    if ($installments <= 0 || $totalFinanced <= 0) {
        return;
    }
    $totalFinanced = round($totalFinanced, 2);
    $parcela = ($installmentPerMonth !== null && $installmentPerMonth > 0)
        ? round($installmentPerMonth, 2)
        : round($totalFinanced / $installments, 2);

    $sumRegular = round($parcela * max(0, $installments - 1), 2);
    $lastAmount = round($totalFinanced - $sumRegular, 2);
    if ($lastAmount <= 0 && $installments > 1) {
        $lastAmount = $parcela;
    }

    $base = new DateTimeImmutable($saleDate);
    $st = $pdo->prepare(
        'INSERT INTO consorcio_parcelas (sale_id, numero, due_date, amount, status)
         VALUES (?, ?, ?, ?, \'pendente\')'
    );
    for ($i = 1; $i <= $installments; $i++) {
        $due = $base->modify("+{$i} month")->format('Y-m-d');
        $amount = ($i === $installments) ? $lastAmount : $parcela;
        $st->execute([$saleId, $i, $due, $amount]);
    }
}

/** Atualiza status de parcelas atrasadas e client_status da venda. */
function consorcio_refresh_sale_client_status(PDO $pdo, int $saleId): void
{
    $today = date('Y-m-d');
    $pdo->prepare(
        "UPDATE consorcio_parcelas SET status = 'atrasada'
         WHERE sale_id = ? AND status = 'pendente' AND due_date < ?"
    )->execute([$saleId, $today]);

    $st = $pdo->prepare(
        "SELECT
            SUM(CASE WHEN status = 'paga' THEN 1 ELSE 0 END) AS pagas,
            SUM(CASE WHEN status = 'atrasada' THEN 1 ELSE 0 END) AS atrasadas,
            COUNT(*) AS total
         FROM consorcio_parcelas WHERE sale_id = ?"
    );
    $st->execute([$saleId]);
    $r = $st->fetch(PDO::FETCH_ASSOC);
    if (!$r || (int) $r['total'] === 0) {
        return;
    }
    $pagas = (int) $r['pagas'];
    $atrasadas = (int) $r['atrasadas'];
    $total = (int) $r['total'];

    if ($pagas >= $total) {
        $clientStatus = 'quitado';
    } elseif ($atrasadas > 0) {
        $clientStatus = 'inadimplente';
    } else {
        $clientStatus = 'ativo';
    }
    $pdo->prepare('UPDATE consorcio_sales SET client_status = ? WHERE id = ?')
        ->execute([$clientStatus, $saleId]);
}

/** Atualiza status de todas as vendas de um usuário. */
function consorcio_refresh_user_sales_status(PDO $pdo, int $userId): void
{
    $st = $pdo->prepare('SELECT id FROM consorcio_sales WHERE usuario_id = ?');
    $st->execute([$userId]);
    while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
        consorcio_refresh_sale_client_status($pdo, (int) $row['id']);
    }
}

function consorcio_parcela_to_api(array $r): array
{
    return [
        'id' => (string) $r['id'],
        'saleId' => (string) $r['sale_id'],
        'numero' => (int) $r['numero'],
        'dueDate' => $r['due_date'],
        'amount' => (float) $r['amount'],
        'paidAt' => $r['paid_at'],
        'status' => $r['status'],
    ];
}

/** @return array{parcelas: array<int, array>, resumo: array<string, int|float>} */
function consorcio_fetch_sale_parcelas(PDO $pdo, int $saleId): array
{
    $emptyResumo = [
        'total' => 0,
        'pagas' => 0,
        'pendentes' => 0,
        'atrasadas' => 0,
        'valorPago' => 0.0,
        'valorPendente' => 0.0,
        'valorAtrasado' => 0.0,
    ];
    if ($saleId <= 0 || !consorcio_parcelas_table_exists($pdo)) {
        return ['parcelas' => [], 'resumo' => $emptyResumo];
    }

    consorcio_refresh_sale_client_status($pdo, $saleId);

    $st = $pdo->prepare('SELECT * FROM consorcio_parcelas WHERE sale_id = ? ORDER BY numero ASC');
    $st->execute([$saleId]);

    $parcelas = [];
    $resumo = $emptyResumo;

    while ($r = $st->fetch(PDO::FETCH_ASSOC)) {
        $parcelas[] = consorcio_parcela_to_api($r);
        $resumo['total']++;
        $amount = (float) $r['amount'];
        $status = (string) $r['status'];
        if ($status === 'paga') {
            $resumo['pagas']++;
            $resumo['valorPago'] += $amount;
        } elseif ($status === 'atrasada') {
            $resumo['atrasadas']++;
            $resumo['valorAtrasado'] += $amount;
        } else {
            $resumo['pendentes']++;
            $resumo['valorPendente'] += $amount;
        }
    }

    $resumo['valorPago'] = round((float) $resumo['valorPago'], 2);
    $resumo['valorPendente'] = round((float) $resumo['valorPendente'], 2);
    $resumo['valorAtrasado'] = round((float) $resumo['valorAtrasado'], 2);

    return ['parcelas' => $parcelas, 'resumo' => $resumo];
}

function consorcio_parcelas_table_exists(PDO $pdo): bool
{
    $st = $pdo->query("SHOW TABLES LIKE 'consorcio_parcelas'");
    return (bool) $st->fetchColumn();
}

function consorcio_sale_total_financed(array $sale): float
{
    $remaining = (float) $sale['card_value'] - (float) ($sale['down_payment'] ?? 0);
    $adminFee = (float) ($sale['admin_fee'] ?? 20);

    return round($remaining + ($remaining * $adminFee / 100), 2);
}

/** Cria parcelas para contratos que ainda não têm (ex.: cadastro antigo). */
function consorcio_sync_missing_installments(PDO $pdo, ?int $userId = null): int
{
    $sql = "SELECT s.* FROM consorcio_sales s
            WHERE NOT EXISTS (SELECT 1 FROM consorcio_parcelas p WHERE p.sale_id = s.id)";
    $params = [];
    if ($userId !== null && $userId > 0) {
        $sql .= ' AND s.usuario_id = ?';
        $params[] = $userId;
    }
    $st = $pdo->prepare($sql);
    $st->execute($params);

    $created = 0;
    while ($sale = $st->fetch(PDO::FETCH_ASSOC)) {
        $installments = (int) ($sale['installments'] ?? 0);
        $totalFinanced = consorcio_sale_total_financed($sale);
        if ($installments <= 0 || $totalFinanced <= 0) {
            continue;
        }
        $parcela = isset($sale['installment_value']) ? (float) $sale['installment_value'] : null;
        consorcio_create_installments(
            $pdo,
            (int) $sale['id'],
            (string) $sale['sale_date'],
            $installments,
            $totalFinanced,
            ($parcela !== null && $parcela > 0) ? $parcela : null
        );
        $created += $installments;
    }

    return $created;
}
