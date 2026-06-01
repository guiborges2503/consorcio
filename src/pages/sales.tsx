import { useCallback, useEffect, useState } from "react";
import { Plus, TrendingUp, FileText, AlertTriangle, Wallet, CircleDollarSign } from "lucide-react";
import { Card } from "../components/ui/card";
import { StatCard } from "../components/stat-card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import type { Sale } from "../types/domain";
import { apiGet } from "../lib/api";
import { toast } from "sonner";
import { formatCompactCurrency, formatCurrency, formatDate } from "../lib/format";
import { FeedbackState } from "../components/feedback-state";
import { PageSkeleton } from "../components/page-skeleton";
import { Link, useNavigate } from "react-router";

const clientStatusConfig = {
  ativo: { label: "Ativo", color: "bg-slate-50 text-slate-800 border-slate-200" },
  inadimplente: { label: "Inadimplente", color: "bg-red-50 text-red-800 border-red-200" },
  quitado: { label: "Quitado", color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
};

export function Sales() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<"all" | "ativo" | "inadimplente" | "quitado">("all");
  const [sales, setSales] = useState<Sale[]>([]);
  const [summary, setSummary] = useState<{ totalEntrada: number; totalRecebido: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiGet<{
        sales?: Sale[];
        summary?: { totalEntrada?: number; totalRecebido?: number };
      }>("/sales.php");
      setSales(r.sales ?? []);
      setSummary({
        totalEntrada: r.summary?.totalEntrada ?? 0,
        totalRecebido: r.summary?.totalRecebido ?? 0,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar contratos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredSales =
    statusFilter === "all" ? sales : sales.filter((s) => s.clientStatus === statusFilter);

  const totalValue = sales.reduce((sum, s) => sum + s.cardValue, 0);
  const totalEntrada =
    summary?.totalEntrada ?? sales.reduce((sum, s) => sum + (s.downPayment ?? 0), 0);
  const totalRecebido =
    summary?.totalRecebido ??
    sales.reduce((sum, s) => sum + (s.paidInstallments ?? 0), 0);
  const inadimplentes = sales.filter((s) => s.clientStatus === "inadimplente").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Contratos</h1>
          <p className="text-muted-foreground">Seus contratos e clientes</p>
        </div>
        <Link to="/contratos/novo">
          <Button className="h-12 rounded-xl px-6">
            <Plus className="w-5 h-5 mr-2" />
            Novo Contrato
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        <StatCard
          title="Total Contratos"
          subtitle="Soma do valor dos contratos"
          value={formatCompactCurrency(totalValue)}
          icon={TrendingUp}
          color="purple"
        />
        <StatCard
          title="Entrada à vista"
          subtitle="Pago na assinatura"
          value={formatCompactCurrency(totalEntrada)}
          icon={Wallet}
          color="blue"
        />
        <StatCard
          title="Parcelas recebidas"
          subtitle="Parcelas quitadas"
          value={formatCompactCurrency(totalRecebido)}
          icon={CircleDollarSign}
          color="green"
          valueClassName="text-emerald-700"
        />
        <StatCard
          title="Contratos"
          subtitle="Cadastrados no sistema"
          value={String(sales.length)}
          icon={FileText}
          color="blue"
        />
        <StatCard
          title="Inadimplentes"
          subtitle="Clientes em atraso"
          value={String(inadimplentes)}
          icon={AlertTriangle}
          color="orange"
          valueClassName="text-red-700"
        />
      </div>

      <Card className="rounded-2xl p-4">
        <div className="flex flex-wrap gap-2">
          {(["all", "ativo", "inadimplente", "quitado"] as const).map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              className="rounded-lg"
              onClick={() => setStatusFilter(s)}
            >
              {s === "all" ? "Todos" : clientStatusConfig[s].label}
            </Button>
          ))}
        </div>
      </Card>

      {loading && <PageSkeleton statCards={0} rows={4} />}

      <div className="grid grid-cols-1 gap-4">
        {filteredSales.map((sale) => {
          const cfg = clientStatusConfig[sale.clientStatus];
          return (
            <Card key={sale.id} className="rounded-2xl p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{sale.clientName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {sale.productType} · {formatDate(sale.date)}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Valor Total</p>
                      <p className="font-semibold tabular-nums">{formatCurrency(sale.cardValue)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Entrada à vista</p>
                      <p className="font-semibold tabular-nums">{formatCurrency(sale.downPayment ?? 0)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Parcelas</p>
                      <p className="font-semibold">
                        {sale.installments ?? 80}x de{" "}
                        {formatCurrency(sale.installmentValue ?? 0)}
                      </p>
                      {(sale.paidInstallments ?? 0) > 0 && (
                        <p className="text-xs text-emerald-700 mt-1">
                          Recebido: {formatCurrency(sale.paidInstallments ?? 0)}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">CPF</p>
                      <p className="font-medium">{sale.cpf || "—"}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className={`rounded-full ${cfg.color}`}>{cfg.label}</Badge>
                  <Link to={`/parcelas?sale_id=${sale.id}`}>
                    <Button size="sm" variant="outline" className="rounded-lg">
                      Ver Parcelas
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {!loading && filteredSales.length === 0 && (
        <FeedbackState
          type="empty"
          title="Nenhum contrato encontrado"
          description="Cadastre seu primeiro contrato."
          actionLabel="Novo Contrato"
          onAction={() => navigate("/contratos/novo")}
        />
      )}
    </div>
  );
}
