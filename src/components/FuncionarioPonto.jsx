import React, { useState, useEffect } from 'react';
import { supabase, gerarMatricula } from '../lib/supabase';
import { enviarSMS, formatarMensagemPonto } from '../lib/sms';
import toast from 'react-hot-toast';

const FuncionarioPonto = () => {
  const [matricula, setMatricula] = useState('');
  const [funcionario, setFuncionario] = useState(null);
  const [loading, setLoading] = useState(false);
  const [registroAtual, setRegistroAtual] = useState(null);
  const [foto, setFoto] = useState(null);
  const [localizacao, setLocalizacao] = useState(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocalizacao({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        },
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
      
      // Verifica se já bateu ponto hoje
      const hoje = new Date().toISOString().split('T')[0];
      const { data: registros } = await supabase
        .from('registros_ponto')
        .select('*')
        .eq('funcionario_id', data.id)
        .gte('timestamp', hoje)
        .order('timestamp', { ascending: false });

      if (registros && registros.length > 0) {
        const ultimo = registros[0];
        setRegistroAtual(ultimo);
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

    // Verifica se já bateu ponto hoje
    const hoje = new Date().toISOString().split('T')[0];
    const { data: registros } = await supabase
      .from('registros_ponto')
      .select('*')
      .eq('funcionario_id', funcionario.id)
      .gte('timestamp', hoje);

    // Verifica se pode registrar (evita batidas duplicadas)
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

      // Envia SMS
      const agora = new Date();
      const mensagem = formatarMensagemPonto(funcionario, tipo, agora);
      
      await enviarSMS(
        funcionario.telefone_celular,
        mensagem,
        funcionario.matricula,
        funcionario.id,
        tipo
      );

      toast.success(`✅ ${tipo.toUpperCase()} registrada com sucesso! SMS enviado.`);
      
      // Gera cartão visual
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
      <div class="bg-gray-800 p-8 rounded-2xl max-w-md w-full border border-blue-500 shadow-2xl">
        <div class="text-center mb-4">
          <h2 class="text-2xl font-bold text-blue-400">🏢 ORION PONTO PRO</h2>
          <p class="text-gray-400 text-sm">Comprovante de Ponto - Portaria 671</p>
        </div>
        <div class="border-t border-gray-600 pt-4">
          <p class="text-white"><strong>Funcionário:</strong> ${func.nome}</p>
          <p class="text-white"><strong>Matrícula:</strong> ${func.matricula}</p>
          <p class="text-white"><strong>Cargo:</strong> ${func.cargo}</p>
          <p class="text-white"><strong>Data:</strong> ${data}</p>
          <p class="text-${tipo === 'entrada' ? 'green' : 'red'}-400 text-2xl font-bold">
            <strong>${tipo.toUpperCase()}:</strong> ${horario}
          </p>
          ${localizacao ? `<p class="text-gray-400 text-xs">📍 ${localizacao.lat}, ${localizacao.lng}</p>` : ''}
          <p class="text-gray-500 text-xs mt-2">Código: ${func.matricula}-${Date.now()}</p>
        </div>
        <button onclick="this.closest('.fixed').remove()" 
                class="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded transition">
          Fechar Comprovante
        </button>
      </div>
    `;
    document.body.appendChild(cartao);
    
    // Fecha após 10 segundos
    setTimeout(() => {
      if (cartao.parentNode) cartao.remove();
    }, 10000);
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-blue-400 mb-6">📍 Bater Ponto</h1>

      {/* Buscar funcionário */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Digite a matrícula (ex: ORION-0001)"
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

      {/* Dados do funcionário */}
      {funcionario && (
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-4">
            {funcionario.foto_url ? (
              <img
                src={funcionario.foto_url}
                alt={funcionario.nome}
                className="w-16 h-16 rounded-full object-cover border-2 border-blue-500"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center text-2xl">
                👤
              </div>
            )}
            <div>
              <p className="text-white font-semibold text-lg">{funcionario.nome}</p>
              <p className="text-gray-400 text-sm">{funcionario.cargo} - {funcionario.funcao}</p>
              <p className="text-gray-500 text-xs">Matrícula: {funcionario.matricula}</p>
            </div>
          </div>
        </div>
      )}

      {/* Botões de ponto */}
      {funcionario && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => registrarPonto('entrada')}
            disabled={loading || registroAtual?.tipo === 'entrada'}
            className="bg-green-600 hover:bg-green-700 p-4 rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✅ ENTRADA
          </button>
          <button
            onClick={() => registrarPonto('saida')}
            disabled={loading || !registroAtual || registroAtual?.tipo === 'saida'}
            className="bg-red-600 hover:bg-red-700 p-4 rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🚪 SAÍDA
          </button>
        </div>
      )}

      {/* Status do último registro */}
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

      {/* Geolocalização */}
      {localizacao && (
        <p className="text-gray-500 text-xs mt-2 text-center">
          📍 {localizacao.lat.toFixed(6)}, {localizacao.lng.toFixed(6)}
        </p>
      )}
    </div>
  );
};

export default FuncionarioPonto;
