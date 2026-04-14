import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, Wallet, Calendar } from "lucide-react";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import type { Sale } from "../types/domain";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { apiGet } from "../lib/api";
import { FeedbackState } from "../components/feedback-state";
import { formatCompactCurrency, formatCurrency, formatDate } from "../lib/format";
import { PageSkeleton } from "../components/page-skeleton";

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
    return (
      <FeedbackState
        type="error"
        title="Não foi possível carregar as comissões"
        description={error}
      />
    );
  }
  if (!data) {
    return <PageSkeleton statCards={3} rows={4} />;
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

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="rounded-2xl border border-emerald-100/90 bg-emerald-50/30 p-8 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200/80 bg-white text-emerald-800">
              <Wallet className="h-7 w-7" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total recebido</p>
              <p className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">
                {formatCompactCurrency(paidCommission)}
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Comissões já pagas</p>
        </Card>

        <Card className="rounded-2xl border border-border/80 bg-card p-8 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
              <DollarSign className="h-7 w-7" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">A receber</p>
              <p className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">
                {formatCompactCurrency(pendingCommission)}
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Aguardando pagamento</p>
        </Card>

        <Card className="rounded-2xl border border-border/80 bg-card p-8 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-slate-800">
              <TrendingUp className="h-7 w-7" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total acumulado</p>
              <p className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">
                {formatCompactCurrency(totalCommission)}
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Todas as comissões</p>
        </Card>
      </div>

      <Card className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">Evolução de ganhos</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={
              commissionChartData.length
                ? commissionChartData
                : [{ month: "—", ganhos: 0 }]
            }
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="month" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid rgba(15,23,42,0.08)",
                boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
              }}
            />
            <Line
              type="monotone"
              dataKey="ganhos"
              stroke="#64748b"
              strokeWidth={2}
              dot={{ fill: "#64748b", r: 4 }}
              activeDot={{ r: 6 }}
              animationDuration={800}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-slate-500" />
            <h3 className="text-lg font-semibold">Próximos pagamentos</h3>
          </div>
          {upcomingPayments.length > 0 ? (
            <div className="space-y-3">
              {upcomingPayments.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div>
                    <p className="font-medium">{sale.clientName}</p>
                    <p className="text-sm text-muted-foreground">
                      Venda de {formatDate(sale.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-semibold tabular-nums text-emerald-800/90">
                      {formatCurrency(sale.commission)}
                    </p>
                    <Badge
                      variant="secondary"
                      className="mt-1 rounded-full border border-slate-200 bg-slate-50 font-normal text-slate-800"
                    >
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

        <Card className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">Detalhamento por status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-emerald-100/90 bg-emerald-50/40 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-200 bg-white text-emerald-800">
                  <Wallet className="h-6 w-6" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="font-medium">Pagas</p>
                  <p className="text-sm text-muted-foreground">{counts.paid} vendas</p>
                </div>
              </div>
              <p className="text-2xl font-semibold tabular-nums text-foreground">
                {formatCompactCurrency(sumByStatus.paid)}
              </p>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border/80 bg-muted/30 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700">
                  <Calendar className="h-6 w-6" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="font-medium">Aprovadas</p>
                  <p className="text-sm text-muted-foreground">{counts.approved} vendas</p>
                </div>
              </div>
              <p className="text-2xl font-semibold tabular-nums text-foreground">
                {formatCompactCurrency(sumByStatus.approved)}
              </p>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50/50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-200 bg-white text-amber-900">
                  <DollarSign className="h-6 w-6" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="font-medium">Pendentes</p>
                  <p className="text-sm text-muted-foreground">{counts.pending} vendas</p>
                </div>
              </div>
              <p className="text-2xl font-semibold tabular-nums text-foreground">
                {formatCompactCurrency(sumByStatus.pending)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">Histórico mensal (pagas)</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {commissionChartData.length === 0 ? (
            <p className="col-span-full py-6 text-center text-muted-foreground">Sem dados</p>
          ) : (
            commissionChartData.slice(-3).map((month) => (
              <div key={month.month} className="rounded-2xl border border-border/80 bg-muted/20 p-6">
                <p className="mb-1 text-sm text-muted-foreground">{month.month}</p>
                <p className="text-3xl font-semibold tabular-nums text-foreground">
                  {formatCurrency(month.ganhos)}
                </p>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
