import React, { useState, useEffect } from 'react';
import { supabase, gerarMatricula, buscarEnderecoPorCEP } from '../lib/supabase';
import toast from 'react-hot-toast';

const GerenciarFuncionarios = () => {
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filtros, setFiltros] = useState({ cargo: '', funcao: '', departamento: '' });
  const [form, setForm] = useState({
    nome: '',
    cpf: '',
    rg: '',
    telefone_celular: '',
    cep: '',
    cidade: '',
    uf: '',
    matricula: gerarMatricula(),
    data_admissao: new Date().toISOString().split('T')[0],
    cargo: '',
    funcao: '',
    departamento: '',
    horario_entrada: '08:00',
    horario_saida: '17:00',
    senha: '123456',
    foto_url: ''
  });

  useEffect(() => {
    carregarFuncionarios();
  }, []);

  const carregarFuncionarios = async () => {
    try {
      let query = supabase.from('funcionarios').select('*');
      
      if (filtros.cargo) query = query.eq('cargo', filtros.cargo);
      if (filtros.funcao) query = query.eq('funcao', filtros.funcao);
      if (filtros.departamento) query = query.eq('departamento', filtros.departamento);

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      setFuncionarios(data || []);
    } catch (error) {
      toast.error('Erro ao carregar funcionários');
    } finally {
      setLoading(false);
    }
  };

  const buscarCEP = async (cep) => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setForm(prev => ({
          ...prev,
          cidade: data.localidade,
          uf: data.uf,
          cep: cepLimpo
        }));
        toast.success('CEP encontrado!');
      }
    } catch {
      toast.error('Erro ao buscar CEP');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validações
    if (!form.nome || !form.cpf || !form.telefone_celular) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('funcionarios')
        .insert([form])
        .select();

      if (error) {
        if (error.code === '23505') {
          toast.error('CPF ou matrícula já cadastrados');
        } else {
          throw error;
        }
        return;
      }

      toast.success(`✅ Funcionário ${form.nome} cadastrado com sucesso!`);
      setShowModal(false);
      setForm({
        nome: '',
        cpf: '',
        rg: '',
        telefone_celular: '',
        cep: '',
        cidade: '',
        uf: '',
        matricula: gerarMatricula(),
        data_admissao: new Date().toISOString().split('T')[0],
        cargo: '',
        funcao: '',
        departamento: '',
        horario_entrada: '08:00',
        horario_saida: '17:00',
        senha: '123456',
        foto_url: ''
      });
      carregarFuncionarios();
    } catch (error) {
      toast.error('Erro ao cadastrar funcionário');
    }
  };

  const excluirFuncionario = async (id, nome) => {
    if (!confirm(`Deseja excluir ${nome}?`)) return;
    
    try {
      const { error } = await supabase
        .from('funcionarios')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success(`Funcionário ${nome} excluído`);
      carregarFuncionarios();
    } catch (error) {
      toast.error('Erro ao excluir funcionário');
    }
  };

  const cargos = ['Analista', 'Desenvolvedor', 'Gerente', 'Assistente', 'Coordenador', 'Estagiário'];
  const funcoes = ['Frontend', 'Backend', 'Fullstack', 'Suporte', 'Administrativo', 'Marketing'];
  const departamentos = ['TI', 'RH', 'Financeiro', 'Comercial', 'Operações', 'Marketing'];

  if (loading) {
    return <div className="text-center text-blue-400 py-10">⏳ Carregando funcionários...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-blue-400">👥 Funcionários</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold transition"
        >
          + Novo Funcionário
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={filtros.cargo}
          onChange={(e) => setFiltros({ ...filtros, cargo: e.target.value })}
          className="bg-gray-700 text-white px-3 py-1 rounded-lg text-sm"
        >
          <option value="">Todos cargos</option>
          {cargos.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={filtros.funcao}
          onChange={(e) => setFiltros({ ...filtros, funcao: e.target.value })}
          className="bg-gray-700 text-white px-3 py-1 rounded-lg text-sm"
        >
          <option value="">Todas funções</option>
          {funcoes.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select
          value={filtros.departamento}
          onChange={(e) => setFiltros({ ...filtros, departamento: e.target.value })}
          className="bg-gray-700 text-white px-3 py-1 rounded-lg text-sm"
        >
          <option value="">Todos departamentos</option>
          {departamentos.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <button
          onClick={() => setFiltros({ cargo: '', funcao: '', departamento: '' })}
          className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded-lg text-sm transition"
        >
          Limpar
        </button>
      </div>

      {/* Lista */}
      {funcionarios.length === 0 ? (
        <div className="bg-gray-800 p-8 rounded-lg text-center">
          <p className="text-gray-400">Nenhum funcionário cadastrado</p>
          <p className="text-gray-500 text-sm">Clique em "+ Novo Funcionário" para começar</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-gray-300">
              <tr>
                <th className="p-3 text-left">Foto</th>
                <th className="p-3 text-left">Matrícula</th>
                <th className="p-3 text-left">Nome</th>
                <th className="p-3 text-left">Cargo</th>
                <th className="p-3 text-left">Função</th>
                <th className="p-3 text-left">Telefone</th>
                <th className="p-3 text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {funcionarios.map(func => (
                <tr key={func.id} className="border-b border-gray-700 hover:bg-gray-800 transition">
                  <td className="p-3">
                    {func.foto_url ? (
                      <img src={func.foto_url} alt={func.nome} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">👤</div>
                    )}
                  </td>
                  <td className="p-3 text-blue-400 font-mono text-xs">{func.matricula}</td>
                  <td className="p-3 text-white">{func.nome}</td>
                  <td className="p-3 text-gray-300">{func.cargo}</td>
                  <td className="p-3 text-gray-300">{func.funcao}</td>
                  <td className="p-3 text-gray-300">{func.telefone_celular}</td>
                  <td className="p-3">
                    <button
                      onClick={() => excluirFuncionario(func.id, func.nome)}
                      className="text-red-400 hover:text-red-300 text-xs transition"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Cadastro */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-blue-400 mb-4">📝 Novo Funcionário</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Nome completo *"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input
                  type="text"
                  placeholder="CPF (apenas números)"
                  value={form.cpf}
                  onChange={(e) => setForm({ ...form, cpf: e.target.value.replace(/\D/g, '') })}
                  className="bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input
                  type="text"
                  placeholder="RG"
                  value={form.rg}
                  onChange={(e) => setForm({ ...form, rg: e.target.value })}
                  className="bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Celular (com DDD)"
                  value={form.telefone_celular}
                  onChange={(e) => setForm({ ...form, telefone_celular: e.target.value })}
                  className="bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input
                  type="text"
                  placeholder="CEP (apenas números)"
                  value={form.cep}
                  onChange={(e) => {
                    const cep = e.target.value.replace(/\D/g, '');
                    setForm({ ...form, cep });
                    if (cep.length === 8) buscarCEP(cep);
                  }}
                  className="bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Cidade"
                  value={form.cidade}
                  onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                  className="bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="UF"
                  value={form.uf}
                  onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })}
                  className="bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Matrícula (automática)"
                  value={form.matricula}
                  onChange={(e) => setForm({ ...form, matricula: e.target.value.toUpperCase() })}
                  className="bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  placeholder="Data Admissão"
                  value={form.data_admissao}
                  onChange={(e) => setForm({ ...form, data_admissao: e.target.value })}
                  className="bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={form.cargo}
                  onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                  className="bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Selecione o cargo</option>
                  {cargos.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select
                  value={form.funcao}
                  onChange={(e) => setForm({ ...form, funcao: e.target.value })}
                  className="bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Selecione a função</option>
                  {funcoes.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <select
                  value={form.departamento}
                  onChange={(e) => setForm({ ...form, departamento: e.target.value })}
                  className="bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Selecione o departamento</option>
                  {departamentos.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <input
                  type="time"
                  value={form.horario_entrada}
                  onChange={(e) => setForm({ ...form, horario_entrada: e.target.value })}
                  className="bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="time"
                  value={form.horario_saida}
                  onChange={(e) => setForm({ ...form, horario_saida: e.target.value })}
                  className="bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Senha (padrão: 123456)"
                  value={form.senha}
                  onChange={(e) => setForm({ ...form, senha: e.target.value })}
                  className="bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="URL da foto (opcional)"
                  value={form.foto_url}
                  onChange={(e) => setForm({ ...form, foto_url: e.target.value })}
                  className="bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-semibold transition"
                >
                  ✅ Cadastrar Funcionário
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

export default GerenciarFuncionarios;
