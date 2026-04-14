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

function consorcio_sale_to_api(array $r): array
{
    return [
        'id' => (string) $r['id'],
        'clientName' => $r['client_name'],
        'cardValue' => (float) $r['card_value'],
        'commission' => (float) $r['commission'],
        'status' => $r['status'],
        'date' => $r['sale_date'],
        'productType' => $r['product_type'],
    ];
}
