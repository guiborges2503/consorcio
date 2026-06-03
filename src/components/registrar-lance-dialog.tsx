import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import type { Sale } from "../types/domain";
import { apiPatch } from "../lib/api";
import { toast } from "sonner";

type RegistrarLanceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale | null;
  onSuccess?: () => void | Promise<void>;
};

export function RegistrarLanceDialog({
  open,
  onOpenChange,
  sale,
  onSuccess,
}: RegistrarLanceDialogProps) {
  const [lanceData, setLanceData] = useState("");
  const [salvando, setSalvando] = useState(false);

  function handleOpenChange(next: boolean) {
    if (next && sale) {
      setLanceData("");
    }
    onOpenChange(next);
  }

  async function confirmarLance(e: React.FormEvent) {
    e.preventDefault();
    if (!sale) return;
    if (!lanceData) {
      toast.error("Informe a data da assembleia em que o lance foi ofertado");
      return;
    }
    setSalvando(true);
    try {
      await apiPatch("/sales.php", {
        id: Number(sale.id),
        lanceOfertado: true,
        dataAssembleia: lanceData,
        diaAssembleia: sale.diaAssembleia ?? undefined,
      });
      toast.success("Lance registrado");
      onOpenChange(false);
      await onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar lance");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Registrar lance</DialogTitle>
          <DialogDescription>
            {sale
              ? `Contrato de ${sale.clientName}. Informe a assembleia em que o lance foi ofertado.`
              : "Informe a data da assembleia."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void confirmarLance(e)} className="space-y-4">
          {sale?.diaAssembleia && (
            <p className="rounded-xl border border-border/80 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              Assembleia fixa do grupo: dia <strong>{sale.diaAssembleia}</strong> de cada mês.
            </p>
          )}
          <div>
            <Label htmlFor="lance-data">Data da assembleia (lance) *</Label>
            <Input
              id="lance-data"
              type="date"
              value={lanceData}
              onChange={(e) => setLanceData(e.target.value)}
              className="mt-1 rounded-xl"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="rounded-xl" disabled={salvando}>
              {salvando ? "Salvando…" : "Confirmar lance"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
