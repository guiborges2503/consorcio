import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, Wallet, Calendar } from "lucide-react";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import type { Sale } from "../types/domain";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { apiGet } from "../lib/api";

type CommissionPayload = {
  paidCommission?: number;
  pendingCommission?: number;
  totalCommission?: number;
  commissionChartData?: { month: string; ganhos: number }[];
  upcomingPayments?: Sale[];
  counts?: { paid: number; approved: number; pending: number };
  sumByStatus?: { paid: number; approved: number; pending: number };
};

export function Commission() {
  const [data, setData] = useState<CommissionPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const d = await apiGet<CommissionPayload>("/commission.php");
        setData(d);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro");
      }
    })();
  }, []);

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }
  if (!data) {
    return <p className="text-muted-foreground">Carregando…</p>;
  }

  const paidCommission = data.paidCommission ?? 0;
  const pendingCommission = data.pendingCommission ?? 0;
  const totalCommission = data.totalCommission ?? 0;
  const commissionChartData = data.commissionChartData ?? [];
  const upcomingPayments = data.upcomingPayments ?? [];
  const counts = data.counts ?? { paid: 0, approved: 0, pending: 0 };
  const sumByStatus = data.sumByStatus ?? { paid: 0, approved: 0, pending: 0 };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Comissões</h1>
        <p className="text-muted-foreground">Acompanhe seus ganhos e pagamentos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-8 rounded-3xl border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
              <Wallet className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm opacity-90">Total Recebido</p>
              <p className="text-4xl font-bold">R$ {(paidCommission / 1000).toFixed(1)}K</p>
            </div>
          </div>
          <p className="text-sm opacity-90">Comissões já pagas</p>
        </Card>

        <Card className="p-8 rounded-3xl border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
              <DollarSign className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm opacity-90">A Receber</p>
              <p className="text-4xl font-bold">R$ {(pendingCommission / 1000).toFixed(1)}K</p>
            </div>
          </div>
          <p className="text-sm opacity-90">Aguardando pagamento</p>
        </Card>

        <Card className="p-8 rounded-3xl border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
              <TrendingUp className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm opacity-90">Total Acumulado</p>
              <p className="text-4xl font-bold">R$ {(totalCommission / 1000).toFixed(1)}K</p>
            </div>
          </div>
          <p className="text-sm opacity-90">Todas as comissões</p>
        </Card>
      </div>

      <Card className="p-6 rounded-3xl border-0 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Evolução de Ganhos</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={
              commissionChartData.length
                ? commissionChartData
                : [{ month: "—", ganhos: 0 }]
            }
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip
              formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR")}`}
              contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
            />
            <Line
              type="monotone"
              dataKey="ganhos"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ fill: "#10b981", r: 6 }}
              activeDot={{ r: 8 }}
              animationDuration={800}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 rounded-3xl border-0 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Próximos Pagamentos</h3>
          </div>
          {upcomingPayments.length > 0 ? (
            <div className="space-y-3">
              {upcomingPayments.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-blue-100 hover:shadow-md transition-shadow"
                >
                  <div>
                    <p className="font-medium">{sale.clientName}</p>
                    <p className="text-sm text-muted-foreground">
                      Venda de {new Date(sale.date).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-green-600">
                      R$ {sale.commission.toLocaleString("pt-BR")}
                    </p>
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200 rounded-full mt-1">
                      Aprovado
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhum pagamento pendente
            </p>
          )}
        </Card>

        <Card className="p-6 rounded-3xl border-0 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Detalhamento por Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-green-50 to-green-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-green-500 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-medium">Pagas</p>
                  <p className="text-sm text-muted-foreground">{counts.paid} vendas</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-green-600">
                R$ {(sumByStatus.paid / 1000).toFixed(1)}K
              </p>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-blue-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-medium">Aprovadas</p>
                  <p className="text-sm text-muted-foreground">{counts.approved} vendas</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                R$ {(sumByStatus.approved / 1000).toFixed(1)}K
              </p>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-yellow-50 to-yellow-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-yellow-500 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-medium">Pendentes</p>
                  <p className="text-sm text-muted-foreground">{counts.pending} vendas</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-yellow-600">
                R$ {(sumByStatus.pending / 1000).toFixed(1)}K
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6 rounded-3xl border-0 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Histórico Mensal (pagas)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {commissionChartData.length === 0 ? (
            <p className="text-muted-foreground col-span-full text-center py-6">Sem dados</p>
          ) : (
            commissionChartData.slice(-3).map((month) => (
              <div
                key={month.month}
                className="p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-blue-50"
              >
                <p className="text-sm text-muted-foreground mb-1">{month.month}</p>
                <p className="text-3xl font-bold text-purple-600">
                  R$ {month.ganhos.toLocaleString("pt-BR")}
                </p>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
