<?php
declare(strict_types=1);

/** Fallback se plano não existir no banco */
const CONSORCIO_PRECO_MENSAL_USUARIO = 34.90;
const CONSORCIO_PRECO_ANUAL_USUARIO = 359.88;
const CONSORCIO_PLANO_PADRAO = 'basico';

/** Dias após o vencimento (com saldo em aberto) para bloquear login da empresa */
const CONSORCIO_BLOQUEIO_FATURA_DIAS = 10;

function consorcio_plano_to_api(array $row): array
{
    return [
        'id' => (int) ($row['id'] ?? 0),
        'codigo' => (string) ($row['codigo'] ?? ''),
        'nome' => (string) ($row['nome'] ?? ''),
        'descricao' => (string) ($row['descricao'] ?? ''),
        'valorMensal' => (float) ($row['valor_mensal'] ?? 0),
        'valorAnual' => (float) ($row['valor_anual'] ?? 0),
        'maxUsuarios' => isset($row['max_usuarios']) && $row['max_usuarios'] !== null
            ? (int) $row['max_usuarios']
            : null,
        'ativo' => (bool) ($row['ativo'] ?? true),
    ];
}

function consorcio_fetch_plano_por_codigo(PDO $pdo, string $codigo): ?array
{
    static $cache = [];
    $key = strtolower(trim($codigo));
    if ($key === '') {
        $key = CONSORCIO_PLANO_PADRAO;
    }
    if (array_key_exists($key, $cache)) {
        return $cache[$key];
    }
    $st = $pdo->prepare('SELECT * FROM consorcio_planos WHERE codigo = ? LIMIT 1');
    $st->execute([$key]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    $cache[$key] = $row ?: null;
    return $cache[$key];
}

function consorcio_fetch_planos(PDO $pdo, bool $somenteAtivos = true): array
{
    $sql = 'SELECT * FROM consorcio_planos';
    if ($somenteAtivos) {
        $sql .= ' WHERE ativo = 1';
    }
    $sql .= ' ORDER BY nome ASC';
    $list = [];
    $st = $pdo->query($sql);
    while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
        $list[] = consorcio_plano_to_api($row);
    }
    return $list;
}

function consorcio_precos_referencia(PDO $pdo): array
{
    $plano = consorcio_fetch_plano_por_codigo($pdo, CONSORCIO_PLANO_PADRAO);
    $mensal = (float) ($plano['valor_mensal'] ?? CONSORCIO_PRECO_MENSAL_USUARIO);
    $anual = (float) ($plano['valor_anual'] ?? CONSORCIO_PRECO_ANUAL_USUARIO);
    $anualMes = $anual > 0 ? round($anual / 12, 2) : round(CONSORCIO_PRECO_ANUAL_USUARIO / 12, 2);

    return [
        'mensalUsuario' => $mensal,
        'anualUsuario' => $anual,
        'anualMesUsuario' => $anualMes,
        'planoCodigo' => CONSORCIO_PLANO_PADRAO,
    ];
}

function consorcio_empresa_tem_preco_personalizado(PDO $pdo): bool
{
    static $cache = null;
    if ($cache !== null) {
        return $cache;
    }
    try {
        $pdo->query('SELECT preco_personalizado FROM consorcio_empresas LIMIT 0');
        $cache = true;
    } catch (Throwable $e) {
        $cache = false;
    }
    return $cache;
}

function consorcio_empresa_usa_preco_personalizado(array $empresa): bool
{
    return !empty($empresa['preco_personalizado']);
}

function consorcio_empresa_plano_row(PDO $pdo, array $empresa): ?array
{
    $codigo = trim((string) ($empresa['plano_codigo'] ?? CONSORCIO_PLANO_PADRAO));
    return consorcio_fetch_plano_por_codigo($pdo, $codigo !== '' ? $codigo : CONSORCIO_PLANO_PADRAO);
}

function consorcio_empresa_valores_cobranca(PDO $pdo, array $empresa): array
{
    $plano = consorcio_empresa_plano_row($pdo, $empresa);
    $mensalPlano = (float) ($plano['valor_mensal'] ?? CONSORCIO_PRECO_MENSAL_USUARIO);
    $anualPlano = (float) ($plano['valor_anual'] ?? CONSORCIO_PRECO_ANUAL_USUARIO);

    if (consorcio_empresa_usa_preco_personalizado($empresa)) {
        $mensal = (float) ($empresa['valor_mensal'] ?? 0);
        $anual = (float) ($empresa['valor_anual'] ?? 0);
        return [
            'mensal' => $mensal > 0 ? $mensal : $mensalPlano,
            'anual' => $anual > 0 ? $anual : $anualPlano,
            'origem' => 'personalizado',
        ];
    }

    return [
        'mensal' => $mensalPlano > 0 ? $mensalPlano : CONSORCIO_PRECO_MENSAL_USUARIO,
        'anual' => $anualPlano > 0 ? $anualPlano : CONSORCIO_PRECO_ANUAL_USUARIO,
        'origem' => 'plano',
    ];
}

