import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================================
// ROTAS DA API
// ============================================================

app.post('/api/enviar-sms', async (req, res) => {
  const { telefone, mensagem, funcionarioId, matricula, tipo } = req.body;

  try {
    const { error: logError } = await supabase
      .from('sms_logs')
      .insert({
        funcionario_id: funcionarioId,
        matricula: matricula,
        tipo: tipo || 'alerta',
        telefone: telefone,
        mensagem: mensagem,
        status: 'enviado'
      });

    if (logError) console.error('❌ Erro ao salvar log de SMS:', logError);

    console.log(`📱 SMS (simulado) para ${telefone}: ${mensagem}`);

    res.json({ success: true, message: 'SMS enviado com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao enviar SMS:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/registrar-ponto', async (req, res) => {
  const { funcionario_id, matricula, tipo, lat, lng, codigo } = req.body;

  if (!funcionario_id || !matricula || !tipo || !codigo) {
    return res.status(400).json({ error: 'Dados incompletos para registrar ponto' });
  }

  try {
    const { data, error } = await supabase
      .from('registros_ponto')
      .insert({
        funcionario_id,
        matricula,
        tipo,
        lat,
        lng,
        codigo
      })
      .select();

    if (error) throw error;

    res.json({ success: true, registro: data[0] });
  } catch (error) {
    console.error('❌ Erro ao registrar ponto:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/funcionario/:matricula', async (req, res) => {
  const { matricula } = req.params;

  try {
    const { data, error } = await supabase
      .from('funcionarios')
      .select('*')
      .eq('matricula', matricula)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }

    res.json(data);
  } catch (error) {
    console.error('❌ Erro ao buscar funcionário:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/funcionarios', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('funcionarios')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('❌ Erro ao listar funcionários:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/funcionarios', async (req, res) => {
  const funcionario = req.body;

  try {
    const { data, error } = await supabase
      .from('funcionarios')
      .insert([funcionario])
      .select();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'CPF ou matrícula já cadastrados' });
      }
      throw error;
    }

    res.json({ success: true, funcionario: data[0] });
  } catch (error) {
    console.error('❌ Erro ao cadastrar funcionário:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/registros/:funcionario_id', async (req, res) => {
  const { funcionario_id } = req.params;
  const { limite = 50 } = req.query;

  try {
    const { data, error } = await supabase
      .from('registros_ponto')
      .select('*')
      .eq('funcionario_id', funcionario_id)
      .order('timestamp', { ascending: false })
      .limit(parseInt(limite));

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('❌ Erro ao buscar registros:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// SERVE ARQUIVOS ESTÁTICOS
// ============================================================

const distPath = path.join(__dirname, 'dist');
console.log(`📂 Servindo arquivos estáticos de: ${distPath}`);

app.use(express.static(distPath));

// Fallback para SPA
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Rota não encontrada' });
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

// ============================================================
// INICIALIZAÇÃO
// ============================================================
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${port}`);
  console.log(`📅 Data/Hora: ${new Date().toLocaleString('pt-BR')}`);
  console.log(`📂 Pasta estática: ${distPath}`);
});

export default app;
