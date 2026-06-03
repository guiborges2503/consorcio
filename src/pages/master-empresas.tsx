import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { Plus, Building2, Users, ChevronRight } from "lucide-react";
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
import { Checkbox } from "../components/ui/checkbox";
import { apiGet, apiPost } from "../lib/api";
import { toast } from "sonner";
import { PageSkeleton } from "../components/page-skeleton";
import { formatCurrency } from "../lib/format";
import type { Empresa, FormaCobranca, Plano } from "../types/domain";

const emptyCreate = {
  nome: "",
  slug: "",
  documento: "",
  email: "",
  telefone: "",
  formaCobranca: "MENSAL" as FormaCobranca,
  planoCodigo: "basico",
  diaVencimento: "10",
  adminLogin: "",
  adminNome: "",
  adminEmail: "",
  adminSenha: "",
  adminCobrarFatura: false,
};

const statusClass: Record<string, string> = {
  ATIVA: "bg-emerald-50 text-emerald-800 border-emerald-200",
  INATIVA: "bg-slate-100 text-slate-600 border-slate-200",
  SUSPENSA: "bg-amber-50 text-amber-900 border-amber-200",
};

export function MasterEmpresas() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [precos, setPrecos] = useState({ mensalUsuario: 34.9, anualUsuario: 359.88, anualMesUsuario: 29.99 });
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyCreate);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiGet<{ empresas?: Empresa[]; precos?: typeof precos; planos?: Plano[] }>(
        "/master_empresas.php"
      );
      setEmpresas(r.empresas ?? []);
      if (r.precos) setPrecos(r.precos);
      if (r.planos) setPlanos(r.planos);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar empresas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPost("/master_empresas.php", {
        nome: form.nome.trim(),
        slug: form.slug.trim(),
        documento: form.documento.trim(),
        email: form.email.trim(),
        telefone: form.telefone.trim(),
        formaCobranca: form.formaCobranca,
        planoCodigo: form.planoCodigo,
        diaVencimento: Number(form.diaVencimento),
        admin: {
          login: form.adminLogin.trim(),
          nome: form.adminNome.trim(),
          email: form.adminEmail.trim(),
          senha: form.adminSenha,
        },
        adminCobrarFatura: form.adminCobrarFatura,
      });
      toast.success("Empresa criada");
      setCreateOpen(false);
      setForm(emptyCreate);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageSkeleton statCards={2} rows={4} />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Empresas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Plano vigente: {formatCurrency(precos.mensalUsuario)}/usuário (mensal) ·{" "}
            {formatCurrency(precos.anualUsuario)}/usuário (anual).{" "}
            <Link to="/master/planos" className="underline font-medium">
              Configurar planos
            </Link>
          </p>
        </div>
        <Button className="rounded-xl shrink-0" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova empresa
        </Button>
      </div>

      <div className="grid gap-4">
        {empresas.map((e) => (
          <Link key={e.id} to={`/master/empresas/${e.id}`} className="block group">
            <Card className="rounded-2xl p-4 sm:p-5 cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <h2 className="font-semibold truncate group-hover:underline">{e.nome}</h2>
                    <Badge variant="outline" className={statusClass[e.status] ?? ""}>
                      {e.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{e.email || e.slug}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {e.qtdUsuarios} usuário(s)
                    </span>
                    <span>Plano: {e.planoNome ?? e.planoCodigo}</span>
                    <span>Cobrança: {e.formaCobranca === "ANUAL" ? "Anual" : "Mensal"}</span>
                    <span>Estimativa: {formatCurrency(e.valorEstimadoFatura)}</span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Card>
          </Link>
        ))}
        {empresas.length === 0 && (
          <Card className="rounded-2xl p-8 text-center text-muted-foreground">
            Nenhuma empresa cadastrada.
          </Card>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg rounded-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova empresa</DialogTitle>
            <DialogDescription>
              Cria a empresa e o administrador responsável (1 admin por empresa).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da empresa *</Label>
              <Input
                value={form.nome}
                onChange={(ev) => setForm((f) => ({ ...f, nome: ev.target.value }))}
                className="rounded-xl h-11"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Plano</Label>
                <Select
                  value={form.planoCodigo}
                  onValueChange={(v) => setForm((f) => ({ ...f, planoCodigo: v }))}
                >
                  <SelectTrigger className="rounded-xl h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {planos.map((p) => (
                      <SelectItem key={p.codigo} value={p.codigo}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Forma de cobrança</Label>
                <Select
                  value={form.formaCobranca}
                  onValueChange={(v) => setForm((f) => ({ ...f, formaCobranca: v as FormaCobranca }))}
                >
                  <SelectTrigger className="rounded-xl h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MENSAL">
                      Mensal — {formatCurrency(precos.mensalUsuario)}/usuário
                    </SelectItem>
                    <SelectItem value="ANUAL">
                      Anual — {formatCurrency(precos.anualUsuario)}/usuário
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>E-mail empresa</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(ev) => setForm((f) => ({ ...f, email: ev.target.value }))}
                  className="rounded-xl h-11"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={form.telefone}
                  onChange={(ev) => setForm((f) => ({ ...f, telefone: ev.target.value }))}
                  className="rounded-xl h-11"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>CNPJ/CPF</Label>
              <Input
                value={form.documento}
                onChange={(ev) => setForm((f) => ({ ...f, documento: ev.target.value }))}
                className="rounded-xl h-11"
              />
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-1">Administrador da empresa</p>
              <p className="text-xs text-muted-foreground mb-3">
                Opcional aqui — você pode cadastrar depois na página da empresa.
              </p>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Login</Label>
                  <Input
                    value={form.adminLogin}
                    onChange={(ev) => setForm((f) => ({ ...f, adminLogin: ev.target.value }))}
                    className="rounded-xl h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={form.adminNome}
                    onChange={(ev) => setForm((f) => ({ ...f, adminNome: ev.target.value }))}
                    className="rounded-xl h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={form.adminEmail}
                    onChange={(ev) => setForm((f) => ({ ...f, adminEmail: ev.target.value }))}
                    className="rounded-xl h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Senha inicial</Label>
                  <Input
                    type="password"
                    value={form.adminSenha}
                    onChange={(ev) => setForm((f) => ({ ...f, adminSenha: ev.target.value }))}
                    className="rounded-xl h-11"
                    minLength={6}
                  />
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-border/80 p-3">
                  <Checkbox
                    id="create-admin-cobrar"
                    checked={form.adminCobrarFatura}
                    onCheckedChange={(v) =>
                      setForm((f) => ({ ...f, adminCobrarFatura: v === true }))
                    }
                  />
                  <div className="space-y-1">
                    <Label htmlFor="create-admin-cobrar" className="cursor-pointer font-medium">
                      Incluir admin na cobrança
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Desmarcado = não entra na fatura.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Button type="submit" disabled={saving} className="w-full rounded-xl h-11">
              {saving ? "Criando…" : "Criar empresa"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
