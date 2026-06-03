import { Link } from "react-router";
import {
  Building2,
  Receipt,
  Wallet,
  ScrollText,
  Tags,
  ArrowRight,
  UserCog,
} from "lucide-react";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { APP_VERSION } from "../lib/app-version";

const sections = [
  {
    title: "Empresas",
    description: "Cadastro de tenants, admin por empresa e forma de cobrança por usuário.",
    icon: Building2,
    path: "/master/empresas",
  },
  {
    title: "Planos e valores",
    description: "Tarifas mensais e anuais por usuário — novas faturas usam o valor vigente.",
    icon: Tags,
    path: "/master/planos",
  },
  {
    title: "Faturas",
    description: "Gerar cobrança e validar pagamentos manualmente (PIX, boleto, etc.).",
    icon: Receipt,
    path: "/master/faturas",
  },
  {
    title: "Financeiro",
    description: "Consolidado a receber, a pagar e saldo por empresa.",
    icon: Wallet,
    path: "/master/financeiro",
  },
  {
    title: "Usuários master",
    description: "Criar e gerenciar contas com acesso à central da plataforma.",
    icon: UserCog,
    path: "/master/usuarios",
  },
  {
    title: "Logs do sistema",
    description: "Auditoria de logins, masters, empresas, faturas e baixas.",
    icon: ScrollText,
    path: "/master/logs",
  },
];

export function MasterDashboard() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <Badge variant="outline" className="mb-3 rounded-lg">
          Plataforma Contempla · v{APP_VERSION}
        </Badge>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Central Master</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Gestão do SaaS — empresas, faturas e financeiro. Sem acesso a leads, contratos ou
          parcelas dos clientes.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map(({ title, description, icon: Icon, path }) => (
          <Link key={path} to={path} className="group block min-w-0">
            <Card className="h-full rounded-2xl border-border/80 p-5 transition-shadow hover:shadow-md sm:p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
              <h2 className="font-semibold text-lg">{title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
