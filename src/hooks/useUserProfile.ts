import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'operador';
  active_until: string | null;
  is_active: boolean;
  created_at: string;
}

export const useUserProfile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const getProfile = async (user: User) => {
      try {
        console.log('🔍 Starting profile fetch for user:', user.id);

        // Timeout para la consulta individual (3 segundos)
        const queryPromise = (async () => {
        // Crear el perfil primero (siempre intentar crear/actualizar)
        console.log('🔧 Attempting to create/update profile...');
        const { error: upsertError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email || 'unknown@example.com',
            role: 'admin',
            is_active: true
          }, {
            onConflict: 'id'
          });

        if (upsertError) {
          console.log('❌ Upsert failed:', upsertError);
          // Si el upsert falló, intentar leer directamente
          const { data: readResult, error: readError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          console.log('📖 Read result:', { data: readResult, error: readError });

          if (readResult && !readError) {
            console.log('✅ Profile read successfully:', readResult);
            return readResult as UserProfile;
          }
        } else {
          // Si el upsert fue exitoso, intentar leer el perfil
          const { data: readResult, error: readError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          console.log('📖 Read result after upsert:', { data: readResult, error: readError });

          if (readResult && !readError) {
            console.log('✅ Profile read after upsert:', readResult);
            return readResult as UserProfile;
          }
        }

          console.log('🔧 Upsert result:', { data: upsertResult, error: upsertError });

          if (upsertResult && !upsertError) {
            console.log('✅ Profile created/updated successfully:', upsertResult);
            return upsertResult as UserProfile;
          }

          // Si el upsert falló, intentar leer directamente
          console.log('❌ Upsert failed, trying direct read...');
          const { data: readResult, error: readError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          console.log('📖 Read result:', { data: readResult, error: readError });

          if (readResult && !readError) {
            console.log('✅ Profile read successfully:', readResult);
            return readResult as UserProfile;
          }

          return null;
        })();

        // Race between query and timeout
        const timeoutPromise = new Promise<UserProfile | null>((resolve) => {
          setTimeout(() => {
            console.log('⏱️ Query timeout (3s), giving up');
            resolve(null);
          }, 3000);
        });

        const result = await Promise.race([queryPromise, timeoutPromise]);
        return result;

      } catch (err) {
        console.error('💥 Exception in getProfile:', err);
        return null;
      }
    };

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          const profileData = await getProfile(session.user);
          if (mounted) {
            setProfile(profileData);
            console.log('Profile set in state:', profileData);
          }
        }
      } catch (err) {
        console.error('Error in getProfile:', err);
        return null;
      }
    };

    const handleAuthChange = async (_event: string, session: any) => {
      console.log('Auth state changed:', { session: !!session, user: session?.user?.id });
      if (session?.user) {
        setUser(session.user);
        const profileData = await getProfile(session.user);
        if (mounted) {
          setProfile(profileData);
          console.log('Profile set in auth change:', profileData);
        }
      } else {
        setUser(null);
        setProfile(null);
        console.log('Profile cleared');
      }
      if (mounted) {
        setLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    // Timeout más agresivo para evitar loading infinito (5 segundos)
    const timeoutId = setTimeout(() => {
      if (mounted) {
        console.log('⏰ Profile loading timeout (5s), setting loading to false');
        setLoading(false);
      }
    }, 5000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  const hasPermission = (requiredRole?: 'admin' | 'operador') => {
    const isUserAuthenticated = !!user;

    // Si está autenticado y no hay perfil aún, asumir permisos básicos para evitar bloqueo
    if (isUserAuthenticated && !profile && loading) {
      return !requiredRole || requiredRole === 'operador'; // Asumir operador por defecto
    }

    if (!profile) {
      return false;
    }

    if (!profile.is_active) {
      return false;
    }

    // Check if operator is expired
    if (profile.role === 'operador' && profile.active_until) {
      const now = new Date();
      const activeUntil = new Date(profile.active_until);
      if (now > activeUntil) {
        return false;
      }
    }

    if (requiredRole === 'admin') {
      return profile.role === 'admin';
    }

    if (requiredRole === 'operador') {
      return profile.role === 'admin' || profile.role === 'operador';
    }

    return true; // authenticated user
  };

  return {
    user,
    profile,
    loading,
    isAuthenticated: !!user,
    isAdmin: profile?.role === 'admin',
    isOperator: profile?.role === 'operador',
    hasPermission,
  };
};