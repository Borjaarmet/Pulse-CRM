import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCompanies, updateCompany, deleteCompany } from "@/lib/companies";
import { useToast } from "@/hooks/use-toast";
import Card from "./Card";
import Skeleton from "./Skeleton";
import ScoreBadge from "./ScoreBadge";
import PriorityBadge from "./PriorityBadge";
import ScoringTooltip from "./ScoringTooltip";
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
import { Edit, Trash2, Search, Filter, Plus, Building2 } from "lucide-react";
import { calculateContactScore } from "@/lib/scoring";
import type { Company } from "@/lib/types";

interface CompaniesListProps {
  className?: string;
}

const PRIORITIES = ["Cold", "Warm", "Hot"];
const SIZES = ["Small", "Medium", "Large", "Enterprise"];
const INDUSTRIES = ["Tecnología", "Consultoría", "Retail", "Startup", "Manufacturing", "Finanzas", "Salud", "Educación"];

export default function CompaniesList({ className }: CompaniesListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sizeFilter, setSizeFilter] = useState<string>("all");
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deletingCompany, setDeletingCompany] = useState<Company | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: getCompanies,
  });

  const updateCompanyMutation = useMutation({
    mutationFn: ({ id, ...patch }: { id: string } & Partial<Company>) =>
      updateCompany(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setIsEditModalOpen(false);
      setEditingCompany(null);
      toast({
        title: "Empresa actualizada",
        description: "La empresa se ha actualizado exitosamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la empresa",
        variant: "destructive",
      });
    },
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: deleteCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setIsDeleteModalOpen(false);
      setDeletingCompany(null);
      toast({
        title: "Empresa eliminada",
        description: "La empresa se ha eliminado exitosamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la empresa",
        variant: "destructive",
      });
    },
  });

  const filteredCompanies = useMemo(() => {
    return companies.filter((company) => {
      const matchesSearch = 
        company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (company.industry && company.industry.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (company.location && company.location.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesPriority = priorityFilter === "all" || company.priority === priorityFilter;
      const matchesSize = sizeFilter === "all" || company.size === sizeFilter;
      const matchesIndustry = industryFilter === "all" || company.industry === industryFilter;
      
      return matchesSearch && matchesPriority && matchesSize && matchesIndustry;
    });
  }, [companies, searchTerm, priorityFilter, sizeFilter, industryFilter]);

  const itemsPerPage = 5;
  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCompanies = filteredCompanies.slice(startIndex, startIndex + itemsPerPage);

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setIsEditModalOpen(true);
  };

  const handleDelete = (company: Company) => {
    setDeletingCompany(company);
    setIsDeleteModalOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const patch = {
      name: formData.get("name") as string,
      industry: formData.get("industry") as string,
      size: formData.get("size") as string,
      revenue_estimate: formData.get("revenue_estimate") ? Number(formData.get("revenue_estimate")) : undefined,
      location: formData.get("location") as string,
      website: formData.get("website") as string,
      description: formData.get("description") as string,
    };

    updateCompanyMutation.mutate({ id: editingCompany.id, ...patch });
  };

  const handleDeleteConfirm = () => {
    if (deletingCompany) {
      deleteCompanyMutation.mutate(deletingCompany.id);
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getSizeColor = (size: string | undefined) => {
    switch (size) {
      case "Enterprise":
        return "bg-purple-100 text-purple-800";
      case "Large":
        return "bg-blue-100 text-blue-800";
      case "Medium":
        return "bg-green-100 text-green-800";
      case "Small":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
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
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Empresas</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {filteredCompanies.length} empresas
              </span>
              <Button
                size="sm"
                onClick={() => setIsAddModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Nueva
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar empresas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Prioridad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las prioridades</SelectItem>
                  {PRIORITIES.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sizeFilter} onValueChange={setSizeFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tamaño" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tamaños</SelectItem>
                  {SIZES.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={industryFilter} onValueChange={setIndustryFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Industria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las industrias</SelectItem>
                  {INDUSTRIES.map((industry) => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
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
                  <TableHead>Nombre</TableHead>
                  <TableHead>Industria</TableHead>
                  <TableHead>Tamaño</TableHead>
                  <TableHead>Facturación</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead className="w-20">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCompanies.map((company) => {
                  // Calcular scoring de la empresa (basado en contactos y deals asociados)
                  const companyScore = company.score || 0;
                  const companyPriority = company.priority || 'Cold';
                  
                  // Por ahora, usar scoring básico basado en tamaño y facturación
                  const basicScore = Math.min(
                    (company.size === 'Enterprise' ? 30 : 
                     company.size === 'Large' ? 20 : 
                     company.size === 'Medium' ? 10 : 5) +
                    (company.revenue_estimate ? Math.min(company.revenue_estimate / 1000000, 50) : 0) +
                    (company.industry === 'Tecnología' ? 15 : 0),
                    100
                  );

                  return (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">{company.name}</TableCell>
                      <TableCell>{company.industry || "-"}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSizeColor(company.size)}`}>
                          {company.size || "-"}
                        </span>
                      </TableCell>
                      <TableCell>{formatCurrency(company.revenue_estimate)}</TableCell>
                      <TableCell>
                        <ScoreBadge 
                          score={companyScore || basicScore} 
                          priority={companyPriority} 
                          size="sm" 
                        />
                      </TableCell>
                      <TableCell>
                        <PriorityBadge priority={companyPriority} size="sm" />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {company.location || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(company)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(company)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
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

          {filteredCompanies.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron empresas
            </div>
          )}
        </div>
      </Card>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Empresa</DialogTitle>
          </DialogHeader>
          
          {editingCompany && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-card-foreground block mb-2">
                  Nombre *
                </label>
                <Input
                  name="name"
                  defaultValue={editingCompany.name}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-card-foreground block mb-2">
                    Industria
                  </label>
                  <Select name="industry" defaultValue={editingCompany.industry || ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((industry) => (
                        <SelectItem key={industry} value={industry}>
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-card-foreground block mb-2">
                    Tamaño
                  </label>
                  <Select name="size" defaultValue={editingCompany.size || ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {SIZES.map((size) => (
                        <SelectItem key={size} value={size}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-card-foreground block mb-2">
                  Facturación Estimada (€)
                </label>
                <Input
                  name="revenue_estimate"
                  type="number"
                  defaultValue={editingCompany.revenue_estimate || ""}
                  min="0"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-card-foreground block mb-2">
                  Ubicación
                </label>
                <Input
                  name="location"
                  defaultValue={editingCompany.location || ""}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-card-foreground block mb-2">
                  Website
                </label>
                <Input
                  name="website"
                  type="url"
                  defaultValue={editingCompany.website || ""}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-card-foreground block mb-2">
                  Descripción
                </label>
                <Input
                  name="description"
                  defaultValue={editingCompany.description || ""}
                />
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
                  disabled={updateCompanyMutation.isPending}
                >
                  {updateCompanyMutation.isPending ? "Guardando..." : "Guardar"}
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
            <DialogTitle>Eliminar Empresa</DialogTitle>
          </DialogHeader>
          
          {deletingCompany && (
            <div className="space-y-4">
              <p>
                ¿Estás seguro de que quieres eliminar la empresa "{deletingCompany.name}"?
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
                  disabled={deleteCompanyMutation.isPending}
                >
                  {deleteCompanyMutation.isPending ? "Eliminando..." : "Eliminar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}