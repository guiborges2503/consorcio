import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/layout";
import {
  RequireAuthLayout,
  RequireAdmin,
  RequireConsorcio,
  RequireMaster,
  RequireVendedor,
} from "./components/require-auth-layout";
import { Login } from "./pages/login";
import { Dashboard } from "./pages/dashboard";
import { AdminDashboard } from "./pages/admin-dashboard";
import { MasterDashboard } from "./pages/master-dashboard";
import { MasterEmpresas } from "./pages/master-empresas";
import { MasterEmpresaDetail } from "./pages/master-empresa-detail";
import { MasterFaturas } from "./pages/master-faturas";
import { MasterFinanceiro } from "./pages/master-financeiro";
import { MasterPlanos } from "./pages/master-planos";
import { MasterUsuarios } from "./pages/master-usuarios";
import { MasterLogs } from "./pages/master-logs";
import { Leads } from "./pages/leads";
import { LeadDetail } from "./pages/lead-detail";
import { Sales } from "./pages/sales";
import { Parcelas } from "./pages/parcelas";
import { Ranking } from "./pages/ranking";
import { Profile } from "./pages/profile";
import { UsersAdmin } from "./pages/users-admin";
import { NewContract } from "./pages/new-contract";
import { ContratoDossie } from "./pages/contrato-dossie";

export const router = createBrowserRouter([
  { path: "/login", Component: Login },
  {
    path: "/",
    Component: RequireAuthLayout,
    children: [
      {
        Component: Layout,
        children: [
          {
            path: "master",
            Component: RequireMaster,
            children: [
              { index: true, Component: MasterDashboard },
              { path: "empresas", Component: MasterEmpresas },
              { path: "empresas/:id", Component: MasterEmpresaDetail },
              { path: "planos", Component: MasterPlanos },
              { path: "faturas", Component: MasterFaturas },
              { path: "financeiro", Component: MasterFinanceiro },
              { path: "usuarios", Component: MasterUsuarios },
              { path: "logs", Component: MasterLogs },
            ],
          },
          {
            Component: RequireVendedor,
            children: [{ index: true, Component: Dashboard }],
          },
          {
            path: "admin",
            Component: RequireAdmin,
            children: [{ index: true, Component: AdminDashboard }],
          },
          {
            path: "ranking",
            Component: RequireAdmin,
            children: [{ index: true, Component: Ranking }],
          },
          {
            path: "admin/usuarios",
            Component: RequireAdmin,
            children: [{ index: true, Component: UsersAdmin }],
          },
          { path: "perfil", Component: Profile },
          {
            Component: RequireConsorcio,
            children: [
              { path: "leads", Component: Leads },
              { path: "leads/:id", Component: LeadDetail },
              { path: "contratos", Component: Sales },
              { path: "contratos/novo", Component: NewContract },
              { path: "contratos/:id/dossie", Component: ContratoDossie },
              { path: "vendas", element: <Navigate to="/contratos" replace /> },
              { path: "parcelas", Component: Parcelas },
            ],
          },
          { path: "comissao", element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
]);
