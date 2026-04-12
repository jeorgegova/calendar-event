import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Calendar, Clock, Users, Tag, Info, CheckCircle2 } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { useUserProfile } from "../hooks/useUserProfile";
import { useConfirm } from "../context/ConfirmContext";
import { supabase } from "../lib/supabase";
import { formatDateUTC, formatTimeUTC, toUTCInputFormat, fromInputToUTC } from "../lib/dateUtils";
import { cn } from "../lib/utils";
import { getSpanishValidationProps } from "../lib/formUtils";


interface Committee {
  id: string;
  name: string;
  color_hex: string;
  is_active: boolean;
}

interface EventType {
  id: string;
  name: string;
}

interface RequestType {
  id: string;
  name: string;
}

interface Event {
  id: string;
  title: string;
  committee_id: string | null;
  event_type_id: string | null;
  start_time: string;
  end_time: string;
  motto: string | null;
  created_by: string;
  created_at: string;
  committees?: Committee;
  event_types?: EventType;
  event_requests?: { request_types: RequestType }[];
}

export default function EventsPage() {
  const { hasPermission } = useUserProfile();
  const confirm = useConfirm();
  const [events, setEvents] = useState<Event[]>([]);
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [requestTypes, setRequestTypes] = useState<RequestType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    committee_id: "",
    event_type_id: "",
    start_time: "",
    end_time: "",
    motto: "",
    request_type_ids: [] as string[],
  });

  const canEdit = hasPermission('operador');

  useEffect(() => {
    loadData();

    // Timeout para evitar loading infinito (8 segundos)
    const timeoutId = setTimeout(() => {
      setLoading(false);
    }, 8000);

    return () => clearTimeout(timeoutId);
  }, []);

  const loadData = async () => {
    try {
      // Load events with related data
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select(`
          *,
          committees (
            id,
            name,
            color_hex
          ),
          event_types (
            id,
            name
          ),
          event_requests (
            request_types (
              id,
              name
            )
          )
        `)
        .order('start_time', { ascending: false });

      if (eventsError) throw eventsError;

      // Load committees
      const { data: committeesData, error: committeesError } = await supabase
        .from('committees')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (committeesError) throw committeesError;

      // Load event types
      const { data: eventTypesData, error: eventTypesError } = await supabase
        .from('event_types')
        .select('*')
        .order('name');

      if (eventTypesError) throw eventTypesError;

      // Load request types
      const { data: requestTypesData, error: requestTypesError } = await supabase
        .from('request_types')
        .select('*')
        .order('name');

      if (requestTypesError) throw requestTypesError;

      setEvents(eventsData || []);
      setCommittees(committeesData || []);
      setEventTypes(eventTypesData || []);
      setRequestTypes(requestTypesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEvent) {
        // Update event
        const { error: eventError } = await supabase
          .from('events')
          .update({
            title: formData.title,
            committee_id: formData.committee_id || null,
            event_type_id: formData.event_type_id || null,
            start_time: fromInputToUTC(formData.start_time),
            end_time: fromInputToUTC(formData.end_time),
            motto: formData.motto || null,
          })
          .eq('id', editingEvent.id);

        if (eventError) throw eventError;

        // Update event requests
        await supabase
          .from('event_requests')
          .delete()
          .eq('event_id', editingEvent.id);

        if (formData.request_type_ids.length > 0) {
          const requestsToInsert = formData.request_type_ids.map(requestTypeId => ({
            event_id: editingEvent.id,
            request_type_id: requestTypeId,
          }));

          const { error: requestsError } = await supabase
            .from('event_requests')
            .insert(requestsToInsert);

          if (requestsError) throw requestsError;
        }
      } else {
        // Create new event
        const { data: newEvent, error: eventError } = await supabase
          .from('events')
          .insert([{
            title: formData.title,
            committee_id: formData.committee_id || null,
            event_type_id: formData.event_type_id || null,
            start_time: fromInputToUTC(formData.start_time),
            end_time: fromInputToUTC(formData.end_time),
            motto: formData.motto || null,
          }])
          .select()
          .single();

        if (eventError) throw eventError;

        // Add event requests
        if (formData.request_type_ids.length > 0 && newEvent) {
          const requestsToInsert = formData.request_type_ids.map(requestTypeId => ({
            event_id: newEvent.id,
            request_type_id: requestTypeId,
          }));

          const { error: requestsError } = await supabase
            .from('event_requests')
            .insert(requestsToInsert);

          if (requestsError) throw requestsError;
        }
      }

      await loadData();
      setIsModalOpen(false);
      setEditingEvent(null);
      resetForm();
    } catch (error) {
      console.error('Error saving event:', error);
      await confirm({
        title: 'Error de Guardado',
        message: 'No se pudo guardar el evento: ' + (error as Error).message,
        type: 'danger',
        showCancel: false,
        confirmLabel: 'Entendido'
      });
    }
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      committee_id: event.committee_id || "",
      event_type_id: event.event_type_id || "",
      start_time: toUTCInputFormat(event.start_time),
      end_time: toUTCInputFormat(event.end_time),
      motto: event.motto || "",
      request_type_ids: event.event_requests?.map(er => er.request_types.id) || [],
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: '¿Eliminar Evento?',
      message: '¿Estás seguro de que quieres eliminar este evento?',
      type: 'danger',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar'
    });

    if (!confirmed) return;
    
    setLoading(true); // Mostrar loading mientras se elimina

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      committee_id: "",
      event_type_id: "",
      start_time: "",
      end_time: "",
      motto: "",
      request_type_ids: [],
    });
  };

  const openCreateModal = () => {
    setEditingEvent(null);
    resetForm();
    setIsModalOpen(true);
  };

  const toggleRequestType = (requestTypeId: string) => {
    setFormData(prev => ({
      ...prev,
      request_type_ids: prev.request_type_ids.includes(requestTypeId)
        ? prev.request_type_ids.filter(id => id !== requestTypeId)
        : [...prev.request_type_ids, requestTypeId]
    }));
  };

  // ── Helpers para manejo de Fecha/Hora ────────────────────────────
  const splitDateTime = (isoString: string) => {
    if (!isoString) return { date: "", time: "" };
    const [date, time] = isoString.split('T');
    return { date: date || "", time: (time || "").substring(0, 5) };
  };

  const handleStartDateTimeChange = (newDate?: string, newTime?: string) => {
    const { date: currentDate, time: currentTime } = splitDateTime(formData.start_time);
    const d = newDate !== undefined ? newDate : currentDate;
    const t = newTime !== undefined ? newTime : currentTime;
    const newStart = `${d}T${t || "00:00"}`;
    
    setFormData(prev => {
      let newEnd = prev.end_time;
      // Sincronización inteligente: Si el fin es vacío o anterior al nuevo inicio
      if (!newEnd || newEnd < newStart) {
        newEnd = newStart;
      }
      return { ...prev, start_time: newStart, end_time: newEnd };
    });
  };

  const handleEndDateTimeChange = (newDate?: string, newTime?: string) => {
    const { date: currentDate, time: currentTime } = splitDateTime(formData.end_time);
    const d = newDate !== undefined ? newDate : currentDate;
    const t = newTime !== undefined ? newTime : currentTime;
    const newEnd = `${d}T${t || "00:00"}`;

    if (newEnd < formData.start_time) {
      // No permitir fin anterior a inicio
      return;
    }

    setFormData(prev => ({ ...prev, end_time: newEnd }));
  };

  // Generar opciones para selectores de tiempo
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

  const TimePicker = ({ 
    value, 
    onChange, 
    label 
  }: { 
    value: string, 
    onChange: (newTime: string) => void,
    label: string 
  }) => {
    const [h, m] = value.split(':');
    return (
      <div className="flex flex-col gap-1.5 flex-1">
        <label className="text-[11px] font-bold text-[#86868b] uppercase tracking-wider pl-1">{label}</label>
        <div className="flex gap-1 items-center bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
          <select
            value={h}
            onChange={(e) => onChange(`${e.target.value}:${m || '00'}`)}
            className="flex-1 bg-transparent border-none text-sm font-semibold focus:ring-0 cursor-pointer py-1 pl-2"
          >
            {hours.map(hour => <option key={hour} value={hour}>{hour}</option>)}
          </select>
          <span className="text-gray-300 font-bold">:</span>
          <select
            value={m}
            onChange={(e) => onChange(`${h || '00'}:${e.target.value}`)}
            className="flex-1 bg-transparent border-none text-sm font-semibold focus:ring-0 cursor-pointer py-1 pr-2"
          >
            {minutes.map(min => <option key={min} value={min}>{min}</option>)}
          </select>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-logo-primary/30 border-t-logo-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1d1d1f]">Eventos</h1>
            <p className="text-sm text-[#86868b] mt-1">Gestiona los eventos del calendario</p>
          </div>
          {canEdit && (
            <Button onClick={openCreateModal} className="flex items-center gap-2">
              <Plus size={18} />
              Nuevo Evento
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-[#1d1d1f] text-lg mb-2">{event.title}</h3>
                  {event.motto && (
                    <p className="text-sm text-[#86868b] mb-3 italic">"{event.motto}"</p>
                  )}

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-logo-primary" />
                      <span className="text-[#86868b]">
                        {formatDateUTC(event.start_time, {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-logo-primary" />
                      <span className="text-[#86868b]">
                        {formatTimeUTC(event.start_time)} - {formatTimeUTC(event.end_time)}
                      </span>
                    </div>

                    {event.committees && (
                      <div className="flex items-center gap-2">
                        <Tag size={14} className="text-logo-primary" />
                        <span
                          className="px-2 py-1 text-xs rounded-full text-white font-medium"
                          style={{ backgroundColor: event.committees.color_hex }}
                        >
                          {event.committees.name}
                        </span>
                      </div>
                    )}

                    {event.event_types && (
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-logo-primary" />
                        <span className="text-[#86868b]">{event.event_types.name}</span>
                      </div>
                    )}

                    {event.event_requests && event.event_requests.length > 0 && (
                      <div className="flex items-start gap-2">
                        <div className="w-4 h-4 rounded bg-gray-100 flex items-center justify-center mt-0.5">
                          <div className="w-2 h-2 rounded bg-gray-400"></div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {event.event_requests.map((er, idx) => (
                            <span key={idx} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                              {er.request_types.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {canEdit && (
                <div className="flex gap-2 pt-4 border-t border-gray-100">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(event)}
                    className="flex-1"
                  >
                    <Edit size={14} />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(event.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {events.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar size={24} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-[#1d1d1f] mb-2">No hay eventos</h3>
            <p className="text-sm text-[#86868b]">Crea el primer evento para el calendario</p>
            {canEdit && (
              <Button onClick={openCreateModal} className="mt-4">
                Crear Evento
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Modal for Create/Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEvent ? "Editar Evento" : "Nuevo Evento"}
        className="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sección 1: Información Básica */}
          <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100/50 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-logo-primary/10 flex items-center justify-center">
                <Info size={16} className="text-logo-primary" />
              </div>
              <h3 className="font-bold text-logo-dark">Información del Evento</h3>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#86868b] mb-2 uppercase tracking-tight pl-1">
                  Título del Evento
                </label>
                <input
                  type="text"
                  required
                  {...getSpanishValidationProps("Por favor, ingresa el título del evento")}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-logo-primary shadow-sm transition-all"
                  placeholder="Ej: Reunión de Jóvenes"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#86868b] mb-2 uppercase tracking-tight pl-1">
                    Comité
                  </label>
                  <select
                    value={formData.committee_id}
                    onChange={(e) => setFormData({ ...formData, committee_id: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-logo-primary shadow-sm transition-all text-sm"
                  >
                    <option value="">Opcional</option>
                    {committees.map(committee => (
                      <option key={committee.id} value={committee.id}>{committee.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#86868b] mb-2 uppercase tracking-tight pl-1">
                    Tipo de Evento
                  </label>
                  <select
                    value={formData.event_type_id}
                    onChange={(e) => setFormData({ ...formData, event_type_id: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-logo-primary shadow-sm transition-all text-sm"
                  >
                    <option value="">Opcional</option>
                    {eventTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Sección 2: Programación */}
          <div className="bg-logo-primary/5 p-6 rounded-[2rem] border border-logo-primary/10 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-logo-primary/10 flex items-center justify-center">
                <Calendar size={16} className="text-logo-primary" />
              </div>
              <h3 className="font-bold text-logo-dark">Horario</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Inicio */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-[#86868b] uppercase tracking-tight pl-1 flex items-center gap-2">
                  <CheckCircle2 size={12} className="text-green-500" />
                  Inicio
                </label>
                <div className="flex flex-col gap-3">
                  <input
                    type="date"
                    required
                    {...getSpanishValidationProps("Por favor, selecciona una fecha")}
                    value={splitDateTime(formData.start_time).date}
                    onChange={(e) => handleStartDateTimeChange(e.target.value, undefined)}
                    className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-logo-primary shadow-sm font-medium text-sm"
                  />
                  <TimePicker 
                    label="Hora de Inicio"
                    value={splitDateTime(formData.start_time).time} 
                    onChange={(t) => handleStartDateTimeChange(undefined, t)} 
                  />
                </div>
              </div>

              {/* Fin */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-[#86868b] uppercase tracking-tight pl-1 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-logo-primary" />
                  Término
                </label>
                <div className="flex flex-col gap-3">
                  <input
                    type="date"
                    required
                    {...getSpanishValidationProps("Por favor, selecciona una fecha de término")}
                    min={splitDateTime(formData.start_time).date}
                    value={splitDateTime(formData.end_time).date}
                    onChange={(e) => handleEndDateTimeChange(e.target.value, undefined)}
                    className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-logo-primary shadow-sm font-medium text-sm"
                  />
                  <TimePicker 
                    label="Hora de Término"
                    value={splitDateTime(formData.end_time).time} 
                    onChange={(t) => handleEndDateTimeChange(undefined, t)} 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sección 3: Detalles y Solicitudes */}
          <div className="space-y-4 px-2">
            <div>
              <label className="block text-xs font-bold text-[#86868b] mb-2 uppercase tracking-tight pl-1">
                Lema del Evento (opcional)
              </label>
              <input
                type="text"
                value={formData.motto}
                onChange={(e) => setFormData({ ...formData, motto: e.target.value })}
                className="w-full px-4 py-3 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-logo-primary transition-all text-sm"
                placeholder="Ej: Unidos en Fe"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#86868b] mb-3 uppercase tracking-tight pl-1">
                Solicitudes Requeridas
              </label>
              <div className="flex flex-wrap gap-2">
                {requestTypes.map(requestType => (
                  <button
                    key={requestType.id}
                    type="button"
                    onClick={() => toggleRequestType(requestType.id)}
                    className={cn(
                      "px-4 py-2 rounded-full text-xs font-semibold border transition-all active:scale-95",
                      formData.request_type_ids.includes(requestType.id)
                        ? "bg-logo-primary border-logo-primary text-white shadow-md shadow-logo-primary/20"
                        : "bg-white border-gray-100 text-gray-500 hover:border-gray-200"
                    )}
                  >
                    {requestType.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-6 border-t border-gray-100 sticky bottom-0 bg-white pb-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 rounded-2xl py-6"
            >
              Cancelar
            </Button>
            <Button type="submit" variant="success" className="flex-1 rounded-2xl py-6 shadow-xl shadow-logo-success/20">
              {editingEvent ? "Guardar Cambios" : "Crear Evento"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}