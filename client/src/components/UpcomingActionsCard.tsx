import Card from "@/components/Card";
import { Button } from "@/components/ui/button";
import type { Deal, Task } from "@/lib/types";
import { computeDealAttention } from "@/lib/pipelineInsights";

interface UpcomingActionsCardProps {
  deals: Deal[];
  tasks: Task[];
  isDealsLoading?: boolean;
  isTasksLoading?: boolean;
  onViewPipeline?: (dealId?: string) => void;
}

function translateRecommendation(priority: string, risk: string, inactivity: number) {
  if (risk === "Alto") return "Contacta hoy y actualiza el próximo paso.";
  if (priority === "Hot") return "Prepara propuesta o cierre en las próximas 24h.";
  if (inactivity >= 7) return "Reengancha con follow-up o agenda reunión.";
  return "Revisa objeciones y confirma próximos pasos.";
}

function formatRelativeDate(iso?: string) {
  if (!iso) return "Sin registrar";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Sin registrar";
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  });
}

export default function UpcomingActionsCard({
  deals,
  tasks,
  isDealsLoading,
  isTasksLoading,
  onViewPipeline,
}: UpcomingActionsCardProps) {
  const attention = computeDealAttention(deals);

  const urgentDeals = attention
    .slice(0, 3)
    .map(({ deal, risk, priority, inactivity, score, reasons }) => ({
      deal,
      risk,
      priority,
      inactivity,
      score,
      reasons,
      recommendation: translateRecommendation(priority, risk, inactivity),
    }));

  const pendingTasks = tasks
    .filter((task) => task.state !== "Done")
    .filter((task) => (task.due_at ? new Date(task.due_at).getTime() < Date.now() + 48 * 60 * 60 * 1000 : true))
    .slice(0, 3)
    .map((task) => {
      let reason = "Requiere confirmación";
      if (task.due_at) {
        const dueDate = new Date(task.due_at).getTime();
        if (Number.isFinite(dueDate)) {
          const diffHours = Math.floor((dueDate - Date.now()) / (1000 * 60 * 60));
          if (diffHours < 0) {
            reason = "Vencida - resolver hoy";
          } else if (diffHours <= 12) {
            reason = "Vence en las próximas 12h";
          } else if (diffHours <= 24) {
            reason = "Cierra en menos de 24h";
          } else {
            reason = "Due pronto";
          }
        }
      }
      return {
        task,
        reason,
      };
    });

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-card-foreground">Agenda priorizada</h2>
          <p className="text-xs text-muted-foreground">La IA destaca los deals y tareas que requieren tu atención hoy.</p>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-card-foreground">Deals que no pueden esperar</h3>
            <span className="text-xs text-muted-foreground">{isDealsLoading ? "Analizando…" : `${urgentDeals.length} recomendación${urgentDeals.length === 1 ? "" : "es"}`}</span>
          </div>
              {isDealsLoading ? (
                <p className="text-xs text-muted-foreground">Analizando pipeline…</p>
              ) : urgentDeals.length === 0 ? (
                <p className="text-xs text-muted-foreground">Tu pipeline está bajo control, sin urgencias destacadas.</p>
              ) : (
                <ul className="space-y-3">
                  {urgentDeals.map(({ deal, risk, inactivity, recommendation, priority, score, reasons }) => (
                    <li
                      key={deal.id}
                      className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-muted-foreground"
                    >
                      <div className="flex items-center justify-between text-sm text-card-foreground">
                        <span className="font-semibold">{deal.title}</span>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold ${risk === "Alto" ? "bg-red-500/20 text-red-200" : risk === "Medio" ? "bg-amber-500/20 text-amber-200" : "bg-emerald-500/20 text-emerald-200"}`}>
                            Riesgo {risk}
                          </span>
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold ${priority === "Hot" ? "bg-red-500/20 text-red-200" : priority === "Warm" ? "bg-amber-500/20 text-amber-200" : "bg-blue-500/20 text-blue-200"}`}>
                            {priority}
                          </span>
                        </div>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Última actividad: {inactivity ?? 0} día{inactivity === 1 ? "" : "s"} · Score {score}
                      </p>
                      {reasons.length > 0 && (
                        <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground/90">
                          {reasons.map((reason, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-300" />
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className="mt-2 text-xs text-blue-200">IA propone: {recommendation}</p>
                      <div className="mt-2 text-[11px] text-muted-foreground">
                        Próximo paso: {deal.next_step || "Sin definir"}
                      </div>
                      <div className="mt-3 flex justify-end text-[11px]">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px] text-blue-200 hover:text-blue-100"
                          onClick={() => onViewPipeline?.(deal.id)}
                        >
                          Abrir en pipeline
                        </Button>
                      </div>
                    </li>
                  ))}
            </ul>
          )}
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-card-foreground">Acciones del día</h3>
            <span className="text-xs text-muted-foreground">{isTasksLoading ? "…" : `${pendingTasks.length} tarea${pendingTasks.length === 1 ? "" : "s"}`}</span>
          </div>
          {isTasksLoading ? (
            <p className="text-xs text-muted-foreground">Cargando tareas…</p>
          ) : pendingTasks.length === 0 ? (
            <p className="text-xs text-muted-foreground">Tu agenda está despejada. Aprovecha para nutrir contactos fríos.</p>
          ) : (
            <ul className="space-y-2 text-xs text-muted-foreground">
              {pendingTasks.map(({ task, reason }) => (
                <li key={task.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between text-sm text-card-foreground">
                    <span className="font-semibold">{task.title}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {task.due_at ? formatRelativeDate(task.due_at) : "Sin fecha"}
                    </span>
                  </div>
                  {task.description && (
                    <p className="mt-1 text-[11px] text-muted-foreground">{task.description}</p>
                  )}
                  <p className="mt-1 text-[11px] text-blue-200">IA destaca: {reason}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-card-foreground"
          onClick={() => onViewPipeline?.(urgentDeals[0]?.deal.id)}
        >
          Ver todo el pipeline →
        </Button>
      </div>
    </Card>
  );
}
