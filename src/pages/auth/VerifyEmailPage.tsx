import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { translateError } from '../../lib/authErrors';
import { MailCheck, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import logo from '../../assets/logo_fondo_negro.png';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [verificationType, setVerificationType] = useState<string>('');

  useEffect(() => {
    const verifyToken = async () => {
      const token_hash = searchParams.get('token_hash');
      const type = searchParams.get('type') as any;

      if (!token_hash || !type) {
        setStatus('error');
        setErrorMessage('El enlace de verificación es inválido o está incompleto.');
        return;
      }

      setVerificationType(type);

      try {
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type,
        });

        if (error) throw error;

        setStatus('success');

        // If it's a recovery, the user is now logged in, so we can redirect them to the password update page
        if (type === 'recovery') {
          setTimeout(() => {
            navigate('/update-password', { replace: true });
          }, 3000);
        }

      } catch (error: any) {
        setStatus('error');
        setErrorMessage(translateError(error));
      }
    };

    verifyToken();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-[#fbfbfd] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl border border-gray-100 flex flex-col items-center text-center">
        <Link to="/" className="mb-8 block">
          <img src={logo} alt="Logo" className="h-16 w-auto object-contain rounded-2xl mx-auto" />
        </Link>

        {status === 'verifying' && (
          <div className="animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-10 h-10 text-logo-primary animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-[#1d1d1f] mb-3">Verificando enlace...</h1>
            <p className="text-[#86868b]">Por favor espera un momento mientras validamos tu información.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="animate-in fade-in zoom-in slide-in-from-bottom-4 duration-500">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <MailCheck className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-[#1d1d1f] mb-3">
              {verificationType === 'recovery' ? '¡Verificación Exitosa!' : '¡Correo Confirmado!'}
            </h1>
            <p className="text-[#86868b] mb-8">
              {verificationType === 'recovery'
                ? 'Tu solicitud ha sido validada correctamente. Te redirigiremos a la página para actualizar tu contraseña...'
                : 'Tu correo electrónico ha sido verificado correctamente en nuestro sistema. Ya puedes iniciar sesión.'}
            </p>

            {verificationType !== 'recovery' && (
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 w-full bg-logo-primary text-white py-4 px-6 rounded-2xl font-semibold hover:bg-[#0f172a] shadow-lg shadow-logo-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-[0.98]"
              >
                <ShieldCheck size={20} />
                Ir a Iniciar Sesión
              </Link>
            )}
          </div>
        )}

        {status === 'error' && (
          <div className="animate-in fade-in zoom-in slide-in-from-bottom-4 duration-500">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-[#1d1d1f] mb-3">Verificación Fallida</h1>
            <p className="text-[#86868b] mb-8">{errorMessage}</p>

            <Link
              to="/"
              className="inline-flex items-center justify-center w-full bg-gray-100 text-gray-700 py-4 px-6 rounded-2xl font-semibold hover:bg-gray-200 transition-all active:scale-[0.98]"
            >
              Volver al Inicio
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
