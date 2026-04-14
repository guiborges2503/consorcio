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
    $sql = 'SELECT id, login, senha, nome, email, status FROM consorcio_usuarios WHERE login = :l OR email = :e LIMIT 1';
    $st = $pdo->prepare($sql);
    $st->execute([':l' => $login, ':e' => $login]);
    $usuario = $st->fetch();

    $senha_md5 = (strlen($senha) === 32 && ctype_xdigit($senha))
        ? strtolower($senha)
        : md5($senha);

    if (!$usuario || strtolower((string) $usuario['senha']) !== $senha_md5) {
        echo json_encode(['success' => false, 'message' => 'Usuário ou senha incorretos']);
        exit;
    }

    if (strtoupper((string) $usuario['status']) !== 'ATIVO') {
        echo json_encode(['success' => false, 'message' => 'Usuário inativo']);
        exit;
    }

    $_SESSION[SESSION_KEY] = [
        'id' => (int) $usuario['id'],
        'login' => $usuario['login'],
        'nome' => $usuario['nome'],
        'email' => $usuario['email'],
    ];

    echo json_encode([
        'success' => true,
        'message' => 'Login realizado com sucesso',
        'user' => [
            'id' => (int) $usuario['id'],
            'login' => $usuario['login'],
            'nome' => $usuario['nome'],
            'email' => $usuario['email'],
        ],
    ]);
} catch (Throwable $e) {
    if (DEBUG_MODE) {
        error_log('[consorcio] login: ' . $e->getMessage());
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro interno do servidor']);
}
