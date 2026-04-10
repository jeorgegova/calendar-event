import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Settings, Tag, Users } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { useUserProfile } from "../hooks/useUserProfile";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/utils";

interface EventType {
  id: string;
  name: string;
}

interface RequestType {
  id: string;
  name: string;
}

export default function ParametersPage() {
  const { hasPermission } = useUserProfile();
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [requestTypes, setRequestTypes] = useState<RequestType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'event-types' | 'request-types'>('event-types');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EventType | RequestType | null>(null);
  const [formData, setFormData] = useState({
    name: "",
  });

  const isAdmin = hasPermission('admin');

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    try {
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

      setEventTypes(eventTypesData || []);
      setRequestTypes(requestTypesData || []);
    } catch (error) {
      console.error('Error loading parameters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const table = activeTab === 'event-types' ? 'event_types' : 'request_types';

      if (editingItem) {
        const { error } = await supabase
          .from(table)
          .update(formData)
          .eq('id', editingItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(table)
          .insert([formData]);

        if (error) throw error;
      }

      await loadData();
      setIsModalOpen(false);
      setEditingItem(null);
      resetForm();
    } catch (error) {
      console.error('Error saving item:', error);
    }
  };

  const handleEdit = (item: EventType | RequestType) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este elemento?')) return;

    try {
      const table = activeTab === 'event-types' ? 'event_types' : 'request_types';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
    });
  };

  const openCreateModal = () => {
    setEditingItem(null);
    resetForm();
    setIsModalOpen(true);
  };

  if (!isAdmin) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Settings size={24} className="text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-[#1d1d1f] mb-2">Acceso Denegado</h3>
          <p className="text-sm text-[#86868b]">Solo los administradores pueden acceder a esta página</p>
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

  const currentItems = activeTab === 'event-types' ? eventTypes : requestTypes;
  const currentTitle = activeTab === 'event-types' ? 'Tipos de Evento' : 'Tipos de Solicitud';
  const currentIcon = activeTab === 'event-types' ? Tag : Users;

  return (
    <div className="flex-1 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1d1d1f]">Parámetros del Sistema</h1>
            <p className="text-sm text-[#86868b] mt-1">Configura los tipos de eventos y solicitudes</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('event-types')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
              activeTab === 'event-types'
                ? "bg-white text-[#1d1d1f] shadow-sm"
                : "text-[#86868b] hover:text-[#1d1d1f]"
            )}
          >
            <Tag size={16} />
            Tipos de Evento
          </button>
          <button
            onClick={() => setActiveTab('request-types')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
              activeTab === 'request-types'
                ? "bg-white text-[#1d1d1f] shadow-sm"
                : "text-[#86868b] hover:text-[#1d1d1f]"
            )}
          >
            <Users size={16} />
            Tipos de Solicitud
          </button>
        </div>

        {/* Content */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-apple-blue/10 flex items-center justify-center">
                  {React.createElement(currentIcon, { size: 20, className: "text-apple-blue" })}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#1d1d1f]">{currentTitle}</h2>
                  <p className="text-sm text-[#86868b]">Gestiona los {currentTitle.toLowerCase()}</p>
                </div>
              </div>
              <Button onClick={openCreateModal} className="flex items-center gap-2">
                <Plus size={18} />
                Agregar
              </Button>
            </div>
          </div>

          <div className="p-6">
            {currentItems.length > 0 ? (
              <div className="space-y-3">
                {currentItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-gray-100 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
                        {React.createElement(currentIcon, { size: 16, className: "text-gray-600" })}
                      </div>
                      <span className="font-medium text-[#1d1d1f]">{item.name}</span>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  {React.createElement(currentIcon, { size: 24, className: "text-gray-400" })}
                </div>
                <h3 className="text-lg font-semibold text-[#1d1d1f] mb-2">No hay {currentTitle.toLowerCase()}</h3>
                <p className="text-sm text-[#86868b]">Agrega el primer elemento</p>
                <Button onClick={openCreateModal} className="mt-4">
                  Agregar {currentTitle.slice(0, -1)}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal for Create/Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? `Editar ${currentTitle.slice(0, -1)}` : `Nuevo ${currentTitle.slice(0, -1)}`}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
              Nombre
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent transition-all"
              placeholder={`Ej: ${activeTab === 'event-types' ? 'Conferencia' : 'Multimedia'}`}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              {editingItem ? "Guardar Cambios" : "Crear"}
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