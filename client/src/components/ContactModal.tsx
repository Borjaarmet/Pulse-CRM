import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addContact } from "@/lib/db";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Contact } from "@/lib/types";

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (contact: Contact) => void;
}

export default function ContactModal({ 
  open, 
  onClose, 
  onCreated 
}: ContactModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const addContactMutation = useMutation({
    mutationFn: addContact,
    onSuccess: (contact) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contacts });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.companies });
      resetForm();
      onClose();
      onCreated?.(contact);
      toast({
        title: "Contacto creado",
        description: "El contacto se ha creado exitosamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear el contacto",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setName("");
    setEmail("");
    setCompany("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addContactMutation.mutate({
      name: name.trim(),
      email: email.trim() || undefined,
      company: company.trim() || undefined,
      score: 0,
      priority: "Cold" as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
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
