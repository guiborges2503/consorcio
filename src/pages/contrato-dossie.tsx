import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { ArrowLeft, FileDown, Gavel, Printer, Receipt } from "lucide-react";
import { Button } from "../components/ui/button";
import { ContratoDossieDocument } from "../components/contrato-dossie-document";
import { RegistrarLanceDialog } from "../components/registrar-lance-dialog";
import { FeedbackState } from "../components/feedback-state";
import { PageSkeleton } from "../components/page-skeleton";
import { apiGet } from "../lib/api";
import { toast } from "sonner";
import type { Sale } from "../types/domain";

export function ContratoDossie() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const recémCriado = searchParams.get("novo") === "1";

  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [lanceDialogOpen, setLanceDialogOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      setMissing(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const r = await apiGet<{ sale?: Sale }>(`/sales.php?id=${encodeURIComponent(id)}`);
      if (r.sale) {
        setSale(r.sale);
        setMissing(false);
      } else {
        setSale(null);
        setMissing(true);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar contrato");
      setSale(null);
      setMissing(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  function imprimir() {
    window.print();
  }

  if (loading) return <PageSkeleton statCards={0} rows={6} />;

  if (missing || !sale) {
    return (
      <FeedbackState
        type="empty"
        title="Contrato não encontrado"
        description="Não foi possível montar o dossiê deste contrato."
        actionLabel="Voltar para contratos"
        onAction={() => navigate("/contratos")}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="dossie-print-hide flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Button asChild variant="ghost" size="sm" className="rounded-xl -ml-2 h-9 px-2">
            <Link to="/contratos">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Contratos
            </Link>
          </Button>
          {recémCriado && (
            <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
              Contrato cadastrado. Revise o dossiê e imprima ou salve em PDF.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {!sale.lanceOfertado && (
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-amber-200 bg-amber-50/80 text-amber-950 hover:bg-amber-100 hover:text-amber-950"
              onClick={() => setLanceDialogOpen(true)}
            >
              <Gavel className="mr-2 h-4 w-4" />
              Registrar lance
            </Button>
          )}
          <Button asChild variant="outline" className="rounded-xl">
            <Link to={`/parcelas?sale_id=${sale.id}`}>
              <Receipt className="mr-2 h-4 w-4" />
              Parcelas
            </Link>
          </Button>
          <Button type="button" variant="outline" className="rounded-xl" onClick={imprimir}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
          <Button type="button" className="rounded-xl" onClick={imprimir}>
            <FileDown className="mr-2 h-4 w-4" />
            Salvar PDF
          </Button>
        </div>
      </div>

      <ContratoDossieDocument sale={sale} />

      <RegistrarLanceDialog
        open={lanceDialogOpen}
        onOpenChange={setLanceDialogOpen}
        sale={sale}
        onSuccess={load}
      />

      <p className="dossie-print-hide text-center text-xs text-muted-foreground">
        Use <strong>Imprimir</strong> ou <strong>Salvar PDF</strong> e escolha &quot;Salvar como PDF&quot; na
        janela do navegador.
      </p>
    </div>
  );
}
