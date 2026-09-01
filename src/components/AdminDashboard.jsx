 import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer, 
  Legend 
} from 'recharts';
import FormularioPessoa from './FormularioPessoa';
import { gerarMatricula } from '../lib/supabase';
import { enviarSMS, formatarReciboCadastro } from '../lib/sms';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalFuncionarios: 0,
    presentesHoje: 0,
    atrasos: 0,
    faltas: 0,
    horasExtras: 0,
    frequenciaMensal: [],
    distribuicaoCargos: [],
    absenteismo: [],
    totalBancoHoras: 0,
    totalExcedentes: 0,
    totalDebito: 0,
    bancoHorasMensal: []
  });
  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState([]);
  const [showModalFuncionario, setShowModalFuncionario] = useState(false);
  const [loadingCadastro, setLoadingCadastro] = useState(false);
  const [admin, setAdmin] = useState(null);

  // ============================================================
  // CARGOS (COM OS NOVOS)
  // ============================================================
  const cargos = [
    'Oficial de Justiça',
    'Escrevente',
    'Chefe de Setor',
    'Motorista',
    'Estagiário',
    'Advogado',
    'Analista',
    'Desenvolvedor',
    'Gerente',
    'Assistente',
    'Coordenador',
    'Diretor',
    'Supervisor'
  ];

  useEffect(() => {
    carregarDashboard();
    inscreverFeed();
    buscarAdmin();
  }, []);

  const buscarAdmin = async () => {
    try {
      const { data, error } = await supabase
        .from('administradores')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1);

      if (error) throw error;
      if (data && data.length > 0) {
        setAdmin(data[0]);
        localStorage.setItem('adminId', data[0].id);
        localStorage.setItem('adminNome', data[0].nome);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar admin:', error);
    }
  };

  const cadastrarFuncionario = async (dados) => {
    setLoadingCadastro(true);
    try {
      const funcionarioData = {
        ...dados,
        matricula: dados.matricula || gerarMatricula(),
        data_admissao: dados.data_admissao || new Date().toISOString().split('T')[0],
        horario_entrada: dados.turno === 'matutino' ? '08:00' : dados.turno === 'vespertino' ? '14:00' : '22:00',
        horario_saida: dados.turno === 'matutino' ? '17:00' : dados.turno === 'vespertino' ? '22:00' : '06:00',
        senha: dados.senha || '123456',
        status: 'ativo'
      };

      const { data, error } = await supabase
        .from('funcionarios')
        .insert([funcionarioData])
        .select();

      if (error) {
        if (error.code === '23505') {
          toast.error('CPF ou matrícula já cadastrados');
        } else {
          throw error;
        }
        return;
      }

      const novoFuncionario = data[0];
      const adminNome = admin?.nome || 'Sistema';
      const recibo = formatarReciboCadastro(novoFuncionario, 'funcionario', adminNome);

      if (novoFuncionario.telefone) {
        await enviarSMS(
          novoFuncionario.telefone,
          recibo,
          novoFuncionario.matricula,
          novoFuncionario.id,
          'funcionario',
          novoFuncionario.nome
        );
      }

      if (admin?.telefone) {
        await enviarSMS(
          admin.telefone,
          recibo,
          novoFuncionario.matricula,
          admin.id,
          'admin',
          admin.nome
        );
      }

      toast.success(`✅ Funcionário ${dados.nome} cadastrado! SMS enviado.`);
      setShowModalFuncionario(false);
      carregarDashboard();
    } catch (error) {
      console.error('❌ Erro ao cadastrar funcionário:', error);
      toast.error('Erro ao cadastrar funcionário');
    } finally {
      setLoadingCadastro(false);
    }
  };

  const carregarDashboard = async () => {
    try {
      const { count: total } = await supabase
        .from('funcionarios')
        .select('*', { count: 'exact', head: true });

      const hoje = new Date().toISOString().split('T')[0];
      const { data: registrosHoje } = await supabase
        .from('registros_ponto')
        .select('*')
        .gte('timestamp', hoje);

      const presentes = new Set(registrosHoje?.map(r => r.funcionario_id) || []);

      const { data: funcionarios } = await supabase
        .from('funcionarios')
        .select('cargo, funcao, setor, carga_horaria');

      const cargosCount = {};
      funcionarios?.forEach(f => {
        cargosCount[f.cargo] = (cargosCount[f.cargo] || 0) + 1;
      });

      const { data: bancoHoras, error: bancoError } = await supabase
        .from('banco_horas')
        .select('saldo, horas_excedentes, horas_debito, mes_ano');

      if (bancoError) console.error('❌ Erro banco horas:', bancoError);

      const totalBancoHoras = bancoHoras?.reduce((acc, item) => acc + (item.saldo || 0), 0) || 0;
      const totalExcedentes = bancoHoras?.reduce((acc, item) => acc + (item.horas_excedentes || 0), 0) || 0;
      const totalDebito = bancoHoras?.reduce((acc, item) => acc + (item.horas_debito || 0), 0) || 0;

      const bancoPorMes = {};
      bancoHoras?.forEach(item => {
        if (!bancoPorMes[item.mes_ano]) {
          bancoPorMes[item.mes_ano] = { mes: item.mes_ano, saldo: 0, excedentes: 0, debito: 0 };
        }
        bancoPorMes[item.mes_ano].saldo += (item.saldo || 0);
        bancoPorMes[item.mes_ano].excedentes += (item.horas_excedentes || 0);
        bancoPorMes[item.mes_ano].debito += (item.horas_debito || 0);
      });

      const bancoHorasMensal = Object.values(bancoPorMes).sort((a, b) => a.mes.localeCompare(b.mes));

      const { data: ultimosRegistros } = await supabase
        .from('registros_ponto')
        .select(`
          *,
          funcionarios (nome, matricula, cargo)
        `)
        .order('timestamp', { ascending: false })
        .limit(5);

      setFeedbacks(ultimosRegistros || []);

      setStats({
        totalFuncionarios: total || 0,
        presentesHoje: presentes.size,
        atrasos: 0,
        faltas: 0,
        horasExtras: 0,
        frequenciaMensal: gerarDadosFrequencia(),
        distribuicaoCargos: Object.entries(cargosCount).map(([name, value]) => ({ name, value })),
        absenteismo: gerarDadosAbsenteismo(),
        totalBancoHoras: Math.round(totalBancoHoras * 100) / 100,
        totalExcedentes: Math.round(totalExcedentes * 100) / 100,
        totalDebito: Math.round(totalDebito * 100) / 100,
        bancoHorasMensal: bancoHorasMensal
      });

    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const inscreverFeed = () => {
    const canal = supabase
      .channel('feed-ponto')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'registros_ponto' },
        () => carregarDashboard()
      )
      .subscribe();
    return () => canal.unsubscribe();
  };

  const gerarDadosFrequencia = () => {
    const dias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];
    return dias.map(dia => ({
      nome: dia,
      entradas: Math.floor(Math.random() * 20),
      saidas: Math.floor(Math.random() * 20)
    }));
  };

  const gerarDadosAbsenteismo = () => {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return meses.map(mes => ({
      mes: mes,
      faltas: Math.floor(Math.random() * 5),
      justificadas: Math.floor(Math.random() * 3)
    }));
  };

  const cores = ['#00d4ff', '#ff6b6b', '#ffc107', '#4caf50', '#9c27b0', '#ff9800'];

  const dadosIniciaisFuncionario = {
    nome: '',
    foto: null,
    foto_url: '',
    cargo: '',
    setor: '',
    funcao: '',
    matricula: gerarMatricula(),
    turno: 'matutino',
    carga_horaria: '8',
    telefone: '',
    cpf: '',
    email: '',
    data_admissao: new Date().toISOString().split('T')[0],
    periodo_ferias_inicio: '',
    periodo_ferias_fim: '',
    observacao: '',
    senha: '123456'
  };

  if (loading) {
    return <div className="text-center text-blue-400 py-10">⏳ Carregando dashboard...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-blue-400">📊 Dashboard PontoSync</h1>
        <button
          onClick={() => setShowModalFuncionario(true)}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2"
        >
          <span className="text-xl">+</span> Novo Funcionário
        </button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 p-4 rounded-lg">
          <p className="text-gray-400 text-sm">Total Funcionários</p>
          <p className="text-2xl font-bold text-white">{stats.totalFuncionarios}</p>
        </div>
        <div className="bg-green-900 p-4 rounded-lg">
          <p className="text-gray-400 text-sm">Presentes Hoje</p>
          <p className="text-2xl font-bold text-green-400">{stats.presentesHoje}</p>
        </div>
        <div className="bg-yellow-900 p-4 rounded-lg">
          <p className="text-gray-400 text-sm">Atrasos</p>
          <p className="text-2xl font-bold text-yellow-400">{stats.atrasos}</p>
        </div>
        <div className="bg-red-900 p-4 rounded-lg">
          <p className="text-gray-400 text-sm">Faltas</p>
          <p className="text-2xl font-bold text-red-400">{stats.faltas}</p>
        </div>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg mb-6 border border-purple-500">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          📊 Banco de Horas
          <span className="text-xs text-gray-400">(acumulado geral)</span>
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-gray-400 text-sm">Saldo Total</p>
            <p className={`text-2xl font-bold ${stats.totalBancoHoras >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {stats.totalBancoHoras >= 0 ? '+' : ''}{stats.totalBancoHoras}h
            </p>
          </div>
          <div className="text-center">
            <p className="text-gray-400 text-sm">Horas Excedentes</p>
            <p className="text-2xl font-bold text-green-400">+{stats.totalExcedentes}h</p>
          </div>
          <div className="text-center">
            <p className="text-gray-400 text-sm">Horas em Débito</p>
            <p className="text-2xl font-bold text-red-400">-{stats.totalDebito}h</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-white font-semibold mb-4">📈 Frequência Mensal</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={stats.frequenciaMensal}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="nome" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip />
              <Line type="monotone" dataKey="entradas" stroke="#00d4ff" />
              <Line type="monotone" dataKey="saidas" stroke="#ff6b6b" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-white font-semibold mb-4">📊 Distribuição por Cargo</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={stats.distribuicaoCargos}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {stats.distribuicaoCargos.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={cores[index % cores.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {stats.bancoHorasMensal && stats.bancoHorasMensal.length > 0 && (
        <div className="bg-gray-800 p-4 rounded-lg mb-6">
          <h3 className="text-white font-semibold mb-4">📊 Evolução do Banco de Horas</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.bancoHorasMensal}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="mes" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip />
              <Legend />
              <Bar dataKey="excedentes" fill="#4caf50" name="Excedentes" />
              <Bar dataKey="debito" fill="#f44336" name="Débito" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-gray-800 p-4 rounded-lg">
        <h3 className="text-white font-semibold mb-4">🔴 Live Feed - Últimas Batidas</h3>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {feedbacks.length === 0 ? (
            <p className="text-gray-400 text-sm">Aguardando primeiras batidas...</p>
          ) : (
            feedbacks.map((item, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-700 p-2 rounded">
                <div>
                  <span className="text-white font-medium">{item.funcionarios?.nome || item.matricula}</span>
                  <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                    item.tipo === 'entrada' ? 'bg-green-600' : 'bg-red-600'
                  }`}>
                    {item.tipo.toUpperCase()}
                  </span>
                </div>
                <span className="text-gray-400 text-sm">
                  {new Date(item.timestamp).toLocaleTimeString('pt-BR')}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {showModalFuncionario && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-blue-400 mb-4">📝 Novo Funcionário</h2>
            <FormularioPessoa
              tipo="funcionario"
              dadosIniciais={dadosIniciaisFuncionario}
              onSubmit={cadastrarFuncionario}
              onCancel={() => setShowModalFuncionario(false)}
              loading={loadingCadastro}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
