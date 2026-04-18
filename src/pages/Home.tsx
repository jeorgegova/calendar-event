import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import { useIsMobile } from "../hooks/useIsMobile";
import { Bell, Clock, Tag } from "lucide-react";
import { cn } from "../lib/utils";
import { supabase } from "../lib/supabase";
import { formatDateUTC, formatTimeUTC } from "../lib/dateUtils";
import { createPortal } from "react-dom";
import bibleData from "../assets/RVR1960-Spanish.json";

// ── Interfaces ─────────────────────────────────────────────────────────
interface Comite {
  id: string;
  name: string;
  color_hex: string;
  is_active: boolean;
}

// ── Eventos cargados desde Supabase ──────────────────

const ALLOWED_BOOKS = new Set([
  "Salmos",
  "Proverbios",
  "Mateo", "Marcos", "Lucas", "Juan", "Hechos", "Romanos",
  "1 Corintios", "2 Corintios", "Gálatas", "Efesios",
  "Filipenses", "Colosenses", "1 Tesalonicenses", "2 Tesalonicenses",
  "1 Timoteo", "2 Timoteo", "Tito", "Filemón",
  "Hebreos", "Santiago", "1 Pedro", "2 Pedro",
  "1 Juan", "2 Juan", "3 Juan", "Judas", "Apocalipsis"
]);

const FALLBACK_VERSES = [
  { content: "Todo lo puedo en Cristo que me fortalece. - Filipenses 4:13" },
  { content: "El Señor es mi pastor, nada me faltará. - Salmos 23:1" },
  { content: "Jehová es mi luz y mi salvación; ¿de quién temeré? - Salmos 27:1" }
];

// Procesar versículos del archivo local
const processLocalVerses = () => {
  const verses = [];
  const bibleDataTyped = bibleData as any; // Type assertion para evitar errores de TypeScript

  for (const bookName of ALLOWED_BOOKS) {
    if (bibleDataTyped[bookName]) {
      const book = bibleDataTyped[bookName];
      for (const chapter in book) {
        for (const verse in book[chapter]) {
          verses.push({
            book: bookName,
            chapter: parseInt(chapter),
            verse: parseInt(verse),
            content: book[chapter][verse]
          });
        }
      }
    }
  }
  return verses;
};

const LOCAL_VERSES = processLocalVerses();

