<?php
declare(strict_types=1);

require_once __DIR__ . '/lib/bootstrap.php';
require_once __DIR__ . '/lib/transform.php';
require_once __DIR__ . '/lib/installments.php';

consorcio_api_begin();
$user = consorcio_require_admin();
$pdo = consorcio_pdo();
if (!$pdo) {
    consorcio_json_exit(['success' => false, 'message' => 'Banco indisponível'], 503);
}

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
     FROM consorcio_sales WHERE {$datePred}"
);
$st->execute($dateParams);
$totals = $st->fetch(PDO::FETCH_ASSOC);

$st = $pdo->prepare('SELECT COUNT(*) FROM consorcio_leads');
$st->execute();
$totalLeads = (int) $st->fetchColumn();

$st = $pdo->query(
    "SELECT client_status, COUNT(*) AS c FROM consorcio_sales GROUP BY client_status"
);
$statusCounts = ['ativo' => 0, 'inadimplente' => 0, 'quitado' => 0];
while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
    $statusCounts[$row['client_status']] = (int) $row['c'];
}
$totalClients = array_sum($statusCounts);

$st = $pdo->prepare(
    "SELECT u.id, u.nome,
            COALESCE(SUM(s.card_value),0) AS total_sales,
            COALESCE(SUM(s.down_payment),0) AS total_entrada,
            COUNT(s.id) AS contracts,
            COALESCE(SUM(CASE WHEN s.client_status = 'inadimplente' THEN 1 ELSE 0 END),0) AS inadimplentes
     FROM consorcio_usuarios u
     LEFT JOIN consorcio_sales s ON s.usuario_id = u.id AND {$datePred}
     WHERE u.status = 'ATIVO' AND u.role = 'VENDEDOR'
     GROUP BY u.id, u.nome
     ORDER BY total_sales DESC"
);
$st->execute($dateParams);
$employees = [];
$pos = 1;
while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
    $badge = $pos === 1 ? '🏆' : ($pos === 2 ? '🥈' : ($pos === 3 ? '🥉' : null));
    $employees[] = [
        'id' => (string) $row['id'],
        'name' => $row['nome'],
        'avatar' => consorcio_iniciais($row['nome']),
        'totalSales' => (float) $row['total_sales'],
        'totalEntrada' => (float) $row['total_entrada'],
        'contracts' => (int) $row['contracts'],
        'inadimplentes' => (int) $row['inadimplentes'],
        'position' => $pos,
        'badge' => $badge,
    ];
    $pos++;
}

$ymExpr = consorcio_sql_expr_sale_year_month();
if ($period === 'year') {
    $st = $pdo->prepare(
        "SELECT {$ymExpr} AS ym, COALESCE(SUM(card_value),0) AS total
         FROM consorcio_sales WHERE {$datePred}
         GROUP BY {$ymExpr} ORDER BY ym ASC"
    );
    $st->execute($dateParams);
} else {
    $chartSince = consorcio_sql_sales_since_month_start_months_ago(5);
    $st = $pdo->prepare(
        "SELECT {$ymExpr} AS ym, COALESCE(SUM(card_value),0) AS total
         FROM consorcio_sales WHERE {$chartSince}
         GROUP BY {$ymExpr} ORDER BY ym ASC"
    );
    $st->execute();
}

$mesShort = ['01' => 'Jan', '02' => 'Fev', '03' => 'Mar', '04' => 'Abr', '05' => 'Mai', '06' => 'Jun', '07' => 'Jul', '08' => 'Ago', '09' => 'Set', '10' => 'Out', '11' => 'Nov', '12' => 'Dez'];
$chartData = [];
foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $row) {
    $parts = explode('-', $row['ym']);
    $chartData[] = [
        'id' => $row['ym'],
        'name' => ($mesShort[$parts[1] ?? ''] ?? '') . '/' . substr($parts[0] ?? '', 2),
        'vendas' => (float) $row['total'],
    ];
}

consorcio_json_exit([
    'success' => true,
    'period' => $period,
    'year' => $year,
    'month' => $month,
    'stats' => [
        'totalSales' => (float) $totals['v'],
        'totalEntrada' => (float) $totals['entrada'],
        'contractsCount' => (int) $totals['qtd'],
        'totalLeads' => $totalLeads,
        'totalClients' => $totalClients,
        'activeClientsPercent' => $totalClients > 0 ? round(($statusCounts['ativo'] / $totalClients) * 100, 1) : 0,
        'delinquentClientsPercent' => $totalClients > 0 ? round(($statusCounts['inadimplente'] / $totalClients) * 100, 1) : 0,
        'clientsAtivos' => $statusCounts['ativo'],
        'clientsInadimplentes' => $statusCounts['inadimplente'],
    ],
    'employees' => $employees,
    'salesChartData' => $chartData,
]);
