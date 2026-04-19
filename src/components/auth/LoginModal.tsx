import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { User, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { translateError } from "../../lib/authErrors";
import { getSpanishValidationProps } from "../../lib/formUtils";

export const LoginModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isResetMode, setIsResetMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Reset states when modal depends on isOpen
  useEffect(() => {
    if (isOpen) {
      setLoading(false);
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    let accountBlocked = false;
    let isSuccess = false;

    // Listen for custom inactive account event (dispatched by AuthContext)
    const inactiveHandler = (e: Event) => {
      accountBlocked = true;
      const message = (e as CustomEvent).detail;
      setError(message);
      setLoading(false);
    };
    window.addEventListener('auth:inactive_account', inactiveHandler);

    try {
      if (isResetMode) {
        // Enviar correo de reseteo
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/update-password`,
        });
        if (error) throw error;
        setSuccessMsg("Si el correo existe, recibirás un link para reiniciar tu contraseña.");
        isSuccess = true;
      } else {
        // Login normal
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        isSuccess = true;

        // Wait a small bit for AuthContext to potentially block the account
        setTimeout(() => {
          window.removeEventListener('auth:inactive_account', inactiveHandler);
          // Only close if the account wasn't blocked by AuthContext validation
          if (!accountBlocked) {
            onClose();
          }
        }, 600);
      }
    } catch (err: any) {
      setError(translateError(err));
    } finally {
      // Si hubo un error o es modo reseteo, desactivamos el cargando y removemos el listener
      // Para login exitoso, el setTimeout se encarga de la limpieza
      if (isResetMode || !isSuccess) {
        window.removeEventListener('auth:inactive_account', inactiveHandler);
        setLoading(false);
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-logo-primary/10 flex items-center justify-center">
            <User size={20} className="text-logo-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#1d1d1f] tracking-tight">
              {isResetMode ? "Recuperar Contraseña" : "Bienvenido"}
            </h2>
            <p className="text-sm text-[#86868b] mt-0.5">
              {isResetMode ? "Ingresa tu correo electrónico" : "Ingresa tus credenciales para continuar"}
            </p>
          </div>
        </div>
      }
      className="max-w-sm"
    >
      <form onSubmit={handleAuth} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
            </div>
            <p className="leading-relaxed">{error}</p>
          </div>
        )}
        {successMsg && (
          <div className="p-4 bg-green-50 border border-green-100 text-green-600 rounded-2xl text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
            </div>
            <p className="leading-relaxed">{successMsg}</p>
          </div>
        )}

        <div className="relative">
          <label className="block text-sm font-medium text-[#1d1d1f] mb-2 flex items-center gap-2">
            <Mail size={16} className="text-logo-primary" />
            Correo electrónico
          </label>
          <div className="relative">
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              {...getSpanishValidationProps("Por favor, ingresa tu correo")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 pl-4 pr-4 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-logo-primary focus:border-transparent transition-all duration-200 bg-white placeholder:text-gray-400 text-[#1d1d1f] font-medium"
              placeholder="tu@email.com"
              disabled={loading}
            />
          </div>
        </div>

        {!isResetMode && (
          <div className="relative">
            <label className="block text-sm font-medium text-[#1d1d1f] mb-2 flex items-center gap-2">
              <Lock size={16} className="text-logo-primary" />
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                required
                {...getSpanishValidationProps("Por favor, ingresa tu contraseña")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pl-4 pr-12 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-logo-primary focus:border-transparent transition-all duration-200 bg-white placeholder:text-gray-400 text-[#1d1d1f] font-medium"
                placeholder="••••••••"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                disabled={loading}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-12 text-base font-semibold"
          disabled={loading || (isResetMode && successMsg !== null)}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Cargando...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <User size={18} />
              {isResetMode ? "Enviar Enlace" : "Iniciar Sesión"}
            </div>
          )}
        </Button>

        <div className="text-center mt-6 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => {
              setIsResetMode(!isResetMode);
              setError(null);
              setSuccessMsg(null);
            }}
            className="text-sm text-logo-primary hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-logo-primary focus:ring-offset-2 focus:ring-offset-white rounded-lg px-2 py-1 transition-colors font-medium"
          >
            {isResetMode ? (
              <div className="flex items-center gap-2">
                <User size={14} />
                Volver a iniciar sesión
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Lock size={14} />
                ¿Olvidaste tu contraseña?
              </div>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
