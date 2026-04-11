import { useAuth } from '../context/AuthContext';

// Re-export UserProfile type for consumers that import from here
export type { UserProfile } from '../context/AuthContext';

/**
 * Thin wrapper around useAuth() — preserves the same public interface
 * so existing consumers don't break, but all logic lives in AuthContext.
 */
export const useUserProfile = () => {
  const {
    profile,
    loading,
    isAuthenticated,
    isAdmin,
    isOperator,
    hasPermission,
    signOut,
    refreshProfile,
  } = useAuth();

  return {
    profile,
    loading,
    error: null as string | null, // kept for interface compat
    isAuthenticated,
    isAdmin,
    isOperator,
    hasPermission,
    signOut,
    refreshProfile,
  };
};