function consorcio_slugify(string $text): string
{
    $text = mb_strtolower(trim($text));
    $text = preg_replace('/[^\p{L}\p{N}\s-]/u', '', $text) ?? '';
    $text = preg_replace('/[\s-]+/', '-', $text) ?? '';
    $text = trim($text, '-');
    return $text !== '' ? $text : 'empresa';
}

function consorcio_empresa_tem_forma_cobranca(PDO $pdo): bool
{
    static $cache = null;
    if ($cache !== null) {
        return $cache;
    }
    try {
        $pdo->query('SELECT forma_cobranca FROM consorcio_empresas LIMIT 0');
        $cache = true;
    } catch (Throwable $e) {
        $cache = false;
    }
    return $cache;
}

function consorcio_count_empresa_usuarios(PDO $pdo, int $empresaId): int
{
    $st = $pdo->prepare(
        "SELECT COUNT(*) FROM consorcio_usuarios
         WHERE empresa_id = ? AND role IN ('ADMIN','VENDEDOR') AND status = 'ATIVO'"
    );
    $st->execute([$empresaId]);
    return (int) $st->fetchColumn();
}

function consorcio_usuario_tem_cobrar_fatura(PDO $pdo): bool
{
    static $cache = null;
    if ($cache !== null) {
        return $cache;
    }
    try {
        $pdo->query('SELECT cobrar_fatura FROM consorcio_usuarios LIMIT 0');
        $cache = true;
    } catch (Throwable $e) {
        $cache = false;
    }
    return $cache;
}

function consorcio_count_empresa_usuarios_cobraveis(PDO $pdo, int $empresaId): int
{
    $sql = "SELECT COUNT(*) FROM consorcio_usuarios
            WHERE empresa_id = ? AND role IN ('ADMIN','VENDEDOR') AND status = 'ATIVO'";
    if (consorcio_usuario_tem_cobrar_fatura($pdo)) {
        $sql .= ' AND cobrar_fatura = 1';
    }
    $st = $pdo->prepare($sql);
    $st->execute([$empresaId]);
    return (int) $st->fetchColumn();
}

function consorcio_sql_usuarios_cobraveis(PDO $pdo): string
{
    $base = "empresa_id = ? AND role IN ('ADMIN','VENDEDOR') AND status = 'ATIVO'";
    if (consorcio_usuario_tem_cobrar_fatura($pdo)) {
        return $base . ' AND cobrar_fatura = 1';
    }
    return $base;
}

function consorcio_empresa_forma_cobranca(array $empresa): string
{
    $forma = strtoupper((string) ($empresa['forma_cobranca'] ?? 'MENSAL'));
    return $forma === 'ANUAL' ? 'ANUAL' : 'MENSAL';
}

function consorcio_empresa_valor_unitario(PDO $pdo, array $empresa): float
{
    $valores = consorcio_empresa_valores_cobranca($pdo, $empresa);
    $forma = consorcio_empresa_forma_cobranca($empresa);
    return $forma === 'ANUAL' ? $valores['anual'] : $valores['mensal'];
}

function consorcio_calcular_valor_fatura(PDO $pdo, array $empresa, int $qtdUsuarios): float
{
    $qtd = max(0, $qtdUsuarios);
    return round(consorcio_empresa_valor_unitario($pdo, $empresa) * $qtd, 2);
}

function consorcio_next_fatura_numero(PDO $pdo): string
{
    $ano = date('Y');
    $st = $pdo->prepare(
        "SELECT numero FROM consorcio_faturas WHERE numero LIKE ? ORDER BY id DESC LIMIT 1"
    );
    $st->execute(['FAT-' . $ano . '-%']);
    $last = $st->fetchColumn();
    $seq = 1;
    if (is_string($last) && preg_match('/FAT-\d{4}-(\d+)/', $last, $m)) {
        $seq = (int) $m[1] + 1;
    }
    return sprintf('FAT-%s-%04d', $ano, $seq);
}

function consorcio_empresa_to_api(PDO $pdo, array $row, int $qtdUsuarios = 0): array
{
    $forma = consorcio_empresa_forma_cobranca($row);
    $valores = consorcio_empresa_valores_cobranca($pdo, $row);
    $plano = consorcio_empresa_plano_row($pdo, $row);
    $eid = (int) $row['id'];
    $qtdTotal = $qtdUsuarios > 0 ? $qtdUsuarios : consorcio_count_empresa_usuarios($pdo, $eid);
    $qtdCobraveis = consorcio_count_empresa_usuarios_cobraveis($pdo, $eid);

    return [
        'id' => $eid,
        'nome' => $row['nome'],
        'slug' => $row['slug'],
        'documento' => $row['documento'] ?? '',
        'email' => $row['email'] ?? '',
        'telefone' => $row['telefone'] ?? '',
        'status' => $row['status'],
        'planoCodigo' => $row['plano_codigo'] ?? CONSORCIO_PLANO_PADRAO,
        'planoNome' => $plano['nome'] ?? 'Por usuário',
        'precoPersonalizado' => consorcio_empresa_usa_preco_personalizado($row),
        'formaCobranca' => $forma,
        'valorMensalUsuario' => $valores['mensal'],
        'valorAnualUsuario' => $valores['anual'],
        'diaVencimento' => (int) ($row['dia_vencimento'] ?? 10),
        'observacoes' => $row['observacoes'] ?? '',
        'qtdUsuarios' => $qtdTotal,
        'qtdUsuariosCobraveis' => $qtdCobraveis,
        'valorEstimadoFatura' => consorcio_calcular_valor_fatura($pdo, $row, $qtdCobraveis),
        'createdAt' => $row['created_at'] ?? null,
    ];
}

