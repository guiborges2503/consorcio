import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Filter, ScrollText } from "lucide-react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { apiGet } from "../lib/api";
import { toast } from "sonner";
import { PageSkeleton } from "../components/page-skeleton";
import { formatDate } from "../lib/format";
import type { AuditLogEntry, AuditNivel } from "../types/domain";

const nivelClass: Record<AuditNivel, string> = {
  INFO: "bg-slate-100 text-slate-800 border-slate-200",
  WARN: "bg-amber-50 text-amber-900 border-amber-200",
  ERROR: "bg-red-50 text-red-800 border-red-200",
  SECURITY: "bg-violet-50 text-violet-900 border-violet-200",
};

const acaoLabel: Record<string, string> = {
  LOGIN_OK: "Login OK",
  LOGIN_FAIL: "Login falhou",
  LOGOUT: "Logout",
  MASTER_CRIADO: "Master criado",
  MASTER_ATUALIZADO: "Master atualizado",
  MASTER_ATIVADO: "Master reativado",
  MASTER_DESATIVADO: "Master desativado",
  MASTER_CRIAR_FALHA: "Falha ao criar master",
  EMPRESA_CRIADA: "Empresa criada",
  EMPRESA_ATUALIZADA: "Empresa atualizada",
  EMPRESA_ADMIN_CRIADO: "Admin da empresa criado",
  USUARIO_ATIVADO: "Usuário ativado",
  USUARIO_DESATIVADO: "Usuário desativado",
  FATURA_GERADA: "Fatura gerada",
  FATURA_BAIXA: "Fatura baixada",
  FATURA_BAIXA_ITEM: "Item de fatura baixado",
  PLANO_CRIADO: "Plano criado",
  PLANO_ATUALIZADO: "Plano atualizado",
};

function labelAcao(acao: string): string {
  return acaoLabel[acao] ?? acao.replace(/_/g, " ").toLowerCase();
}

