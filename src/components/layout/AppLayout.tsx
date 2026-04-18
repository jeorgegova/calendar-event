import { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Calendar, Settings, Users, Bell, LogOut, Tags, List, CalendarDays, Clock, UserCircle, Cog, Loader2, ChevronRight, Shield } from "lucide-react";
import { cn } from "../../lib/utils";
import { supabase } from "../../lib/supabase";

import { LoginModal } from "../auth/LoginModal";
import { Modal } from "../ui/Modal";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useNewNotices } from "../../hooks/useNewNotices";
import { useAuth } from "../../context/AuthContext";
import { formatDateUTC } from "../../lib/dateUtils";
import logo from "../../assets/logo_fondo_negro.png";

const NAV_ITEMS = [
  { label: "Calendario", icon: Calendar, path: "/" },
  { label: "Eventos", icon: Calendar, path: "/eventos", roles: ['admin', 'operador'] },
  { label: "Comités", icon: Tags, path: "/comites", roles: ['admin', 'operador'] },
  { label: "Notificaciones", icon: Bell, path: "/avisos", roles: ['admin', 'operador'] },
  { label: "Parámetros", icon: Cog, path: "/parametros", roles: ['admin'] },
  { label: "Usuarios", icon: Users, path: "/usuarios", roles: ['admin'] },
  { label: "Auditoría", icon: Settings, path: "/auditoria", roles: ['admin'] },
  { label: "Mi Perfil", icon: UserCircle, path: "/perfil", roles: ['admin', 'operador'] },
];

