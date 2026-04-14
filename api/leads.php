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
    $q = trim((string) ($_GET['q'] ?? ''));
    $status = trim((string) ($_GET['status'] ?? 'all'));
    $sql = 'SELECT * FROM consorcio_leads WHERE usuario_id = ?';
    $params = [$uid];
    if ($status !== '' && $status !== 'all') {
        $sql .= ' AND status = ?';
        $params[] = $status;
    }
    if ($q !== '') {
        $sql .= ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
        $like = '%' . $q . '%';
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
    }
    $sql .= ' ORDER BY last_contact DESC, id DESC';
    $st = $pdo->prepare($sql);
    $st->execute($params);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);
    $list = [];
    foreach ($rows as $r) {
        $list[] = consorcio_lead_to_api($r, []);
    }
    $counts = ['hot' => 0, 'warm' => 0, 'cold' => 0];
    $st2 = $pdo->prepare('SELECT status, COUNT(*) c FROM consorcio_leads WHERE usuario_id = ? GROUP BY status');
    $st2->execute([$uid]);
    while ($row = $st2->fetch(PDO::FETCH_ASSOC)) {
        $counts[$row['status']] = (int) $row['c'];
    }
    consorcio_json_exit(['success' => true, 'leads' => $list, 'counts' => $counts]);
}

if ($method === 'POST') {
    $in = consorcio_input_array();
    $name = trim((string) ($in['name'] ?? ''));
    if ($name === '') {
        consorcio_json_exit(['success' => false, 'message' => 'Nome é obrigatório'], 400);
    }
    $phone = trim((string) ($in['phone'] ?? ''));
    $email = trim((string) ($in['email'] ?? ''));
    $status = $in['status'] ?? 'warm';
    if (!in_array($status, ['cold', 'warm', 'hot'], true)) {
        $status = 'warm';
    }
    $notes = trim((string) ($in['notes'] ?? ''));
    $interest = (int) ($in['interest'] ?? 50);
    $interest = max(0, min(100, $interest));
    $nextAction = trim((string) ($in['nextAction'] ?? 'Definir próxima ação'));
    $today = date('Y-m-d');
    $st = $pdo->prepare(
        'INSERT INTO consorcio_leads (usuario_id, name, phone, email, status, last_contact, next_action, interest, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())'
    );
    $st->execute([$uid, $name, $phone, $email, $status, $today, $nextAction, $interest, $notes]);
    $id = (int) $pdo->lastInsertId();
    $st = $pdo->prepare('SELECT * FROM consorcio_leads WHERE id = ? AND usuario_id = ?');
    $st->execute([$id, $uid]);
    $r = $st->fetch(PDO::FETCH_ASSOC);
    consorcio_json_exit([
        'success' => true,
        'lead' => consorcio_lead_to_api($r, []),
    ]);
}

consorcio_json_exit(['success' => false, 'message' => 'Método não permitido'], 405);
