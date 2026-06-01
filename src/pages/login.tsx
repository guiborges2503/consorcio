import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../contexts/auth-context";
import { apiGet } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card } from "../components/ui/card";

export function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [loginField, setLoginField] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      navigate(user.role === "ADMIN" ? "/admin" : "/", { replace: true });
    }
  }, [user, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(loginField.trim(), senha);
      const session = await apiGet<{ user?: { role?: string } }>("/check_session.php");
      const role = session.user?.role;
      navigate(role === "ADMIN" ? "/admin" : "/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no login");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-8 shadow-sm">
        <h1 className="mb-2 text-center text-3xl font-semibold tracking-tight text-foreground">
          Contempla
        </h1>
        <p className="text-center text-muted-foreground mb-8">Entre com sua conta</p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="login">Usuário ou e-mail</Label>
            <Input
              id="login"
              autoComplete="username"
              autoFocus
              value={loginField}
              onChange={(e) => setLoginField(e.target.value)}
              className="rounded-xl mt-1 h-12"
              placeholder="Digite seu usuário ou e-mail"
              required
            />
          </div>
          <div>
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="rounded-xl mt-1 h-12"
              placeholder="Digite sua senha"
              required
            />
          </div>
          {error && (
            <p
              className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </p>
          )}
          <Button type="submit" disabled={submitting} className="h-12 w-full rounded-xl">
            {submitting ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
