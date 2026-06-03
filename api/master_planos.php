<?php
declare(strict_types=1);

require_once __DIR__ . '/lib/bootstrap.php';
require_once __DIR__ . '/lib/billing.php';
require_once __DIR__ . '/lib/audit.php';

consorcio_api_begin();
$master = consorcio_require_master();
$pdo = consorcio_pdo();
if (!$pdo) {
    consorcio_json_exit(['success' => false, 'message' => 'Banco indisponível'], 503);
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $codigo = trim((string) ($_GET['codigo'] ?? ''));
    if ($codigo !== '') {
        $plano = consorcio_fetch_plano_por_codigo($pdo, $codigo);
        if (!$plano) {
            consorcio_json_exit(['success' => false, 'message' => 'Plano não encontrado'], 404);
        }
        consorcio_json_exit(['success' => true, 'plano' => consorcio_plano_to_api($plano)]);
    }

    consorcio_json_exit([
        'success' => true,
        'planos' => consorcio_fetch_planos($pdo, false),
        'precosReferencia' => consorcio_precos_referencia($pdo),
    ]);
}

if ($method === 'POST') {
    $in = consorcio_input_array();
    $codigo = consorcio_slugify(trim((string) ($in['codigo'] ?? '')));
    $nome = trim((string) ($in['nome'] ?? ''));
    if ($codigo === '' || $nome === '') {
        consorcio_json_exit(['success' => false, 'message' => 'Código e nome são obrigatórios'], 400);
    }

    $st = $pdo->prepare('SELECT id FROM consorcio_planos WHERE codigo = ? LIMIT 1');
    $st->execute([$codigo]);
    if ($st->fetchColumn()) {
        consorcio_json_exit(['success' => false, 'message' => 'Código de plano já existe'], 400);
    }

    $descricao = trim((string) ($in['descricao'] ?? ''));
    $valorMensal = max(0, round((float) ($in['valorMensal'] ?? 0), 2));
    $valorAnual = max(0, round((float) ($in['valorAnual'] ?? 0), 2));
    $maxUsuarios = array_key_exists('maxUsuarios', $in) && $in['maxUsuarios'] !== null && $in['maxUsuarios'] !== ''
        ? max(1, (int) $in['maxUsuarios'])
        : null;

    $st = $pdo->prepare(
        'INSERT INTO consorcio_planos (codigo, nome, descricao, valor_mensal, valor_anual, max_usuarios, ativo)
         VALUES (?, ?, ?, ?, ?, ?, 1)'
    );
    $st->execute([$codigo, $nome, $descricao, $valorMensal, $valorAnual > 0 ? $valorAnual : null, $maxUsuarios]);
    $plano = consorcio_fetch_plano_por_codigo($pdo, $codigo);

    consorcio_audit_log(
        $pdo,
        'PLANO_CRIADO',
        'Plano criado',
        $master,
        null,
        'planos',
        $codigo,
        'INFO',
        ['nome' => $nome, 'valorMensal' => $valorMensal, 'valorAnual' => $valorAnual]
    );

    consorcio_json_exit(['success' => true, 'plano' => consorcio_plano_to_api($plano ?: [])]);
}

if ($method === 'PATCH' || $method === 'PUT') {
    $in = consorcio_input_array();
    $codigo = trim((string) ($in['codigo'] ?? ''));
    if ($codigo === '') {
        consorcio_json_exit(['success' => false, 'message' => 'codigo é obrigatório'], 400);
    }

    $st = $pdo->prepare('SELECT * FROM consorcio_planos WHERE codigo = ? LIMIT 1');
    $st->execute([$codigo]);
    $current = $st->fetch(PDO::FETCH_ASSOC);
    if (!$current) {
        consorcio_json_exit(['success' => false, 'message' => 'Plano não encontrado'], 404);
    }

    $nome = array_key_exists('nome', $in) ? trim((string) $in['nome']) : $current['nome'];
    $descricao = array_key_exists('descricao', $in) ? trim((string) $in['descricao']) : $current['descricao'];
    $valorMensal = array_key_exists('valorMensal', $in)
        ? max(0, round((float) $in['valorMensal'], 2))
        : (float) $current['valor_mensal'];
    $valorAnual = array_key_exists('valorAnual', $in)
        ? max(0, round((float) $in['valorAnual'], 2))
        : (float) ($current['valor_anual'] ?? 0);
    $ativo = array_key_exists('ativo', $in) ? ((bool) $in['ativo'] ? 1 : 0) : (int) $current['ativo'];

    $maxUsuarios = $current['max_usuarios'];
    if (array_key_exists('maxUsuarios', $in)) {
        $maxUsuarios = $in['maxUsuarios'] === null || $in['maxUsuarios'] === ''
            ? null
            : max(1, (int) $in['maxUsuarios']);
    }

    if ($nome === '') {
        consorcio_json_exit(['success' => false, 'message' => 'Nome é obrigatório'], 400);
    }

    $st = $pdo->prepare(
        'UPDATE consorcio_planos SET nome = ?, descricao = ?, valor_mensal = ?, valor_anual = ?,
         max_usuarios = ?, ativo = ? WHERE codigo = ?'
    );
    $st->execute([
        $nome,
        $descricao,
        $valorMensal,
        $valorAnual > 0 ? $valorAnual : null,
        $maxUsuarios,
        $ativo,
        $codigo,
    ]);

    consorcio_audit_log(
        $pdo,
        'PLANO_ATUALIZADO',
        'Plano atualizado',
        $master,
        null,
        'planos',
        $codigo,
        'INFO',
        [
            'valorMensal' => $valorMensal,
            'valorAnual' => $valorAnual,
            'ativo' => (bool) $ativo,
        ]
    );

    $plano = consorcio_fetch_plano_por_codigo($pdo, $codigo);
    consorcio_json_exit(['success' => true, 'plano' => consorcio_plano_to_api($plano ?: [])]);
}

consorcio_json_exit(['success' => false, 'message' => 'Método não permitido'], 405);
