<?php
declare(strict_types=1);

require_once __DIR__ . '/lib/bootstrap.php';

consorcio_api_begin();
$admin = consorcio_require_admin();
$pdo = consorcio_pdo();
if (!$pdo) {
    consorcio_json_exit(['success' => false, 'message' => 'Banco indisponível'], 503);
}

$empresaId = consorcio_admin_empresa_id($pdo, $admin);
if ($empresaId === null || $empresaId <= 0) {
    consorcio_json_exit(['success' => false, 'message' => 'Admin sem empresa vinculada'], 403);
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$adminId = (int) $admin['id'];

function consorcio_hash_senha_user(string $senha): string
{
    return (strlen($senha) === 32 && ctype_xdigit($senha))
        ? strtolower($senha)
        : md5($senha);
}

function consorcio_user_to_api(array $r): array
{
    return [
        'id' => (int) $r['id'],
        'login' => $r['login'],
        'nome' => $r['nome'],
        'email' => $r['email'],
        'role' => strtoupper((string) ($r['role'] ?? 'VENDEDOR')),
        'status' => $r['status'],
        'monthGoal' => (float) $r['month_goal'],
    ];
}

if ($method === 'GET') {
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
    if ($id > 0) {
        $st = $pdo->prepare(
            'SELECT id, login, nome, email, role, status, month_goal FROM consorcio_usuarios
             WHERE id = ? AND empresa_id = ? LIMIT 1'
        );
        $st->execute([$id, $empresaId]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            consorcio_json_exit(['success' => false, 'message' => 'Usuário não encontrado'], 404);
        }
        consorcio_json_exit(['success' => true, 'user' => consorcio_user_to_api($row)]);
    }

    $st = $pdo->prepare(
        'SELECT id, login, nome, email, role, status, month_goal FROM consorcio_usuarios
         WHERE empresa_id = ? AND role IN (\'ADMIN\', \'VENDEDOR\')
         ORDER BY nome ASC'
    );
    $st->execute([$empresaId]);
    $list = [];
    while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
        $list[] = consorcio_user_to_api($row);
    }
    consorcio_json_exit(['success' => true, 'users' => $list]);
}

if ($method === 'POST') {
    $in = consorcio_input_array();
    $login = trim((string) ($in['login'] ?? ''));
    $nome = trim((string) ($in['nome'] ?? ''));
    $email = trim((string) ($in['email'] ?? ''));
    $senha = (string) ($in['senha'] ?? '');
    $role = strtoupper(trim((string) ($in['role'] ?? 'VENDEDOR')));
    $status = 'ATIVO';
    $monthGoal = (float) ($in['monthGoal'] ?? 500000);

    if ($login === '' || $nome === '' || $email === '' || $senha === '') {
        consorcio_json_exit(['success' => false, 'message' => 'Login, nome, e-mail e senha são obrigatórios'], 400);
    }
    if (strlen($senha) < 6) {
        consorcio_json_exit(['success' => false, 'message' => 'Senha deve ter ao menos 6 caracteres'], 400);
    }
    if (!in_array($role, ['ADMIN', 'VENDEDOR'], true)) {
        $role = 'VENDEDOR';
    }
    if ($role === 'ADMIN') {
        $st = $pdo->prepare(
            "SELECT id FROM consorcio_usuarios WHERE empresa_id = ? AND role = 'ADMIN' AND status = 'ATIVO' LIMIT 1"
        );
        $st->execute([$empresaId]);
        if ($st->fetchColumn()) {
            consorcio_json_exit(['success' => false, 'message' => 'Empresa já possui um administrador ativo'], 400);
        }
    }
    if (!in_array($status, ['ATIVO', 'INATIVO'], true)) {
        $status = 'ATIVO';
    }

    $st = $pdo->prepare('SELECT id FROM consorcio_usuarios WHERE login = ? OR email = ? LIMIT 1');
    $st->execute([$login, $email]);
    if ($st->fetchColumn()) {
        consorcio_json_exit(['success' => false, 'message' => 'Login ou e-mail já cadastrado'], 400);
    }

    $st = $pdo->prepare(
        'INSERT INTO consorcio_usuarios (login, senha, nome, email, status, role, empresa_id, month_goal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $st->execute([$login, consorcio_hash_senha_user($senha), $nome, $email, $status, $role, $empresaId, $monthGoal]);
    $newId = (int) $pdo->lastInsertId();

    $st = $pdo->prepare(
        'SELECT id, login, nome, email, role, status, month_goal FROM consorcio_usuarios WHERE id = ?'
    );
    $st->execute([$newId]);
    consorcio_json_exit(['success' => true, 'user' => consorcio_user_to_api($st->fetch(PDO::FETCH_ASSOC))]);
}

if ($method === 'PATCH' || $method === 'PUT') {
    $in = consorcio_input_array();
    $id = (int) ($in['id'] ?? 0);
    if ($id <= 0) {
        consorcio_json_exit(['success' => false, 'message' => 'ID inválido'], 400);
    }

    $st = $pdo->prepare('SELECT * FROM consorcio_usuarios WHERE id = ? AND empresa_id = ? LIMIT 1');
    $st->execute([$id, $empresaId]);
    $current = $st->fetch(PDO::FETCH_ASSOC);
    if (!$current) {
        consorcio_json_exit(['success' => false, 'message' => 'Usuário não encontrado'], 404);
    }

    $nome = array_key_exists('nome', $in) ? trim((string) $in['nome']) : $current['nome'];
    $email = array_key_exists('email', $in) ? trim((string) $in['email']) : $current['email'];
    $role = array_key_exists('role', $in) ? strtoupper(trim((string) $in['role'])) : $current['role'];
    $monthGoal = array_key_exists('monthGoal', $in) ? (float) $in['monthGoal'] : (float) $current['month_goal'];
    $senha = (string) ($in['senha'] ?? '');

    if (array_key_exists('status', $in)) {
        $requestedStatus = strtoupper(trim((string) $in['status']));
        if ($requestedStatus !== strtoupper((string) $current['status'])) {
            consorcio_json_exit([
                'success' => false,
                'message' => 'Ativar ou desativar usuários é feito pelo suporte da plataforma',
            ], 403);
        }
    }
    $status = $current['status'];

    if ($nome === '' || $email === '') {
        consorcio_json_exit(['success' => false, 'message' => 'Nome e e-mail são obrigatórios'], 400);
    }
    if (!in_array($role, ['ADMIN', 'VENDEDOR'], true)) {
        $role = $current['role'];
    }
    if (!in_array($status, ['ATIVO', 'INATIVO'], true)) {
        $status = $current['status'];
    }

    if ($id === $adminId && $role !== 'ADMIN') {
        consorcio_json_exit(['success' => false, 'message' => 'Você não pode remover seu próprio acesso de admin'], 400);
    }
    if ($status === 'ATIVO' && $role === 'ADMIN') {
        $st = $pdo->prepare(
            "SELECT id FROM consorcio_usuarios
             WHERE empresa_id = ? AND role = 'ADMIN' AND status = 'ATIVO' AND id != ? LIMIT 1"
        );
        $st->execute([$empresaId, $id]);
        if ($st->fetchColumn()) {
            consorcio_json_exit(['success' => false, 'message' => 'Empresa já possui um administrador ativo'], 400);
        }
    }

    $st = $pdo->prepare('SELECT id FROM consorcio_usuarios WHERE email = ? AND id != ? LIMIT 1');
    $st->execute([$email, $id]);
    if ($st->fetchColumn()) {
        consorcio_json_exit(['success' => false, 'message' => 'E-mail já está em uso'], 400);
    }

    if ($senha !== '') {
        if (strlen($senha) < 6) {
            consorcio_json_exit(['success' => false, 'message' => 'Senha deve ter ao menos 6 caracteres'], 400);
        }
        $st = $pdo->prepare(
            'UPDATE consorcio_usuarios SET nome = ?, email = ?, role = ?, status = ?, month_goal = ?, senha = ? WHERE id = ?'
        );
        $st->execute([$nome, $email, $role, $status, $monthGoal, consorcio_hash_senha_user($senha), $id]);
    } else {
        $st = $pdo->prepare(
            'UPDATE consorcio_usuarios SET nome = ?, email = ?, role = ?, status = ?, month_goal = ? WHERE id = ?'
        );
        $st->execute([$nome, $email, $role, $status, $monthGoal, $id]);
    }

    $st = $pdo->prepare(
        'SELECT id, login, nome, email, role, status, month_goal FROM consorcio_usuarios WHERE id = ?'
    );
    $st->execute([$id]);
    consorcio_json_exit(['success' => true, 'user' => consorcio_user_to_api($st->fetch(PDO::FETCH_ASSOC))]);
}

consorcio_json_exit(['success' => false, 'message' => 'Método não permitido'], 405);
