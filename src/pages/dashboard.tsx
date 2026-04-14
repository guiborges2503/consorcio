import { StatCard } from "../components/stat-card";
import {
  TrendingUp,
  Target,
  DollarSign,
  Users,
  Plus,
  Phone,
  ShoppingCart,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import type { Lead, Seller } from "../types/domain";
import { Link } from "react-router";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { NewSaleDialog } from "../components/new-sale-dialog";
import { useEffect, useState } from "react";
import { apiGet } from "../lib/api";
import { FeedbackState } from "../components/feedback-state";
import { formatCompactCurrency, formatCurrency, formatDate } from "../lib/format";
import { PageSkeleton } from "../components/page-skeleton";

type DashboardPayload = {
  success?: boolean;
  stats?: {
    totalSales: number;
    monthGoal: number;
    goalProgress: number;
    commission: number;
    leadsActive: number;
    trendSalesPercent: number;
    remainingToGoal: number;
  };
  salesChartData?: { id: string; name: string; vendas: number }[];
  topSellers?: Seller[];
  upcomingContacts?: Lead[];
  forgottenLeads?: Lead[];
};

export function Dashboard() {
  const [newSaleOpen, setNewSaleOpen] = useState(false);
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        const d = await apiGet<DashboardPayload>("/dashboard.php");
        if (ok) setData(d);
      } catch (e) {
        if (ok) setError(e instanceof Error ? e.message : "Erro ao carregar");
      }
    })();
    return () => {
      ok = false;
    };
  }, []);

  const stats = data?.stats;
  const totalSales = stats?.totalSales ?? 0;
  const monthGoal = stats?.monthGoal ?? 500000;
  const commission = stats?.commission ?? 0;
  const goalProgress = stats?.goalProgress ?? 0;
  const salesChartData = data?.salesChartData ?? [];
  const topSellers = data?.topSellers ?? [];
  const upcomingContacts = data?.upcomingContacts ?? [];
  const forgottenLeads = data?.forgottenLeads ?? [];
  const trendPct = stats?.trendSalesPercent ?? 0;
  const leadsCount = stats?.leadsActive ?? 0;
  const remaining = stats?.remainingToGoal ?? Math.max(0, monthGoal - totalSales);

  if (error) {
    return (
      <FeedbackState
        type="error"
        title="Não foi possível carregar o dashboard"
        description={error}
      />
    );
  }

  if (!data) {
    return <PageSkeleton statCards={4} rows={4} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Link to="/leads">
          <Button className="h-12 rounded-xl px-6">
            <Plus className="w-5 h-5 mr-2" />
            Novo Lead
          </Button>
        </Link>
        <Link to="/leads">
          <Button variant="outline" className="h-12 rounded-xl border-border px-6">
            <Phone className="w-5 h-5 mr-2" />
            Registrar Contato
          </Button>
        </Link>
        <Button
          variant="outline"
          className="h-12 rounded-xl border-border px-6"
          onClick={() => setNewSaleOpen(true)}
        >
          <ShoppingCart className="w-5 h-5 mr-2" />
          Nova Venda
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Vendido"
          value={formatCompactCurrency(totalSales)}
          icon={TrendingUp}
          color="purple"
          trend={{
            value: `${trendPct >= 0 ? "+" : ""}${trendPct}% vs mês anterior`,
            positive: trendPct >= 0,
          }}
        />
        <StatCard
          title="Meta do Mês"
          value={`${goalProgress.toFixed(0)}%`}
          icon={Target}
          color="blue"
          trend={{
            value: `${formatCompactCurrency(remaining)} restante`,
            positive: false,
          }}
        />
        <StatCard
          title="Comissão (mês)"
          value={formatCompactCurrency(commission)}
          icon={DollarSign}
          color="green"
          trend={{ value: "Pagas no mês corrente", positive: true }}
        />
        <StatCard
          title="Leads Ativos"
          value={leadsCount.toString()}
          icon={Users}
          color="orange"
        />
      </div>

      <Card className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold mb-1">Meta vs Realizado</h3>
            <p className="text-sm text-muted-foreground">
              Faltam {formatCompactCurrency(remaining)} para a meta do mês.
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{goalProgress.toFixed(0)}%</p>
          </div>
        </div>
        <Progress value={goalProgress} className="h-2.5 rounded-full" />
        <div className="flex justify-between mt-2 text-sm text-muted-foreground">
          <span>{formatCompactCurrency(totalSales)}</span>
          <span>{formatCompactCurrency(monthGoal)}</span>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Vendas por Mês</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={salesChartData.length ? salesChartData : [{ id: "—", name: "—", vendas: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" tickLine={false} className="text-xs text-muted-foreground" />
              <YAxis tickLine={false} className="text-xs text-muted-foreground" />
              <Tooltip
                formatter={(value: number) => `R$ ${(value / 1000).toFixed(0)}K`}
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid rgba(15,23,42,0.08)",
                  boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
                }}
              />
              <Bar dataKey="vendas" fill="#64748b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Top Vendedores</h3>
            <Link to="/ranking">
              <Button variant="ghost" size="sm" className="rounded-xl">
                Ver tudo
              </Button>
            </Link>
          </div>
          <div className="space-y-4">
            {topSellers.slice(0, 5).map((seller) => (
              <div key={seller.id} className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-sm font-medium text-foreground">
                  {seller.position}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{seller.name}</p>
                    {seller.badge && <span className="text-lg">{seller.badge}</span>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatCompactCurrency(seller.totalSales)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-emerald-700/90 tabular-nums">
                    {formatCompactCurrency(seller.commission)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-slate-500" />
            <h3 className="text-lg font-semibold">Próximos Contatos</h3>
          </div>
          <div className="space-y-3">
            {upcomingContacts.length === 0 && (
              <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                Sem contatos agendados para os próximos dias.
              </p>
            )}
            {upcomingContacts.map((lead) => (
              <Link key={lead.id} to={`/leads/${lead.id}`}>
                <div className="flex cursor-pointer items-center justify-between rounded-xl border border-transparent p-4 transition-colors hover:border-border hover:bg-muted/50">
                  <div className="flex-1">
                    <p className="font-medium">{lead.name}</p>
                    <p className="text-sm text-muted-foreground">{lead.nextAction}</p>
                  </div>
                  <Badge
                    className={`rounded-full font-normal ${
                      lead.status === "hot"
                        ? "border border-red-200/80 bg-red-50 text-red-800"
                        : lead.status === "warm"
                          ? "border border-amber-200/80 bg-amber-50 text-amber-900"
                          : "border border-border bg-muted text-muted-foreground"
                    }`}
                  >
                    {lead.status === "hot" ? "Quente" : lead.status === "warm" ? "Morno" : "Frio"}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="rounded-2xl border border-amber-200/60 bg-amber-50/40 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-5 w-5 text-amber-700/80" />
            <h3 className="text-lg font-semibold text-foreground">Leads esquecidos</h3>
          </div>
          {forgottenLeads.length > 0 ? (
            <div className="space-y-3">
              {forgottenLeads.map((lead) => (
                <Link key={lead.id} to={`/leads/${lead.id}`}>
                  <div className="flex cursor-pointer items-center justify-between rounded-xl border border-border/60 bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
                    <div className="flex-1">
                      <p className="font-medium">{lead.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Último contato: {formatDate(lead.lastContact)}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" className="rounded-lg border-amber-300/80">
                      Retomar
                    </Button>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Parabéns! Nenhum lead esquecido.
            </p>
          )}
        </Card>
      </div>

      <NewSaleDialog open={newSaleOpen} onOpenChange={setNewSaleOpen} />
    </div>
  );
}
