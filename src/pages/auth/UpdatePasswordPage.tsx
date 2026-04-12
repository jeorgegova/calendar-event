import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { translateError } from '../../lib/authErrors';
import { getSpanishValidationProps } from '../../lib/formUtils';
import { Lock, Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react';
import logo from '../../assets/logo_fondo_negro.png';

export default function UpdatePasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Usamos useEffect para verificar rápidamente si el usuario está autenticado
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // En algunos casos, Supabase emite el evento de auth pero la página de update entra antes.
        // O si alguien intenta entrar directamente aquí sin sesión, lo redirigimos.
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 3000);
      }
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden. Por favor, verifica.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      // Update profile status so should_change_password flag is correctly reset
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({ should_change_password: false }).eq('id', user.id);
      }

      setSuccess(true);

      setTimeout(() => {
        navigate('/', { replace: true });
      }, 3000);

    } catch (err: any) {
      setError(translateError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbfbfd] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl border border-gray-100 flex flex-col">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <img src={logo} alt="Logo" className="h-16 w-auto object-contain rounded-2xl mx-auto mb-6" />
          </Link>
          <h1 className="text-2xl font-bold text-[#1d1d1f] mb-2 tracking-tight">Actualizar Contraseña</h1>
          <p className="text-[#86868b] text-sm">
            Crea una nueva contraseña segura para tu cuenta.
          </p>
        </div>

        {success ? (
          <div className="text-center animate-in fade-in zoom-in duration-500 pt-4">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-[#1d1d1f] mb-3">¡Contraseña Actualizada!</h2>
            <p className="text-[#86868b] mb-8">
              Tu contraseña ha sido actualizada con éxito. Serás redirigido a la aplicación en unos segundos...
            </p>
            <Loader2 className="w-6 h-6 text-logo-primary animate-spin mx-auto" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in zoom-in slide-in-from-bottom-4 duration-500">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                </div>
                <p className="leading-relaxed font-medium">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#1d1d1f] uppercase tracking-wider mb-2 flex items-center gap-2">
                <Lock size={14} className="text-logo-primary" />
                Nueva Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  {...getSpanishValidationProps("Ingresa tu nueva contraseña")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 pr-12 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-logo-primary focus:border-transparent transition-all duration-200 bg-gray-50/50 hover:bg-white text-[#1d1d1f] font-medium placeholder:text-gray-400"
                  placeholder="Mínimo 8 caracteres"
                  disabled={loading}
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors bg-white rounded-lg shadow-sm border border-gray-100"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1d1d1f] uppercase tracking-wider mb-2 flex items-center gap-2 mt-4">
                <ShieldCheck size={14} className="text-logo-primary" />
                Confirmar Contraseña
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  {...getSpanishValidationProps("Confirma tu nueva contraseña")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3.5 pr-12 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-logo-primary focus:border-transparent transition-all duration-200 bg-gray-50/50 hover:bg-white text-[#1d1d1f] font-medium placeholder:text-gray-400"
                  placeholder="Repite la contraseña"
                  disabled={loading}
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors bg-white rounded-lg shadow-sm border border-gray-100"
                  disabled={loading}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-14 mt-4 bg-logo-primary text-white rounded-2xl font-bold text-base hover:bg-[auto] hover:-translate-y-0.5 active:scale-[0.98] shadow-lg shadow-logo-primary/20 hover:shadow-xl transition-all disabled:opacity-70 disabled:pointer-events-none flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Actualizando...
                </>
              ) : (
                "Guardar Contraseña"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
