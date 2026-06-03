import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Filter } from "lucide-react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { FaturaItensPagamento } from "../components/fatura-itens-pagamento";
import { apiGet, apiPost } from "../lib/api";
import { toast } from "sonner";
import { PageSkeleton } from "../components/page-skeleton";
import { formatCurrency, formatDate } from "../lib/format";
import type { Fatura, FaturaStatus } from "../types/domain";

const statusLabel: Record<FaturaStatus, string> = {
  ABERTA: "Em aberto",
  PAGA: "Paga",
  PARCIAL: "Parcial",
  VENCIDA: "Vencida",
  CANCELADA: "Cancelada",
};

const statusClass: Record<FaturaStatus, string> = {
  ABERTA: "bg-amber-50 text-amber-900 border-amber-200",
  PAGA: "bg-emerald-50 text-emerald-800 border-emerald-200",
  PARCIAL: "bg-blue-50 text-blue-800 border-blue-200",
  VENCIDA: "bg-red-50 text-red-800 border-red-200",
  CANCELADA: "bg-slate-100 text-slate-600 border-slate-200",
};

export function MasterFaturas() {
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<string>("all");
  const [baixaOpen, setBaixaOpen] = useState(false);
  const [faturaBaixa, setFaturaBaixa] = useState<Fatura | null>(null);
  const [baixaForm, setBaixaForm] = useState({
    valor: "",
    dataPagamento: new Date().toISOString().slice(0, 10),
    forma: "MANUAL",
    referenciaExterna: "",
    observacoes: "",
  });
  const [salvando, setSalvando] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [faturaDetalhe, setFaturaDetalhe] = useState<Fatura | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = filtroStatus !== "all" ? `?status=${filtroStatus}` : "";
      const r = await apiGet<{ faturas?: Fatura[] }>(`/master_faturas.php${q}`);
      setFaturas(r.faturas ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar faturas");
    } finally {
      setLoading(false);
    }
  }, [filtroStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleExpand(f: Fatura) {
    if (expandedId === f.id) {
      setExpandedId(null);
      setFaturaDetalhe(null);
      return;
    }
    setExpandedId(f.id);
    try {
      const r = await apiGet<{ fatura?: Fatura }>(`/master_faturas.php?id=${f.id}`);
      setFaturaDetalhe(r.fatura ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar itens");
    }
  }

  function abrirBaixa(f: Fatura) {
    setFaturaBaixa(f);
    setBaixaForm({
      valor: String(f.saldo > 0 ? f.saldo : f.valor),
      dataPagamento: new Date().toISOString().slice(0, 10),
      forma: "MANUAL",
      referenciaExterna: "",
      observacoes: "",
    });
    setBaixaOpen(true);
  }

  async function confirmarBaixa(e: React.FormEvent) {
    e.preventDefault();
    if (!faturaBaixa) return;
    setSalvando(true);
    try {
      await apiPost("/master_faturas.php", {
        action: "baixa",
        faturaId: faturaBaixa.id,
        valor: Number(baixaForm.valor),
        dataPagamento: baixaForm.dataPagamento,
        forma: baixaForm.forma,
        referenciaExterna: baixaForm.referenciaExterna,
        observacoes: baixaForm.observacoes,
      });
      toast.success("Pagamento validado");
      setBaixaOpen(false);
      setExpandedId(null);
      setFaturaDetalhe(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao validar pagamento");
    } finally {
      setSalvando(false);
    }
  }

  if (loading) return <PageSkeleton statCards={2} rows={5} />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Faturas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Receba por usuário (abatendo do total) ou lance um pagamento avulso.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="rounded-xl h-11 w-full sm:w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ABERTA">Em aberto</SelectItem>
              <SelectItem value="VENCIDA">Vencidas</SelectItem>
              <SelectItem value="PARCIAL">Parciais</SelectItem>
              <SelectItem value="PAGA">Pagas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        {faturas.map((f) => (
          <Card key={f.id} className="rounded-2xl p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-semibold">{f.numero}</span>
                  <Badge variant="outline" className={statusClass[f.status]}>
                    {statusLabel[f.status]}
                  </Badge>
                  <Badge variant="outline">{f.tipoPeriodo}</Badge>
                </div>
                <p className="text-sm font-medium truncate">{f.empresaNome}</p>
                <p className="text-xs text-muted-foreground mt-1">{f.descricao}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Ref. {f.referencia} · Venc. {formatDate(f.vencimento)}
                </p>
              </div>
              <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                <div className="text-right">
                  <p className="text-lg font-semibold">{formatCurrency(f.valor)}</p>
                  {f.saldo > 0 && f.status !== "PAGA" && (
                    <p className="text-xs text-muted-foreground">Saldo: {formatCurrency(f.saldo)}</p>
                  )}
                </div>
                {(f.status === "ABERTA" || f.status === "VENCIDA" || f.status === "PARCIAL") && (
                  <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl h-10"
                      onClick={() => void toggleExpand(f)}
                    >
                      {expandedId === f.id ? (
                        <>
                          <ChevronUp className="mr-2 h-4 w-4" />
                          Ocultar usuários
                        </>
                      ) : (
                        <>
                          <ChevronDown className="mr-2 h-4 w-4" />
                          Receber por usuário
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-xl h-10 text-muted-foreground"
                      onClick={() => abrirBaixa(f)}
                    >
                      Pagamento avulso
                    </Button>
                  </div>
                )}
              </div>
            </div>
            {expandedId === f.id && faturaDetalhe?.id === f.id && (
              <div className="mt-4 pt-4 border-t">
                <FaturaItensPagamento
                  fatura={faturaDetalhe}
                  onUpdated={async () => {
                    await load();
                    const r = await apiGet<{ fatura?: Fatura }>(`/master_faturas.php?id=${f.id}`);
                    setFaturaDetalhe(r.fatura ?? null);
                  }}
                />
              </div>
            )}
          </Card>
        ))}
        {faturas.length === 0 && (
          <Card className="rounded-2xl p-8 text-center text-muted-foreground">
            Nenhuma fatura encontrada. Gere faturas em Empresas.
          </Card>
        )}
      </div>

      <Dialog open={baixaOpen} onOpenChange={setBaixaOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>Pagamento avulso</DialogTitle>
            <DialogDescription>
              Valor livre que abate do saldo total (sem vincular a um usuário).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={confirmarBaixa} className="space-y-4">
            <div className="space-y-2">
              <Label>Valor recebido (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={baixaForm.valor}
                onChange={(ev) => setBaixaForm((b) => ({ ...b, valor: ev.target.value }))}
                className="rounded-xl h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Data do pagamento</Label>
              <Input
                type="date"
                value={baixaForm.dataPagamento}
                onChange={(ev) => setBaixaForm((b) => ({ ...b, dataPagamento: ev.target.value }))}
                className="rounded-xl h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Forma</Label>
              <Select
                value={baixaForm.forma}
                onValueChange={(v) => setBaixaForm((b) => ({ ...b, forma: v }))}
              >
                <SelectTrigger className="rounded-xl h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">Manual</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="BOLETO">Boleto</SelectItem>
                  <SelectItem value="TRANSFERENCIA">Transferência</SelectItem>
                  <SelectItem value="CARTAO">Cartão</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Referência (opcional)</Label>
              <Input
                value={baixaForm.referenciaExterna}
                onChange={(ev) => setBaixaForm((b) => ({ ...b, referenciaExterna: ev.target.value }))}
                className="rounded-xl h-11"
                placeholder="ID transação, comprovante…"
              />
            </div>
            <Button type="submit" disabled={salvando} className="w-full rounded-xl h-11">
              {salvando ? "Salvando…" : "Confirmar baixa"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
