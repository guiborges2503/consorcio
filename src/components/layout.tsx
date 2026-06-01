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

function navActive(path: string, pathname: string): boolean {
  if (path === "/") return pathname === "/";
  if (path === "/admin") return pathname === "/admin";
  return pathname === path || pathname.startsWith(`${path}/`);
}

function iniciais(nome: string): string {
  const p = nome.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "U";
  const a = p[0]?.[0] ?? "";
  const b = p.length > 1 ? (p[p.length - 1]?.[0] ?? "") : "";
  return (a + b).toUpperCase() || "U";
}

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const displayName = user?.nome ?? "Usuário";
  const isAdmin = user?.role === "ADMIN";
  const navItems = isAdmin ? adminNav : userNav;
  const roleLabel = isAdmin ? "Administrador" : "Vendedor";

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
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
        className={`fixed top-0 left-0 z-50 h-full w-64 transform border-r border-sidebar-border bg-card transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Contempla</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
              aria-label="Fechar menu"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = navActive(item.path, location.pathname);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-colors ${
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
        </div>
      </aside>

      <div className="lg:ml-64">
        <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-sm">
          <div className="px-4 lg:px-8 py-4 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-700 hover:text-gray-900"
              aria-label="Abrir menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex-1 lg:flex-none">
              <h2 className="text-xl font-semibold">
                {location.pathname === "/contratos/novo"
                  ? "Novo Contrato"
                  : location.pathname === "/perfil"
                    ? "Perfil"
                    : navItems.find((item) => navActive(item.path, location.pathname))?.label ||
                      "Dashboard"}
              </h2>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-3 pl-4 border-l border-gray-200 rounded-lg px-2 py-1 hover:bg-muted/60 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Menu do usuário"
                >
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium">{displayName}</p>
                    <p className="text-xs text-muted-foreground">{roleLabel}</p>
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
                {isAdmin && (
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

        <main id="main-content" className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
