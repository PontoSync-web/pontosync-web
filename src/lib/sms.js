 import { supabase } from './supabase';

export const enviarSMS = async (telefone, mensagem, matricula, pessoaId, tipo, nome) => {
  try {
    const { data, error } = await supabase
      .from('sms_logs')
      .insert({
        funcionario_id: pessoaId || null,
        administrador_id: tipo === 'admin' ? pessoaId : null,
        matricula: matricula || 'N/A',
        tipo: tipo || 'alerta',
        telefone: telefone,
        mensagem: mensagem,
        nome: nome || 'Sistema',
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
        pessoaId,
        matricula,
        tipo,
        nome
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

export const formatarReciboCadastro = (pessoa, tipo, adminNome) => {
  const data = new Date().toLocaleDateString('pt-BR');
  const horario = new Date().toLocaleTimeString('pt-BR');
  const nomeSistema = '🏢 PONTO SYNC';
  
  const cabecalho = `${nomeSistema} - RECIBO DE CADASTRO\n`;
  const linha = '----------------------------------------\n';
  const rodape = `Data: ${data} ${horario}\nSistema: PontoSync v2.0`;

  if (tipo === 'admin') {
    return `${cabecalho}${linha}👤 ADMINISTRADOR CADASTRADO\n${linha}Nome: ${pessoa.nome}\nMatrícula: ${pessoa.matricula || 'N/A'}\nCargo: ${pessoa.cargo || 'N/A'}\nSetor: ${pessoa.setor || 'N/A'}\nTurno: ${pessoa.turno || 'N/A'}\n${linha}${rodape}`;
  }

  return `${cabecalho}${linha}👤 FUNCIONÁRIO CADASTRADO\n${linha}Nome: ${pessoa.nome}\nMatrícula: ${pessoa.matricula}\nCargo: ${pessoa.cargo}\nSetor: ${pessoa.setor || 'N/A'}\nFunção: ${pessoa.funcao || 'N/A'}\nTurno: ${pessoa.turno}\nCarga Horária: ${pessoa.carga_horaria || '8'}h\nHorário: ${pessoa.horario_entrada || '08:00'} - ${pessoa.horario_saida || '17:00'}\n${linha}Cadastrado por: ${adminNome}\n${rodape}`;
};

export const formatarReciboPonto = (funcionario, tipo, hora, localizacao) => {
  const data = new Date().toLocaleDateString('pt-BR');
  const horario = hora.toLocaleTimeString('pt-BR');
  const nomeSistema = '🏢 PONTO SYNC';
  
  const cabecalho = `${nomeSistema} - RECIBO DE PONTO\n`;
  const linha = '----------------------------------------\n';
  const rodape = `Data: ${data} ${horario}\nSistema: PontoSync v2.0`;

  const tipoLabel = tipo === 'entrada' ? '✅ ENTRADA' : '🚪 SAÍDA';

  return `${cabecalho}${linha}${tipoLabel}\n${linha}Nome: ${funcionario.nome}\nMatrícula: ${funcionario.matricula}\nCargo: ${funcionario.cargo}\nSetor: ${funcionario.setor || 'N/A'}\nTurno: ${funcionario.turno}\n${linha}${localizacao ? `📍 Local: ${localizacao.lat.toFixed(6)}, ${localizacao.lng.toFixed(6)}\n` : ''}${rodape}`;
};

export const verificarFerias = (funcionario) => {
  if (!funcionario.periodo_ferias_inicio || !funcionario.periodo_ferias_fim) {
    return { emFerias: false };
  }

  const hoje = new Date();
  const inicio = new Date(funcionario.periodo_ferias_inicio);
  const fim = new Date(funcionario.periodo_ferias_fim);

  hoje.setHours(0, 0, 0, 0);
  inicio.setHours(0, 0, 0, 0);
  fim.setHours(0, 0, 0, 0);

  const emFerias = hoje >= inicio && hoje <= fim;

  return {
    emFerias,
    inicio: funcionario.periodo_ferias_inicio,
    fim: funcionario.periodo_ferias_fim,
    diasRestantes: emFerias ? Math.ceil((fim - hoje) / (1000 * 60 * 60 * 24)) : 0
  };
};
