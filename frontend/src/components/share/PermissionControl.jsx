import { Eye, Edit, Shield } from 'lucide-react';

export default function PermissionControl({ 
  permission, 
  onChange, 
  disabled = false,
  size = 'default' // 'small', 'default', 'large'
}) {
  const sizeClasses = {
    small: 'text-xs px-2 py-1',
    default: 'text-sm px-3 py-2',
    large: 'text-base px-4 py-2.5'
  };

  const iconSizes = {
    small: 'w-3 h-3',
    default: 'w-4 h-4',
    large: 'w-5 h-5'
  };

  return (
    <select
      value={permission}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`${sizeClasses[size]} border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors appearance-none cursor-pointer hover:border-blue-400`}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
        backgroundPosition: 'right 0.5rem center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: '1.5em 1.5em',
        paddingRight: '2.5rem'
      }}
    >
      <option value="view">👁️ Can view</option>
      <option value="edit">✏️ Can edit</option>
      <option value="owner">👑 Owner</option>
    </select>
  );
}

// Alternative button-style version
export function PermissionToggle({ 
  permission, 
  onChange, 
  disabled = false 
}) {
  const permissions = [
    { value: 'view', label: 'View', icon: Eye, color: 'blue' },
    { value: 'edit', label: 'Edit', icon: Edit, color: 'green' },
    { value: 'owner', label: 'Owner', icon: Shield, color: 'purple' }
  ];

  return (
    <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden bg-white">
      {permissions.map(({ value, label, icon: Icon, color }) => (
        <button
          key={value}
          onClick={() => !disabled && onChange(value)}
          disabled={disabled}
          className={`px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5 ${
            permission === value
              ? `bg-${color}-100 text-${color}-700 border-r border-${color}-300`
              : 'text-gray-600 hover:bg-gray-50 border-r border-gray-200'
          } disabled:opacity-50 disabled:cursor-not-allowed last:border-r-0`}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}

// Badge style version
export function PermissionBadge({ permission, size = 'default' }) {
  const sizeClasses = {
    small: 'text-[10px] px-1.5 py-0.5',
    default: 'text-xs px-2 py-1',
    large: 'text-sm px-3 py-1.5'
  };

  const iconSizes = {
    small: 'w-2.5 h-2.5',
    default: 'w-3 h-3',
    large: 'w-4 h-4'
  };

  const permissionConfig = {
    view: {
      label: 'View only',
      icon: Eye,
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-200'
    },
    edit: {
      label: 'Can edit',
      icon: Edit,
      bgColor: 'bg-green-100',
      textColor: 'text-green-700',
      borderColor: 'border-green-200'
    },
    owner: {
      label: 'Owner',
      icon: Shield,
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-700',
      borderColor: 'border-purple-200'
    }
  };

  const config = permissionConfig[permission] || permissionConfig.view;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium border ${sizeClasses[size]} ${config.bgColor} ${config.textColor} ${config.borderColor}`}
    >
      <Icon className={iconSizes[size]} />
      {config.label}
    </span>
  );
}