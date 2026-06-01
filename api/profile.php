<?php
declare(strict_types=1);

require_once __DIR__ . '/lib/bootstrap.php';

consorcio_api_begin();
$user = consorcio_require_login();
$pdo = consorcio_pdo();
if (!$pdo) {
    consorcio_json_exit(['success' => false, 'message' => 'Banco indisponível'], 503);
}

$uid = (int) $user['id'];
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

function consorcio_hash_senha(string $senha): string
{
    return (strlen($senha) === 32 && ctype_xdigit($senha))
        ? strtolower($senha)
        : md5($senha);
}

function consorcio_profile_to_api(array $r): array
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
    $st = $pdo->prepare(
        'SELECT id, login, nome, email, role, status, month_goal FROM consorcio_usuarios WHERE id = ? LIMIT 1'
    );
    $st->execute([$uid]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        consorcio_json_exit(['success' => false, 'message' => 'Usuário não encontrado'], 404);
    }
    consorcio_json_exit(['success' => true, 'profile' => consorcio_profile_to_api($row)]);
}

if ($method === 'PATCH' || $method === 'PUT' || $method === 'POST') {
    $in = consorcio_input_array();
    $st = $pdo->prepare('SELECT * FROM consorcio_usuarios WHERE id = ? LIMIT 1');
    $st->execute([$uid]);
    $current = $st->fetch(PDO::FETCH_ASSOC);
    if (!$current) {
        consorcio_json_exit(['success' => false, 'message' => 'Usuário não encontrado'], 404);
    }

    $nome = array_key_exists('nome', $in) ? trim((string) $in['nome']) : $current['nome'];
    $email = array_key_exists('email', $in) ? trim((string) $in['email']) : $current['email'];
    $senhaAtual = (string) ($in['senhaAtual'] ?? '');
    $senhaNova = (string) ($in['senhaNova'] ?? '');

    if ($nome === '') {
        consorcio_json_exit(['success' => false, 'message' => 'Nome é obrigatório'], 400);
    }
    if ($email === '') {
        consorcio_json_exit(['success' => false, 'message' => 'E-mail é obrigatório'], 400);
    }

    $st = $pdo->prepare('SELECT id FROM consorcio_usuarios WHERE email = ? AND id != ? LIMIT 1');
    $st->execute([$email, $uid]);
    if ($st->fetchColumn()) {
        consorcio_json_exit(['success' => false, 'message' => 'E-mail já está em uso'], 400);
    }

    $newHash = null;
    if ($senhaNova !== '') {
        if ($senhaAtual === '') {
            consorcio_json_exit(['success' => false, 'message' => 'Informe a senha atual'], 400);
        }
        if (strlen($senhaNova) < 6) {
            consorcio_json_exit(['success' => false, 'message' => 'Nova senha deve ter ao menos 6 caracteres'], 400);
        }
        if (consorcio_hash_senha($senhaAtual) !== strtolower((string) $current['senha'])) {
            consorcio_json_exit(['success' => false, 'message' => 'Senha atual incorreta'], 400);
        }
        $newHash = consorcio_hash_senha($senhaNova);
    }

    if ($newHash !== null) {
        $st = $pdo->prepare('UPDATE consorcio_usuarios SET nome = ?, email = ?, senha = ? WHERE id = ?');
        $st->execute([$nome, $email, $newHash, $uid]);
    } else {
        $st = $pdo->prepare('UPDATE consorcio_usuarios SET nome = ?, email = ? WHERE id = ?');
        $st->execute([$nome, $email, $uid]);
    }

    $_SESSION[SESSION_KEY]['nome'] = $nome;
    $_SESSION[SESSION_KEY]['email'] = $email;

    $st = $pdo->prepare(
        'SELECT id, login, nome, email, role, status, month_goal FROM consorcio_usuarios WHERE id = ? LIMIT 1'
    );
    $st->execute([$uid]);
    consorcio_json_exit(['success' => true, 'profile' => consorcio_profile_to_api($st->fetch(PDO::FETCH_ASSOC))]);
}

consorcio_json_exit(['success' => false, 'message' => 'Método não permitido'], 405);
