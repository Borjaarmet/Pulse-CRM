interface MetricProps {
  icon: string;
  value: number;
  label: string;
  color: 'blue' | 'green' | 'red' | 'purple';
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
    <div className={`p-5 rounded-xl ${colors.bg} border border-border/20 transition-all duration-300 hover:shadow-md`} data-testid={`metric-${label.toLowerCase().replace(' ', '-')}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${colors.bg} ${colors.icon}`}>
          <i className={`${icon} text-lg`}></i>
        </div>
        {change && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${colors.change} ${colors.bg}`}>
            {change}
          </span>
        )}
      </div>
      <p className={`text-3xl font-bold ${colors.value} mb-1`}>{value}</p>
      <p className={`text-sm font-medium ${colors.label}`}>{label}</p>
    </div>
  );
}
