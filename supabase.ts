
import { createClient } from '@supabase/supabase-js';

// 🔧 Reemplaza con tu URL y tu clave pública (anon key)
const supabaseUrl = 'https://zeqovoichrrzgjhlaiyd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplcW92b2ljaHJyemdqaGxhaXlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyMTQ4MTgsImV4cCI6MjA1OTc5MDgxOH0.8VW7MXpsqJjUWXgVuHln8VonGr75mcyUClvYl0EOqvc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
