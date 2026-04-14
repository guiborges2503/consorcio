import { useCallback, useEffect, useState } from "react";
import { Plus, DollarSign, TrendingUp, CheckCircle, Clock } from "lucide-react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import type { Sale } from "../types/domain";
import { NewSaleDialog } from "../components/new-sale-dialog";
import { apiGet, apiPost } from "../lib/api";
import { toast } from "sonner";
import { formatCompactCurrency, formatCurrency, formatDate } from "../lib/format";
import { FeedbackState } from "../components/feedback-state";
import { PageSkeleton } from "../components/page-skeleton";

export function Sales() {
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "paid">("all");
  const [newSaleOpen, setNewSaleOpen] = useState(false);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = statusFilter === "all" ? "" : `?status=${statusFilter}`;
      const r = await apiGet<{ sales?: Sale[] }>(`/sales.php${q}`);
      setSales(r.sales ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar vendas");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredSales = sales;

  const totalSales = sales.reduce((sum, sale) => sum + sale.cardValue, 0);
  const totalCommission = sales.reduce((sum, sale) => sum + sale.commission, 0);
  const pendingSales = sales.filter((s) => s.status === "pending").length;
  const paidSales = sales.filter((s) => s.status === "paid").length;

  async function updateStatus(id: string, action: string) {
    try {
      await apiPost("/sale_status.php", { id, action });
      toast.success("Status atualizado");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  }

  const statusConfig = {
    pending: {
      label: "Pendente",
      color: "border border-amber-200/80 bg-amber-50 text-amber-900",
      icon: Clock,
    },
    approved: {
      label: "Aprovada",
      color: "border border-slate-200 bg-slate-50 text-slate-800",
      icon: CheckCircle,
    },
    paid: {
      label: "Paga",
      color: "border border-emerald-200/80 bg-emerald-50 text-emerald-900",
      icon: CheckCircle,
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Vendas</h1>
          <p className="text-muted-foreground">Gerencie suas vendas realizadas</p>
        </div>
        <Button className="h-12 rounded-xl px-6" onClick={() => setNewSaleOpen(true)}>
          <Plus className="w-5 h-5 mr-2" />
          Nova Venda
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <Card className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-700">
              <TrendingUp className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Vendido</p>
              <p className="text-2xl font-bold">{formatCompactCurrency(totalSales)}</p>
            </div>
          </div>
        </Card>
        <Card className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-800">
              <DollarSign className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Comissão Total</p>
              <p className="text-2xl font-bold">{formatCompactCurrency(totalCommission)}</p>
            </div>
          </div>
        </Card>
        <Card className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-100 bg-amber-50 text-amber-900">
              <Clock className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pendentes</p>
              <p className="text-2xl font-bold">{pendingSales}</p>
            </div>
          </div>
        </Card>
        <Card className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
              <CheckCircle className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pagas</p>
              <p className="text-2xl font-bold">{paidSales}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            onClick={() => setStatusFilter("all")}
            className="rounded-lg"
          >
            Todas
          </Button>
          <Button
            variant={statusFilter === "pending" ? "default" : "outline"}
            onClick={() => setStatusFilter("pending")}
            className="rounded-lg"
          >
            <Clock className="w-4 h-4 mr-2" />
            Pendentes
          </Button>
          <Button
            variant={statusFilter === "approved" ? "default" : "outline"}
            onClick={() => setStatusFilter("approved")}
            className="rounded-lg"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Aprovadas
          </Button>
          <Button
            variant={statusFilter === "paid" ? "default" : "outline"}
            onClick={() => setStatusFilter("paid")}
            className="rounded-lg"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Pagas
          </Button>
        </div>
      </Card>

      {!loading && (
        <p className="text-sm text-muted-foreground">
          {filteredSales.length} venda{filteredSales.length === 1 ? "" : "s"} encontrada
          {filteredSales.length === 1 ? "" : "s"}.
        </p>
      )}

      {loading && (
        <PageSkeleton statCards={4} rows={4} />
      )}

      <div className="grid grid-cols-1 gap-4">
        {filteredSales.map((sale) => {
          const config = statusConfig[sale.status];
          const Icon = config.icon;
          return (
            <Card
              key={sale.id}
              className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted text-foreground">
                      <DollarSign className="h-6 w-6" strokeWidth={1.75} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{sale.clientName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(sale.date)}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Valor da Carta</p>
                      <p className="text-xl font-semibold tabular-nums text-foreground">
                        {formatCurrency(sale.cardValue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Comissão</p>
                      <p className="text-xl font-semibold tabular-nums text-emerald-800/90">
                        {formatCurrency(sale.commission)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Tipo</p>
                      <p className="text-lg font-medium">{sale.productType}</p>
                    </div>
                  </div>
                </div>
                <div className="flex sm:flex-col items-center sm:items-end gap-3">
                  <Badge
                    className={`flex items-center gap-2 rounded-full px-4 py-2 font-normal ${config.color}`}
                  >
                    <Icon className="w-4 h-4" />
                    {config.label}
                  </Badge>
                  {sale.status === "pending" && (
                    <Button
                      type="button"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => void updateStatus(sale.id, "approve")}
                    >
                      Aprovar Venda
                    </Button>
                  )}
                  {sale.status === "approved" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-lg"
                      onClick={() => void updateStatus(sale.id, "pay")}
                    >
                      Confirmar Recebimento
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {!loading && filteredSales.length === 0 && (
        <FeedbackState
          type="empty"
          title="Nenhuma venda encontrada"
          description="Tente alterar o filtro ou cadastre uma nova venda."
          actionLabel="Recarregar"
          onAction={() => void load()}
        />
      )}

      <NewSaleDialog open={newSaleOpen} onOpenChange={setNewSaleOpen} onSaved={load} />
    </div>
  );
}
