import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const port = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Supabase
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Twilio
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Rota para enviar SMS
app.post('/api/enviar-sms', async (req, res) => {
  const { telefone, mensagem, logId } = req.body;

  try {
    // Envia via Twilio
    const result = await twilioClient.messages.create({
      body: mensagem,
      to: telefone,
      from: process.env.TWILIO_PHONE_NUMBER
    });

    // Atualiza log no Supabase
    if (logId) {
      await supabase
        .from('sms_logs')
        .update({ status: 'enviado' })
        .eq('id', logId);
    }

    res.json({ success: true, sid: result.sid });
  } catch (error) {
    console.error('Erro ao enviar SMS:', error);
    
    // Atualiza log como erro
    if (logId) {
      await supabase
        .from('sms_logs')
        .update({ status: 'erro' })
        .eq('id', logId);
    }

    res.status(500).json({ success: false, error: error.message });
  }
});

// Rota para enviar SMS (via Zenvia - alternativa)
app.post('/api/enviar-sms-zenvia', async (req, res) => {
  const { telefone, mensagem, logId } = req.body;

  try {
    const response = await fetch('https://api.zenvia.com/v2/channels/whatsapp/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(process.env.ZENVIA_API_KEY)}`
      },
      body: JSON.stringify({
        from: process.env.ZENVIA_PHONE_NUMBER,
        to: telefone,
        contents: [{ type: 'text', text: mensagem }]
      })
    });

    const result = await response.json();

    if (logId) {
      await supabase
        .from('sms_logs')
        .update({ status: response.ok ? 'enviado' : 'erro' })
        .eq('id', logId);
    }

    res.json({ success: response.ok, data: result });
  } catch (error) {
    console.error('Erro ao enviar SMS via Zenvia:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 ORION PONTO PRO API rodando na porta ${port}`);
});
