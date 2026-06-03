<?php
declare(strict_types=1);

function consorcio_lead_interactions(PDO $pdo, int $leadId): array
{
    $st = $pdo->prepare(
        'SELECT id, type, date, notes FROM consorcio_lead_interactions WHERE lead_id = ? ORDER BY date ASC, id ASC'
    );
    $st->execute([$leadId]);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);
    $out = [];
    foreach ($rows as $r) {
        $out[] = [
            'id' => (string) $r['id'],
            'type' => $r['type'],
            'date' => $r['date'],
            'notes' => $r['notes'] ?? '',
        ];
    }
    return $out;
}

function consorcio_lead_to_api(array $r, array $interactions): array
{
    return [
        'id' => (string) $r['id'],
        'name' => $r['name'],
        'phone' => $r['phone'],
        'email' => $r['email'],
        'status' => $r['status'],
        'lastContact' => $r['last_contact'],
        'nextAction' => $r['next_action'],
        'interest' => (int) $r['interest'],
        'createdAt' => substr((string) $r['created_at'], 0, 10),
        'notes' => $r['notes'] ?? '',
        'interactions' => $interactions,
    ];
}

function consorcio_sale_installment_value(array $r): ?float
{
    $stored = isset($r['installment_value']) ? (float) $r['installment_value'] : 0.0;
    if ($stored > 0) {
        return round($stored, 2);
    }
    $installments = (int) ($r['installments'] ?? 80);
    if ($installments <= 0) {
        return null;
    }
    $remaining = (float) $r['card_value'] - (float) ($r['down_payment'] ?? 0);
    $adminFee = (float) ($r['admin_fee'] ?? 20);
    $totalFinanced = round($remaining + ($remaining * $adminFee / 100), 2);
    if ($totalFinanced <= 0) {
        return null;
    }

    return round($totalFinanced / $installments, 2);
}

/** @return array<int, float> sale_id => soma das parcelas pagas */
function consorcio_paid_installments_by_sale(PDO $pdo, array $saleIds): array
{
    $saleIds = array_values(array_filter(array_map('intval', $saleIds), static fn (int $id): bool => $id > 0));
    if ($saleIds === []) {
        return [];
    }
    $placeholders = implode(',', array_fill(0, count($saleIds), '?'));
    $st = $pdo->prepare(
        "SELECT sale_id, COALESCE(SUM(amount), 0) AS paid
         FROM consorcio_parcelas
         WHERE status = 'paga' AND sale_id IN ({$placeholders})
         GROUP BY sale_id"
    );
    $st->execute($saleIds);
    $out = [];
    foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $out[(int) $row['sale_id']] = (float) $row['paid'];
    }

    return $out;
}

function consorcio_sale_tem_assembleia(PDO $pdo): bool
{
    static $cache = null;
    if ($cache !== null) {
        return $cache;
    }
    try {
        $pdo->query('SELECT lance_ofertado, dia_assembleia, data_assembleia FROM consorcio_sales LIMIT 0');
        $cache = true;
    } catch (Throwable $e) {
        $cache = false;
    }
    return $cache;
}

function consorcio_parse_lance_ofertado(mixed $value): bool
{
    if (is_bool($value)) {
        return $value;
    }
    if (is_int($value) || is_float($value)) {
        return (int) $value === 1;
    }
    $s = strtoupper(trim((string) $value));

    return in_array($s, ['1', 'SIM', 'TRUE', 'YES', 'S'], true);
}

function consorcio_parse_data_assembleia(mixed $value): ?string
{
    $s = trim((string) $value);
    if ($s === '') {
        return null;
    }
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $s)) {
        return null;
    }

    return $s;
}

function consorcio_parse_dia_assembleia(mixed $value): ?int
{
    if ($value === null || $value === '') {
        return null;
    }
    $dia = (int) $value;
    if ($dia < 1 || $dia > 28) {
        return null;
    }

    return $dia;
}

function consorcio_sale_to_api(array $r, ?float $paidInstallments = null): array
{
    $item = [
        'id' => (string) $r['id'],
        'clientName' => $r['client_name'],
        'cardValue' => (float) $r['card_value'],
        'downPayment' => (float) ($r['down_payment'] ?? 0),
        'commission' => (float) $r['commission'],
        'status' => $r['status'],
        'clientStatus' => $r['client_status'] ?? 'ativo',
        'date' => $r['sale_date'],
        'productType' => $r['product_type'],
        'installments' => (int) ($r['installments'] ?? 80),
        'installmentValue' => consorcio_sale_installment_value($r),
        'cpf' => $r['cpf'] ?? '',
        'phone' => $r['phone'] ?? '',
        'email' => $r['email'] ?? '',
        'notes' => $r['notes'] ?? '',
        'adminFee' => (float) ($r['admin_fee'] ?? 20),
        'commissionPercent' => (float) ($r['commission_percent'] ?? 4),
        'sellerName' => isset($r['vendedor_nome']) ? (string) $r['vendedor_nome'] : null,
        'lanceOfertado' => isset($r['lance_ofertado']) ? (int) $r['lance_ofertado'] === 1 : false,
        'diaAssembleia' => isset($r['dia_assembleia']) && $r['dia_assembleia'] !== null
            ? (int) $r['dia_assembleia']
            : null,
        'dataAssembleia' => !empty($r['data_assembleia']) ? (string) $r['data_assembleia'] : null,
    ];
    if ($paidInstallments !== null) {
        $item['paidInstallments'] = round($paidInstallments, 2);
    }

    return $item;
}
