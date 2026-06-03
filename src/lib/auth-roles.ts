import type { UserRole } from "../types/domain";

export function isMaster(role?: UserRole): boolean {
  return role === "MASTER";
}

/** Admin da empresa (consórcio) — não inclui master da plataforma */
export function isCompanyAdmin(role?: UserRole): boolean {
  return role === "ADMIN";
}

/** @deprecated Use isCompanyAdmin — master não é staff de consórcio */
export function isStaff(role?: UserRole): boolean {
  return isCompanyAdmin(role);
}

export function roleLabel(role?: UserRole): string {
  if (role === "MASTER") return "Admin Master";
  if (role === "ADMIN") return "Administrador";
  return "Vendedor";
}

export function postLoginPath(role?: UserRole): string {
  if (isMaster(role)) return "/master";
  if (isCompanyAdmin(role)) return "/admin";
  return "/";
}

/** Rotas operacionais de consórcio (leads, contratos, etc.) */
export function canAccessConsorcio(role?: UserRole): boolean {
  return role === "ADMIN" || role === "VENDEDOR";
}
