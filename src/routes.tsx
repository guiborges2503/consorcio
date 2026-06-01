import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/layout";
import { RequireAuthLayout, RequireAdmin, RequireVendedor } from "./components/require-auth-layout";
import { Login } from "./pages/login";
import { Dashboard } from "./pages/dashboard";
import { AdminDashboard } from "./pages/admin-dashboard";
import { Leads } from "./pages/leads";
import { LeadDetail } from "./pages/lead-detail";
import { Sales } from "./pages/sales";
import { Parcelas } from "./pages/parcelas";
import { Ranking } from "./pages/ranking";
import { Profile } from "./pages/profile";
import { UsersAdmin } from "./pages/users-admin";
import { NewContract } from "./pages/new-contract";

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
          { path: "leads", Component: Leads },
          { path: "leads/:id", Component: LeadDetail },
          { path: "contratos", Component: Sales },
          { path: "contratos/novo", Component: NewContract },
          { path: "vendas", element: <Navigate to="/contratos" replace /> },
          { path: "parcelas", Component: Parcelas },
          { path: "comissao", element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
]);
