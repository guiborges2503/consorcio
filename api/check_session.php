<?php
declare(strict_types=1);

require_once __DIR__ . '/settings/includes.php';
require_once __DIR__ . '/cors.php';

consorcio_sessao_iniciar();
consorcio_json_headers();
setCorsHeaders();

if (!empty($_SESSION[SESSION_KEY])) {
    $u = $_SESSION[SESSION_KEY];
    $pdo = consorcio_pdo();
    if ($pdo && !empty($u['id'])) {
        try {
            $st = $pdo->prepare('SELECT month_goal, role FROM consorcio_usuarios WHERE id = ? LIMIT 1');
            $st->execute([(int) $u['id']]);
            $row = $st->fetch(PDO::FETCH_ASSOC);
            if ($row) {
                $u['month_goal'] = (float) $row['month_goal'];
                $u['role'] = strtoupper((string) ($row['role'] ?? ($u['role'] ?? 'VENDEDOR')));
            }
        } catch (Throwable $e) {
            if (defined('DEBUG_MODE') && DEBUG_MODE) {
                error_log('[consorcio] check_session: ' . $e->getMessage());
            }
        }
    }
    echo json_encode([
        'success' => true,
        'logged_in' => true,
        'user' => $u,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode([
    'success' => false,
    'logged_in' => false,
    'message' => 'Sessão expirada. Faça login novamente.',
    'code' => 'SESSION_EXPIRED',
]);
