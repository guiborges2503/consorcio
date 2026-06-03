import { APP_VERSION } from "./app-version";

const STORAGE_KEY = "contempla_app_version";

function readMetaVersion(): string | null {
  return (
    document.querySelector('meta[name="application-version"]')?.getAttribute("content")?.trim() ??
    null
  );
}

/** Compara versão salva vs atual e recarrega uma vez se mudou. */
export function ensureAppVersion(): void {
  const current = readMetaVersion() ?? APP_VERSION;
  const stored = localStorage.getItem(STORAGE_KEY);

  if (stored && stored !== current) {
    localStorage.setItem(STORAGE_KEY, current);
    window.location.reload();
    return;
  }

  if (!stored || stored !== current) {
    localStorage.setItem(STORAGE_KEY, current);
  }
}

/** Detecta deploy novo enquanto a aba está aberta (ex.: usuário voltou à aba). */
export function setupVersionWatcher(): void {
  let checking = false;

  async function checkServerVersion() {
    if (checking) return;
    checking = true;
    try {
      const res = await fetch("/api/version.php", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { appVersion?: string };
      const server = data.appVersion?.trim();
      if (server && server !== APP_VERSION) {
        localStorage.setItem(STORAGE_KEY, server);
        window.location.reload();
      }
    } catch {
      /* offline ou API indisponível */
    } finally {
      checking = false;
    }
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void checkServerVersion();
  });
  window.addEventListener("focus", () => void checkServerVersion());
}
