import { useAuth } from '../../context/AuthContext';
import { ChevronDown, LogOut } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

interface UserProfileProps {
  className?: string;
}

export const UserProfile = ({ className }: UserProfileProps) => {
  const { user, isAdmin, isOperator, signOut } = useAuth();

  if (!user) return null;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* User avatar and name */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-logo-primary text-white flex items-center justify-center text-sm font-medium">
          {user.email?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div className="hidden md:block">
          <p className="text-sm font-medium text-gray-900">
            {user.email}
          </p>
          <p className="text-xs text-gray-500">
            {isAdmin ? 'Admin' : isOperator ? 'Operador' : 'Usuario'}
          </p>
        </div>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </div>

      {/* Logout button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={signOut}
        className="text-gray-500 hover:text-red-600 hover:bg-red-50"
      >
        <LogOut className="w-4 h-4" />
      </Button>
    </div>
  );
};

// User menu dropdown component
export const UserMenu = ({ className }: UserProfileProps) => {
  const { user, isAdmin, isOperator, signOut } = useAuth();

  if (!user) return null;

  return (
    <div className={cn('relative group', className)}>
      <button className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors">
        <div className="w-10 h-10 rounded-full bg-logo-primary text-white flex items-center justify-center text-sm font-medium">
          {user.email?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium">{user.email}</p>
          <p className="text-xs text-gray-500">
            {isAdmin ? 'Admin' : isOperator ? 'Operador' : 'Usuario'}
          </p>
        </div>
      </button>

      {/* Dropdown menu */}
      <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        <div className="p-4 border-b border-gray-100">
          <p className="font-medium text-gray-900">{user.email}</p>
          <p className="text-sm text-gray-500">
            {isAdmin ? 'Administrador' : isOperator ? 'Operador' : 'Usuario'}
          </p>
        </div>
        <div className="py-1">
          <button
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            onClick={signOut}
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
};