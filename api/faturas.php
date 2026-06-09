<?php
declare(strict_types=1);

require_once __DIR__ . '/lib/bootstrap.php';
require_once __DIR__ . '/lib/billing.php';

consorcio_api_begin();
$user = consorcio_require_login_faturas();
if (consorcio_is_master($user)) {
    consorcio_json_exit([
        'success' => false,
        'message' => 'Admin master não acessa faturas de tenant',
        'code' => 'FORBIDDEN',
    ], 403);
}

$pdo = consorcio_pdo();
if (!$pdo) {
    consorcio_json_exit(['success' => false, 'message' => 'Banco indisponível'], 503);
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method !== 'GET') {
    consorcio_json_exit(['success' => false, 'message' => 'Método não permitido'], 405);
}

$uid = (int) $user['id'];
$empresaId = consorcio_user_empresa_id($pdo, $user);
if ($empresaId === null || $empresaId <= 0) {
    consorcio_json_exit([
        'success' => true,
        'resumo' => null,
        'message' => 'Usuário sem empresa vinculada',
    ]);
}

function consorcio_plano_premium(string $codigo): bool
{
    $c = strtolower(trim($codigo));
    return in_array($c, ['profissional', 'professional', 'pro', 'enterprise'], true)
        || strpos($c, 'pro') !== false;
}

function consorcio_fetch_faturas_empresa(PDO $pdo, int $empresaId, array $statuses, int $limit = 24): array
{
    if ($statuses === []) {
        return [];
    }
    $limit = max(1, min(100, $limit));
    $placeholders = implode(',', array_fill(0, count($statuses), '?'));
    $params = [$empresaId];
    foreach ($statuses as $s) {
        $params[] = $s;
    }

    $order = in_array('PAGA', $statuses, true)
        ? 'COALESCE(f.pago_em, f.vencimento) DESC, f.id DESC'
        : 'f.vencimento ASC, f.id DESC';

    $sql = "SELECT f.*, e.nome AS empresa_nome FROM consorcio_faturas f
            INNER JOIN consorcio_empresas e ON e.id = f.empresa_id
            WHERE f.empresa_id = ? AND f.status IN ({$placeholders})
            ORDER BY {$order}
            LIMIT {$limit}";

    $st = $pdo->prepare($sql);
    $st->execute($params);

    $list = [];
    while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
        $fid = (int) $row['id'];
        consorcio_backfill_fatura_itens($pdo, $fid);
        $itens = consorcio_fetch_fatura_itens($pdo, $fid);
        $list[] = consorcio_fatura_to_api($row, $itens);
    }
    return $list;
}

function consorcio_filter_fatura_itens_usuario(array $fatura, int $usuarioId): array
{
    $itens = $fatura['itens'] ?? [];
    $filtrados = array_values(array_filter(
        $itens,
        static fn ($i) => (int) ($i['usuarioId'] ?? 0) === $usuarioId
    ));
    $fatura['itens'] = $filtrados;
    $fatura['itensTotal'] = count($filtrados);
    $fatura['itensPagos'] = count(array_filter($filtrados, static fn ($i) => ($i['status'] ?? '') === 'PAGA'));
    return $fatura;
}

function consorcio_user_cobrar_fatura(PDO $pdo, int $uid): bool
{
    if (!consorcio_usuario_tem_cobrar_fatura($pdo)) {
        return true;
    }
    $st = $pdo->prepare('SELECT cobrar_fatura FROM consorcio_usuarios WHERE id = ? LIMIT 1');
    $st->execute([$uid]);
    $v = $st->fetchColumn();
    return $v === false || (int) $v === 1;
}

function consorcio_tenant_faturas_resumo(PDO $pdo, array $user, int $empresaId): array
{
    $uid = (int) $user['id'];
    $isAdmin = consorcio_is_admin($user);

    $st = $pdo->prepare('SELECT * FROM consorcio_empresas WHERE id = ? LIMIT 1');
    $st->execute([$empresaId]);
    $empresaRow = $st->fetch(PDO::FETCH_ASSOC);
    if (!$empresaRow) {
        throw new RuntimeException('Empresa não encontrada');
    }

    $empresa = consorcio_empresa_to_api($pdo, $empresaRow);
    $planoCodigo = (string) ($empresa['planoCodigo'] ?? '');
    $planoPremium = consorcio_plano_premium($planoCodigo);
    $cobrarFatura = consorcio_user_cobrar_fatura($pdo, $uid);

    $faturaAberta = consorcio_fetch_fatura_aberta_empresa($pdo, $empresaId);
    $emAberto = consorcio_fetch_faturas_empresa($pdo, $empresaId, ['ABERTA', 'PARCIAL', 'VENCIDA'], 12);
    $pagas = consorcio_fetch_faturas_empresa($pdo, $empresaId, ['PAGA'], 24);

    $proximoVencimento = null;
    foreach ($emAberto as $f) {
        $v = $f['vencimento'] ?? null;
        if ($v && ($proximoVencimento === null || $v < $proximoVencimento)) {
            $proximoVencimento = $v;
        }
    }

    $meuItem = null;
    if ($faturaAberta && !empty($faturaAberta['itens'])) {
        foreach ($faturaAberta['itens'] as $item) {
            if ((int) ($item['usuarioId'] ?? 0) === $uid) {
                $meuItem = $item;
                break;
            }
        }
    }

    if (!$isAdmin && !$planoPremium && $cobrarFatura && $faturaAberta) {
        $faturaAberta = consorcio_filter_fatura_itens_usuario($faturaAberta, $uid);
    }

    if (!$isAdmin && !$planoPremium && $cobrarFatura) {
        $emAberto = array_map(
            static fn ($f) => consorcio_filter_fatura_itens_usuario($f, $uid),
            array_filter($emAberto, static fn ($f) => !empty($f['itens']))
        );
        $emAberto = array_values($emAberto);
    }

    $totalEmAberto = 0.0;
    foreach ($emAberto as $f) {
        $totalEmAberto += (float) ($f['saldo'] ?? 0);
    }

    return [
        'empresa' => [
            'nome' => $empresa['nome'],
            'status' => $empresa['status'],
            'planoCodigo' => $empresa['planoCodigo'],
            'planoNome' => $empresa['planoNome'],
            'planoPremium' => $planoPremium,
            'formaCobranca' => $empresa['formaCobranca'],
            'valorMensalUsuario' => $empresa['valorMensalUsuario'],
            'valorAnualUsuario' => $empresa['valorAnualUsuario'],
            'diaVencimento' => $empresa['diaVencimento'],
            'qtdUsuarios' => $empresa['qtdUsuarios'],
            'qtdUsuariosCobraveis' => $empresa['qtdUsuariosCobraveis'],
            'valorEstimadoFatura' => $empresa['valorEstimadoFatura'],
        ],
        'cobrarFatura' => $cobrarFatura,
        'faturaAberta' => $faturaAberta,
        'proximoVencimento' => $proximoVencimento,
        'totalEmAberto' => round($totalEmAberto, 2),
        'faturasEmAberto' => $emAberto,
        'faturasPagas' => $isAdmin || $planoPremium ? $pagas : [],
        'meuItem' => $meuItem,
    ];
}

