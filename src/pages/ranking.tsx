import { useEffect, useState } from "react";
import { Award, Flame } from "lucide-react";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import type { Seller } from "../types/domain";
import { apiGet } from "../lib/api";
import { FeedbackState } from "../components/feedback-state";
import { formatCompactCurrency } from "../lib/format";
import { PageSkeleton } from "../components/page-skeleton";

type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
};

type RankingPayload = {
  sellers?: Seller[];
  currentUser?: Seller & { monthGoal?: number };
  goalProgress?: number;
  achievements?: Achievement[];
};

export function Ranking() {
  const [data, setData] = useState<RankingPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const d = await apiGet<RankingPayload>("/ranking.php");
        setData(d);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro");
      }
    })();
  }, []);

  if (error) {
    return (
      <FeedbackState
        type="error"
        title="Não foi possível carregar o ranking"
        description={error}
      />
    );
  }
  if (!data?.currentUser || !data.sellers) {
    return <PageSkeleton statCards={3} rows={4} />;
  }

  const mockSellers = data.sellers;
  const currentUser = data.currentUser;
  const goalProgress = data.goalProgress ?? 0;
  const achievements = data.achievements ?? [];

  return (
    <div className="space-y-6">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-semibold tracking-tight text-foreground">
          Ranking de vendedores
        </h1>
        <p className="text-muted-foreground">Acompanhe sua posição e evolução</p>
      </div>

      <Card className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-8 shadow-sm">
        <div className="relative z-10">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border border-border">
                <AvatarFallback className="bg-muted text-2xl font-semibold text-foreground">
                  {currentUser.avatar}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="mb-1 text-2xl font-semibold">{currentUser.name}</h2>
                <p className="text-sm text-muted-foreground">Posição #{currentUser.position} no ranking</p>
              </div>
            </div>
            <div className="text-4xl">{currentUser.badge ?? ""}</div>
          </div>
          <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Total vendido</p>
              <p className="text-2xl font-semibold tabular-nums">
                {formatCompactCurrency(currentUser.totalSales)}
              </p>
            </div>
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Comissão</p>
              <p className="text-2xl font-semibold tabular-nums">
                {formatCompactCurrency(currentUser.commission)}
              </p>
            </div>
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Meta do mês</p>
              <p className="text-2xl font-semibold tabular-nums">{goalProgress.toFixed(0)}%</p>
            </div>
          </div>
          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso para o próximo nível</span>
              <span className="font-medium tabular-nums">{goalProgress.toFixed(0)}%</span>
            </div>
            <Progress value={goalProgress} className="h-2.5 rounded-full" />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {mockSellers.slice(0, 3).map((seller, index) => {
          const accent =
            index === 0
              ? "border-amber-200/80 bg-amber-50/40"
              : index === 1
                ? "border-slate-200 bg-slate-50/80"
                : "border-orange-200/70 bg-orange-50/40";
          const heights = ["md:h-80", "md:h-64", "md:h-56"];
          const order = index === 0 ? "md:order-1" : index === 1 ? "md:order-0" : "md:order-2";

          return (
            <Card
              key={seller.id}
              className={`flex ${heights[index]} ${order} flex-col justify-between rounded-2xl border ${accent} p-6 shadow-sm`}
            >
              <div className="text-center">
                <div className="mb-4 text-5xl">{seller.badge}</div>
                <Avatar className="mx-auto mb-4 h-20 w-20 border border-border">
                  <AvatarFallback className="bg-muted text-xl font-semibold text-foreground">
                    {seller.avatar}
                  </AvatarFallback>
                </Avatar>
                <h3 className="mb-1 text-xl font-semibold">{seller.name}</h3>
                <p className="text-sm text-muted-foreground">Posição #{seller.position}</p>
              </div>
              <div className="mt-6 space-y-2 rounded-2xl border border-border/60 bg-card p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-semibold tabular-nums">{formatCompactCurrency(seller.totalSales)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Comissão</span>
                  <span className="font-semibold tabular-nums">{formatCompactCurrency(seller.commission)}</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
        <h3 className="mb-6 text-lg font-semibold">Ranking completo</h3>
        <div className="space-y-3">
          {mockSellers.map((seller) => (
            <div
              key={seller.id}
              className={`flex items-center gap-4 rounded-xl border p-5 transition-colors ${
                seller.id === String(currentUser.id)
                  ? "border-primary/25 bg-muted/50"
                  : "border-transparent bg-muted/20 hover:bg-muted/40"
              }`}
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl text-lg font-semibold ${
                  seller.position === 1
                    ? "border border-amber-300 bg-amber-50 text-amber-950"
                    : seller.position === 2
                      ? "border border-slate-300 bg-slate-100 text-slate-800"
                      : seller.position === 3
                        ? "border border-orange-200 bg-orange-50 text-orange-950"
                        : "border border-border bg-card text-foreground"
                }`}
              >
                {seller.position}
              </div>
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-muted font-semibold text-foreground">
                  {seller.avatar}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-lg">{seller.name}</h4>
                  {seller.badge && <span className="text-xl">{seller.badge}</span>}
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatCompactCurrency(seller.totalSales)} em vendas
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-semibold tabular-nums text-foreground">
                  {formatCompactCurrency(seller.commission)}
                </p>
                <p className="text-xs text-muted-foreground">em comissões</p>
              </div>
              <div className="hidden sm:block">
                {seller.position <= 3 && (
                  <Badge variant="secondary" className="rounded-full px-4 py-2 font-normal">
                    Top {seller.position}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <Award className="h-6 w-6 text-slate-600" />
          <h3 className="text-lg font-semibold">Conquistas</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`rounded-2xl border p-6 transition-all ${
                achievement.unlocked
                  ? "border-border bg-card shadow-sm"
                  : "border-border/60 bg-muted/20 opacity-80"
              }`}
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="text-4xl">{achievement.icon}</div>
                {achievement.unlocked && (
                  <Badge
                    variant="secondary"
                    className="rounded-full border border-emerald-200 bg-emerald-50 font-normal text-emerald-900"
                  >
                    Desbloqueado
                  </Badge>
                )}
              </div>
              <h4 className="font-semibold mb-1">{achievement.title}</h4>
              <p className="text-sm text-muted-foreground mb-3">{achievement.description}</p>
              {!achievement.unlocked && achievement.progress > 0 && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="font-medium">{achievement.progress}%</span>
                  </div>
                  <Progress value={achievement.progress} className="h-2 rounded-full" />
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="rounded-2xl border border-border/80 bg-muted/30 p-8 text-center shadow-sm">
        <Flame className="mx-auto mb-4 h-12 w-12 text-amber-600/80" />
        <h3 className="mb-2 text-xl font-semibold">Continue firme</h3>
        <p className="mx-auto max-w-2xl text-muted-foreground">
          Cada venda conta. Suba no ranking e desbloqueie novas conquistas.
        </p>
      </Card>
    </div>
  );
}