// ── Componente ──────────────────────────────────────────────────────────
export default function Home() {
  const isMobile = useIsMobile();
  const calendarRef = useRef<FullCalendar>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedComites, setSelectedComites] = useState<string[]>([]); // vacío = todos
  const [hoveredEvent, setHoveredEvent] = useState<any>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [seenRevision, setSeenRevision] = useState(0);
  const [animStopped, setAnimStopped] = useState(false);

  useEffect(() => {
    if (!isMobile) return;
    const tryObserve = () => {
      const section = document.getElementById("notifications-section");
      if (!section) return null;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            window.dispatchEvent(new CustomEvent("notices:viewed"));
          }
        },
        { threshold: 0.2 }
      );
      observer.observe(section);
      return observer;
    };
    let observer = tryObserve();
    if (!observer) {
      const id = requestAnimationFrame(() => {
        observer = tryObserve();
      });
      return () => {
        cancelAnimationFrame(id);
        observer?.disconnect();
      };
    }
    return () => observer?.disconnect();
  }, [isMobile]);


  // Track desktop breakpoint
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);



  // Fetch committees with React Query
  const { data: committees = [], error: committeesError } = useQuery({
    queryKey: ['committees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('committees')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch all events with React Query for immediate display
  const eventsQuery = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const { data, error } = await supabase
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
      if (error) throw error;
      return data || [];
    },
    staleTime: 0, // Always refetch for immediate updates
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const events = eventsQuery.data || [];
  const eventsError = eventsQuery.error;

  // Fetch notices with React Query
  const { data: noticesData = [], error: noticesError } = useQuery({
    queryKey: ['notices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch verse of the day from local file
  const { data: verseOfTheDay, error: verseError } = useQuery({
    queryKey: ['verse-of-day'],
    queryFn: async () => {
      const today = new Date();
      const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      let seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
      seed = Math.imul(seed ^ 0x5DEECE66D, 0x12345) ^ 0xBF58476D;
      const rand = () => {
        seed |= 0; seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
      rand();
      rand();
      rand();

      try {
        if (LOCAL_VERSES.length > 0) {
          const verseIndex = Math.floor(rand() * LOCAL_VERSES.length);
          const selectedVerse = LOCAL_VERSES[verseIndex];

          return {
            id: `verse-${dateKey}`,
            title: "Versículo del Día",
            content: `${selectedVerse.content} - ${selectedVerse.book} ${selectedVerse.chapter}:${selectedVerse.verse}`,
            is_active: true,
            created_at: today.toISOString()
          };
        }
      } catch (err) {
        console.error('Error processing local verses', err);
      }

      const fallbackVerse = FALLBACK_VERSES[Math.floor(rand() * FALLBACK_VERSES.length)];

      return {
        id: `verse-${dateKey}`,
        title: "Versículo del Día",
        content: fallbackVerse.content,
        is_active: true,
        created_at: today.toISOString()
      };
    },
    staleTime: 24 * 60 * 60 * 1000,
  });

  // Log errors for debugging
  useEffect(() => {
    if (committeesError) console.error('Error loading committees:', committeesError);
    if (eventsError) console.error('Error loading events:', eventsError);
    if (noticesError) console.error('Error loading notices:', noticesError);
    if (verseError) console.error('Error loading verse:', verseError);
  }, [committeesError, eventsError, noticesError, verseError]);

  // Combine notices with verse
  const notices = useMemo(() => {
    return verseOfTheDay ? [verseOfTheDay, ...noticesData] : noticesData;
  }, [verseOfTheDay, noticesData]);

  useEffect(() => {
    try {
      localStorage.setItem('_latest_notice_ids', JSON.stringify(notices.map((n) => n.id)));
    } catch { /* */ }
  }, [notices]);

  const unseenIds = useMemo(() => {
    try {
      const raw = localStorage.getItem('seen_notice_ids');
      const seen: string[] = raw ? JSON.parse(raw) : [];
      const seenSet = new Set(seen);
      return new Set(notices.filter((n) => !seenSet.has(n.id)).map((n) => n.id));
    } catch {
      return new Set<string>();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notices, seenRevision]);

  useEffect(() => {
    const count = unseenIds.size;
    localStorage.setItem('_unseen_count', String(count));
    window.dispatchEvent(new CustomEvent('notices:unseenCount', { detail: count }));
  }, [unseenIds]);

  useEffect(() => {
    const markSeen = () => {
      if (notices.length === 0) return;
      try {
        const raw = localStorage.getItem('seen_notice_ids');
        const seen: string[] = raw ? JSON.parse(raw) : [];
        const seenSet = new Set(seen);
        let changed = false;
        for (const n of notices) {
          if (!seenSet.has(n.id)) {
            seenSet.add(n.id);
            changed = true;
          }
        }
        if (changed) {
          localStorage.setItem('seen_notice_ids', JSON.stringify([...seenSet].slice(-100)));
          setSeenRevision((r) => r + 1);
          setAnimStopped(false);
          const timer = setTimeout(() => setAnimStopped(true), 6500);
          return () => clearTimeout(timer);
        }
      } catch { /* ignore */ }
    };
    const handler = () => {
      const cleanup = markSeen();
      return cleanup;
    };
    window.addEventListener("notices:viewed", handler);
    return () => window.removeEventListener("notices:viewed", handler);
  }, [notices]);

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
  const filteredEvents = useMemo(() => {
    return events
      .filter(ev => selectedComites.length === 0 || (ev.committee_id && selectedComites.includes(ev.committee_id)))
      .map(ev => ({
        id: ev.id,
        title: ev.title,
        start: ev.start_time,
        end: ev.end_time,
        backgroundColor: ev.committees?.color_hex ?? "#2997ff",
        borderColor: ev.committees?.color_hex ?? "#2997ff",
        extendedProps: {
          committee_id: ev.committee_id,
          committeeName: ev.committees?.name,
          motto: ev.motto,
          startTime: ev.start_time,
          endTime: ev.end_time
        },
      }));
  }, [events, selectedComites]);

  // ── Vista / transiciones ───────────────────────────────────────────
  // Para que el calendario resalte "Hoy" correctamente según la hora local 
  // pero mantenga la lógica UTC para los eventos.
  const getCalendarNow = () => {
    const local = new Date();
    // Formato: YYYY-MM-DDTHH:mm:ss (sin Z para que FC lo trate como su tiempo base)
    const year = local.getFullYear();
    const month = String(local.getMonth() + 1).padStart(2, '0');
    const day = String(local.getDate()).padStart(2, '0');
    const hours = String(local.getHours()).padStart(2, '0');
    const minutes = String(local.getMinutes()).padStart(2, '0');
    const seconds = String(local.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };

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

  const mobileToolbar = { left: '', center: 'prev title next', right: 'today' };
  const desktopToolbar = { left: 'today', center: 'prev title next', right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth' };

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
          "rounded-full font-bold cursor-pointer transition-all active:scale-95 border",
          sizeClasses,
          isActive
            ? "shadow-sm ring-2 ring-offset-1"
            : "hover:shadow-sm"
        )}
        style={{
          backgroundColor: isActive ? comite.color_hex : `${comite.color_hex}1a`, // 1a = ~10% opacity
          color: isActive ? 'white' : comite.color_hex,
          borderColor: isActive ? comite.color_hex : `${comite.color_hex}40`, // 40 = ~25% opacity
          ...({ '--tw-ring-color': comite.color_hex } as React.CSSProperties)
        }}
      >
        {comite.name}
      </button>
    );
  };

  // ── Handlers de Tooltip ──────────────────────────────────────────
  const handleMouseEnter = (info: any) => {
    if (isMobile) return;
    const { event, jsEvent } = info;
    setHoveredEvent(event);
    setTooltipPos({ x: jsEvent.clientX, y: jsEvent.clientY });
  };

  const handleMouseLeave = () => {
    setHoveredEvent(null);
  };

  // ── Helper para determinar si un evento ya pasó ───────────────────
  const isEventPast = (endTime: string) => {
    const eventEnd = new Date(endTime);
    const now = new Date();
    return eventEnd < now;
  };

  // ── Custom Event Content para todas las vistas ─────────────────────
  const renderEventContent = (eventInfo: any) => {
    const isPast = isEventPast(eventInfo.event.extendedProps.endTime);
    const eventClasses = isPast ? 'opacity-60' : 'opacity-100';
    // Vista de LISTA (Detalle completo)
    if (eventInfo.view.type.includes('list')) {
      return (
        <div className={cn("flex flex-col gap-1 py-1 w-full min-w-0", eventClasses)}>
          <span className="font-bold text-[#1d1d1f] text-sm truncate">{eventInfo.event.title}</span>

          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white truncate max-w-[80px]"
              style={{ backgroundColor: eventInfo.event.backgroundColor }}
            >
              {eventInfo.event.extendedProps.committeeName || 'General'}
            </span>
            <div className="flex items-center gap-1 text-xs text-[#86868b] shrink-0">
              <Clock size={12} className="text-logo-primary" />
              <span className="whitespace-nowrap">
                {formatTimeUTC(eventInfo.event.extendedProps.startTime)} - {formatTimeUTC(eventInfo.event.extendedProps.endTime)}
              </span>
            </div>
          </div>

          {eventInfo.event.extendedProps.motto && (
            <div className="flex items-center gap-1 italic underline decoration-gray-200 decoration-1 text-xs text-[#86868b] min-w-0">
              <Tag size={12} className="text-gray-400 shrink-0" />
              <span className="truncate">"{eventInfo.event.extendedProps.motto}"</span>
            </div>
          )}
        </div>
      );
    }

    // Vista de SEMANA / DÍA (Espacio vertical)
    if (eventInfo.view.type.includes('timeGrid')) {
      return (
        <div className={cn("flex flex-col gap-1 p-1 w-full h-full overflow-hidden leading-tight", eventClasses)}>
          <span className="font-bold text-white text-[11px] leading-none mb-0.5">
            {eventInfo.event.title}
          </span>
          <div className="flex flex-col gap-0.5 opacity-90">
            <span className="text-[9px] font-bold bg-white/20 text-white px-1.5 py-0.5 rounded-sm w-fit">
              {eventInfo.event.extendedProps.committeeName || 'General'}
            </span>
            <div className="flex items-center gap-1 text-[9px] text-white font-medium">
              <Clock size={10} strokeWidth={3} />
              {formatTimeUTC(eventInfo.event.extendedProps.startTime)}
            </div>
          </div>
          {eventInfo.event.extendedProps.motto && (
            <div className="mt-1 border-t border-white/20 pt-1 italic text-[9px] text-white/90 truncate">
              "{eventInfo.event.extendedProps.motto}"
            </div>
          )}
        </div>
      );
    }

    // Vista de MES / REJILLA (Compacto)
    return (
      <div className={cn("flex items-center gap-1 px-1 py-0.5 overflow-hidden w-full group", eventClasses)}>
        <div
          className="w-2 h-2 rounded-full shrink-0 shadow-sm"
          style={{ backgroundColor: eventInfo.event.backgroundColor }}
        />
        <span className="text-[9px] md:text-[10px] font-bold text-[#1d1d1f] shrink-0 opacity-80">
          {formatTimeUTC(eventInfo.event.extendedProps.startTime)}
        </span>
        <span className="text-[10px] md:text-[11px] font-medium text-[#1d1d1f] truncate leading-tight">
          {eventInfo.event.title}
        </span>
      </div>
    );
  };

  const handleEventClick = (info: any) => {
    if (isMobile) {
      const { event, jsEvent } = info;
      if (hoveredEvent?.id === event.id) {
        setHoveredEvent(null);
      } else {
        setHoveredEvent(event);
        setTooltipPos({ x: jsEvent.clientX, y: jsEvent.clientY });
      }
    }
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
            ? "bg-logo-primary/20 text-logo-primary ring-2 ring-logo-primary ring-offset-1"
            : "bg-logo-primary/10 text-logo-primary"
        )}
      >
        Todos
      </button>
    );
  };

  // ── Render Helpers ──────────────────────────────────────────────────
  const renderComites = () => (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 shrink-0">
      <h3 className="font-semibold text-[#1d1d1f] mb-4">Comités</h3>
      <div className="flex flex-wrap gap-2">
        <TodosChip />
        {committees.map((c) => (
          <ComiteChip key={c.id} comite={c} />
        ))}
      </div>
      {!isAllSelected && (
        <p className="text-xs text-[#86868b] mt-3">
          Mostrando: {selectedComites.map((id) => committees.find((c) => c.id === id)?.name).join(", ")}
        </p>
      )}
    </div>
  );

  const renderAvisos = () => (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 flex-1 overflow-y-auto min-h-0 flex flex-col">
      <h3 className="font-semibold text-[#1d1d1f] mb-4 flex items-center gap-2 shrink-0">
        <Bell size={18} className="text-logo-primary" />
        Notificaciones y Avisos
      </h3>
      <div className="space-y-3 flex-1">
        {notices.length > 0 ? (
          notices.map((notice) => {
            const isNew = unseenIds.has(notice.id);
            return (
              <div key={notice.id} className={cn(
                "p-4 rounded-2xl border",
                isNew && !animStopped ? "notice-new" : isNew && animStopped ? "notice-new-stopped" : "bg-[#f5f5f7] border-gray-100"
              )}>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-[#1d1d1f] text-sm">{notice.title}</h4>
                  {isNew && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500 text-white shrink-0">NUEVO</span>
                  )}
                </div>
                {notice.content && (
                  <p className="text-xs text-[#86868b] mt-1 leading-relaxed">{notice.content}</p>
                )}
                <p className="text-xs text-[#86868b] mt-2">{formatDateUTC(notice.created_at)}</p>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-[#86868b]">No hay avisos activos</p>
          </div>
        )}
      </div>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className={cn("flex-1 w-full flex flex-col lg:flex-row gap-4 md:gap-6 p-4 md:p-6 overflow-x-hidden", isDesktop && "h-full")}>

      {/* Comités (Modo Tablet) — Arriba del calendario */}
      {!isMobile && (
        <div className="w-full lg:hidden order-1">
          {renderComites()}
        </div>
      )}

      {/* Contenedor Calendario */}
      <div className="flex-1 bg-white md:rounded-3xl shadow-sm border-b md:border border-gray-100 p-3 md:p-6 flex flex-col transition-colors duration-200 order-1">

        <header className="flex flex-row justify-between items-center mb-3 md:mb-6 px-1 md:px-0">
          <div>
            <h2 className="text-lg md:text-2xl font-bold tracking-tight text-[#1d1d1f]">Calendario</h2>
            <p className="text-xs md:text-sm text-[#86868b] mt-0.5">Actividades programadas</p>
          </div>
        </header>

        {/* Filtros inline en mobile */}
        {isMobile && (
          <div className="flex gap-1.5 flex-wrap px-1 py-1 mb-3 overflow-x-auto scrollbar-hide items-center">
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
            timeZone="UTC"
            now={getCalendarNow()}
            headerToolbar={isMobile ? mobileToolbar : desktopToolbar}
            events={filteredEvents}
            height={isDesktop ? "100%" : "auto"}
            contentHeight={isDesktop ? undefined : "auto"}
            dayMaxEvents={isMobile ? 2 : true}
            locale="es"
            navLinks={true}
            navLinkDayClick={(date) => {
              if (calendarRef.current) {
                const api = calendarRef.current.getApi();
                api.gotoDate(date);
                changeViewSmooth('timeGridDay');
              }
            }}
            fixedWeekCount={false}
            buttonText={{
              today: 'Hoy',
              month: 'Mes',
              week: 'Semana',
              day: 'Día',
              list: 'Lista'
            }}
            allDayText="Todo el día"
            viewDidMount={handleViewDidMount}
            eventMouseEnter={handleMouseEnter}
            eventMouseLeave={handleMouseLeave}
            eventClick={handleEventClick}
            eventContent={renderEventContent}
            moreLinkText={(n) => `+${n} más`}
            moreLinkClick="popover"
          />
        </div>

        {/* Portal de Tooltip Inteligente */}
        {hoveredEvent && createPortal(
          <div
            className="fixed z-[9999] pointer-events-none"
            onClick={() => isMobile && setHoveredEvent(null)}
            style={{
              left: tooltipPos.x + 15,
              top: tooltipPos.y + 15,
              transform: `translate(${tooltipPos.x + 240 > window.innerWidth ? (isMobile ? '-105%' : '-100%') : '0'
                }, ${tooltipPos.y + 180 > window.innerHeight ? (isMobile ? '-105%' : '-100%') : '0'
                })`
            }}
          >
            <div className={cn(
              "bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 w-60 animate-in fade-in zoom-in duration-200 pointer-events-auto",
              isMobile && "ring-4 ring-black/5"
            )}>
              {isMobile && (
                <button
                  onClick={() => setHoveredEvent(null)}
                  className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-gray-100 rounded-full text-gray-500"
                >
                  ×
                </button>
              )}
              <div
                className="w-full h-1.5 rounded-full mb-3"
                style={{ backgroundColor: hoveredEvent.backgroundColor }}
              />
              <h4 className="font-bold text-[#1d1d1f] text-sm mb-2 leading-tight">
                {hoveredEvent.title}
              </h4>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-[#86868b]">
                  <Clock size={14} className="text-logo-primary" />
                  <span>
                    {formatTimeUTC(hoveredEvent.extendedProps.startTime)} - {formatTimeUTC(hoveredEvent.extendedProps.endTime)}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#1d1d1f] font-medium">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: hoveredEvent.backgroundColor }}
                  />
                  <span>{hoveredEvent.extendedProps.committeeName || 'General'}</span>
                </div>

                {hoveredEvent.extendedProps.motto && (
                  <div className="mt-3 p-2 bg-gray-50 rounded-lg italic text-[11px] text-[#86868b] border-l-2 border-gray-200">
                    "{hoveredEvent.extendedProps.motto}"
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>

      {/* Avisos (Modo Tablet) — Abajo del calendario */}
      {!isMobile && (
        <div className="w-full lg:hidden order-2 pt-2">
          {renderAvisos()}
        </div>
      )}

      {/* Panel Lateral Derecho (Modo Desktop) */}
      {!isMobile && (
        <div className="hidden lg:flex w-80 flex-col gap-6 order-2 shrink-0">
          {renderComites()}
          {renderAvisos()}
        </div>
      )}

      {/* Notificaciones en Mobile — Sección scrolleable debajo del calendario */}
      {isMobile && (
        <div id="notifications-section" className="px-4 pt-4 pb-24 order-2">
          <h3 className="font-semibold text-[#1d1d1f] mb-3 flex items-center gap-2 text-base">
            <Bell size={18} className="text-logo-primary" />
            Avisos
          </h3>
          <div className="space-y-2.5">
            {notices.length > 0 ? (
              notices.map((notice) => {
                const isNew = unseenIds.has(notice.id);
                return (
                  <div key={notice.id} className={cn(
                    "p-3.5 rounded-2xl bg-white border shadow-sm",
                    isNew && !animStopped ? "notice-new" : isNew && animStopped ? "notice-new-stopped" : "border-gray-100"
                  )}>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-[#1d1d1f] text-sm">{notice.title}</h4>
                        {isNew && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500 text-white shrink-0">NUEVO</span>
                        )}
                      </div>
                      {notice.content && (
                        <p className="text-xs text-[#86868b] mt-0.5 leading-relaxed">{notice.content}</p>
                      )}
                      <p className="text-xs text-[#86868b] mt-1">
                        {formatDateUTC(notice.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
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
