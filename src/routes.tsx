import { createBrowserRouter } from "react-router";
import { Layout } from "./components/layout";
import { RequireAuthLayout } from "./components/require-auth-layout";
import { Login } from "./pages/login";
import { Dashboard } from "./pages/dashboard";
import { Leads } from "./pages/leads";
import { LeadDetail } from "./pages/lead-detail";
import { Sales } from "./pages/sales";
import { Commission } from "./pages/commission";
import { Ranking } from "./pages/ranking";

export const router = createBrowserRouter([
  { path: "/login", Component: Login },
  {
    path: "/",
    Component: RequireAuthLayout,
    children: [
      {
        Component: Layout,
        children: [
          { index: true, Component: Dashboard },
          { path: "leads", Component: Leads },
          { path: "leads/:id", Component: LeadDetail },
          { path: "vendas", Component: Sales },
          { path: "comissao", Component: Commission },
          { path: "ranking", Component: Ranking },
        ],
      },
    ],
  },
]);
