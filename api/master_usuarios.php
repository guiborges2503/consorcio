<?php
declare(strict_types=1);

require_once __DIR__ . '/lib/bootstrap.php';
require_once __DIR__ . '/lib/audit.php';

consorcio_api_begin();
$master = consorcio_require_master();
$pdo = consorcio_pdo();
if (!$pdo) {
    consorcio_json_exit(['success' => false, 'message' => 'Banco indisponível'], 503);
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

function consorcio_hash_senha_master_usuario(string $senha): string
{
    return (strlen($senha) === 32 && ctype_xdigit($senha))
        ? strtolower($senha)
        : md5($senha);
}

function consorcio_master_user_to_api(array $r): array
{
    return [
        'id' => (int) $r['id'],
        'login' => $r['login'],
        'nome' => $r['nome'],
        'email' => $r['email'],
        'role' => 'MASTER',
        'status' => $r['status'],
        'empresaId' => null,
        'monthGoal' => 0,
    ];
}

function consorcio_count_masters_ativos(PDO $pdo, ?int $exceptId = null): int
{
    if ($exceptId !== null) {
        $st = $pdo->prepare(
            "SELECT COUNT(*) FROM consorcio_usuarios WHERE role = 'MASTER' AND status = 'ATIVO' AND id != ?"
        );
        $st->execute([$exceptId]);
    } else {
        $st = $pdo->query(
            "SELECT COUNT(*) FROM consorcio_usuarios WHERE role = 'MASTER' AND status = 'ATIVO'"
        );
    }
    return (int) $st->fetchColumn();
}

function consorcio_fetch_master(PDO $pdo, int $id): ?array
{
    $st = $pdo->prepare(
        "SELECT id, login, nome, email, status FROM consorcio_usuarios WHERE id = ? AND role = 'MASTER' LIMIT 1"
    );
    $st->execute([$id]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

if ($method === 'GET') {
    $st = $pdo->query(
        "SELECT id, login, nome, email, status FROM consorcio_usuarios WHERE role = 'MASTER' ORDER BY nome ASC"
    );
    $users = [];
    while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
        $users[] = consorcio_master_user_to_api($row);
    }
    consorcio_json_exit(['success' => true, 'users' => $users]);
}

$in = consorcio_input_array();

if ($method === 'POST') {
    $login = trim((string) ($in['login'] ?? ''));
    $nome = trim((string) ($in['nome'] ?? ''));
    $email = trim((string) ($in['email'] ?? ''));
    $senha = (string) ($in['senha'] ?? '');

    if ($login === '' || $nome === '' || $email === '' || $senha === '') {
        consorcio_json_exit(['success' => false, 'message' => 'Login, nome, e-mail e senha são obrigatórios'], 400);
    }
    if (strlen($senha) < 6) {
        consorcio_json_exit(['success' => false, 'message' => 'Senha deve ter ao menos 6 caracteres'], 400);
    }

    $st = $pdo->prepare('SELECT id FROM consorcio_usuarios WHERE login = ? OR email = ? LIMIT 1');
    $st->execute([$login, $email]);
    if ($st->fetchColumn()) {
        consorcio_audit_log(
            $pdo,
            'MASTER_CRIAR_FALHA',
            'Tentativa de criar master com login/e-mail duplicado',
            $master,
            null,
            'masters',
            '',
            'SECURITY',
            ['login' => $login, 'email' => $email]
        );
        consorcio_json_exit(['success' => false, 'message' => 'Login ou e-mail já cadastrado'], 409);
    }

    $hasCobrar = false;
    try {
        $pdo->query('SELECT cobrar_fatura FROM consorcio_usuarios LIMIT 0');
        $hasCobrar = true;
    } catch (Throwable $ignored) {
    }

    if ($hasCobrar) {
        $st = $pdo->prepare(
            'INSERT INTO consorcio_usuarios (login, senha, nome, email, status, role, cobrar_fatura, empresa_id, month_goal)
             VALUES (?, ?, ?, ?, \'ATIVO\', \'MASTER\', 0, NULL, 0)'
        );
    } else {
        $st = $pdo->prepare(
            'INSERT INTO consorcio_usuarios (login, senha, nome, email, status, role, empresa_id, month_goal)
             VALUES (?, ?, ?, ?, \'ATIVO\', \'MASTER\', NULL, 0)'
        );
    }
    $st->execute([$login, consorcio_hash_senha_master_usuario($senha), $nome, $email]);
    $newId = (int) $pdo->lastInsertId();

    $created = consorcio_fetch_master($pdo, $newId);
    consorcio_audit_log(
        $pdo,
        'MASTER_CRIADO',
        "Master {$login} criado",
        $master,
        null,
        'masters',
        (string) $newId,
        'SECURITY',
        ['login' => $login, 'nome' => $nome, 'email' => $email]
    );

    consorcio_json_exit(['success' => true, 'user' => consorcio_master_user_to_api($created ?? ['id' => $newId, 'login' => $login, 'nome' => $nome, 'email' => $email, 'status' => 'ATIVO'])]);
}

if ($method === 'PATCH') {
    $id = (int) ($in['id'] ?? 0);
    if ($id <= 0) {
        consorcio_json_exit(['success' => false, 'message' => 'ID inválido'], 400);
    }

    $target = consorcio_fetch_master($pdo, $id);
    if (!$target) {
        consorcio_json_exit(['success' => false, 'message' => 'Usuário master não encontrado'], 404);
    }

    $masterId = (int) ($master['id'] ?? 0);
    $nome = array_key_exists('nome', $in) ? trim((string) $in['nome']) : (string) $target['nome'];
    $email = array_key_exists('email', $in) ? trim((string) $in['email']) : (string) $target['email'];
    $senha = array_key_exists('senha', $in) ? (string) $in['senha'] : '';
    $status = array_key_exists('status', $in)
        ? strtoupper(trim((string) $in['status']))
        : (string) $target['status'];

    if ($nome === '' || $email === '') {
        consorcio_json_exit(['success' => false, 'message' => 'Nome e e-mail são obrigatórios'], 400);
    }
    if ($status !== 'ATIVO' && $status !== 'INATIVO') {
        consorcio_json_exit(['success' => false, 'message' => 'Status inválido'], 400);
    }
    if ($senha !== '' && strlen($senha) < 6) {
        consorcio_json_exit(['success' => false, 'message' => 'Senha deve ter ao menos 6 caracteres'], 400);
    }

    if ($status === 'INATIVO') {
        if ($id === $masterId) {
            consorcio_json_exit(['success' => false, 'message' => 'Você não pode desativar sua própria conta'], 400);
        }
        if (consorcio_count_masters_ativos($pdo, $id) < 1) {
            consorcio_json_exit(['success' => false, 'message' => 'Deve existir ao menos um master ativo'], 400);
        }
    }

    $st = $pdo->prepare(
        'SELECT id FROM consorcio_usuarios WHERE (login = ? OR email = ?) AND id != ? LIMIT 1'
    );
    $st->execute([$target['login'], $email, $id]);
    if ($st->fetchColumn()) {
        consorcio_json_exit(['success' => false, 'message' => 'E-mail já cadastrado para outro usuário'], 409);
    }

    $sets = ['nome = ?', 'email = ?', 'status = ?'];
    $params = [$nome, $email, $status];
    if ($senha !== '') {
        $sets[] = 'senha = ?';
        $params[] = consorcio_hash_senha_master_usuario($senha);
    }
    $params[] = $id;

    $st = $pdo->prepare('UPDATE consorcio_usuarios SET ' . implode(', ', $sets) . ' WHERE id = ? AND role = \'MASTER\'');
    $st->execute($params);

    $updated = consorcio_fetch_master($pdo, $id);
    $acao = 'MASTER_ATUALIZADO';
    if ($status !== $target['status']) {
        $acao = $status === 'ATIVO' ? 'MASTER_ATIVADO' : 'MASTER_DESATIVADO';
    }
    consorcio_audit_log(
        $pdo,
        $acao,
        "Master {$target['login']} atualizado",
        $master,
        null,
        'masters',
        (string) $id,
        'SECURITY',
        [
            'login' => $target['login'],
            'statusAnterior' => $target['status'],
            'statusNovo' => $status,
            'senhaAlterada' => $senha !== '',
        ]
    );

    consorcio_json_exit(['success' => true, 'user' => consorcio_master_user_to_api($updated ?? $target)]);
}

consorcio_json_exit(['success' => false, 'message' => 'Método não permitido'], 405);
