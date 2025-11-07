import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from './enviroments/environment';

// Inicializa el cliente Supabase usando las variables del entorno
// El tipo SupabaseClient es opcional, pero ayuda al tipado en TypeScript
export const supabase: SupabaseClient = createClient(
  environment.supabase.url,
  environment.supabase.anonKey
);

// NOTA: Este cliente 'supabase' es el que se importará y usará en todos los servicios.