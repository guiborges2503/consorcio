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

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    consorcio_json_exit(['success' => false, 'message' => 'Use POST'], 405);
}

$uid = (int) $user['id'];
$in = consorcio_input_array();
$leadId = (int) ($in['leadId'] ?? 0);
$type = (string) ($in['type'] ?? 'call');
if (!in_array($type, ['call', 'whatsapp', 'email', 'meeting'], true)) {
    consorcio_json_exit(['success' => false, 'message' => 'Tipo de interação inválido'], 400);
}
$notes = trim((string) ($in['notes'] ?? ''));
$clearNext = !empty($in['clearNextAction']);
$date = trim((string) ($in['date'] ?? ''));
if ($date === '' || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    $date = date('Y-m-d');
}

$st = $pdo->prepare('SELECT id FROM consorcio_leads WHERE id = ? AND usuario_id = ?');
$st->execute([$leadId, $uid]);
if (!$st->fetchColumn()) {
    consorcio_json_exit(['success' => false, 'message' => 'Lead não encontrado'], 404);
}

$pdo->beginTransaction();
try {
    $st = $pdo->prepare(
        'INSERT INTO consorcio_lead_interactions (lead_id, type, date, notes) VALUES (?, ?, ?, ?)'
    );
    $st->execute([$leadId, $type, $date, $notes]);

    $next = $clearNext ? '' : null;
    if ($clearNext) {
        $pdo->prepare(
            'UPDATE consorcio_leads SET last_contact = ?, next_action = ? WHERE id = ? AND usuario_id = ?'
        )->execute([$date, '', $leadId, $uid]);
    } else {
        $pdo->prepare(
            'UPDATE consorcio_leads SET last_contact = ? WHERE id = ? AND usuario_id = ?'
        )->execute([$date, $leadId, $uid]);
    }
    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    if (DEBUG_MODE) {
        error_log('[consorcio] lead_interaction: ' . $e->getMessage());
    }
    consorcio_json_exit(['success' => false, 'message' => 'Erro ao salvar'], 500);
}

$st = $pdo->prepare('SELECT * FROM consorcio_leads WHERE id = ? AND usuario_id = ?');
$st->execute([$leadId, $uid]);
$r = $st->fetch(PDO::FETCH_ASSOC);
consorcio_json_exit([
    'success' => true,
    'lead' => consorcio_lead_to_api($r, consorcio_lead_interactions($pdo, $leadId)),
]);
