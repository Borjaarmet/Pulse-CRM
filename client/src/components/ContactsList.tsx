import React, { useState, useMemo, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateContact, deleteContact } from "@/lib/db";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Edit, Trash2, Search, Filter, Plus, Sparkles, Loader2 } from "lucide-react";
import { calculateContactScore } from "@/lib/scoring";
import type { Contact, Deal } from "@/lib/types";
import { useContactsQuery, useDealsQuery } from "@/hooks/useCrmQueries";
import ContactModal from "./ContactModal";
import { QUERY_KEYS } from "@/lib/queryKeys";

interface ContactsListProps {
  className?: string;
}

const PRIORITIES = ["Cold", "Warm", "Hot"];

export default function ContactsList({ className }: ContactsListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [insightContact, setInsightContact] = useState<Contact | null>(null);
  const [isInsightOpen, setIsInsightOpen] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [contactSummary, setContactSummary] = useState<{
    headline: string | null;
    highlights: string[] | null;
    provider: string;
    usedFallback: boolean;
  } | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: contactsData, isLoading } = useContactsQuery();
  const { data: dealsData } = useDealsQuery();

  const contacts = contactsData ?? ([] as Contact[]);
  const deals = dealsData ?? ([] as Deal[]);

  const updateContactMutation = useMutation({
    mutationFn: ({ id, ...patch }: { id: string } & Partial<Contact>) =>
      updateContact(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contacts });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.companies });
      setIsEditModalOpen(false);
      setEditingContact(null);
      toast({
        title: "Contacto actualizado",
        description: "El contacto se ha actualizado exitosamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el contacto",
        variant: "destructive",
      });
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: deleteContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contacts });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.companies });
      setIsDeleteModalOpen(false);
      setDeletingContact(null);
      toast({
        title: "Contacto eliminado",
        description: "El contacto se ha eliminado exitosamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el contacto",
        variant: "destructive",
      });
    },
  });

  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const matchesSearch = 
        (contact.name && contact.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (contact.email && contact.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (contact.company && typeof contact.company === 'string' && contact.company.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesPriority = priorityFilter === "all" || contact.priority === priorityFilter;
      
      return matchesSearch && matchesPriority;
    });
  }, [contacts, searchTerm, priorityFilter]);

  const itemsPerPage = 5;
  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedContacts = filteredContacts.slice(startIndex, startIndex + itemsPerPage);

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setIsEditModalOpen(true);
  };

  const handleDelete = (contact: Contact) => {
    setDeletingContact(contact);
    setIsDeleteModalOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const patch = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      company: formData.get("company") as string,
    };

    updateContactMutation.mutate({ id: editingContact.id, ...patch });
  };

  const handleDeleteConfirm = () => {
    if (deletingContact) {
      deleteContactMutation.mutate(deletingContact.id);
    }
  };

  const handleCopySummary = useCallback(() => {
    if (!contactSummary) return;
    const pieces: string[] = [];
    if (contactSummary.headline) pieces.push(contactSummary.headline);
    if (contactSummary.highlights?.length) {
      pieces.push(...contactSummary.highlights.map((item, index) => `${index + 1}. ${item}`));
    }
    const text = pieces.join("\n");
    if (!text) return;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast({ title: "Resumen copiado", description: "Pegalo en tu CRM, email o Slack." });
      })
      .catch(() => {
        toast({
          title: "No se pudo copiar",
          description: "Copia manualmente el texto mostrado.",
          variant: "destructive",
        });
      });
  }, [contactSummary, toast]);

  const handleContactInsight = async (contact: Contact) => {
    setInsightContact(contact);
    setContactSummary(null);
    setInsightError(null);
    setIsInsightOpen(true);
    setInsightLoading(true);

    const relatedDeals = deals.filter((deal) => deal.contact_id === contact.id);
    const fallback = `Revisa historial y últimas interacciones con ${contact.name} para preparar el siguiente touchpoint.`;

    try {
      const response = await fetch("/api/ai/contact-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contact: {
            id: contact.id,
            name: contact.name,
            company: contact.company ?? null,
            role: contact.position ?? null,
            lastActivity: contact.last_activity ?? null,
            owner: contact.owner_id ?? null,
            deals: relatedDeals.map((deal) => ({
              id: deal.id,
              title: deal.title,
              stage: deal.stage,
              status: deal.status,
              amount: deal.amount ?? null,
              priority: deal.priority ?? null,
              lastActivity: deal.last_activity ?? null,
            })),
          },
          fallbackText: fallback,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as {
        success: boolean;
        summary?: {
          headline: string | null;
          highlights: string[] | null;
          provider: string;
          usedFallback: boolean;
        };
        message?: string;
      };

      if (!data.success || !data.summary) {
        throw new Error(data.message || "Respuesta inválida");
      }

      setContactSummary(data.summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo generar el resumen";
      setInsightError(message);
      toast({
        title: "No se pudo generar",
        description: message,
        variant: "destructive",
      });
    } finally {
      setInsightLoading(false);
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
            <h3 className="text-lg font-semibold">Contactos</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {filteredContacts.length} contactos
              </span>
              <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
                <Plus className="mr-1 h-4 w-4" />
                Nuevo
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar contactos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
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
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Última Actividad</TableHead>
                  <TableHead className="text-right">IA</TableHead>
                  <TableHead className="w-24 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedContacts.map((contact) => {
                  // Obtener deals asociados al contacto
                  const contactDeals = deals.filter(deal => deal.contact_id === contact.id);
                  
                  // Calcular scoring del contacto
                  const contactScore = contact.score || 0;
                  const contactPriority = contact.priority || 'Cold';
                  
                  // Si no tiene score calculado, calcularlo
                  const scoringResult = contactScore === 0 ? calculateContactScore(contact, contactDeals) : null;
                  const finalScore = scoringResult ? scoringResult.score : contactScore;
                  const finalPriority = scoringResult ? scoringResult.priority : contactPriority;
                  const tooltipType = finalPriority === 'Hot' ? 'hot' : finalPriority === 'Warm' ? 'warm' : 'cold';

                  // Formatear última actividad
                  const formatLastActivity = (lastActivity?: string) => {
                    if (!lastActivity) return "Nunca";
                    const date = new Date(lastActivity);
                    const now = new Date();
                    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
                    
                    if (diffDays === 0) return "Hoy";
                    if (diffDays === 1) return "Ayer";
                    if (diffDays < 7) return `${diffDays} días`;
                    if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas`;
                    return `${Math.floor(diffDays / 30)} meses`;
                  };

                  return (
                    <TableRow key={contact.id}>
                      <TableCell className="font-medium">{contact.name}</TableCell>
                      <TableCell>{contact.email || "-"}</TableCell>
                      <TableCell>{typeof contact.company === 'string' ? contact.company : "-"}</TableCell>
                      <TableCell>
                        <ScoringTooltip type={tooltipType}>
                          <ScoreBadge 
                            score={finalScore} 
                            priority={finalPriority} 
                            size="sm" 
                          />
                        </ScoringTooltip>
                      </TableCell>
                      <TableCell>
                        <PriorityBadge priority={finalPriority} size="sm" />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatLastActivity(contact.last_activity)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-white"
                          onClick={() => handleContactInsight(contact)}
                          disabled={insightLoading && insightContact?.id === contact.id}
                        >
                          {insightLoading && insightContact?.id === contact.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(contact)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(contact)}>
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

          {filteredContacts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron contactos
            </div>
          )}
        </div>
      </Card>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Contacto</DialogTitle>
          </DialogHeader>
          
          {editingContact && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-card-foreground block mb-2">
                  Nombre *
                </label>
                <Input
                  name="name"
                  defaultValue={editingContact.name}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-card-foreground block mb-2">
                  Email
                </label>
                <Input
                  name="email"
                  type="email"
                  defaultValue={editingContact.email || ""}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-card-foreground block mb-2">
                  Empresa
                </label>
                <Input
                  name="company"
                  defaultValue={typeof editingContact.company === 'string' ? editingContact.company : ""}
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
                  disabled={updateContactMutation.isPending}
                >
                  {updateContactMutation.isPending ? "Guardando..." : "Guardar"}
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
            <DialogTitle>Eliminar Contacto</DialogTitle>
          </DialogHeader>
          
          {deletingContact && (
            <div className="space-y-4">
              <p>
                ¿Estás seguro de que quieres eliminar el contacto "{deletingContact.name}"?
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
                  disabled={deleteContactMutation.isPending}
                >
                  {deleteContactMutation.isPending ? "Eliminando..." : "Eliminar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ContactModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      <Dialog
        open={isInsightOpen}
        onOpenChange={(open) => {
          setIsInsightOpen(open);
          if (!open) {
            setInsightContact(null);
            setContactSummary(null);
            setInsightError(null);
          }
        }}
      >
        <DialogContent className="max-w-lg bg-[#0b1222] text-white">
          <DialogHeader>
            <DialogTitle>Resumen IA de contacto</DialogTitle>
            <DialogDescription className="text-white/60">
              Insights rápidos para preparar la próxima interacción.
            </DialogDescription>
          </DialogHeader>
          {insightLoading ? (
            <div className="flex items-center gap-2 text-sm text-white/70">
              <Loader2 className="h-4 w-4 animate-spin" /> Generando resumen…
            </div>
          ) : contactSummary ? (
            <div className="space-y-3">
              {contactSummary.headline && (
                <p className="text-sm font-semibold text-white">{contactSummary.headline}</p>
              )}
              {contactSummary.highlights?.length ? (
                <ul className="space-y-1 text-sm text-white/70">
                  {contactSummary.highlights.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-300" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="text-[11px] text-white/40">
                Fuente: {contactSummary.usedFallback ? "Heurística local" : `Modelo ${contactSummary.provider}`}
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setContactSummary(null)}>
                  Limpiar
                </Button>
                <Button variant="secondary" size="sm" className="bg-blue-500 text-white hover:bg-blue-600" onClick={handleCopySummary}>
                  Copiar resumen
                </Button>
              </div>
            </div>
          ) : insightError ? (
            <p className="text-sm text-rose-300">{insightError}</p>
          ) : insightContact ? (
            <p className="text-sm text-white/70">
              Analizando la información disponible de {insightContact.name}.
            </p>
          ) : (
            <p className="text-sm text-white/70">Selecciona un contacto para obtener el resumen IA.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
