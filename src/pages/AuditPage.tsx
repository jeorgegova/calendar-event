import { useState, useEffect } from "react";
import { Eye, Search, Filter, Calendar, User, Settings, FileText } from "lucide-react";
import { Button } from "../components/ui/Button";
import { useUserProfile } from "../hooks/useUserProfile";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/utils";

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: any;
  created_at: string;
  profiles?: {
    email: string;
  };
}

const FIELD_LABELS: Record<string, string> = {
  title: "Título",
  content: "Contenido",
  start_time: "Inicio",
  end_time: "Fin",
  motto: "Lema",
  committee_id: "Comité",
  event_type_id: "Tipo de Evento",
  is_active: "Estado Activo",
  role: "Rol",
  active_until: "Activo hasta",
  full_name: "Nombre Completo",
  email: "Correo",
  name: "Nombre",
  color_hex: "Color"
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Creación",
  UPDATE: "Edición",
  DELETE: "Eliminación"
};

const ENTITY_LABELS: Record<string, string> = {
  events: "Evento",
  committees: "Comité",
  notices: "Aviso",
  profiles: "Usuario",
  event_types: "Tipo de Evento",
  request_types: "Tipo de Solicitud"
};

const formatServerDate = (dateString: string, includeSeconds = false) => {
  if (!dateString) return '';

  // Parse as UTC and convert to UTC-5
  const utcDate = new Date(dateString + (dateString.includes('Z') ? '' : 'Z'));
  const utcMinus5Date = new Date(utcDate.getTime() - (5 * 60 * 60 * 1000)); // Subtract 5 hours

  const year = utcMinus5Date.getFullYear();
  const month = utcMinus5Date.getMonth(); // 0-based
  const day = utcMinus5Date.getDate();
  const hour = utcMinus5Date.getHours();
  const minute = utcMinus5Date.getMinutes();
  const second = utcMinus5Date.getSeconds();

  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const monthName = months[month];

  if (includeSeconds) {
    return `${day} ${monthName} ${year}, ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
  }
  return `${day} ${monthName} ${year}, ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

const formatAuditValue = (value: any, key?: string, dictionaries?: any): React.ReactNode => {
  if (value === null || value === undefined) return "N/A";
  if (typeof value === 'boolean') return value ? "Sí" : "No";

  // Custom formats
  if (key === 'color_hex') {
    return (
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: value }} />
        <span>{value}</span>
      </div>
    );
  }
  if (key === 'committee_id' && dictionaries?.committees?.[value]) {
    return dictionaries.committees[value];
  }
  if (key === 'event_type_id' && dictionaries?.eventTypes?.[value]) {
    return dictionaries.eventTypes[value];
  }

  // Si es una fecha (ISO string simple o con Z)
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
    return formatServerDate(value);
  }

  return String(value);
};

