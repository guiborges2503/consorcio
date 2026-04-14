async function parseJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) return {};
  try {
    const v = JSON.parse(text) as unknown;
    return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function onUnauthorized(): void {
  const p = window.location.pathname;
  if (!p.endsWith("/login") && p !== "/login") {
    window.location.assign("/login");
  }
}

export async function apiGet<T extends Record<string, unknown>>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`, { credentials: "include" });
  const data = await parseJson(res);
  if (res.status === 401) {
    onUnauthorized();
    throw new Error("Não autenticado");
  }
  if (!res.ok) {
    throw new Error((data.message as string) || `Erro ${res.status}`);
  }
  return data as T;
}

export async function apiPost<T extends Record<string, unknown>>(
  path: string,
  body: Record<string, unknown> = {}
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await parseJson(res);
  if (res.status === 401) {
    onUnauthorized();
    throw new Error("Não autenticado");
  }
  if (!res.ok) {
    throw new Error((data.message as string) || `Erro ${res.status}`);
  }
  if (data.success === false) {
    throw new Error((data.message as string) || "Operação não concluída");
  }
  return data as T;
}

export async function apiLogin(body: { login: string; senha: string }): Promise<{
  success: boolean;
  user?: { id: number; login: string; nome: string; email: string };
  message?: string;
}> {
  const res = await fetch(`/api/login.php`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error((data.message as string) || `Erro ${res.status}`);
  }
  if (data.success === false) {
    throw new Error((data.message as string) || "Usuário ou senha incorretos");
  }
  return data as { success: boolean; user?: { id: number; login: string; nome: string; email: string } };
}

export async function apiPatch<T extends Record<string, unknown>>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await parseJson(res);
  if (res.status === 401) {
    onUnauthorized();
    throw new Error("Não autenticado");
  }
  if (!res.ok) {
    throw new Error((data.message as string) || `Erro ${res.status}`);
  }
  if (data.success === false) {
    throw new Error((data.message as string) || "Operação não concluída");
  }
  return data as T;
}
