import React, { useState, useEffect } from 'react';
import { supabase, gerarMatricula } from '../lib/supabase';
import toast from 'react-hot-toast';
import FormularioPessoa from './FormularioPessoa';
import { enviarSMS, formatarReciboCadastro } from '../lib/sms';

const GerenciarFuncionarios = () => {
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [filtros, setFiltros] = useState({ cargo: '', setor: '', funcao: '' });
  const [erros, setErros] = useState({});
  const [admin, setAdmin] = useState(null);

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
  
  const setores = ['TI', 'RH', 'Financeiro', 'Comercial', 'Operações', 'Marketing', 'Administrativo', 'Jurídico', 'Judiciário'];
  const funcoes = ['Frontend', 'Backend', 'Fullstack', 'Suporte', 'Administrativo', 'Marketing', 'Vendas', 'Contabilidade', 'Recursos Humanos', 'Jurídico', 'Assessoria'];

  useEffect(() => {
    carregarFuncionarios();
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

  const carregarFuncionarios = async () => {
    try {
      let query = supabase.from('funcionarios').select('*');
      if (filtros.cargo) query = query.eq('cargo', filtros.cargo);
      if (filtros.setor) query = query.eq('setor', filtros.setor);
      if (filtros.funcao) query = query.eq('funcao', filtros.funcao);

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setFuncionarios(data || []);
    } catch (error) {
      toast.error('Erro ao carregar funcionários');
    } finally {
      setLoading(false);
    }
  };

  const cadastrarFuncionario = async (dados) => {
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
      setShowModal(false);
      setEditando(null);
      setErros({});
      carregarFuncionarios();
    } catch (error) {
      toast.error('Erro ao cadastrar funcionário');
    }
  };

  const editarFuncionario = async (dados) => {
    try {
      const { data, error } = await supabase
        .from('funcionarios')
        .update(dados)
        .eq('id', editando.id)
        .select();

      if (error) throw error;

      toast.success(`✅ Funcionário ${dados.nome} atualizado!`);
      setShowModal(false);
      setEditando(null);
      setErros({});
      carregarFuncionarios();
    } catch (error) {
      toast.error('Erro ao atualizar funcionário');
    }
  };

  const excluirFuncionario = async (id, nome) => {
    if (!confirm(`Deseja excluir ${nome}?`)) return;
    try {
      const { error } = await supabase.from('funcionarios').delete().eq('id', id);
      if (error) throw error;
      toast.success(`Funcionário ${nome} excluído`);
      carregarFuncionarios();
    } catch (error) {
      toast.error('Erro ao excluir funcionário');
    }
  };

  const dadosIniciais = {
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
    return <div className="text-center text-blue-400 py-10">⏳ Carregando funcionários...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-blue-400">👥 Funcionários</h1>
        <button
          onClick={() => { setEditando(null); setShowModal(true); }}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold transition"
        >
          + Novo Funcionário
        </button>
      </div>

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
          value={filtros.setor}
          onChange={(e) => setFiltros({ ...filtros, setor: e.target.value })}
          className="bg-gray-700 text-white px-3 py-1 rounded-lg text-sm"
        >
          <option value="">Todos setores</option>
          {setores.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filtros.funcao}
          onChange={(e) => setFiltros({ ...filtros, funcao: e.target.value })}
          className="bg-gray-700 text-white px-3 py-1 rounded-lg text-sm"
        >
          <option value="">Todas funções</option>
          {funcoes.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <button
          onClick={() => setFiltros({ cargo: '', setor: '', funcao: '' })}
          className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded-lg text-sm transition"
        >
          Limpar
        </button>
      </div>

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
                <th className="p-3 text-left">Setor</th>
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
                  <td className="p-3 text-gray-300">{func.setor}</td>
                  <td className="p-3 text-gray-300">{func.funcao}</td>
                  <td className="p-3 text-gray-300">{func.telefone}</td>
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

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-blue-400 mb-4">
              {editando ? '✏️ Editar Funcionário' : '📝 Novo Funcionário'}
            </h2>
            <FormularioPessoa
              tipo="funcionario"
              dadosIniciais={editando || dadosIniciais}
              onSubmit={editando ? editarFuncionario : cadastrarFuncionario}
              onCancel={() => { setShowModal(false); setEditando(null); }}
              loading={false}
            />
          </div>
        </div>
      )}

      {/* CRÉDITOS */}
      <footer className="mt-8 pt-4 border-t border-gray-700 text-center">
        <p className="text-gray-500 text-sm">
          <span className="font-bold text-blue-400">⚡ PONTO SYNC</span>
          <span className="mx-2 text-gray-600">|</span>
          <span className="text-gray-400">
            Desenvolvido por{' '}
            <span className="font-semibold text-blue-300">Engenheiro Itamar Souza</span>
            <span className="mx-1 text-gray-500">/</span>
            <span className="font-semibold text-purple-300">Dôra</span>
            <span className="mx-1 text-gray-500">/</span>
            <span className="font-semibold text-pink-300">Gissélia</span>
          </span>
          <span className="mx-2 text-gray-700">•</span>
          <span className="text-gray-500 text-xs">V1.0 • 2026</span>
        </p>
      </footer>
    </div>
  );
};

export default GerenciarFuncionarios;
