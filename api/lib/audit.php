<?php
declare(strict_types=1);

function consorcio_audit_log(
    PDO $pdo,
    string $acao,
    string $mensagem,
    ?array $user = null,
    ?int $empresaId = null,
    string $recurso = '',
    string $recursoId = '',
    string $nivel = 'INFO',
    ?array $payload = null
): void {
    try {
        $pdo->query('SELECT id FROM consorcio_audit_logs LIMIT 0');
    } catch (Throwable $e) {
        return;
    }

    $st = $pdo->prepare(
        'INSERT INTO consorcio_audit_logs
         (empresa_id, usuario_id, nivel, acao, recurso, recurso_id, mensagem, ip, user_agent, payload)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $json = $payload !== null ? json_encode($payload, JSON_UNESCAPED_UNICODE) : null;
    $st->execute([
        $empresaId,
        $user !== null ? (int) ($user['id'] ?? 0) : null,
        $nivel,
        $acao,
        $recurso,
        $recursoId,
        mb_substr($mensagem, 0, 500),
        (string) ($_SERVER['REMOTE_ADDR'] ?? ''),
        mb_substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255),
        $json,
    ]);
}
