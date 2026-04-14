import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { apiPost } from "../lib/api";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
};

export function NewLeadDialog({ open, onOpenChange, onCreated }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"cold" | "warm" | "hot">("warm");
  const [notes, setNotes] = useState("");
  const [nextAction, setNextAction] = useState("Definir próxima ação");
  const [interest, setInterest] = useState("50");
  const [saving, setSaving] = useState(false);
  const parsedInterest = Math.min(100, Math.max(0, parseInt(interest, 10) || 0));
  const emailValid = !email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit = !!name.trim() && emailValid && !saving;

  function reset() {
    setName("");
    setPhone("");
    setEmail("");
    setStatus("warm");
    setNotes("");
    setNextAction("Definir próxima ação");
    setInterest("50");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (!emailValid) {
      toast.error("Informe um e-mail válido");
      return;
    }
    setSaving(true);
    try {
      await apiPost("/leads.php", {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        status,
        notes: notes.trim(),
        nextAction: nextAction.trim(),
        interest: parsedInterest,
      });
      toast.success("Lead criado com sucesso");
      reset();
      onOpenChange(false);
      onCreated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-lg rounded-3xl">
        <DialogHeader>
          <DialogTitle>Novo lead</DialogTitle>
          <DialogDescription>Cadastre um novo cliente potencial.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label htmlFor="nl-name">Nome *</Label>
            <Input
              id="nl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl mt-1"
              autoFocus
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="nl-phone">Telefone</Label>
              <Input
                id="nl-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="rounded-xl mt-1"
                inputMode="tel"
                placeholder="(11) 99999-9999"
              />
            </div>
            <div>
              <Label htmlFor="nl-email">E-mail</Label>
              <Input
                id="nl-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl mt-1"
                placeholder="cliente@exemplo.com"
                aria-invalid={!emailValid}
                aria-describedby={!emailValid ? "nl-email-error" : undefined}
              />
              {!emailValid && (
                <p id="nl-email-error" className="mt-1 text-xs text-red-600">
                  Digite um e-mail válido.
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger className="rounded-xl mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cold">Frio</SelectItem>
                  <SelectItem value="warm">Morno</SelectItem>
                  <SelectItem value="hot">Quente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="nl-interest">Interesse (0–100)</Label>
              <Input
                id="nl-interest"
                type="number"
                min={0}
                max={100}
                value={interest}
                onChange={(e) => setInterest(e.target.value)}
                className="rounded-xl mt-1"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Valor atual: {parsedInterest}%.
              </p>
            </div>
          </div>
          <div>
            <Label htmlFor="nl-next">Próxima ação</Label>
            <Input
              id="nl-next"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              className="rounded-xl mt-1"
            />
          </div>
          <div>
            <Label htmlFor="nl-notes">Observações</Label>
            <Textarea
              id="nl-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-xl mt-1 min-h-[80px]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSubmit} className="rounded-xl">
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
