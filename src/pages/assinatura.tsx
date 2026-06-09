import { Navigate } from "react-router";
import { Receipt } from "lucide-react";
import { AssinaturaFaturas } from "../components/assinatura-faturas";
import { useAuth } from "../contexts/auth-context";
import { isMaster } from "../lib/auth-roles";

export function Assinatura() {
  const { user } = useAuth();

  if (isMaster(user?.role)) {
    return <Navigate to="/master/faturas" replace />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="mb-2 flex items-center gap-2 text-3xl font-bold">
          <Receipt className="h-8 w-8" />
          Faturas
        </h1>
        <p className="text-muted-foreground">
          Assinatura da plataforma, faturas em aberto, próximo vencimento e histórico de pagamentos.
        </p>
      </div>

      <AssinaturaFaturas role={user?.role} />
    </div>
  );
}
