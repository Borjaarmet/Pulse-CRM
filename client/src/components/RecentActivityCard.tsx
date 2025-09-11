import Card from "./Card";

export default function RecentActivityCard() {
  // Mock recent activity data - in real implementation this would come from timeline table
  const activities = [
    {
      id: 1,
      type: "call",
      description: "Llamada completada con TechCorp",
      time: "Hace 2 horas",
      user: "Juan Pérez",
      icon: "fas fa-phone",
      color: "blue"
    },
    {
      id: 2,
      type: "deal",
      description: "Deal cerrado - €15,000",
      time: "Hace 5 horas",
      user: "María García",
      icon: "fas fa-handshake",
      color: "green"
    },
    {
      id: 3,
      type: "proposal",
      description: "Nueva propuesta enviada",
      time: "Ayer",
      user: "Carlos López",
      icon: "fas fa-file-alt",
      color: "purple"
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
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
            <i className="fas fa-history text-green-600 dark:text-green-400"></i>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">Actividad reciente</h2>
            <p className="text-sm text-muted-foreground">Últimas actualizaciones</p>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${getColorClasses(activity.color)}`}>
              <i className={`${activity.icon} text-xs`}></i>
            </div>
            <div className="flex-1">
              <p className="text-sm text-card-foreground">{activity.description}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {activity.time} • {activity.user}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
