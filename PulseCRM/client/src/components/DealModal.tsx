import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addDeal } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DealModalProps {
  open: boolean;
  onClose: () => void;
}

export default function DealModal({ open, onClose }: DealModalProps) {
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [amount, setAmount] = useState("");
  const [stage, setStage] = useState("Prospección");
  const [probability, setProbability] = useState("0");
  const [targetClose, setTargetClose] = useState("");
  const [nextStep, setNextStep] = useState("");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const addDealMutation = useMutation({
    mutationFn: addDeal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      setTitle("");
      setCompany("");
      setAmount("");
      setStage("Prospección");
      setProbability("0");
      setTargetClose("");
      setNextStep("");
      onClose();
      toast({
        title: "Deal created",
        description: "Your deal has been created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create deal",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const amountValue = amount ? Number(amount) : null;
    const probabilityValue = Math.max(0, Math.min(100, Number(probability) || 0));

    addDealMutation.mutate({
      title: title.trim(),
      company: company.trim() || null,
      amount: amountValue,
      stage,
      probability: probabilityValue,
      target_close_date: targetClose || null,
      next_step: nextStep.trim() || null,
      contact_id: null,
      status: 'Open' as any,
      risk: 'Bajo' as any,
    } as any);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Deal</DialogTitle>
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
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              placeholder="Ej: Software CRM Enterprise"
              required
              data-testid="input-deal-title"
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
              data-testid="input-deal-company"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
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

            <div>
              <label className="text-sm font-medium text-card-foreground block mb-2">
                Probabilidad (%)
              </label>
              <input
                type="number"
                value={probability}
                onChange={(e) => setProbability(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                placeholder="70"
                min="0"
                max="100"
                data-testid="input-deal-probability"
              />
            </div>
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
              {addDealMutation.isPending ? "Creando..." : "Crear Deal"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}