/**
 * Monta dist/ com front (vite build) + pasta api/ + .htaccess para upload único no Hostinger.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const apiSrc = path.join(root, "api");
const apiDest = path.join(dist, "api");

/** Não enviar ao Hostinger: credenciais locais, exemplos, seeds e utilitários só-dev. */
const SKIP_FILES = new Set([
  path.normalize("settings/database.local.php"),
  path.normalize("settings/database.local.example.php"),
]);

function copyDir(src, dest, rel = "") {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  for (const name of fs.readdirSync(src)) {
    const relPath = rel ? `${rel}/${name}` : name;
    const norm = path.normalize(relPath.replace(/\\/g, "/"));
    if (SKIP_FILES.has(norm)) {
      continue;
    }
    const from = path.join(src, name);
    const to = path.join(dest, name);
    const stat = fs.statSync(from);
    if (stat.isDirectory()) {
      copyDir(from, to, relPath);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

if (!fs.existsSync(dist)) {
  console.error("Execute antes: npm run build");
  process.exit(1);
}
if (!fs.existsSync(apiSrc)) {
  console.error("Pasta api/ não encontrada.");
  process.exit(1);
}

fs.copyFileSync(path.join(root, ".htaccess"), path.join(dist, ".htaccess"));
const indexHtml = path.join(dist, "index.html");
if (fs.existsSync(indexHtml)) {
  fs.copyFileSync(indexHtml, path.join(dist, "404.html"));
}
if (fs.existsSync(apiDest)) {
  fs.rmSync(apiDest, { recursive: true });
}
copyDir(apiSrc, apiDest);

console.log("\n[deploy] Pacote pronto em dist/");
console.log("  - index.html + 404.html (SPA fallback Hostinger)");
console.log("  - assets/ (front)");
console.log("  - api/ (PHP)");
console.log("  - .htaccess  ← arquivo OCULTO; ative \"mostrar ocultos\" no Gerenciador de Arquivos");
console.log("\nEnvie TODO o conteúdo de dist/ para public_html do domínio.");
console.log("Crie api/settings/database.local.php no servidor (não vai no zip se existir local).\n");
