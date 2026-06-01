import { StatCard } from "../components/stat-card";
import { TrendingUp, FileText, Users, AlertTriangle, CheckCircle2, Trophy } from "lucide-react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import type { DashboardStats, Seller } from "../types/domain";
import { Link } from "react-router";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../lib/api";
import { FeedbackState } from "../components/feedback-state";
import { formatCompactCurrency, formatCurrency } from "../lib/format";
import { PageSkeleton } from "../components/page-skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

type AdminPayload = {
  success?: boolean;
  period?: string;
  stats?: DashboardStats;
  employees?: Seller[];
  salesChartData?: { id: string; name: string; vendas: number }[];
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

export function AdminDashboard() {
  const [data, setData] = useState<AdminPayload | null>(null);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<"month" | "year">("month");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const load = useCallback(async () => {
    try {
      const q = `?period=${period}&year=${year}&month=${month}`;
      const d = await apiGet<AdminPayload>(`/admin_dashboard.php${q}`);
      setData(d);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    }
  }, [period, year, month]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return <FeedbackState type="error" title="Erro no painel admin" description={error} />;
  }
  if (!data) return <PageSkeleton statCards={4} rows={5} />;

  const stats = data.stats;
  const employees = data.employees ?? [];
  const chart = data.salesChartData ?? [];
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Painel Administrativo</h1>
          <p className="text-muted-foreground">Visão geral de todos os vendedores</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={period === "month" ? "default" : "outline"}
            className="rounded-xl"
            onClick={() => setPeriod("month")}
          >
            Mensal
          </Button>
          <Button
            variant={period === "year" ? "default" : "outline"}
            className="rounded-xl"
            onClick={() => setPeriod("year")}
          >
            Anual
          </Button>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Geral"
          value={formatCompactCurrency(stats?.totalSales ?? 0)}
          icon={TrendingUp}
          color="purple"
          trend={{ value: `${stats?.contractsCount ?? 0} contratos`, positive: true }}
        />
        <StatCard
          title="Entradas"
          value={formatCompactCurrency(stats?.totalEntrada ?? 0)}
          icon={FileText}
          color="blue"
        />
        <StatCard
          title="Clientes Ativos"
          value={`${stats?.activeClientsPercent ?? 0}%`}
          icon={CheckCircle2}
          color="green"
        />
        <StatCard
          title="Inadimplentes"
          value={`${stats?.delinquentClientsPercent ?? 0}%`}
          icon={AlertTriangle}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard title="Total Leads" value={String(stats?.totalLeads ?? 0)} icon={Users} color="blue" />
        <StatCard title="Total Clientes" value={String(stats?.totalClients ?? 0)} icon={Users} color="purple" />
      </div>

      <Card className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Contratos Consolidados</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chart.length ? chart : [{ id: "—", name: "—", vendas: 0 }]}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="name" tickLine={false} />
            <YAxis tickLine={false} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Bar dataKey="vendas" fill="#334155" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-600" />
            Desempenho por Vendedor
          </h3>
          <Link to="/ranking">
            <Button variant="outline" size="sm" className="rounded-xl">
              Ranking completo
            </Button>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-3 pr-4">#</th>
                <th className="py-3 pr-4">Vendedor</th>
                <th className="py-3 pr-4">Valor Total</th>
                <th className="py-3 pr-4">Entrada</th>
                <th className="py-3 pr-4">Contratos</th>
                <th className="py-3">Inadimplentes</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} className="border-b last:border-0">
                  <td className="py-3 pr-4">
                    {emp.badge ?? emp.position}
                  </td>
                  <td className="py-3 pr-4 font-medium">{emp.name}</td>
                  <td className="py-3 pr-4 tabular-nums">{formatCompactCurrency(emp.totalSales)}</td>
                  <td className="py-3 pr-4 tabular-nums">
                    {formatCompactCurrency(emp.totalEntrada ?? 0)}
                  </td>
                  <td className="py-3 pr-4">{emp.contracts ?? 0}</td>
                  <td className="py-3 text-red-700">{emp.inadimplentes ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
