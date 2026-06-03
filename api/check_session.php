<?php
declare(strict_types=1);

require_once __DIR__ . '/settings/includes.php';
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/lib/billing.php';

consorcio_sessao_iniciar();
consorcio_json_headers();
setCorsHeaders();

if (!empty($_SESSION[SESSION_KEY])) {
    $u = $_SESSION[SESSION_KEY];
    $pdo = consorcio_pdo();
    if ($pdo && !empty($u['id'])) {
        try {
            $sessionSql = 'SELECT month_goal, role FROM consorcio_usuarios WHERE id = ? LIMIT 1';
            try {
                $pdo->query('SELECT empresa_id FROM consorcio_usuarios LIMIT 0');
                $sessionSql = 'SELECT month_goal, role, empresa_id FROM consorcio_usuarios WHERE id = ? LIMIT 1';
            } catch (Throwable $ignored) {
            }
            $st = $pdo->prepare($sessionSql);
            $st->execute([(int) $u['id']]);
            $row = $st->fetch(PDO::FETCH_ASSOC);
            if ($row) {
                $u['month_goal'] = (float) $row['month_goal'];
                $u['role'] = strtoupper((string) ($row['role'] ?? ($u['role'] ?? 'VENDEDOR')));
                if (array_key_exists('empresa_id', $row)) {
                    $u['empresa_id'] = $row['empresa_id'] !== null ? (int) $row['empresa_id'] : null;
                }
                $_SESSION[SESSION_KEY] = $u;
            }
        } catch (Throwable $e) {
            if (defined('DEBUG_MODE') && DEBUG_MODE) {
                error_log('[consorcio] check_session: ' . $e->getMessage());
            }
        }
    }

    if ($pdo && !empty($u['id']) && strtoupper((string) ($u['role'] ?? '')) !== 'MASTER') {
        $block = consorcio_usuario_acesso_bloqueado($pdo, $u);
        if ($block !== null) {
            unset($_SESSION[SESSION_KEY]);
            http_response_code(403);
            $code = (string) ($block['code'] ?? 'BILLING_BLOCKED');
            if ($code === 'EMPRESA_INATIVA') {
                $message = consorcio_mensagem_bloqueio_empresa($block);
            } elseif ($code === 'USUARIO_INATIVO') {
                $message = consorcio_mensagem_bloqueio_usuario($block);
            } else {
                $message = consorcio_mensagem_bloqueio_fatura($block);
            }
            echo json_encode([
                'success' => false,
                'logged_in' => false,
                'message' => $message,
                'code' => $code,
                'billing' => $block,
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    echo json_encode([
        'success' => true,
        'logged_in' => true,
        'user' => $u,
        'appVersion' => APP_VERSION,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode([
    'success' => false,
    'logged_in' => false,
    'message' => 'Sessão expirada. Faça login novamente.',
    'code' => 'SESSION_EXPIRED',
]);
