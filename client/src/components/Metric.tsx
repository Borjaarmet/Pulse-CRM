interface MetricProps {
  icon: string;
  value: number | string;
  label: string;
  color: 'blue' | 'green' | 'red' | 'purple' | 'orange';
  change?: string;
}

export default function Metric({ icon, value, label, color, change }: MetricProps) {
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/10',
          icon: 'text-blue-600 dark:text-blue-400',
          value: 'text-blue-900 dark:text-blue-100',
          label: 'text-blue-700 dark:text-blue-300',
          change: 'text-blue-600 dark:text-blue-400'
        };
      case 'green':
        return {
          bg: 'bg-green-50 dark:bg-green-900/10',
          icon: 'text-green-600 dark:text-green-400',
          value: 'text-green-900 dark:text-green-100',
          label: 'text-green-700 dark:text-green-300',
          change: 'text-green-600 dark:text-green-400'
        };
      case 'red':
        return {
          bg: 'bg-red-50 dark:bg-red-900/10',
          icon: 'text-red-600 dark:text-red-400',
          value: 'text-red-900 dark:text-red-100',
          label: 'text-red-700 dark:text-red-300',
          change: 'text-red-600 dark:text-red-400'
        };
      case 'purple':
        return {
          bg: 'bg-purple-50 dark:bg-purple-900/10',
          icon: 'text-purple-600 dark:text-purple-400',
          value: 'text-purple-900 dark:text-purple-100',
          label: 'text-purple-700 dark:text-purple-300',
          change: 'text-purple-600 dark:text-purple-400'
        };
      case 'orange':
        return {
          bg: 'bg-orange-50 dark:bg-orange-900/10',
          icon: 'text-orange-600 dark:text-orange-400',
          value: 'text-orange-900 dark:text-orange-100',
          label: 'text-orange-700 dark:text-orange-300',
          change: 'text-orange-600 dark:text-orange-400'
        };
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-900/10',
          icon: 'text-gray-600 dark:text-gray-400',
          value: 'text-gray-900 dark:text-gray-100',
          label: 'text-gray-700 dark:text-gray-300',
          change: 'text-gray-600 dark:text-gray-400'
        };
    }
  };

  const colors = getColorClasses(color);

  return (
    <div className={`p-4 rounded-xl ${colors.bg}`} data-testid={`metric-${label.toLowerCase().replace(' ', '-')}`}>
      <div className="flex items-center justify-between mb-2">
        <i className={`${icon} ${colors.icon}`}></i>
        {change && (
          <span className={`text-xs font-medium ${colors.change}`}>
            {change}
          </span>
        )}
      </div>
      <p className={`text-2xl font-bold ${colors.value}`}>{value}</p>
      <p className={`text-xs ${colors.label}`}>{label}</p>
    </div>
  );
}
