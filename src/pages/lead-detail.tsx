import { useParams, Link } from "react-router";
import {
  ArrowLeft,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  CheckCircle,
  TrendingUp,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import type { Lead, Interaction } from "../types/domain";
import { NewSaleDialog } from "../components/new-sale-dialog";
import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "../lib/api";
import { toast } from "sonner";

const interactionIcons = {
  call: Phone,
  whatsapp: MessageSquare,
  email: Mail,
  meeting: Calendar,
};

const typeLabel: Record<Interaction["type"], string> = {
  call: "Ligação",
  whatsapp: "WhatsApp",
  email: "E-mail",
  meeting: "Reunião",
};

export function LeadDetail() {
  const { id } = useParams();
  const [lead, setLead] = useState<Lead | null>(null);
  const [missing, setMissing] = useState(false);
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const r = await apiGet<{ success?: boolean; lead?: Lead }>(`/lead.php?id=${encodeURIComponent(id)}`);
      if (r.lead) {
        setLead(r.lead);
        setMissing(false);
      } else {
        setLead(null);
        setMissing(true);
      }
    } catch {
      setLead(null);
      setMissing(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addInteraction(type: Interaction["type"], notes: string) {
    if (!id) return;
    try {
      await apiPost("/lead_interaction.php", { leadId: id, type, notes });
      toast.success("Registrado");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  }

  async function completeNextAction() {
    if (!id) return;
    try {
      await apiPost("/lead_interaction.php", {
        leadId: id,
        type: "meeting",
        notes: "Próxima ação concluída",
        clearNextAction: true,
      });
      toast.success("Atualizado");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">Carregando…</p>;
  }

  if (missing) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Lead não encontrado</p>
        <Link to="/leads">
          <Button className="mt-4 rounded-2xl">Voltar para Leads</Button>
        </Link>
      </div>
    );
  }

  if (!lead) {
    return null;
  }

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
      <div>
        <Link to="/leads">
          <Button variant="ghost" className="mb-4 rounded-2xl">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-2xl">
              {lead.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .substring(0, 2)}
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-1">{lead.name}</h1>
              <Badge
                className={`rounded-full px-4 py-1 border ${statusColors[lead.status]}`}
              >
                {statusLabels[lead.status]}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 shadow-lg shadow-purple-500/30 rounded-2xl"
              onClick={() => setSaleDialogOpen(true)}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Converter em Venda
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 rounded-3xl border-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
              <Phone className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Telefone</p>
              <p className="font-medium">{lead.phone}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 rounded-3xl border-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center">
              <Mail className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{lead.email}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 rounded-3xl border-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cliente desde</p>
              <p className="font-medium">{new Date(lead.createdAt).toLocaleDateString("pt-BR")}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 rounded-3xl border-0 shadow-sm bg-gradient-to-br from-purple-50 to-blue-50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Nível de Interesse</h3>
                  <p className="text-sm text-muted-foreground">Probabilidade de conversão</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold text-purple-600">{lead.interest}%</p>
              </div>
            </div>
            <Progress value={lead.interest} className="h-4 rounded-full" />
          </Card>

          <Card className="p-6 rounded-3xl border-0 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Informações do Lead</h3>
            <p className="text-muted-foreground">{lead.notes}</p>
          </Card>

          <Card className="p-6 rounded-3xl border-0 shadow-sm">
            <h3 className="text-lg font-semibold mb-6">Histórico de Interações</h3>
            <div className="space-y-6">
              {lead.interactions.map((interaction, index) => {
                const Icon = interactionIcons[interaction.type];
                const isLast = index === lead.interactions.length - 1;
                return (
                  <div key={interaction.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      {!isLast && <div className="w-0.5 h-full bg-gray-200 mt-2" />}
                    </div>
                    <div className="flex-1 pb-6">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-medium">{typeLabel[interaction.type]}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(interaction.date).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <p className="text-muted-foreground">{interaction.notes}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6 rounded-3xl border-0 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Ações Rápidas</h3>
            <div className="space-y-3">
              <Button
                type="button"
                className="w-full rounded-2xl h-12 bg-blue-600 hover:bg-blue-700"
                onClick={() => void addInteraction("call", "Ligação registrada")}
              >
                <Phone className="w-4 h-4 mr-2" />
                Registrar Ligação
              </Button>
              <Button
                type="button"
                className="w-full rounded-2xl h-12 bg-green-600 hover:bg-green-700"
                onClick={() => void addInteraction("whatsapp", "Contato via WhatsApp")}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Enviar WhatsApp
              </Button>
              <Button
                type="button"
                className="w-full rounded-2xl h-12 bg-purple-600 hover:bg-purple-700"
                onClick={() => void addInteraction("email", "E-mail enviado")}
              >
                <Mail className="w-4 h-4 mr-2" />
                Enviar Email
              </Button>
              <Button
                type="button"
                className="w-full rounded-2xl h-12 bg-orange-600 hover:bg-orange-700"
                onClick={() => void addInteraction("meeting", "Reunião agendada/realizada")}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Agendar Reunião
              </Button>
            </div>
          </Card>

          <Card className="p-6 rounded-3xl border-0 shadow-sm bg-gradient-to-br from-yellow-50 to-orange-50">
            <h3 className="text-lg font-semibold mb-2">Próxima Ação</h3>
            <p className="text-muted-foreground mb-4">{lead.nextAction || "—"}</p>
            <Button
              type="button"
              className="w-full rounded-2xl h-12 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600"
              onClick={() => void completeNextAction()}
            >
              Marcar como Concluído
            </Button>
          </Card>

          <Card className="p-6 rounded-3xl border-0 shadow-sm">
            <h3 className="text-lg font-semibold mb-2">Último Contato</h3>
            <p className="text-2xl font-bold text-purple-600">
              {new Date(lead.lastContact).toLocaleDateString("pt-BR")}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Há{" "}
              {Math.floor(
                (new Date().getTime() - new Date(lead.lastContact).getTime()) / (1000 * 60 * 60 * 24)
              )}{" "}
              dias
            </p>
          </Card>
        </div>
      </div>
      <NewSaleDialog
        open={saleDialogOpen}
        onOpenChange={setSaleDialogOpen}
        leadId={id}
        onSaved={load}
      />
    </div>
  );
}
