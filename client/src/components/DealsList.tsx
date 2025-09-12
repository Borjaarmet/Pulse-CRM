import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDeals, updateDeal, deleteDeal } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";
import Card from "./Card";
import Skeleton from "./Skeleton";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Edit, Trash2, Search, Filter } from "lucide-react";
import type { Deal } from "@/lib/types";

interface DealsListProps {
  className?: string;
}

const STAGES = ["Prospección", "Negociación", "Propuesta", "Cierre"];
const STATUSES = ["Open", "Won", "Lost"];

export default function DealsList({ className }: DealsListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [deletingDeal, setDeletingDeal] = useState<Deal | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["deals"],
    queryFn: getDeals,
  });

  const updateDealMutation = useMutation({
    mutationFn: ({ id, ...patch }: { id: string } & Partial<Deal>) =>
      updateDeal(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      setIsEditModalOpen(false);
      setEditingDeal(null);
      toast({
        title: "Deal actualizado",
        description: "El deal se ha actualizado exitosamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el deal",
        variant: "destructive",
      });
    },
  });

  const deleteDealMutation = useMutation({
    mutationFn: deleteDeal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      setIsDeleteModalOpen(false);
      setDeletingDeal(null);
      toast({
        title: "Deal eliminado",
        description: "El deal se ha eliminado exitosamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el deal",
        variant: "destructive",
      });
    },
  });

  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      const matchesSearch = 
        deal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deal.company.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStage = stageFilter === "all" || deal.stage === stageFilter;
      const matchesStatus = statusFilter === "all" || deal.status === statusFilter;
      
      return matchesSearch && matchesStage && matchesStatus;
    });
  }, [deals, searchTerm, stageFilter, statusFilter]);

  const itemsPerPage = 5;
  const totalPages = Math.ceil(filteredDeals.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDeals = filteredDeals.slice(startIndex, startIndex + itemsPerPage);

  const handleEdit = (deal: Deal) => {
    setEditingDeal(deal);
    setIsEditModalOpen(true);
  };

  const handleDelete = (deal: Deal) => {
    setDeletingDeal(deal);
    setIsDeleteModalOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDeal) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const patch = {
      title: formData.get("title") as string,
      company: formData.get("company") as string,
      amount: formData.get("amount") ? Number(formData.get("amount")) : null,
      stage: formData.get("stage") as string,
      probability: Number(formData.get("probability")) || 0,
      next_step: formData.get("next_step") as string,
      status: formData.get("status") as "Open" | "Won" | "Lost",
    };

    updateDealMutation.mutate({ id: editingDeal.id, ...patch });
  };

  const handleDeleteConfirm = () => {
    if (deletingDeal) {
      deleteDealMutation.mutate(deletingDeal.id);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Won":
        return "text-green-600 bg-green-50";
      case "Lost":
        return "text-red-600 bg-red-50";
      default:
        return "text-blue-600 bg-blue-50";
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-24" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Deals</h3>
            <span className="text-sm text-muted-foreground">
              {filteredDeals.length} deals
            </span>
          </div>

          {/* Search and Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar deals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-full">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Etapa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las etapas</SelectItem>
                  {STAGES.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Prob.</TableHead>
                  <TableHead>Próximo paso</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-20">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDeals.map((deal) => (
                  <TableRow key={deal.id}>
                    <TableCell className="font-medium">{deal.title}</TableCell>
                    <TableCell>{deal.company || "-"}</TableCell>
                    <TableCell>{formatCurrency(deal.amount)}</TableCell>
                    <TableCell>{deal.stage}</TableCell>
                    <TableCell>{deal.probability}%</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {deal.next_step || "-"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          deal.status
                        )}`}
                      >
                        {deal.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(deal)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(deal)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}

          {filteredDeals.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron deals
            </div>
          )}
        </div>
      </Card>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Deal</DialogTitle>
          </DialogHeader>
          
          {editingDeal && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-card-foreground block mb-2">
                  Título *
                </label>
                <Input
                  name="title"
                  defaultValue={editingDeal.title}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-card-foreground block mb-2">
                  Empresa
                </label>
                <Input
                  name="company"
                  defaultValue={editingDeal.company || ""}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-card-foreground block mb-2">
                    Monto
                  </label>
                  <Input
                    name="amount"
                    type="number"
                    defaultValue={editingDeal.amount || ""}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-card-foreground block mb-2">
                    Probabilidad (%)
                  </label>
                  <Input
                    name="probability"
                    type="number"
                    defaultValue={editingDeal.probability || 0}
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-card-foreground block mb-2">
                  Etapa
                </label>
                <Select name="stage" defaultValue={editingDeal.stage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {stage}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-card-foreground block mb-2">
                  Próximo paso
                </label>
                <Input
                  name="next_step"
                  defaultValue={editingDeal.next_step || ""}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-card-foreground block mb-2">
                  Estado
                </label>
                <Select name="status" defaultValue={editingDeal.status}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={updateDealMutation.isPending}
                >
                  {updateDealMutation.isPending ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar Deal</DialogTitle>
          </DialogHeader>
          
          {deletingDeal && (
            <div className="space-y-4">
              <p>
                ¿Estás seguro de que quieres eliminar el deal "{deletingDeal.title}"?
                Esta acción no se puede deshacer.
              </p>
              
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteConfirm}
                  disabled={deleteDealMutation.isPending}
                >
                  {deleteDealMutation.isPending ? "Eliminando..." : "Eliminar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}