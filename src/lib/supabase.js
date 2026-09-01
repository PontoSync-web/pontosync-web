import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Funções auxiliares
export const gerarMatricula = () => {
  const ultimo = localStorage.getItem('ultimaMatricula') || 0;
  const novo = parseInt(ultimo) + 1;
  localStorage.setItem('ultimaMatricula', novo.toString());
  return `ORION-${String(novo).padStart(4, '0')}`;
};

export const buscarEnderecoPorCEP = async (cep) => {
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    return await response.json();
  } catch {
    return null;
  }
};
