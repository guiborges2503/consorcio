<?php
require_once __DIR__ . '/settings/includes.php';
require_once __DIR__ . '/cors.php';

consorcio_sessao_iniciar();
consorcio_json_headers();
setCorsHeaders();

$sessionUser = $_SESSION[SESSION_KEY] ?? null;
$pdo = consorcio_pdo();
if ($pdo && is_array($sessionUser) && !empty($sessionUser['id'])) {
    require_once __DIR__ . '/lib/audit.php';
    consorcio_audit_log(
        $pdo,
        'LOGOUT',
        'Logout realizado',
        $sessionUser,
        isset($sessionUser['empresa_id']) && $sessionUser['empresa_id'] !== null
            ? (int) $sessionUser['empresa_id']
            : null,
        'auth',
        (string) $sessionUser['id'],
        'SECURITY',
        null
    );
}

$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $p = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
}
session_destroy();

echo json_encode(['success' => true, 'message' => 'Logout realizado']);
