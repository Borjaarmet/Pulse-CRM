import { useMutation, useQueryClient } from "@tanstack/react-query";
import { markTaskDone } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";
import type { Task } from "@/lib/types";

interface TaskListProps {
  tasks: Task[];
}

export default function TaskList({ tasks }: TaskListProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const markDoneMutation = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => 
      markTaskDone(id, done ? 'Done' : 'To Do'),
    onSuccess: (_, { done }) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: done ? "Task completed" : "Task reopened",
        description: done ? "Great job!" : "Task marked as active",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    },
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (taskDate.getTime() === today.getTime()) {
      return `Hoy, ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (taskDate.getTime() === today.getTime() + 24 * 60 * 60 * 1000) {
      return `Mañana, ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('es-ES', { 
        weekday: 'long', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Alta':
        return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
      case 'Media':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400';
      case 'Baja':
        return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <i className="fas fa-tasks text-2xl mb-2"></i>
        <p>No tasks found. Add your first task above!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-6">
      {tasks.map((task) => (
        <div 
          key={task.id} 
          className="flex items-center space-x-3 p-3 bg-muted/20 rounded-xl hover:bg-muted/40 transition-all"
          data-testid={`task-${task.id}`}
        >
          <input 
            type="checkbox" 
            checked={task.state === 'Done'}
            onChange={(e) => markDoneMutation.mutate({ id: task.id, done: e.target.checked })}
            className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-ring focus:ring-2"
            data-testid={`checkbox-task-${task.id}`}
          />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${
              task.state === 'Done' ? 'line-through text-muted-foreground' : 'text-card-foreground'
            }`}>
              {task.title}
            </p>
            <div className="flex items-center space-x-4 mt-1">
              {task.due_at && (
                <span className="text-xs text-muted-foreground flex items-center">
                  <i className="far fa-clock mr-1"></i>
                  {formatDate(task.due_at)}
                </span>
              )}
              <span className={`px-2 py-0.5 text-xs font-medium rounded ${getPriorityColor(task.priority)}`}>
                {task.priority}
              </span>
            </div>
          </div>
          <button className="p-2 text-muted-foreground hover:text-foreground transition-all">
            <i className="fas fa-ellipsis-v text-xs"></i>
          </button>
        </div>
      ))}
    </div>
  );
}
