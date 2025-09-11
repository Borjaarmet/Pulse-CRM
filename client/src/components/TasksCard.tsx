import Card from "@/components/Card";
import TaskQuickAdd from "@/components/TaskQuickAdd";
import TaskList from "@/components/TaskList";
import Skeleton from "@/components/Skeleton";
import type { Task } from "@/lib/types";

interface TasksCardProps {
  tasks: Task[];
  isLoading: boolean;
}

export default function TasksCard({ tasks, isLoading }: TasksCardProps) {
  const activeTasks = tasks.filter(task => task.state !== 'Done');

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <i className="fas fa-tasks text-primary"></i>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">Mis próximas tareas</h2>
            <p className="text-sm text-muted-foreground">Gestiona tu agenda</p>
          </div>
        </div>
        {isLoading ? (
          <Skeleton className="h-6 w-16" />
        ) : (
          <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-md">
            {activeTasks.length} activas
          </span>
        )}
      </div>
      
      <TaskQuickAdd />
      
      {isLoading ? (
        <div className="space-y-3 mt-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <TaskList tasks={tasks} />
      )}
    </Card>
  );
}
