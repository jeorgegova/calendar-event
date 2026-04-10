import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Bell } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { useUserProfile } from "../hooks/useUserProfile";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/utils";

interface Notice {
  id: string;
  title: string;
  content: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export default function NoticesPage() {
  const { hasPermission } = useUserProfile();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    is_active: true,
  });

  const canEdit = hasPermission('operador');

  useEffect(() => {
    loadNotices();
  }, []);

  const loadNotices = async () => {
    try {
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotices(data || []);
    } catch (error) {
      console.error('Error loading notices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingNotice) {
        const { error } = await supabase
          .from('notices')
          .update(formData)
          .eq('id', editingNotice.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notices')
          .insert([formData]);

        if (error) throw error;
      }

      await loadNotices();
      setIsModalOpen(false);
      setEditingNotice(null);
      resetForm();
    } catch (error) {
      console.error('Error saving notice:', error);
    }
  };

  const handleEdit = (notice: Notice) => {
    setEditingNotice(notice);
    setFormData({
      title: notice.title,
      content: notice.content || "",
      is_active: notice.is_active,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta notificación?')) return;

    try {
      const { error } = await supabase
        .from('notices')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadNotices();
    } catch (error) {
      console.error('Error deleting notice:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      is_active: true,
    });
  };

  const openCreateModal = () => {
    setEditingNotice(null);
    resetForm();
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-apple-blue/30 border-t-apple-blue rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1d1d1f]">Notificaciones y Avisos</h1>
            <p className="text-sm text-[#86868b] mt-1">Gestiona las comunicaciones para la comunidad</p>
          </div>
          {canEdit && (
            <Button onClick={openCreateModal} className="flex items-center gap-2">
              <Plus size={18} />
              Nueva Notificación
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {notices.map((notice) => (
            <div
              key={notice.id}
              className={cn(
                "p-6 rounded-2xl border transition-all duration-200",
                notice.is_active
                  ? "bg-white border-gray-100 shadow-sm hover:shadow-md"
                  : "bg-gray-50 border-gray-200 opacity-60"
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-apple-blue/10 flex items-center justify-center">
                    <Bell size={18} className="text-apple-blue" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-[#1d1d1f] text-lg">{notice.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[#86868b]">
                        {new Date(notice.created_at).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {!notice.is_active && (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                          Inactiva
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {canEdit && (
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(notice)}
                    >
                      <Edit size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(notice.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                )}
              </div>

              {notice.content && (
                <div className="pl-13">
                  <p className="text-sm text-[#86868b] leading-relaxed whitespace-pre-wrap">
                    {notice.content}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {notices.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell size={24} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-[#1d1d1f] mb-2">No hay notificaciones</h3>
            <p className="text-sm text-[#86868b]">Crea la primera notificación para comunicar con la comunidad</p>
            {canEdit && (
              <Button onClick={openCreateModal} className="mt-4">
                Crear Notificación
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Modal for Create/Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingNotice ? "Editar Notificación" : "Nueva Notificación"}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
              Título
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent transition-all"
              placeholder="Ej: Próximo retiro espiritual"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
              Contenido (opcional)
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent transition-all resize-none"
              placeholder="Detalles de la notificación..."
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-apple-blue bg-gray-100 border-gray-300 rounded focus:ring-apple-blue"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-[#1d1d1f]">
              Notificación activa
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              {editingNotice ? "Guardar Cambios" : "Crear Notificación"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}