 import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer, 
  AreaChart, Area, Legend 
} from 'recharts';
import { calcularSaldoAcumulado } from '../lib/bancoHoras';

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
  const [feed, setFeed] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);

  useEffect(() => {
    carregarDashboard();
    inscreverFeed();
  }, []);

  const carregarDashboard = async () => {
    try {
      // Total de funcionários
      const { count: total } = await supabase
        .from('funcionarios')
        .select('*', { count: 'exact', head: true });

      // Registros de hoje
      const hoje = new Date().toISOString().split('T')[0];
      const { data: registrosHoje } = await supabase
        .from('registros_ponto')
        .select('*')
        .gte('timestamp', hoje);

      const presentes = new Set(registrosHoje?.map(r => r.funcionario_id) || []);

      // Dados para gráficos
      const { data: funcionarios } = await supabase
        .from('funcionarios')
        .select('cargo, funcao, setor, carga_horaria');

      const cargos = {};
      funcionarios?.forEach(f => {
        cargos[f.cargo] = (cargos[f.cargo] || 0) + 1;
      });

      // ============================================================
      // BANCO DE HORAS - Busca dados agregados
      // ============================================================
      // Busca todos os registros de banco de horas
      const { data: bancoHoras, error: bancoError } = await supabase
        .from('banco_horas')
        .select('saldo, horas_excedentes, horas_debito, mes_ano, funcionario_id');

      if (bancoError) {
        console.error('❌ Erro ao buscar banco de horas:', bancoError);
      }

      // Calcula totais
      const totalBancoHoras = bancoHoras?.reduce((acc, item) => acc + (item.saldo || 0), 0) || 0;
      const totalExcedentes = bancoHoras?.reduce((acc, item) => acc + (item.horas_excedentes || 0), 0) || 0;
      const totalDebito = bancoHoras?.reduce((acc, item) => acc + (item.horas_debito || 0), 0) || 0;

      // Agrupa por mês para o gráfico
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

      // ============================================================
      // FEEDBACKS - Últimos registros de ponto
      // ============================================================
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
        distribuicaoCargos: Object.entries(cargos).map(([name, value]) => ({ name, value })),
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
        (payload) => {
          setFeed(prev => [{ ...payload.new, timestamp: new Date() }, ...prev].slice(0, 10));
          // Recarrega estatísticas ao receber novo registro
          carregarDashboard();
        }
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

  if (loading) {
    return <div className="text-center text-blue-400 py-10">⏳ Carregando dashboard...</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold text-blue-400 mb-6">📊 Dashboard PontoSync</h1>
      
      {/* KPIs */}
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

      {/* Banco de Horas - Card Principal */}
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

      {/* Gráficos */}
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

      {/* Banco de Horas Mensal - Gráfico */}
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

      {/* Feed ao vivo */}
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
                  <span className="text-gray-400 text-xs ml-2">
                    {item.funcionarios?.cargo || ''}
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
    </div>
  );
};

export default AdminDashboard;
