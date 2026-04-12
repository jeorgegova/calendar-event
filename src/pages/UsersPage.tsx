import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Eye, EyeOff, UserPlus, Mail, Clock, User, Key, MailCheck, MailQuestion, Shield } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { useUserProfile } from "../hooks/useUserProfile";
import type { UserProfile } from "../hooks/useUserProfile";
import { useConfirm } from "../context/ConfirmContext";
import { supabase } from "../lib/supabase";
import { formatDateUTC, toUTCDateInputFormat, fromInputToUTC } from "../lib/dateUtils";
import { translateError } from "../lib/authErrors";
import { getSpanishValidationProps } from "../lib/formUtils";


export default function UsersPage() {
  const { hasPermission } = useUserProfile();
  const confirm = useConfirm();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    password: "",
    active_until: "",
    is_active: true,
    role: "operador" as 'admin' | 'operador',
  });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingEmail(true);

    try {
      if (editingUser) {
        // Update existing user
        const updateData: any = {
          is_active: formData.is_active,
          role: formData.role,
        };

        if (formData.active_until) {
          updateData.active_until = fromInputToUTC(formData.active_until);
        } else {
          updateData.active_until = null;
        }

        const { error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', editingUser.id);

        if (error) throw error;
      } else {
        // --- CREATE NEW USER ---
        // Auth Sign Up
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.full_name
            }
          }
        });

        if (authError) throw authError;

        if (authData.user) {
          // Note: The handle_new_user trigger in Supabase will automatically
          // create the profile, but we might want to update it with extra fields
          const profileData: any = {
            full_name: formData.full_name,
            role: formData.role,
            should_change_password: true,
            is_active: formData.is_active,
          };

          if (formData.active_until) {
            profileData.active_until = fromInputToUTC(formData.active_until);
          }

          const { error: profileError } = await supabase
            .from('profiles')
            .update(profileData)
            .eq('id', authData.user.id);

          if (profileError) throw profileError;
        }
      }

      await loadUsers();
      setIsModalOpen(false);
      setEditingUser(null);
      resetForm();
    } catch (error) {
      console.error('Error saving user:', error);
      await confirm({
        title: 'Error de Guardado',
        message: translateError(error),
        type: 'danger',
        showCancel: false,
        confirmLabel: 'Entendido'
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleEdit = (user: UserProfile) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      full_name: user.full_name || "",
      password: "", // Not used in edit
      active_until: toUTCDateInputFormat(user.active_until),
      is_active: user.is_active ?? true,
      role: user.role,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: '¿Eliminar Usuario?',
      message: '¿Estás seguro de que quieres eliminar este usuario? Esta acción no se puede deshacer.',
      type: 'danger',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar'
    });

    if (!confirmed) return;

    try {
      // First delete the profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (profileError) throw profileError;

      // Note: In Supabase, deleting from auth.users requires admin privileges
      // For now, we'll just mark as inactive
      await confirm({
        title: 'Usuario Desactivado',
        message: 'Usuario marcado como inactivo. Para eliminación completa, contacta al administrador del sistema.',
        type: 'info',
        showCancel: false,
        confirmLabel: 'OK'
      });

      await loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleQuickExpiry = async (user: UserProfile, days: number | null) => {
    let newDate: string | null = null;
    let label = "";

    if (days !== null) {
      const d = new Date();
      d.setDate(d.getDate() + days);
      newDate = d.toISOString().split('T')[0];
      label = days === 7 ? "una semana de acceso" : "30 días de acceso";
    } else {
      label = "acceso permanente (quitar vencimiento)";
    }

    const confirmed = await confirm({
      title: 'Actualizar Expiración',
      message: `¿Estás seguro de que quieres asignar ${label} a ${user.email}?`,
      type: 'info',
      confirmLabel: 'Asignar',
      cancelLabel: 'Cancelar'
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ active_until: newDate ? fromInputToUTC(newDate) : null })
        .eq('id', user.id);

      if (error) throw error;
      await loadUsers();
    } catch (error) {
      console.error('Error updating expiry:', error);
      await confirm({
        title: 'Error',
        message: 'No se pudo actualizar la fecha de vencimiento.',
        type: 'danger',
        showCancel: false,
        confirmLabel: 'Entendido'
      });
    }
  };

  const handleToggleActive = async (user: UserProfile) => {
    try {
      const newStatus = !user.is_active;
      
      // Optimistic update
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: newStatus } : u));

      const { error } = await supabase
        .from('profiles')
        .update({ is_active: newStatus })
        .eq('id', user.id);

      if (error) {
        // Rollback on error
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !newStatus } : u));
        throw error;
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      await confirm({
        title: 'Error',
        message: 'No se pudo cambiar el estado del usuario.',
        type: 'danger',
        showCancel: false,
        confirmLabel: 'Entendido'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      email: "",
      full_name: "",
      password: "",
      active_until: "",
      is_active: true,
      role: 'operador',
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

    if (user.role === 'admin') {
      return <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">Admin</span>;
    }

    // 1. Prioridad: Estado de Correo
    if (!user.email_confirmed) {
      return (
        <span className="px-2 py-1 text-xs bg-amber-50 text-amber-700 rounded-full flex items-center gap-1 border border-amber-100">
          <MailQuestion size={12} />
          Correo Pendiente
        </span>
      );
    }

    // 2. Estado de Activo/Inactivo
    if (!user.is_active) {
      return <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">Inactivo</span>;
    }

    // 3. Estado de Expiración
    if (!activeUntil) {
      return (
        <span className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded-full flex items-center gap-1 border border-green-100">
          <MailCheck size={12} />
          Confirmado
        </span>
      );
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
        <div className="w-8 h-8 border-2 border-logo-primary/30 border-t-logo-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8 bg-[#fbfbfd]">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-2xl font-bold text-[#1d1d1f]">Gestión de Usuarios</h1>
            <p className="text-sm text-[#86868b] mt-1">Administra los usuarios operadores del sistema</p>
          </div>
          <Button onClick={openCreateModal} className="flex items-center gap-2 shadow-lg shadow-logo-primary/10">
            <Plus size={18} />
            Nuevo Operador
          </Button>
        </div>
        <div className="space-y-6">
          {users.map((user) => (
            <div
              key={user.id}
              className="group p-5 md:p-8 bg-white border border-gray-100 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all duration-500"
            >
              <div className="flex flex-col gap-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-14 h-14 rounded-2xl bg-logo-primary/5 flex items-center justify-center shrink-0 border border-logo-primary/10 group-hover:bg-logo-primary/10 transition-colors">
                      <UserPlus size={24} className="text-logo-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-[#1d1d1f] truncate text-lg md:text-xl break-all">
                        {user.full_name || user.email}
                      </h3>
                      {user.full_name && (
                        <p className="text-xs text-[#86868b] font-medium truncate mb-1">
                          {user.email}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-1.5 font-medium">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-lg text-[#86868b] text-[10px] uppercase tracking-wider">
                          Creado: {formatDateUTC(user.created_at)}
                        </div>
                        {getStatusBadge(user)}
                      </div>
                    </div>
                  </div>

                  {/* Apple Style Switch */}
                  {user.role !== 'admin' && (
                    <div className="flex items-center">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={user.is_active}
                          onChange={() => handleToggleActive(user)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4cd964]"></div>
                      </label>
                    </div>
                  )}
                </div>

                {user.role !== 'admin' && (
                  <div className="flex flex-col md:flex-row md:items-center gap-4 bg-[#fbfbfd] p-4 md:p-2.5 rounded-[1.5rem] border border-gray-100">
                    <div className="px-2 py-1 text-[10px] font-black text-gray-400 uppercase tracking-widest border-none md:border-r border-gray-200">
                      Vencimiento
                    </div>
                    <div className="flex gap-2 w-full">
                      <button onClick={() => handleQuickExpiry(user, 7)} className="flex-1 px-4 py-2.5 text-xs font-bold bg-white text-slate-700 rounded-2xl border border-gray-200 hover:border-logo-primary hover:text-logo-primary transition-all">+7d</button>
                      <button onClick={() => handleQuickExpiry(user, 30)} className="flex-1 px-4 py-2.5 text-xs font-bold bg-white text-slate-700 rounded-2xl border border-gray-200 hover:border-logo-primary hover:text-logo-primary transition-all">+30d</button>
                      <button onClick={() => handleQuickExpiry(user, null)} className="flex-1 px-4 py-2.5 text-xs font-bold bg-white text-red-400 rounded-2xl border border-gray-200 hover:border-red-400 hover:text-red-500 transition-all text-lg leading-none">∞</button>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-2 border-t border-gray-50">
                  <p className="text-sm font-bold text-gray-600 flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${user.active_until ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                    {user.active_until ? `Vencimiento: ${formatDateUTC(user.active_until)}` : 'Acceso Vitalicio'}
                  </p>
                  <div className="flex gap-3">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(user)} className="flex-1 sm:flex-none py-3 px-6 bg-white font-bold rounded-2xl">
                      <Edit size={16} /> Editar
                    </Button>
                    {user.role !== 'admin' && (
                      <Button size="sm" variant="outline" onClick={() => handleDelete(user.id)} className="py-3 px-4 bg-white text-red-500 hover:text-red-700 border-red-100 rounded-2xl">
                        <Trash2 size={18} />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {users.length === 0 && (
          <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-gray-200 mt-6 px-10">
            <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <UserPlus size={32} className="text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-[#1d1d1f] mb-2">No se encontraron usuarios</h3>
            <p className="text-gray-400 max-w-xs mx-auto mb-8 font-medium">Comienza agregando al primer operador para gestionar el calendario.</p>
            <Button onClick={openCreateModal} className="px-10 py-4 rounded-2xl shadow-lg">
              Crear primer usuario
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
              <User size={16} className="text-logo-primary" />
              Nombre Completo
            </label>
            <input
              type="text"
              required
              {...getSpanishValidationProps("Por favor, ingresa el nombre completo")}
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-logo-primary focus:border-transparent transition-all"
              placeholder="Juan Pérez"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1d1d1f] mb-2 flex items-center gap-2">
              <Mail size={16} className="text-logo-primary" />
              Correo electrónico
            </label>
            <input
              type="email"
              required
              {...getSpanishValidationProps("Por favor, ingresa un correo válido")}
              disabled={!!editingUser}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-logo-primary focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-500"
              placeholder="usuario@email.com"
            />
            {editingUser && (
              <p className="text-xs text-[#86868b] mt-1">El correo no se puede modificar</p>
            )}
          </div>

          {!editingUser && (
            <div>
              <label className="block text-sm font-medium text-[#1d1d1f] mb-2 flex items-center gap-2">
                <Key size={16} className="text-logo-primary" />
                Contraseña Inicial
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  {...getSpanishValidationProps("Por favor, ingresa una contraseña inicial")}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-logo-primary focus:border-transparent transition-all pr-12"
                  placeholder="Mínimo 8 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <label className="block text-sm font-medium text-[#1d1d1f] flex items-center gap-2">
              <Clock size={16} className="text-logo-primary" />
              Acceso Activo hasta
            </label>
            
            <div className="relative">
              <input
                type="date"
                value={formData.active_until}
                onChange={(e) => setFormData({ ...formData, active_until: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-logo-primary focus:border-transparent transition-all bg-white"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 7);
                  setFormData({ ...formData, active_until: d.toISOString().split('T')[0] });
                }}
                className="px-3 py-1.5 text-xs font-bold bg-slate-50 text-slate-600 rounded-xl border border-slate-100 hover:bg-logo-primary/10 hover:text-logo-primary hover:border-logo-primary/20 transition-all active:scale-95"
              >
                +1 Semana
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setMonth(d.getMonth() + 1);
                  setFormData({ ...formData, active_until: d.toISOString().split('T')[0] });
                }}
                className="px-3 py-1.5 text-xs font-bold bg-slate-50 text-slate-600 rounded-xl border border-slate-100 hover:bg-logo-primary/10 hover:text-logo-primary hover:border-logo-primary/20 transition-all active:scale-95"
              >
                +30 Días
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, active_until: "" })}
                className="px-3 py-1.5 text-xs font-bold bg-red-50 text-red-600 rounded-xl border border-red-100 hover:bg-red-100 transition-all active:scale-95"
              >
                No vence
              </button>
            </div>
            <p className="text-[10px] text-[#86868b] pl-1 font-medium italic">
              * El usuario no podrá iniciar sesión después de esta fecha.
            </p>
          </div>

          <div className="flex flex-col gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${formData.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-500'}`}>
                  <User size={18} />
                </div>
                <div>
                  <label htmlFor="is_active" className="text-sm font-bold text-[#1d1d1f] block leading-none">
                    Usuario Activo
                  </label>
                  <p className="text-[10px] text-gray-500 mt-1">Permitir el acceso al sistema</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  id="is_active"
                  className="sr-only peer"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4cd964]"></div>
              </label>
            </div>

            <div className="h-px bg-gray-100 w-full" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${formData.role === 'admin' ? 'bg-logo-primary/20 text-logo-primary' : 'bg-gray-200 text-gray-500'}`}>
                  <Shield size={18} />
                </div>
                <div>
                  <label htmlFor="is_admin" className="text-sm font-bold text-[#1d1d1f] block leading-none">
                    Administrador
                  </label>
                  <p className="text-[10px] text-gray-500 mt-1">Permisos elevados de gestión</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  id="is_admin"
                  className="sr-only peer"
                  checked={formData.role === 'admin'}
                  onChange={(e) => setFormData({ ...formData, role: e.target.checked ? 'admin' : 'operador' })}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-logo-primary"></div>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" variant="success" className="flex-1" disabled={sendingEmail}>
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
                    El usuario recibirá un correo de confirmación. Se le obligará a cambiar la contraseña ingresada aquí en su primer inicio de sesión por motivos de seguridad.
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