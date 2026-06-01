<?php
declare(strict_types=1);

require_once __DIR__ . '/lib/bootstrap.php';
require_once __DIR__ . '/lib/transform.php';
require_once __DIR__ . '/lib/installments.php';

consorcio_api_begin();
$user = consorcio_require_login();
if (consorcio_is_admin($user)) {
    consorcio_json_exit(['success' => false, 'message' => 'Use admin_dashboard.php', 'code' => 'ADMIN_REDIRECT'], 400);
}

$pdo = consorcio_pdo();
if (!$pdo) {
    consorcio_json_exit(['success' => false, 'message' => 'Banco indisponível'], 503);
}

$uid = (int) $user['id'];
consorcio_refresh_user_sales_status($pdo, $uid);

$period = strtolower(trim((string) ($_GET['period'] ?? 'month')));
$year = (int) ($_GET['year'] ?? (int) date('Y'));
$month = (int) ($_GET['month'] ?? (int) date('m'));

if ($period === 'year') {
    $datePred = consorcio_sql_sales_year_predicate();
    $dateParams = [(string) $year];
} else {
    $datePred = consorcio_sql_sales_month_year_predicate();
    $dateParams = [$year, sprintf('%02d', $month)];
}

$st = $pdo->prepare(
    "SELECT COALESCE(SUM(card_value),0) AS v, COALESCE(SUM(down_payment),0) AS entrada, COUNT(*) AS qtd
     FROM consorcio_sales WHERE usuario_id = ? AND {$datePred}"
);
$st->execute(array_merge([$uid], $dateParams));
$m = $st->fetch(PDO::FETCH_ASSOC);
$totalSales = (float) $m['v'];
$totalEntrada = (float) $m['entrada'];
$contractsCount = (int) $m['qtd'];

if ($period === 'year') {
    $paidPred = 'YEAR(p.paid_at) = ?';
    $paidParams = [$year];
} else {
    $paidPred = 'YEAR(p.paid_at) = ? AND MONTH(p.paid_at) = ?';
    $paidParams = [$year, $month];
}
$st = $pdo->prepare(
    "SELECT COALESCE(SUM(p.amount), 0) FROM consorcio_parcelas p
     INNER JOIN consorcio_sales s ON s.id = p.sale_id
     WHERE s.usuario_id = ? AND p.status = 'paga' AND p.paid_at IS NOT NULL AND {$paidPred}"
);
$st->execute(array_merge([$uid], $paidParams));
$totalRecebido = (float) $st->fetchColumn();

$st = $pdo->prepare('SELECT COUNT(*) FROM consorcio_leads WHERE usuario_id = ?');
$st->execute([$uid]);
$leadsCount = (int) $st->fetchColumn();

$st = $pdo->prepare(
    "SELECT client_status, COUNT(*) AS c FROM consorcio_sales WHERE usuario_id = ? GROUP BY client_status"
);
$st->execute([$uid]);
$statusCounts = ['ativo' => 0, 'inadimplente' => 0, 'quitado' => 0];
while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
    $statusCounts[$row['client_status']] = (int) $row['c'];
}
$totalClients = array_sum($statusCounts);
$activePercent = $totalClients > 0 ? round(($statusCounts['ativo'] / $totalClients) * 100, 1) : 0;
$delinquentPercent = $totalClients > 0 ? round(($statusCounts['inadimplente'] / $totalClients) * 100, 1) : 0;

if ($period === 'year') {
    $ymExpr = consorcio_sql_expr_sale_year_month();
    $st = $pdo->prepare(
        "SELECT {$ymExpr} AS ym, COALESCE(SUM(card_value),0) AS total, COUNT(*) AS qtd
         FROM consorcio_sales WHERE usuario_id = ? AND {$datePred}
         GROUP BY {$ymExpr} ORDER BY ym ASC"
    );
    $st->execute(array_merge([$uid], $dateParams));
} else {
    $chartSince = consorcio_sql_sales_since_month_start_months_ago(5);
    $ymExpr = consorcio_sql_expr_sale_year_month();
    $st = $pdo->prepare(
        "SELECT {$ymExpr} AS ym, COALESCE(SUM(card_value),0) AS total, COUNT(*) AS qtd
         FROM consorcio_sales WHERE usuario_id = ? AND {$chartSince}
         GROUP BY {$ymExpr} ORDER BY ym ASC"
    );
    $st->execute([$uid]);
}

$mesShort = ['01' => 'Jan', '02' => 'Fev', '03' => 'Mar', '04' => 'Abr', '05' => 'Mai', '06' => 'Jun', '07' => 'Jul', '08' => 'Ago', '09' => 'Set', '10' => 'Out', '11' => 'Nov', '12' => 'Dez'];
$salesChartData = [];
foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $row) {
    $parts = explode('-', $row['ym']);
    $label = ($mesShort[$parts[1] ?? ''] ?? $parts[1] ?? '') . '/' . substr($parts[0] ?? '', 2);
    $salesChartData[] = [
        'id' => $row['ym'],
        'name' => $label,
        'vendas' => (float) $row['total'],
        'contratos' => (int) $row['qtd'],
    ];
}

$st = $pdo->prepare(
    "SELECT * FROM consorcio_leads WHERE usuario_id = ? ORDER BY created_at DESC LIMIT 6"
);
$st->execute([$uid]);
$recentLeads = [];
foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
    $recentLeads[] = consorcio_lead_to_api($r, []);
}

$st = $pdo->prepare(
    "SELECT * FROM consorcio_sales WHERE usuario_id = ? ORDER BY sale_date DESC LIMIT 5"
);
$st->execute([$uid]);
$recentSales = array_map('consorcio_sale_to_api', $st->fetchAll(PDO::FETCH_ASSOC));

consorcio_json_exit([
    'success' => true,
    'period' => $period,
    'year' => $year,
    'month' => $month,
    'stats' => [
        'totalSales' => $totalSales,
        'totalEntrada' => $totalEntrada,
        'totalRecebido' => $totalRecebido,
        'contractsCount' => $contractsCount,
        'leadsCount' => $leadsCount,
        'activeClientsPercent' => $activePercent,
        'delinquentClientsPercent' => $delinquentPercent,
        'clientsAtivos' => $statusCounts['ativo'],
        'clientsInadimplentes' => $statusCounts['inadimplente'],
        'clientsQuitados' => $statusCounts['quitado'],
        'totalClients' => $totalClients,
    ],
    'salesChartData' => $salesChartData,
    'recentLeads' => $recentLeads,
    'recentSales' => $recentSales,
]);
