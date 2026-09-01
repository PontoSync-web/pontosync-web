import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const GerenciarFaltas = () => {
  const [faltas, setFaltas] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    funcionario_id: '',
    data: new Date().toISOString().split('T')[0],
    motivo: '',
    justificada: false,
    abonada: false,
    atestado_url: ''
  });

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);

      // Carrega funcionários
      const { data: funcData, error: funcError } = await supabase
        .from('funcionarios')
        .select('id, nome, matricula')
        .order('nome');

      if (funcError) throw funcError;
      setFuncionarios(funcData || []);

      // Carrega faltas
      const { data: faltaData, error: faltaError } = await supabase
        .from('faltas')
        .select(`
          *,
          funcionarios (
            nome,
            matricula,
            cargo
          )
        `)
        .order('data', { ascending: false });

      if (faltaError) throw faltaError;
      setFaltas(faltaData || []);

    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.funcionario_id || !form.data) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('faltas')
        .insert([form])
        .select();

      if (error) throw error;

      toast.success('✅ Falta registrada com sucesso!');
      setShowModal(false);
      setForm({
        funcionario_id: '',
        data: new Date().toISOString().split('T')[0],
        motivo: '',
        justificada: false,
        abonada: false,
        atestado_url: ''
      });
      carregarDados();

    } catch (error) {
      console.error('❌ Erro ao registrar falta:', error);
      toast.error('Erro ao registrar falta');
    }
  };

  const abonarFalta = async (id) => {
    if (!confirm('Deseja abonar esta falta?')) return;

    try {
      const { error } = await supabase
        .from('faltas')
        .update({ abonada: true })
        .eq('id', id);

      if (error) throw error;

      toast.success('✅ Falta abonada com sucesso!');
      carregarDados();

    } catch (error) {
      console.error('❌ Erro ao abonar falta:', error);
      toast.error('Erro ao abonar falta');
    }
  };

  const justificarFalta = async (id) => {
    const justificativa = prompt('Digite a justificativa:');
    if (!justificativa) return;

    try {
      const { error } = await supabase
        .from('faltas')
        .update({ 
          justificada: true,
          motivo: justificativa
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('✅ Falta justificada com sucesso!');
      carregarDados();

    } catch (error) {
      console.error('❌ Erro ao justificar falta:', error);
      toast.error('Erro ao justificar falta');
    }
  };

  const excluirFalta = async (id) => {
    if (!confirm('Deseja excluir esta falta?')) return;

    try {
      const { error } = await supabase
        .from('faltas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('🗑️ Falta excluída com sucesso!');
      carregarDados();

    } catch (error) {
      console.error('❌ Erro ao excluir falta:', error);
      toast.error('Erro ao excluir falta');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center text-blue-400">
          <div className="text-4xl mb-4">⏳</div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-blue-400">📋 Gerenciar Faltas</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold transition"
        >
          ➕ Nova Falta
        </button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 p-4 rounded-lg text-center">
          <p className="text-gray-400 text-sm">Total de Faltas</p>
          <p className="text-2xl font-bold text-white">{faltas.length}</p>
        </div>
        <div className="bg-green-900 p-4 rounded-lg text-center">
          <p className="text-gray-400 text-sm">Abonadas</p>
          <p className="text-2xl font-bold text-green-400">
            {faltas.filter(f => f.abonada).length}
          </p>
        </div>
        <div className="bg-yellow-900 p-4 rounded-lg text-center">
          <p className="text-gray-400 text-sm">Justificadas</p>
          <p className="text-2xl font-bold text-yellow-400">
            {faltas.filter(f => f.justificada).length}
          </p>
        </div>
      </div>

      {/* Lista de faltas */}
      {faltas.length === 0 ? (
        <div className="bg-gray-800 p-8 rounded-lg text-center">
          <p className="text-gray-400">Nenhuma falta registrada</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-gray-300">
              <tr>
                <th className="p-3 text-left">Data</th>
                <th className="p-3 text-left">Funcionário</th>
                <th className="p-3 text-left">Matrícula</th>
                <th className="p-3 text-left">Motivo</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {faltas.map(falta => (
                <tr key={falta.id} className="border-b border-gray-700 hover:bg-gray-800 transition">
                  <td className="p-3 text-gray-300">
                    {new Date(falta.data).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="p-3 text-white">
                    {falta.funcionarios?.nome || 'N/A'}
                  </td>
                  <td className="p-3 text-blue-400 font-mono">
                    {falta.funcionarios?.matricula || 'N/A'}
                  </td>
                  <td className="p-3 text-gray-300">
                    {falta.motivo || '-'}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {falta.abonada && (
                        <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded-full">
                          Abonada
                        </span>
                      )}
                      {falta.justificada && (
                        <span className="px-2 py-0.5 bg-yellow-600 text-white text-xs rounded-full">
                          Justificada
                        </span>
                      )}
                      {!falta.abonada && !falta.justificada && (
                        <span className="px-2 py-0.5 bg-red-600 text-white text-xs rounded-full">
                          Pendente
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {!falta.abonada && (
                        <button
                          onClick={() => abonarFalta(falta.id)}
                          className="bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-xs transition"
                        >
                          Abonar
                        </button>
                      )}
                      {!falta.justificada && (
                        <button
                          onClick={() => justificarFalta(falta.id)}
                          className="bg-yellow-600 hover:bg-yellow-700 px-2 py-1 rounded text-xs transition"
                        >
                          Justificar
                        </button>
                      )}
                      <button
                        onClick={() => excluirFalta(falta.id)}
                        className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs transition"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Nova Falta */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-blue-400 mb-4">📋 Nova Falta</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <select
                value={form.funcionario_id}
                onChange={(e) => setForm({ ...form, funcionario_id: e.target.value })}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Selecione o funcionário</option>
                {funcionarios.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.nome} - {f.matricula}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />

              <input
                type="text"
                placeholder="Motivo (opcional)"
                value={form.motivo}
                onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <input
                type="text"
                placeholder="URL do atestado (opcional)"
                value={form.atestado_url}
                onChange={(e) => setForm({ ...form, atestado_url: e.target.value })}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-semibold transition"
                >
                  ✅ Registrar
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 py-2 rounded-lg font-semibold transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GerenciarFaltas;
