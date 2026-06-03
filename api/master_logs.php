<?php
declare(strict_types=1);

require_once __DIR__ . '/lib/bootstrap.php';

consorcio_api_begin();
consorcio_require_master();
$pdo = consorcio_pdo();
if (!$pdo) {
    consorcio_json_exit(['success' => false, 'message' => 'Banco indisponível'], 503);
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    consorcio_json_exit(['success' => false, 'message' => 'Método não permitido'], 405);
}

try {
    $pdo->query('SELECT id FROM consorcio_audit_logs LIMIT 0');
} catch (Throwable $e) {
    consorcio_json_exit([
        'success' => true,
        'logs' => [],
        'total' => 0,
        'page' => 1,
        'limit' => 50,
    ]);
}

$page = max(1, (int) ($_GET['page'] ?? 1));
$limit = min(100, max(10, (int) ($_GET['limit'] ?? 50)));
$offset = ($page - 1) * $limit;

$acao = trim((string) ($_GET['acao'] ?? ''));
$nivel = trim((string) ($_GET['nivel'] ?? ''));
$empresaId = trim((string) ($_GET['empresaId'] ?? ''));
$from = trim((string) ($_GET['from'] ?? ''));
$to = trim((string) ($_GET['to'] ?? ''));
$q = trim((string) ($_GET['q'] ?? ''));

$where = ['1=1'];
$params = [];

if ($acao !== '') {
    $where[] = 'l.acao = ?';
    $params[] = $acao;
}
if ($nivel !== '') {
    $where[] = 'l.nivel = ?';
    $params[] = strtoupper($nivel);
}
if ($empresaId === 'platform') {
    $where[] = 'l.empresa_id IS NULL';
} elseif ($empresaId !== '' && ctype_digit($empresaId)) {
    $where[] = 'l.empresa_id = ?';
    $params[] = (int) $empresaId;
}
if ($from !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $from)) {
    $where[] = 'l.created_at >= ?';
    $params[] = $from . ' 00:00:00';
}
if ($to !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $to)) {
    $where[] = 'l.created_at <= ?';
    $params[] = $to . ' 23:59:59';
}
if ($q !== '') {
    $where[] = '(l.mensagem LIKE ? OR l.acao LIKE ? OR l.recurso LIKE ? OR u.login LIKE ? OR u.nome LIKE ?)';
    $like = '%' . $q . '%';
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
}

$whereSql = implode(' AND ', $where);

$countSt = $pdo->prepare(
    "SELECT COUNT(*)
     FROM consorcio_audit_logs l
     LEFT JOIN consorcio_usuarios u ON u.id = l.usuario_id
     WHERE {$whereSql}"
);
$countSt->execute($params);
$total = (int) $countSt->fetchColumn();

$sql = "SELECT l.*, u.nome AS usuario_nome, u.login AS usuario_login
        FROM consorcio_audit_logs l
        LEFT JOIN consorcio_usuarios u ON u.id = l.usuario_id
        WHERE {$whereSql}
        ORDER BY l.created_at DESC, l.id DESC
        LIMIT {$limit} OFFSET {$offset}";

$st = $pdo->prepare($sql);
$st->execute($params);

$logs = [];
while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
    $payload = null;
    if (!empty($row['payload'])) {
        $decoded = json_decode((string) $row['payload'], true);
        $payload = is_array($decoded) ? $decoded : ['raw' => (string) $row['payload']];
    }
    $logs[] = [
        'id' => (int) $row['id'],
        'empresaId' => $row['empresa_id'] !== null ? (int) $row['empresa_id'] : null,
        'usuarioId' => $row['usuario_id'] !== null ? (int) $row['usuario_id'] : null,
        'usuarioNome' => $row['usuario_nome'] ?? null,
        'usuarioLogin' => $row['usuario_login'] ?? null,
        'nivel' => $row['nivel'],
        'acao' => $row['acao'],
        'recurso' => $row['recurso'],
        'recursoId' => $row['recurso_id'],
        'mensagem' => $row['mensagem'],
        'ip' => $row['ip'],
        'createdAt' => $row['created_at'],
        'payload' => $payload,
    ];
}

$acoesSt = $pdo->query('SELECT DISTINCT acao FROM consorcio_audit_logs ORDER BY acao ASC');
$acoes = [];
while ($a = $acoesSt->fetch(PDO::FETCH_ASSOC)) {
    $acoes[] = (string) $a['acao'];
}

consorcio_json_exit([
    'success' => true,
    'logs' => $logs,
    'total' => $total,
    'page' => $page,
    'limit' => $limit,
    'acoes' => $acoes,
]);
