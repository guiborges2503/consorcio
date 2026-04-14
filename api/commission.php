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

$st = $pdo->prepare('SELECT * FROM consorcio_sales WHERE usuario_id = ?');
$st->execute([$uid]);
$all = $st->fetchAll(PDO::FETCH_ASSOC);

$paidCommission = 0.0;
$pendingCommission = 0.0;
$totalCommission = 0.0;
$counts = ['paid' => 0, 'approved' => 0, 'pending' => 0];
$sumByStatus = ['paid' => 0.0, 'approved' => 0.0, 'pending' => 0.0];

foreach ($all as $r) {
    $c = (float) $r['commission'];
    $totalCommission += $c;
    $stt = $r['status'];
    if ($stt === 'paid') {
        $paidCommission += $c;
        $counts['paid']++;
        $sumByStatus['paid'] += $c;
    } elseif ($stt === 'approved') {
        $pendingCommission += $c;
        $counts['approved']++;
        $sumByStatus['approved'] += $c;
    } else {
        $pendingCommission += $c;
        $counts['pending']++;
        $sumByStatus['pending'] += $c;
    }
}

$ymExpr = consorcio_sql_expr_sale_year_month();
$since8 = consorcio_sql_sales_since_months_rolling(8);
$st = $pdo->prepare(
    "SELECT {$ymExpr} AS ym,
            COALESCE(SUM(CASE WHEN status = 'paid' THEN commission ELSE 0 END),0) AS ganhos
     FROM consorcio_sales
     WHERE usuario_id = ? AND {$since8}
     GROUP BY {$ymExpr}
     ORDER BY ym ASC"
);
$st->execute([$uid]);
$rows = $st->fetchAll(PDO::FETCH_ASSOC);
$mesShort = ['01' => 'Jan', '02' => 'Fev', '03' => 'Mar', '04' => 'Abr', '05' => 'Mai', '06' => 'Jun', '07' => 'Jul', '08' => 'Ago', '09' => 'Set', '10' => 'Out', '11' => 'Nov', '12' => 'Dez'];
$commissionChartData = [];
foreach ($rows as $row) {
    $parts = explode('-', $row['ym']);
    $commissionChartData[] = [
        'month' => $mesShort[$parts[1] ?? ''] ?? $row['ym'],
        'ganhos' => (float) $row['ganhos'],
    ];
}

$st = $pdo->prepare(
    "SELECT * FROM consorcio_sales WHERE usuario_id = ? AND status = 'approved' ORDER BY sale_date DESC"
);
$st->execute([$uid]);
$upcoming = array_map('consorcio_sale_to_api', $st->fetchAll(PDO::FETCH_ASSOC));

consorcio_json_exit([
    'success' => true,
    'paidCommission' => $paidCommission,
    'pendingCommission' => $pendingCommission,
    'totalCommission' => $totalCommission,
    'commissionChartData' => $commissionChartData,
    'upcomingPayments' => $upcoming,
    'counts' => $counts,
    'sumByStatus' => $sumByStatus,
]);
