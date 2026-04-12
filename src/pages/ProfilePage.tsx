import React, { useState } from "react";
import { User, Mail, Lock, Shield, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { getSpanishValidationProps } from "../lib/formUtils";

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || "",
  });

  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setLoading(true);
    setMessage(null);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: formData.full_name })
        .eq('id', profile.id);

      if (error) throw error;
      
      await refreshProfile();
      setMessage({ type: 'success', text: "Perfil actualizado correctamente" });
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: "Error al actualizar el perfil" });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: "Las contraseñas no coinciden" });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setMessage({ type: 'error', text: "La contraseña debe tener al menos 8 caracteres" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // 1. Update password in Auth
      const { error: authError } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (authError) throw authError;

      // 2. Clear change password flag in Profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ should_change_password: false })
        .eq('id', profile?.id);

      if (profileError) throw profileError;

      await refreshProfile();
      setPasswordData({ newPassword: "", confirmPassword: "" });
      setMessage({ type: 'success', text: "Contraseña actualizada correctamente" });
    } catch (error) {
      console.error('Error changing password:', error);
      setMessage({ type: 'error', text: "Error al cambiar la contraseña" });
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="flex-1 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#1d1d1f]">Mi Perfil</h1>
          <p className="text-sm text-[#86868b] mt-1">Gestiona tu información personal y seguridad</p>
        </div>

        {message && (
          <div className={cn(
            "mb-6 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300",
            message.type === 'success' ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"
          )}>
            {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        {profile.should_change_password && (
          <div className="mb-8 p-6 bg-orange-50 border border-orange-200 rounded-3xl">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center shrink-0">
                <Shield size={20} className="text-orange-600" />
              </div>
              <div>
                <h3 className="font-bold text-orange-900">Acción requerida: Cambia tu contraseña</h3>
                <p className="text-sm text-orange-800 mt-1">
                  Estás usando una contraseña temporal asignada por el administrador. 
                  Por seguridad, debes cambiarla antes de continuar usando el sistema.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Personal Information */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <User className="text-apple-blue" size={20} />
              <h2 className="text-lg font-bold text-[#1d1d1f]">Datos Personales</h2>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-2 pl-1">Nombre Completo</label>
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-apple-blue transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-2 pl-1">Correo Electrónico</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    disabled
                    value={profile.email}
                    className="w-full pl-11 pr-4 py-3 bg-gray-100 border-none rounded-2xl text-gray-500 cursor-not-allowed"
                  />
                </div>
                <p className="text-[10px] text-[#86868b] mt-2 px-1">El correo no puede ser modificado por el usuario.</p>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Guardando..." : "Actualizar Nombre"}
              </Button>
            </form>
          </div>

          {/* Security / Password */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Lock className="text-orange-500" size={20} />
              <h2 className="text-lg font-bold text-[#1d1d1f]">Seguridad</h2>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-2 pl-1">Nueva Contraseña</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    required
                    {...getSpanishValidationProps("Por favor, ingresa la nueva contraseña")}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-apple-blue transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-2 pl-1">Confirmar Contraseña</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    required
                    {...getSpanishValidationProps("Por favor, confirma la nueva contraseña")}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-apple-blue transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <Button type="submit" variant="outline" disabled={loading} className={cn(
                "w-full",
                profile.should_change_password ? "border-orange-200 text-orange-700 hover:bg-orange-50" : ""
              )}>
                {loading ? "Cambiando..." : "Actualizar Contraseña"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function for cn
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
