import { Link } from "react-router";
import { ArrowLeft, Construction } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";

type Props = {
  title: string;
  description: string;
};

export function MasterSectionPlaceholder({ title, description }: Props) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button variant="ghost" className="rounded-xl -ml-2" asChild>
        <Link to="/master">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Central Master
        </Link>
      </Button>
      <Card className="rounded-2xl p-6 sm:p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
          <Construction className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-semibold sm:text-2xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">{description}</p>
        <p className="mt-4 text-xs text-muted-foreground">Módulo em construção — próxima entrega.</p>
      </Card>
    </div>
  );
}
