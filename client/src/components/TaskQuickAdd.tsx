import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addTask } from "@/lib/db";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { useToast } from "@/hooks/use-toast";

export default function TaskQuickAdd() {
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const addTaskMutation = useMutation({
    mutationFn: addTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
      setTitle("");
      setDueAt("");
      toast({
        title: "Task added",
        description: "Your task has been created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add task",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addTaskMutation.mutate({
      title: title.trim(),
      due_at: dueAt || undefined,
      state: 'To Do',
      priority: 'Media',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  };

  return (
    <div className="bg-muted/30 rounded-xl p-4 mb-6">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input 
            type="text" 
            placeholder="Añadir nueva tarea..." 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            data-testid="input-task-title"
          />
        </div>
        <div className="sm:w-48">
          <input 
            type="datetime-local" 
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            data-testid="input-task-due-date"
          />
        </div>
        <button 
          type="submit" 
          disabled={!title.trim() || addTaskMutation.isPending}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50"
          data-testid="button-add-task"
        >
          <i className="fas fa-plus mr-1"></i>
          {addTaskMutation.isPending ? "Añadiendo..." : "Añadir"}
        </button>
      </form>
    </div>
  );
}
