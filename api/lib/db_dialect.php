<?php
declare(strict_types=1);

/** @api */
function consorcio_is_sqlite(): bool
{
    return defined('CONSORCIO_DB_DRIVER') && CONSORCIO_DB_DRIVER === 'sqlite';
}

/** Filtro: vendas no mês corrente (campo sale_date). */
function consorcio_sql_sales_current_month_predicate(): string
{
    if (consorcio_is_sqlite()) {
        return "strftime('%Y', sale_date) = strftime('%Y', 'now') AND strftime('%m', sale_date) = strftime('%m', 'now')";
    }
    return 'YEAR(sale_date) = YEAR(CURDATE()) AND MONTH(sale_date) = MONTH(CURDATE())';
}

/** Filtro: vendas apenas no mês anterior (calendário). */
function consorcio_sql_sales_previous_calendar_month_predicate(): string
{
    if (consorcio_is_sqlite()) {
        return "sale_date >= date('now', 'start of month', '-1 month') AND sale_date < date('now', 'start of month')";
    }
    return "sale_date >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 1 MONTH) AND sale_date < DATE_FORMAT(CURDATE(), '%Y-%m-01')";
}

/** Filtro: vendas desde o 1º dia do mês atual menos N meses (inclusive). */
function consorcio_sql_sales_since_month_start_months_ago(int $monthsAgo): string
{
    if (consorcio_is_sqlite()) {
        return sprintf("sale_date >= date('now', 'start of month', '-%d months')", $monthsAgo);
    }
    return sprintf(
        "sale_date >= DATE_SUB(DATE_FORMAT(CURDATE(), '%%Y-%%m-01'), INTERVAL %d MONTH)",
        $monthsAgo
    );
}

/** Expressão SELECT/GROUP BY: ano-mês da venda. */
function consorcio_sql_expr_sale_year_month(): string
{
    if (consorcio_is_sqlite()) {
        return "strftime('%Y-%m', sale_date)";
    }
    return "DATE_FORMAT(sale_date, '%Y-%m')";
}

/** Filtro: últimos N meses a partir de hoje (aprox. comercial). */
function consorcio_sql_sales_since_months_rolling(int $months): string
{
    if (consorcio_is_sqlite()) {
        return sprintf("sale_date >= date('now', '-%d months')", $months);
    }
    return sprintf('sale_date >= DATE_SUB(CURDATE(), INTERVAL %d MONTH)', $months);
}

/** Lead sem contato há pelo menos N dias. */
function consorcio_sql_lead_stale_days(int $days): string
{
    if (consorcio_is_sqlite()) {
        return sprintf("last_contact < date('now', '-%d days')", $days);
    }
    return sprintf('last_contact < DATE_SUB(CURDATE(), INTERVAL %d DAY)', $days);
}

/** Venda com data no dia de hoje. */
function consorcio_sql_sale_is_today_predicate(): string
{
    if (consorcio_is_sqlite()) {
        return "date(sale_date) = date('now')";
    }
    return 'DATE(sale_date) = CURDATE()';
}
