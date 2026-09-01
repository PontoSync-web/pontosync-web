import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';

const Relatorios = ({ isAdmin }) => {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState({ dataInicio: '', dataFim: '', cargo: '' });
  const [resumo, setResumo] = useState({ total: 0, entradas: 0, saidas: 0 });

  useEffect(() => {
    carregarRegistros();
  }, []);

  const carregarRegistros = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('registros_ponto')
        .select(`
          *,
          funcionarios (
            nome,
            matricula,
            cargo,
            funcao,
            departamento
          )
        `)
        .order('timestamp', { ascending: false });

      // Se for funcionário, filtra pelo ID dele (usando dados do localStorage/context)
      if (!isAdmin) {
        const funcionarioId = localStorage.getItem('funcionarioId');
        if (funcionarioId) {
          query = query.eq('funcionario_id', funcionarioId);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      setRegistros(data || []);
      
      // Calcula resumo
      const entradas = data?.filter(r => r.tipo === 'entrada') || [];
      const saidas = data?.filter(r => r.tipo === 'saida') || [];
      
      setResumo({
        total: data?.length || 0,
        entradas: entradas.length,
        saidas: saidas.length
      });

    } catch (error) {
      console.error('❌ Erro ao carregar registros:', error);
      toast.error('Erro ao carregar registros');
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('registros_ponto')
        .select(`
          *,
          funcionarios (
            nome,
            matricula,
            cargo,
            funcao,
            departamento
          )
        `)
        .order('timestamp', { ascending: false });

      if (filtro.dataInicio) {
        query = query.gte('timestamp', filtro.dataInicio);
      }
      if (filtro.dataFim) {
        query = query.lte('timestamp', filtro.dataFim);
      }
      if (filtro.cargo && isAdmin) {
        query = query.eq('funcionarios.cargo', filtro.cargo);
      }

      const { data, error } = await query;

      if (error) throw error;

      setRegistros(data || []);
      toast.success('Filtros aplicados com sucesso');

    } catch (error) {
      console.error('❌ Erro ao aplicar filtros:', error);
      toast.error('Erro ao aplicar filtros');
    } finally {
      setLoading(false);
    }
  };

  const exportarCSV = () => {
    if (!registros || registros.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    const headers = ['Data', 'Hora', 'Funcionário', 'Matrícula', 'Tipo', 'Cargo', 'Função'];
    const linhas = registros.map(r => [
      format(parseISO(r.timestamp), 'dd/MM/yyyy'),
      format(parseISO(r.timestamp), 'HH:mm:ss'),
      r.funcionarios?.nome || 'N/A',
      r.matricula || 'N/A',
      r.tipo.toUpperCase(),
      r.funcionarios?.cargo || 'N/A',
      r.funcionarios?.funcao || 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...linhas.map(l => l.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_ponto_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast.success('CSV exportado com sucesso!');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center text-blue-400">
          <div className="text-4xl mb-4">⏳</div>
          <p>Carregando relatórios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-blue-400">📊 Relatórios de Ponto</h1>
        <button
          onClick={exportarCSV}
          className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-semibold transition"
        >
          📥 Exportar CSV
        </button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 p-4 rounded-lg text-center">
          <p className="text-gray-400 text-sm">Total de Registros</p>
          <p className="text-2xl font-bold text-white">{resumo.total}</p>
        </div>
        <div className="bg-green-900 p-4 rounded-lg text-center">
          <p className="text-gray-400 text-sm">Entradas</p>
          <p className="text-2xl font-bold text-green-400">{resumo.entradas}</p>
        </div>
        <div className="bg-red-900 p-4 rounded-lg text-center">
          <p className="text-gray-400 text-sm">Saídas</p>
          <p className="text-2xl font-bold text-red-400">{resumo.saidas}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-gray-800 p-4 rounded-lg mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="date"
            value={filtro.dataInicio}
            onChange={(e) => setFiltro({ ...filtro, dataInicio: e.target.value })}
            className="bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            value={filtro.dataFim}
            onChange={(e) => setFiltro({ ...filtro, dataFim: e.target.value })}
            className="bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {isAdmin && (
            <input
              type="text"
              placeholder="Filtrar por cargo"
              value={filtro.cargo}
              onChange={(e) => setFiltro({ ...filtro, cargo: e.target.value })}
              className="bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
          <button
            onClick={aplicarFiltros}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold transition"
          >
            🔍 Filtrar
          </button>
        </div>
      </div>

      {/* Tabela */}
      {registros.length === 0 ? (
        <div className="bg-gray-800 p-8 rounded-lg text-center">
          <p className="text-gray-400">Nenhum registro encontrado</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-gray-300">
              <tr>
                <th className="p-3 text-left">Data/Hora</th>
                <th className="p-3 text-left">Funcionário</th>
                <th className="p-3 text-left">Matrícula</th>
                <th className="p-3 text-left">Tipo</th>
                <th className="p-3 text-left">Cargo</th>
                <th className="p-3 text-left">Função</th>
              </tr>
            </thead>
            <tbody>
              {registros.map(registro => (
                <tr key={registro.id} className="border-b border-gray-700 hover:bg-gray-800 transition">
                  <td className="p-3 text-gray-300">
                    {format(parseISO(registro.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                  </td>
                  <td className="p-3 text-white">
                    {registro.funcionarios?.nome || 'N/A'}
                  </td>
                  <td className="p-3 text-blue-400 font-mono">
                    {registro.matricula || 'N/A'}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      registro.tipo === 'entrada' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-red-600 text-white'
                    }`}>
                      {registro.tipo.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3 text-gray-300">
                    {registro.funcionarios?.cargo || 'N/A'}
                  </td>
                  <td className="p-3 text-gray-300">
                    {registro.funcionarios?.funcao || 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Relatorios;
