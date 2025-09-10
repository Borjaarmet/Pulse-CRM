import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addContact } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ContactModal({ open, onClose }: ContactModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [source, setSource] = useState("");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const addContactMutation = useMutation({
    mutationFn: addContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setName("");
      setEmail("");
      setCompany("");
      setSource("");
      onClose();
      toast({
        title: "Contact created",
        description: "Your contact has been created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create contact",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addContactMutation.mutate({
      name: name.trim(),
      email: email.trim() || null,
      company: company.trim() || null,
      source: source.trim() || null,
    } as any);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Contacto</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-card-foreground block mb-2">
              Nombre *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              placeholder="Ej: Juan Pérez"
              required
              data-testid="input-contact-name"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-card-foreground block mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              placeholder="Ej: juan.perez@empresa.com"
              data-testid="input-contact-email"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-card-foreground block mb-2">
              Empresa
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              placeholder="Ej: TechCorp Solutions"
              data-testid="input-contact-company"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-card-foreground block mb-2">
              Fuente
            </label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              placeholder="Ej: Referencia, LinkedIn, Web"
              data-testid="input-contact-source"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-contact-cancel"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim() || addContactMutation.isPending}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50"
              data-testid="button-contact-submit"
            >
              {addContactMutation.isPending ? "Creando..." : "Crear Contacto"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}