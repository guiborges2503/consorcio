import { Outlet, Link, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Users,
  FileText,
  CalendarCheck,
  Trophy,
  Menu,
  X,
  Shield,
  UserCog,
  User,
  LogOut,
  ChevronDown,
  Building2,
  Receipt,
  Wallet,
  ScrollText,
  Crown,
  Tags,
} from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useAuth } from "../contexts/auth-context";
import type { UserRole } from "../types/domain";
import { isCompanyAdmin, isMaster, roleLabel } from "../lib/auth-roles";
import { APP_DISPLAY_NAME, APP_VERSION } from "../lib/app-version";

const userNav = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Users, label: "Leads", path: "/leads" },
  { icon: FileText, label: "Contratos", path: "/contratos" },
  { icon: CalendarCheck, label: "Parcelas", path: "/parcelas" },
];

const adminNav = [
  { icon: Shield, label: "Painel Admin", path: "/admin" },
  { icon: Trophy, label: "Ranking", path: "/ranking" },
  { icon: UserCog, label: "Usuários", path: "/admin/usuarios" },
  { icon: Users, label: "Leads (todos)", path: "/leads" },
  { icon: FileText, label: "Contratos", path: "/contratos" },
];

const masterNav = [
  { icon: Crown, label: "Central Master", path: "/master" },
  { icon: Building2, label: "Empresas", path: "/master/empresas" },
  { icon: Tags, label: "Planos", path: "/master/planos" },
  { icon: Receipt, label: "Faturas", path: "/master/faturas" },
  { icon: Wallet, label: "Financeiro", path: "/master/financeiro" },
  { icon: UserCog, label: "Usuários master", path: "/master/usuarios" },
  { icon: ScrollText, label: "Logs", path: "/master/logs" },
];

function navActive(path: string, pathname: string): boolean {
  if (path === "/") return pathname === "/";
  if (path === "/admin") return pathname === "/admin";
  if (path === "/master") return pathname === "/master";
  return pathname === path || pathname.startsWith(`${path}/`);
}

function iniciais(nome: string): string {
  const p = nome.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "U";
  const a = p[0]?.[0] ?? "";
  const b = p.length > 1 ? (p[p.length - 1]?.[0] ?? "") : "";
  return (a + b).toUpperCase() || "U";
}

function navForRole(role?: UserRole) {
  if (isMaster(role)) return masterNav;
  if (isCompanyAdmin(role)) return adminNav;
  return userNav;
}

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const displayName = user?.nome ?? "Usuário";
  const navItems = navForRole(user?.role);
  const userRoleLabel = roleLabel(user?.role);
  const masterUser = isMaster(user?.role);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const pageTitle =
    location.pathname === "/contratos/novo"
      ? "Novo Contrato"
      : /\/contratos\/\d+\/dossie/.test(location.pathname)
        ? "Dossiê do consórcio"
        : location.pathname === "/perfil"
        ? "Perfil"
        : navItems.find((item) => navActive(item.path, location.pathname))?.label || "Dashboard";

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:shadow"
      >
        Pular para o conteúdo principal
      </a>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        data-app-chrome
        className={`fixed top-0 left-0 z-50 h-full w-[min(100vw-3rem,16rem)] max-w-[85vw] transform border-r border-sidebar-border bg-card transition-transform duration-300 lg:w-64 lg:max-w-none lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col p-4 pt-[max(1rem,env(safe-area-inset-top))] sm:p-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">Contempla</h1>
              {masterUser && (
                <p className="text-xs text-muted-foreground mt-0.5">Administração da plataforma</p>
              )}
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
              aria-label="Fechar menu"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = navActive(item.path, location.pathname);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-3 rounded-xl px-4 py-3 transition-colors ${
                    isActive
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-muted-foreground hover:bg-slate-100 hover:text-foreground"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <p className="mt-4 border-t border-sidebar-border pt-4 text-xs text-muted-foreground">
            {APP_DISPLAY_NAME} v{APP_VERSION}
          </p>
        </div>
      </aside>

      <div className="lg:ml-64">
        <header
          data-app-chrome
          className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-sm pt-[env(safe-area-inset-top)]"
        >
          <div className="flex min-w-0 items-center justify-between gap-2 px-3 py-3 sm:px-4 sm:py-4 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-700 hover:bg-muted/60 lg:hidden"
              aria-label="Abrir menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="min-w-0 flex-1 lg:flex-none">
              <h2 className="truncate text-lg font-semibold sm:text-xl">{pageTitle}</h2>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-11 shrink-0 items-center gap-2 rounded-lg border-l border-gray-200 pl-2 hover:bg-muted/60 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-3 sm:pl-4 sm:pr-2"
                  aria-label="Menu do usuário"
                >
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium">{displayName}</p>
                    <p className="text-xs text-muted-foreground">{userRoleLabel}</p>
                  </div>
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-slate-200 text-slate-700">
                      {iniciais(displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <DropdownMenuLabel>
                  <p className="font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground font-normal">{user?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="rounded-lg cursor-pointer"
                  onClick={() => navigate("/perfil")}
                >
                  <User className="w-4 h-4 mr-2" />
                  Editar perfil
                </DropdownMenuItem>
                {isCompanyAdmin(user?.role) && (
                  <DropdownMenuItem
                    className="rounded-lg cursor-pointer"
                    onClick={() => navigate("/admin/usuarios")}
                  >
                    <UserCog className="w-4 h-4 mr-2" />
                    Gerenciar usuários
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="rounded-lg cursor-pointer text-red-600 focus:text-red-600"
                  onClick={() => void handleLogout()}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Desconectar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main
          id="main-content"
          className="p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4 lg:p-8"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
