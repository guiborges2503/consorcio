import { useEffect, useState } from "react";
import { Award, Flame } from "lucide-react";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import type { Seller } from "../types/domain";
import { apiGet } from "../lib/api";

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
    return <p className="text-red-600">{error}</p>;
  }
  if (!data?.currentUser || !data.sellers) {
    return <p className="text-muted-foreground">Carregando…</p>;
  }

  const mockSellers = data.sellers;
  const currentUser = data.currentUser;
  const goalProgress = data.goalProgress ?? 0;
  const achievements = data.achievements ?? [];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 via-blue-600 to-green-600 bg-clip-text text-transparent">
          Ranking de Vendedores
        </h1>
        <p className="text-muted-foreground">Competição saudável, resultados extraordinários</p>
      </div>

      <Card className="p-8 rounded-3xl border-0 shadow-lg bg-gradient-to-br from-purple-500 via-purple-600 to-blue-600 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20 border-4 border-white">
                <AvatarFallback className="bg-white text-purple-600 text-2xl font-bold">
                  {currentUser.avatar}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold mb-1">{currentUser.name}</h2>
                <p className="text-white/90">Posição #{currentUser.position} no Ranking</p>
              </div>
            </div>
            <div className="text-6xl">{currentUser.badge ?? ""}</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <p className="text-white/80 text-sm mb-1">Total Vendido</p>
              <p className="text-3xl font-bold">R$ {(currentUser.totalSales / 1000).toFixed(0)}K</p>
            </div>
            <div>
              <p className="text-white/80 text-sm mb-1">Comissão</p>
              <p className="text-3xl font-bold">R$ {(currentUser.commission / 1000).toFixed(1)}K</p>
            </div>
            <div>
              <p className="text-white/80 text-sm mb-1">Meta do Mês</p>
              <p className="text-3xl font-bold">{goalProgress.toFixed(0)}%</p>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-white/90">Progresso para próximo nível</span>
              <span className="font-medium">{goalProgress.toFixed(0)}%</span>
            </div>
            <Progress value={goalProgress} className="h-3 rounded-full bg-white/20" />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {mockSellers.slice(0, 3).map((seller, index) => {
          const colors = [
            "from-yellow-400 to-yellow-500",
            "from-gray-300 to-gray-400",
            "from-orange-400 to-orange-500",
          ];
          const heights = ["md:h-80", "md:h-64", "md:h-56"];
          const order = index === 0 ? "md:order-1" : index === 1 ? "md:order-0" : "md:order-2";

          return (
            <Card
              key={seller.id}
              className={`p-6 rounded-3xl border-0 shadow-lg ${heights[index]} ${order} flex flex-col justify-between bg-gradient-to-br ${colors[index]} text-white`}
            >
              <div className="text-center">
                <div className="text-6xl mb-4">{seller.badge}</div>
                <Avatar className="w-20 h-20 mx-auto mb-4 border-4 border-white">
                  <AvatarFallback className="bg-white text-gray-800 text-xl font-bold">
                    {seller.avatar}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-bold mb-1">{seller.name}</h3>
                <p className="text-white/90 text-sm">Posição #{seller.position}</p>
              </div>
              <div className="mt-6 space-y-2 bg-white/20 rounded-2xl p-4">
                <div className="flex justify-between">
                  <span className="text-sm">Total</span>
                  <span className="font-bold">R$ {(seller.totalSales / 1000).toFixed(0)}K</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Comissão</span>
                  <span className="font-bold">R$ {(seller.commission / 1000).toFixed(1)}K</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-6 rounded-3xl border-0 shadow-sm">
        <h3 className="text-lg font-semibold mb-6">Ranking Completo</h3>
        <div className="space-y-3">
          {mockSellers.map((seller) => (
            <div
              key={seller.id}
              className={`flex items-center gap-4 p-5 rounded-2xl transition-all ${
                seller.id === String(currentUser.id)
                  ? "bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200"
                  : "bg-gray-50 hover:bg-gray-100"
              }`}
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl ${
                  seller.position === 1
                    ? "bg-gradient-to-br from-purple-500 to-purple-600 text-white"
                    : seller.position === 2
                      ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                      : seller.position === 3
                        ? "bg-gradient-to-br from-green-500 to-green-600 text-white"
                        : "bg-gray-200 text-gray-700"
                }`}
              >
                {seller.position}
              </div>
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white font-bold">
                  {seller.avatar}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-lg">{seller.name}</h4>
                  {seller.badge && <span className="text-xl">{seller.badge}</span>}
                </div>
                <p className="text-sm text-muted-foreground">
                  R$ {(seller.totalSales / 1000).toFixed(0)}K em vendas
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">
                  R$ {(seller.commission / 1000).toFixed(1)}K
                </p>
                <p className="text-xs text-muted-foreground">em comissões</p>
              </div>
              <div className="hidden sm:block">
                {seller.position <= 3 && (
                  <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full px-4 py-2">
                    Top {seller.position}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6 rounded-3xl border-0 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Award className="w-6 h-6 text-purple-600" />
          <h3 className="text-lg font-semibold">Conquistas</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`p-6 rounded-2xl transition-all ${
                achievement.unlocked
                  ? "bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 shadow-md"
                  : "bg-gray-50 border-2 border-gray-200 opacity-70"
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="text-4xl">{achievement.icon}</div>
                {achievement.unlocked && (
                  <Badge className="bg-green-500 text-white rounded-full">
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

      <Card className="p-8 rounded-3xl border-0 shadow-sm bg-gradient-to-r from-orange-50 to-red-50 text-center">
        <Flame className="w-16 h-16 mx-auto mb-4 text-orange-600" />
        <h3 className="text-2xl font-bold mb-2">Continue firme! 🚀</h3>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Cada venda conta. Suba no ranking e desbloqueie novas conquistas.
        </p>
      </Card>
    </div>
  );
}
