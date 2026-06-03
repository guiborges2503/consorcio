import { useCallback, useEffect, useState } from "react";
import { StatCard } from "../components/stat-card";
import { Wallet, TrendingDown, TrendingUp, CircleDollarSign } from "lucide-react";
import { apiGet } from "../lib/api";
import { toast } from "sonner";
import { PageSkeleton } from "../components/page-skeleton";
import { formatCurrency } from "../lib/format";
import type { FinanceiroGeral } from "../types/domain";
import { Card } from "../components/ui/card";

export function MasterFinanceiro() {
  const [geral, setGeral] = useState<FinanceiroGeral | null>(null);
  const [porEmpresa, setPorEmpresa] = useState<
    { empresa_id: string; empresa_nome: string; saldo_aberto: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiGet<{
        geral?: FinanceiroGeral;
        porEmpresa?: typeof porEmpresa;
      }>("/master_faturas.php?resumo=1");
      setGeral(r.geral ?? null);
      setPorEmpresa(r.porEmpresa ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar financeiro");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <PageSkeleton statCards={4} rows={3} />;

  const g = geral ?? { aReceber: 0, aPagar: 0, totalEmAberto: 0, totalPago: 0 };

  const empresasMap = new Map<string, { nome: string; aberto: number }>();
  for (const row of porEmpresa) {
    const id = String(row.empresa_id);
    const cur = empresasMap.get(id) ?? { nome: row.empresa_nome, aberto: 0 };
    cur.aberto += Number(row.saldo_aberto ?? 0);
    empresasMap.set(id, cur);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Consolidado da plataforma — cobrança SaaS por usuário cadastrado.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="A receber" value={formatCurrency(g.aReceber)} icon={TrendingUp} color="green" />
        <StatCard title="A pagar" value={formatCurrency(g.aPagar)} icon={TrendingDown} color="orange" />
        <StatCard title="Em aberto" value={formatCurrency(g.totalEmAberto)} icon={Wallet} color="blue" />
        <StatCard title="Total pago" value={formatCurrency(g.totalPago)} icon={CircleDollarSign} color="purple" />
      </div>

      <div>
        <h2 className="font-semibold mb-3">Por empresa</h2>
        <div className="grid gap-3">
          {[...empresasMap.entries()].map(([id, { nome, aberto }]) => (
            <Card key={id} className="rounded-2xl p-4 flex justify-between gap-3 items-center">
              <span className="font-medium truncate">{nome}</span>
              <span className="text-sm shrink-0">
                Em aberto: <strong>{formatCurrency(aberto)}</strong>
              </span>
            </Card>
          ))}
          {empresasMap.size === 0 && (
            <Card className="rounded-2xl p-6 text-center text-muted-foreground text-sm">
              Sem movimentação financeira registrada.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
