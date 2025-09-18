import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { markTaskDone, updateTask, deleteTask } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";
import type { Task } from "@/lib/types";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit2, Trash2 } from "lucide-react";

interface TaskListProps {
  tasks: Task[];
}

export default function TaskList({ tasks }: TaskListProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    due_at: "",
    state: "To Do" as Task["state"],
    priority: "Media" as Task["priority"],
  });

  const markDoneMutation = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      markTaskDone(id, done ? "Done" : "To Do"),
    onSuccess: (_, { done }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
      toast({
        title: done ? "Tarea completada" : "Tarea reactivada",
        description: done ? "Buen trabajo" : "La tarea vuelve a tu lista",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la tarea",
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Task> }) =>
      updateTask(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
      setIsEditModalOpen(false);
      setEditingTask(null);
      toast({
        title: "Tarea actualizada",
        description: "Los cambios se guardaron correctamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la tarea",
        variant: "destructive",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
      setTaskToDelete(null);
      toast({
        title: "Tarea eliminada",
        description: "La tarea se eliminó correctamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la tarea",
        variant: "destructive",
      });
    },
  });

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Alta":
        return "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400";
      case "Media":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400";
      case "Baja":
        return "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setEditForm({
      title: task.title,
      due_at: task.due_at ? task.due_at.slice(0, 16) : "",
      state: task.state,
      priority: task.priority,
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingTask) return;

    updateTaskMutation.mutate({
      id: editingTask.id,
      patch: {
        title: editForm.title.trim() || editingTask.title,
        due_at: editForm.due_at ? new Date(editForm.due_at).toISOString() : undefined,
        state: editForm.state,
        priority: editForm.priority,
      },
    });
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <i className="fas fa-tasks text-2xl mb-2"></i>
        <p>No hay tareas registradas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-6">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="flex items-center space-x-3 p-3 bg-muted/20 rounded-xl hover:bg-muted/40 transition-all"
        >
          <input
            type="checkbox"
            checked={task.state === "Done"}
            onChange={(e) => markDoneMutation.mutate({ id: task.id, done: e.target.checked })}
            className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-ring focus:ring-2"
          />
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm font-medium truncate ${
                task.state === "Done" ? "line-through text-muted-foreground" : "text-card-foreground"
              }`}
            >
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
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => openEditModal(task)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => setTaskToDelete(task)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}

      <Dialog
        open={isEditModalOpen}
        onOpenChange={(open) => {
          setIsEditModalOpen(open);
          if (!open) {
            setEditingTask(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar tarea</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-card-foreground block mb-2">Título</label>
                <Input
                  name="title"
                  value={editForm.title}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-card-foreground block mb-2">Fecha límite</label>
                <Input
                  type="datetime-local"
                  name="due_at"
                  value={editForm.due_at}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, due_at: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-card-foreground block mb-2">Estado</label>
                  <Select
                    name="state"
                    value={editForm.state}
                    onValueChange={(value: Task["state"]) =>
                      setEditForm((prev) => ({ ...prev, state: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="To Do">To Do</SelectItem>
                      <SelectItem value="Doing">Doing</SelectItem>
                      <SelectItem value="Waiting">Waiting</SelectItem>
                      <SelectItem value="Done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-card-foreground block mb-2">Prioridad</label>
                  <Select
                    name="priority"
                    value={editForm.priority}
                    onValueChange={(value: Task["priority"]) =>
                      setEditForm((prev) => ({ ...prev, priority: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Baja">Baja</SelectItem>
                      <SelectItem value="Media">Media</SelectItem>
                      <SelectItem value="Alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateTaskMutation.isPending}>
                  {updateTaskMutation.isPending ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!taskToDelete} onOpenChange={() => setTaskToDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar tarea</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Seguro que quieres eliminar la tarea "{taskToDelete?.title}"?
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setTaskToDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => taskToDelete && deleteTaskMutation.mutate(taskToDelete.id)}
              disabled={deleteTaskMutation.isPending}
            >
              {deleteTaskMutation.isPending ? "Eliminando..." : "Eliminar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
