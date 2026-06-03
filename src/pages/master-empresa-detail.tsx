import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, Building2, Users, Receipt, Pencil, UserCog, Plus } from "lucide-react";
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
import { Checkbox } from "../components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { apiGet, apiPatch, apiPost } from "../lib/api";
import { toast } from "sonner";
import { PageSkeleton } from "../components/page-skeleton";
import { FeedbackState } from "../components/feedback-state";
import { formatCurrency } from "../lib/format";
import { roleLabel } from "../lib/auth-roles";
import type { Empresa, EmpresaStatus, FormaCobranca, Plano } from "../types/domain";
import { FaturaItensPagamento } from "../components/fatura-itens-pagamento";

const statusClass: Record<string, string> = {
  ATIVA: "bg-emerald-50 text-emerald-800 border-emerald-200",
  INATIVA: "bg-slate-100 text-slate-600 border-slate-200",
  SUSPENSA: "bg-amber-50 text-amber-900 border-amber-200",
};

const userStatusClass: Record<string, string> = {
  ATIVO: "bg-emerald-50 text-emerald-800 border-emerald-200",
  INATIVO: "bg-slate-100 text-slate-600 border-slate-200",
};

const emptyAdminForm = {
  login: "",
  nome: "",
  email: "",
  senha: "",
  cobrarFatura: false,
};

type EmpresaForm = {
  nome: string;
  documento: string;
  email: string;
  telefone: string;
  status: EmpresaStatus;
  diaVencimento: string;
};

function empresaToForm(e: Empresa): EmpresaForm {
  return {
    nome: e.nome,
    documento: e.documento ?? "",
    email: e.email ?? "",
    telefone: e.telefone ?? "",
    status: e.status,
    diaVencimento: String(e.diaVencimento ?? 10),
  };
}

