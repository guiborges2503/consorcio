import { useEffect, useState } from "react";
import { User, Lock, Save } from "lucide-react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { roleLabel } from "../lib/auth-roles";
import { apiGet, apiPatch } from "../lib/api";
import { useAuth } from "../contexts/auth-context";
import { toast } from "sonner";
import { PageSkeleton } from "../components/page-skeleton";
import { FeedbackState } from "../components/feedback-state";

type Profile = {
  id: number;
  login: string;
  nome: string;
  email: string;
  role: string;
  status: string;
  monthGoal: number;
};

export function Profile() {
  const { refresh } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [senhaNova, setSenhaNova] = useState("");
  const [senhaConfirm, setSenhaConfirm] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await apiGet<{ profile?: Profile }>("/profile.php");
        if (r.profile) {
          setProfile(r.profile);
          setNome(r.profile.nome);
          setEmail(r.profile.email);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao carregar perfil");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (senhaNova && senhaNova !== senhaConfirm) {
      toast.error("A confirmação da senha não confere");
      return;
    }
    try {
      setSaving(true);
      const body: Record<string, string> = { nome, email };
      if (senhaNova) {
        body.senhaAtual = senhaAtual;
        body.senhaNova = senhaNova;
      }
      await apiPatch("/profile.php", body);
      toast.success("Perfil atualizado com sucesso");
      setSenhaAtual("");
      setSenhaNova("");
      setSenhaConfirm("");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageSkeleton statCards={0} rows={4} />;
  if (error) return <FeedbackState type="error" title="Erro" description={error} />;
  if (!profile) return <FeedbackState type="empty" title="Perfil não encontrado" description="" />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Editar Perfil</h1>
        <p className="text-muted-foreground">Atualize seus dados e altere sua senha</p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
        <Card className="rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <User className="h-5 w-5" />
            Dados pessoais
          </h2>
          <div>
            <Label>Usuário</Label>
            <Input value={profile.login} disabled className="rounded-xl mt-1 bg-muted" />
          </div>
          <div>
            <Label htmlFor="nome">Nome completo</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="rounded-xl mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl mt-1"
              required
            />
          </div>
          <div>
            <Label>Perfil</Label>
            <Input
              value={roleLabel(profile.role)}
              disabled
              className="rounded-xl mt-1 bg-muted"
            />
          </div>
        </Card>

        <Card className="rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Alterar senha
          </h2>
          <p className="text-sm text-muted-foreground">
            Deixe em branco se não quiser alterar a senha.
          </p>
          <div>
            <Label htmlFor="senhaAtual">Senha atual</Label>
            <Input
              id="senhaAtual"
              type="password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              className="rounded-xl mt-1"
              autoComplete="current-password"
            />
          </div>
          <div>
            <Label htmlFor="senhaNova">Nova senha</Label>
            <Input
              id="senhaNova"
              type="password"
              value={senhaNova}
              onChange={(e) => setSenhaNova(e.target.value)}
              className="rounded-xl mt-1"
              autoComplete="new-password"
            />
          </div>
          <div>
            <Label htmlFor="senhaConfirm">Confirmar nova senha</Label>
            <Input
              id="senhaConfirm"
              type="password"
              value={senhaConfirm}
              onChange={(e) => setSenhaConfirm(e.target.value)}
              className="rounded-xl mt-1"
              autoComplete="new-password"
            />
          </div>
        </Card>

        <Button type="submit" disabled={saving} className="rounded-xl h-12 px-8">
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Salvando..." : "Salvar alterações"}
        </Button>
      </form>
    </div>
  );
}
