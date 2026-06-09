import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  History,
  Receipt,
} from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { FaturaItensPagamento } from "./fatura-itens-pagamento";
import { FeedbackState } from "./feedback-state";
import { apiGet } from "../lib/api";
import { formatCurrency, formatDate } from "../lib/format";
import { isCompanyAdmin } from "../lib/auth-roles";
import type { Fatura, FaturasResumo, FaturaStatus, UserRole } from "../types/domain";

const statusLabel: Record<FaturaStatus, string> = {
  ABERTA: "Em aberto",
  PAGA: "Paga",
  PARCIAL: "Parcial",
  VENCIDA: "Vencida",
  CANCELADA: "Cancelada",
};

const statusClass: Record<FaturaStatus, string> = {
  ABERTA: "bg-amber-50 text-amber-900 border-amber-200",
  PAGA: "bg-emerald-50 text-emerald-800 border-emerald-200",
  PARCIAL: "bg-blue-50 text-blue-800 border-blue-200",
  VENCIDA: "bg-red-50 text-red-800 border-red-200",
  CANCELADA: "bg-slate-100 text-slate-600 border-slate-200",
};

function formaCobrancaLabel(forma: string): string {
  return forma === "ANUAL" ? "Anual" : "Mensal";
}

function shouldShowBilling(resumo: FaturasResumo, role?: UserRole): boolean {
  if (isCompanyAdmin(role)) return true;
  if (resumo.empresa.planoPremium) return true;
  if (resumo.cobrarFatura) return true;
  return false;
}

