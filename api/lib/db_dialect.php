<?php
declare(strict_types=1);

/** Filtro: vendas no mês corrente (campo sale_date). */
function consorcio_sql_sales_current_month_predicate(): string
{
    return 'YEAR(sale_date) = YEAR(CURDATE()) AND MONTH(sale_date) = MONTH(CURDATE())';
}

/** Filtro: vendas apenas no mês anterior (calendário). */
function consorcio_sql_sales_previous_calendar_month_predicate(): string
{
    return "sale_date >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 1 MONTH) AND sale_date < DATE_FORMAT(CURDATE(), '%Y-%m-01')";
}

/** Filtro: vendas desde o 1º dia do mês atual menos N meses (inclusive). */
function consorcio_sql_sales_since_month_start_months_ago(int $monthsAgo): string
{
    return sprintf(
        "sale_date >= DATE_SUB(DATE_FORMAT(CURDATE(), '%%Y-%%m-01'), INTERVAL %d MONTH)",
        $monthsAgo
    );
}

/** Expressão SELECT/GROUP BY: ano-mês da venda. */
function consorcio_sql_expr_sale_year_month(): string
{
    return "DATE_FORMAT(sale_date, '%Y-%m')";
}

/** Filtro: últimos N meses a partir de hoje (aprox. comercial). */
function consorcio_sql_sales_since_months_rolling(int $months): string
{
    return sprintf('sale_date >= DATE_SUB(CURDATE(), INTERVAL %d MONTH)', $months);
}

/** Lead sem contato há pelo menos N dias. */
function consorcio_sql_lead_stale_days(int $days): string
{
    return sprintf('last_contact < DATE_SUB(CURDATE(), INTERVAL %d DAY)', $days);
}

/** Filtro: vendas no ano corrente. */
function consorcio_sql_sales_current_year_predicate(): string
{
    return 'YEAR(sale_date) = YEAR(CURDATE())';
}

/** Filtro: vendas em um ano específico (placeholder :year). */
function consorcio_sql_sales_year_predicate(string $yearParam = '?'): string
{
    return "YEAR(sale_date) = {$yearParam}";
}

/** Filtro: vendas em mês/ano específicos. */
function consorcio_sql_sales_month_year_predicate(): string
{
    return 'YEAR(sale_date) = ? AND MONTH(sale_date) = ?';
}

/** Venda com data no dia de hoje. */
function consorcio_sql_sale_is_today_predicate(): string
{
    return 'DATE(sale_date) = CURDATE()';
}