export const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { isAuthenticated, hasPermission, profile, loading: authLoading } = useAuth();
  const { newCount, markAllAsSeen } = useNewNotices();

  const profileReady = profile !== null;
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

  // Listen for notices viewed event (from scroll/intersection observer)
  useEffect(() => {
    const handler = () => markAllAsSeen();
    window.addEventListener("notices:viewed", handler);
    return () => window.removeEventListener("notices:viewed", handler);
  }, [markAllAsSeen]);

  const handleLogout = async () => {
    setLogoutModalOpen(true);
  };

  const confirmLogout = async () => {
    try {
      await supabase.auth.signOut();
      setLogoutModalOpen(false);
      // Redirigir al inicio para evitar quedarse en una página protegida
      navigate("/");
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  // Scroll to notifications section (mobile bottom nav)
  const scrollToNotifications = () => {
    markAllAsSeen();
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => {
        const el = document.getElementById("notifications-section");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    } else {
      const el = document.getElementById("notifications-section");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Dispatch view switch to calendar
  const switchView = (view: string) => {
    if (location.pathname !== "/") {
      navigate("/");
      // Pequeño delay para que Home.tsx se monte y escuche el evento
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("calendar:switchView", { detail: view }));
      }, 150);
    } else {
      window.dispatchEvent(new CustomEvent("calendar:switchView", { detail: view }));
    }
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
          <h2 className="text-xl font-bold text-logo-dark tracking-tight text-center">
            Cerrar Sesión
          </h2>
        }
        className="max-w-[400px]"
      >
        <div className="flex flex-col items-center text-center gap-4">
          <p className="text-[15px] text-[#86868b] mt-1">
            ¿Estás seguro que deseas cerrar sesión?
          </p>
        </div>
        <div className="flex items-center gap-3 pt-4">
          <button
            onClick={() => setLogoutModalOpen(false)}
            className="flex-1 px-4 py-3.5 rounded-2xl text-[15px] font-semibold text-[#1d1d1f] bg-gray-100 hover:bg-gray-200 active:scale-[0.98] transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={confirmLogout}
            className="flex-1 px-4 py-3.5 rounded-2xl text-[15px] font-semibold text-white bg-logo-danger hover:bg-red-700 shadow-lg shadow-red-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </Modal>

      {/* ── Top Bar (Desktop sin auth + Mobile siempre) ── */}
      <div className={cn(
        "flex items-center justify-between px-4 md:px-8 py-3 bg-white/90 backdrop-blur-xl border-b border-gray-200/80 sticky top-0 z-40",
        // En desktop, ocultar si ya tiene perfil (el sidebar tiene el branding)
        profileReady && !isMobile && "hidden"
      )}>
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="Logo IPUC" className="h-8 w-auto object-contain rounded-lg" />
          <h1 className="text-lg font-bold text-logo-dark tracking-tight leading-none">
            IPUC Colinas
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {authLoading ? (
            // Spinner sutil mientras carga la sesión
            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
              <Loader2 size={18} className="text-[#86868b] animate-spin" />
            </div>
          ) : !profileReady ? (
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
                className="px-3 py-1.5 text-logo-primary font-semibold text-sm outline-none active:scale-95 transition-transform rounded-full bg-logo-primary/10"
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

        {/* Sidebar — Solo visible cuando el perfil está cargado (o como slide-over en mobile) */}
        {(profileReady || isMobileMenuOpen) && (
          <aside
            className={cn(
              "fixed md:sticky top-0 bottom-20 md:bottom-0 left-0 w-72 bg-white z-50 flex flex-col shadow-2xl md:shadow-sm transition-transform duration-300 ease-out rounded-br-2xl md:rounded-none",
              isMobile
                ? (isMobileMenuOpen ? "translate-x-0" : "-translate-x-full")
                : "translate-x-0"
            )}
          >
            <div className="p-6 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <img src={logo} alt="Logo IPUC" className="h-10 w-auto object-contain rounded-xl" />
                  <h1 className="text-xl font-bold text-logo-dark tracking-tight leading-none">
                    IPUC Colinas
                  </h1>
                </div>
                <div className="flex flex-col mt-1">
                  {profile ? (
                    <>
                      <span className="text-sm font-semibold text-[#1d1d1f] truncate w-48">
                        {profile.full_name || 'Nuevo Usuario'}
                      </span>
                      <div className="text-[10px] text-[#86868b] flex items-center gap-1">
                        {profile.role === 'admin' ? 'Administrador' : 'Operador'}
                        {profile.role === 'operador' && profile.active_until && (
                          <span className="text-orange-600">
                            (vence: {formatDateUTC(profile.active_until, { day: '2-digit', month: '2-digit', year: 'numeric' })})
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <span className="text-xs text-[#86868b]">Cargando perfil...</span>
                  )}
                </div>
              </div>
              {isMobileMenuOpen && (
                <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
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
                      "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group relative",
                      isActive
                        ? "bg-logo-primary/10 text-logo-primary font-semibold"
                        : "text-logo-dark hover:bg-gray-50"
                    )}
                  >
                    <item.icon size={20} className={isActive ? "text-logo-primary" : "text-logo-gray group-hover:text-logo-dark transition-colors duration-300"} />
                    <span className="text-sm">{item.label}</span>
                    {isActive && (
                      <div className="absolute left-0 w-1.5 h-6 bg-logo-primary rounded-r-full shadow-[2px_0_8px_rgba(30,41,59,0.3)]" />
                    )}
                  </Link>
                );
              })}

              {/* Separator line */}
              {profileReady && <div className="border-t border-gray-200 my-2"></div>}

              {/* Logout button as last menu item */}
              {profileReady && (
                <button
                  onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group relative w-full text-logo-danger hover:bg-logo-danger/5"
                >
                  <LogOut size={20} className="text-logo-danger group-hover:text-red-700 transition-colors duration-300" />
                  <span className="text-sm">Cerrar Sesión</span>
                </button>
              )}
            </nav>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 relative flex flex-col min-h-[calc(100vh-52px)] max-w-full overflow-x-hidden pb-20 md:pb-0 bg-[#f5f5f7]">
          {/* Alerta de Seguridad (Cambio de contraseña forzado) — No mostrar en la página de perfil */}
          {isAuthenticated && profile?.should_change_password && location.pathname !== "/perfil" && (
            <div className="mx-4 md:mx-8 mt-4 mb-2 p-4 bg-orange-50 border border-orange-100 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500 z-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center shrink-0">
                  <Shield size={20} className="text-orange-600 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-orange-900 text-sm">Acción Requerida: Cambia tu contraseña</h3>
                  <p className="text-xs text-orange-800/80 mt-0.5">
                    Estás usando una contraseña temporal. Por seguridad, debes actualizarla.
                  </p>
                </div>
              </div>
              <Link
                to="/perfil"
                className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl text-xs font-bold text-orange-600 shadow-sm border border-orange-100 hover:bg-orange-50 transition-all shrink-0"
              >
                Actualizar ahora
                <ChevronRight size={14} />
              </Link>
            </div>
          )}
          <Outlet />
        </main>
      </div>

      {/* Bottom Navigation Mobile — App-like tab bar */}
      {isMobile && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-200/80 flex justify-around items-end pt-1.5 z-40 bottom-nav-safe">
          {mobileBottomItems.map((item, idx) => {
            const isActive = !item.isScroll && activeView === item.viewKey;
            const isAvisos = item.isScroll;
            const badge = isAvisos ? newCount : 0;
            return (
              <button
                key={idx}
                onClick={() => item.action?.()}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all duration-200 active:scale-90 relative",
                  isActive
                    ? "text-logo-primary bg-logo-primary/10"
                    : "text-logo-gray"
                )}
              >
                <div className="relative">
                  <item.icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                <span className={cn("text-[10px] font-semibold", isActive && "text-logo-primary")}>{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
};
