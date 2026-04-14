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

$st = $pdo->query(
    "SELECT u.id, u.nome, u.month_goal,
            COALESCE(SUM(s.card_value),0) AS total_sales,
            COALESCE(SUM(s.commission),0) AS commission
     FROM consorcio_usuarios u
     LEFT JOIN consorcio_sales s ON s.usuario_id = u.id
     WHERE u.status = 'ATIVO'
     GROUP BY u.id, u.nome, u.month_goal
     ORDER BY total_sales DESC"
);

$sellers = [];
$pos = 1;
$current = null;
while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
    $badge = $pos === 1 ? '🏆' : ($pos === 2 ? '🥈' : ($pos === 3 ? '🥉' : null));
    $item = [
        'id' => (string) $row['id'],
        'name' => $row['nome'],
        'avatar' => consorcio_iniciais($row['nome']),
        'totalSales' => (float) $row['total_sales'],
        'commission' => (float) $row['commission'],
        'position' => $pos,
        'badge' => $badge,
        'monthGoal' => (float) $row['month_goal'],
    ];
    $sellers[] = $item;
    if ((int) $row['id'] === $uid) {
        $current = $item;
    }
    $pos++;
}

if ($current === null) {
    $st = $pdo->prepare('SELECT id, nome, month_goal FROM consorcio_usuarios WHERE id = ?');
    $st->execute([$uid]);
    $r = $st->fetch(PDO::FETCH_ASSOC);
    if ($r) {
        $current = [
            'id' => (string) $r['id'],
            'name' => $r['nome'],
            'avatar' => consorcio_iniciais($r['nome']),
            'totalSales' => 0,
            'commission' => 0,
            'position' => count($sellers) + 1,
            'badge' => null,
            'monthGoal' => (float) $r['month_goal'],
        ];
    }
}

$goal = $current['monthGoal'] ?? 500000;
$totalSalesUser = $current['totalSales'] ?? 0;
$goalProgress = $goal > 0 ? min(100, ($totalSalesUser / $goal) * 100) : 0;

$todayPred = consorcio_sql_sale_is_today_predicate();
$st = $pdo->prepare(
    "SELECT COUNT(*) FROM consorcio_sales WHERE usuario_id = ? AND {$todayPred}"
);
$st->execute([$uid]);
$salesToday = (int) $st->fetchColumn();

$st = $pdo->prepare('SELECT COALESCE(SUM(card_value),0) FROM consorcio_sales WHERE usuario_id = ?');
$st->execute([$uid]);
$lifetime = (float) $st->fetchColumn();

$achievements = [
    [
        'id' => '1',
        'title' => 'Primeiro Milhão',
        'description' => 'Venda R$ 1.000.000 acumulados',
        'icon' => '💰',
        'unlocked' => $lifetime >= 1000000,
        'progress' => min(100, (int) round(($lifetime / 1000000) * 100)),
    ],
    [
        'id' => '2',
        'title' => 'Hat Trick',
        'description' => '3 vendas em um dia',
        'icon' => '⚽',
        'unlocked' => $salesToday >= 3,
        'progress' => min(100, (int) round(($salesToday / 3) * 100)),
    ],
    [
        'id' => '3',
        'title' => 'Mestre do Mês',
        'description' => 'Líder do ranking',
        'icon' => '👑',
        'unlocked' => ($current['position'] ?? 99) === 1,
        'progress' => ($current['position'] ?? 99) === 1 ? 100 : max(0, 100 - (($current['position'] ?? 5) - 1) * 25),
    ],
    [
        'id' => '4',
        'title' => 'Cliente VIP',
        'description' => 'Venda acima de R$ 500K',
        'icon' => '💎',
        'unlocked' => false,
        'progress' => 0,
    ],
    [
        'id' => '5',
        'title' => 'Maratonista',
        'description' => 'Meta do mês acima de 80%',
        'icon' => '🏃',
        'unlocked' => $goalProgress >= 80,
        'progress' => min(100, (int) round($goalProgress)),
    ],
];

$st = $pdo->prepare('SELECT MAX(card_value) FROM consorcio_sales WHERE usuario_id = ?');
$st->execute([$uid]);
$maxSale = (float) $st->fetchColumn();
foreach ($achievements as &$a) {
    if ($a['id'] === '4') {
        $a['unlocked'] = $maxSale >= 500000;
        $a['progress'] = min(100, (int) round(($maxSale / 500000) * 100));
    }
}
unset($a);

consorcio_json_exit([
    'success' => true,
    'sellers' => $sellers,
    'currentUser' => $current,
    'goalProgress' => round($goalProgress, 1),
    'achievements' => $achievements,
]);