export function MasterLogs() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [acoes, setAcoes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filtroAcao, setFiltroAcao] = useState("all");
  const [filtroNivel, setFiltroNivel] = useState("all");
  const [filtroEscopo, setFiltroEscopo] = useState("all");
  const [filtroFrom, setFiltroFrom] = useState("");
  const [filtroTo, setFiltroTo] = useState("");
  const [filtroQ, setFiltroQ] = useState("");
  const limit = 30;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (filtroAcao !== "all") params.set("acao", filtroAcao);
      if (filtroNivel !== "all") params.set("nivel", filtroNivel);
      if (filtroEscopo === "platform") params.set("empresaId", "platform");
      if (filtroFrom) params.set("from", filtroFrom);
      if (filtroTo) params.set("to", filtroTo);
      if (filtroQ.trim()) params.set("q", filtroQ.trim());

      const r = await apiGet<{
        logs?: AuditLogEntry[];
        total?: number;
        acoes?: string[];
      }>(`/master_logs.php?${params.toString()}`);
      setLogs(r.logs ?? []);
      setTotal(r.total ?? 0);
      setAcoes(r.acoes ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar logs");
    } finally {
      setLoading(false);
    }
  }, [page, filtroAcao, filtroNivel, filtroEscopo, filtroFrom, filtroTo, filtroQ]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  function aplicarFiltros() {
    setPage(1);
    void load();
  }

  if (loading && logs.length === 0) return <PageSkeleton statCards={0} rows={6} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2 flex items-center gap-2 text-3xl font-bold">
          <ScrollText className="h-8 w-8" />
          Logs do sistema
        </h1>
        <p className="text-muted-foreground">
          Auditoria de logins, masters, empresas, faturas e planos.
        </p>
      </div>

      <Card className="rounded-2xl p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Filter className="h-4 w-4" />
          Filtros
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div>
            <Label className="text-xs">Busca</Label>
            <Input
              value={filtroQ}
              onChange={(e) => setFiltroQ(e.target.value)}
              placeholder="Mensagem, login…"
              className="mt-1 rounded-xl"
            />
          </div>
          <div>
            <Label className="text-xs">Ação</Label>
            <Select value={filtroAcao} onValueChange={setFiltroAcao}>
              <SelectTrigger className="mt-1 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {acoes.map((a) => (
                  <SelectItem key={a} value={a}>
                    {labelAcao(a)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Nível</Label>
            <Select value={filtroNivel} onValueChange={setFiltroNivel}>
              <SelectTrigger className="mt-1 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="INFO">Info</SelectItem>
                <SelectItem value="WARN">Aviso</SelectItem>
                <SelectItem value="ERROR">Erro</SelectItem>
                <SelectItem value="SECURITY">Segurança</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Escopo</Label>
            <Select value={filtroEscopo} onValueChange={setFiltroEscopo}>
              <SelectTrigger className="mt-1 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Plataforma + empresas</SelectItem>
                <SelectItem value="platform">Só plataforma (masters)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">De</Label>
            <Input
              type="date"
              value={filtroFrom}
              onChange={(e) => setFiltroFrom(e.target.value)}
              className="mt-1 rounded-xl"
            />
          </div>
          <div>
            <Label className="text-xs">Até</Label>
            <Input
              type="date"
              value={filtroTo}
              onChange={(e) => setFiltroTo(e.target.value)}
              className="mt-1 rounded-xl"
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button className="rounded-xl" onClick={aplicarFiltros}>
            Aplicar filtros
          </Button>
        </div>
      </Card>

      <p className="text-sm text-muted-foreground">
        {total} registro{total !== 1 ? "s" : ""} · página {page} de {totalPages}
      </p>

      <div className="grid gap-3">
        {logs.map((log) => {
          const expanded = expandedId === log.id;
          return (
            <Card key={log.id} className="rounded-2xl p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge className={nivelClass[log.nivel]}>{log.nivel}</Badge>
                    <Badge variant="outline">{labelAcao(log.acao)}</Badge>
                    {log.empresaId === null && (
                      <Badge variant="secondary" className="rounded-full">
                        Plataforma
                      </Badge>
                    )}
                  </div>
                  <p className="font-medium">{log.mensagem}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDate(log.createdAt)}{" "}
                    {log.createdAt.includes(" ") ? log.createdAt.split(" ")[1]?.slice(0, 5) : ""}
                    {log.usuarioLogin ? ` · @${log.usuarioLogin}` : ""}
                    {log.usuarioNome ? ` (${log.usuarioNome})` : ""}
                    {log.ip ? ` · IP ${log.ip}` : ""}
                  </p>
                  {(log.recurso || log.recursoId) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {log.recurso}
                      {log.recursoId ? ` #${log.recursoId}` : ""}
                      {log.empresaId !== null ? ` · empresa ${log.empresaId}` : ""}
                    </p>
                  )}
                </div>
                {log.payload && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0 rounded-xl"
                    onClick={() => setExpandedId(expanded ? null : log.id)}
                  >
                    {expanded ? (
                      <>
                        <ChevronUp className="mr-1 h-4 w-4" />
                        Ocultar
                      </>
                    ) : (
                      <>
                        <ChevronDown className="mr-1 h-4 w-4" />
                        Detalhes
                      </>
                    )}
                  </Button>
                )}
              </div>
              {expanded && log.payload && (
                <pre className="mt-3 overflow-x-auto rounded-xl bg-muted/50 p-3 text-xs">
                  {JSON.stringify(log.payload, null, 2)}
                </pre>
              )}
            </Card>
          );
        })}
      </div>

      {!loading && logs.length === 0 && (
        <Card className="rounded-2xl p-8 text-center text-muted-foreground">
          Nenhum log encontrado com os filtros atuais.
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            className="rounded-xl"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            className="rounded-xl"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}
