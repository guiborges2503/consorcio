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
    ];
    if ($paidInstallments !== null) {
        $item['paidInstallments'] = round($paidInstallments, 2);
    }

    return $item;
}
