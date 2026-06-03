
# Contempla — Gestão de Consórcios

**Versão:** 1.0.6

SaaS para gestão de vendas de consórcio.

## Desenvolvimento local

### 1. Instalar dependências do front

```bash
npm install
```

### 2. MySQL local

Copie `api/settings/database.local.example.php` → `api/settings/database.local.php` e ajuste host/usuário/senha.

Importe no MySQL: `database/schema.sql` e, se quiser dados de teste, `database/seed-demo.sql`.

### 3. Subir a API PHP (terminal 1)

No PowerShell, com PHP 7.4 do WAMP no PATH:

```powershell
$env:Path = "C:\wamp64\bin\php\php7.4.33;" + $env:Path
npm run dev:api
```

A API fica em `http://localhost:8000/api/` (pasta `api/` na raiz do projeto).

### 4. Subir o front (terminal 2)

```bash
npm run dev
```

O Vite (porta **5173**) faz proxy de `/api/*` → `http://localhost:8000/api/*`.  
No console do Vite deve aparecer: `Proxy /api → http://localhost:8000/api`.

**Alternativa:** front + API juntos (requer PHP no PATH):

```bash
npm run dev:full
```

**WAMP/Apache (sem PHP :8000):** use `npm run dev:wamp` e configure `.env.local` (veja `.env.development.example`).

### Dados demo (somente desenvolvimento)

Após `schema.sql`, importe opcionalmente `database/seed-demo.sql` (usuários `admin` / `amanda` / `bruno`, senha `admin123`).

## Produção (`https://contempla.conectaxcon.com.br`)

### Erro 404 em `/api/login.php`?

Quase sempre é **pasta `api/` ausente** no servidor (só foi enviado o build do React). O front chama `/api/...` na mesma raiz do site.

**Estrutura correta em `public_html`:**

```
public_html/
  .htaccess
  index.html
  assets/
  api/
    login.php
    check_session.php
    settings/
      database.local.php   ← criar no servidor
```

### Deploy recomendado

```bash
npm run build:deploy
```

Isso gera `dist/` com **front + api + .htaccess**. Envie **todo** o conteúdo de `dist/` para `public_html`.

Teste no navegador: `https://contempla.conectaxcon.com.br/api/check_session.php` (JSON de sessão ou não autenticado).

### Voltar página / F5 em `/parcelas` dá 404?

O React usa rotas no navegador (`/parcelas`, `/contratos`). O servidor precisa do **`.htaccess`** na raiz (arquivo **oculto**) para enviar essas URLs ao `index.html`.

1. No Gerenciador de Arquivos da Hostinger, ative **“Mostrar arquivos ocultos”**.
2. Confirme que existe `public_html/.htaccess` (enviado com o deploy).
3. Rode `npm run build:deploy` e reenvie **todo** `dist/`, incluindo `.htaccess` e `404.html`.
4. Teste: abra direto `https://contempla.conectaxcon.com.br/parcelas` — deve carregar o app, não a página 404 da Hostinger.

1. **Build:** `npm run build:deploy` (não use só `npm run build` sem copiar a API).
2. **Upload:** todo o conteúdo de `dist/` na raiz do domínio.
3. **MySQL:** em `api/settings/database.local.php` (não versionado):

   ```php
   define('DB_HOST', 'srv746.hstgr.io');
   define('DB_PORT', '3306');
   define('DB_NAME', 'u276379167_CONSORCIO');
   define('DB_USER', 'u276379167_CONSORCIO');
   define('DB_PASS', 'sua_senha');
   ```

4. Importe `database/schema.sql` no phpMyAdmin (sem `seed-demo.sql` em produção).
5. **HTTPS obrigatório** no painel Hostinger (cookie de sessão usa `Secure`).
6. **Troque todas as senhas** dos usuários demo (`admin123`) antes de abrir ao público.
7. Confirme que `api/settings/` e `database/` não abrem no navegador (`.htaccess` de negação).

### Segurança das APIs (resumo)

| Item | Status |
|------|--------|
| Endpoints de dados exigem login | Sim (`consorcio_require_login`) |
| Admin (usuários, ranking, painel admin) | Só role `ADMIN` |
| Vendedor vê só seus leads/contratos/parcelas | Sim (`usuario_id` nas queries) |
| SQL injection | Mitigado (PDO preparado) |
| Credenciais DB fora do Git | Sim (`database.local.php` no `.gitignore`) |
| CORS em produção | Restrito a `https://contempla.conectaxcon.com.br` |
| Senhas | MD5 legado — **troque senhas fortes** após o deploy |
| Login sem limite de tentativas | Não há rate limit ainda — use senhas fortes + HTTPS |
