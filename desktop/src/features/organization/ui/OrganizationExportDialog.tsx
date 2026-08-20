import { Download, ShieldCheck } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { exportSafeOrganizationSnapshot } from "@/features/organization/organizationFacts";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";

function formatObservedAt(value: string | undefined): string {
  if (!value) return "Waiting for safe facts";
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(timestamp)
    : value;
}

export function OrganizationExportDialog({
  observedAt,
  onOpenChange,
  open,
  sourceRevision,
}: {
  observedAt?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  sourceRevision?: string;
}) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [savedDestination, setSavedDestination] = React.useState<string | null>(
    null,
  );

  React.useEffect(() => {
    if (!open) {
      setError(null);
      setSavedDestination(null);
    }
  }, [open]);

  async function saveSnapshot() {
    setIsSaving(true);
    setError(null);
    setSavedDestination(null);
    try {
      const result = await exportSafeOrganizationSnapshot();
      if (!result.saved) return;
      const destination = result.destination ?? "the selected file";
      setSavedDestination(destination);
      toast.success("Safe organization snapshot exported");
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : typeof cause === "string"
            ? cause
            : "Could not export the safe organization snapshot.";
      setError(message);
      toast.error("Safe organization export failed");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="organization-export-dialog"
        className="max-w-xl"
      >
        <DialogHeader>
          <div className="mb-2 flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <Badge variant="outline">Secret-free organization snapshot</Badge>
          </div>
          <DialogTitle>Export safe organization snapshot</DialogTitle>
          <DialogDescription>
            Save the current read-only Buzz organization facts as a JSON file at
            a location you choose. Buzz does not upload or publish this file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <section className="rounded-xl border border-border/70 bg-muted/20 p-3">
            <h3 className="font-medium">Included</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Managed-agent identities and runtime metadata, Agent team names
              and descriptions, and channel metadata. Private channel names,
              topics, membership public keys, and activity times may appear.
            </p>
          </section>
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Treat this file as organization-sensitive. Buzz writes it only to
            the location you select, which your operating system or another app
            may synchronize or share.
          </p>
          <section className="rounded-xl border border-border/70 bg-muted/20 p-3">
            <h3 className="font-medium">Always excluded</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Keys and auth tags, prompts and environment variables, commands
              and paths, logs and raw errors, private messages, and Agent Tower
              policy or knowledge.
            </p>
          </section>
          <dl className="grid gap-2 text-xs sm:grid-cols-2">
            <div className="rounded-lg border border-border/60 p-3">
              <dt className="text-muted-foreground">Source revision</dt>
              <dd className="mt-1 truncate font-mono" title={sourceRevision}>
                {sourceRevision ?? "Unavailable"}
              </dd>
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <dt className="text-muted-foreground">Observed</dt>
              <dd className="mt-1">{formatObservedAt(observedAt)}</dd>
            </div>
          </dl>
          {savedDestination ? (
            <div
              className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs"
              data-testid="organization-export-success"
              role="status"
            >
              Saved to{" "}
              <span className="break-all font-medium">{savedDestination}</span>
            </div>
          ) : null}
          {error ? (
            <div
              className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive"
              data-testid="organization-export-error"
              role="alert"
            >
              {error}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            disabled={isSaving}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Close
          </Button>
          <Button
            data-testid="organization-export-confirm"
            disabled={isSaving || !sourceRevision || !observedAt}
            onClick={() => void saveSnapshot()}
            type="button"
          >
            <Download className="h-4 w-4" />
            {isSaving ? "Choosing destination…" : "Choose destination…"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
