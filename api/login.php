<?php
declare(strict_types=1);

require_once __DIR__ . '/settings/includes.php';
require_once __DIR__ . '/cors.php';

consorcio_sessao_iniciar();
consorcio_json_headers();
setCorsHeaders();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido']);
    exit;
}

$ct = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
$login = '';
$senha = '';
if (stripos($ct, 'application/json') !== false) {
    $raw = file_get_contents('php://input');
    $j = $raw ? json_decode($raw, true) : null;
    if (is_array($j)) {
        $login = trim((string) ($j['login'] ?? ''));
        $senha = (string) ($j['senha'] ?? '');
    }
} else {
    $login = isset($_POST['login']) ? trim((string) $_POST['login']) : '';
    $senha = isset($_POST['senha']) ? (string) $_POST['senha'] : '';
}

if ($login === '' || $senha === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Login e senha são obrigatórios']);
    exit;
}

$pdo = consorcio_pdo();
if (!$pdo) {
    http_response_code(503);
    echo json_encode(['success' => false, 'message' => 'Banco de dados indisponível']);
    exit;
}

try {
    $userColumns = 'id, login, senha, nome, email, status, role';
    try {
        $probe = $pdo->query('SELECT empresa_id FROM consorcio_usuarios LIMIT 0');
        if ($probe) {
            $userColumns .= ', empresa_id';
        }
    } catch (Throwable $ignored) {
        // coluna empresa_id ainda não migrada
    }

    $sql = "SELECT {$userColumns} FROM consorcio_usuarios WHERE login = :l OR email = :e LIMIT 1";
    $st = $pdo->prepare($sql);
    $st->execute([':l' => $login, ':e' => $login]);
    $usuario = $st->fetch();

    $senha_md5 = (strlen($senha) === 32 && ctype_xdigit($senha))
        ? strtolower($senha)
        : md5($senha);

    if (!$usuario || strtolower((string) $usuario['senha']) !== $senha_md5) {
        require_once __DIR__ . '/lib/audit.php';
        $auditUser = $usuario ? [
            'id' => (int) $usuario['id'],
            'login' => $usuario['login'],
            'role' => strtoupper((string) ($usuario['role'] ?? 'VENDEDOR')),
        ] : null;
        consorcio_audit_log(
            $pdo,
            'LOGIN_FAIL',
            'Falha de autenticação',
            $auditUser,
            $auditUser && array_key_exists('empresa_id', $usuario) && $usuario['empresa_id'] !== null
                ? (int) $usuario['empresa_id']
                : null,
            'auth',
            '',
            'SECURITY',
            ['loginAttempt' => $login]
        );
        echo json_encode(['success' => false, 'message' => 'Usuário ou senha incorretos']);
        exit;
    }

    if (strtoupper((string) $usuario['status']) !== 'ATIVO') {
        require_once __DIR__ . '/lib/audit.php';
        consorcio_audit_log(
            $pdo,
            'LOGIN_FAIL',
            'Tentativa de login com usuário inativo',
            ['id' => (int) $usuario['id'], 'login' => $usuario['login']],
            array_key_exists('empresa_id', $usuario) && $usuario['empresa_id'] !== null
                ? (int) $usuario['empresa_id']
                : null,
            'auth',
            (string) $usuario['id'],
            'SECURITY',
            ['loginAttempt' => $login, 'motivo' => 'INATIVO']
        );
        echo json_encode(['success' => false, 'message' => 'Usuário inativo']);
        exit;
    }

    require_once __DIR__ . '/lib/billing.php';
    $role = strtoupper((string) ($usuario['role'] ?? 'VENDEDOR'));
    $empresaId = array_key_exists('empresa_id', $usuario) && $usuario['empresa_id'] !== null
        ? (int) $usuario['empresa_id']
        : null;
    $block = consorcio_usuario_acesso_bloqueado($pdo, [
        'id' => (int) $usuario['id'],
        'role' => $role,
        'empresa_id' => $empresaId,
    ]);
    if ($block !== null) {
        consorcio_json_bloqueio_fatura($block);
    }

    $_SESSION[SESSION_KEY] = [
        'id' => (int) $usuario['id'],
        'login' => $usuario['login'],
        'nome' => $usuario['nome'],
        'email' => $usuario['email'],
        'role' => strtoupper((string) ($usuario['role'] ?? 'VENDEDOR')),
        'empresa_id' => array_key_exists('empresa_id', $usuario) && $usuario['empresa_id'] !== null
            ? (int) $usuario['empresa_id']
            : null,
    ];

    require_once __DIR__ . '/lib/audit.php';
    consorcio_audit_log(
        $pdo,
        'LOGIN_OK',
        'Login realizado',
        $_SESSION[SESSION_KEY],
        $_SESSION[SESSION_KEY]['empresa_id'],
        'auth',
        (string) $usuario['id'],
        'SECURITY',
        ['role' => $role]
    );

    echo json_encode([
        'success' => true,
        'message' => 'Login realizado com sucesso',
        'appVersion' => APP_VERSION,
        'user' => [
            'id' => (int) $usuario['id'],
            'login' => $usuario['login'],
            'nome' => $usuario['nome'],
            'email' => $usuario['email'],
            'role' => strtoupper((string) ($usuario['role'] ?? 'VENDEDOR')),
            'empresa_id' => array_key_exists('empresa_id', $usuario) && $usuario['empresa_id'] !== null
                ? (int) $usuario['empresa_id']
                : null,
        ],
    ]);
} catch (Throwable $e) {
    if (DEBUG_MODE) {
        error_log('[consorcio] login: ' . $e->getMessage());
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro interno do servidor']);
}
