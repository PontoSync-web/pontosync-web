import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import FuncionarioPonto from './components/FuncionarioPonto';
import GerenciarFuncionarios from './components/GerenciarFuncionarios';
import Relatorios from './components/Relatorios';
import GerenciarFaltas from './components/GerenciarFaltas';

const App = () => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const handleLogin = (funcionario) => {
    setUser(funcionario);
    setIsAdmin(false);
  };

  const handleAdminLogin = (admin) => {
    setUser(admin);
    setIsAdmin(true);
  };

  const handleLogout = () => {
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <>
      <Toaster position="top-right" toastOptions={{ className: 'bg-gray-800 text-white' }} />
      <BrowserRouter>
        {!user ? (
          <Login onLogin={handleLogin} onAdminLogin={handleAdminLogin} />
        ) : (
          <div className="min-h-screen bg-gray-900">
            <header className="bg-gray-800 p-4 flex justify-between items-center shadow-lg">
              <h1 className="text-xl font-bold text-blue-400">
                🏢 {isAdmin ? 'ORION PONTO PRO - Admin' : 'ORION PONTO PRO'}
              </h1>
              <div className="flex items-center gap-4">
                <span className="text-gray-400 text-sm">
                  {isAdmin ? user.nome : user.nome}
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded-lg text-sm transition"
                >
                  Sair
                </button>
              </div>
            </header>

            <div className="p-4">
              {isAdmin ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
                  <a href="/admin" className="bg-gray-800 hover:bg-gray-700 p-3 rounded-lg text-center transition">
                    📊 Dashboard
                  </a>
                  <a href="/admin/funcionarios" className="bg-gray-800 hover:bg-gray-700 p-3 rounded-lg text-center transition">
                    👥 Funcionários
                  </a>
                  <a href="/admin/relatorios" className="bg-gray-800 hover:bg-gray-700 p-3 rounded-lg text-center transition">
                    📈 Relatórios
                  </a>
                  <a href="/admin/faltas" className="bg-gray-800 hover:bg-gray-700 p-3 rounded-lg text-center transition">
                    📋 Faltas
                  </a>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4 max-w-md mx-auto">
                  <a href="/ponto" className="bg-gray-800 hover:bg-gray-700 p-3 rounded-lg text-center transition">
                    📍 Bater Ponto
                  </a>
                  <a href="/ponto/relatorios" className="bg-gray-800 hover:bg-gray-700 p-3 rounded-lg text-center transition">
                    📋 Meu Histórico
                  </a>
                </div>
              )}

              <Routes>
                {/* Rotas Admin */}
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/funcionarios" element={<GerenciarFuncionarios />} />
                <Route path="/admin/relatorios" element={<Relatorios isAdmin={true} />} />
                <Route path="/admin/faltas" element={<GerenciarFaltas />} />

                {/* Rotas Funcionário */}
                <Route path="/ponto" element={<FuncionarioPonto />} />
                <Route path="/ponto/relatorios" element={<Relatorios isAdmin={false} />} />

                <Route path="/" element={<Navigate to={isAdmin ? "/admin" : "/ponto"} />} />
              </Routes>
            </div>
          </div>
        )}
      </BrowserRouter>
    </>
  );
};

export default App;
