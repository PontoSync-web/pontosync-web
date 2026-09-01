 import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { enviarSMS, formatarReciboPonto, verificarFerias } from '../lib/sms';
import { buscarBancoHoras, atualizarBancoHoras, calcularSaldoAcumulado } from '../lib/bancoHoras';
import toast from 'react-hot-toast';

const FuncionarioPonto = () => {
  const [matricula, setMatricula] = useState('');
  const [funcionario, setFuncionario] = useState(null);
  const [loading, setLoading] = useState(false);
  const [registroAtual, setRegistroAtual] = useState(null);
  const [localizacao, setLocalizacao] = useState(null);
  const [infoFerias, setInfoFerias] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [bancoHoras, setBancoHoras] = useState(null);
  const [saldoAcumulado, setSaldoAcumulado] = useState(0);

  const HORARIO_INICIO = 6;
  const HORARIO_FIM = 20;

  const verificarHorarioPermitido = () => {
    const agora = new Date();
    const hora = agora.getHours();
    return hora >= HORARIO_INICIO && hora < HORARIO_FIM;
  };

  const buscarAdmin = async () => {
    try {
      const { data, error } = await supabase
        .from('administradores')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1);

      if (error) throw error;
      if (data && data.length > 0) setAdmin(data[0]);
    } catch (error) {
      console.error('❌ Erro ao buscar admin:', error);
    }
  };

  useEffect(() => {
    buscarAdmin();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocalizacao({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.log('Geolocalização não autorizada')
      );
    }
  }, []);

  const buscarFuncionario = async () => {
    if (!matricula.trim()) {
      toast.error('Digite a matrícula');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('funcionarios')
        .select('*')
        .eq('matricula', matricula)
        .single();

      if (error || !data) {
        toast.error('Funcionário não encontrado');
        setFuncionario(null);
        return;
      }

      setFuncionario(data);

      const ferias = verificarFerias(data);
      setInfoFerias(ferias);

      const banco = await buscarBancoHoras(data.id);
      setBancoHoras(banco);

      const saldo = await calcularSaldoAcumulado(data.id);
      setSaldoAcumulado(saldo);

      const hoje = new Date().toISOString().split('T')[0];
      const { data: registros } = await supabase
        .from('registros_ponto')
        .select('*')
        .eq('funcionario_id', data.id)
        .gte('timestamp', hoje)
        .order('timestamp', { ascending: false });

      if (registros && registros.length > 0) {
        setRegistroAtual(registros[0]);
      }

      toast.success(`Bem-vindo, ${data.nome}!`);
    } catch (error) {
      toast.error('Erro ao buscar funcionário');
    } finally {
      setLoading(false);
    }
  };

  const registrarPonto = async (tipo) => {
    if (!funcionario) {
      toast.error('Funcionário não identificado');
      return;
    }

    if (!verificarHorarioPermitido()) {
      toast.error(`⏰ Ponto permitido apenas das 06:00 às 20:00.`);
      return;
    }

    if (infoFerias?.emFerias) {
      toast.error(`🚫 Funcionário em férias até ${new Date(infoFerias.fim).toLocaleDateString('pt-BR')}`);
      return;
    }

    const hoje = new Date().toISOString().split('T')[0];
    const { data: registros } = await supabase
      .from('registros_ponto')
      .select('*')
      .eq('funcionario_id', funcionario.id)
      .gte('timestamp', hoje);

    const ultimoTipo = registros?.length > 0 ? registros[registros.length - 1].tipo : null;
    
    if (tipo === 'entrada' && ultimoTipo === 'entrada') {
      toast.error('Você já registrou entrada hoje');
      return;
    }

    if (tipo === 'saida' && ultimoTipo !== 'entrada') {
      toast.error('Você precisa registrar a entrada primeiro');
      return;
    }

    setLoading(true);
    try {
      const codigo = `${funcionario.matricula}-${Date.now()}`;
      
      const { data, error } = await supabase
        .from('registros_ponto')
        .insert({
          funcionario_id: funcionario.id,
          matricula: funcionario.matricula,
          tipo: tipo,
          lat: localizacao?.lat || null,
          lng: localizacao?.lng || null,
          codigo: codigo
        })
        .select()
        .single();

      if (error) throw error;

      setRegistroAtual(data);

      const cargaHoraria = parseFloat(funcionario.carga_horaria) || 8;
      const bancoAtualizado = await atualizarBancoHoras(funcionario.id, cargaHoraria);
      if (bancoAtualizado) {
        setBancoHoras(bancoAtualizado);
        const saldo = await calcularSaldoAcumulado(funcionario.id);
        setSaldoAcumulado(saldo);
      }

      const agora = new Date();
      const recibo = formatarReciboPonto(funcionario, tipo, agora, localizacao);

      if (funcionario.telefone) {
        await enviarSMS(
          funcionario.telefone,
          recibo,
          funcionario.matricula,
          funcionario.id,
          'funcionario',
          funcionario.nome
        );
      }

      if (admin?.telefone) {
        await enviarSMS(
          admin.telefone,
          recibo,
          funcionario.matricula,
          admin.id,
          'admin',
          admin.nome
        );
      }

      toast.success(`✅ ${tipo.toUpperCase()} registrada!`);
      gerarCartaoPonto(funcionario, tipo, agora);

    } catch (error) {
      toast.error('Erro ao registrar ponto');
    } finally {
      setLoading(false);
    }
  };

  const gerarCartaoPonto = (func, tipo, hora) => {
    const data = hora.toLocaleDateString('pt-BR');
    const horario = hora.toLocaleTimeString('pt-BR');
    
    const cartao = document.createElement('div');
    cartao.className = 'fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50';
    cartao.innerHTML = `
      <div class="bg-gray-800 p-8 rounded-2xl max-w-md w-full border border-blue-500 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div class="text-center mb-4">
          <h2 class="text-2xl font-bold text-blue-400">🏢 PONTO SYNC</h2>
          <p class="text-gray-400 text-sm">Comprovante de Ponto</p>
        </div>
        <div class="border-t border-gray-600 pt-4 space-y-1">
          <p class="text-white"><strong>Funcionário:</strong> ${func.nome}</p>
          <p class="text-white"><strong>Matrícula:</strong> ${func.matricula}</p>
          <p class="text-white"><strong>Cargo:</strong> ${func.cargo}</p>
          <p class="text-white"><strong>Carga Horária:</strong> ${func.carga_horaria || 8}h</p>
          <p class="text-white"><strong>Data:</strong> ${data}</p>
          <p class="text-${tipo === 'entrada' ? 'green' : 'red'}-400 text-2xl font-bold">
            ${tipo.toUpperCase()}: ${horario}
          </p>
          ${localizacao ? `<p class="text-gray-400 text-xs">📍 ${localizacao.lat.toFixed(6)}, ${localizacao.lng.toFixed(6)}</p>` : ''}
          
          ${bancoHoras ? `
            <div class="mt-4 pt-4 border-t border-gray-700">
              <p class="text-gray-400 text-sm font-semibold">📊 Banco de Horas - ${bancoHoras.mes_ano}</p>
              <div class="grid grid-cols-3 gap-2 text-xs mt-2">
                <div class="bg-gray-700 p-2 rounded text-center">
                  <p class="text-gray-400">Trabalhadas</p>
                  <p class="text-white font-bold">${bancoHoras.horas_trabalhadas || 0}h</p>
                </div>
                <div class="bg-green-900 p-2 rounded text-center">
                  <p class="text-gray-400">Excedentes</p>
                  <p class="text-green-400 font-bold">${bancoHoras.horas_excedentes || 0}h</p>
                </div>
                <div class="bg-red-900 p-2 rounded text-center">
                  <p class="text-gray-400">Débito</p>
                  <p class="text-red-400 font-bold">${bancoHoras.horas_debito || 0}h</p>
                </div>
              </div>
              <p class="text-center text-sm mt-2 ${saldoAcumulado >= 0 ? 'text-green-400' : 'text-red-400'}">
                Saldo acumulado: ${saldoAcumulado >= 0 ? '+' : ''}${saldoAcumulado || 0}h
              </p>
            </div>
          ` : ''}
        </div>
        <button onclick="this.closest('.fixed').remove()" 
                class="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded transition">
          Fechar Comprovante
        </button>
      </div>
    `;
    document.body.appendChild(cartao);
    
    setTimeout(() => {
      if (cartao.parentNode) cartao.remove();
    }, 20000);
  };

  const horarioStatus = verificarHorarioPermitido();

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-blue-400 mb-2">📍 Bater Ponto</h1>
      <p className="text-gray-400 text-sm mb-4">Central de Mandados • 06:00 às 20:00</p>

      <div className={`p-2 rounded-lg mb-4 text-center text-sm ${
        horarioStatus ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
      }`}>
        {horarioStatus ? '✅ Horário permitido para bater ponto' : '⏰ Fora do horário permitido'}
      </div>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Digite sua matrícula"
          value={matricula}
          onChange={(e) => setMatricula(e.target.value.toUpperCase())}
          className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={(e) => e.key === 'Enter' && buscarFuncionario()}
        />
        <button
          onClick={buscarFuncionario}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold transition disabled:opacity-50"
        >
          {loading ? '⏳' : '🔍'}
        </button>
      </div>

      {funcionario && (
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-4">
            {funcionario.foto_url ? (
              <img src={funcionario.foto_url} alt={funcionario.nome} className="w-16 h-16 rounded-full object-cover border-2 border-blue-500" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center text-2xl">👤</div>
            )}
            <div>
              <p className="text-white font-semibold text-lg">{funcionario.nome}</p>
              <p className="text-gray-400 text-sm">{funcionario.cargo} - {funcionario.funcao}</p>
              <p className="text-gray-500 text-xs">Matrícula: {funcionario.matricula}</p>
              {infoFerias?.emFerias && (
                <p className="text-yellow-400 text-xs font-bold">🚫 EM FÉRIAS</p>
              )}
            </div>
          </div>

          {bancoHoras && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-gray-400 text-sm font-semibold">📊 Banco de Horas - {bancoHoras.mes_ano}</p>
              <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                <div className="bg-gray-700 p-2 rounded text-center">
                  <p className="text-gray-400">Trabalhadas</p>
                  <p className="text-white font-bold">{bancoHoras.horas_trabalhadas || 0}h</p>
                </div>
                <div className="bg-green-900 p-2 rounded text-center">
                  <p className="text-gray-400">Excedentes</p>
                  <p className="text-green-400 font-bold">{bancoHoras.horas_excedentes || 0}h</p>
                </div>
                <div className="bg-red-900 p-2 rounded text-center">
                  <p className="text-gray-400">Débito</p>
                  <p className="text-red-400 font-bold">{bancoHoras.horas_debito || 0}h</p>
                </div>
              </div>
              <p className={`text-center text-sm mt-2 ${saldoAcumulado >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                Saldo acumulado: {saldoAcumulado >= 0 ? '+' : ''}{saldoAcumulado || 0}h
              </p>
            </div>
          )}
        </div>
      )}

      {funcionario && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => registrarPonto('entrada')}
            disabled={loading || infoFerias?.emFerias || registroAtual?.tipo === 'entrada' || !horarioStatus}
            className={`p-4 rounded-lg font-bold transition ${
              loading || infoFerias?.emFerias || registroAtual?.tipo === 'entrada' || !horarioStatus
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            ✅ ENTRADA
          </button>
          <button
            onClick={() => registrarPonto('saida')}
            disabled={loading || infoFerias?.emFerias || !registroAtual || registroAtual?.tipo === 'saida' || !horarioStatus}
            className={`p-4 rounded-lg font-bold transition ${
              loading || infoFerias?.emFerias || !registroAtual || registroAtual?.tipo === 'saida' || !horarioStatus
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            🚪 SAÍDA
          </button>
        </div>
      )}

      {registroAtual && (
        <div className="mt-4 bg-gray-700 p-3 rounded-lg text-center">
          <p className="text-gray-300 text-sm">
            Última batida: <span className="text-white font-semibold">
              {new Date(registroAtual.timestamp).toLocaleTimeString('pt-BR')}
            </span>
          </p>
          <p className={`text-sm ${registroAtual.tipo === 'entrada' ? 'text-green-400' : 'text-red-400'}`}>
            {registroAtual.tipo.toUpperCase()} registrada
          </p>
        </div>
      )}

      {localizacao && (
        <p className="text-gray-500 text-xs mt-2 text-center">
          📍 {localizacao.lat.toFixed(6)}, {localizacao.lng.toFixed(6)}
        </p>
      )}
    </div>
  );
};

export default FuncionarioPonto;
