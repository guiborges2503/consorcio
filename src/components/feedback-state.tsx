import { AlertCircle, Loader2 } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";

type FeedbackStateProps = {
  type: "loading" | "error" | "empty";
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function FeedbackState({
  type,
  title,
  description,
  actionLabel,
  onAction,
}: FeedbackStateProps) {
  const isError = type === "error";
  return (
    <Card
      className="p-8 rounded-3xl border-0 shadow-sm text-center"
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
    >
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        {type === "loading" ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <AlertCircle className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <p className="font-medium">{title}</p>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      {actionLabel && onAction ? (
        <Button className="mt-4 rounded-2xl" variant="outline" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </Card>
  );
}
