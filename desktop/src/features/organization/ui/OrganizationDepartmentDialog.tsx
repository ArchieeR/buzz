import {
  Bot,
  CalendarClock,
  Link2,
  Network,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";

import {
  getDepartmentSeats,
  type OrganizationDepartment,
} from "@/features/organization/organizationModel";
import { Badge } from "@/shared/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";

export function OrganizationDepartmentDialog({
  department,
  onOpenChange,
}: {
  department: OrganizationDepartment | null;
  onOpenChange: (open: boolean) => void;
}) {
  const seats = department ? getDepartmentSeats(department) : [];

  return (
    <Dialog open={department !== null} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[calc(100vh-3rem)] max-w-5xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden p-0"
        closeButtonClassName="h-11 w-11"
        style={{ backgroundColor: "hsl(var(--background))" }}
      >
        {department ? (
          <>
            <DialogHeader
              className="border-b border-border/70 px-6 py-5 pr-16"
              style={{
                background: `linear-gradient(120deg, ${department.accent}1f, transparent 58%)`,
              }}
            >
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: department.accent }}
                />
                {department.floor} · {department.room}
              </div>
              <DialogTitle className="text-2xl">{department.name}</DialogTitle>
              <DialogDescription>{department.description}</DialogDescription>
            </DialogHeader>

            <div className="grid min-h-0 gap-4 overflow-y-auto p-6 lg:grid-cols-12">
              <section className="space-y-3 lg:col-span-12">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">Team seats</h3>
                    <p className="text-xs text-muted-foreground">
                      One manager and up to four staff members
                    </p>
                  </div>
                  <Badge variant="secondary">
                    0 / {department.capacity} assigned
                  </Badge>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                  {seats.map((seat) => (
                    <article
                      className="min-h-28 rounded-xl border border-border/70 bg-muted/20 p-3"
                      key={seat.id}
                      style={{
                        borderTopColor: department.accent,
                        borderTopWidth: seat.kind === "manager" ? 3 : 1,
                      }}
                    >
                      <span
                        className="mb-3 grid h-9 w-9 place-items-center rounded-lg border"
                        style={{
                          backgroundColor: `${department.accent}1f`,
                          borderColor: `${department.accent}66`,
                          color: department.accent,
                        }}
                      >
                        <Bot className="h-4 w-4" />
                      </span>
                      <p className="text-sm font-medium leading-tight">
                        {seat.role}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {seat.kind === "manager" ? "Manager seat" : "Open role"}
                      </p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-border/70 bg-card/60 p-4 lg:col-span-7">
                <div className="mb-4 flex items-start gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Wrench className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">Capabilities</h3>
                    <p className="text-xs text-muted-foreground">
                      Effective tools remain permission-scoped and
                      evidence-backed
                    </p>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {department.capabilities.map((capability, index) => {
                    const Icon = [
                      Sparkles,
                      CalendarClock,
                      Network,
                      ShieldCheck,
                    ][index % 4];
                    return (
                      <div
                        className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/50 px-3 py-2.5"
                        key={capability}
                      >
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{capability}</span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          planned
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>

              <aside className="rounded-xl border border-border/70 bg-card/60 p-4 lg:col-span-5">
                <div className="mb-4 flex items-start gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Link2 className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">Buzz relationship</h3>
                    <p className="text-xs text-muted-foreground">
                      Messaging teams and organization units stay distinct
                    </p>
                  </div>
                </div>
                <dl className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-3">
                    <dt className="text-muted-foreground">Target</dt>
                    <dd>{department.buzzMapping}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-3">
                    <dt className="text-muted-foreground">Mapping</dt>
                    <dd>Pending</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-3">
                    <dt className="text-muted-foreground">Writes</dt>
                    <dd>Owner reviewed</dd>
                  </div>
                </dl>
              </aside>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
