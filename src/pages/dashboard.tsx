import { StatCard } from "../components/stat-card";
import {
  TrendingUp,
  FileText,
  Users,
  Plus,
  ShoppingCart,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import type { DashboardStats, Lead, Sale } from "../types/domain";
import { Link } from "react-router";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../lib/api";
import { FeedbackState } from "../components/feedback-state";
import { formatCompactCurrency, formatCurrency } from "../lib/format";
import { PageSkeleton } from "../components/page-skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

type DashboardPayload = {
  success?: boolean;
  period?: string;
  year?: number;
  month?: number;
  stats?: DashboardStats;
  salesChartData?: { id: string; name: string; vendas: number; contratos?: number }[];
  recentLeads?: Lead[];
  recentSales?: Sale[];
};

const MONTHS = [
  { v: "1", l: "Janeiro" },
  { v: "2", l: "Fevereiro" },
  { v: "3", l: "Março" },
  { v: "4", l: "Abril" },
  { v: "5", l: "Maio" },
  { v: "6", l: "Junho" },
  { v: "7", l: "Julho" },
  { v: "8", l: "Agosto" },
  { v: "9", l: "Setembro" },
  { v: "10", l: "Outubro" },
  { v: "11", l: "Novembro" },
  { v: "12", l: "Dezembro" },
];

export function Dashboard() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<"month" | "year">("month");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const load = useCallback(async () => {
    try {
      const q = `?period=${period}&year=${year}&month=${month}`;
      const d = await apiGet<DashboardPayload>(`/dashboard.php${q}`);
      setData(d);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    }
  }, [period, year, month]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = data?.stats;
  const salesChartData = data?.salesChartData ?? [];
  const recentLeads = data?.recentLeads ?? [];
  const recentSales = data?.recentSales ?? [];

  if (error) {
    return (
      <FeedbackState type="error" title="Não foi possível carregar o dashboard" description={error} />
    );
  }

  if (!data) {
    return <PageSkeleton statCards={4} rows={4} />;
  }

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={period === "month" ? "default" : "outline"}
            className="rounded-xl"
            onClick={() => setPeriod("month")}
          >
            Visão Mensal
          </Button>
          <Button
            variant={period === "year" ? "default" : "outline"}
            className="rounded-xl"
            onClick={() => setPeriod("year")}
          >
            Visão Anual
          </Button>
        </div>
        <div className="flex flex-col items-stretch sm:items-end gap-3">
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Link to="/contratos/novo">
              <Button className="h-12 rounded-xl px-6">
                <ShoppingCart className="w-5 h-5 mr-2" />
                Novo Contrato
              </Button>
            </Link>
            <Link to="/leads">
              <Button variant="outline" className="h-12 rounded-xl border-border px-6">
                <Plus className="w-5 h-5 mr-2" />
                Novo Lead
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-28 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {period === "month" && (
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger className="w-36 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.v} value={m.v}>
                      {m.l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <StatCard
          title="Total Contratos"
          value={formatCompactCurrency(stats?.totalSales ?? 0)}
          icon={TrendingUp}
          color="purple"
          trend={{ value: `${stats?.contractsCount ?? 0} contratos`, positive: true }}
        />
        <StatCard
          title="Entrada à vista"
          value={formatCompactCurrency(stats?.totalEntrada ?? 0)}
          icon={FileText}
          color="blue"
        />
        <StatCard
          title="Parcelas recebidas"
          value={formatCompactCurrency(stats?.totalRecebido ?? 0)}
          icon={CheckCircle2}
          color="green"
        />
        <StatCard
          title="Clientes Ativos"
          value={`${stats?.activeClientsPercent ?? 0}%`}
          icon={CheckCircle2}
          color="green"
          trend={{ value: `${stats?.clientsAtivos ?? 0} clientes`, positive: true }}
        />
        <StatCard
          title="Inadimplentes"
          value={`${stats?.delinquentClientsPercent ?? 0}%`}
          icon={AlertTriangle}
          color="orange"
          trend={{
            value: `${stats?.clientsInadimplentes ?? 0} clientes`,
            positive: (stats?.clientsInadimplentes ?? 0) === 0,
          }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard
          title="Leads"
          value={String(stats?.leadsCount ?? 0)}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Total Clientes"
          value={String(stats?.totalClients ?? 0)}
          icon={Users}
          color="purple"
        />
      </div>

      <Card className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">
          {period === "year" ? `Contratos em ${year}` : "Evolução Mensal"}
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={salesChartData.length ? salesChartData : [{ id: "—", name: "—", vendas: 0 }]}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="name" tickLine={false} className="text-xs text-muted-foreground" />
            <YAxis tickLine={false} className="text-xs text-muted-foreground" />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ borderRadius: "12px", border: "1px solid rgba(15,23,42,0.08)" }}
            />
            <Bar dataKey="vendas" fill="#64748b" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Últimos Contratos</h3>
            <Link to="/contratos">
              <Button variant="ghost" size="sm" className="rounded-xl">
                Ver todos
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {recentSales.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum contrato cadastrado.</p>
            )}
            {recentSales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between rounded-xl border p-4">
                <div>
                  <p className="font-medium">{sale.clientName}</p>
                  <p className="text-sm text-muted-foreground">{formatCurrency(sale.cardValue)}</p>
                </div>
                <Badge
                  className={
                    sale.clientStatus === "inadimplente"
                      ? "bg-red-50 text-red-800 border-red-200"
                      : sale.clientStatus === "quitado"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-slate-50 text-slate-800 border-slate-200"
                  }
                >
                  {sale.clientStatus}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Leads Recentes</h3>
            <Link to="/leads">
              <Button variant="ghost" size="sm" className="rounded-xl">
                Ver todos
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {recentLeads.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum lead cadastrado.</p>
            )}
            {recentLeads.map((lead) => (
              <Link key={lead.id} to={`/leads/${lead.id}`}>
                <div className="flex items-center justify-between rounded-xl border p-4 hover:bg-muted/50">
                  <div>
                    <p className="font-medium">{lead.name}</p>
                    <p className="text-sm text-muted-foreground">{lead.phone}</p>
                  </div>
                  <Badge variant="outline">{lead.status}</Badge>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
