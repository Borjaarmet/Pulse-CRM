import Card from "./Card";
import Skeleton from "./Skeleton";
import { useRecentActivityQuery } from "@/hooks/useCrmQueries";
import type { TimelineEntry } from "@/lib/types";
import {
  CheckCircle2,
  ClipboardList,
  PencilLine,
  Trash2,
  UserPlus,
  Users2,
  Activity,
} from "lucide-react";
import { useMemo } from "react";

function resolveIcon(type: string) {
  switch (type) {
    case "task_created":
      return ClipboardList;
    case "task_completed":
      return CheckCircle2;
    case "task_updated":
      return PencilLine;
    case "task_deleted":
      return Trash2;
    case "contact_created":
      return UserPlus;
    case "contact_updated":
      return Users2;
    case "contact_deleted":
      return Trash2;
    default:
      return Activity;
  }
}

function formatRelative(dateString: string) {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  if (diffMinutes < 1) return "Justo ahora";
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `Hace ${diffDays} día${diffDays === 1 ? "" : "s"}`;
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

interface ActivityRowProps {
  entry: TimelineEntry;
}

function ActivityRow({ entry }: ActivityRowProps) {
  const Icon = resolveIcon(entry.type);
  return (
    <div className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/5 px-3 py-2">
      <span className="mt-1 rounded-full bg-white/10 p-2 text-white/70">
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex-1">
        <p className="text-sm text-card-foreground">{entry.description}</p>
        <p className="text-xs text-muted-foreground">{formatRelative(entry.created_at)}</p>
      </div>
    </div>
  );
}

export default function RecentActivityCard() {
  const { data = [], isLoading } = useRecentActivityQuery({
    refetchInterval: 20000,
  });

  const items = useMemo(() => data.slice(0, 6), [data]);

  if (isLoading) {
    return (
      <Card>
        <Skeleton className="mb-4 h-6 w-32" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-card-foreground">Actividad reciente</h2>
          <p className="text-xs text-muted-foreground">Últimas actualizaciones en tu cuenta</p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Aún no hay actividad registrada.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((entry) => (
            <ActivityRow key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </Card>
  );
}