function consorcio_fatura_to_api(array $row, ?array $itens = null): array
{
    $valor = (float) $row['valor'];
    $pago = (float) ($row['valor_pago'] ?? 0);
    $api = [
        'id' => (int) $row['id'],
        'empresaId' => (int) $row['empresa_id'],
        'empresaNome' => $row['empresa_nome'] ?? '',
        'numero' => $row['numero'],
        'tipoMovimento' => $row['tipo_movimento'],
        'tipoPeriodo' => $row['tipo_periodo'],
        'referencia' => $row['referencia'],
        'descricao' => $row['descricao'],
        'valor' => $valor,
        'valorPago' => $pago,
        'saldo' => max(0, round($valor - $pago, 2)),
        'status' => $row['status'],
        'vencimento' => $row['vencimento'],
        'pagoEm' => $row['pago_em'],
        'observacoes' => $row['observacoes'] ?? '',
        'createdAt' => $row['created_at'] ?? null,
    ];
    if ($itens !== null) {
        $api['itens'] = $itens;
        $api['itensPagos'] = count(array_filter($itens, static fn ($i) => ($i['status'] ?? '') === 'PAGA'));
        $api['itensTotal'] = count($itens);
    }
    return $api;
}

function consorcio_tem_fatura_itens(PDO $pdo): bool
{
    static $cache = null;
    if ($cache !== null) {
        return $cache;
    }
    try {
        $pdo->query('SELECT id FROM consorcio_fatura_itens LIMIT 0');
        $cache = true;
    } catch (Throwable $e) {
        $cache = false;
    }
    return $cache;
}

function consorcio_fatura_item_to_api(array $row): array
{
    $valor = (float) $row['valor'];
    $pago = (float) ($row['valor_pago'] ?? 0);
    return [
        'id' => (int) $row['id'],
        'faturaId' => (int) $row['fatura_id'],
        'usuarioId' => (int) $row['usuario_id'],
        'usuarioNome' => $row['usuario_nome'] ?? '',
        'valor' => $valor,
        'valorPago' => $pago,
        'saldo' => max(0, round($valor - $pago, 2)),
        'status' => $row['status'],
        'pagoEm' => $row['pago_em'],
    ];
}

function consorcio_fetch_fatura_itens(PDO $pdo, int $faturaId): array
{
    if (!consorcio_tem_fatura_itens($pdo)) {
        return [];
    }
    $st = $pdo->prepare(
        'SELECT * FROM consorcio_fatura_itens WHERE fatura_id = ? ORDER BY usuario_nome ASC'
    );
    $st->execute([$faturaId]);
    $list = [];
    while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
        $list[] = consorcio_fatura_item_to_api($row);
    }
    return $list;
}

