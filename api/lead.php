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
    $id = (int) ($_GET['id'] ?? 0);
    if ($id < 1) {
        consorcio_json_exit(['success' => false, 'message' => 'ID inválido'], 400);
    }
    $st = $pdo->prepare('SELECT * FROM consorcio_leads WHERE id = ? AND usuario_id = ?');
    $st->execute([$id, $uid]);
    $r = $st->fetch(PDO::FETCH_ASSOC);
    if (!$r) {
        consorcio_json_exit(['success' => false, 'message' => 'Lead não encontrado'], 404);
    }
    consorcio_json_exit([
        'success' => true,
        'lead' => consorcio_lead_to_api($r, consorcio_lead_interactions($pdo, $id)),
    ]);
}

if ($method === 'PATCH' || $method === 'PUT' || $method === 'POST') {
    $in = consorcio_input_array();
    $id = (int) ($in['id'] ?? $_GET['id'] ?? 0);
    if ($id < 1) {
        consorcio_json_exit(['success' => false, 'message' => 'ID inválido'], 400);
    }
    $st = $pdo->prepare('SELECT * FROM consorcio_leads WHERE id = ? AND usuario_id = ?');
    $st->execute([$id, $uid]);
    $r = $st->fetch(PDO::FETCH_ASSOC);
    if (!$r) {
        consorcio_json_exit(['success' => false, 'message' => 'Lead não encontrado'], 404);
    }

    $fields = [];
    $params = [];
    if (array_key_exists('name', $in)) {
        $fields[] = 'name = ?';
        $params[] = trim((string) $in['name']);
    }
    if (array_key_exists('phone', $in)) {
        $fields[] = 'phone = ?';
        $params[] = trim((string) $in['phone']);
    }
    if (array_key_exists('email', $in)) {
        $fields[] = 'email = ?';
        $params[] = trim((string) $in['email']);
    }
    if (array_key_exists('status', $in) && in_array($in['status'], ['cold', 'warm', 'hot'], true)) {
        $fields[] = 'status = ?';
        $params[] = $in['status'];
    }
    if (array_key_exists('nextAction', $in)) {
        $fields[] = 'next_action = ?';
        $params[] = trim((string) $in['nextAction']);
    }
    if (array_key_exists('interest', $in)) {
        $fields[] = 'interest = ?';
        $params[] = max(0, min(100, (int) $in['interest']));
    }
    if (array_key_exists('notes', $in)) {
        $fields[] = 'notes = ?';
        $params[] = (string) $in['notes'];
    }
    if (array_key_exists('lastContact', $in)) {
        $fields[] = 'last_contact = ?';
        $params[] = (string) $in['lastContact'];
    }

    if ($fields === []) {
        consorcio_json_exit(['success' => false, 'message' => 'Nenhum campo para atualizar'], 400);
    }

    $params[] = $id;
    $params[] = $uid;
    $sql = 'UPDATE consorcio_leads SET ' . implode(', ', $fields) . ' WHERE id = ? AND usuario_id = ?';
    $pdo->prepare($sql)->execute($params);

    $st = $pdo->prepare('SELECT * FROM consorcio_leads WHERE id = ? AND usuario_id = ?');
    $st->execute([$id, $uid]);
    $r = $st->fetch(PDO::FETCH_ASSOC);
    consorcio_json_exit([
        'success' => true,
        'lead' => consorcio_lead_to_api($r, consorcio_lead_interactions($pdo, $id)),
    ]);
}

consorcio_json_exit(['success' => false, 'message' => 'Método não permitido'], 405);
