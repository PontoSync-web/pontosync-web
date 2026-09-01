 import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import FormularioPessoa from './FormularioPessoa';
import { enviarSMS, formatarReciboCadastro } from '../lib/sms';

const Login = ({ onLogin, onAdminLogin }) => {
  const [isAdmin, setIsAdmin] = useState(true);
  const [matricula, setMatricula] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCadastroAdmin, setShowCadastroAdmin] = useState(false);
  const [senhaAdminPrincipal, setSenhaAdminPrincipal] = useState('');
  const [erros, setErros] = useState({});
  const [adminPrincipal, setAdminPrincipal] = useState(null);

  // ============================================================
  // BUSCAR ADMIN PRINCIPAL
  // ============================================================
  const buscarAdminPrincipal = async () => {
    try {
      const { data, error } = await supabase
        .from('administradores')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1);

      if (error) throw error;
      
      if (data && data.length > 0) {
        setAdminPrincipal(data[0]);
        return data[0];
      }
      return null;
    } catch (error) {
      console.error('❌ Erro ao buscar admin principal:', error);
      return null;
    }
  };

  // ============================================================
  // VALIDAR SENHA DO ADMIN PRINCIPAL
  // ============================================================
  const validarSenhaAdminPrincipal = async () => {
    if (!adminPrincipal) {
      const admin = await buscarAdminPrincipal();
      if (!admin) {
        toast.error('Nenhum administrador cadastrado. Crie o primeiro.');
        return false;
      }
      setAdminPrincipal(admin);
    }

    if (!senhaAdminPrincipal) {
      toast.error('Digite a senha do administrador principal');
      return false;
    }

    const { data, error } = await supabase
      .from('administradores')
      .select('*')
      .eq('id', adminPrincipal.id)
      .eq('senha', senhaAdminPrincipal)
      .single();

    if (error || !data) {
      toast.error('Senha do administrador principal incorreta');
      return false;
    }

    return true;
  };

  // ============================================================
  // LOGIN - ADMINISTRADOR
  // ============================================================
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!matricula || !senha) {
      toast.error('Preencha matrícula e senha');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('administradores')
        .select('*')
        .eq('matricula', matricula.toUpperCase())
        .eq('senha', senha)
        .single();

      if (error || !data) {
        toast.error('Matrícula ou senha inválidos');
        return;
      }

      toast.success(`Bem-vindo, ${data.nome}!`);
      onAdminLogin(data);
    } catch (error) {
      toast.error('Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // LOGIN - FUNCIONÁRIO
  // ============================================================
  const handleFuncionarioLogin = async (e) => {
    e.preventDefault();
    if (!matricula || !senha) {
      toast.error('Preencha matrícula e senha');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('funcionarios')
        .select('*')
        .eq('matricula', matricula.toUpperCase())
        .eq('senha', senha)
        .single();

      if (error || !data) {
        toast.error('Matrícula ou senha inválidos');
        return;
      }

      if (data.status !== 'ativo') {
        toast.error('Funcionário inativo. Contate o administrador.');
        return;
      }

      toast.success(`Bem-vindo, ${data.nome}!`);
      onLogin(data);
    } catch (error) {
      toast.error('Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // CADASTRAR ADMIN
  // ============================================================
  const cadastrarAdmin = async (dados) => {
    const senhaValida = await validarSenhaAdminPrincipal();
    if (!senhaValida) return;

    setLoading(true);
    try {
      const adminData = {
        nome: dados.nome,
        cpf: dados.cpf,
        email: dados.email,
        senha: dados.senha,
        telefone: dados.telefone,
        cargo: dados.cargo,
        setor: dados.setor,
        funcao: dados.funcao,
        matricula: dados.matricula || `ADMIN-${Date.now()}`,
        turno: dados.turno,
        carga_horaria: dados.carga_horaria,
        foto_url: dados.foto_url || null,
        observacao: dados.observacao || null,
        periodo_ferias_inicio: dados.periodo_ferias_inicio || null,
        periodo_ferias_fim: dados.periodo_ferias_fim || null
      };

      const { data, error } = await supabase
        .from('administradores')
        .insert([adminData])
        .select();

      if (error) {
        if (error.code === '23505') {
          toast.error('Matrícula, CPF ou e-mail já cadastrado');
        } else {
          throw error;
        }
        return;
      }

      const novoAdmin = data[0];

      const adminNome = adminPrincipal?.nome || 'Sistema';
      const recibo = formatarReciboCadastro(novoAdmin, 'admin', adminNome);

      if (novoAdmin.telefone) {
        await enviarSMS(
          novoAdmin.telefone,
          recibo,
          novoAdmin.matricula,
          novoAdmin.id,
          'admin',
          novoAdmin.nome
        );
      }

      if (adminPrincipal?.telefone) {
        await enviarSMS(
          adminPrincipal.telefone,
          recibo,
          novoAdmin.matricula,
          adminPrincipal.id,
          'admin',
          adminPrincipal.nome
        );
      }

      toast.success('✅ Administrador criado com sucesso! SMS enviado.');
      setShowCadastroAdmin(false);
      setSenhaAdminPrincipal('');
      setErros({});
    } catch (error) {
      console.error('❌ Erro:', error);
      toast.error('Erro ao criar administrador: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-2xl max-w-md w-full border border-blue-500 shadow-2xl">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-blue-400">🏢 PONTO SYNC</h1>
          <p className="text-gray-400 text-sm mt-1">Central de Mandados</p>
          <p className="text-gray-500 text-xs">Bater Ponto • 06:00 às 20:00</p>
        </div>

        {!showCadastroAdmin ? (
          <>
            <div className="flex bg-gray-700 rounded-lg p-1 mb-6">
              <button
                className={`flex-1 py-2 rounded-lg font-semibold transition ${
                  isAdmin ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => setIsAdmin(true)}
              >
                Administrador
              </button>
              <button
                className={`flex-1 py-2 rounded-lg font-semibold transition ${
                  !isAdmin ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => setIsAdmin(false)}
              >
                Funcionário
              </button>
            </div>

            <form onSubmit={isAdmin ? handleAdminLogin : handleFuncionarioLogin} className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm block mb-1">Matrícula</label>
                <input
                  type="text"
                  placeholder="Digite sua matrícula"
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value.toUpperCase())}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-1">Senha</label>
                <input
                  type="password"
                  placeholder="Digite sua senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-semibold transition disabled:opacity-50"
              >
                {loading ? '⏳ Entrando...' : `🔑 Entrar como ${isAdmin ? 'Administrador' : 'Funcionário'}`}
              </button>
            </form>

            {isAdmin && (
              <button
                onClick={() => setShowCadastroAdmin(true)}
                className="w-full mt-4 text-blue-400 hover:text-blue-300 text-sm transition"
              >
                🆕 Criar Primeiro Administrador
              </button>
            )}

            {!isAdmin && (
              <p className="text-gray-500 text-xs text-center mt-4">
                Matrícula padrão: ORION-0001 | Senha: 123456
              </p>
            )}
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold text-white mb-4">🆕 Criar Administrador</h2>
            
            <div className="mb-4">
              <label className="text-gray-400 text-sm block mb-1">
                Senha do Administrador Principal *
              </label>
              <input
                type="password"
                value={senhaAdminPrincipal}
                onChange={(e) => setSenhaAdminPrincipal(e.target.value)}
                placeholder="Digite a senha do admin principal"
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-gray-500 text-xs mt-1">
                Apenas o administrador principal (primeiro cadastrado) pode criar novos administradores.
              </p>
            </div>

            <FormularioPessoa
              tipo="admin"
              dadosIniciais={{
                nome: '',
                foto: null,
                foto_url: '',
                cargo: '',
                setor: '',
                funcao: '',
                matricula: `ADMIN-${Date.now()}`,
                turno: 'matutino',
                carga_horaria: '8',
                telefone: '',
                cpf: '',
                email: '',
                senha: '',
                periodo_ferias_inicio: '',
                periodo_ferias_fim: '',
                observacao: ''
              }}
              onSubmit={cadastrarAdmin}
              onCancel={() => {
                setShowCadastroAdmin(false);
                setSenhaAdminPrincipal('');
                setErros({});
              }}
              loading={loading}
              erros={erros}
              setErros={setErros}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
