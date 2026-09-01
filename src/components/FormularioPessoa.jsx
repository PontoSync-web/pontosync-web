import React, { useState } from 'react';
import { formatarCPF, formatarTelefone, validarCPF, validarTelefone, validarEmail, validarSenha, validarCamposObrigatorios } from '../utils/validators';

const FormularioPessoa = ({ 
  tipo, // 'admin' ou 'funcionario'
  dadosIniciais,
  onSubmit,
  onCancel,
  loading,
  erros: errosExternos,
  setErros: setErrosExternos
}) => {
  // ============================================================
  // DADOS DO FORMULÁRIO
  // ============================================================
  const [form, setForm] = useState(dadosIniciais || {
    nome: '',
    foto: null,
    foto_url: '',
    cargo: '',
    setor: '',
    funcao: '',
    matricula: '',
    turno: 'matutino',
    carga_horaria: '8',
    telefone: '',
    cpf: '',
    email: '',
    periodo_ferias_inicio: '',
    periodo_ferias_fim: '',
    observacao: '',
    senha: '',
    data_admissao: new Date().toISOString().split('T')[0],
    horario_entrada: '08:00',
    horario_saida: '17:00',
    status: 'ativo'
  });

  const [erros, setErros] = useState(errosExternos || {});

  // ============================================================
  // OPÇÕES PARA SELECTS
  // ============================================================
  const turnos = ['matutino', 'vespertino', 'noturno'];
  const cargasHorarias = ['6', '8'];
  const cargos = ['Analista', 'Desenvolvedor', 'Gerente', 'Assistente', 'Coordenador', 'Estagiário', 'Diretor', 'Supervisor'];
  const setores = ['TI', 'RH', 'Financeiro', 'Comercial', 'Operações', 'Marketing', 'Administrativo', 'Jurídico'];
  const funcoes = ['Frontend', 'Backend', 'Fullstack', 'Suporte', 'Administrativo', 'Marketing', 'Vendas', 'Contabilidade', 'Recursos Humanos'];

  // ============================================================
  // HANDLERS COM FORMATAÇÃO
  // ============================================================
  const handleChange = (campo) => (e) => {
    const valor = e.target.value;
    setForm({ ...form, [campo]: valor });
    if (erros[campo]) {
      setErros({ ...erros, [campo]: '' });
      if (setErrosExternos) setErrosExternos({ ...errosExternos, [campo]: '' });
    }
  };

  const handleCPFChange = (e) => {
    const valor = e.target.value;
    const limpo = valor.replace(/\D/g, '');
    if (limpo.length <= 11) {
      setForm({ ...form, cpf: formatarCPF(limpo) });
      if (erros.cpf) {
        setErros({ ...erros, cpf: '' });
        if (setErrosExternos) setErrosExternos({ ...errosExternos, cpf: '' });
      }
    }
  };

  const handleTelefoneChange = (e) => {
    const valor = e.target.value;
    const limpo = valor.replace(/\D/g, '');
    if (limpo.length <= 11) {
      setForm({ ...form, telefone: formatarTelefone(limpo) });
      if (erros.telefone) {
        setErros({ ...erros, telefone: '' });
        if (setErrosExternos) setErrosExternos({ ...errosExternos, telefone: '' });
      }
    }
  };

  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, foto: file, foto_url: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  // ============================================================
  // VALIDAÇÃO
  // ============================================================
  const validarFormulario = () => {
    const novosErros = {};

    const obrigatorios = ['nome', 'cargo', 'setor', 'funcao', 'turno', 'carga_horaria', 'telefone', 'cpf'];
    if (tipo === 'admin') {
      obrigatorios.push('email', 'senha');
    }
    if (tipo === 'funcionario') {
      obrigatorios.push('matricula', 'data_admissao');
    }

    const camposValidos = validarCamposObrigatorios(form, obrigatorios);
    if (!camposValidos.valida) {
      novosErros[camposValidos.campo] = 'Campo obrigatório';
    }

    if (form.cpf && !validarCPF(form.cpf)) {
      novosErros.cpf = 'CPF inválido. Use o formato 000.000.000-00 ou apenas números.';
    }

    if (form.email && !validarEmail(form.email)) {
      novosErros.email = 'E-mail inválido. Exemplo: usuario@dominio.com';
    }

    if (form.telefone && !validarTelefone(form.telefone)) {
      novosErros.telefone = 'Telefone inválido. Use o formato (71) 99999-9999.';
    }

    if (form.senha && tipo === 'admin') {
      const senhaValida = validarSenha(form.senha);
      if (!senhaValida.valida) {
        novosErros.senha = senhaValida.mensagem;
      }
    }

    setErros(novosErros);
    if (setErrosExternos) setErrosExternos(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  // ============================================================
  // SUBMIT
  // ============================================================
  const handleSubmit = (e) => {
    e.preventDefault();
    if (validarFormulario()) {
      onSubmit(form);
    } else {
      const primeiroErro = document.querySelector('.border-red-500');
      if (primeiroErro) primeiroErro.focus();
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nome */}
        <div className="md:col-span-2">
          <label className="text-gray-400 text-sm">Nome completo *</label>
          <input
            type="text"
            value={form.nome}
            onChange={handleChange('nome')}
            className={`w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 ${
              erros.nome ? 'border-2 border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
            }`}
          />
          {erros.nome && <p className="text-red-400 text-xs mt-1">{erros.nome}</p>}
        </div>

        {/* Foto */}
        <div>
          <label className="text-gray-400 text-sm">Foto (opcional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFotoChange}
            className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
          />
          {form.foto_url && (
            <div className="mt-2">
              <img src={form.foto_url} alt="Preview" className="w-20 h-20 rounded-full object-cover" />
            </div>
          )}
        </div>

        {/* Matrícula */}
        <div>
          <label className="text-gray-400 text-sm">Matrícula {tipo === 'funcionario' && '*'}</label>
          <input
            type="text"
            value={form.matricula}
            onChange={handleChange('matricula')}
            placeholder="Ex: ORION-0001"
            className={`w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 ${
              erros.matricula ? 'border-2 border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
            }`}
          />
          {erros.matricula && <p className="text-red-400 text-xs mt-1">{erros.matricula}</p>}
        </div>

        {/* CPF */}
        <div>
          <label className="text-gray-400 text-sm">CPF *</label>
          <input
            type="text"
            value={form.cpf}
            onChange={handleCPFChange}
            maxLength={14}
            placeholder="000.000.000-00"
            className={`w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 ${
              erros.cpf ? 'border-2 border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
            }`}
          />
          {erros.cpf && <p className="text-red-400 text-xs mt-1">{erros.cpf}</p>}
        </div>

        {/* Telefone */}
        <div>
          <label className="text-gray-400 text-sm">Telefone *</label>
          <input
            type="text"
            value={form.telefone}
            onChange={handleTelefoneChange}
            maxLength={15}
            placeholder="(71) 99999-9999"
            className={`w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 ${
              erros.telefone ? 'border-2 border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
            }`}
          />
          {erros.telefone && <p className="text-red-400 text-xs mt-1">{erros.telefone}</p>}
        </div>

        {/* E-mail */}
        <div>
          <label className="text-gray-400 text-sm">E-mail {tipo === 'admin' && '*'}</label>
          <input
            type="email"
            value={form.email}
            onChange={handleChange('email')}
            placeholder="usuario@dominio.com"
            className={`w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 ${
              erros.email ? 'border-2 border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
            }`}
          />
          {erros.email && <p className="text-red-400 text-xs mt-1">{erros.email}</p>}
        </div>

        {/* Cargo */}
        <div>
          <label className="text-gray-400 text-sm">Cargo *</label>
          <select
            value={form.cargo}
            onChange={handleChange('cargo')}
            className={`w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 ${
              erros.cargo ? 'border-2 border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
            }`}
          >
            <option value="">Selecione</option>
            {cargos.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {erros.cargo && <p className="text-red-400 text-xs mt-1">{erros.cargo}</p>}
        </div>

        {/* Setor */}
        <div>
          <label className="text-gray-400 text-sm">Setor *</label>
          <select
            value={form.setor}
            onChange={handleChange('setor')}
            className={`w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 ${
              erros.setor ? 'border-2 border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
            }`}
          >
            <option value="">Selecione</option>
            {setores.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {erros.setor && <p className="text-red-400 text-xs mt-1">{erros.setor}</p>}
        </div>

        {/* Função */}
        <div>
          <label className="text-gray-400 text-sm">Função *</label>
          <select
            value={form.funcao}
            onChange={handleChange('funcao')}
            className={`w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 ${
              erros.funcao ? 'border-2 border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
            }`}
          >
            <option value="">Selecione</option>
            {funcoes.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          {erros.funcao && <p className="text-red-400 text-xs mt-1">{erros.funcao}</p>}
        </div>

        {/* Turno */}
        <div>
          <label className="text-gray-400 text-sm">Turno *</label>
          <select
            value={form.turno}
            onChange={handleChange('turno')}
            className={`w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 ${
              erros.turno ? 'border-2 border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
            }`}
          >
            {turnos.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
          {erros.turno && <p className="text-red-400 text-xs mt-1">{erros.turno}</p>}
        </div>

        {/* Carga Horária */}
        <div>
          <label className="text-gray-400 text-sm">Carga Horária *</label>
          <select
            value={form.carga_horaria}
            onChange={handleChange('carga_horaria')}
            className={`w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 ${
              erros.carga_horaria ? 'border-2 border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
            }`}
          >
            {cargasHorarias.map(ch => <option key={ch} value={ch}>{ch} horas</option>)}
          </select>
          {erros.carga_horaria && <p className="text-red-400 text-xs mt-1">{erros.carga_horaria}</p>}
        </div>

        {/* Período de Férias */}
        <div>
          <label className="text-gray-400 text-sm">Início Férias</label>
          <input
            type="date"
            value={form.periodo_ferias_inicio}
            onChange={handleChange('periodo_ferias_inicio')}
            className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-gray-400 text-sm">Fim Férias</label>
          <input
            type="date"
            value={form.periodo_ferias_fim}
            onChange={handleChange('periodo_ferias_fim')}
            className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Data Admissão (Funcionário) */}
        {tipo === 'funcionario' && (
          <div>
            <label className="text-gray-400 text-sm">Data Admissão *</label>
            <input
              type="date"
              value={form.data_admissao}
              onChange={handleChange('data_admissao')}
              className={`w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                erros.data_admissao ? 'border-2 border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
              }`}
            />
            {erros.data_admissao && <p className="text-red-400 text-xs mt-1">{erros.data_admissao}</p>}
          </div>
        )}

        {/* Senha (Admin) */}
        {tipo === 'admin' && (
          <div>
            <label className="text-gray-400 text-sm">Senha *</label>
            <input
              type="password"
              value={form.senha}
              onChange={handleChange('senha')}
              placeholder="Mín. 6 caracteres, letras e números"
              className={`w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                erros.senha ? 'border-2 border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
              }`}
            />
            {erros.senha && <p className="text-red-400 text-xs mt-1">{erros.senha}</p>}
            {form.senha && !erros.senha && (
              <p className="text-green-400 text-xs mt-1">✅ Senha válida</p>
            )}
          </div>
        )}

        {/* Observação */}
        <div className="md:col-span-2">
          <label className="text-gray-400 text-sm">Observação</label>
          <textarea
            value={form.observacao}
            onChange={handleChange('observacao')}
            rows={3}
            placeholder="Observações gerais sobre a pessoa..."
            className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-semibold transition disabled:opacity-50"
        >
          {loading ? '⏳ Salvando...' : '✅ Salvar'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-600 hover:bg-gray-700 py-2 rounded-lg font-semibold transition"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
};

export default FormularioPessoa;
