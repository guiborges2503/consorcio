import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../contexts/auth-context";
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
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(loginField.trim(), senha);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no login");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
      <Card className="w-full max-w-md p-8 rounded-3xl border-0 shadow-xl">
        <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          ConsórciosPro
        </h1>
        <p className="text-center text-muted-foreground mb-8">Entre com sua conta</p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="login">Usuário ou e-mail</Label>
            <Input
              id="login"
              autoComplete="username"
              value={loginField}
              onChange={(e) => setLoginField(e.target.value)}
              className="rounded-xl mt-1 h-12"
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
              required
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}
          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600"
          >
            {submitting ? "Entrando…" : "Entrar"}
          </Button>
        </form>
        <p className="text-xs text-center text-muted-foreground mt-6">
          Demo: admin / admin123 ou amanda / admin123
        </p>
      </Card>
    </div>
  );
}
