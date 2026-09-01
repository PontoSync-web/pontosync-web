import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { 
  validarCPF, 
  formatarCPF, 
  validarTelefone, 
  formatarTelefone, 
  validarEmail, 
  validarSenha,
  validarCamposObrigatorios 
} from '../utils/validators';

const Login = ({ onLogin, onAdminLogin }) => {
  const [isAdmin, setIsAdmin] = useState(true);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCadastroAdmin, setShowCadastroAdmin] = useState(false);
  const [novoAdmin, setNovoAdmin] = useState({
    nome: '',
    cpf: '',
    email: '',
    senha: '',
    telefone: ''
  });
  const [erros, setErros] = useState({});

  // ============================================================
  // VALIDAÇÃO DO FORMULÁRIO DE CADASTRO
  // ============================================================
  const validarFormularioAdmin = () => {
    const novosErros = {};

    // Campos obrigatórios
    const obrigatorios = ['nome', 'cpf', 'email', 'senha'];
    const camposValidos = validarCamposObrigatorios(novoAdmin, obrigatorios);
    if (!camposValidos.valida) {
      novosErros[camposValidos.campo] = 'Campo obrigatório';
    }

    // Valida CPF
    if (novoAdmin.cpf && !validarCPF(novoAdmin.cpf)) {
      novosErros.cpf = 'CPF inválido. Use o formato 000.000.000-00 ou apenas números.';
    }

    // Valida e-mail
    if (novoAdmin.email && !validarEmail(novoAdmin.email)) {
      novosErros.email = 'E-mail inválido. Exemplo: usuario@dominio.com';
    }

    // Valida senha
    if (novoAdmin.senha) {
      const senhaValida = validarSenha(novoAdmin.senha);
      if (!senhaValida.valida) {
        novosErros.senha = senhaValida.mensagem;
      }
    }

    // Valida telefone (opcional)
    if (novoAdmin.telefone && !validarTelefone(novoAdmin.telefone)) {
      novosErros.telefone = 'Telefone inválido. Use o formato (71) 99999-9999 ou apenas números.';
    }

    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  // ============================================================
  // HANDLERS COM FORMATAÇÃO AUTOMÁTICA
  // ============================================================
  const handleCPFChange = (e) => {
    const valor = e.target.value;
    const limpo = valor.replace(/\D/g, '');
    if (limpo.length <= 11) {
      setNovoAdmin({ ...novoAdmin, cpf: formatarCPF(limpo) });
      // Limpa erro do CPF enquanto digita
      if (erros.cpf) {
        setErros({ ...erros, cpf: '' });
      }
    }
  };

  const handleTelefoneChange = (e) => {
    const valor = e.target.value;
    const limpo = valor.replace(/\D/g, '');
    if (limpo.length <= 11) {
      setNovoAdmin({ ...novoAdmin, telefone: formatarTelefone(limpo) });
      if (erros.telefone) {
        setErros({ ...erros, telefone: '' });
      }
    }
  };

  const handleEmailChange = (e) => {
    const valor = e.target.value;
    setNovoAdmin({ ...novoAdmin, email: valor });
    if (erros.email) {
      setErros({ ...erros, email: '' });
    }
  };

  const handleSenhaChange = (e) => {
    const valor = e.target.value;
    setNovoAdmin({ ...novoAdmin, senha: valor });
    if (erros.senha) {
      setErros({ ...erros, senha: '' });
    }
  };

  const handleNomeChange = (e) => {
    const valor = e.target.value;
    setNovoAdmin({ ...novoAdmin, nome: valor });
    if (erros.nome) {
      setErros({ ...erros, nome: '' });
    }
  };

  // ============================================================
  // CADASTRAR ADMINISTRADOR (COM VALIDAÇÃO)
  // ============================================================
  const cadastrarAdmin = async (e) => {
    e.preventDefault();

    // Valida formulário
    if (!validarFormularioAdmin()) {
      toast.error('Corrija os campos destacados');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('administradores')
        .insert([novoAdmin])
        .select();

      if (error) {
        if (error.code === '23505') {
          toast.error('CPF ou e-mail já cadastrado');
        } else {
          throw error;
        }
        return;
      }

      toast.success('✅ Administrador criado com sucesso! Faça login.');
      setShowCadastroAdmin(false);
      setNovoAdmin({ nome: '', cpf: '', email: '', senha: '', telefone: '' });
      setErros({});
    } catch (error) {
      console.error('❌ Erro ao criar administrador:', error);
      toast.error('Erro ao criar administrador: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // LOGIN (COM VALIDAÇÃO BÁSICA)
  // ============================================================
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !senha) {
      toast.error('Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      if (isAdmin) {
        const { data, error } = await supabase
          .from('administradores')
          .select('*')
          .eq('email', email)
          .eq('senha', senha)
          .single();

        if (error || !data) {
          toast.error('Credenciais inválidas');
          return;
        }

        toast.success(`Bem-vindo, ${data.nome}!`);
        onAdminLogin(data);
      } else {
        const { data, error } = await supabase
          .from('funcionarios')
          .select('*')
          .eq('matricula', email.toUpperCase())
          .eq('senha', senha)
          .single();

        if (error || !data) {
          toast.error('Matrícula ou senha inválidos');
          return;
        }

        toast.success(`Bem-vindo, ${data.nome}!`);
        onLogin(data);
      }
    } catch (error) {
      toast.error('Erro ao fazer login');
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
          <p className="text-gray-400 text-sm mt-1">Sistema de Ponto Eletrônico</p>
        </div>

        {!showCadastroAdmin ? (
          <>
            {/* Tabs */}
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

            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type={isAdmin ? 'email' : 'text'}
                placeholder={isAdmin ? 'E-mail' : 'Matrícula (ex: ORION-0001)'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="password"
                placeholder="Senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-semibold transition disabled:opacity-50"
              >
                {loading ? '⏳ Entrando...' : '🔑 Entrar'}
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
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold text-white mb-4">🆕 Criar Administrador</h2>
            <form onSubmit={cadastrarAdmin} className="space-y-4">
              {/* Nome */}
              <div>
                <input
                  type="text"
                  placeholder="Nome completo *"
                  value={novoAdmin.nome}
                  onChange={handleNomeChange}
                  className={`w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                    erros.nome ? 'border-2 border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
                  }`}
                />
                {erros.nome && <p className="text-red-400 text-xs mt-1">{erros.nome}</p>}
              </div>

              {/* CPF com formatação automática */}
              <div>
                <input
                  type="text"
                  placeholder="CPF (apenas números) *"
                  value={novoAdmin.cpf}
                  onChange={handleCPFChange}
                  maxLength={14}
                  className={`w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                    erros.cpf ? 'border-2 border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
                  }`}
                />
                {erros.cpf && <p className="text-red-400 text-xs mt-1">{erros.cpf}</p>}
              </div>

              {/* E-mail */}
              <div>
                <input
                  type="email"
                  placeholder="E-mail *"
                  value={novoAdmin.email}
                  onChange={handleEmailChange}
                  className={`w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                    erros.email ? 'border-2 border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
                  }`}
                />
                {erros.email && <p className="text-red-400 text-xs mt-1">{erros.email}</p>}
              </div>

              {/* Senha com validação em tempo real */}
              <div>
                <input
                  type="password"
                  placeholder="Senha (mín. 6 caracteres, letras e números) *"
                  value={novoAdmin.senha}
                  onChange={handleSenhaChange}
                  className={`w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                    erros.senha ? 'border-2 border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
                  }`}
                />
                {erros.senha && <p className="text-red-400 text-xs mt-1">{erros.senha}</p>}
                {novoAdmin.senha && !erros.senha && (
                  <p className="text-green-400 text-xs mt-1">✅ Senha válida</p>
                )}
              </div>

              {/* Telefone com formatação automática */}
              <div>
                <input
                  type="text"
                  placeholder="Telefone (opcional)"
                  value={novoAdmin.telefone}
                  onChange={handleTelefoneChange}
                  maxLength={15}
                  className={`w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                    erros.telefone ? 'border-2 border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
                  }`}
                />
                {erros.telefone && <p className="text-red-400 text-xs mt-1">{erros.telefone}</p>}
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-semibold transition disabled:opacity-50"
                >
                  {loading ? '⏳ Criando...' : '✅ Criar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCadastroAdmin(false);
                    setErros({});
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 py-2 rounded-lg font-semibold transition"
                >
                  Voltar
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
