import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, UserCog } from "lucide-react";
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
import { apiGet, apiPatch, apiPost } from "../lib/api";
import { toast } from "sonner";
import { PageSkeleton } from "../components/page-skeleton";
import { formatCompactCurrency } from "../lib/format";
import type { ManagedUser, UserRole } from "../types/domain";

const emptyForm = {
  login: "",
  nome: "",
  email: "",
  senha: "",
  role: "VENDEDOR" as UserRole,
  status: "ATIVO" as "ATIVO" | "INATIVO",
  monthGoal: "500000",
};

export function UsersAdmin() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiGet<{ users?: ManagedUser[] }>("/users.php");
      setUsers(r.users ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar usuários");
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
      role: u.role,
      status: u.status,
      monthGoal: String(u.monthGoal),
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
          role: form.role,
          status: form.status,
          monthGoal: parseFloat(form.monthGoal) || 500000,
        };
        if (form.senha) body.senha = form.senha;
        await apiPatch("/users.php", body);
        toast.success("Usuário atualizado");
      } else {
        if (!form.login || !form.senha) {
          toast.error("Login e senha são obrigatórios");
          return;
        }
        await apiPost("/users.php", {
          login: form.login,
          nome: form.nome,
          email: form.email,
          senha: form.senha,
          role: form.role,
          status: form.status,
          monthGoal: parseFloat(form.monthGoal) || 500000,
        });
        toast.success("Usuário criado");
      }
      setDialogOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageSkeleton statCards={0} rows={5} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <UserCog className="h-8 w-8" />
            Usuários
          </h1>
          <p className="text-muted-foreground">Crie e gerencie vendedores e administradores</p>
        </div>
        <Button className="rounded-xl h-12" onClick={openCreate}>
          <Plus className="w-5 h-5 mr-2" />
          Novo Usuário
        </Button>
      </div>

      <div className="grid gap-4">
        {users.map((u) => (
          <Card key={u.id} className="rounded-2xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-lg">{u.nome}</p>
                  <Badge variant="outline">{u.role === "ADMIN" ? "Admin" : "Vendedor"}</Badge>
                  <Badge
                    className={
                      u.status === "ATIVO"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-red-50 text-red-800 border-red-200"
                    }
                  >
                    {u.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  @{u.login} · {u.email}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Meta mensal: {formatCompactCurrency(u.monthGoal)}
                </p>
              </div>
              <Button variant="outline" className="rounded-xl" onClick={() => openEdit(u)}>
                <Pencil className="w-4 h-4 mr-2" />
                Editar
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar usuário" : "Novo usuário"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Atualize os dados. Deixe a senha em branco para manter a atual."
                : "Preencha os dados para criar um novo acesso."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
            {!editing && (
              <div>
                <Label>Login</Label>
                <Input
                  value={form.login}
                  onChange={(e) => setForm((f) => ({ ...f, login: e.target.value }))}
                  className="rounded-xl mt-1"
                  required
                />
              </div>
            )}
            <div>
              <Label>Nome</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                className="rounded-xl mt-1"
                required
              />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="rounded-xl mt-1"
                required
              />
            </div>
            <div>
              <Label>{editing ? "Nova senha (opcional)" : "Senha"}</Label>
              <Input
                type="password"
                value={form.senha}
                onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
                className="rounded-xl mt-1"
                required={!editing}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Perfil</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm((f) => ({ ...f, role: v as UserRole }))}
                >
                  <SelectTrigger className="rounded-xl mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VENDEDOR">Vendedor</SelectItem>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, status: v as "ATIVO" | "INATIVO" }))
                  }
                >
                  <SelectTrigger className="rounded-xl mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ATIVO">Ativo</SelectItem>
                    <SelectItem value="INATIVO">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Meta mensal (R$)</Label>
              <Input
                type="number"
                value={form.monthGoal}
                onChange={(e) => setForm((f) => ({ ...f, monthGoal: e.target.value }))}
                className="rounded-xl mt-1"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="rounded-xl">
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
