import { Navigate, Outlet } from "react-router";
import { useAuth } from "../contexts/auth-context";
import {
  canAccessConsorcio,
  isCompanyAdmin,
  isMaster,
} from "../lib/auth-roles";
import { PageSkeleton } from "./page-skeleton";

export function RequireAuthLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen p-8">
        <PageSkeleton statCards={4} rows={4} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export function RequireMaster() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user || !isMaster(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

/** Admin da empresa — painel consórcio */
export function RequireAdmin() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (isMaster(user.role)) {
    return <Navigate to="/master" replace />;
  }
  if (!isCompanyAdmin(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

/** Leads, contratos, parcelas — master não entra */
export function RequireConsorcio() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (isMaster(user.role)) {
    return <Navigate to="/master" replace />;
  }
  if (!canAccessConsorcio(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export function RequireVendedor() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (isMaster(user.role)) {
    return <Navigate to="/master" replace />;
  }
  if (isCompanyAdmin(user.role)) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}
