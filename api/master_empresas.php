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
$hasFormaCobranca = consorcio_empresa_tem_forma_cobranca($pdo);
$hasPrecoPersonalizado = consorcio_empresa_tem_preco_personalizado($pdo);

function consorcio_hash_senha_master(string $senha): string
{
    return (strlen($senha) === 32 && ctype_xdigit($senha))
        ? strtolower($senha)
        : md5($senha);
}

function consorcio_user_row_to_api(array $r): array
{
    return [
        'id' => (int) $r['id'],
        'login' => $r['login'],
        'nome' => $r['nome'],
        'email' => $r['email'],
        'role' => strtoupper((string) ($r['role'] ?? 'VENDEDOR')),
        'status' => $r['status'],
        'empresaId' => isset($r['empresa_id']) ? (int) $r['empresa_id'] : null,
        'monthGoal' => (float) ($r['month_goal'] ?? 0),
        'cobrarFatura' => !isset($r['cobrar_fatura']) || (int) $r['cobrar_fatura'] === 1,
    ];
}

function consorcio_master_criar_admin_empresa(
    PDO $pdo,
    int $empresaId,
    string $login,
    string $nome,
    string $email,
    string $senha,
    bool $cobrarFatura = false
): array {
    if ($empresaId <= 0) {
        throw new RuntimeException('empresaId inválido');
    }
    if ($login === '' || $nome === '' || $email === '' || $senha === '') {
        throw new RuntimeException('Login, nome, e-mail e senha são obrigatórios');
    }
    if (strlen($senha) < 6) {
        throw new RuntimeException('Senha deve ter ao menos 6 caracteres');
    }

    $st = $pdo->prepare('SELECT id FROM consorcio_empresas WHERE id = ? LIMIT 1');
    $st->execute([$empresaId]);
    if (!$st->fetchColumn()) {
        throw new RuntimeException('Empresa não encontrada');
    }

    $st = $pdo->prepare(
        "SELECT id FROM consorcio_usuarios WHERE empresa_id = ? AND role = 'ADMIN' AND status = 'ATIVO' LIMIT 1"
    );
    $st->execute([$empresaId]);
    if ($st->fetchColumn()) {
        throw new RuntimeException('Empresa já possui um administrador ativo');
    }

    $st = $pdo->prepare('SELECT id FROM consorcio_usuarios WHERE login = ? OR email = ? LIMIT 1');
    $st->execute([$login, $email]);
    if ($st->fetchColumn()) {
        throw new RuntimeException('Login ou e-mail já cadastrado');
    }

    if (!consorcio_usuario_tem_cobrar_fatura($pdo)) {
        $st = $pdo->prepare(
            'INSERT INTO consorcio_usuarios (login, senha, nome, email, status, role, empresa_id, month_goal)
             VALUES (?, ?, ?, ?, \'ATIVO\', \'ADMIN\', ?, 500000)'
        );
        $st->execute([$login, consorcio_hash_senha_master($senha), $nome, $email, $empresaId]);
    } else {
        $st = $pdo->prepare(
            'INSERT INTO consorcio_usuarios (login, senha, nome, email, status, role, cobrar_fatura, empresa_id, month_goal)
             VALUES (?, ?, ?, ?, \'ATIVO\', \'ADMIN\', ?, ?, 500000)'
        );
        $st->execute([
            $login,
            consorcio_hash_senha_master($senha),
            $nome,
            $email,
            $cobrarFatura ? 1 : 0,
            $empresaId,
        ]);
    }
    $newId = (int) $pdo->lastInsertId();

    $st = $pdo->prepare(
        'SELECT id, login, nome, email, role, status, empresa_id, month_goal FROM consorcio_usuarios WHERE id = ?'
    );
    $st->execute([$newId]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        throw new RuntimeException('Erro ao criar administrador');
    }

    return consorcio_user_row_to_api($row);
}

function consorcio_fetch_empresa(PDO $pdo, int $id, bool $hasFormaCobranca): ?array
{
    $st = $pdo->prepare('SELECT * FROM consorcio_empresas WHERE id = ? LIMIT 1');
    $st->execute([$id]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        return null;
    }
    $qtd = consorcio_count_empresa_usuarios($pdo, $id);
    $api = consorcio_empresa_to_api($pdo, $row, $qtd);

    $userCols = 'id, login, nome, email, role, status, empresa_id, month_goal';
    if (consorcio_usuario_tem_cobrar_fatura($pdo)) {
        $userCols .= ', cobrar_fatura';
    }
    $st = $pdo->prepare(
        "SELECT {$userCols} FROM consorcio_usuarios WHERE empresa_id = ? ORDER BY role ASC, nome ASC"
    );
    $st->execute([$id]);
    $users = [];
    while ($u = $st->fetch(PDO::FETCH_ASSOC)) {
        $users[] = consorcio_user_row_to_api($u);
    }
    $api['usuarios'] = $users;
    $api['admin'] = null;
    foreach ($users as $u) {
        if ($u['role'] === 'ADMIN' && $u['status'] === 'ATIVO') {
            $api['admin'] = $u;
            break;
        }
    }
    if ($api['admin'] === null) {
        foreach ($users as $u) {
            if ($u['role'] === 'ADMIN') {
                $api['admin'] = $u;
                break;
            }
        }
    }
    $api['faturaAberta'] = consorcio_fetch_fatura_aberta_empresa($pdo, $id);
    return $api;
}

if ($method === 'GET') {
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
    if ($id > 0) {
        $empresa = consorcio_fetch_empresa($pdo, $id, $hasFormaCobranca);
        if (!$empresa) {
            consorcio_json_exit(['success' => false, 'message' => 'Empresa não encontrada'], 404);
        }
        consorcio_json_exit(['success' => true, 'empresa' => $empresa]);
    }

    $st = $pdo->query('SELECT * FROM consorcio_empresas ORDER BY nome ASC');
    $list = [];
    while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
        $eid = (int) $row['id'];
        $list[] = consorcio_empresa_to_api($pdo, $row, consorcio_count_empresa_usuarios($pdo, $eid));
    }
    consorcio_json_exit([
        'success' => true,
        'empresas' => $list,
        'precos' => consorcio_precos_referencia($pdo),
        'planos' => consorcio_fetch_planos($pdo),
    ]);
}

if ($method === 'POST') {
    $in = consorcio_input_array();
    $action = strtolower(trim((string) ($in['action'] ?? '')));

    if ($action === 'criar_admin') {
        $empresaId = (int) ($in['empresaId'] ?? 0);
        $login = trim((string) ($in['login'] ?? ''));
        $nome = trim((string) ($in['nome'] ?? ''));
        $email = trim((string) ($in['email'] ?? ''));
        $senha = (string) ($in['senha'] ?? '');
        $cobrarFatura = array_key_exists('cobrarFatura', $in) ? (bool) $in['cobrarFatura'] : false;

        try {
            $admin = consorcio_master_criar_admin_empresa(
                $pdo,
                $empresaId,
                $login,
                $nome,
                $email,
                $senha,
                $cobrarFatura
            );
            consorcio_audit_log(
                $pdo,
                'EMPRESA_ADMIN_CRIADO',
                'Administrador da empresa cadastrado',
                $master,
                $empresaId,
                'empresas',
                (string) $empresaId,
                'INFO',
                ['adminLogin' => $login, 'adminId' => $admin['id'], 'cobrarFatura' => $cobrarFatura]
            );
            $empresa = consorcio_fetch_empresa($pdo, $empresaId, $hasFormaCobranca);
            consorcio_json_exit(['success' => true, 'admin' => $admin, 'empresa' => $empresa]);
        } catch (RuntimeException $e) {
            consorcio_json_exit(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    $nome = trim((string) ($in['nome'] ?? ''));
    $slug = trim((string) ($in['slug'] ?? ''));
    $documento = trim((string) ($in['documento'] ?? ''));
    $email = trim((string) ($in['email'] ?? ''));
    $telefone = trim((string) ($in['telefone'] ?? ''));
    $formaCobranca = strtoupper(trim((string) ($in['formaCobranca'] ?? 'MENSAL')));
    $planoCodigo = trim((string) ($in['planoCodigo'] ?? CONSORCIO_PLANO_PADRAO));
    $diaVencimento = max(1, min(28, (int) ($in['diaVencimento'] ?? 10)));
    $adminIn = is_array($in['admin'] ?? null) ? $in['admin'] : [];

    $adminLogin = trim((string) ($adminIn['login'] ?? ''));
    $adminNome = trim((string) ($adminIn['nome'] ?? ''));
    $adminEmail = trim((string) ($adminIn['email'] ?? ''));
    $adminSenha = (string) ($adminIn['senha'] ?? '');

    if ($nome === '') {
        consorcio_json_exit(['success' => false, 'message' => 'Nome da empresa é obrigatório'], 400);
    }

    $hasAdminData = $adminLogin !== '' || $adminNome !== '' || $adminEmail !== '' || $adminSenha !== '';
    if ($hasAdminData) {
        if ($adminLogin === '' || $adminNome === '' || $adminEmail === '' || $adminSenha === '') {
            consorcio_json_exit(['success' => false, 'message' => 'Preencha todos os dados do administrador ou deixe em branco'], 400);
        }
        if (strlen($adminSenha) < 6) {
            consorcio_json_exit(['success' => false, 'message' => 'Senha do admin deve ter ao menos 6 caracteres'], 400);
        }
    }
    if (!in_array($formaCobranca, ['MENSAL', 'ANUAL'], true)) {
        $formaCobranca = 'MENSAL';
    }

    $plano = consorcio_fetch_plano_por_codigo($pdo, $planoCodigo);
    if (!$plano || !(bool) ($plano['ativo'] ?? true)) {
        consorcio_json_exit(['success' => false, 'message' => 'Plano inválido ou inativo'], 400);
    }
    $planoCodigo = (string) $plano['codigo'];

    if ($slug === '') {
        $slug = consorcio_slugify($nome);
    } else {
        $slug = consorcio_slugify($slug);
    }

    $st = $pdo->prepare('SELECT id FROM consorcio_empresas WHERE slug = ? LIMIT 1');
    $st->execute([$slug]);
    if ($st->fetchColumn()) {
        consorcio_json_exit(['success' => false, 'message' => 'Slug já está em uso'], 400);
    }

    if ($hasAdminData) {
        $st = $pdo->prepare('SELECT id FROM consorcio_usuarios WHERE login = ? OR email = ? LIMIT 1');
        $st->execute([$adminLogin, $adminEmail]);
        if ($st->fetchColumn()) {
            consorcio_json_exit(['success' => false, 'message' => 'Login ou e-mail do admin já cadastrado'], 400);
        }
    }

    $pdo->beginTransaction();
    try {
        if ($hasFormaCobranca && $hasPrecoPersonalizado) {
            $st = $pdo->prepare(
                'INSERT INTO consorcio_empresas
                 (nome, slug, documento, email, telefone, status, plano_codigo, preco_personalizado,
                  forma_cobranca, valor_mensal, valor_anual, dia_vencimento)
                 VALUES (?, ?, ?, ?, ?, \'ATIVA\', ?, 0, ?, NULL, NULL, ?)'
            );
            $st->execute([
                $nome,
                $slug,
                $documento,
                $email,
                $telefone,
                $planoCodigo,
                $formaCobranca,
                $diaVencimento,
            ]);
        } elseif ($hasFormaCobranca) {
            $precos = consorcio_precos_referencia($pdo);
            $st = $pdo->prepare(
                'INSERT INTO consorcio_empresas
                 (nome, slug, documento, email, telefone, status, plano_codigo, forma_cobranca,
                  valor_mensal, valor_anual, dia_vencimento)
                 VALUES (?, ?, ?, ?, ?, \'ATIVA\', ?, ?, ?, ?, ?)'
            );
            $st->execute([
                $nome,
                $slug,
                $documento,
                $email,
                $telefone,
                $planoCodigo,
                $formaCobranca,
                $precos['mensalUsuario'],
                $precos['anualUsuario'],
                $diaVencimento,
            ]);
        } else {
            $st = $pdo->prepare(
                'INSERT INTO consorcio_empresas
                 (nome, slug, documento, email, telefone, status, plano_codigo, valor_mensal, valor_anual, dia_vencimento)
                 VALUES (?, ?, ?, ?, ?, \'ATIVA\', ?, NULL, NULL, ?)'
            );
            $st->execute([
                $nome,
                $slug,
                $documento,
                $email,
                $telefone,
                $planoCodigo,
                $diaVencimento,
            ]);
        }
        $empresaId = (int) $pdo->lastInsertId();

        if ($hasAdminData) {
            $adminCobrarFatura = array_key_exists('adminCobrarFatura', $in) ? (bool) $in['adminCobrarFatura'] : false;
            if (consorcio_usuario_tem_cobrar_fatura($pdo)) {
                $st = $pdo->prepare(
                    'INSERT INTO consorcio_usuarios (login, senha, nome, email, status, role, cobrar_fatura, empresa_id, month_goal)
                     VALUES (?, ?, ?, ?, \'ATIVO\', \'ADMIN\', ?, ?, 500000)'
                );
                $st->execute([
                    $adminLogin,
                    consorcio_hash_senha_master($adminSenha),
                    $adminNome,
                    $adminEmail,
                    $adminCobrarFatura ? 1 : 0,
                    $empresaId,
                ]);
            } else {
                $st = $pdo->prepare(
                    'INSERT INTO consorcio_usuarios (login, senha, nome, email, status, role, empresa_id, month_goal)
                     VALUES (?, ?, ?, ?, \'ATIVO\', \'ADMIN\', ?, 500000)'
                );
                $st->execute([
                    $adminLogin,
                    consorcio_hash_senha_master($adminSenha),
                    $adminNome,
                    $adminEmail,
                    $empresaId,
                ]);
            }
        }

        $pdo->commit();
        consorcio_audit_log(
            $pdo,
            'EMPRESA_CRIADA',
            $hasAdminData ? 'Empresa criada com admin' : 'Empresa criada',
            $master,
            $empresaId,
            'empresas',
            (string) $empresaId,
            'INFO',
            ['nome' => $nome, 'adminLogin' => $hasAdminData ? $adminLogin : null]
        );
    } catch (Throwable $e) {
        $pdo->rollBack();
        consorcio_json_exit(['success' => false, 'message' => 'Erro ao criar empresa'], 500);
    }

    $empresa = consorcio_fetch_empresa($pdo, $empresaId, $hasFormaCobranca);
    consorcio_json_exit(['success' => true, 'empresa' => $empresa]);
}

if ($method === 'PATCH' || $method === 'PUT') {
    $in = consorcio_input_array();
    $action = strtolower(trim((string) ($in['action'] ?? '')));

    if ($action === 'atualizar_usuario') {
        $empresaId = (int) ($in['empresaId'] ?? 0);
        $usuarioId = (int) ($in['usuarioId'] ?? 0);
        $status = strtoupper(trim((string) ($in['status'] ?? '')));

        if ($empresaId <= 0 || $usuarioId <= 0) {
            consorcio_json_exit(['success' => false, 'message' => 'Empresa ou usuário inválido'], 400);
        }
        if (!in_array($status, ['ATIVO', 'INATIVO'], true)) {
            consorcio_json_exit(['success' => false, 'message' => 'Status inválido'], 400);
        }

        $st = $pdo->prepare('SELECT id FROM consorcio_empresas WHERE id = ? LIMIT 1');
        $st->execute([$empresaId]);
        if (!$st->fetchColumn()) {
            consorcio_json_exit(['success' => false, 'message' => 'Empresa não encontrada'], 404);
        }

        $st = $pdo->prepare(
            "SELECT id, login, nome, role, status FROM consorcio_usuarios
             WHERE id = ? AND empresa_id = ? AND role IN ('ADMIN', 'VENDEDOR') LIMIT 1"
        );
        $st->execute([$usuarioId, $empresaId]);
        $usuario = $st->fetch(PDO::FETCH_ASSOC);
        if (!$usuario) {
            consorcio_json_exit(['success' => false, 'message' => 'Usuário não encontrado nesta empresa'], 404);
        }

        $role = strtoupper((string) ($usuario['role'] ?? 'VENDEDOR'));
        if ($status === 'ATIVO' && $role === 'ADMIN') {
            $st = $pdo->prepare(
                "SELECT id FROM consorcio_usuarios
                 WHERE empresa_id = ? AND role = 'ADMIN' AND status = 'ATIVO' AND id != ? LIMIT 1"
            );
            $st->execute([$empresaId, $usuarioId]);
            if ($st->fetchColumn()) {
                consorcio_json_exit([
                    'success' => false,
                    'message' => 'Empresa já possui um administrador ativo',
                ], 400);
            }
        }

        $st = $pdo->prepare('UPDATE consorcio_usuarios SET status = ? WHERE id = ? AND empresa_id = ?');
        $st->execute([$status, $usuarioId, $empresaId]);

        if ($status === 'INATIVO' && strtoupper((string) ($usuario['status'] ?? '')) === 'ATIVO') {
            consorcio_remover_itens_abertos_usuario($pdo, $usuarioId, $empresaId);
        }

        consorcio_audit_log(
            $pdo,
            $status === 'ATIVO' ? 'USUARIO_ATIVADO' : 'USUARIO_DESATIVADO',
            'Status do usuário alterado pelo master',
            $master,
            $empresaId,
            'usuarios',
            (string) $usuarioId,
            'INFO',
            [
                'usuarioId' => $usuarioId,
                'login' => $usuario['login'],
                'nome' => $usuario['nome'],
                'status' => $status,
            ]
        );

        $empresa = consorcio_fetch_empresa($pdo, $empresaId, $hasFormaCobranca);
        consorcio_json_exit(['success' => true, 'empresa' => $empresa]);
    }

    $id = (int) ($in['id'] ?? 0);
    if ($id <= 0) {
        consorcio_json_exit(['success' => false, 'message' => 'ID inválido'], 400);
    }

    $st = $pdo->prepare('SELECT * FROM consorcio_empresas WHERE id = ? LIMIT 1');
    $st->execute([$id]);
    $current = $st->fetch(PDO::FETCH_ASSOC);
    if (!$current) {
        consorcio_json_exit(['success' => false, 'message' => 'Empresa não encontrada'], 404);
    }

    $nome = array_key_exists('nome', $in) ? trim((string) $in['nome']) : $current['nome'];
    $documento = array_key_exists('documento', $in) ? trim((string) $in['documento']) : $current['documento'];
    $email = array_key_exists('email', $in) ? trim((string) $in['email']) : $current['email'];
    $telefone = array_key_exists('telefone', $in) ? trim((string) $in['telefone']) : $current['telefone'];
    $status = array_key_exists('status', $in) ? strtoupper(trim((string) $in['status'])) : $current['status'];
    $formaCobranca = array_key_exists('formaCobranca', $in)
        ? strtoupper(trim((string) $in['formaCobranca']))
        : ($hasFormaCobranca ? consorcio_empresa_forma_cobranca($current) : 'MENSAL');
    $planoCodigo = array_key_exists('planoCodigo', $in)
        ? trim((string) $in['planoCodigo'])
        : ($current['plano_codigo'] ?? CONSORCIO_PLANO_PADRAO);
    $diaVencimento = array_key_exists('diaVencimento', $in)
        ? max(1, min(28, (int) $in['diaVencimento']))
        : (int) $current['dia_vencimento'];

    if ($nome === '') {
        consorcio_json_exit(['success' => false, 'message' => 'Nome é obrigatório'], 400);
    }
    if (!in_array($status, ['ATIVA', 'INATIVA', 'SUSPENSA'], true)) {
        $status = $current['status'];
    }
    if (!in_array($formaCobranca, ['MENSAL', 'ANUAL'], true)) {
        $formaCobranca = consorcio_empresa_forma_cobranca($current);
    }

    $plano = consorcio_fetch_plano_por_codigo($pdo, $planoCodigo);
    if (!$plano || !(bool) ($plano['ativo'] ?? true)) {
        consorcio_json_exit(['success' => false, 'message' => 'Plano inválido ou inativo'], 400);
    }
    $planoCodigo = (string) $plano['codigo'];

    $hasPrecoPersonalizado = consorcio_empresa_tem_preco_personalizado($pdo);
    $precoPersonalizado = $hasPrecoPersonalizado && array_key_exists('precoPersonalizado', $in)
        ? ((bool) $in['precoPersonalizado'] ? 1 : 0)
        : (int) ($current['preco_personalizado'] ?? 0);
    $valorMensal = $current['valor_mensal'];
    $valorAnual = $current['valor_anual'];
    if ($hasPrecoPersonalizado && $precoPersonalizado) {
        if (array_key_exists('valorMensalUsuario', $in)) {
            $valorMensal = max(0, round((float) $in['valorMensalUsuario'], 2));
        }
        if (array_key_exists('valorAnualUsuario', $in)) {
            $valorAnual = max(0, round((float) $in['valorAnualUsuario'], 2));
        }
    } elseif ($hasPrecoPersonalizado) {
        $valorMensal = null;
        $valorAnual = null;
    }

    if ($hasFormaCobranca && $hasPrecoPersonalizado) {
        $st = $pdo->prepare(
            'UPDATE consorcio_empresas SET nome = ?, documento = ?, email = ?, telefone = ?,
             status = ?, plano_codigo = ?, preco_personalizado = ?, forma_cobranca = ?,
             valor_mensal = ?, valor_anual = ?, dia_vencimento = ?, updated_at = NOW() WHERE id = ?'
        );
        $st->execute([
            $nome,
            $documento,
            $email,
            $telefone,
            $status,
            $planoCodigo,
            $precoPersonalizado,
            $formaCobranca,
            $valorMensal,
            $valorAnual,
            $diaVencimento,
            $id,
        ]);
    } elseif ($hasFormaCobranca) {
        $st = $pdo->prepare(
            'UPDATE consorcio_empresas SET nome = ?, documento = ?, email = ?, telefone = ?,
             status = ?, plano_codigo = ?, forma_cobranca = ?, dia_vencimento = ?, updated_at = NOW() WHERE id = ?'
        );
        $st->execute([$nome, $documento, $email, $telefone, $status, $planoCodigo, $formaCobranca, $diaVencimento, $id]);
    } else {
        $st = $pdo->prepare(
            'UPDATE consorcio_empresas SET nome = ?, documento = ?, email = ?, telefone = ?,
             status = ?, plano_codigo = ?, dia_vencimento = ?, updated_at = NOW() WHERE id = ?'
        );
        $st->execute([$nome, $documento, $email, $telefone, $status, $planoCodigo, $diaVencimento, $id]);
    }

    consorcio_audit_log(
        $pdo,
        'EMPRESA_ATUALIZADA',
        'Empresa atualizada',
        $master,
        $id,
        'empresas',
        (string) $id,
        'INFO',
        ['formaCobranca' => $formaCobranca, 'status' => $status]
    );

    $empresa = consorcio_fetch_empresa($pdo, $id, $hasFormaCobranca);
    consorcio_json_exit(['success' => true, 'empresa' => $empresa]);
}

consorcio_json_exit(['success' => false, 'message' => 'Método não permitido'], 405);
