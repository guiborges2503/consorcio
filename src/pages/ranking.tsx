import { useCallback, useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import type { Seller } from "../types/domain";
import { apiGet } from "../lib/api";
import { FeedbackState } from "../components/feedback-state";
import { formatCompactCurrency } from "../lib/format";
import { PageSkeleton } from "../components/page-skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

type RankingPayload = {
  sellers?: Seller[];
  period?: string;
};

export function Ranking() {
  const [data, setData] = useState<RankingPayload | null>(null);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<"all" | "month" | "year">("all");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const load = useCallback(async () => {
    try {
      const q =
        period === "all"
          ? "?period=all"
          : `?period=${period}&year=${year}&month=${month}`;
      const d = await apiGet<RankingPayload>(`/ranking.php${q}`);
      setData(d);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    }
  }, [period, year, month]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return <FeedbackState type="error" title="Erro no ranking" description={error} />;
  }
  if (!data?.sellers) return <PageSkeleton statCards={3} rows={4} />;

  const sellers = data.sellers;
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8 text-amber-600" />
            Ranking de Vendedores
          </h1>
          <p className="text-muted-foreground">Desempenho individual dos vendedores</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={period === "all" ? "default" : "outline"}
            className="rounded-xl"
            onClick={() => setPeriod("all")}
          >
            Geral
          </Button>
          <Button
            variant={period === "month" ? "default" : "outline"}
            className="rounded-xl"
            onClick={() => setPeriod("month")}
          >
            Mês
          </Button>
          <Button
            variant={period === "year" ? "default" : "outline"}
            className="rounded-xl"
            onClick={() => setPeriod("year")}
          >
            Ano
          </Button>
          {period !== "all" && (
            <>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-28 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {period === "month" && (
                <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                  <SelectTrigger className="w-32 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        Mês {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {sellers.map((seller, idx) => (
          <Card
            key={seller.id}
            className={`rounded-2xl p-6 ${idx < 3 ? "border-amber-200/80 bg-amber-50/30" : ""}`}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted font-bold text-lg">
                {seller.badge ?? seller.position}
              </div>
              <Avatar className="h-14 w-14">
                <AvatarFallback>{seller.avatar}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-lg font-semibold">{seller.name}</p>
                  {idx === 0 && <Badge className="bg-amber-100 text-amber-900">Líder</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  {seller.contracts ?? 0} contratos · Meta:{" "}
                  {formatCompactCurrency(seller.monthGoal ?? 0)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold tabular-nums">
                  {formatCompactCurrency(seller.totalSales)}
                </p>
                <p className="text-sm text-emerald-700">
                  Comissão: {formatCompactCurrency(seller.commission)}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
