 import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// ============================================================
// CONFIGURAÇÃO DE AMBIENTE
// ============================================================
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 10000;

// ============================================================
// HORÁRIO PERMITIDO PARA BATER PONTO
// ============================================================
const HORARIO_INICIO = 6;  // 06:00
const HORARIO_FIM = 20;    // 20:00

const verificarHorarioPermitido = () => {
  const agora = new Date();
  const hora = agora.getHours();
  return hora >= HORARIO_INICIO && hora < HORARIO_FIM;
};

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ============================================================
// SUPABASE
// ============================================================
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
console.log('🔗 Conectado ao Supabase');

// ============================================================
// ROTAS DA API
// ============================================================

// ============================================================
// 1. ENVIAR SMS (via Twilio ou simulado)
// ============================================================
app.post('/api/enviar-sms', async (req, res) => {
  const { telefone, mensagem, logId, pessoaId, matricula, tipo, nome } = req.body;

  try {
    // Atualiza log no Supabase
    if (logId) {
      await supabase
        .from('sms_logs')
        .update({ status: 'enviado' })
        .eq('id', logId);
    }

    // Verifica se tem Twilio configurado
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      const twilio = await import('twilio');
      const twilioClient = twilio.default(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      const result = await twilioClient.messages.create({
        body: mensagem,
        to: telefone,
        from: process.env.TWILIO_PHONE_NUMBER
      });

      console.log(`✅ SMS enviado para ${telefone}: ${result.sid}`);
      return res.json({ success: true, sid: result.sid });
    }

    // Modo simulado (desenvolvimento)
    console.log(`📱 SMS (simulado) para ${telefone}:`);
    console.log('----------------------------------------');
    console.log(mensagem);
    console.log('----------------------------------------');
    console.log(`✅ SMS simulado enviado com sucesso!`);

    res.json({ success: true, message: 'SMS enviado (modo simulação)' });
  } catch (error) {
    console.error('❌ Erro ao enviar SMS:', error);
    
    if (logId) {
      await supabase
        .from('sms_logs')
        .update({ status: 'erro' })
        .eq('id', logId);
    }

    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// 2. REGISTRAR PONTO (com validação de horário)
// ============================================================
app.post('/api/registrar-ponto', async (req, res) => {
  const { funcionario_id, matricula, tipo, lat, lng, codigo } = req.body;

  if (!funcionario_id || !matricula || !tipo || !codigo) {
    return res.status(400).json({ error: 'Dados incompletos para registrar ponto' });
  }

  // VERIFICA HORÁRIO PERMITIDO
  if (!verificarHorarioPermitido()) {
    return res.status(403).json({ 
      error: '⏰ Ponto permitido apenas das 06:00 às 20:00',
      horario: { inicio: HORARIO_INICIO, fim: HORARIO_FIM }
    });
  }

  // VERIFICA SE O FUNCIONÁRIO EXISTE E ESTÁ ATIVO
  const { data: funcionario, error: funcError } = await supabase
    .from('funcionarios')
    .select('id, nome, matricula, status, periodo_ferias_inicio, periodo_ferias_fim')
    .eq('id', funcionario_id)
    .single();

  if (funcError || !funcionario) {
    return res.status(404).json({ error: 'Funcionário não encontrado' });
  }

  if (funcionario.status !== 'ativo') {
    return res.status(403).json({ error: 'Funcionário inativo. Não é possível bater ponto.' });
  }

  // VERIFICA FÉRIAS
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  if (funcionario.periodo_ferias_inicio && funcionario.periodo_ferias_fim) {
    const inicio = new Date(funcionario.periodo_ferias_inicio);
    const fim = new Date(funcionario.periodo_ferias_fim);
    inicio.setHours(0, 0, 0, 0);
    fim.setHours(0, 0, 0, 0);
    
    if (hoje >= inicio && hoje <= fim) {
      return res.status(403).json({ 
        error: '🚫 Funcionário em gozo de férias. Não é possível bater ponto.',
        ferias: { inicio: funcionario.periodo_ferias_inicio, fim: funcionario.periodo_ferias_fim }
      });
    }
  }

  // VERIFICA SE JÁ BATEU PONTO HOJE
  const hojeStr = hoje.toISOString().split('T')[0];
  const { data: registros, error: regError } = await supabase
    .from('registros_ponto')
    .select('*')
    .eq('funcionario_id', funcionario_id)
    .gte('timestamp', hojeStr)
    .order('timestamp', { ascending: false });

  if (regError) {
    console.error('❌ Erro ao buscar registros:', regError);
  }

  const ultimoTipo = registros?.length > 0 ? registros[0].tipo : null;
  
  if (tipo === 'entrada' && ultimoTipo === 'entrada') {
    return res.status(400).json({ error: 'Você já registrou entrada hoje' });
  }

  if (tipo === 'saida' && ultimoTipo !== 'entrada') {
    return res.status(400).json({ error: 'Você precisa registrar a entrada primeiro' });
  }

  // REGISTRA O PONTO
  try {
    const { data, error } = await supabase
      .from('registros_ponto')
      .insert({
        funcionario_id,
        matricula,
        tipo,
        lat: lat || null,
        lng: lng || null,
        codigo,
        data: hojeStr
      })
      .select()
      .single();

    if (error) throw error;

    // BUSCA ADMINISTRADOR PARA ENVIAR SMS
    const { data: admin } = await supabase
      .from('administradores')
      .select('id, nome, telefone')
      .order('created_at', { ascending: true })
      .limit(1);

    res.json({
      success: true,
      registro: data,
      admin: admin?.[0] || null,
      horario_permitido: { inicio: HORARIO_INICIO, fim: HORARIO_FIM }
    });

  } catch (error) {
    console.error('❌ Erro ao registrar ponto:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 3. BUSCAR FUNCIONÁRIO POR MATRÍCULA
// ============================================================
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

// ============================================================
// 4. LISTAR FUNCIONÁRIOS
// ============================================================
app.get('/api/funcionarios', async (req, res) => {
  const { cargo, setor, funcao } = req.query;

  try {
    let query = supabase.from('funcionarios').select('*');

    if (cargo) query = query.eq('cargo', cargo);
    if (setor) query = query.eq('setor', setor);
    if (funcao) query = query.eq('funcao', funcao);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('❌ Erro ao listar funcionários:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 5. CADASTRAR FUNCIONÁRIO
// ============================================================
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

// ============================================================
// 6. BUSCAR REGISTROS DE PONTO DE UM FUNCIONÁRIO
// ============================================================
app.get('/api/registros/:funcionario_id', async (req, res) => {
  const { funcionario_id } = req.params;
  const { limite = 50, data_inicio, data_fim } = req.query;

  try {
    let query = supabase
      .from('registros_ponto')
      .select('*')
      .eq('funcionario_id', funcionario_id)
      .order('timestamp', { ascending: false })
      .limit(parseInt(limite));

    if (data_inicio) {
      query = query.gte('timestamp', data_inicio);
    }
    if (data_fim) {
      query = query.lte('timestamp', data_fim);
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('❌ Erro ao buscar registros:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 7. ATUALIZAR FUNCIONÁRIO
// ============================================================
app.put('/api/funcionarios/:id', async (req, res) => {
  const { id } = req.params;
  const dados = req.body;

  try {
    const { data, error } = await supabase
      .from('funcionarios')
      .update(dados)
      .eq('id', id)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }

    res.json({ success: true, funcionario: data[0] });
  } catch (error) {
    console.error('❌ Erro ao atualizar funcionário:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 8. EXCLUIR FUNCIONÁRIO
// ============================================================
app.delete('/api/funcionarios/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('funcionarios')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Erro ao excluir funcionário:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 9. BUSCAR ADMINISTRADORES
// ============================================================
app.get('/api/administradores', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('administradores')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('❌ Erro ao buscar administradores:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 10. CADASTRAR ADMINISTRADOR
// ============================================================
app.post('/api/administradores', async (req, res) => {
  const admin = req.body;

  try {
    const { data, error } = await supabase
      .from('administradores')
      .insert([admin])
      .select();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'CPF ou e-mail já cadastrados' });
      }
      throw error;
    }

    res.json({ success: true, administrador: data[0] });
  } catch (error) {
    console.error('❌ Erro ao cadastrar administrador:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 11. VERIFICAR STATUS DO SERVIDOR
// ============================================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    horario_permitido: {
      inicio: HORARIO_INICIO,
      fim: HORARIO_FIM,
      atual: verificarHorarioPermitido() ? 'permitido' : 'bloqueado'
    }
  });
});

// ============================================================
// SERVE ARQUIVOS ESTÁTICOS (React)
// ============================================================

const distPath = path.join(__dirname, 'dist');
console.log(`📂 Servindo arquivos estáticos de: ${distPath}`);

// Verifica se a pasta dist existe
if (!fs.existsSync(distPath)) {
  console.warn('⚠️ Pasta dist não encontrada. Criando...');
  fs.mkdirSync(distPath, { recursive: true });
  // Cria um index.html básico se não existir
  const indexHtml = path.join(distPath, 'index.html');
  if (!fs.existsSync(indexHtml)) {
    fs.writeFileSync(indexHtml, `
      <!DOCTYPE html>
      <html>
        <head><title>PontoSync</title></head>
        <body>
          <div id="root"></div>
          <script type="module" src="/src/main.jsx"></script>
          <p style="text-align:center;margin-top:50px;font-family:sans-serif;">
            ⏳ Aguarde o build do frontend...
          </p>
        </body>
      </html>
    `);
  }
}

app.use(express.static(distPath));

// Fallback para React Router (SPA)
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
  console.log(`🚀 Servidor PontoSync rodando na porta ${port}`);
  console.log(`📅 Data/Hora: ${new Date().toLocaleString('pt-BR')}`);
  console.log(`📂 Pasta estática: ${distPath}`);
  console.log(`⏰ Horário permitido: ${String(HORARIO_INICIO).padStart(2, '0')}:00 às ${String(HORARIO_FIM).padStart(2, '0')}:00`);
  console.log(`🧠 Status atual: ${verificarHorarioPermitido() ? '✅ Permitido' : '⏰ Bloqueado'}`);
});

export default app;
