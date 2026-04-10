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

export default function AuditPage() {
  const { hasPermission, profile } = useUserProfile();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAction, setSelectedAction] = useState("");
  const [selectedEntity, setSelectedEntity] = useState("");

  const isAdmin = hasPermission('admin');

  useEffect(() => {
    if (isAdmin) {
      loadLogs();
    }
  }, [isAdmin]);

  const loadLogs = async () => {
    try {
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          profiles:user_id (
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      // If not admin, only show own logs
      if (!isAdmin && profile) {
        query = query.eq('user_id', profile.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('CREATE')) return <FileText size={16} className="text-green-600" />;
    if (action.includes('UPDATE')) return <Settings size={16} className="text-blue-600" />;
    if (action.includes('DELETE')) return <FileText size={16} className="text-red-600" />;
    return <Eye size={16} className="text-gray-600" />;
  };

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return 'text-green-700 bg-green-50';
    if (action.includes('UPDATE')) return 'text-blue-700 bg-blue-50';
    if (action.includes('DELETE')) return 'text-red-700 bg-red-50';
    return 'text-gray-700 bg-gray-50';
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchTerm ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.profiles?.email || '').toLowerCase().includes(searchTerm.toLowerCase());

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
        <div className="w-8 h-8 border-2 border-apple-blue/30 border-t-apple-blue rounded-full animate-spin"></div>
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
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent transition-all"
              />
            </div>

            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent transition-all"
            >
              <option value="">Todas las acciones</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>

            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent transition-all"
            >
              <option value="">Todas las entidades</option>
              {uniqueEntities.map(entity => (
                <option key={entity} value={entity}>{entity}</option>
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
                      <span className={cn("px-2 py-1 text-xs font-medium rounded-full", getActionColor(log.action))}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-[#86868b] bg-gray-100 px-2 py-1 rounded-full">
                        {log.entity_type}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-[#86868b] mb-2">
                      <div className="flex items-center gap-1">
                        <User size={14} />
                        {log.profiles?.email || 'Sistema'}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(log.created_at).toLocaleString('es-ES', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </div>
                    </div>

                    {log.details && (
                      <div className="bg-gray-50 rounded-xl p-3 mt-3">
                        <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </div>
                    )}
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
                <div className="text-2xl font-bold text-blue-600">{logs.filter(l => l.action.includes('UPDATE')).length}</div>
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