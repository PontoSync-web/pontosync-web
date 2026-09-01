 export const validarCPF = (cpf) => {
  const cpfLimpo = cpf.replace(/\D/g, '');
  if (cpfLimpo.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpfLimpo)) return false;
  
  let soma = 0, resto;
  for (let i = 1; i <= 9; i++) {
    soma += parseInt(cpfLimpo.substring(i - 1, i)) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpfLimpo.substring(9, 10))) return false;
  
  soma = 0;
  for (let i = 1; i <= 10; i++) {
    soma += parseInt(cpfLimpo.substring(i - 1, i)) * (12 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpfLimpo.substring(10, 11))) return false;
  
  return true;
};

export const formatarCPF = (cpf) => {
  const limpo = cpf.replace(/\D/g, '');
  if (limpo.length <= 3) return limpo;
  if (limpo.length <= 6) return `${limpo.slice(0, 3)}.${limpo.slice(3)}`;
  if (limpo.length <= 9) return `${limpo.slice(0, 3)}.${limpo.slice(3, 6)}.${limpo.slice(6)}`;
  return `${limpo.slice(0, 3)}.${limpo.slice(3, 6)}.${limpo.slice(6, 9)}-${limpo.slice(9, 11)}`;
};

export const formatarTelefone = (telefone) => {
  const limpo = telefone.replace(/\D/g, '');
  if (limpo.length <= 2) return limpo;
  if (limpo.length <= 6) return `(${limpo.slice(0, 2)}) ${limpo.slice(2)}`;
  if (limpo.length <= 10) return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 6)}-${limpo.slice(6)}`;
  return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 7)}-${limpo.slice(7, 11)}`;
};

export const validarTelefone = (telefone) => {
  const limpo = telefone.replace(/\D/g, '');
  return limpo.length >= 10 && limpo.length <= 11;
};

export const validarEmail = (email) => {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
};

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

export const validarCamposObrigatorios = (campos, obrigatorios) => {
  for (const campo of obrigatorios) {
    if (!campos[campo] || campos[campo].trim() === '') {
      return { valida: false, campo };
    }
  }
  return { valida: true };
};
