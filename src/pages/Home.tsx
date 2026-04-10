import { useRef, useEffect, useState, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import { useIsMobile } from "../hooks/useIsMobile";
import { Bell, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";
import { supabase } from "../lib/supabase";

// ── Interfaces ─────────────────────────────────────────────────────────
interface Comite {
  id: string;
  name: string;
  color_hex: string;
  is_active: boolean;
}

interface Notice {
  id: string;
  title: string;
  content: string | null;
  is_active: boolean;
  created_at: string;
}

interface Event {
  id: string;
  title: string;
  committee_id: string | null;
  event_type_id: string | null;
  start_time: string;
  end_time: string;
  motto: string | null;
  committees?: Comite;
}

// ── Eventos cargados desde Supabase ──────────────────


// ── Componente ──────────────────────────────────────────────────────────
export default function Home() {
  const isMobile = useIsMobile();
  const calendarRef = useRef<FullCalendar>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedComites, setSelectedComites] = useState<string[]>([]); // vacío = todos
  const [committees, setCommittees] = useState<Comite[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);


  // Load data from Supabase
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load committees
      const { data: committeesData, error: committeesError } = await supabase
        .from('committees')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (committeesError) throw committeesError;

      // Load events with committee info
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select(`
          *,
          committees (
            id,
            name,
            color_hex
          )
        `)
        .order('start_time');

      if (eventsError) throw eventsError;

      // Load active notices
      const { data: noticesData, error: noticesError } = await supabase
        .from('notices')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (noticesError) throw noticesError;

      setCommittees(committeesData || []);
      setEvents(eventsData || []);
      setNotices(noticesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // ── Toggle comité ──────────────────────────────────────────────────
  const toggleComite = (id: string) => {
    setSelectedComites(prev => {
      if (prev.includes(id)) {
        return prev.filter(c => c !== id);
      }
      return [...prev, id];
    });
  };

  const clearFilter = () => setSelectedComites([]);

  const isAllSelected = selectedComites.length === 0;

  // ── Filtrar eventos ────────────────────────────────────────────────
  const filteredEvents = events
    .filter(ev => selectedComites.length === 0 || (ev.committee_id && selectedComites.includes(ev.committee_id)))
    .map(ev => ({
      id: ev.id,
      title: ev.title,
      start: ev.start_time,
      end: ev.end_time,
      backgroundColor: ev.committees?.color_hex ?? "#2997ff",
      borderColor: ev.committees?.color_hex ?? "#2997ff",
      extendedProps: { committee_id: ev.committee_id },
    }));

  // ── Vista / transiciones ───────────────────────────────────────────
  useEffect(() => {
    if (calendarRef.current) {
      const api = calendarRef.current.getApi();
      if (!isMobile && api.view.type === "listMonth") {
        api.changeView("dayGridMonth");
      }
    }
  }, [isMobile]);

  const changeViewSmooth = useCallback((view: string) => {
    if (!calendarRef.current) return;
    const api = calendarRef.current.getApi();
    if (api.view.type === view) return;

    setIsTransitioning(true);
    setTimeout(() => {
      api.changeView(view);
      window.dispatchEvent(new CustomEvent("calendar:viewChanged", { detail: view }));
      setTimeout(() => setIsTransitioning(false), 50);
    }, 150);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      changeViewSmooth(e.detail);
    };
    window.addEventListener("calendar:switchView" as any, handler);
    return () => window.removeEventListener("calendar:switchView" as any, handler);
  }, [changeViewSmooth]);

  const mobileToolbar = { left: 'prev,next', center: 'title', right: 'today' };
  const desktopToolbar = { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth' };

  const handleViewDidMount = (info: { view: { type: string } }) => {
    window.dispatchEvent(new CustomEvent("calendar:viewChanged", { detail: info.view.type }));
  };

  // ── Chip de comité reutilizable ────────────────────────────────────
  const ComiteChip = ({ comite, size = "md" }: { comite: Comite; size?: "sm" | "md" }) => {
    const isActive = selectedComites.includes(comite.id);
    const sizeClasses = size === "sm"
      ? "px-2.5 py-1 text-[10px]"
      : "px-3 py-1.5 text-sm";

    return (
      <button
        onClick={() => toggleComite(comite.id)}
        className={cn(
          "rounded-full font-semibold cursor-pointer transition-all active:scale-95",
          sizeClasses,
          isActive
            ? "bg-gray-800 text-white ring-2 ring-gray-800 ring-offset-1"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        )}
        style={isActive ? { backgroundColor: comite.color_hex, color: 'white' } : {}}
      >
        {comite.name}
      </button>
    );
  };

  const TodosChip = ({ size = "md" }: { size?: "sm" | "md" }) => {
    const sizeClasses = size === "sm"
      ? "px-2.5 py-1 text-[10px]"
      : "px-3 py-1.5 text-sm";

    return (
      <button
        onClick={clearFilter}
        className={cn(
          "rounded-full font-semibold cursor-pointer transition-all active:scale-95",
          sizeClasses,
          isAllSelected
            ? "bg-apple-blue/20 text-apple-blue ring-2 ring-apple-blue ring-offset-1"
            : "bg-apple-blue/10 text-apple-blue"
        )}
      >
        Todos
      </button>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="flex-1 w-full h-full flex flex-col md:flex-row gap-0 md:gap-6 p-0 md:p-6 overflow-x-hidden">
      
      {/* Contenedor Calendario */}
      <div className="flex-1 bg-white md:rounded-3xl shadow-sm border-b md:border border-gray-100 p-3 md:p-6 flex flex-col transition-colors duration-200">
        
        <header className="flex flex-row justify-between items-center mb-3 md:mb-6 px-1 md:px-0">
          <div>
            <h2 className="text-lg md:text-2xl font-bold tracking-tight text-[#1d1d1f]">Calendario</h2>
            <p className="text-xs md:text-sm text-[#86868b] mt-0.5">Actividades programadas</p>
          </div>
        </header>

        {/* Filtros inline en mobile */}
        {isMobile && (
          <div className="flex gap-1.5 flex-wrap px-1 mb-3 overflow-x-auto scrollbar-hide">
            <TodosChip size="sm" />
            {committees.map(c => <ComiteChip key={c.id} comite={c} size="sm" />)}
          </div>
        )}

        {/* Calendar with smooth transition */}
        <div
          className="flex-1 calendar-container"
          style={{
            opacity: isTransitioning ? 0 : 1,
            transform: isTransitioning ? 'translateY(8px)' : 'translateY(0)',
            transition: 'opacity 0.2s ease, transform 0.2s ease',
          }}
        >
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            initialView="dayGridMonth"
            headerToolbar={isMobile ? mobileToolbar : desktopToolbar}
            events={filteredEvents}
            height={isMobile ? "auto" : "100%"}
            contentHeight={isMobile ? "auto" : undefined}
            dayMaxEvents={isMobile ? 2 : true}
            locale="es"
            fixedWeekCount={false}
            buttonText={{
              today: 'Hoy',
              month: 'Mes',
              week: 'Semana',
              day: 'Día',
              list: 'Lista'
            }}
            viewDidMount={handleViewDidMount}
          />
        </div>
      </div>

      {/* Panel Lateral Derecho — Solo visible en desktop */}
      {!isMobile && (
        <div className="w-80 flex flex-col gap-6">
          {/* Filtros por comité */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-[#1d1d1f] mb-4">Comités</h3>
            <div className="flex flex-wrap gap-2">
              <TodosChip />
              {committees.map(c => <ComiteChip key={c.id} comite={c} />)}
            </div>
            {!isAllSelected && (
              <p className="text-xs text-[#86868b] mt-3">
                Mostrando: {selectedComites.map(id => committees.find(c => c.id === id)?.name).join(", ")}
              </p>
            )}
          </div>

          {/* Avisos */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 flex-1 overflow-y-auto min-h-[300px]">
            <h3 className="font-semibold text-[#1d1d1f] mb-4 flex items-center gap-2">
              <Bell size={18} className="text-apple-blue" />
              Notificaciones y Avisos
            </h3>
            <div className="space-y-3">
              {notices.length > 0 ? (
                notices.map((notice) => (
                  <div key={notice.id} className="p-4 rounded-2xl bg-[#f5f5f7] border border-gray-100 hover:bg-gray-50 transition-all duration-200 cursor-pointer tap-card">
                    <h4 className="font-semibold text-[#1d1d1f] text-sm">{notice.title}</h4>
                    {notice.content && (
                      <p className="text-xs text-[#86868b] mt-1 leading-relaxed">{notice.content}</p>
                    )}
                    <p className="text-xs text-[#86868b] mt-2">
                      {new Date(notice.created_at).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-[#86868b]">No hay avisos activos</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notificaciones en Mobile — Sección scrolleable debajo del calendario */}
      {isMobile && (
        <div id="notifications-section" className="px-4 pt-4 pb-24">
          <h3 className="font-semibold text-[#1d1d1f] mb-3 flex items-center gap-2 text-base">
            <Bell size={18} className="text-apple-blue" />
            Avisos
          </h3>
          <div className="space-y-2.5">
            {notices.length > 0 ? (
              notices.map((notice) => (
                <div key={notice.id} className="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-sm active:bg-gray-50 transition-all duration-150 cursor-pointer tap-card">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-[#1d1d1f] text-sm">{notice.title}</h4>
                      {notice.content && (
                        <p className="text-xs text-[#86868b] mt-0.5 leading-relaxed">{notice.content}</p>
                      )}
                      <p className="text-xs text-[#86868b] mt-1">
                        {new Date(notice.created_at).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 ml-2 shrink-0" />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-[#86868b]">No hay avisos activos</p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
