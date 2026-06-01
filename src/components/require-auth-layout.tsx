import { Navigate, Outlet } from "react-router";
import { useAuth } from "../contexts/auth-context";
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

export function RequireAdmin() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user || user.role !== "ADMIN") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export function RequireVendedor() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "ADMIN") {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}
