import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export const LoadingScreen = () => {
  const [showLoading, setShowLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Simulate loading progress
  useEffect(() => {
    if (showLoading) {
      const timer = setInterval(() => {
        setLoadingProgress(prev => {
          const newProgress = Math.min(prev + 5, 90);
          return newProgress;
        });
      }, 100);

      return () => clearInterval(timer);
    }
  }, [showLoading]);

  // Check if we should show loading screen
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          // User exists, show loading until profile is ready
          setLoadingProgress(30);
        } else {
          // No user, hide loading screen immediately
          setShowLoading(false);
        }
      } catch (error) {
        console.error('Error checking auth state:', error);
        setShowLoading(false);
      }
    };

    checkAuthState();
  }, []);

  // Hide loading when progress is complete
  useEffect(() => {
    if (loadingProgress >= 95) {
      setTimeout(() => {
        setShowLoading(false);
      }, 500);
    }
  }, [loadingProgress]);

  if (!showLoading) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0f172a] flex items-center justify-center">
      <div className="text-center">
        <div className="mb-4">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
        <p className="text-white text-sm opacity-75">
          Cargando...
          <span className="inline-block w-20 text-right">
            {loadingProgress}%
          </span>
        </p>
      </div>
    </div>
  );
};