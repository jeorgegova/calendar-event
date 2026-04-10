import { useState, useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Calendar, Settings, Users, Bell, LogOut, Tags, List, CalendarDays, Clock, UserCircle, Cog } from "lucide-react";
import { cn } from "../../lib/utils";
import { supabase } from "../../lib/supabase";

import { LoginModal } from "../auth/LoginModal";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useUserProfile } from "../../hooks/useUserProfile";

const NAV_ITEMS = [
  { label: "Calendario", icon: Calendar, path: "/" },
  { label: "Eventos", icon: Calendar, path: "/eventos", roles: ['admin', 'operador'] },
  { label: "Comités", icon: Tags, path: "/comites", roles: ['admin', 'operador'] },
  { label: "Notificaciones", icon: Bell, path: "/avisos", roles: ['admin', 'operador'] },
  { label: "Parámetros", icon: Cog, path: "/parametros", roles: ['admin'] },
  { label: "Usuarios", icon: Users, path: "/usuarios", roles: ['admin'] },
  { label: "Auditoría", icon: Settings, path: "/auditoria", roles: ['admin'] },
];

export const AppLayout = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { isAuthenticated, hasPermission, profile } = useUserProfile();
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [isLogoutModalOpen, setLogoutModalOpen] = useState(false);
  const [activeView, setActiveView] = useState("dayGridMonth");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);



  // Close login modal when authenticated
  useEffect(() => {
    if (isAuthenticated && isLoginModalOpen) {
      setLoginModalOpen(false);
    }
  }, [isAuthenticated, isLoginModalOpen]);

  // Listen for view changes from the calendar
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === "string") setActiveView(detail);
    };
    window.addEventListener("calendar:viewChanged", handler);
    return () => window.removeEventListener("calendar:viewChanged", handler);
  }, []);

  const handleLogout = async () => {
    setLogoutModalOpen(true);
  };

  const confirmLogout = async () => {
    try {
      await supabase.auth.signOut();
      // Recargar la página para asegurar que todos los componentes se actualicen
      window.location.reload();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  // Scroll to notifications section (mobile bottom nav)
  const scrollToNotifications = () => {
    const el = document.getElementById("notifications-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Dispatch view switch to calendar
  const switchView = (view: string) => {
    window.dispatchEvent(new CustomEvent("calendar:switchView", { detail: view }));
  };

  // Items for the mobile bottom tab bar
  const mobileBottomItems = [
    { label: "Mes", icon: Calendar, viewKey: "dayGridMonth", action: () => switchView("dayGridMonth") },
    { label: "Semana", icon: CalendarDays, viewKey: "timeGridWeek", action: () => switchView("timeGridWeek") },
    { label: "Día", icon: Clock, viewKey: "timeGridDay", action: () => switchView("timeGridDay") },
    { label: "Lista", icon: List, viewKey: "listMonth", action: () => switchView("listMonth") },
    { label: "Avisos", icon: Bell, viewKey: "_avisos", action: scrollToNotifications, isScroll: true },
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex flex-col font-sans w-full overflow-x-hidden">
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setLoginModalOpen(false)} />

      {/* Modal de Confirmación de Logout */}
      <Modal
        isOpen={isLogoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        title={
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center">
              <LogOut size={20} className="text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1d1d1f] tracking-tight">
                Cerrar Sesión
              </h2>
              <p className="text-sm text-[#86868b] mt-0.5">
                ¿Estás seguro de que quieres cerrar tu sesión?
              </p>
            </div>
          </div>
        }
        className="max-w-sm"
      >
        <div className="space-y-6">
          <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              </div>
              <div>
                <p className="text-sm text-orange-800 font-medium">Atención</p>
                <p className="text-xs text-orange-700 mt-1">
                  Se cerrará tu sesión actual y tendrás que volver a iniciar sesión para continuar.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => setLogoutModalOpen(false)}
              variant="outline"
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmLogout}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              <LogOut size={16} className="mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Top Bar (Desktop sin auth + Mobile siempre) ── */}
      <div className={cn(
        "flex items-center justify-between px-4 md:px-8 py-3 bg-white/90 backdrop-blur-xl border-b border-gray-200/80 sticky top-0 z-40",
        // En desktop, ocultar si ya está autenticado (el sidebar tiene el branding)
        isAuthenticated && !isMobile && "hidden"
      )}>
        <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-apple-blue to-[#00c6ff] tracking-tight">
          EventCalendar
        </h1>
        <div className="flex items-center gap-2">
          {!isAuthenticated ? (
            <>
              {/* Botón de silueta circular para ingresar */}
              <button
                onClick={() => setLoginModalOpen(true)}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all active:scale-95"
                title="Ingresar"
              >
                <UserCircle size={22} className="text-[#86868b]" strokeWidth={1.5} />
              </button>
            </>
          ) : (
            // Solo en mobile cuando auth — botón Menú
            isMobile && (
              <button
                className="px-3 py-1.5 text-apple-blue font-semibold text-sm outline-none active:scale-95 transition-transform rounded-full bg-apple-blue/10"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                Menú
              </button>
            )
          )}
        </div>
      </div>

      {/* Backdrop para el menú móvil */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ── Contenido principal (sidebar + main) ── */}
      <div className="flex-1 flex flex-row">

        {/* Sidebar — Solo visible cuando está autenticado (o como slide-over en mobile) */}
        {(isAuthenticated || isMobileMenuOpen) && (
          <aside
            className={cn(
              "fixed md:sticky top-0 left-0 h-screen w-72 bg-white/95 backdrop-blur-xl border-r border-[#e5e5ea] border-opacity-60 z-50 flex flex-col shadow-2xl md:shadow-sm transition-transform duration-300 ease-out",
              isMobile
                ? (isMobileMenuOpen ? "translate-x-0" : "-translate-x-full")
                : "translate-x-0"
            )}
          >
            <div className="p-6 flex justify-between items-center">
              <div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-apple-blue to-[#00c6ff] tracking-tight">
                  EventCalendar
                </h1>
                <div className="text-xs text-[#86868b] mt-1">
                  {profile ? (
                    <>
                      {profile.role === 'admin' ? 'Administrador' : 'Operador'}
                      {profile.role === 'operador' && profile.active_until && (
                        <span className="ml-2 text-orange-600">
                          (hasta {new Date(profile.active_until).toLocaleDateString('es-ES')})
                        </span>
                      )}
                    </>
                  ) : (
                    'Cargando perfil...'
                  )}
                </div>
              </div>
              {isMobileMenuOpen && (
                <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              )}
            </div>

            <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">

              {NAV_ITEMS.map((item) => {
                const isActive = location.pathname === item.path;

                // Mostrar items basado en autenticación y permisos
                const hasRequiredRole = !item.roles || item.roles.some(role => hasPermission(role as 'admin' | 'operador'));
                const showItem = isAuthenticated && hasRequiredRole;

                if (!showItem) return null;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium transition-all active:scale-95",
                      isActive
                        ? "bg-apple-blue text-white neon-blue"
                        : "text-[#86868b] hover:bg-gray-100 hover:text-[#1d1d1f]"
                    )}
                  >
                    <item.icon size={20} className={cn(isActive && "text-white")} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            
            <div className="p-4 border-t border-gray-100 bg-white">
              {isAuthenticated ? (
                <button onClick={handleLogout} className="flex items-center justify-center md:justify-start gap-3 w-full px-3 py-3 rounded-xl text-[15px] font-medium text-[#ff3b30] bg-[#ff3b30]/5 hover:bg-[#ff3b30]/15 active:scale-95 transition-all">
                  <LogOut size={20} />
                  Cerrar Sesión
                </button>
              ) : (
                <div className="text-center w-full"></div>
              )}
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 relative flex flex-col min-h-[calc(100vh-52px)] max-w-full overflow-hidden pb-20 md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Bottom Navigation Mobile — App-like tab bar */}
      {isMobile && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-200/80 flex justify-around items-end pt-1.5 z-40 bottom-nav-safe">
          {mobileBottomItems.map((item, idx) => {
            const isActive = !item.isScroll && activeView === item.viewKey;
            return (
              <button
                key={idx}
                onClick={() => item.action?.()}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all duration-200 active:scale-90",
                  isActive
                    ? "text-apple-blue bg-apple-blue/10 neon-blue-sm"
                    : "text-[#86868b]"
                )}
              >
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className={cn("text-[10px] font-semibold", isActive && "text-apple-blue")}>{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
};
