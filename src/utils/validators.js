/**
 * Valida CPF (formato 000.000.000-00 ou 00000000000)
 * @param {string} cpf - CPF a ser validado
 * @returns {boolean} - true se válido
 */
export const validarCPF = (cpf) => {
  // Remove caracteres não numéricos
  const cpfLimpo = cpf.replace(/\D/g, '');
  
  // Verifica tamanho
  if (cpfLimpo.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(cpfLimpo)) return false;
  
  // Validação dos dígitos verificadores
  let soma = 0;
  let resto;
  
  // Primeiro dígito verificador
  for (let i = 1; i <= 9; i++) {
    soma += parseInt(cpfLimpo.substring(i - 1, i)) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpfLimpo.substring(9, 10))) return false;
  
  // Segundo dígito verificador
  soma = 0;
  for (let i = 1; i <= 10; i++) {
    soma += parseInt(cpfLimpo.substring(i - 1, i)) * (12 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpfLimpo.substring(10, 11))) return false;
  
  return true;
};

/**
 * Formata CPF automaticamente (000.000.000-00)
 * @param {string} cpf - CPF sem formatação
 * @returns {string} - CPF formatado
 */
export const formatarCPF = (cpf) => {
  const limpo = cpf.replace(/\D/g, '');
  if (limpo.length <= 3) return limpo;
  if (limpo.length <= 6) return `${limpo.slice(0, 3)}.${limpo.slice(3)}`;
  if (limpo.length <= 9) return `${limpo.slice(0, 3)}.${limpo.slice(3, 6)}.${limpo.slice(6)}`;
  return `${limpo.slice(0, 3)}.${limpo.slice(3, 6)}.${limpo.slice(6, 9)}-${limpo.slice(9, 11)}`;
};

/**
 * Valida telefone celular (formato (71) 99999-9999 ou 71999999999)
 * @param {string} telefone - Telefone a ser validado
 * @returns {boolean} - true se válido
 */
export const validarTelefone = (telefone) => {
  const limpo = telefone.replace(/\D/g, '');
  // Aceita 10 dígitos (fixo) ou 11 dígitos (celular com 9)
  return limpo.length >= 10 && limpo.length <= 11;
};

/**
 * Formata telefone automaticamente ((71) 99999-9999)
 * @param {string} telefone - Telefone sem formatação
 * @returns {string} - Telefone formatado
 */
export const formatarTelefone = (telefone) => {
  const limpo = telefone.replace(/\D/g, '');
  if (limpo.length <= 2) return limpo;
  if (limpo.length <= 6) return `(${limpo.slice(0, 2)}) ${limpo.slice(2)}`;
  if (limpo.length <= 10) return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 6)}-${limpo.slice(6)}`;
  return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 7)}-${limpo.slice(7, 11)}`;
};

/**
 * Valida e-mail (formato usuario@domínio.com)
 * @param {string} email - E-mail a ser validado
 * @returns {boolean} - true se válido
 */
export const validarEmail = (email) => {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
};

/**
 * Valida senha (mínimo 6 caracteres, com letras e números)
 * @param {string} senha - Senha a ser validada
 * @returns {object} - { valida: boolean, mensagem: string }
 */
export const validarSenha = (senha) => {
  if (senha.length < 6) {
    return { valida: false, mensagem: 'A senha deve ter pelo menos 6 caracteres.' };
  }
  if (!/[A-Za-z]/.test(senha)) {
    return { valida: false, mensagem: 'A senha deve conter pelo menos uma letra.' };
  }
  if (!/\d/.test(senha)) {
    return { valida: false, mensagem: 'A senha deve conter pelo menos um número.' };
  }
  return { valida: true, mensagem: 'Senha válida.' };
};

/**
 * Valida campos obrigatórios
 * @param {object} campos - Objeto com campos a validar
 * @param {array} obrigatorios - Lista de campos obrigatórios
 * @returns {object} - { valida: boolean, campo: string }
 */
export const validarCamposObrigatorios = (campos, obrigatorios) => {
  for (const campo of obrigatorios) {
    if (!campos[campo] || campos[campo].trim() === '') {
      return { valida: false, campo };
    }
  }
  return { valida: true };
};
