import { useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Progress } from "./ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Input } from "./ui/input";
import { apiPost } from "../lib/api";
import { formatCurrency } from "../lib/format";
import { toast } from "sonner";
import type { Fatura, FaturaItem } from "../types/domain";

type Props = {
  fatura: Fatura;
  onUpdated: () => void;
  compact?: boolean;
};

export function FaturaItensPagamento({ fatura, onUpdated, compact }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [item, setItem] = useState<FaturaItem | null>(null);
  const [forma, setForma] = useState("PIX");
  const [salvando, setSalvando] = useState(false);

  const itens = fatura.itens ?? [];
  const pct = fatura.valor > 0 ? Math.min(100, (fatura.valorPago / fatura.valor) * 100) : 0;

  function abrirBaixa(i: FaturaItem) {
    setItem(i);
    setForma("PIX");
    setDialogOpen(true);
  }

  async function confirmar() {
    if (!item) return;
    setSalvando(true);
    try {
      await apiPost("/master_faturas.php", {
        action: "baixa_item",
        itemId: item.id,
        forma,
        dataPagamento: new Date().toISOString().slice(0, 10),
      });
      toast.success(`Pagamento de ${item.usuarioNome} registrado`);
      setDialogOpen(false);
      onUpdated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao registrar");
    } finally {
      setSalvando(false);
    }
  }

  if (itens.length === 0) {
    return null;
  }

  return (
    <>
      <Card className={`rounded-2xl border-border/80 ${compact ? "p-4" : "p-5"} space-y-4`}>
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-semibold text-sm">{fatura.numero}</span>
            <Badge variant="outline">{fatura.status}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Pago {formatCurrency(fatura.valorPago)} de {formatCurrency(fatura.valor)} · Saldo{" "}
            <strong>{formatCurrency(fatura.saldo)}</strong>
          </p>
          <Progress value={pct} className="mt-3 h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {fatura.itensPagos ?? 0} de {fatura.itensTotal ?? itens.length} usuário(s) quitado(s)
          </p>
        </div>

        <div className="space-y-2">
          {itens.map((i) => (
            <div
              key={i.id}
              className="flex flex-col gap-2 rounded-xl border border-border/80 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-2 min-w-0">
                {i.status === "PAGA" ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
                )}
                <div className="min-w-0">
                  <p className="font-medium truncate">{i.usuarioNome}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(i.valor)}</p>
                </div>
              </div>
              {i.status === "PAGA" ? (
                <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 shrink-0 w-fit">
                  Pago
                </Badge>
              ) : (
                <Button
                  size="sm"
                  className="rounded-xl h-10 w-full sm:w-auto shrink-0"
                  onClick={() => abrirBaixa(i)}
                >
                  Registrar {formatCurrency(i.saldo)}
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Receber por usuário</DialogTitle>
            <DialogDescription>
              {item?.usuarioNome} — {item ? formatCurrency(item.saldo) : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Forma de pagamento</Label>
              <Select value={forma} onValueChange={setForma}>
                <SelectTrigger className="rounded-xl h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="BOLETO">Boleto</SelectItem>
                  <SelectItem value="TRANSFERENCIA">Transferência</SelectItem>
                  <SelectItem value="CARTAO">Cartão</SelectItem>
                  <SelectItem value="MANUAL">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input type="hidden" value={item?.id ?? ""} readOnly aria-hidden />
            <Button className="w-full rounded-xl h-11" disabled={salvando} onClick={() => void confirmar()}>
              {salvando ? "Salvando…" : "Confirmar e abater da fatura"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
