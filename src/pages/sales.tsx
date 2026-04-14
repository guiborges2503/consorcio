import { useCallback, useEffect, useState } from "react";
import { Plus, DollarSign, TrendingUp, CheckCircle, Clock } from "lucide-react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import type { Sale } from "../types/domain";
import { NewSaleDialog } from "../components/new-sale-dialog";
import { apiGet, apiPost } from "../lib/api";
import { toast } from "sonner";

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
      color: "bg-yellow-100 text-yellow-700 border-yellow-200",
      icon: Clock,
    },
    approved: {
      label: "Aprovada",
      color: "bg-blue-100 text-blue-700 border-blue-200",
      icon: CheckCircle,
    },
    paid: {
      label: "Paga",
      color: "bg-green-100 text-green-700 border-green-200",
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
        <Button
          className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 shadow-lg shadow-green-500/30 rounded-2xl h-12 px-6"
          onClick={() => setNewSaleOpen(true)}
        >
          <Plus className="w-5 h-5 mr-2" />
          Nova Venda
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 rounded-3xl border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Vendido</p>
              <p className="text-2xl font-bold">R$ {(totalSales / 1000).toFixed(0)}K</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 rounded-3xl border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Comissão Total</p>
              <p className="text-2xl font-bold">R$ {(totalCommission / 1000).toFixed(1)}K</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 rounded-3xl border-0 shadow-sm bg-gradient-to-br from-yellow-50 to-yellow-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pendentes</p>
              <p className="text-2xl font-bold">{pendingSales}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 rounded-3xl border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pagas</p>
              <p className="text-2xl font-bold">{paidSales}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6 rounded-3xl border-0 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            onClick={() => setStatusFilter("all")}
            className="rounded-2xl"
          >
            Todas
          </Button>
          <Button
            variant={statusFilter === "pending" ? "default" : "outline"}
            onClick={() => setStatusFilter("pending")}
            className="rounded-2xl"
          >
            <Clock className="w-4 h-4 mr-2" />
            Pendentes
          </Button>
          <Button
            variant={statusFilter === "approved" ? "default" : "outline"}
            onClick={() => setStatusFilter("approved")}
            className="rounded-2xl"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Aprovadas
          </Button>
          <Button
            variant={statusFilter === "paid" ? "default" : "outline"}
            onClick={() => setStatusFilter("paid")}
            className="rounded-2xl"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Pagas
          </Button>
        </div>
      </Card>

      {loading && <p className="text-muted-foreground">Carregando…</p>}

      <div className="grid grid-cols-1 gap-4">
        {filteredSales.map((sale) => {
          const config = statusConfig[sale.status];
          const Icon = config.icon;
          return (
            <Card
              key={sale.id}
              className="p-6 rounded-3xl border-0 shadow-sm hover:shadow-lg transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white">
                      <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{sale.clientName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(sale.date).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Valor da Carta</p>
                      <p className="text-xl font-bold text-purple-600">
                        R$ {sale.cardValue.toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Comissão</p>
                      <p className="text-xl font-bold text-green-600">
                        R$ {sale.commission.toLocaleString("pt-BR")}
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
                    className={`rounded-full px-4 py-2 border flex items-center gap-2 ${config.color}`}
                  >
                    <Icon className="w-4 h-4" />
                    {config.label}
                  </Badge>
                  {sale.status === "pending" && (
                    <Button
                      type="button"
                      size="sm"
                      className="rounded-xl bg-blue-600 hover:bg-blue-700"
                      onClick={() => void updateStatus(sale.id, "approve")}
                    >
                      Acompanhar
                    </Button>
                  )}
                  {sale.status === "approved" && (
                    <Button
                      type="button"
                      size="sm"
                      className="rounded-xl bg-green-600 hover:bg-green-700"
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
        <Card className="p-12 rounded-3xl border-0 shadow-sm text-center">
          <p className="text-muted-foreground">Nenhuma venda encontrada</p>
        </Card>
      )}

      <NewSaleDialog open={newSaleOpen} onOpenChange={setNewSaleOpen} onSaved={load} />
    </div>
  );
}
