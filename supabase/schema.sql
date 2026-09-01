-- ============================================================
-- ORION PONTO PRO - SCHEMA COMPLETO
-- ============================================================

-- Admins
CREATE TABLE IF NOT EXISTS administradores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    cpf TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    senha TEXT NOT NULL,
    telefone TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Funcionários
CREATE TABLE IF NOT EXISTS funcionarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    foto_url TEXT,
    nome TEXT NOT NULL,
    cpf TEXT UNIQUE NOT NULL,
    rg TEXT,
    telefone_celular TEXT NOT NULL,
    cep TEXT,
    cidade TEXT,
    uf TEXT,
    matricula TEXT UNIQUE NOT NULL,
    data_admissao DATE NOT NULL,
    cargo TEXT NOT NULL,
    funcao TEXT NOT NULL,
    departamento TEXT NOT NULL,
    horario_entrada TIME DEFAULT '08:00',
    horario_saida TIME DEFAULT '17:00',
    senha TEXT NOT NULL,
    status TEXT DEFAULT 'ativo',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Registros de Ponto
CREATE TABLE IF NOT EXISTS registros_ponto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funcionario_id UUID REFERENCES funcionarios(id),
    matricula TEXT NOT NULL,
    tipo TEXT CHECK (tipo IN ('entrada', 'saida')),
    timestamp TIMESTAMP DEFAULT NOW(),
    data DATE DEFAULT CURRENT_DATE,
    lat FLOAT,
    lng FLOAT,
    codigo TEXT UNIQUE NOT NULL
);

-- SMS Logs
CREATE TABLE IF NOT EXISTS sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funcionario_id UUID REFERENCES funcionarios(id),
    matricula TEXT NOT NULL,
    tipo TEXT CHECK (tipo IN ('entrada', 'saida', 'alerta')),
    telefone TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    status TEXT DEFAULT 'pendente',
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Faltas e Justificativas
CREATE TABLE IF NOT EXISTS faltas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funcionario_id UUID REFERENCES funcionarios(id),
    data DATE NOT NULL,
    motivo TEXT,
    abonada BOOLEAN DEFAULT FALSE,
    justificada BOOLEAN DEFAULT FALSE,
    atestado_url TEXT,
    aprovada BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Cargos e Funções (para referência)
CREATE TABLE IF NOT EXISTS cargos_funcoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cargo TEXT,
    funcao TEXT,
    departamento TEXT
);

-- Desabilitar RLS para facilitar (em produção, ativar)
ALTER TABLE administradores DISABLE ROW LEVEL SECURITY;
ALTER TABLE funcionarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE registros_ponto DISABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE faltas DISABLE ROW LEVEL SECURITY;
ALTER TABLE cargos_funcoes DISABLE ROW LEVEL SECURITY;
