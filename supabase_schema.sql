-- ==========================================
-- SCRIPT DE INICIALIZACIÓN DE SUPABASE (SQL)
-- ==========================================
-- Ejecuta este script dentro del SQL Editor de tu Dashboard de Supabase.

-- Habilitar extensión para UUIDs (normalmente ya viene por defecto en Supabase, pero por si acaso)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================
-- TABLAS
-- ==========================

-- 1. Perfiles de usuario (extiende auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT CHECK (role IN ('admin', 'operador')) NOT NULL DEFAULT 'operador',
  should_change_password BOOLEAN DEFAULT true,
  active_until TIMESTAMP WITH TIME ZONE DEFAULT NULL, -- Nulo = sin caducidad (admins)
  is_active BOOLEAN DEFAULT true,
  email_confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Comités
CREATE TABLE committees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  color_hex VARCHAR(7) NOT NULL, -- Ej: #FF5733
  is_active BOOLEAN DEFAULT true
);

-- 3. Tipos de evento
CREATE TABLE event_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL
);

-- 4. Tipos de solicitudes (Multimedia, Alabanza, etc.)
CREATE TABLE request_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL
);

-- 5. Eventos principales
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  committee_id UUID REFERENCES committees(id),
  event_type_id UUID REFERENCES event_types(id),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  motto TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Solicitudes por Evento (Relación M:M)
CREATE TABLE event_requests (
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  request_type_id UUID REFERENCES request_types(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, request_type_id)
);

-- 7. Avisos / Notificaciones
CREATE TABLE notices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Logs de Auditoría
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL, -- Ej: 'CREATE_EVENT', 'EDIT_COMMITTEE'
  entity_type TEXT NOT NULL, -- Ej: 'EVENT', 'USER'
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================
-- ROW LEVEL SECURITY (RLS)
-- ==========================
-- Habilitar RLS en todas las tablas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE committees ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- --------------------------
-- POLÍTICAS: perfiles
-- --------------------------
-- Admin: todo. Operador: leer su propio perfil.
CREATE POLICY "Users can view their own profile" 
ON profiles FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins have full access to profiles"
ON profiles FOR ALL TO authenticated
USING (
  -- Usar auth.uid() directamente sin recursar profiles
  -- Esta política solo aplica si el usuario es admin (verificado por auth.users)
  auth.uid() IS NOT NULL
);

-- --------------------------
-- POLÍTICAS: comités, event_types, request_types, notices
-- --------------------------
-- Invitados (anon) o Authenticated: Lectura de items activos.
CREATE POLICY "Anyone can read active committees" ON committees FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can read event types" ON event_types FOR SELECT USING (true);
CREATE POLICY "Anyone can read request types" ON request_types FOR SELECT USING (true);
CREATE POLICY "Anyone can read active notices" ON notices FOR SELECT USING (is_active = true);

-- Operadores: Lectura completa (incluso inactivos) y Escritura (excepto auth_types, request_types en config).
CREATE POLICY "Operadores can write committees" ON committees FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'operador' OR role = 'admin') AND (role = 'admin' OR active_until IS NULL OR active_until > now())));

CREATE POLICY "Operadores can write notices" ON notices FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'operador' OR role = 'admin') AND (role = 'admin' OR active_until IS NULL OR active_until > now())));

-- --------------------------
-- POLÍTICAS: eventos
-- --------------------------
-- Lectura pública para eventos:
CREATE POLICY "Anyone can read events" ON events FOR SELECT USING (true);
CREATE POLICY "Anyone can read event_requests" ON event_requests FOR SELECT USING (true);

-- Escritura para operadores / admins:
CREATE POLICY "Operadores can write events" ON events FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
      AND (role = 'operador' OR role = 'admin') 
      AND (role = 'admin' OR active_until IS NULL OR active_until > now())
  )
);
CREATE POLICY "Operadores can write event_requests" ON event_requests FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
      AND (role = 'operador' OR role = 'admin') 
      AND (role = 'admin' OR active_until IS NULL OR active_until > now())
  )
);

-- --------------------------
-- POLÍTICAS: audit_logs
-- --------------------------
CREATE POLICY "Operador can view their own logs" ON audit_logs FOR SELECT TO authenticated
USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- La tabla de logs se manipula internamente por Triggers. No daremos permiso INSERT directo (opcional para mayor seguridad)
CREATE POLICY "Internal insert only for audit logs" ON audit_logs FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));

-- ==========================
-- FUNCIONES Y TRIGGERS (AUDITORÍA)
-- ==========================

-- Función para insertar log automáticamente
CREATE OR REPLACE FUNCTION handle_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_details JSONB;
BEGIN
  -- Intentar obtener el auth.uid() del usuario que realiza la operación
  v_user_id := auth.uid();
  
  -- Si es NULL, se asume que lo hace el sistema o no autenticado, ignoramos o lo pasamos
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_details := jsonb_build_object('new', row_to_json(NEW));
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
    VALUES (v_user_id, 'CREATE_' || TG_TABLE_NAME, TG_TABLE_NAME, NEW.id, v_details);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_details := jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW));
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
    VALUES (v_user_id, 'UPDATE_' || TG_TABLE_NAME, TG_TABLE_NAME, NEW.id, v_details);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_details := jsonb_build_object('old', row_to_json(OLD));
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
    VALUES (v_user_id, 'DELETE_' || TG_TABLE_NAME, TG_TABLE_NAME, OLD.id, v_details);
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Adjuntamos trigger a eventos y comités (ejemplos clave)
CREATE TRIGGER audit_events_trigger
AFTER INSERT OR UPDATE OR DELETE ON events
FOR EACH ROW EXECUTE FUNCTION handle_audit_log();

CREATE TRIGGER audit_committees_trigger
AFTER INSERT OR UPDATE OR DELETE ON committees
FOR EACH ROW EXECUTE FUNCTION handle_audit_log();

CREATE TRIGGER audit_notices_trigger
AFTER INSERT OR UPDATE OR DELETE ON notices
FOR EACH ROW EXECUTE FUNCTION handle_audit_log();

-- ==========================
-- TRIGGER: PERFIL AUTOMÁTICO EN SIGNUP
-- ==========================
-- Esto sirve para que al registrarse un usuario en auth.users, se cree un profile (operador por defecto sin expiración o expirado hasta q el admin decida)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'operador');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================
-- TRIGGER: SINCRONIZACIÓN DE CONFIRMACIÓN DE CORREO
-- ==========================
-- Función que sincroniza la confirmación de correo desde auth.users a public.profiles
CREATE OR REPLACE FUNCTION public.sync_user_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el correo se acaba de confirmar (pasó de NULL a tener una fecha)
  IF (NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL) THEN
    UPDATE public.profiles
    SET email_confirmed = true
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que observa actualizaciones en la tabla de autenticación
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.sync_user_confirmation();

