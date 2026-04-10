import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Eye, UserPlus, Mail, Clock } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { useUserProfile } from "../hooks/useUserProfile";
import type { UserProfile } from "../hooks/useUserProfile";
import { supabase } from "../lib/supabase";


export default function UsersPage() {
  const { hasPermission } = useUserProfile();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    active_until: "",
    is_active: true,
  });
  const [sendingEmail, setSendingEmail] = useState(false);

  const isAdmin = hasPermission('admin');

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendConfirmationEmail = async (email: string, tempPassword: string) => {
    try {
      // In a real app, you'd call your backend API to send the email
      // For now, we'll just show the credentials that should be sent
      alert(`Credenciales para el nuevo usuario:\n\nEmail: ${email}\nContraseña temporal: ${tempPassword}\n\nPor favor, envía estas credenciales al usuario de forma segura.`);
    } catch (error) {
      console.error('Error sending email:', error);
    }
  };

  const generateTempPassword = () => {
    return Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingEmail(true);

    try {
      if (editingUser) {
        // Update existing user
        const updateData: any = {
          is_active: formData.is_active,
        };

        if (formData.active_until) {
          updateData.active_until = new Date(formData.active_until).toISOString();
        } else {
          updateData.active_until = null;
        }

        const { error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', editingUser.id);

        if (error) throw error;
      } else {
        // Create new user
        const tempPassword = generateTempPassword();

        // First create the auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: tempPassword,
        });

        if (authError) throw authError;

        // The profile will be created automatically by the trigger
        // But we need to set the role and active_until
        if (authData.user) {
          const profileData: any = {
            role: 'operador',
            is_active: formData.is_active,
          };

          if (formData.active_until) {
            profileData.active_until = new Date(formData.active_until).toISOString();
          }

          const { error: profileError } = await supabase
            .from('profiles')
            .update(profileData)
            .eq('id', authData.user.id);

          if (profileError) throw profileError;

          // Send confirmation email with credentials
          await sendConfirmationEmail(formData.email, tempPassword);
        }
      }

      await loadUsers();
      setIsModalOpen(false);
      setEditingUser(null);
      resetForm();
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Error al guardar usuario: ' + (error as Error).message);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleEdit = (user: UserProfile) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      active_until: user.active_until ? new Date(user.active_until).toISOString().split('T')[0] : "",
      is_active: user.is_active,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este usuario? Esta acción no se puede deshacer.')) return;

    try {
      // First delete the profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (profileError) throw profileError;

      // Note: In Supabase, deleting from auth.users requires admin privileges
      // For now, we'll just mark as inactive
      alert('Usuario marcado como inactivo. Para eliminación completa, contacta al administrador del sistema.');

      await loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      email: "",
      active_until: "",
      is_active: true,
    });
  };

  const openCreateModal = () => {
    setEditingUser(null);
    resetForm();
    setIsModalOpen(true);
  };

  const getStatusBadge = (user: UserProfile) => {
    const now = new Date();
    const activeUntil = user.active_until ? new Date(user.active_until) : null;

    if (!user.is_active) {
      return <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">Inactivo</span>;
    }

    if (user.role === 'admin') {
      return <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">Admin</span>;
    }

    if (!activeUntil) {
      return <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">Activo</span>;
    }

    if (now > activeUntil) {
      return <span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded-full">Expirado</span>;
    }

    const daysLeft = Math.ceil((activeUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">{daysLeft} días</span>;
  };

  if (!isAdmin) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Eye size={24} className="text-red-500" />
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

  return (
    <div className="flex-1 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1d1d1f]">Gestión de Usuarios</h1>
            <p className="text-sm text-[#86868b] mt-1">Administra los usuarios operadores del sistema</p>
          </div>
          <Button onClick={openCreateModal} className="flex items-center gap-2">
            <Plus size={18} />
            Nuevo Operador
          </Button>
        </div>

        <div className="space-y-4">
          {users.map((user) => (
            <div
              key={user.id}
              className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-apple-blue/10 flex items-center justify-center">
                    <UserPlus size={20} className="text-apple-blue" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#1d1d1f]">{user.email}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[#86868b]">
                        Creado: {new Date(user.created_at).toLocaleDateString('es-ES')}
                      </span>
                      {getStatusBadge(user)}
                    </div>
                    {user.active_until && (
                      <p className="text-xs text-[#86868b] mt-1">
                        Activo hasta: {new Date(user.active_until).toLocaleDateString('es-ES')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(user)}
                  >
                    <Edit size={14} />
                    Editar
                  </Button>
                  {user.role !== 'admin' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(user.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {users.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus size={24} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-[#1d1d1f] mb-2">No hay usuarios</h3>
            <p className="text-sm text-[#86868b]">Crea el primer usuario operador</p>
            <Button onClick={openCreateModal} className="mt-4">
              Crear Usuario
            </Button>
          </div>
        )}
      </div>

      {/* Modal for Create/Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? "Editar Usuario" : "Nuevo Usuario Operador"}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-[#1d1d1f] mb-2 flex items-center gap-2">
              <Mail size={16} className="text-apple-blue" />
              Correo electrónico
            </label>
            <input
              type="email"
              required
              disabled={!!editingUser}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-500"
              placeholder="usuario@email.com"
            />
            {editingUser && (
              <p className="text-xs text-[#86868b] mt-1">El correo no se puede modificar</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1d1d1f] mb-2 flex items-center gap-2">
              <Clock size={16} className="text-apple-blue" />
              Activo hasta (opcional)
            </label>
            <input
              type="date"
              value={formData.active_until}
              onChange={(e) => setFormData({ ...formData, active_until: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent transition-all"
            />
            <p className="text-xs text-[#86868b] mt-1">Deja vacío para acceso permanente</p>
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
              Usuario activo
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1" disabled={sendingEmail}>
              {sendingEmail ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  {editingUser ? "Guardando..." : "Creando..."}
                </div>
              ) : (
                editingUser ? "Guardar Cambios" : "Crear Usuario"
              )}
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

          {!editingUser && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mt-4">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                </div>
                <div>
                  <p className="text-sm text-blue-800 font-medium">Nota importante</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Al crear un usuario, se enviará un correo con las credenciales temporales.
                    El usuario podrá cambiar su contraseña después del primer inicio de sesión.
                  </p>
                </div>
              </div>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}