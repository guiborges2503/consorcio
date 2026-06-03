import { FileText, Gavel, Receipt } from "lucide-react";
import { Link } from "react-router";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";

type ContratoCardActionsProps = {
  saleId: string;
  showRegistrarLance?: boolean;
  onRegistrarLance?: () => void;
  className?: string;
};

export function ContratoCardActions({
  saleId,
  showRegistrarLance,
  onRegistrarLance,
  className,
}: ContratoCardActionsProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border-t border-border/60 pt-4 lg:justify-end",
        className,
      )}
    >
      <Button asChild variant="outline" size="sm" className="rounded-xl h-9 gap-2 bg-white">
        <Link to={`/contratos/${saleId}/dossie`}>
          <FileText className="h-4 w-4" />
          Dossiê
        </Link>
      </Button>
      <Button asChild variant="outline" size="sm" className="rounded-xl h-9 gap-2 bg-white">
        <Link to={`/parcelas?sale_id=${saleId}`}>
          <Receipt className="h-4 w-4" />
          Parcelas
        </Link>
      </Button>
      {showRegistrarLance && onRegistrarLance && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl h-9 gap-2 border-amber-200 bg-amber-50/80 text-amber-950 hover:bg-amber-100 hover:text-amber-950"
          onClick={onRegistrarLance}
        >
          <Gavel className="h-4 w-4" />
          Registrar lance
        </Button>
      )}
    </div>
  );
}