function consorcio_criar_fatura_itens(PDO $pdo, int $faturaId, int $empresaId, float $valorUnitario): void
{
    if (!consorcio_tem_fatura_itens($pdo)) {
        return;
    }
    $st = $pdo->prepare(
        'SELECT id, nome FROM consorcio_usuarios
         WHERE ' . consorcio_sql_usuarios_cobraveis($pdo) . '
         ORDER BY nome ASC'
    );
    $st->execute([$empresaId]);
    $ins = $pdo->prepare(
        'INSERT INTO consorcio_fatura_itens (fatura_id, usuario_id, usuario_nome, valor, status)
         VALUES (?, ?, ?, ?, \'ABERTA\')'
    );
    while ($u = $st->fetch(PDO::FETCH_ASSOC)) {
        $ins->execute([$faturaId, (int) $u['id'], $u['nome'], $valorUnitario]);
    }
}

function consorcio_sync_fatura_totais(PDO $pdo, int $faturaId): void
{
    if (!consorcio_tem_fatura_itens($pdo)) {
        return;
    }
    $st = $pdo->prepare(
        'SELECT COALESCE(SUM(valor_pago), 0) AS pago, COALESCE(SUM(valor), 0) AS total,
                SUM(CASE WHEN status = \'PAGA\' THEN 1 ELSE 0 END) AS qtd_paga,
                COUNT(*) AS qtd_total
         FROM consorcio_fatura_itens WHERE fatura_id = ?'
    );
    $st->execute([$faturaId]);
    $agg = $st->fetch(PDO::FETCH_ASSOC) ?: [];
    $pago = round((float) ($agg['pago'] ?? 0), 2);
    $total = round((float) ($agg['total'] ?? 0), 2);
    $qtdPaga = (int) ($agg['qtd_paga'] ?? 0);
    $qtdTotal = (int) ($agg['qtd_total'] ?? 0);

    if ($qtdTotal > 0 && $qtdPaga >= $qtdTotal) {
        $status = 'PAGA';
    } elseif ($pago > 0) {
        $status = 'PARCIAL';
    } else {
        $st2 = $pdo->prepare('SELECT status FROM consorcio_faturas WHERE id = ?');
        $st2->execute([$faturaId]);
        $status = $st2->fetchColumn() ?: 'ABERTA';
        if (!in_array($status, ['ABERTA', 'VENCIDA'], true)) {
            $status = 'ABERTA';
        }
    }

    $pagoEm = $pago > 0 ? date('Y-m-d') : null;
    $st = $pdo->prepare(
        'UPDATE consorcio_faturas SET valor_pago = ?, status = ?, pago_em = COALESCE(pago_em, ?), updated_at = NOW()
         WHERE id = ?'
    );
    $st->execute([$pago, $status, $pagoEm, $faturaId]);
}

/** Remove linhas em aberto do usuário em faturas não quitadas (ex.: ao desativar). */
function consorcio_remover_itens_abertos_usuario(PDO $pdo, int $usuarioId, int $empresaId): void
{
    if (!consorcio_tem_fatura_itens($pdo) || $usuarioId <= 0 || $empresaId <= 0) {
        return;
    }

    $st = $pdo->prepare(
        "SELECT fi.id, fi.fatura_id FROM consorcio_fatura_itens fi
         INNER JOIN consorcio_faturas f ON f.id = fi.fatura_id
         WHERE fi.usuario_id = ? AND f.empresa_id = ?
           AND f.status IN ('ABERTA','PARCIAL','VENCIDA')
           AND fi.status = 'ABERTA'"
    );
    $st->execute([$usuarioId, $empresaId]);
    $faturaIds = [];
    while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
        $del = $pdo->prepare('DELETE FROM consorcio_fatura_itens WHERE id = ?');
        $del->execute([(int) $row['id']]);
        $faturaIds[(int) $row['fatura_id']] = true;
    }

    foreach (array_keys($faturaIds) as $faturaId) {
        $st = $pdo->prepare('SELECT COALESCE(SUM(valor), 0) FROM consorcio_fatura_itens WHERE fatura_id = ?');
        $st->execute([$faturaId]);
        $novoValor = round((float) $st->fetchColumn(), 2);
        $upd = $pdo->prepare('UPDATE consorcio_faturas SET valor = ?, updated_at = NOW() WHERE id = ?');
        $upd->execute([$novoValor, $faturaId]);
        consorcio_sync_fatura_totais($pdo, $faturaId);
    }
}

function consorcio_backfill_fatura_itens(PDO $pdo, int $faturaId): void
{
    if (!consorcio_tem_fatura_itens($pdo)) {
        return;
    }
    $st = $pdo->prepare('SELECT COUNT(*) FROM consorcio_fatura_itens WHERE fatura_id = ?');
    $st->execute([$faturaId]);
    if ((int) $st->fetchColumn() > 0) {
        return;
    }
    $st = $pdo->prepare('SELECT f.*, e.id AS emp_id FROM consorcio_faturas f INNER JOIN consorcio_empresas e ON e.id = f.empresa_id WHERE f.id = ?');
    $st->execute([$faturaId]);
    $fatura = $st->fetch(PDO::FETCH_ASSOC);
    if (!$fatura) {
        return;
    }
    $st = $pdo->prepare('SELECT * FROM consorcio_empresas WHERE id = ?');
    $st->execute([(int) $fatura['empresa_id']]);
    $empresa = $st->fetch(PDO::FETCH_ASSOC);
    if (!$empresa) {
        return;
    }
    consorcio_criar_fatura_itens($pdo, $faturaId, (int) $fatura['empresa_id'], consorcio_empresa_valor_unitario($pdo, $empresa));
}

function consorcio_fetch_fatura_aberta_empresa(PDO $pdo, int $empresaId): ?array
{
    $st = $pdo->prepare(
        "SELECT f.*, e.nome AS empresa_nome FROM consorcio_faturas f
         INNER JOIN consorcio_empresas e ON e.id = f.empresa_id
         WHERE f.empresa_id = ? AND f.status IN ('ABERTA','PARCIAL','VENCIDA')
         ORDER BY f.id DESC LIMIT 1"
    );
    $st->execute([$empresaId]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        return null;
    }
    $fid = (int) $row['id'];
    consorcio_backfill_fatura_itens($pdo, $fid);
    $itens = consorcio_fetch_fatura_itens($pdo, $fid);
    return consorcio_fatura_to_api($row, $itens);
}

function consorcio_gerar_fatura_empresa(PDO $pdo, int $empresaId, ?int $masterUserId = null): array
{
    $st = $pdo->prepare('SELECT * FROM consorcio_empresas WHERE id = ? LIMIT 1');
    $st->execute([$empresaId]);
    $empresa = $st->fetch(PDO::FETCH_ASSOC);
    if (!$empresa) {
        throw new RuntimeException('Empresa não encontrada');
    }

    $forma = consorcio_empresa_forma_cobranca($empresa);
    $qtd = consorcio_count_empresa_usuarios_cobraveis($pdo, $empresaId);
    if ($qtd <= 0) {
        throw new RuntimeException('Empresa sem usuários cobráveis para faturamento');
    }

    $valor = consorcio_calcular_valor_fatura($pdo, $empresa, $qtd);
    $unitario = consorcio_empresa_valor_unitario($pdo, $empresa);
    $now = new DateTimeImmutable('now');
    $referencia = $forma === 'ANUAL' ? $now->format('Y') : $now->format('Y-m');
    $tipoPeriodo = $forma === 'ANUAL' ? 'ANUAL' : 'MENSAL';

    $st = $pdo->prepare(
        "SELECT id FROM consorcio_faturas
         WHERE empresa_id = ? AND referencia = ? AND tipo_periodo = ? AND status NOT IN ('CANCELADA')
         LIMIT 1"
    );
    $st->execute([$empresaId, $referencia, $tipoPeriodo]);
    if ($st->fetchColumn()) {
        throw new RuntimeException('Já existe fatura aberta ou paga para este período');
    }

    $dia = max(1, min(28, (int) ($empresa['dia_vencimento'] ?? 10)));
    $vencimento = $forma === 'ANUAL'
        ? $now->format('Y') . '-' . str_pad((string) $dia, 2, '0', STR_PAD_LEFT)
        : $now->format('Y-m') . '-' . str_pad((string) $dia, 2, '0', STR_PAD_LEFT);

    $unitFmt = number_format($unitario, 2, ',', '.');
    $descricao = $forma === 'ANUAL'
        ? sprintf('Assinatura anual — %s (%d usuários × R$ %s)', $referencia, $qtd, $unitFmt)
        : sprintf('Assinatura mensal — %s (%d usuários × R$ %s)', $referencia, $qtd, $unitFmt);

    $numero = consorcio_next_fatura_numero($pdo);
    $st = $pdo->prepare(
        'INSERT INTO consorcio_faturas
         (empresa_id, numero, tipo_movimento, tipo_periodo, referencia, descricao, valor, status, vencimento)
         VALUES (?, ?, \'RECEBER\', ?, ?, ?, ?, \'ABERTA\', ?)'
    );
    $st->execute([$empresaId, $numero, $tipoPeriodo, $referencia, $descricao, $valor, $vencimento]);
    $faturaId = (int) $pdo->lastInsertId();

    consorcio_criar_fatura_itens($pdo, $faturaId, $empresaId, $unitario);

    $st = $pdo->prepare(
        'SELECT f.*, e.nome AS empresa_nome FROM consorcio_faturas f
         INNER JOIN consorcio_empresas e ON e.id = f.empresa_id WHERE f.id = ?'
    );
    $st->execute([$faturaId]);
    $itens = consorcio_fetch_fatura_itens($pdo, $faturaId);
    return consorcio_fatura_to_api($st->fetch(PDO::FETCH_ASSOC), $itens);
}

function consorcio_baixa_fatura_item(PDO $pdo, int $itemId, array $master, array $input): array
{
    if (!consorcio_tem_fatura_itens($pdo)) {
        throw new RuntimeException('Itens de fatura não disponíveis — execute a migração 003');
    }

    $faturaId = 0;
    $pdo->beginTransaction();
    try {
        $st = $pdo->prepare(
            'SELECT i.*, f.id AS fatura_id, f.status AS fatura_status, f.empresa_id
             FROM consorcio_fatura_itens i
             INNER JOIN consorcio_faturas f ON f.id = i.fatura_id
             WHERE i.id = ? FOR UPDATE'
        );
        $st->execute([$itemId]);
        $item = $st->fetch(PDO::FETCH_ASSOC);
        if (!$item) {
            throw new RuntimeException('Item não encontrado');
        }
        if ($item['status'] === 'PAGA') {
            throw new RuntimeException('Este usuário já foi quitado nesta fatura');
        }
        if ($item['fatura_status'] === 'CANCELADA') {
            throw new RuntimeException('Fatura cancelada');
        }
        if ($item['fatura_status'] === 'PAGA') {
            throw new RuntimeException('Fatura já está totalmente paga');
        }

        $faturaId = (int) $item['fatura_id'];
        $saldoItem = round((float) $item['valor'] - (float) $item['valor_pago'], 2);
        $valorPago = (float) ($input['valor'] ?? $saldoItem);
        if ($valorPago <= 0) {
            throw new RuntimeException('Valor inválido');
        }
        $valorPago = min($valorPago, $saldoItem);

        $forma = strtoupper((string) ($input['forma'] ?? 'MANUAL'));
        $formas = ['MANUAL', 'PIX', 'BOLETO', 'CARTAO', 'TRANSFERENCIA', 'OUTRO'];
        if (!in_array($forma, $formas, true)) {
            $forma = 'MANUAL';
        }
        $dataPag = trim((string) ($input['dataPagamento'] ?? date('Y-m-d')));
        $obs = trim((string) ($input['observacoes'] ?? ''));
        $refExt = trim((string) ($input['referenciaExterna'] ?? ''));
        $masterId = (int) $master['id'];

        $novoItemPago = round((float) $item['valor_pago'] + $valorPago, 2);
        $itemStatus = $novoItemPago >= (float) $item['valor'] - 0.009 ? 'PAGA' : 'ABERTA';

        $st = $pdo->prepare(
            'UPDATE consorcio_fatura_itens SET valor_pago = ?, status = ?, pago_em = ? WHERE id = ?'
        );
        $st->execute([$novoItemPago, $itemStatus, $dataPag, $itemId]);

        $st = $pdo->prepare(
            'INSERT INTO consorcio_fatura_pagamentos
             (fatura_id, fatura_item_id, usuario_id, valor, data_pagamento, forma, referencia_externa, observacoes, registrado_por_usuario_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $st->execute([
            $faturaId,
            $itemId,
            (int) $item['usuario_id'],
            $valorPago,
            $dataPag,
            $forma,
            $refExt,
            $obs,
            $masterId,
        ]);

        consorcio_sync_fatura_totais($pdo, $faturaId);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    $st = $pdo->prepare(
        'SELECT f.*, e.nome AS empresa_nome FROM consorcio_faturas f
         INNER JOIN consorcio_empresas e ON e.id = f.empresa_id WHERE f.id = ?'
    );
    $st->execute([$faturaId]);
    $itens = consorcio_fetch_fatura_itens($pdo, $faturaId);
    return consorcio_fatura_to_api($st->fetch(PDO::FETCH_ASSOC), $itens);
}

function consorcio_baixa_fatura(PDO $pdo, int $faturaId, array $master, array $input): array
{
    $st = $pdo->prepare(
        'SELECT f.*, e.nome AS empresa_nome FROM consorcio_faturas f
         INNER JOIN consorcio_empresas e ON e.id = f.empresa_id WHERE f.id = ? FOR UPDATE'
    );
    $pdo->beginTransaction();
    try {
        $st->execute([$faturaId]);
        $fatura = $st->fetch(PDO::FETCH_ASSOC);
        if (!$fatura) {
            throw new RuntimeException('Fatura não encontrada');
        }
        if ($fatura['status'] === 'CANCELADA') {
            throw new RuntimeException('Fatura cancelada');
        }
        if ($fatura['status'] === 'PAGA') {
            throw new RuntimeException('Fatura já está paga');
        }

        $valor = (float) $fatura['valor'];
        $saldoFatura = max(0, round($valor - (float) $fatura['valor_pago'], 2));
        $valorPago = (float) ($input['valor'] ?? $saldoFatura);
        if ($valorPago <= 0) {
            throw new RuntimeException('Valor de pagamento inválido');
        }
        $valorPago = min($valorPago, $saldoFatura);

        $forma = strtoupper((string) ($input['forma'] ?? 'MANUAL'));
        $formas = ['MANUAL', 'PIX', 'BOLETO', 'CARTAO', 'TRANSFERENCIA', 'OUTRO'];
        if (!in_array($forma, $formas, true)) {
            $forma = 'MANUAL';
        }

        $dataPag = trim((string) ($input['dataPagamento'] ?? date('Y-m-d')));
        $obs = trim((string) ($input['observacoes'] ?? ''));
        $refExt = trim((string) ($input['referenciaExterna'] ?? ''));
        $masterId = (int) $master['id'];

        $st = $pdo->prepare(
            'INSERT INTO consorcio_fatura_pagamentos
             (fatura_id, valor, data_pagamento, forma, referencia_externa, observacoes, registrado_por_usuario_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $st->execute([$faturaId, $valorPago, $dataPag, $forma, $refExt, $obs, $masterId]);

        $novoPago = round((float) $fatura['valor_pago'] + $valorPago, 2);
        $status = $novoPago >= $valor - 0.009 ? 'PAGA' : 'PARCIAL';
        $pagoEm = $novoPago > 0 ? $dataPag : null;

        $st = $pdo->prepare(
            'UPDATE consorcio_faturas
             SET valor_pago = ?, status = ?, pago_em = ?, pago_por_usuario_id = ?, updated_at = NOW()
             WHERE id = ?'
        );
        $st->execute([$novoPago, $status, $pagoEm, $masterId, $faturaId]);

        if (consorcio_tem_fatura_itens($pdo) && $status === 'PAGA') {
            $pdo->prepare(
                "UPDATE consorcio_fatura_itens SET status = 'PAGA', valor_pago = valor, pago_em = ?
                 WHERE fatura_id = ? AND status = 'ABERTA'"
            )->execute([$dataPag, $faturaId]);
        }

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    $st = $pdo->prepare(
        'SELECT f.*, e.nome AS empresa_nome FROM consorcio_faturas f
         INNER JOIN consorcio_empresas e ON e.id = f.empresa_id WHERE f.id = ?'
    );
    $st->execute([$faturaId]);
    $itens = consorcio_fetch_fatura_itens($pdo, $faturaId);
    return consorcio_fatura_to_api($st->fetch(PDO::FETCH_ASSOC), $itens);
}

function consorcio_mensagem_bloqueio_fatura(array $block): string
{
    $numero = (string) ($block['numero'] ?? '');
    $dias = (int) ($block['diasAtraso'] ?? 0);
    $limite = CONSORCIO_BLOQUEIO_FATURA_DIAS;
    $escopo = ($block['escopo'] ?? '') === 'usuario' ? 'sua cobrança' : 'a fatura';

    return sprintf(
        'Acesso suspenso: %s %s está vencida há %d dias (limite: %d dias). Regularize o pagamento para voltar a usar o sistema.',
        $escopo,
        $numero !== '' ? "({$numero})" : 'do período',
        $dias,
        $limite
    );
}

function consorcio_usuario_fatura_bloqueio(PDO $pdo, int $usuarioId, int $empresaId): ?array
{
    if ($usuarioId <= 0 || $empresaId <= 0 || !consorcio_tem_fatura_itens($pdo)) {
        return null;
    }

    try {
        $st = $pdo->prepare(
            "SELECT i.id AS item_id, i.fatura_id, i.valor, i.valor_pago, f.numero, f.vencimento,
                    DATEDIFF(CURDATE(), f.vencimento) AS dias_atraso
             FROM consorcio_fatura_itens i
             INNER JOIN consorcio_faturas f ON f.id = i.fatura_id
             WHERE i.usuario_id = ?
               AND f.empresa_id = ?
               AND f.tipo_movimento = 'RECEBER'
               AND f.status IN ('ABERTA','PARCIAL','VENCIDA')
               AND i.status <> 'PAGA'
               AND (i.valor - i.valor_pago) > 0.009
               AND DATEDIFF(CURDATE(), f.vencimento) > ?
             ORDER BY f.vencimento ASC
             LIMIT 1"
        );
        $st->execute([$usuarioId, $empresaId, CONSORCIO_BLOQUEIO_FATURA_DIAS]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }

        return [
            'code' => 'BILLING_BLOCKED',
            'escopo' => 'usuario',
            'itemId' => (int) $row['item_id'],
            'faturaId' => (int) $row['fatura_id'],
            'numero' => $row['numero'],
            'vencimento' => $row['vencimento'],
            'diasAtraso' => (int) $row['dias_atraso'],
            'saldo' => round((float) $row['valor'] - (float) $row['valor_pago'], 2),
            'limiteDias' => CONSORCIO_BLOQUEIO_FATURA_DIAS,
        ];
    } catch (Throwable $e) {
        return null;
    }
}

function consorcio_empresa_fatura_bloqueio(PDO $pdo, int $empresaId): ?array
{
    if ($empresaId <= 0) {
        return null;
    }

    try {
        $st = $pdo->prepare(
            "SELECT f.id, f.numero, f.vencimento, f.valor, f.valor_pago,
                    DATEDIFF(CURDATE(), f.vencimento) AS dias_atraso
             FROM consorcio_faturas f
             WHERE f.empresa_id = ?
               AND f.tipo_movimento = 'RECEBER'
               AND f.status IN ('ABERTA','PARCIAL','VENCIDA')
               AND (f.valor - f.valor_pago) > 0.009
               AND DATEDIFF(CURDATE(), f.vencimento) > ?
             ORDER BY f.vencimento ASC
             LIMIT 1"
        );
        $st->execute([$empresaId, CONSORCIO_BLOQUEIO_FATURA_DIAS]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }

        return [
            'code' => 'BILLING_BLOCKED',
            'escopo' => 'empresa',
            'faturaId' => (int) $row['id'],
            'numero' => $row['numero'],
            'vencimento' => $row['vencimento'],
            'diasAtraso' => (int) $row['dias_atraso'],
            'saldo' => round((float) $row['valor'] - (float) $row['valor_pago'], 2),
            'limiteDias' => CONSORCIO_BLOQUEIO_FATURA_DIAS,
        ];
    } catch (Throwable $e) {
        return null;
    }
}

function consorcio_mensagem_bloqueio_empresa(array $block): string
{
    $nome = trim((string) ($block['empresaNome'] ?? ''));
    $label = $nome !== '' ? $nome : 'Empresa';
    $status = strtoupper((string) ($block['status'] ?? 'INATIVA'));

    if ($status === 'SUSPENSA') {
        return sprintf(
            'Acesso suspenso: a empresa %s está suspensa. Entre em contato com o suporte da plataforma.',
            $label
        );
    }

    return sprintf(
        'Acesso suspenso: a empresa %s está desativada. Entre em contato com o suporte da plataforma.',
        $label
    );
}

function consorcio_mensagem_bloqueio_usuario(array $block): string
{
    return trim((string) ($block['message'] ?? '')) !== ''
        ? (string) $block['message']
        : 'Sua conta foi desativada. Entre em contato com o suporte da plataforma.';
}

function consorcio_empresa_acesso_bloqueio(PDO $pdo, int $empresaId): ?array
{
    if ($empresaId <= 0) {
        return null;
    }

    try {
        $st = $pdo->prepare('SELECT id, nome, status FROM consorcio_empresas WHERE id = ? LIMIT 1');
        $st->execute([$empresaId]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }
        $status = strtoupper((string) ($row['status'] ?? 'ATIVA'));
        if ($status === 'ATIVA') {
            return null;
        }

        return [
            'code' => 'EMPRESA_INATIVA',
            'escopo' => 'empresa',
            'empresaId' => (int) $row['id'],
            'empresaNome' => $row['nome'],
            'status' => $status,
        ];
    } catch (Throwable $e) {
        return null;
    }
}

function consorcio_usuario_bloqueado_fatura(PDO $pdo, array $user): ?array
{
    $role = strtoupper((string) ($user['role'] ?? 'VENDEDOR'));
    if ($role === 'MASTER') {
        return null;
    }

    $usuarioId = (int) ($user['id'] ?? 0);
    $empresaId = $user['empresa_id'] ?? null;
    if ($usuarioId <= 0 || $empresaId === null || (int) $empresaId <= 0) {
        return null;
    }

    $block = consorcio_usuario_fatura_bloqueio($pdo, $usuarioId, (int) $empresaId);
    if ($block !== null) {
        return $block;
    }

    // Faturas antigas sem itens por usuário: mantém bloqueio por empresa
    if (!consorcio_tem_fatura_itens($pdo)) {
        return consorcio_empresa_fatura_bloqueio($pdo, (int) $empresaId);
    }

    return null;
}

function consorcio_usuario_acesso_bloqueado(PDO $pdo, array $user, bool $ignorarBloqueioFatura = false): ?array
{
    $role = strtoupper((string) ($user['role'] ?? 'VENDEDOR'));
    if ($role === 'MASTER') {
        return null;
    }

    $userId = (int) ($user['id'] ?? 0);
    if ($userId > 0) {
        try {
            $st = $pdo->prepare('SELECT status FROM consorcio_usuarios WHERE id = ? LIMIT 1');
            $st->execute([$userId]);
            $userStatus = strtoupper((string) $st->fetchColumn());
            if ($userStatus !== '' && $userStatus !== 'ATIVO') {
                return [
                    'code' => 'USUARIO_INATIVO',
                    'message' => 'Sua conta foi desativada. Entre em contato com o suporte da plataforma.',
                ];
            }
        } catch (Throwable $e) {
            // ignora falha pontual de leitura
        }
    }

    $empresaId = $user['empresa_id'] ?? null;
    if ($empresaId === null || (int) $empresaId <= 0) {
        if ($userId > 0) {
            try {
                $st = $pdo->prepare('SELECT empresa_id FROM consorcio_usuarios WHERE id = ? LIMIT 1');
                $st->execute([$userId]);
                $eid = $st->fetchColumn();
                if ($eid !== false && $eid !== null) {
                    $empresaId = (int) $eid;
                }
            } catch (Throwable $e) {
            }
        }
    }
    if ($empresaId === null || (int) $empresaId <= 0) {
        return null;
    }

    $empresaBlock = consorcio_empresa_acesso_bloqueio($pdo, (int) $empresaId);
    if ($empresaBlock !== null) {
        return $empresaBlock;
    }

    if ($ignorarBloqueioFatura) {
        return null;
    }

    $user['empresa_id'] = (int) $empresaId;
    return consorcio_usuario_bloqueado_fatura($pdo, $user);
}

function consorcio_json_bloqueio_fatura(array $block, int $httpCode = 403): void
{
    $code = (string) ($block['code'] ?? 'BILLING_BLOCKED');
    if ($code === 'EMPRESA_INATIVA') {
        $message = consorcio_mensagem_bloqueio_empresa($block);
    } elseif ($code === 'USUARIO_INATIVO') {
        $message = consorcio_mensagem_bloqueio_usuario($block);
    } else {
        $message = consorcio_mensagem_bloqueio_fatura($block);
    }

    http_response_code($httpCode);
    echo json_encode([
        'success' => false,
        'message' => $message,
        'code' => $code,
        'billing' => $block,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
