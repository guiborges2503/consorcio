import { useCallback, useEffect, useState } from "react";
import { Crown, Pencil, Plus, ShieldOff, ShieldCheck } from "lucide-react";
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
import { apiGet, apiPatch, apiPost } from "../lib/api";
import { toast } from "sonner";
import { PageSkeleton } from "../components/page-skeleton";
import { useAuth } from "../contexts/auth-context";
import type { ManagedUser } from "../types/domain";

const emptyForm = {
  login: "",
  nome: "",
  email: "",
  senha: "",
};

export function MasterUsuarios() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiGet<{ users?: ManagedUser[] }>("/master_usuarios.php");
      setUsers(r.users ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar masters");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(u: ManagedUser) {
    setEditing(u);
    setForm({
      login: u.login,
      nome: u.nome,
      email: u.email,
      senha: "",
    });
    setDialogOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      if (editing) {
        const body: Record<string, unknown> = {
          id: editing.id,
          nome: form.nome,
          email: form.email,
        };
        if (form.senha) body.senha = form.senha;
        await apiPatch("/master_usuarios.php", body);
        toast.success("Master atualizado");
      } else {
        if (!form.login || !form.senha) {
          toast.error("Login e senha são obrigatórios");
          return;
        }
        await apiPost("/master_usuarios.php", {
          login: form.login,
          nome: form.nome,
          email: form.email,
          senha: form.senha,
        });
        toast.success("Master criado");
      }
      setDialogOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(u: ManagedUser) {
    const next = u.status === "ATIVO" ? "INATIVO" : "ATIVO";
    const msg =
      next === "INATIVO"
        ? `Desativar o master @${u.login}?`
        : `Reativar o master @${u.login}?`;
    if (!window.confirm(msg)) return;

    try {
      setTogglingId(u.id);
      await apiPatch("/master_usuarios.php", { id: u.id, status: next });
      toast.success(next === "ATIVO" ? "Master reativado" : "Master desativado");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao alterar status");
    } finally {
      setTogglingId(null);
    }
  }

  if (loading) return <PageSkeleton statCards={0} rows={4} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row">
        <div>
          <h1 className="mb-2 flex items-center gap-2 text-3xl font-bold">
            <Crown className="h-8 w-8" />
            Usuários master
          </h1>
          <p className="text-muted-foreground">
            Contas com acesso à central da plataforma. Todas as ações ficam registradas nos logs.
          </p>
        </div>
        <Button className="h-12 rounded-xl" onClick={openCreate}>
          <Plus className="mr-2 h-5 w-5" />
          Novo master
        </Button>
      </div>

      <div className="grid gap-4">
        {users.map((u) => {
          const isSelf = currentUser?.id === u.id;
          return (
            <Card key={u.id} className="rounded-2xl p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold">{u.nome}</p>
                    <Badge variant="outline" className="border-slate-300">
                      Master
                    </Badge>
                    <Badge
                      className={
                        u.status === "ATIVO"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-red-200 bg-red-50 text-red-800"
                      }
                    >
                      {u.status}
                    </Badge>
                    {isSelf && (
                      <Badge variant="secondary" className="rounded-full">
                        Você
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    @{u.login} · {u.email}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => openEdit(u)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  {!isSelf && (
                    <Button
                      variant="outline"
                      className="rounded-xl"
                      disabled={togglingId === u.id}
                      onClick={() => void toggleStatus(u)}
                    >
                      {u.status === "ATIVO" ? (
                        <>
                          <ShieldOff className="mr-2 h-4 w-4" />
                          Desativar
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="mr-2 h-4 w-4" />
                          Reativar
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {users.length === 0 && (
        <Card className="rounded-2xl p-8 text-center text-muted-foreground">
          Nenhum master cadastrado além do seed inicial.
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar master" : "Novo master"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Atualize nome, e-mail ou senha. O login não pode ser alterado."
                : "Crie uma conta master com acesso total à plataforma."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
            {!editing && (
              <div>
                <Label>Login</Label>
                <Input
                  value={form.login}
                  onChange={(e) => setForm((f) => ({ ...f, login: e.target.value }))}
                  className="mt-1 rounded-xl"
                  required
                />
              </div>
            )}
            <div>
              <Label>Nome</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                className="mt-1 rounded-xl"
                required
              />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="mt-1 rounded-xl"
                required
              />
            </div>
            <div>
              <Label>{editing ? "Nova senha (opcional)" : "Senha"}</Label>
              <Input
                type="password"
                value={form.senha}
                onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
                className="mt-1 rounded-xl"
                required={!editing}
                minLength={6}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="rounded-xl" disabled={saving}>
                {saving ? "Salvando…" : editing ? "Salvar" : "Criar master"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