function FaturaLinha({ fatura, compact }: { fatura: Fatura; compact?: boolean }) {
  const vencida = fatura.status === "VENCIDA";
  return (
    <div
      className={`rounded-xl border p-3 ${vencida ? "border-red-200 bg-red-50/50" : "border-border/80 bg-white"}`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{fatura.numero}</p>
            <Badge className={statusClass[fatura.status]}>{statusLabel[fatura.status]}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {fatura.referencia} · venc. {formatDate(fatura.vencimento)}
          </p>
          {!compact && fatura.descricao && (
            <p className="mt-1 text-xs text-muted-foreground">{fatura.descricao}</p>
          )}
        </div>
        <div className="text-left sm:text-right">
          <p className="font-semibold tabular-nums">{formatCurrency(fatura.valor)}</p>
          {fatura.saldo > 0 && fatura.status !== "PAGA" && (
            <p className="text-sm text-muted-foreground">Saldo {formatCurrency(fatura.saldo)}</p>
          )}
          {fatura.status === "PAGA" && fatura.pagoEm && (
            <p className="text-xs text-emerald-700">Pago em {formatDate(fatura.pagoEm)}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function AssinaturaFaturas({ role }: { role?: UserRole }) {
  const [resumo, setResumo] = useState<FaturasResumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const r = await apiGet<{ resumo?: FaturasResumo | null; message?: string }>(
        "/faturas.php?resumo=1",
      );
      if (r.resumo) {
        setResumo(r.resumo);
        setMissing(false);
      } else {
        setResumo(null);
        setMissing(true);
        setErrorMsg(r.message ?? "Usuário sem empresa vinculada.");
      }
    } catch (e) {
      setResumo(null);
      setMissing(true);
      setErrorMsg(e instanceof Error ? e.message : "Erro ao carregar faturas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <Card className="rounded-2xl p-6">
        <p className="text-sm text-muted-foreground">Carregando faturas…</p>
      </Card>
    );
  }

  if (missing || !resumo) {
    return (
      <FeedbackState
        type="empty"
        title="Sem dados de faturamento"
        description={errorMsg || "Não foi possível carregar as faturas da sua empresa."}
      />
    );
  }

  if (!shouldShowBilling(resumo, role)) {
    return (
      <FeedbackState
        type="empty"
        title="Faturas indisponíveis"
        description="A cobrança da plataforma é gerenciada pelo administrador da sua empresa."
      />
    );
  }

  const { empresa, faturaAberta, proximoVencimento, meuItem } = resumo;
  const admin = isCompanyAdmin(role);
  const vencida = faturaAberta?.status === "VENCIDA";
  const outrasEmAberto = resumo.faturasEmAberto.filter(
    (f) => !faturaAberta || f.id !== faturaAberta.id,
  );

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Assinatura da empresa
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
            <p className="text-xs font-medium uppercase text-muted-foreground">Plano</p>
            <p className="mt-1 font-semibold">{empresa.planoNome ?? empresa.planoCodigo}</p>
            {empresa.planoPremium && (
              <Badge className="mt-2 border-violet-200 bg-violet-50 text-violet-900">Pro</Badge>
            )}
          </div>
          <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
            <p className="text-xs font-medium uppercase text-muted-foreground">Cobrança</p>
            <p className="mt-1 font-semibold">{formaCobrancaLabel(empresa.formaCobranca)}</p>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(
                empresa.formaCobranca === "ANUAL"
                  ? empresa.valorAnualUsuario
                  : empresa.valorMensalUsuario,
              )}{" "}
              / usuário
            </p>
          </div>
          {admin && (
            <>
              <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Usuários cobráveis
                </p>
                <p className="mt-1 font-semibold">
                  {empresa.qtdUsuariosCobraveis ?? 0} de {empresa.qtdUsuarios}
                </p>
              </div>
              <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Estimativa do período
                </p>
                <p className="mt-1 font-semibold tabular-nums">
                  {formatCurrency(empresa.valorEstimadoFatura)}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-3 rounded-xl border border-border/80 p-3">
          <div className="flex items-center gap-2 text-sm">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            <span>
              Próximo vencimento:{" "}
              <strong>{proximoVencimento ? formatDate(proximoVencimento) : "—"}</strong>
              {empresa.diaVencimento ? ` (dia ${empresa.diaVencimento})` : ""}
            </span>
          </div>
          {resumo.totalEmAberto > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              <span>
                Total em aberto: <strong>{formatCurrency(resumo.totalEmAberto)}</strong>
              </span>
            </div>
          )}
        </div>

        {vencida && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Fatura vencida. Regularize o pagamento para evitar bloqueio de acesso.
          </div>
        )}
      </Card>

      {!admin && meuItem && (
        <Card className="rounded-2xl p-6 space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Minha cobrança
          </h2>
          <div className="flex flex-col gap-2 rounded-xl border border-border/80 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{meuItem.usuarioNome}</p>
              <p className="text-sm text-muted-foreground">
                Valor {formatCurrency(meuItem.valor)}
                {faturaAberta ? ` · ${faturaAberta.referencia}` : ""}
              </p>
            </div>
            {meuItem.status === "PAGA" ? (
              <Badge className="w-fit bg-emerald-50 text-emerald-800 border-emerald-200">
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                Quitado
              </Badge>
            ) : (
              <Badge variant="outline" className="w-fit">
                Em aberto · {formatCurrency(meuItem.saldo)}
              </Badge>
            )}
          </div>
        </Card>
      )}

      {faturaAberta && (admin || empresa.planoPremium) && (
        <div className="space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Fatura em aberto
          </h2>
          <FaturaItensPagamento fatura={faturaAberta} readOnly compact />
        </div>
      )}

      {outrasEmAberto.length > 0 && (
        <Card className="rounded-2xl p-6 space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Outras faturas em aberto
          </h2>
          <div className="space-y-2">
            {outrasEmAberto.map((f) => (
              <FaturaLinha key={f.id} fatura={f} compact={!admin} />
            ))}
          </div>
        </Card>
      )}

      {resumo.faturasPagas.length > 0 && (
        <Card className="rounded-2xl p-6 space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico — faturas pagas
          </h2>
          <div className="space-y-2">
            {resumo.faturasPagas.map((f) => (
              <FaturaLinha key={f.id} fatura={f} />
            ))}
          </div>
        </Card>
      )}

      {!faturaAberta && outrasEmAberto.length === 0 && resumo.faturasPagas.length === 0 && (
        <Card className="rounded-2xl p-6 text-sm text-muted-foreground">
          Nenhuma fatura registrada para sua empresa ainda.
        </Card>
      )}
    </div>
  );
}
