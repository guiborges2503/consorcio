import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Tags, Info } from "lucide-react";
import { Link } from "react-router";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { apiGet, apiPatch, apiPost } from "../lib/api";
import { toast } from "sonner";
import { PageSkeleton } from "../components/page-skeleton";
import { formatCurrency } from "../lib/format";
import type { Plano } from "../types/domain";

type PlanoForm = {
  codigo: string;
  nome: string;
  descricao: string;
  valorMensal: string;
  valorAnual: string;
  maxUsuarios: string;
  ativo: boolean;
};

const emptyForm: PlanoForm = {
  codigo: "",
  nome: "",
  descricao: "",
  valorMensal: "34.90",
  valorAnual: "359.88",
  maxUsuarios: "",
  ativo: true,
};

function toForm(plano: Plano): PlanoForm {
  return {
    codigo: plano.codigo,
    nome: plano.nome,
    descricao: plano.descricao,
    valorMensal: String(plano.valorMensal),
    valorAnual: String(plano.valorAnual),
    maxUsuarios: plano.maxUsuarios != null ? String(plano.maxUsuarios) : "",
    ativo: plano.ativo,
  };
}

export function MasterPlanos() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<PlanoForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiGet<{ planos?: Plano[] }>("/master_planos.php");
      setPlanos(r.planos ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar planos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function abrirEditar(plano: Plano) {
    setCreating(false);
    setForm(toForm(plano));
    setDialogOpen(true);
  }

  function abrirCriar() {
    setCreating(true);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        codigo: form.codigo.trim(),
        nome: form.nome.trim(),
        descricao: form.descricao.trim(),
        valorMensal: Number(form.valorMensal.replace(",", ".")),
        valorAnual: Number(form.valorAnual.replace(",", ".")),
        maxUsuarios: form.maxUsuarios.trim() === "" ? null : Number(form.maxUsuarios),
        ativo: form.ativo,
      };

      if (creating) {
        await apiPost("/master_planos.php", body);
        toast.success("Plano criado");
      } else {
        await apiPatch("/master_planos.php", body);
        toast.success("Plano atualizado");
      }
      setDialogOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageSkeleton statCards={1} rows={3} />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Planos e valores</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            Alterações valem para novas estimativas e faturas. Faturas já geradas mantêm o valor
            registrado na criação.
          </p>
        </div>
        <Button className="rounded-xl shrink-0" onClick={abrirCriar}>
          <Plus className="mr-2 h-4 w-4" />
          Novo plano
        </Button>
      </div>

      <Card className="rounded-2xl border-blue-100 bg-blue-50/60 p-4 sm:p-5">
        <div className="flex gap-3">
          <Info className="h-5 w-5 shrink-0 text-blue-700 mt-0.5" />
          <div className="text-sm text-blue-950/80 space-y-1">
            <p>
              Empresas seguem o plano vinculado. Ao mudar o preço aqui, a estimativa na tela de{" "}
              <Link to="/master/empresas" className="underline font-medium">
                Empresas
              </Link>{" "}
              atualiza na hora.
            </p>
            <p>O valor só fica fixo quando você clica em &quot;Gerar fatura do período&quot;.</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4">
        {planos.map((plano) => {
          const anualMes = plano.valorAnual > 0 ? plano.valorAnual / 12 : 0;
          return (
            <Card key={plano.codigo} className="rounded-2xl p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Tags className="h-4 w-4 text-muted-foreground shrink-0" />
                    <h2 className="font-semibold">{plano.nome}</h2>
                    <Badge variant="outline">{plano.codigo}</Badge>
                    {!plano.ativo && (
                      <Badge variant="outline" className="bg-slate-100 text-slate-600">
                        Inativo
                      </Badge>
                    )}
                  </div>
                  {plano.descricao && (
                    <p className="text-sm text-muted-foreground">{plano.descricao}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <span>
                      Mensal: <strong>{formatCurrency(plano.valorMensal)}</strong>/usuário
                    </span>
                    <span>
                      Anual: <strong>{formatCurrency(plano.valorAnual)}</strong>/usuário
                      {anualMes > 0 && (
                        <span className="text-muted-foreground">
                          {" "}
                          (12× {formatCurrency(anualMes)})
                        </span>
                      )}
                    </span>
                    {plano.maxUsuarios != null && (
                      <span className="text-muted-foreground">
                        Até {plano.maxUsuarios} usuários
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="rounded-xl h-10 w-full sm:w-auto shrink-0"
                  onClick={() => abrirEditar(plano)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{creating ? "Novo plano" : "Editar plano"}</DialogTitle>
            <DialogDescription>
              Valores por usuário. Empresas sem preço personalizado usam estes valores.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void salvar(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="plano-codigo">Código</Label>
              <Input
                id="plano-codigo"
                className="rounded-xl h-11"
                value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                disabled={!creating}
                placeholder="basico"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plano-nome">Nome</Label>
              <Input
                id="plano-nome"
                className="rounded-xl h-11"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plano-desc">Descrição</Label>
              <Input
                id="plano-desc"
                className="rounded-xl h-11"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="plano-mensal">Valor mensal / usuário</Label>
                <Input
                  id="plano-mensal"
                  type="number"
                  step="0.01"
                  min="0"
                  className="rounded-xl h-11"
                  value={form.valorMensal}
                  onChange={(e) => setForm({ ...form, valorMensal: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plano-anual">Valor anual / usuário</Label>
                <Input
                  id="plano-anual"
                  type="number"
                  step="0.01"
                  min="0"
                  className="rounded-xl h-11"
                  value={form.valorAnual}
                  onChange={(e) => setForm({ ...form, valorAnual: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plano-max">Máx. usuários (vazio = ilimitado)</Label>
              <Input
                id="plano-max"
                type="number"
                min="1"
                className="rounded-xl h-11"
                value={form.maxUsuarios}
                onChange={(e) => setForm({ ...form, maxUsuarios: e.target.value })}
              />
            </div>
            {!creating && (
              <div className="flex items-center justify-between rounded-xl border p-3">
                <Label htmlFor="plano-ativo" className="cursor-pointer">
                  Plano ativo
                </Label>
                <Switch
                  id="plano-ativo"
                  checked={form.ativo}
                  onCheckedChange={(ativo) => setForm({ ...form, ativo })}
                />
              </div>
            )}
            <Button type="submit" className="w-full rounded-xl h-11" disabled={saving}>
              {saving ? "Salvando…" : "Salvar plano"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
