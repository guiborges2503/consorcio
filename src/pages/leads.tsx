import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { Search, Plus, Phone, Mail, Calendar } from "lucide-react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import type { Lead } from "../types/domain";
import { apiGet } from "../lib/api";
import { NewLeadDialog } from "../components/new-lead-dialog";
import { FeedbackState } from "../components/feedback-state";
import { formatDate } from "../lib/format";
import { PageSkeleton } from "../components/page-skeleton";

export function Leads() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "hot" | "warm" | "cold">("all");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [counts, setCounts] = useState({ hot: 0, warm: 0, cold: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newOpen, setNewOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams();
      if (searchTerm.trim()) q.set("q", searchTerm.trim());
      if (statusFilter !== "all") q.set("status", statusFilter);
      const path = `/leads.php${q.toString() ? `?${q}` : ""}`;
      const r = await apiGet<{ success?: boolean; leads?: Lead[]; counts?: typeof counts }>(path);
      setLeads(r.leads ?? []);
      if (r.counts) setCounts(r.counts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar leads");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 300);
    return () => window.clearTimeout(t);
  }, [load]);

  const statusColors = {
    hot: "border border-red-200/80 bg-red-50 text-red-900",
    warm: "border border-amber-200/80 bg-amber-50 text-amber-950",
    cold: "border border-border bg-muted text-muted-foreground",
  };

  const statusLabels = {
    hot: "🔥 Quente",
    warm: "🌡️ Morno",
    cold: "❄️ Frio",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Leads</h1>
          <p className="text-muted-foreground">Gerencie seus clientes potenciais</p>
        </div>
        <Button className="h-12 rounded-xl px-6" onClick={() => setNewOpen(true)}>
          <Plus className="w-5 h-5 mr-2" />
          Novo Lead
        </Button>
      </div>

      <NewLeadDialog open={newOpen} onOpenChange={setNewOpen} onCreated={load} />

      <Card className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Buscar por nome, telefone ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 rounded-2xl border-2"
              aria-label="Buscar leads por nome, telefone ou e-mail"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              onClick={() => setStatusFilter("all")}
              className="rounded-2xl"
            >
              Todos
            </Button>
            <Button
              variant={statusFilter === "hot" ? "default" : "outline"}
              onClick={() => setStatusFilter("hot")}
              className="rounded-2xl"
            >
              🔥 Quente
            </Button>
            <Button
              variant={statusFilter === "warm" ? "default" : "outline"}
              onClick={() => setStatusFilter("warm")}
              className="rounded-2xl"
            >
              🌡️ Morno
            </Button>
            <Button
              variant={statusFilter === "cold" ? "default" : "outline"}
              onClick={() => setStatusFilter("cold")}
              className="rounded-2xl"
            >
              ❄️ Frio
            </Button>
            {(searchTerm || statusFilter !== "all") && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                }}
                className="rounded-2xl"
              >
                Limpar filtros
              </Button>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-2xl border border-red-100 bg-red-50/50 p-4 shadow-sm">
          <p className="mb-1 text-sm text-muted-foreground">Leads quentes</p>
          <p className="text-3xl font-semibold tabular-nums text-red-800/90">{counts.hot}</p>
        </Card>
        <Card className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 shadow-sm">
          <p className="mb-1 text-sm text-muted-foreground">Leads mornos</p>
          <p className="text-3xl font-semibold tabular-nums text-amber-900/90">{counts.warm}</p>
        </Card>
        <Card className="rounded-2xl border border-border/80 bg-muted/30 p-4 shadow-sm">
          <p className="mb-1 text-sm text-muted-foreground">Leads frios</p>
          <p className="text-3xl font-semibold tabular-nums text-slate-700">{counts.cold}</p>
        </Card>
      </div>

      {error && (
        <FeedbackState
          type="error"
          title="Não foi possível carregar os leads"
          description={error}
          actionLabel="Tentar novamente"
          onAction={() => void load()}
        />
      )}
      {loading && (
        <PageSkeleton statCards={3} rows={5} />
      )}

      <div className="grid grid-cols-1 gap-4">
        {leads.map((lead) => (
          <Link key={lead.id} to={`/leads/${lead.id}`}>
            <Card className="cursor-pointer rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted font-bold text-lg text-foreground">
                      {lead.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .substring(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{lead.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        {lead.phone}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      {lead.email}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      Último contato: {formatDate(lead.lastContact)}
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{lead.notes}</p>
                </div>
                <div className="flex flex-row sm:flex-col items-start sm:items-end gap-3">
                  <Badge
                    className={`rounded-full px-4 py-1 font-normal ${statusColors[lead.status]}`}
                  >
                    {statusLabels[lead.status]}
                  </Badge>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-1">Próxima ação:</p>
                    <p className="text-sm font-medium">{lead.nextAction}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Interesse</p>
                      <p className="text-lg font-semibold tabular-nums text-foreground">
                        {lead.interest}%
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-slate-200">
                      <div
                        className="h-10 w-10 rounded-full"
                        style={{
                          background: `conic-gradient(#64748b ${lead.interest * 3.6}deg, #e2e8f0 ${lead.interest * 3.6}deg)`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {!loading && leads.length === 0 && (
        <FeedbackState
          type="empty"
          title="Nenhum lead encontrado"
          description="Tente ajustar os filtros ou cadastre um novo lead."
          actionLabel="Recarregar"
          onAction={() => void load()}
        />
      )}
    </div>
  );
}
