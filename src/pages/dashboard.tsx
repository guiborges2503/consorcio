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
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
        {error}
      </div>
    );
  }

  if (!data) {
    return <p className="text-muted-foreground">Carregando dashboard…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Link to="/leads">
          <Button className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 shadow-lg shadow-purple-500/30 rounded-2xl h-12 px-6">
            <Plus className="w-5 h-5 mr-2" />
            Novo Lead
          </Button>
        </Link>
        <Link to="/leads">
          <Button
            variant="outline"
            className="border-2 rounded-2xl h-12 px-6 hover:bg-gray-50"
          >
            <Phone className="w-5 h-5 mr-2" />
            Registrar Contato
          </Button>
        </Link>
        <Button
          variant="outline"
          className="border-2 rounded-2xl h-12 px-6 hover:bg-gray-50"
          onClick={() => setNewSaleOpen(true)}
        >
          <ShoppingCart className="w-5 h-5 mr-2" />
          Nova Venda
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Vendido"
          value={`R$ ${(totalSales / 1000).toFixed(0)}K`}
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
            value: `R$ ${(remaining / 1000).toFixed(0)}K restante`,
            positive: false,
          }}
        />
        <StatCard
          title="Comissão (mês)"
          value={`R$ ${(commission / 1000).toFixed(1)}K`}
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

      <Card className="p-6 rounded-3xl border-0 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold mb-1">Meta vs Realizado</h3>
            <p className="text-sm text-muted-foreground">
              Faltam R$ {(remaining / 1000).toFixed(0)}K para a meta do mês.
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{goalProgress.toFixed(0)}%</p>
          </div>
        </div>
        <Progress value={goalProgress} className="h-3 rounded-full" />
        <div className="flex justify-between mt-2 text-sm text-muted-foreground">
          <span>R$ {(totalSales / 1000).toFixed(0)}K</span>
          <span>R$ {(monthGoal / 1000).toFixed(0)}K</span>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 rounded-3xl border-0 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Vendas por Mês</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={salesChartData.length ? salesChartData : [{ id: "—", name: "—", vendas: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="name" tickLine={false} />
              <YAxis tickLine={false} />
              <Tooltip
                formatter={(value: number) => `R$ ${(value / 1000).toFixed(0)}K`}
                contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
              />
              <Bar dataKey="vendas" fill="#7c3aed" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 rounded-3xl border-0 shadow-sm">
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
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-white font-medium">
                  {seller.position}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{seller.name}</p>
                    {seller.badge && <span className="text-lg">{seller.badge}</span>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    R$ {(seller.totalSales / 1000).toFixed(0)}K
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-green-600">
                    R$ {(seller.commission / 1000).toFixed(1)}K
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 rounded-3xl border-0 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Próximos Contatos</h3>
          </div>
          <div className="space-y-3">
            {upcomingContacts.map((lead) => (
              <Link key={lead.id} to={`/leads/${lead.id}`}>
                <div className="flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex-1">
                    <p className="font-medium">{lead.name}</p>
                    <p className="text-sm text-muted-foreground">{lead.nextAction}</p>
                  </div>
                  <Badge
                    className={`rounded-full ${
                      lead.status === "hot"
                        ? "bg-red-100 text-red-700"
                        : lead.status === "warm"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {lead.status === "hot" ? "Quente" : lead.status === "warm" ? "Morno" : "Frio"}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-6 rounded-3xl border-0 shadow-sm bg-gradient-to-br from-orange-50 to-red-50">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-orange-900">Leads Esquecidos</h3>
          </div>
          {forgottenLeads.length > 0 ? (
            <div className="space-y-3">
              {forgottenLeads.map((lead) => (
                <Link key={lead.id} to={`/leads/${lead.id}`}>
                  <div className="flex items-center justify-between p-4 bg-white rounded-2xl hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex-1">
                      <p className="font-medium">{lead.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Último contato: {new Date(lead.lastContact).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <Button size="sm" className="rounded-xl bg-orange-600 hover:bg-orange-700">
                      Retomar
                    </Button>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Parabéns! Nenhum lead esquecido 🎉
            </p>
          )}
        </Card>
      </div>

      <NewSaleDialog open={newSaleOpen} onOpenChange={setNewSaleOpen} />
    </div>
  );
}