export function MasterEmpresaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const empresaId = Number(id);

  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [editForma, setEditForma] = useState<FormaCobranca>("MENSAL");
  const [editPlano, setEditPlano] = useState("basico");
  const [gerandoFatura, setGerandoFatura] = useState(false);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [adminForm, setAdminForm] = useState(emptyAdminForm);
  const [salvandoAdmin, setSalvandoAdmin] = useState(false);
  const [empresaForm, setEmpresaForm] = useState<EmpresaForm>({
    nome: "",
    documento: "",
    email: "",
    telefone: "",
    status: "ATIVA",
    diaVencimento: "10",
  });
  const [salvandoEmpresa, setSalvandoEmpresa] = useState(false);
  const [alternandoUsuarioId, setAlternandoUsuarioId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(empresaId) || empresaId <= 0) {
      setMissing(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [empresaRes, planosRes] = await Promise.all([
        apiGet<{ empresa?: Empresa }>(`/master_empresas.php?id=${empresaId}`),
        apiGet<{ planos?: Plano[] }>("/master_planos.php"),
      ]);
      if (empresaRes.empresa) {
        setEmpresa(empresaRes.empresa);
        setEmpresaForm(empresaToForm(empresaRes.empresa));
        setEditForma(empresaRes.empresa.formaCobranca);
        setEditPlano(empresaRes.empresa.planoCodigo);
        setMissing(false);
      } else {
        setEmpresa(null);
        setMissing(true);
      }
      setPlanos(planosRes.planos ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar empresa");
      setEmpresa(null);
      setMissing(true);
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function salvarCobranca() {
    if (!empresa) return;
    try {
      await apiPatch("/master_empresas.php", {
        id: empresa.id,
        formaCobranca: editForma,
        planoCodigo: editPlano,
      });
      toast.success("Cobrança atualizada");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    }
  }

  async function salvarDadosEmpresa(e: React.FormEvent) {
    e.preventDefault();
    if (!empresa) return;
    setSalvandoEmpresa(true);
    try {
      await apiPatch("/master_empresas.php", {
        id: empresa.id,
        nome: empresaForm.nome.trim(),
        documento: empresaForm.documento.trim(),
        email: empresaForm.email.trim(),
        telefone: empresaForm.telefone.trim(),
        status: empresaForm.status,
        diaVencimento: Number(empresaForm.diaVencimento),
      });
      toast.success("Dados da empresa atualizados");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSalvandoEmpresa(false);
    }
  }

  async function gerarFatura() {
    if (!empresa) return;
    setGerandoFatura(true);
    try {
      await apiPost("/master_faturas.php", { action: "gerar", empresaId: empresa.id });
      toast.success("Fatura gerada");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar fatura");
    } finally {
      setGerandoFatura(false);
    }
  }

  async function cadastrarAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!empresa) return;
    setSalvandoAdmin(true);
    try {
      await apiPost("/master_empresas.php", {
        action: "criar_admin",
        empresaId: empresa.id,
        login: adminForm.login.trim(),
        nome: adminForm.nome.trim(),
        email: adminForm.email.trim(),
        senha: adminForm.senha,
        cobrarFatura: adminForm.cobrarFatura,
      });
      toast.success("Administrador cadastrado");
      setAdminDialogOpen(false);
      setAdminForm(emptyAdminForm);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao cadastrar admin");
    } finally {
      setSalvandoAdmin(false);
    }
  }

  async function alterarStatusEmpresa(novoStatus: EmpresaStatus) {
    if (!empresa) return;
    try {
      await apiPatch("/master_empresas.php", {
        id: empresa.id,
        status: novoStatus,
      });
      toast.success(novoStatus === "ATIVA" ? "Empresa ativada" : "Empresa desativada");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar status");
    }
  }

  async function alterarStatusUsuario(usuarioId: number, novoStatus: "ATIVO" | "INATIVO") {
    if (!empresa) return;
    setAlternandoUsuarioId(usuarioId);
    try {
      await apiPatch("/master_empresas.php", {
        action: "atualizar_usuario",
        empresaId: empresa.id,
        usuarioId,
        status: novoStatus,
      });
      toast.success(novoStatus === "ATIVO" ? "Usuário ativado" : "Usuário desativado");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar usuário");
    } finally {
      setAlternandoUsuarioId(null);
    }
  }

  const temAdminAtivo = empresa?.admin?.status === "ATIVO";

  if (loading) return <PageSkeleton statCards={1} rows={5} />;

  if (missing || !empresa) {
    return (
      <FeedbackState
        type="empty"
        title="Empresa não encontrada"
        description="O cadastro pode ter sido removido ou o link está incorreto."
        actionLabel="Voltar para empresas"
        onAction={() => navigate("/master/empresas")}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3 min-w-0 flex-1">
          <Button asChild variant="ghost" size="sm" className="rounded-xl -ml-2 h-9 px-2">
            <Link to="/master/empresas">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Empresas
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
              <h1 className="text-2xl font-semibold tracking-tight">{empresa.nome}</h1>
              <Badge variant="outline" className={statusClass[empresa.status] ?? ""}>
                {empresa.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {empresa.qtdUsuarios} usuário(s)
              {(empresa.qtdUsuariosCobraveis ?? empresa.qtdUsuarios) !== empresa.qtdUsuarios && (
                <span>
                  {" "}
                  · {empresa.qtdUsuariosCobraveis ?? 0} cobrável(is)
                </span>
              )}
              {" "}
              · Estimativa {formatCurrency(empresa.valorEstimadoFatura)}
            </p>
            {(empresa.email || empresa.slug) && (
              <p className="text-sm text-muted-foreground mt-1">{empresa.email || empresa.slug}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 w-full sm:w-auto shrink-0">
          {empresa.status === "ATIVA" ? (
            <Button
              variant="outline"
              className="rounded-xl h-10 border-amber-200 text-amber-900 hover:bg-amber-50"
              onClick={() => void alterarStatusEmpresa("INATIVA")}
            >
              Desativar empresa
            </Button>
          ) : (
            <Button
              className="rounded-xl h-10"
              onClick={() => void alterarStatusEmpresa("ATIVA")}
            >
              Ativar empresa
            </Button>
          )}
          <p className="text-xs text-muted-foreground text-center sm:text-right">
            Desativada = nenhum usuário loga
          </p>
        </div>
      </div>

      <Card className="rounded-2xl p-4 sm:p-6">
        <h2 className="font-medium flex items-center gap-2 mb-1">
          <Building2 className="h-4 w-4" />
          Dados da empresa
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Identificação e contato. Slug: <span className="font-mono">{empresa.slug}</span>
        </p>
        <form onSubmit={(e) => void salvarDadosEmpresa(e)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="empresa-nome">Nome *</Label>
            <Input
              id="empresa-nome"
              value={empresaForm.nome}
              onChange={(ev) => setEmpresaForm((f) => ({ ...f, nome: ev.target.value }))}
              className="rounded-xl h-11"
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="empresa-documento">CNPJ/CPF</Label>
              <Input
                id="empresa-documento"
                value={empresaForm.documento}
                onChange={(ev) => setEmpresaForm((f) => ({ ...f, documento: ev.target.value }))}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="empresa-status">Status</Label>
              <Select
                value={empresaForm.status}
                onValueChange={(v) => setEmpresaForm((f) => ({ ...f, status: v as EmpresaStatus }))}
              >
                <SelectTrigger id="empresa-status" className="rounded-xl h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ATIVA">Ativa</SelectItem>
                  <SelectItem value="INATIVA">Inativa</SelectItem>
                  <SelectItem value="SUSPENSA">Suspensa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="empresa-email">E-mail</Label>
              <Input
                id="empresa-email"
                type="email"
                value={empresaForm.email}
                onChange={(ev) => setEmpresaForm((f) => ({ ...f, email: ev.target.value }))}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="empresa-telefone">Telefone</Label>
              <Input
                id="empresa-telefone"
                value={empresaForm.telefone}
                onChange={(ev) => setEmpresaForm((f) => ({ ...f, telefone: ev.target.value }))}
                className="rounded-xl h-11"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="empresa-vencimento">Dia de vencimento das faturas (1–28)</Label>
            <Input
              id="empresa-vencimento"
              type="number"
              min={1}
              max={28}
              value={empresaForm.diaVencimento}
              onChange={(ev) => setEmpresaForm((f) => ({ ...f, diaVencimento: ev.target.value }))}
              className="rounded-xl h-11"
              required
            />
          </div>
          <Button type="submit" className="w-full rounded-xl h-11" disabled={salvandoEmpresa}>
            <Pencil className="mr-2 h-4 w-4" />
            {salvandoEmpresa ? "Salvando…" : "Salvar dados da empresa"}
          </Button>
        </form>
      </Card>

      <Card className="rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-medium flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              Administrador da empresa
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Responsável por cadastrar vendedores e gerenciar a operação da empresa.
            </p>
          </div>
          {!temAdminAtivo && (
            <Button
              className="rounded-xl h-10 shrink-0 w-full sm:w-auto"
              onClick={() => {
                setAdminForm(emptyAdminForm);
                setAdminDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Cadastrar admin
            </Button>
          )}
        </div>

        {temAdminAtivo && empresa.admin ? (
          <div className="mt-4 rounded-xl border border-border/80 p-4">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <p className="font-medium">{empresa.admin.nome}</p>
              <Badge variant="outline" className="bg-slate-50">
                {roleLabel(empresa.admin.role)}
              </Badge>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200">
                {empresa.admin.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {empresa.admin.login} · {empresa.admin.email}
            </p>
            {empresa.admin.cobrarFatura === false && (
              <Badge variant="outline" className="mt-2 bg-slate-50 text-slate-600">
                Isento de cobrança
              </Badge>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
            Nenhum administrador ativo. Cadastre um admin para a empresa poder usar o painel e
            criar vendedores.
          </p>
        )}
      </Card>

      <Card className="rounded-2xl p-4 sm:p-6 space-y-4">
        <div>
          <Label>Plano e forma de cobrança</Label>
          <div className="mt-2 space-y-2">
            <Select value={editPlano} onValueChange={setEditPlano}>
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
            <Select value={editForma} onValueChange={(v) => setEditForma(v as FormaCobranca)}>
              <SelectTrigger className="rounded-xl h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MENSAL">
                  Mensal ({formatCurrency(empresa.valorMensalUsuario)}/usuário)
                </SelectItem>
                <SelectItem value="ANUAL">
                  Anual ({formatCurrency(empresa.valorAnualUsuario)}/usuário)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            className="rounded-xl h-11 w-full mt-3"
            onClick={() => void salvarCobranca()}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Salvar cobrança
          </Button>
          {empresa.precoPersonalizado && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-3">
              Esta empresa usa preço personalizado (fora do plano padrão).
            </p>
          )}
        </div>
      </Card>

      <Card className="rounded-2xl p-4 sm:p-6 space-y-4">
        <Button
          className="w-full rounded-xl h-11"
          onClick={() => void gerarFatura()}
          disabled={
            gerandoFatura ||
            (empresa.qtdUsuariosCobraveis ?? empresa.qtdUsuarios) <= 0 ||
            !!empresa.faturaAberta
          }
        >
          <Receipt className="mr-2 h-4 w-4" />
          {gerandoFatura
            ? "Gerando…"
            : empresa.faturaAberta
              ? "Fatura do período já gerada"
              : "Gerar fatura do período"}
        </Button>

        {empresa.faturaAberta && (
          <FaturaItensPagamento fatura={empresa.faturaAberta} onUpdated={() => void load()} compact />
        )}
      </Card>

      <Card className="rounded-2xl p-4 sm:p-6">
        <h2 className="font-medium mb-1 flex items-center gap-2">
          <Users className="h-4 w-4" />
          Usuários cadastrados
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Ative ou desative individualmente. Desativado = não loga e não entra na fatura. Só usuários
          cobráveis entram na fatura.
        </p>
        <div className="space-y-2">
          {(empresa.usuarios ?? []).map((u) => (
            <div
              key={u.id}
              className="rounded-xl border border-border/80 p-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{u.nome}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {u.login} · {u.email}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0 justify-end">
                <Badge variant="outline" className={userStatusClass[u.status] ?? ""}>
                  {u.status}
                </Badge>
                <Badge variant="outline" className="h-fit">
                  {roleLabel(u.role)}
                </Badge>
                {u.cobrarFatura === false && (
                  <Badge variant="outline" className="h-fit bg-slate-50 text-slate-600">
                    Isento
                  </Badge>
                )}
                {u.status === "ATIVO" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-lg h-8 border-amber-200 text-amber-900 hover:bg-amber-50"
                    disabled={alternandoUsuarioId === u.id}
                    onClick={() => void alterarStatusUsuario(u.id, "INATIVO")}
                  >
                    {alternandoUsuarioId === u.id ? "Salvando…" : "Desativar"}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-lg h-8"
                    disabled={alternandoUsuarioId === u.id}
                    onClick={() => void alterarStatusUsuario(u.id, "ATIVO")}
                  >
                    {alternandoUsuarioId === u.id ? "Salvando…" : "Ativar"}
                  </Button>
                )}
              </div>
            </div>
          ))}
          {(empresa.usuarios ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Sem usuários.</p>
          )}
        </div>
      </Card>

      <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cadastrar administrador</DialogTitle>
            <DialogDescription>
              Este usuário acessa /admin e cadastra vendedores da empresa {empresa.nome}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void cadastrarAdmin(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-login">Login *</Label>
              <Input
                id="admin-login"
                value={adminForm.login}
                onChange={(ev) => setAdminForm((f) => ({ ...f, login: ev.target.value }))}
                className="rounded-xl h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-nome">Nome *</Label>
              <Input
                id="admin-nome"
                value={adminForm.nome}
                onChange={(ev) => setAdminForm((f) => ({ ...f, nome: ev.target.value }))}
                className="rounded-xl h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-email">E-mail *</Label>
              <Input
                id="admin-email"
                type="email"
                value={adminForm.email}
                onChange={(ev) => setAdminForm((f) => ({ ...f, email: ev.target.value }))}
                className="rounded-xl h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-senha">Senha inicial *</Label>
              <Input
                id="admin-senha"
                type="password"
                value={adminForm.senha}
                onChange={(ev) => setAdminForm((f) => ({ ...f, senha: ev.target.value }))}
                className="rounded-xl h-11"
                minLength={6}
                required
              />
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-border/80 p-3">
              <Checkbox
                id="admin-cobrar"
                checked={adminForm.cobrarFatura}
                onCheckedChange={(v) =>
                  setAdminForm((f) => ({ ...f, cobrarFatura: v === true }))
                }
              />
              <div className="space-y-1">
                <Label htmlFor="admin-cobrar" className="cursor-pointer font-medium">
                  Incluir na cobrança da fatura
                </Label>
                <p className="text-xs text-muted-foreground">
                  Desmarcado = admin isento, não entra na fatura nem no bloqueio por inadimplência
                  individual.
                </p>
              </div>
            </div>
            <Button type="submit" className="w-full rounded-xl h-11" disabled={salvandoAdmin}>
              {salvandoAdmin ? "Salvando…" : "Criar administrador"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
