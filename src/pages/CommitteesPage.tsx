import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { useUserProfile } from "../hooks/useUserProfile";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/utils";

interface Committee {
  id: string;
  name: string;
  color_hex: string;
  is_active: boolean;
}

export default function CommitteesPage() {
  const { hasPermission } = useUserProfile();
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCommittee, setEditingCommittee] = useState<Committee | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    color_hex: "#FF5733",
    is_active: true,
  });

  const canEdit = hasPermission('operador');

  useEffect(() => {
    loadCommittees();
  }, []);

  const loadCommittees = async () => {
    try {
      const { data, error } = await supabase
        .from('committees')
        .select('*')
        .order('name');

      if (error) throw error;
      setCommittees(data || []);
    } catch (error) {
      console.error('Error loading committees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCommittee) {
        const { error } = await supabase
          .from('committees')
          .update(formData)
          .eq('id', editingCommittee.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('committees')
          .insert([formData]);

        if (error) throw error;
      }

      await loadCommittees();
      setIsModalOpen(false);
      setEditingCommittee(null);
      resetForm();
    } catch (error) {
      console.error('Error saving committee:', error);
    }
  };

  const handleEdit = (committee: Committee) => {
    setEditingCommittee(committee);
    setFormData({
      name: committee.name,
      color_hex: committee.color_hex,
      is_active: committee.is_active,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este comité?')) return;

    try {
      const { error } = await supabase
        .from('committees')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadCommittees();
    } catch (error) {
      console.error('Error deleting committee:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      color_hex: "#FF5733",
      is_active: true,
    });
  };

  const openCreateModal = () => {
    setEditingCommittee(null);
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
            <h1 className="text-2xl font-bold text-[#1d1d1f]">Comités</h1>
            <p className="text-sm text-[#86868b] mt-1">Gestiona los comités organizacionales</p>
          </div>
          {canEdit && (
            <Button onClick={openCreateModal} className="flex items-center gap-2">
              <Plus size={18} />
              Nuevo Comité
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {committees.map((committee) => (
            <div
              key={committee.id}
              className={cn(
                "p-4 rounded-2xl border transition-all duration-200",
                committee.is_active
                  ? "bg-white border-gray-100 shadow-sm hover:shadow-md"
                  : "bg-gray-50 border-gray-200 opacity-60"
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: committee.color_hex }}
                  />
                  <div>
                    <h3 className="font-semibold text-[#1d1d1f]">{committee.name}</h3>
                    <p className="text-xs text-[#86868b]">{committee.color_hex}</p>
                  </div>
                </div>
                {!committee.is_active && (
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                    Inactivo
                  </span>
                )}
              </div>

              {canEdit && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(committee)}
                    className="flex-1"
                  >
                    <Edit size={14} />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(committee.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {committees.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Eye size={24} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-[#1d1d1f] mb-2">No hay comités</h3>
            <p className="text-sm text-[#86868b]">Crea el primer comité para empezar</p>
            {canEdit && (
              <Button onClick={openCreateModal} className="mt-4">
                Crear Comité
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Modal for Create/Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCommittee ? "Editar Comité" : "Nuevo Comité"}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
              Nombre del Comité
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent transition-all"
              placeholder="Ej: Jóvenes, Misiones, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
              Color
            </label>
            <div className="flex gap-3">
              <input
                type="color"
                value={formData.color_hex}
                onChange={(e) => setFormData({ ...formData, color_hex: e.target.value })}
                className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer"
              />
              <input
                type="text"
                value={formData.color_hex}
                onChange={(e) => setFormData({ ...formData, color_hex: e.target.value })}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent transition-all font-mono text-sm"
                placeholder="#FF5733"
              />
            </div>
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
              Comité activo
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              {editingCommittee ? "Guardar Cambios" : "Crear Comité"}
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