import { useNavigate, useSearchParams, Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/button";
import { NewSaleForm } from "../components/new-sale-form";

export function NewContract() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get("lead_id") ?? undefined;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start gap-4">
        <Link to={leadId ? `/leads/${leadId}` : "/contratos"}>
          <Button variant="outline" size="icon" className="rounded-xl shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Novo Contrato</h1>
          <p className="text-muted-foreground mt-1">
            Preencha os dados do contrato e do cliente para registrar
          </p>
        </div>
      </div>

      <NewSaleForm
        leadId={leadId}
        onSuccess={() => navigate("/contratos", { replace: true })}
        onCancel={() => navigate(-1)}
      />
    </div>
  );
}
