<?php
declare(strict_types=1);

require_once __DIR__ . '/lib/bootstrap.php';
require_once __DIR__ . '/lib/transform.php';

consorcio_api_begin();
consorcio_require_admin();
$pdo = consorcio_pdo();
if (!$pdo) {
    consorcio_json_exit(['success' => false, 'message' => 'Banco indisponível'], 503);
}

$period = strtolower(trim((string) ($_GET['period'] ?? 'all')));
$year = (int) ($_GET['year'] ?? (int) date('Y'));
$month = (int) ($_GET['month'] ?? (int) date('m'));

$joinOn = 's.usuario_id = u.id';
$params = [];
if ($period === 'month') {
    $joinOn .= ' AND ' . consorcio_sql_sales_month_year_predicate();
    $params = [$year, sprintf('%02d', $month)];
} elseif ($period === 'year') {
    $joinOn .= ' AND ' . consorcio_sql_sales_year_predicate();
    $params = [(string) $year];
}

$sql = "SELECT u.id, u.nome, u.month_goal,
            COALESCE(SUM(s.card_value),0) AS total_sales,
            COALESCE(SUM(s.commission),0) AS commission,
            COUNT(s.id) AS contracts
     FROM consorcio_usuarios u
     LEFT JOIN consorcio_sales s ON {$joinOn}
     WHERE u.status = 'ATIVO' AND u.role = 'VENDEDOR'
     GROUP BY u.id, u.nome, u.month_goal
     ORDER BY total_sales DESC";

$st = $pdo->prepare($sql);
$st->execute($params);

$sellers = [];
$pos = 1;
while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
    $badge = $pos === 1 ? '🏆' : ($pos === 2 ? '🥈' : ($pos === 3 ? '🥉' : null));
    $total = (float) $row['total_sales'];
    $goal = (float) $row['month_goal'];
    $sellers[] = [
        'id' => (string) $row['id'],
        'name' => $row['nome'],
        'avatar' => consorcio_iniciais($row['nome']),
        'totalSales' => $total,
        'commission' => (float) $row['commission'],
        'contracts' => (int) $row['contracts'],
        'position' => $pos,
        'badge' => $badge,
        'monthGoal' => $goal,
        'goalProgress' => $goal > 0 ? round(min(100, ($total / $goal) * 100), 1) : 0,
    ];
    $pos++;
}

consorcio_json_exit([
    'success' => true,
    'period' => $period,
    'sellers' => $sellers,
]);
