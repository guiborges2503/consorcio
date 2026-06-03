import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  BarChart3,
  Eye,
  EyeOff,
  FileText,
  Layers,
  Lock,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import { useAuth } from "../contexts/auth-context";
import { apiGet, ACCESS_BLOCK_KEY } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { postLoginPath } from "../lib/auth-roles";
import { APP_VERSION } from "../lib/app-version";
import type { UserRole } from "../types/domain";

const REMEMBER_KEY = "contempla_remember_login";
const CONECTAXCON_URL = "https://conectaxcon.com.br/";

function LoginCopyright({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs ${className}`}>
      © {new Date().getFullYear()}{" "}
      <a
        href={CONECTAXCON_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium underline-offset-2 hover:underline"
      >
        ConectaXcon
      </a>
      . Todos os direitos reservados. · v{APP_VERSION}
    </p>
  );
}

const features = [
  { icon: Users, text: "Gestão de leads e funil comercial" },
  { icon: FileText, text: "Contratos e parcelas em um só lugar" },
  { icon: BarChart3, text: "Painéis e ranking da equipe" },
  { icon: ShieldCheck, text: "Acesso seguro por empresa" },
];

export function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const loginInputRef = useRef<HTMLInputElement>(null);
  const [loginField, setLoginField] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setLoginField(saved);
      setRemember(true);
    }
    const blockMsg = sessionStorage.getItem(ACCESS_BLOCK_KEY);
    if (blockMsg) {
      setError(blockMsg);
      sessionStorage.removeItem(ACCESS_BLOCK_KEY);
    }
  }, []);

  useEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      loginInputRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    if (user) {
      navigate(postLoginPath(user.role), { replace: true });
    }
  }, [user, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(loginField.trim(), senha);
      if (remember) {
        localStorage.setItem(REMEMBER_KEY, loginField.trim());
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
      const session = await apiGet<{ user?: { role?: UserRole } }>("/check_session.php");
      navigate(postLoginPath(session.user?.role), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no login");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col lg:flex-row">
      {/* Hero compacto — mobile/tablet */}
      <section
        className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 px-4 pb-6 pt-[max(1.5rem,env(safe-area-inset-top))] text-white lg:hidden"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(56,189,248,0.12),transparent_55%)]" />
        <div className="relative z-10 mx-auto w-full max-w-[420px]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold tracking-tight">Contempla</p>
              <p className="truncate text-xs text-slate-400">Gestão de consórcios</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            Leads, contratos e parcelas na palma da mão.
          </p>
          <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {features.slice(0, 3).map(({ icon: Icon, text }) => (
              <span
                key={text}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs text-slate-200 ring-1 ring-white/10"
              >
                <Icon className="h-3.5 w-3.5 text-teal-300" />
                {text.split(" ")[0]}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Painel de marca — desktop */}
      <aside
        className="relative hidden w-[44%] overflow-hidden lg:flex lg:flex-col lg:justify-between"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(56,189,248,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(13,148,136,0.12),transparent_55%)]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16">
          <div>
            <div className="mb-10 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur-sm">
                <Layers className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xl font-semibold tracking-tight text-white">Contempla</p>
                <p className="text-sm text-slate-400">Plataforma de gestão de consórcios</p>
              </div>
            </div>

            <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-tight text-white xl:text-4xl">
              Venda mais. Organize melhor. Acompanhe tudo.
            </h2>
            <p className="mt-4 max-w-sm text-base leading-relaxed text-slate-400">
              O hub completo para equipes comerciais de consórcio — do primeiro contato ao
              fechamento do contrato.
            </p>
          </div>

          <ul className="mt-12 space-y-4">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-slate-300">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/8 ring-1 ring-white/10">
                  <Icon className="h-4 w-4 text-teal-300" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Formulário */}
      <main className="relative flex flex-1 flex-col items-center justify-center bg-background px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-10 lg:px-8">
        <div className="w-full max-w-[420px]">
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm sm:p-8 lg:p-10">
            <div className="mb-6 hidden lg:block">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Bem-vindo de volta
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Entre com suas credenciais para acessar sua conta
              </p>
            </div>
            <div className="mb-6 lg:hidden">
              <h2 className="text-xl font-semibold tracking-tight">Entrar na conta</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Use seu usuário ou e-mail corporativo
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="login" className="text-sm font-medium">
                  Usuário ou e-mail
                </Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={loginInputRef}
                    id="login"
                    autoComplete="username"
                    value={loginField}
                    onChange={(e) => setLoginField(e.target.value)}
                    className="h-12 rounded-xl border-border/80 bg-input-background pl-10 text-base md:text-base"
                    placeholder="usuário ou e-mail"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="senha" className="text-sm font-medium">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="senha"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="h-12 rounded-xl border-border/80 bg-input-background pl-10 pr-11 text-base md:text-base"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Checkbox
                  id="remember"
                  checked={remember}
                  onCheckedChange={(v) => setRemember(v === true)}
                  className="mt-0.5"
                />
                <Label
                  htmlFor="remember"
                  className="cursor-pointer text-sm font-normal leading-snug text-muted-foreground"
                >
                  Lembrar meu usuário neste dispositivo
                </Label>
              </div>

              {error && (
                <div
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  role="alert"
                  aria-live="assertive"
                >
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="h-12 w-full rounded-xl bg-slate-900 text-white shadow-md shadow-slate-900/15 hover:bg-slate-800"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Entrando…
                  </span>
                ) : (
                  <>
                    <span className="sm:hidden">Entrar</span>
                    <span className="hidden sm:inline">Entrar na plataforma</span>
                  </>
                )}
              </Button>
            </form>
          </div>

          <p className="mt-6 px-1 text-center text-xs leading-relaxed text-muted-foreground">
            Problemas para acessar? Entre em contato com o administrador da sua empresa.
          </p>
          <LoginCopyright className="mt-4 text-center text-muted-foreground sm:text-right lg:hidden" />
        </div>

        <LoginCopyright className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 hidden text-muted-foreground lg:block xl:right-8" />
      </main>
    </div>
  );
}
