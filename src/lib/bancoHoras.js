import { supabase } from './supabase';

/**
 * Calcula horas trabalhadas entre duas datas
 */
export const calcularHorasTrabalhadas = (entrada, saida) => {
  const diff = (saida - entrada) / (1000 * 60 * 60); // em horas
  return Math.round(diff * 100) / 100; // arredonda para 2 casas
};

/**
 * Obtém o mês/ano atual no formato 'YYYY-MM'
 */
export const obterMesAno = (data = new Date()) => {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  return `${ano}-${mes}`;
};

/**
 * Busca o banco de horas de um funcionário no mês atual
 */
export const buscarBancoHoras = async (funcionarioId, mesAno = null) => {
  const mes = mesAno || obterMesAno();
  
  try {
    const { data, error } = await supabase
      .from('banco_horas')
      .select('*')
      .eq('funcionario_id', funcionarioId)
      .eq('mes_ano', mes)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  } catch (error) {
    console.error('❌ Erro ao buscar banco de horas:', error);
    return null;
  }
};

/**
 * Atualiza o banco de horas após uma batida
 */
export const atualizarBancoHoras = async (funcionarioId, cargaHorariaDiaria, mesAno = null) => {
  const mes = mesAno || obterMesAno();
  
  try {
    // Busca todos os registros de ponto do mês
    const inicioMes = new Date(mes + '-01');
    const fimMes = new Date(mes + '-' + new Date(mes + '-01').getMonth() + 1, 0);
    
    const { data: registros, error } = await supabase
      .from('registros_ponto')
      .select('*')
      .eq('funcionario_id', funcionarioId)
      .gte('timestamp', inicioMes.toISOString())
      .lte('timestamp', fimMes.toISOString())
      .order('timestamp', { ascending: true });

    if (error) throw error;

    // Agrupa por dia
    const dias = {};
    registros.forEach(reg => {
      const data = new Date(reg.timestamp).toISOString().split('T')[0];
      if (!dias[data]) dias[data] = [];
      dias[data].push(reg);
    });

    let totalHoras = 0;
    let diasCompletos = 0;

    // Calcula horas por dia
    for (const [data, regs] of Object.entries(dias)) {
      const entradas = regs.filter(r => r.tipo === 'entrada');
      const saidas = regs.filter(r => r.tipo === 'saida');
      
      // Pega a primeira entrada e última saída do dia
      if (entradas.length > 0 && saidas.length > 0) {
        const entrada = new Date(entradas[0].timestamp);
        const saida = new Date(saidas[saidas.length - 1].timestamp);
        const horas = calcularHorasTrabalhadas(entrada, saida);
        totalHoras += horas;
        diasCompletos++;
      }
    }

    // Calcula horas esperadas (dias trabalhados no mês)
    const diasUteis = diasCompletos; // Considera apenas dias com registro completo
    const horasEsperadas = diasUteis * parseFloat(cargaHorariaDiaria);
    
    const saldo = totalHoras - horasEsperadas;
    const horasExcedentes = saldo > 0 ? saldo : 0;
    const horasDebito = saldo < 0 ? Math.abs(saldo) : 0;

    // Salva no banco
    const { data, error: upsertError } = await supabase
      .from('banco_horas')
      .upsert({
        funcionario_id: funcionarioId,
        mes_ano: mes,
        horas_trabalhadas: Math.round(totalHoras * 100) / 100,
        horas_excedentes: Math.round(horasExcedentes * 100) / 100,
        horas_debito: Math.round(horasDebito * 100) / 100,
        saldo: Math.round(saldo * 100) / 100,
        updated_at: new Date().toISOString()
      }, { onConflict: 'funcionario_id, mes_ano' })
      .select();

    if (upsertError) throw upsertError;
    return data?.[0] || null;

  } catch (error) {
    console.error('❌ Erro ao atualizar banco de horas:', error);
    return null;
  }
};

/**
 * Calcula o saldo acumulado do funcionário
 */
export const calcularSaldoAcumulado = async (funcionarioId) => {
  try {
    const { data, error } = await supabase
      .from('banco_horas')
      .select('saldo')
      .eq('funcionario_id', funcionarioId)
      .order('mes_ano', { ascending: true });

    if (error) throw error;
    
    const saldoTotal = data.reduce((acc, item) => acc + (item.saldo || 0), 0);
    return Math.round(saldoTotal * 100) / 100;
  } catch (error) {
    console.error('❌ Erro ao calcular saldo acumulado:', error);
    return 0;
  }
};

/**
 * Gera relatório de banco de horas por período
 */
export const gerarRelatorioBancoHoras = async (funcionarioId, mesInicio, mesFim) => {
  try {
    const { data, error } = await supabase
      .from('banco_horas')
      .select('*')
      .eq('funcionario_id', funcionarioId)
      .gte('mes_ano', mesInicio)
      .lte('mes_ano', mesFim)
      .order('mes_ano', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Erro ao gerar relatório:', error);
    return [];
  }
};
