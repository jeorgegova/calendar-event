import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

// User profile type
export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'operador';
  should_change_password: boolean;
  created_at: string;
  avatar_url?: string;
  active_until?: string | null;
  is_active?: boolean;
  email_confirmed?: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isOperator: boolean;
  hasPermission: (requiredRole?: 'admin' | 'operador') => boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// In-memory cache for profiles (survives re-renders, cleared on sign-out)
const profileCache = new Map<string, UserProfile>();

// Create auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth provider component — SINGLE source of truth for auth + profile
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);

  // Fetch profile from Supabase (with cache)
  const fetchProfile = useCallback(async (authUser: User, skipCache = false) => {
    // Prevent concurrent fetches for the same user
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      // Check cache first — instant UI
      if (!skipCache) {
        const cached = profileCache.get(authUser.id);
        if (cached) {
          setProfile(cached);
          setLoading(false);
          fetchingRef.current = false;

          // Background revalidation (stale-while-revalidate)
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single();

          if (data) {
            profileCache.set(authUser.id, data);
            setProfile(data);
          }
          return;
        }
      }

      // No cache — fetch fresh
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.warn('User profile not found for:', authUser.id);
        } else {
          console.error('Error fetching profile:', error);
        }
        setProfile(null);
      } else if (data) {
        // Enforce account activity check
        const isExpired = data.active_until && new Date(data.active_until) < new Date();
        const isActive = data.is_active !== false;

        if (!isActive || isExpired) {
          console.warn('Blocked inactive/expired account login:', authUser.id);
          await supabase.auth.signOut();
          setProfile(null);
          setUser(null);
          profileCache.delete(authUser.id);
          
          // Dispatch a custom event for the login modal to catch
          window.dispatchEvent(new CustomEvent('auth:inactive_account', { 
            detail: !isActive ? 'Esta cuenta se encuentra inactiva' : 'Tu acceso ha vencido' 
          }));
          return;
        }

        profileCache.set(authUser.id, data);
        setProfile(data);
      }
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
      setProfile(null);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  // Step 1: Listen for auth state changes (ONLY synchronous state updates here)
  // Step 2: Separate useEffect to fetch profile when user changes
  useEffect(() => {
    let mounted = true;

    // Set up the auth listener FIRST (Supabase v2 best practice)
    // This fires INITIAL_SESSION immediately, then SIGNED_IN / SIGNED_OUT / TOKEN_REFRESHED
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT') {
          // Clear everything immediately
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        if (session?.user) {
          setUser(session.user);

          // For SIGNED_IN, clear cache so profile is fetched fresh
          if (event === 'SIGNED_IN') {
            profileCache.delete(session.user.id);
          }

          // Fetch profile asynchronously — DO NOT await inside onAuthStateChange
          // Use setTimeout(0) to avoid blocking the Supabase SDK callback
          setTimeout(() => {
            if (mounted) {
              fetchProfile(session.user, event === 'SIGNED_IN');
            }
          }, 0);
        } else {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      // Clear cache
      if (user) {
        profileCache.delete(user.id);
      }
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }, [user]);

  // Refresh profile (force re-fetch)
  const refreshProfile = useCallback(async () => {
    if (user) {
      profileCache.delete(user.id);
      fetchingRef.current = false; // Reset guard
      await fetchProfile(user, true);
    }
  }, [user, fetchProfile]);

  // Derived values
  const isAdmin = profile?.role === 'admin';
  const isOperator = profile?.role === 'operador' || isAdmin;

  const hasPermission = useCallback(
    (requiredRole?: 'admin' | 'operador'): boolean => {
      if (!profile) return false;
      if (!requiredRole) return true;
      if (requiredRole === 'admin') return isAdmin;
      if (requiredRole === 'operador') return isOperator;
      return false;
    },
    [profile, isAdmin, isOperator]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAuthenticated: profile !== null,
        isAdmin,
        isOperator,
        hasPermission,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};