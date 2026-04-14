<?php
declare(strict_types=1);

require_once __DIR__ . '/lib/bootstrap.php';
require_once __DIR__ . '/lib/transform.php';

consorcio_api_begin();
$user = consorcio_require_login();
$pdo = consorcio_pdo();
if (!$pdo) {
    consorcio_json_exit(['success' => false, 'message' => 'Banco indisponível'], 503);
}

$uid = (int) $user['id'];

$st = $pdo->prepare('SELECT month_goal FROM consorcio_usuarios WHERE id = ?');
$st->execute([$uid]);
$goalRow = $st->fetch(PDO::FETCH_ASSOC);
$monthGoal = $goalRow ? (float) $goalRow['month_goal'] : 500000.0;

$curMonthPred = consorcio_sql_sales_current_month_predicate();
$st = $pdo->prepare(
    "SELECT COALESCE(SUM(card_value),0) AS v,
            COALESCE(SUM(CASE WHEN status = 'paid' THEN commission ELSE 0 END),0) AS c
     FROM consorcio_sales
     WHERE usuario_id = ? AND {$curMonthPred}"
);
$st->execute([$uid]);
$m = $st->fetch(PDO::FETCH_ASSOC);
$totalSales = (float) $m['v'];
$commission = (float) $m['c'];

$prevMonthPred = consorcio_sql_sales_previous_calendar_month_predicate();
$st = $pdo->prepare(
    "SELECT COALESCE(SUM(card_value),0) AS v,
            COALESCE(SUM(CASE WHEN status = 'paid' THEN commission ELSE 0 END),0) AS c
     FROM consorcio_sales
     WHERE usuario_id = ? AND {$prevMonthPred}"
);
$st->execute([$uid]);
$prev = $st->fetch(PDO::FETCH_ASSOC);
$prevV = (float) ($prev['v'] ?? 0);
$trendSales = $prevV > 0 ? round((($totalSales - $prevV) / $prevV) * 100) : ($totalSales > 0 ? 100 : 0);

$st = $pdo->prepare('SELECT COUNT(*) FROM consorcio_leads WHERE usuario_id = ?');
$st->execute([$uid]);
$leadsActive = (int) $st->fetchColumn();

$goalProgress = $monthGoal > 0 ? min(100, ($totalSales / $monthGoal) * 100) : 0;

$ymExpr = consorcio_sql_expr_sale_year_month();
$chartSince = consorcio_sql_sales_since_month_start_months_ago(2);
$st = $pdo->prepare(
    "SELECT {$ymExpr} AS ym, COALESCE(SUM(card_value),0) AS total
     FROM consorcio_sales
     WHERE usuario_id = ? AND {$chartSince}
     GROUP BY {$ymExpr} ORDER BY ym ASC"
);
$st->execute([$uid]);
$chartRows = $st->fetchAll(PDO::FETCH_ASSOC);
$mesShort = ['01' => 'Jan', '02' => 'Fev', '03' => 'Mar', '04' => 'Abr', '05' => 'Mai', '06' => 'Jun', '07' => 'Jul', '08' => 'Ago', '09' => 'Set', '10' => 'Out', '11' => 'Nov', '12' => 'Dez'];
$salesChartData = [];
foreach ($chartRows as $row) {
    $parts = explode('-', $row['ym']);
    $label = ($mesShort[$parts[1] ?? ''] ?? $parts[1] ?? '');
    $salesChartData[] = [
        'id' => $row['ym'],
        'name' => $label,
        'vendas' => (float) $row['total'],
    ];
}

$st = $pdo->query(
    "SELECT u.id, u.nome,
            COALESCE(SUM(s.card_value),0) AS total_sales,
            COALESCE(SUM(s.commission),0) AS commission
     FROM consorcio_usuarios u
     LEFT JOIN consorcio_sales s ON s.usuario_id = u.id
     WHERE u.status = 'ATIVO'
     GROUP BY u.id, u.nome
     ORDER BY total_sales DESC
     LIMIT 5"
);
$top = [];
$pos = 1;
while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
    $badge = $pos === 1 ? '🏆' : ($pos === 2 ? '🥈' : ($pos === 3 ? '🥉' : null));
    $top[] = [
        'id' => (string) $row['id'],
        'name' => $row['nome'],
        'avatar' => consorcio_iniciais($row['nome']),
        'totalSales' => (float) $row['total_sales'],
        'commission' => (float) $row['commission'],
        'position' => $pos,
        'badge' => $badge,
    ];
    $pos++;
}

$st = $pdo->prepare(
    "SELECT * FROM consorcio_leads WHERE usuario_id = ? AND status IN ('hot','warm') ORDER BY last_contact DESC LIMIT 4"
);
$st->execute([$uid]);
$upcoming = [];
foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
    $upcoming[] = consorcio_lead_to_api($r, []);
}

$stalePred = consorcio_sql_lead_stale_days(5);
$st = $pdo->prepare(
    "SELECT * FROM consorcio_leads WHERE usuario_id = ? AND {$stalePred} ORDER BY last_contact ASC"
);
$st->execute([$uid]);
$forgotten = [];
foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
    $forgotten[] = consorcio_lead_to_api($r, []);
}

consorcio_json_exit([
    'success' => true,
    'stats' => [
        'totalSales' => $totalSales,
        'monthGoal' => $monthGoal,
        'goalProgress' => round($goalProgress, 1),
        'commission' => $commission,
        'leadsActive' => $leadsActive,
        'trendSalesPercent' => $trendSales,
        'remainingToGoal' => max(0, $monthGoal - $totalSales),
    ],
    'salesChartData' => $salesChartData,
    'topSellers' => $top,
    'upcomingContacts' => $upcoming,
    'forgottenLeads' => $forgotten,
]);
