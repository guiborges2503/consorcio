import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { CalendarCheck, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import type { Parcela } from "../types/domain";
import { apiGet, apiPost } from "../lib/api";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "../lib/format";
import { FeedbackState } from "../components/feedback-state";
import { PageSkeleton } from "../components/page-skeleton";
import { Link, useNavigate } from "react-router";

const statusConfig = {
  pendente: { label: "Pendente", color: "bg-amber-50 text-amber-900 border-amber-200", icon: Clock },
  paga: { label: "Paga", color: "bg-emerald-50 text-emerald-900 border-emerald-200", icon: CheckCircle },
  atrasada: { label: "Atrasada", color: "bg-red-50 text-red-900 border-red-200", icon: AlertTriangle },
};

export function Parcelas() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const saleId = searchParams.get("sale_id");
  const [statusFilter, setStatusFilter] = useState<"all" | "pendente" | "paga" | "atrasada">("all");
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [loading, setLoading] = useState(true);
  const [contractsWithoutParcelas, setContractsWithoutParcelas] = useState(0);
  const [payingId, setPayingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const parts = [];
      if (saleId) parts.push(`sale_id=${encodeURIComponent(saleId)}`);
      if (statusFilter !== "all") parts.push(`status=${statusFilter}`);
      const q = parts.length ? `?${parts.join("&")}` : "";
      const r = await apiGet<{ parcelas?: Parcela[]; synced?: number }>(`/parcelas.php${q}`);
      setParcelas(r.parcelas ?? []);
      if ((r.synced ?? 0) > 0) {
        toast.success(`${r.synced} parcelas geradas a partir dos seus contratos`);
      }

      const salesRes = await apiGet<{ sales?: { id: string }[] }>("/sales.php");
      const sales = salesRes.sales ?? [];
      if (sales.length > 0 && (r.parcelas ?? []).length === 0 && !saleId) {
        setContractsWithoutParcelas(sales.length);
      } else {
        setContractsWithoutParcelas(0);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar parcelas");
      setParcelas([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, saleId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markPaid(id: string) {
    try {
      setPayingId(id);
      await apiPost("/parcelas.php", { id, action: "pay" });
      toast.success("Parcela baixada com sucesso");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao baixar parcela");
    } finally {
      setPayingId(null);
    }
  }

  const pendentes = parcelas.filter((p) => p.status === "pendente").length;
  const atrasadas = parcelas.filter((p) => p.status === "atrasada").length;
  const pagas = parcelas.filter((p) => p.status === "paga").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Parcelas</h1>
        <p className="text-muted-foreground">Baixe e acompanhe as parcelas dos seus contratos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl p-5">
          <p className="text-sm text-muted-foreground">Pendentes</p>
          <p className="text-2xl font-bold">{pendentes}</p>
        </Card>
        <Card className="rounded-2xl p-5 border-red-200/60">
          <p className="text-sm text-muted-foreground">Atrasadas</p>
          <p className="text-2xl font-bold text-red-700">{atrasadas}</p>
        </Card>
        <Card className="rounded-2xl p-5 border-emerald-200/60">
          <p className="text-sm text-muted-foreground">Pagas</p>
          <p className="text-2xl font-bold text-emerald-700">{pagas}</p>
        </Card>
      </div>

      <Card className="rounded-2xl p-4">
        <div className="flex flex-wrap gap-2">
          {(["all", "pendente", "atrasada", "paga"] as const).map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              className="rounded-lg"
              onClick={() => setStatusFilter(s)}
            >
              {s === "all" ? "Todas" : statusConfig[s].label}
            </Button>
          ))}
        </div>
      </Card>

      {loading && <PageSkeleton statCards={0} rows={6} />}

      {!loading && parcelas.length === 0 && (
        <FeedbackState
          type="empty"
          title="Nenhuma parcela encontrada"
          description={
            contractsWithoutParcelas > 0
              ? `Você tem ${contractsWithoutParcelas} contrato(s), mas sem parcelas no banco. Cadastre um novo contrato ou verifique a tabela consorcio_parcelas no MySQL.`
              : "Cadastre um contrato em Novo Contrato para gerar as parcelas automaticamente."
          }
          actionLabel={contractsWithoutParcelas > 0 ? "Ver contratos" : "Novo contrato"}
          onAction={() => navigate(contractsWithoutParcelas > 0 ? "/contratos" : "/contratos/novo")}
        />
      )}

      <div className="space-y-3">
        {parcelas.map((p) => {
          const cfg = statusConfig[p.status];
          const Icon = cfg.icon;
          return (
            <Card key={p.id} className="rounded-2xl p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                    <CalendarCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold">{p.clientName}</p>
                    <p className="text-sm text-muted-foreground">
                      Parcela {p.numero} · Venc. {formatDate(p.dueDate)}
                    </p>
                    <p className="text-lg font-semibold tabular-nums mt-1">{formatCurrency(p.amount)}</p>
                    {p.paidAt && (
                      <p className="text-xs text-emerald-700 mt-1">Paga em {formatDate(p.paidAt)}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={`rounded-full ${cfg.color}`}>
                    <Icon className="w-3 h-3 mr-1" />
                    {cfg.label}
                  </Badge>
                  {(p.status === "pendente" || p.status === "atrasada") && (
                    <Button
                      size="sm"
                      className="rounded-lg"
                      disabled={payingId === p.id}
                      onClick={() => void markPaid(p.id)}
                    >
                      {payingId === p.id ? "Baixando..." : "Baixar Parcela"}
                    </Button>
                  )}
                  <Link to="/contratos">
                    <Button size="sm" variant="outline" className="rounded-lg">
                      Ver contrato
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
