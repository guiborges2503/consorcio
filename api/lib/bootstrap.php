<?php
declare(strict_types=1);

require_once __DIR__ . '/../settings/includes.php';
require_once __DIR__ . '/../cors.php';

function consorcio_api_begin(): void
{
    consorcio_sessao_iniciar();
    consorcio_json_headers();
    setCorsHeaders();
}

function consorcio_read_json_body(): ?array
{
    $ct = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
    if (stripos($ct, 'application/json') === false) {
        return null;
    }
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return null;
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : null;
}

/** Corpo JSON ou $_POST (form). */
function consorcio_input_array(): array
{
    $j = consorcio_read_json_body();
    if ($j !== null) {
        return $j;
    }
    return $_POST;
}

function consorcio_json_exit(array $data, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function consorcio_require_login(): array
{
    consorcio_sessao_iniciar();
    $u = $_SESSION[SESSION_KEY] ?? null;
    if (!is_array($u) || empty($u['id'])) {
        consorcio_json_exit(['success' => false, 'message' => 'Não autenticado', 'code' => 'AUTH'], 401);
    }

    if (!consorcio_is_master($u)) {
        require_once __DIR__ . '/billing.php';
        $pdo = consorcio_pdo();
        if ($pdo) {
            $block = consorcio_usuario_acesso_bloqueado($pdo, $u);
            if ($block !== null) {
                consorcio_json_bloqueio_fatura($block);
            }
        }
    }

    return $u;
}

function consorcio_user_role(array $user): string
{
    return strtoupper((string) ($user['role'] ?? 'VENDEDOR'));
}

function consorcio_is_master(array $user): bool
{
    return consorcio_user_role($user) === 'MASTER';
}

/** Admin da empresa (operacional consórcio) */
function consorcio_is_admin(array $user): bool
{
    return consorcio_user_role($user) === 'ADMIN';
}

function consorcio_require_admin(): array
{
    $user = consorcio_require_login();
    if (!consorcio_is_admin($user)) {
        consorcio_json_exit(['success' => false, 'message' => 'Acesso restrito ao administrador da empresa', 'code' => 'FORBIDDEN'], 403);
    }
    return $user;
}

function consorcio_require_master(): array
{
    $user = consorcio_require_login();
    if (!consorcio_is_master($user)) {
        consorcio_json_exit(['success' => false, 'message' => 'Acesso restrito ao admin master', 'code' => 'FORBIDDEN'], 403);
    }
    return $user;
}

/** Login tenant — permite consultar faturas mesmo com inadimplência SaaS. */
function consorcio_require_login_faturas(): array
{
    consorcio_sessao_iniciar();
    $u = $_SESSION[SESSION_KEY] ?? null;
    if (!is_array($u) || empty($u['id'])) {
        consorcio_json_exit(['success' => false, 'message' => 'Não autenticado', 'code' => 'AUTH'], 401);
    }

    if (!consorcio_is_master($u)) {
        require_once __DIR__ . '/billing.php';
        $pdo = consorcio_pdo();
        if ($pdo) {
            $block = consorcio_usuario_acesso_bloqueado($pdo, $u, true);
            if ($block !== null) {
                consorcio_json_bloqueio_fatura($block);
            }
        }
    }

    return $u;
}

/** Bloqueia master de APIs operacionais (leads, contratos, parcelas…) */
function consorcio_require_consorcio_access(): array
{
    $user = consorcio_require_login();
    if (consorcio_is_master($user)) {
        consorcio_json_exit([
            'success' => false,
            'message' => 'Admin master não acessa dados operacionais de consórcio',
            'code' => 'FORBIDDEN',
        ], 403);
    }
    return $user;
}

/** Escopo de usuario_id: admin pode filtrar; vendedor só vê o próprio. */
function consorcio_scoped_user_id(array $user, ?int $requestedId = null): int
{
    if (consorcio_is_admin($user) && $requestedId !== null && $requestedId > 0) {
        return $requestedId;
    }
    return (int) $user['id'];
}

function consorcio_admin_empresa_id(PDO $pdo, array $admin): ?int
{
    if (!consorcio_is_admin($admin)) {
        return null;
    }
    if (array_key_exists('empresa_id', $admin) && $admin['empresa_id'] !== null) {
        return (int) $admin['empresa_id'];
    }
    $st = $pdo->prepare('SELECT empresa_id FROM consorcio_usuarios WHERE id = ? LIMIT 1');
    $st->execute([(int) $admin['id']]);
    $eid = $st->fetchColumn();
    return $eid !== false && $eid !== null ? (int) $eid : null;
}

/** empresa_id do usuário tenant (admin ou vendedor). */
function consorcio_user_empresa_id(PDO $pdo, array $user): ?int
{
    if (consorcio_is_master($user)) {
        return null;
    }
    if (array_key_exists('empresa_id', $user) && $user['empresa_id'] !== null) {
        return (int) $user['empresa_id'];
    }
    $st = $pdo->prepare('SELECT empresa_id FROM consorcio_usuarios WHERE id = ? LIMIT 1');
    $st->execute([(int) $user['id']]);
    $eid = $st->fetchColumn();
    return $eid !== false && $eid !== null ? (int) $eid : null;
}

function consorcio_iniciais(string $nome): string
{
    $nome = trim($nome);
    if ($nome === '') {
        return 'U';
    }
    $partes = preg_split('/\s+/u', $nome, -1, PREG_SPLIT_NO_EMPTY) ?: [];
    $s = '';
    foreach (array_slice($partes, 0, 2) as $p) {
        $s .= mb_strtoupper(mb_substr($p, 0, 1));
    }
    return $s !== '' ? $s : 'U';
}
