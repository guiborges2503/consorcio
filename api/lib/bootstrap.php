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
    return $u;
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
