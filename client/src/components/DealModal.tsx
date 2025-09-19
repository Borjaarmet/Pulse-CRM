import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addDeal } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ContactSelector from "@/components/ContactSelector";
import type { Deal, Contact } from "@/lib/types";
import { useContactsQuery } from "@/hooks/useCrmQueries";
import { QUERY_KEYS } from "@/lib/queryKeys";

interface DealModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (deal: Deal) => void;
  deal?: Deal; // Optional deal for editing
  contacts?: Contact[];
}

export default function DealModal({ 
  open, 
  onClose, 
  onCreated,
  deal,
  contacts: propContacts 
}: DealModalProps) {
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [amount, setAmount] = useState("");
  const [stage, setStage] = useState("Prospección");
  const [targetClose, setTargetClose] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [contactId, setContactId] = useState<string | undefined>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [autoProbability, setAutoProbability] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch contacts if not provided as props
  const { data: contactsData } = useContactsQuery({
    enabled: !propContacts,
  });
  const contacts = contactsData ?? ([] as Contact[]);
  const availableContacts = propContacts ?? contacts;

  // Populate form when editing a deal
  useEffect(() => {
    if (deal && open) {
      setTitle(deal.title || "");
      setCompany(deal.company || "");
      setAmount(deal.amount?.toString() || "");
      setStage(deal.stage || "Prospección");
      setTargetClose(deal.target_close_date || "");
      setNextStep(deal.next_step || "");
      setContactId(deal.contact_id || "");
      setAutoProbability(typeof deal.probability === "number" ? deal.probability : null);
    } else if (open) {
      // Reset form when creating new deal
      resetForm();
    }
  }, [deal, open]);

  const addDealMutation = useMutation({
    mutationFn: addDeal,
    onSuccess: (newDeal) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.deals });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contacts });
      // Invalidate dashboard queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.hotDeal });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stalledDeals });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.quickMetrics });
      resetForm();
      onClose();
      onCreated?.(newDeal);
      toast({
        title: deal ? "Deal actualizado" : "Deal creado",
        description: deal ? "El deal se ha actualizado exitosamente" : "El deal se ha creado exitosamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: deal ? "No se pudo actualizar el deal" : "No se pudo crear el deal",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setTitle("");
    setCompany("");
    setAmount("");
    setStage("Prospección");
    setTargetClose("");
    setNextStep("");
    setContactId("");
    setErrors({});
    setAutoProbability(null);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = "El título es requerido";
    }

    if (amount && (isNaN(Number(amount)) || Number(amount) < 0)) {
      newErrors.amount = "El monto debe ser un número válido mayor o igual a 0";
    }

    if (targetClose && isNaN(Date.parse(targetClose))) {
      newErrors.targetClose = "La fecha objetivo no es válida";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const amountValue = amount ? Number(amount) : undefined;
    addDealMutation.mutate({
      title: title.trim(),
      company: company.trim() || undefined,
      amount: amountValue,
      stage,
      target_close_date: targetClose || undefined,
      next_step: nextStep.trim() || undefined,
      contact_id: contactId || undefined,
      status: 'Open',
      score: 0,
      inactivity_days: 0,
      created_at: new Date().toISOString(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{deal ? "Editar Deal" : "Nuevo Deal"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-card-foreground block mb-2">
              Título *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent ${
                errors.title ? "border-destructive" : "border-border"
              }`}
              placeholder="Ej: Software CRM Enterprise"
              required
              data-testid="input-deal-title"
            />
            {errors.title && (
              <p className="text-xs text-destructive mt-1">{errors.title}</p>
            )}
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
              data-testid="input-deal-company"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-card-foreground block mb-2">
              Monto
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              placeholder="50000"
              min="0"
              step="0.01"
              data-testid="input-deal-amount"
            />
          </div>

          <div className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-xs text-blue-100">
            La probabilidad inicial se calculará automáticamente según etapa, valor, actividad y próximos pasos.
            {autoProbability !== null && (
              <span className="ml-1 font-semibold">Probabilidad actual: {autoProbability}%</span>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-card-foreground block mb-2">
              Etapa
            </label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              data-testid="select-deal-stage"
            >
              <option value="Prospección">Prospección</option>
              <option value="Calificación">Calificación</option>
              <option value="Negociación">Negociación</option>
              <option value="Propuesta">Propuesta</option>
              <option value="Cierre">Cierre</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-card-foreground block mb-2">
              Fecha objetivo de cierre
            </label>
            <input
              type="date"
              value={targetClose}
              onChange={(e) => setTargetClose(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              data-testid="input-deal-target-close"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-card-foreground block mb-2">
              Próximo paso
            </label>
            <input
              type="text"
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              placeholder="Ej: Preparar propuesta técnica"
              data-testid="input-deal-next-step"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-card-foreground block mb-2">
              Contacto
            </label>
            <ContactSelector
              value={contactId}
              onValueChange={setContactId}
              placeholder="Seleccionar contacto (opcional)"
              className="w-full"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-deal-cancel"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!title.trim() || addDealMutation.isPending}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50"
              data-testid="button-deal-submit"
            >
              {addDealMutation.isPending 
                ? (deal ? "Actualizando..." : "Creando...") 
                : (deal ? "Actualizar Deal" : "Crear Deal")
              }
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
