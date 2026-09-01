import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

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

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !senha) {
      toast.error('Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      if (isAdmin) {
        // Login administrador
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
        // Login funcionário
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

  const cadastrarAdmin = async (e) => {
    e.preventDefault();
    if (!novoAdmin.nome || !novoAdmin.cpf || !novoAdmin.email || !novoAdmin.senha) {
      toast.error('Preencha todos os campos obrigatórios');
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

      toast.success('Administrador criado com sucesso! Faça login.');
      setShowCadastroAdmin(false);
      setNovoAdmin({ nome: '', cpf: '', email: '', senha: '', telefone: '' });
    } catch (error) {
      toast.error('Erro ao criar administrador');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-2xl max-w-md w-full border border-blue-500 shadow-2xl">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-blue-400">🏢 ORION PONTO PRO</h1>
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
              <input
                type="text"
                placeholder="Nome completo *"
                value={novoAdmin.nome}
                onChange={(e) => setNovoAdmin({ ...novoAdmin, nome: e.target.value })}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="text"
                placeholder="CPF (apenas números) *"
                value={novoAdmin.cpf}
                onChange={(e) => setNovoAdmin({ ...novoAdmin, cpf: e.target.value.replace(/\D/g, '') })}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="email"
                placeholder="E-mail *"
                value={novoAdmin.email}
                onChange={(e) => setNovoAdmin({ ...novoAdmin, email: e.target.value })}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="password"
                placeholder="Senha *"
                value={novoAdmin.senha}
                onChange={(e) => setNovoAdmin({ ...novoAdmin, senha: e.target.value })}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="text"
                placeholder="Telefone (opcional)"
                value={novoAdmin.telefone}
                onChange={(e) => setNovoAdmin({ ...novoAdmin, telefone: e.target.value })}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
                  onClick={() => setShowCadastroAdmin(false)}
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
