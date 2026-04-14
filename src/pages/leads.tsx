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
    hot: "bg-red-100 text-red-700 border-red-200",
    warm: "bg-orange-100 text-orange-700 border-orange-200",
    cold: "bg-gray-100 text-gray-700 border-gray-200",
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
        <Button
          className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 shadow-lg shadow-purple-500/30 rounded-2xl h-12 px-6"
          onClick={() => setNewOpen(true)}
        >
          <Plus className="w-5 h-5 mr-2" />
          Novo Lead
        </Button>
      </div>

      <NewLeadDialog open={newOpen} onOpenChange={setNewOpen} onCreated={load} />

      <Card className="p-6 rounded-3xl border-0 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Buscar por nome, telefone ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 rounded-2xl border-2"
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
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 rounded-2xl border-0 shadow-sm bg-gradient-to-br from-red-50 to-orange-50">
          <p className="text-sm text-muted-foreground mb-1">Leads Quentes</p>
          <p className="text-3xl font-bold text-red-600">{counts.hot}</p>
        </Card>
        <Card className="p-4 rounded-2xl border-0 shadow-sm bg-gradient-to-br from-orange-50 to-yellow-50">
          <p className="text-sm text-muted-foreground mb-1">Leads Mornos</p>
          <p className="text-3xl font-bold text-orange-600">{counts.warm}</p>
        </Card>
        <Card className="p-4 rounded-2xl border-0 shadow-sm bg-gradient-to-br from-gray-50 to-slate-50">
          <p className="text-sm text-muted-foreground mb-1">Leads Frios</p>
          <p className="text-3xl font-bold text-gray-600">{counts.cold}</p>
        </Card>
      </div>

      {error && (
        <p className="text-red-600 text-sm">{error}</p>
      )}
      {loading && <p className="text-muted-foreground">Carregando…</p>}

      <div className="grid grid-cols-1 gap-4">
        {leads.map((lead) => (
          <Link key={lead.id} to={`/leads/${lead.id}`}>
            <Card className="p-6 rounded-3xl border-0 shadow-sm hover:shadow-lg transition-all cursor-pointer">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
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
                      Último contato: {new Date(lead.lastContact).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{lead.notes}</p>
                </div>
                <div className="flex flex-row sm:flex-col items-start sm:items-end gap-3">
                  <Badge
                    className={`rounded-full px-4 py-1 border ${statusColors[lead.status]}`}
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
                      <p className="text-lg font-bold text-purple-600">{lead.interest}%</p>
                    </div>
                    <div className="w-12 h-12 rounded-full border-4 border-purple-200 flex items-center justify-center">
                      <div
                        className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500"
                        style={{
                          background: `conic-gradient(#7c3aed ${lead.interest * 3.6}deg, #e5e7eb ${lead.interest * 3.6}deg)`,
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
        <Card className="p-12 rounded-3xl border-0 shadow-sm text-center">
          <p className="text-muted-foreground">Nenhum lead encontrado</p>
        </Card>
      )}
    </div>
  );
}
