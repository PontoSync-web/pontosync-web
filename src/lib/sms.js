import { supabase } from './supabase';

export const enviarSMS = async (telefone, mensagem, matricula, funcionarioId, tipo) => {
  try {
    const { data, error } = await supabase
      .from('sms_logs')
      .insert({
        funcionario_id: funcionarioId,
        matricula: matricula,
        tipo: tipo,
        telefone: telefone,
        mensagem: mensagem,
        status: 'pendente'
      })
      .select();

    if (error) throw error;

    const response = await fetch('/api/enviar-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telefone,
        mensagem,
        logId: data[0].id,
        funcionarioId,
        matricula,
        tipo
      })
    });

    const result = await response.json();

    await supabase
      .from('sms_logs')
      .update({ status: result.success ? 'enviado' : 'erro' })
      .eq('id', data[0].id);

    return result;
  } catch (error) {
    console.error('❌ Erro ao enviar SMS:', error);
    return { success: false, error: error.message };
  }
};

export const formatarMensagemPonto = (funcionario, tipo, hora) => {
  const nomeSistema = '🏢 PONTO SYNC';
  const data = new Date().toLocaleDateString('pt-BR');
  const horario = hora.toLocaleTimeString('pt-BR');
  
  if (tipo === 'entrada') {
    return `${nomeSistema} - Olá ${funcionario.nome} (${funcionario.matricula}) ENTRADA registrada em ${data} ${horario}`;
  } else {
    return `${nomeSistema} - Olá ${funcionario.nome} (${funcionario.matricula}) SAÍDA registrada em ${data} ${horario}`;
  }
};