const RenderAuditDetails = ({ log, dictionaries }: { log: AuditLog, dictionaries: any }) => {
  if (!log.details) return null;

  const { old: oldData, new: newData } = log.details;
  const isCreate = log.action.includes('CREATE');
  const isUpdate = log.action.includes('UPDATE');
  const isDelete = log.action.includes('DELETE');

  const ignoredFields = ['id', 'created_at', 'updated_at', 'created_by', 'user_id'];

  if (isUpdate && oldData && newData) {
    const changes = Object.keys(newData).filter(key =>
      !ignoredFields.includes(key) &&
      JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])
    );

    if (changes.length === 0) return null;

    return (
      <div className="mt-3 space-y-2">
        {changes.map(key => (
          <div key={key} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-[#1d1d1f] w-24">
              {FIELD_LABELS[key] || key}:
            </span>
            <div className="flex items-center gap-2">
              <div className="px-2 py-0.5 bg-red-50 text-red-700 rounded-md line-through text-xs">
                {formatAuditValue(oldData[key], key, dictionaries)}
              </div>
              <span className="text-gray-400">→</span>
              <div className="px-2 py-0.5 bg-green-50 text-green-700 rounded-md font-medium text-xs">
                {formatAuditValue(newData[key], key, dictionaries)}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const dataToShow = isCreate ? newData : (isDelete ? oldData : null);
  if (!dataToShow) return null;

  const fields = Object.keys(dataToShow).filter(key =>
    !ignoredFields.includes(key) && dataToShow[key] !== null
  );

  return (
    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
      {fields.map(key => (
        <div key={key} className="flex items-start gap-2 text-xs">
          <span className="font-medium text-[#86868b] min-w-[80px]">
            {FIELD_LABELS[key] || key}:
          </span>
          <span className="text-[#1d1d1f] font-medium truncate flex items-center">
            {formatAuditValue(dataToShow[key], key, dictionaries)}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function AuditPage() {
  const { hasPermission, profile } = useUserProfile();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAction, setSelectedAction] = useState("");
  const [selectedEntity, setSelectedEntity] = useState("");
  const [dictionaries, setDictionaries] = useState({
    committees: {} as Record<string, string>,
    eventTypes: {} as Record<string, string>
  });

  const isAdmin = hasPermission('admin');

  useEffect(() => {
    if (isAdmin) {
      loadLogs();
    }
  }, [isAdmin]);

  const loadLogs = async () => {
    try {
      const p1 = supabase
        .from('audit_logs')
        .select(`
          *,
          profiles:user_id (
            email,
            full_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      // If not admin, only show own logs
      if (!isAdmin && profile) {
        p1.eq('user_id', profile.id);
      }

      const p2 = supabase.from('committees').select('id, name');
      const p3 = supabase.from('event_types').select('id, name');

      const [logsRes, comRes, evRes] = await Promise.all([p1, p2, p3]);

      if (logsRes.error) throw logsRes.error;

      const cMap: Record<string, string> = {};
      const eMap: Record<string, string> = {};
      if (comRes.data) comRes.data.forEach(c => cMap[c.id] = c.name);
      if (evRes.data) evRes.data.forEach(e => eMap[e.id] = e.name);

      setDictionaries({ committees: cMap, eventTypes: eMap });
      setLogs(logsRes.data || []);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('CREATE')) return <FileText size={16} className="text-green-600" />;
    if (action.includes('UPDATE')) return <Settings size={16} className="text-yellow-600" />;
    if (action.includes('DELETE')) return <FileText size={16} className="text-red-600" />;
    return <Eye size={16} className="text-gray-600" />;
  };

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return 'text-green-700 bg-green-50';
    if (action.includes('UPDATE')) return 'text-yellow-700 bg-yellow-50';
    if (action.includes('DELETE')) return 'text-red-700 bg-red-50';
    return 'text-gray-700 bg-gray-50';
  };

  const filteredLogs = logs.filter(log => {
    const userName = (log.profiles as any)?.full_name || log.profiles?.email || '';
    const matchesSearch = !searchTerm ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = !selectedAction || log.action.includes(selectedAction);
    const matchesEntity = !selectedEntity || log.entity_type === selectedEntity;

    return matchesSearch && matchesAction && matchesEntity;
  });

  const uniqueActions = [...new Set(logs.map(log => log.action.split('_')[0]))];
  const uniqueEntities = [...new Set(logs.map(log => log.entity_type))];

  if (!hasPermission('admin') && !hasPermission('operador')) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Eye size={24} className="text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-[#1d1d1f] mb-2">Acceso Denegado</h3>
          <p className="text-sm text-[#86868b]">No tienes permisos para ver los logs de auditoría</p>
        </div>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-[#1d1d1f]">Auditoría</h1>
            <p className="text-sm text-[#86868b] mt-1">
              {isAdmin ? 'Historial de todas las acciones del sistema' : 'Historial de tus acciones en el sistema'}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-logo-primary focus:border-transparent transition-all"
              />
            </div>

            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-logo-primary focus:border-transparent transition-all"
            >
              <option value="">Todas las acciones</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>
                  {ACTION_LABELS[action] || action}
                </option>
              ))}
            </select>

            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-logo-primary focus:border-transparent transition-all"
            >
              <option value="">Todas las entidades</option>
              {uniqueEntities.map(entity => (
                <option key={entity} value={entity}>
                  {ENTITY_LABELS[entity] || entity}
                </option>
              ))}
            </select>

            <Button
              onClick={() => {
                setSearchTerm("");
                setSelectedAction("");
                setSelectedEntity("");
              }}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Filter size={16} />
              Limpiar
            </Button>
          </div>
        </div>

        {/* Logs List */}
        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center">
                    {getActionIcon(log.action)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn("px-2 py-1 text-xs font-medium rounded-full uppercase tracking-wider", getActionColor(log.action))}>
                        {ACTION_LABELS[log.action.split('_')[0]] || log.action.split('_')[0]}
                      </span>
                      <span className="text-xs text-[#86868b] bg-gray-100 px-3 py-1 rounded-full font-medium">
                        {ENTITY_LABELS[log.entity_type] || log.entity_type}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-[#86868b] mb-2">
                      <div className="flex items-center gap-1">
                        <User size={14} />
                        {(log.profiles as any)?.full_name || log.profiles?.email || 'Sistema'}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        {formatServerDate(log.created_at, true)}
                      </div>
                    </div>

                    <RenderAuditDetails log={log} dictionaries={dictionaries} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText size={24} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-[#1d1d1f] mb-2">
              {logs.length === 0 ? 'No hay registros de auditoría' : 'No se encontraron resultados'}
            </h3>
            <p className="text-sm text-[#86868b]">
              {logs.length === 0
                ? 'Las acciones se registrarán automáticamente aquí'
                : 'Intenta ajustar los filtros de búsqueda'
              }
            </p>
          </div>
        )}

        {/* Summary */}
        {logs.length > 0 && (
          <div className="mt-6 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-[#1d1d1f] mb-4">Resumen</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{logs.filter(l => l.action.includes('CREATE')).length}</div>
                <div className="text-sm text-[#86868b]">Creaciones</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{logs.filter(l => l.action.includes('UPDATE')).length}</div>
                <div className="text-sm text-[#86868b]">Actualizaciones</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{logs.filter(l => l.action.includes('DELETE')).length}</div>
                <div className="text-sm text-[#86868b]">Eliminaciones</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{logs.length}</div>
                <div className="text-sm text-[#86868b]">Total de acciones</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}