function consorcio_tenant_pode_ver_fatura(array $user, array $fatura, bool $planoPremium, bool $cobrarFatura): bool
{
    if (consorcio_is_admin($user)) {
        return true;
    }
    if ($planoPremium) {
        return true;
    }
    if (!$cobrarFatura) {
        return false;
    }
    $uid = (int) $user['id'];
    foreach ($fatura['itens'] ?? [] as $item) {
        if ((int) ($item['usuarioId'] ?? 0) === $uid) {
            return true;
        }
    }
    return false;
}

$faturaId = isset($_GET['id']) ? (int) $_GET['id'] : 0;
$resumo = isset($_GET['resumo']) && $_GET['resumo'] !== '0';

if ($faturaId > 0) {
    $st = $pdo->prepare(
        'SELECT f.*, e.nome AS empresa_nome FROM consorcio_faturas f
         INNER JOIN consorcio_empresas e ON e.id = f.empresa_id
         WHERE f.id = ? AND f.empresa_id = ? LIMIT 1'
    );
    $st->execute([$faturaId, $empresaId]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        consorcio_json_exit(['success' => false, 'message' => 'Fatura não encontrada'], 404);
    }

    consorcio_backfill_fatura_itens($pdo, $faturaId);
    $itens = consorcio_fetch_fatura_itens($pdo, $faturaId);
    $fatura = consorcio_fatura_to_api($row, $itens);

    $st = $pdo->prepare('SELECT plano_codigo FROM consorcio_empresas WHERE id = ? LIMIT 1');
    $st->execute([$empresaId]);
    $planoCodigo = (string) ($st->fetchColumn() ?: '');
    $planoPremium = consorcio_plano_premium($planoCodigo);
    $cobrarFatura = consorcio_user_cobrar_fatura($pdo, $uid);

    if (!consorcio_tenant_pode_ver_fatura($user, $fatura, $planoPremium, $cobrarFatura)) {
        consorcio_json_exit(['success' => false, 'message' => 'Sem permissão para ver esta fatura'], 403);
    }

    if (!consorcio_is_admin($user) && !$planoPremium && $cobrarFatura) {
        $fatura = consorcio_filter_fatura_itens_usuario($fatura, $uid);
    }

    consorcio_json_exit(['success' => true, 'fatura' => $fatura]);
}

if ($resumo || !isset($_GET['status'])) {
    try {
        $data = consorcio_tenant_faturas_resumo($pdo, $user, $empresaId);
        consorcio_json_exit(['success' => true, 'resumo' => $data]);
    } catch (RuntimeException $e) {
        consorcio_json_exit(['success' => false, 'message' => $e->getMessage()], 404);
    } catch (Throwable $e) {
        if (defined('DEBUG_MODE') && DEBUG_MODE) {
            error_log('[consorcio] faturas resumo: ' . $e->getMessage());
        }
        consorcio_json_exit(['success' => false, 'message' => 'Erro ao carregar faturas'], 500);
    }
}

$status = strtoupper(trim((string) ($_GET['status'] ?? '')));
$statuses = $status !== '' ? [$status] : ['ABERTA', 'PARCIAL', 'VENCIDA', 'PAGA'];
if (!consorcio_is_admin($user)) {
    $st = $pdo->prepare('SELECT plano_codigo FROM consorcio_empresas WHERE id = ? LIMIT 1');
    $st->execute([$empresaId]);
    $planoPremium = consorcio_plano_premium((string) ($st->fetchColumn() ?: ''));
    if (!$planoPremium) {
        $statuses = array_values(array_filter($statuses, static fn ($s) => $s !== 'PAGA'));
    }
}

$faturas = consorcio_fetch_faturas_empresa($pdo, $empresaId, $statuses, 50);
consorcio_json_exit(['success' => true, 'faturas' => $faturas]);
