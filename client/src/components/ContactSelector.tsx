import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getContacts, addContact } from "@/lib/db";
import { useDebounce } from "@/hooks/use-debounce";
import { useToast } from "@/hooks/use-toast";
import type { Contact } from "@/lib/types";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ContactSelectorProps {
  value?: string;
  onValueChange: (value: string | undefined) => void;
  placeholder?: string;
  className?: string;
  error?: string;
}

interface ContactFormData {
  name: string;
  email: string;
  company: string;
}

export default function ContactSelector({
  value,
  onValueChange,
  placeholder = "Seleccionar contacto...",
  className,
  error,
}: ContactSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newContact, setNewContact] = useState<ContactFormData>({
    name: "",
    email: "",
    company: "",
  });
  const [formErrors, setFormErrors] = useState<Partial<ContactFormData>>({});

  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch contacts with search
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts", debouncedSearchQuery],
    queryFn: () => getContacts(),
    enabled: true,
  });

  // Filter contacts based on search query
  const filteredContacts = useMemo(() => {
    if (!debouncedSearchQuery) return contacts;
    
    return contacts.filter((contact) =>
      contact.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      (contact.company && contact.company.toLowerCase().includes(debouncedSearchQuery.toLowerCase()))
    );
  }, [contacts, debouncedSearchQuery]);

  // Create contact mutation
  const createContactMutation = useMutation({
    mutationFn: addContact,
    onSuccess: (newContact) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      onValueChange(newContact.id);
      setShowCreateForm(false);
      setNewContact({ name: "", email: "", company: "" });
      setFormErrors({});
      setSearchQuery("");
      setOpen(false);
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

  // Get selected contact
  const selectedContact = contacts.find((contact) => contact.id === value);

  // Validate form
  const validateForm = (): boolean => {
    const errors: Partial<ContactFormData> = {};
    
    if (!newContact.name.trim()) {
      errors.name = "El nombre es requerido";
    }
    
    if (!newContact.email.trim()) {
      errors.email = "El email es requerido";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newContact.email)) {
      errors.email = "El email no es válido";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle create contact
  const handleCreateContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    createContactMutation.mutate({
      name: newContact.name.trim(),
      email: newContact.email.trim(),
      company: newContact.company.trim() || null,
    });
  };

  // Handle search change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setShowCreateForm(false);
    setFormErrors({});
  };

  // Handle select contact
  const handleSelectContact = (contactId: string) => {
    onValueChange(contactId);
    setOpen(false);
    setSearchQuery("");
  };

  // Handle clear selection
  const handleClear = () => {
    onValueChange(undefined);
    setSearchQuery("");
  };

  // Reset form when opening
  useEffect(() => {
    if (open) {
      setSearchQuery("");
      setShowCreateForm(false);
      setFormErrors({});
    }
  }, [open]);

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between",
              error && "border-destructive",
              !selectedContact && "text-muted-foreground"
            )}
          >
            {selectedContact ? (
              <div className="flex items-center gap-2">
                <span className="truncate">
                  {selectedContact.name}
                  {selectedContact.company && ` - ${selectedContact.company}`}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear();
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              placeholder
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Buscar contacto..."
              value={searchQuery}
              onValueChange={handleSearchChange}
            />
            <CommandList>
              {isLoading ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Cargando...
                </div>
              ) : filteredContacts.length === 0 && !showCreateForm ? (
                <CommandEmpty>
                  <div className="py-6 text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      No se encontraron contactos
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCreateForm(true)}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Crear nuevo contacto
                    </Button>
                  </div>
                </CommandEmpty>
              ) : (
                <>
                  <CommandGroup>
                    {filteredContacts.map((contact) => (
                      <CommandItem
                        key={contact.id}
                        value={contact.id}
                        onSelect={() => handleSelectContact(contact.id)}
                        className="flex items-center gap-2"
                      >
                        <Check
                          className={cn(
                            "h-4 w-4",
                            value === contact.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {contact.name}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {contact.email}
                            {contact.company && ` • ${contact.company}`}
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  
                  {filteredContacts.length > 0 && (
                    <div className="border-t p-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCreateForm(true)}
                        className="w-full gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Crear nuevo contacto
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Inline contact creation form */}
      {showCreateForm && (
        <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Crear nuevo contacto</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowCreateForm(false);
                setFormErrors({});
                setNewContact({ name: "", email: "", company: "" });
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <form onSubmit={handleCreateContact} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-foreground">
                Nombre *
              </label>
              <input
                type="text"
                value={newContact.name}
                onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                className={cn(
                  "w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-ring",
                  formErrors.name ? "border-destructive" : "border-border"
                )}
                placeholder="Nombre del contacto"
              />
              {formErrors.name && (
                <p className="text-xs text-destructive mt-1">{formErrors.name}</p>
              )}
            </div>
            
            <div>
              <label className="text-xs font-medium text-foreground">
                Email *
              </label>
              <input
                type="email"
                value={newContact.email}
                onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                className={cn(
                  "w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-ring",
                  formErrors.email ? "border-destructive" : "border-border"
                )}
                placeholder="email@ejemplo.com"
              />
              {formErrors.email && (
                <p className="text-xs text-destructive mt-1">{formErrors.email}</p>
              )}
            </div>
            
            <div>
              <label className="text-xs font-medium text-foreground">
                Empresa
              </label>
              <input
                type="text"
                value={newContact.company}
                onChange={(e) => setNewContact(prev => ({ ...prev, company: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Empresa (opcional)"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={createContactMutation.isPending}
                className="flex-1"
              >
                {createContactMutation.isPending ? "Creando..." : "Crear"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowCreateForm(false);
                  setFormErrors({});
                  setNewContact({ name: "", email: "", company: "" });
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
