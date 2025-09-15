import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Card from "./Card";
import DealModal from '@/components/DealModal';
import NewContactModal from '@/components/ui/NewContactModal';
import { getContacts } from '@/lib/db';
import type { Contact } from '@/lib/types';

export default function ShortcutsCard() {
  const [openDeal, setOpenDeal] = useState(false);
  const [openContact, setOpenContact] = useState(false);

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: getContacts,
  });
  const shortcuts = [
    {
      id: 1,
      title: "Nueva Tarea",
      description: "Crear tarea rápida",
      icon: "fas fa-plus",
      color: "blue",
      action: () => {
        // TODO: Navigate to add task form or open modal
        console.log("Navigate to add task form");
      }
    },
    {
      id: 2,
      title: "Nuevo Deal",
      description: "Registrar oportunidad",
      icon: "fas fa-handshake",
      color: "green",
      action: () => setOpenDeal(true)
    },
    {
      id: 3,
      title: "Nuevo Contacto",
      description: "Añadir cliente",
      icon: "fas fa-user-plus",
      color: "purple",
      action: () => setOpenContact(true)
    }
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400';
      case 'green':
        return 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400';
      case 'purple':
        return 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400';
      default:
        return 'bg-gray-100 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
            <i className="fas fa-bolt text-purple-600 dark:text-purple-400"></i>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">Atajos</h2>
            <p className="text-sm text-muted-foreground">Acciones rápidas</p>
          </div>
        </div>
      </div>
      
      <div className="space-y-3">
        {shortcuts.map((shortcut) => (
          <button 
            key={shortcut.id}
            onClick={shortcut.action}
            className="w-full flex items-center space-x-3 p-3 bg-muted/20 hover:bg-muted/40 rounded-xl transition-all text-left"
            data-testid={`button-shortcut-${shortcut.id}`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getColorClasses(shortcut.color)}`}>
              <i className={`${shortcut.icon} text-sm`}></i>
            </div>
            <div>
              <p className="font-medium text-card-foreground">{shortcut.title}</p>
              <p className="text-xs text-muted-foreground">{shortcut.description}</p>
            </div>
          </button>
        ))}
      </div>
      
      <DealModal 
        open={openDeal} 
        onClose={() => setOpenDeal(false)} 
        contacts={contacts}
      />
      <NewContactModal 
        open={openContact} 
        onClose={() => setOpenContact(false)} 
      />
    </Card>
  );
}
