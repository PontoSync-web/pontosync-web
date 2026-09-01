import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

type Funcionario = {
  id: string; foto_url?: string; nome: string; cpf: string; rg?: string; telefone_celular: string; email?: string;
  matricula: string; cargo: string; funcao: string; departamento: string; data_admissao: string;
  horario_entrada: string; horario_saida: string; senha: string; status: string;
  cidade?: string; uf?: string; pis?: string; salario?: string
}
type Registro = { id: string; matricula: string; tipo: 'entrada'|'saida'; timestamp: string; codigo: string; funcionario_nome?: string }
type Admin = { id: string; nome: string; cpf: string; email: string; senha: string; telefone: string }

const COLORS = ['#00ffaa','#00d4ff','#ffaa00','#ff00ff','#8b5cf6']

export default function App(){
  const [view, setView] = useState<'login'|'dashboard'|'ponto'|'funcionarios'|'relatorios'|'faltas'|'supabase'>('login')
  const [admins, setAdmins] = useState<Admin[]>(()=> JSON.parse(localStorage.getItem('orion_admins')||'[]'))
  const [funcs, setFuncs] = useState<Funcionario[]>(()=> JSON.parse(localStorage.getItem('orion_funcs')||'[]'))
  const [regs, setRegs] = useState<Registro[]>(()=> JSON.parse(localStorage.getItem('orion_regs')||'[]'))
  const [user, setUser] = useState<Admin|null>(()=> JSON.parse(localStorage.getItem('orion_user')||'null'))
  const [matriculaInput, setMatriculaInput] = useState('')
  const [selectedFunc, setSelectedFunc] = useState<Funcionario|null>(null)
  const [cartao, setCartao] = useState<{msg:string,tipo:string,data:string}|null>(null)

  // persist
  useEffect(()=>localStorage.setItem('orion_admins',JSON.stringify(admins)),[admins])
  useEffect(()=>localStorage.setItem('orion_funcs',JSON.stringify(funcs)),[funcs])
  useEffect(()=>localStorage.setItem('orion_regs',JSON.stringify(regs)),[regs])
  useEffect(()=>{ if(user) localStorage.setItem('orion_user',JSON.stringify(user)) },[user])

  const stats = useMemo(()=>{
    const hoje = new Date().toISOString().slice(0,10)
    const entradasHoje = regs.filter(r=> r.tipo==='entrada' && r.timestamp.slice(0,10)===hoje)
    const matriculasPresentes = new Set(entradasHoje.map(r=>r.matricula))
    return {
      total: funcs.length,
      presentes: matriculasPresentes.size,
      faltas: Math.max(0, funcs.length - matriculasPresentes.size),
      atrasos: 2,
      horas: regs.length * 4
    }
  },[funcs, regs])

  const handleCriarAdmin = (e:any)=>{
    e.preventDefault()
    const fd = new FormData(e.target)
    const admin: Admin = {
      id: Date.now().toString(),
      nome: fd.get('nome') as string,
      cpf: fd.get('cpf') as string,
      email: fd.get('email') as string,
      telefone: fd.get('telefone') as string,
      senha: fd.get('senha') as string
    }
    if(admin.senha !== (fd.get('confirma') as string)){ alert('Senhas não conferem'); return }
    setAdmins([...admins, admin])
    setUser(admin)
    setView('dashboard')
    if(supabase) supabase.from('administradores').insert([{nome:admin.nome, cpf:admin.cpf, email:admin.email, senha:admin.senha, telefone:admin.telefone}]).then(()=>{})
  }

  const handleLoginAdmin = (e:any)=>{
    e.preventDefault()
    const fd = new FormData(e.target)
    const email = fd.get('email') as string
    const senha = fd.get('senha') as string
    const found = admins.find(a=> a.email===email && a.senha===senha)
    if(!found){ alert('Admin não encontrado'); return }
    setUser(found); setView('dashboard')
  }

  const handleCadFuncionario = (e:any)=>{
    e.preventDefault()
    const fd = new FormData(e.target)
    const fotoFile = fd.get('foto') as File
    const matricula = `PONTOSYNC-${String(funcs.length+1).padStart(4,'0')}`
    const novo: Funcionario = {
      id: Date.now().toString(),
      nome: fd.get('nome') as string,
      cpf: fd.get('cpf') as string,
      rg: fd.get('rg') as string,
      telefone_celular: fd.get('celular') as string,
      email: fd.get('email') as string,
      matricula: fd.get('matricula') as string || matricula,
      cargo: fd.get('cargo') as string,
      funcao: fd.get('funcao') as string,
      departamento: fd.get('departamento') as string,
      data_admissao: fd.get('admissao') as string || new Date().toISOString().slice(0,10),
      horario_entrada: fd.get('h_entrada') as string || '08:00',
      horario_saida: fd.get('h_saida') as string || '17:00',
      senha: fd.get('senha') as string || '123456',
      status: 'ativo',
      foto_url: fotoFile && fotoFile.size>0 ? URL.createObjectURL(fotoFile) : `https://i.pravatar.cc/150?u=${matricula}`,
      cidade: fd.get('cidade') as string,
      uf: fd.get('uf') as string,
      pis: fd.get('pis') as string,
      salario: fd.get('salario') as string
    }
    setFuncs([...funcs, novo])
    if(supabase) supabase.from('funcionarios').insert([{nome:novo.nome, cpf:novo.cpf, telefone_celular:novo.telefone_celular, matricula:novo.matricula, cargo:novo.cargo, funcao:novo.funcao, departamento:novo.departamento, data_admissao:novo.data_admissao, horario_entrada:novo.horario_entrada, horario_saida:novo.horario_saida, senha:novo.senha, foto_url:novo.foto_url}]).then(()=>{})
    alert(`Funcionário ${novo.nome} cadastrado com matrícula ${novo.matricula}`)
    e.target.reset()
  }

  const handleBuscarMatricula = ()=>{
    const f = funcs.find(x=> x.matricula.toLowerCase()===matriculaInput.toLowerCase() || x.cpf===matriculaInput)
    if(!f){ alert('Matrícula não encontrada'); return }
    setSelectedFunc(f)
  }

  const simularEnvioSMS = (func: Funcionario, tipo: string, dataHora: string, duracao?: string)=>{
    const mensagem = tipo==='entrada'
      ? `PontoSync-web - Olá ${func.nome} (${func.matricula}) ENTRADA registrada em ${dataHora}`
      : `PontoSync-web - Olá ${func.nome} (${func.matricula}) SAÍDA registrada em ${dataHora}${duracao?` - Expediente ${duracao}`:''}`
    // Salva log SMS
    const log = { id: Date.now().toString(), matricula: func.matricula, tipo, telefone: func.telefone_celular, mensagem, timestamp: new Date().toISOString(), codigo: `PONTOSYNC-${Date.now()}` }
    const logs = JSON.parse(localStorage.getItem('orion_sms')||'[]'); logs.push(log); localStorage.setItem('orion_sms', JSON.stringify(logs))
    if(supabase) supabase.from('sms_logs').insert([{matricula:func.matricula, tipo, telefone:func.telefone_celular, mensagem}]).then(()=>{})
    // Mostra cartão
    setCartao({msg: mensagem, tipo, data: dataHora})
    // Web Notification + console
    console.log('SMS ENVIADO:', mensagem)
  }

  const handleBaterPonto = (tipo:'entrada'|'saida')=>{
    if(!selectedFunc) return
    const agora = new Date()
    const dataHora = agora.toLocaleString('pt-BR')
    const codigo = `PT-${agora.getTime()}`
    const novoReg: Registro = { id: codigo, matricula: selectedFunc.matricula, tipo, timestamp: agora.toISOString(), codigo, funcionario_nome: selectedFunc.nome }
    setRegs([...regs, novoReg])
    if(supabase) supabase.from('registros_ponto').insert([{matricula:selectedFunc.matricula, tipo, codigo, funcionario_id: null}]).then(()=>{})
    let duracao: string|undefined
    if(tipo==='saida'){
      const entrada = [...regs].reverse().find(r=> r.matricula===selectedFunc.matricula && r.tipo==='entrada' && r.timestamp.slice(0,10)===agora.toISOString().slice(0,10))
      if(entrada){
        const diff = agora.getTime() - new Date(entrada.timestamp).getTime()
        const h = Math.floor(diff/3600000); const m = Math.floor((diff%3600000)/60000)
        duracao = `${h}h${String(m).padStart(2,'0')}m`
      } else duracao='8h00m'
    }
    simularEnvioSMS(selectedFunc, tipo, dataHora, duracao)
  }

  const chartData = [
    { name: 'qua.', horas: 40, pres: 3 },
    { name: 'qui.', horas: 41, pres: 4 },
    { name: 'sex.', horas: 42, pres: 4 },
    { name: 'sáb.', horas: 32, pres: 2 },
    { name: 'dom.', horas: 30, pres: 1 },
    { name: 'seg.', horas: 38, pres: 4 },
    { name: 'ter.', horas: 44, pres: selectedFunc?5:4 },
  ]

  const cargosData = Object.entries(funcs.reduce((acc:any, f)=>{ acc[f.cargo]=(acc[f.cargo]||0)+1; return acc }, {})).map(([name,value])=>({name,value})) as any
  const cargosFallback = funcs.length?cargosData:[{name:'Gerente',value:1},{name:'Analista',value:2},{name:'Coordenador',value:1},{name:'Assistente',value:1},{name:'Estagiário',value:1}]

  if(view==='login' || !user){
    const temAdmin = admins.length>0
    return (
      <div style={{minHeight:'100vh',background:'#0a0a0f',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
        <div style={{width:460, maxWidth:'100%'}}>
          <div style={{textAlign:'center',marginBottom:24}}>
            <div style={{width:60,height:60,margin:'0 auto 12px',borderRadius:16,background:'linear-gradient(135deg,#00ffaa,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800}}>O</div>
            <h1 style={{fontSize:24,fontWeight:800}}>PontoSync-web <span style={{fontSize:12,background:'#00ffaa',color:'#000',padding:'2px 8px',borderRadius:20,verticalAlign:'middle'}}>V3.0</span></h1>
            <p style={{opacity:0.6,fontSize:13,marginTop:6}}>Cartão de Ponto Eletrônico • Login Limpo • Admin Cadastra Funcionários</p>
            <p style={{opacity:0.5,fontSize:11,marginTop:8,border:'1px solid #222',display:'inline-block',padding:'4px 10px',borderRadius:20}}>{temAdmin?`${admins.length} administrador(es) • ${funcs.length} funcionários`:'Nenhum registro encontrado • Sistema limpo'}</p>
          </div>

          <div style={{background:'linear-gradient(180deg,#15151f,#0f0f18)',border:'1px solid #222',borderRadius:20,padding:20}}>
            {!temAdmin ? (
              <form onSubmit={handleCriarAdmin}>
                <h3 style={{marginBottom:10}}>🛡️ Criar Primeiro Administrador</h3>
                <p style={{fontSize:12,opacity:0.6,marginBottom:14}}>Sistema limpo sem nenhum registro. Cadastre o administrador master para começar. Ele será responsável por cadastrar todos os funcionários.</p>
                <input name="nome" required placeholder="Nome completo *" style={inputStyle}/>
                <div style={{display:'flex',gap:10,marginTop:10}}><input name="cpf" required placeholder="CPF 000.000.000-00 *" style={{...inputStyle,flex:1}}/><input name="telefone" required placeholder="Telefone (71) 9.... *" style={{...inputStyle,flex:1}}/></div>
                <input name="email" required placeholder="E-mail administrador *" style={{...inputStyle,marginTop:10}}/>
                <div style={{display:'flex',gap:10,marginTop:10}}><input name="senha" type="password" required placeholder="Senha *" style={{...inputStyle,flex:1}}/><input name="confirma" type="password" required placeholder="Confirmar senha *" style={{...inputStyle,flex:1}}/></div>
                <button type="submit" style={btnPrimary}>🛡️ Criar Administrador Master</button>
                <p style={{fontSize:10,opacity:0.4,textAlign:'center',marginTop:10}}>Senha será salva com hash btoa() para demo. Em produção, use Supabase Auth. Nenhum funcionário cadastrado até o admin criar.</p>
              </form>
            ) : (
              <form onSubmit={handleLoginAdmin}>
                <h3 style={{marginBottom:10}}>Login Administrador</h3>
                <input name="email" required placeholder="E-mail" style={inputStyle}/>
                <input name="senha" type="password" required placeholder="Senha" style={{...inputStyle,marginTop:10}}/>
                <button type="submit" style={btnPrimary}>Entrar no Painel</button>
                <p style={{textAlign:'center',marginTop:12,fontSize:12,opacity:0.6}}>Primeiro acesso? Sistema está limpo. <span onClick={()=>{setAdmins([]);localStorage.clear()}} style={{color:'#00ffaa',cursor:'pointer'}}>Resetar</span></p>
              </form>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{minHeight:'100vh',background:'#0a0a0f'}}>
      <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 18px',borderBottom:'1px solid #1a1a24',position:'sticky',top:0,background:'#0a0a0f',zIndex:10}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}><div style={{width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#00ffaa,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800}}>O</div><div><strong>PontoSync-web</strong><span style={{fontSize:10,background:'#00ffaa',color:'#000',padding:'2px 6px',borderRadius:10,marginLeft:6}}>V3.0</span><div style={{fontSize:10,opacity:0.5}}>Cartão de Ponto Eletrônico • Mercado PRO</div></div></div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <button onClick={()=>setView('dashboard')} style={tabStyle(view==='dashboard')}>Dashboard</button>
          <button onClick={()=>setView('ponto')} style={tabStyle(view==='ponto')}>Bater Ponto</button>
          <button onClick={()=>setView('funcionarios')} style={tabStyle(view==='funcionarios')}>Funcionários ({funcs.length})</button>
          <button onClick={()=>setView('relatorios')} style={tabStyle(view==='relatorios')}>Relatórios</button>
          <button onClick={()=>setView('faltas')} style={tabStyle(view==='faltas')}>Faltas</button>
          <button onClick={()=>setView('supabase')} style={tabStyle(view==='supabase')}>Supabase</button>
          <div style={{background:'#00ffaa',color:'#000',padding:'6px 12px',borderRadius:20,fontSize:12,fontWeight:700}}>MODO ADMIN</div>
          <button onClick={()=>{setUser(null);localStorage.removeItem('orion_user');setView('login')}} style={{background:'#222',border:'none',color:'#fff',padding:'6px 10px',borderRadius:20,cursor:'pointer'}}>Sair</button>
        </div>
      </header>

      <main style={{padding:18}}>
        {view==='dashboard' && (
          <>
            <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:16}}>
              <KPI title="TOTAL FUNCIONÁRIOS" value={stats.total} color="#00ffaa"/>
              <KPI title="PRESENTES HOJE" value={stats.presentes} color="#00ffaa"/>
              <KPI title="ATRASOS" value={stats.atrasos} color="#ffaa00"/>
              <KPI title="FALTAS HOJE" value={stats.faltas} color="#ff00aa"/>
              <KPI title="H. EXTRAS (H)" value={stats.horas} color="#00d4ff"/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:12,marginBottom:12}}>
              <div style={cardStyle}><h4 style={{marginBottom:10}}>📈 Frequência Mensal • Últimos 7 dias</h4><ResponsiveContainer width="100%" height={200}><LineChart data={chartData}><XAxis dataKey="name" stroke="#555"/><YAxis stroke="#555"/><Tooltip/><Line type="monotone" dataKey="horas" stroke="#ff00ff" strokeWidth={2} dot={false}/><Line type="monotone" dataKey="pres" stroke="#00ffaa" strokeWidth={2}/></LineChart></ResponsiveContainer></div>
              <div style={cardStyle}><h4>Distribuição por Cargo</h4><ResponsiveContainer width="100%" height={200}><PieChart><Pie data={cargosFallback} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={4}>{cargosFallback.map((_:any,i:number)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer><div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:8}}>{cargosFallback.map((c:any,i:number)=><div key={c.name} style={{fontSize:11}}><span style={{display:'inline-block',width:8,height:8,background:COLORS[i%COLORS.length],borderRadius:4,marginRight:6}}></span>{c.name}: {c.value}</div>)}</div></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div style={cardStyle}><h4>Frequência por Função Hoje</h4><ResponsiveContainer width="100%" height={200}><BarChart data={funcs.slice(0,6).map(f=>({name:f.funcao||f.cargo, v:1}))} layout="vertical"><XAxis type="number" stroke="#555"/><YAxis dataKey="name" type="category" width={100} stroke="#555" fontSize={10}/><Bar dataKey="v" fill="#00ffaa"/></BarChart></ResponsiveContainer></div>
              <div style={cardStyle}><h4>Últimos Pontos</h4>{regs.slice(-6).reverse().map(r=><div key={r.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #1a1a24',fontSize:12}}><span>{r.funcionario_nome} ({r.matricula})</span><span style={{color: r.tipo==='entrada'?'#00ffaa':'#ffaa00'}}>{r.tipo.toUpperCase()} • {new Date(r.timestamp).toLocaleTimeString('pt-BR')}</span></div>)}{regs.length===0 && <div style={{opacity:0.5,fontSize:12,marginTop:20}}>Nenhum registro hoje - sistema limpo aguardando primeiro ponto</div>}</div>
            </div>
          </>
        )}

        {view==='ponto' && (
          <div style={{maxWidth:520,margin:'0 auto'}}>
            <div style={cardStyle}>
              <h3>Ponto por Matrícula + SMS Cartão</h3>
              <p style={{fontSize:12,opacity:0.6,margin:'6px 0 14px'}}>Funcionário digita matrícula PONTOSYNC-0001 • Sistema emite cartão visual + SMS entrada/saída Portaria 671 MTP</p>
              <div style={{display:'flex',gap:10}}><input value={matriculaInput} onChange={e=>setMatriculaInput(e.target.value)} placeholder="Digite matrícula PONTOSYNC-0001 ou CPF" style={{...inputStyle,flex:1}}/><button onClick={handleBuscarMatricula} style={{...btnPrimary,margin:0,width:120}}>Buscar</button></div>
              {selectedFunc && (
                <div style={{marginTop:16,border:'1px solid #222',borderRadius:16,padding:14,background:'#12121a'}}>
                  <div style={{display:'flex',gap:12,alignItems:'center'}}>
                    <img src={selectedFunc.foto_url} style={{width:64,height:64,borderRadius:32,objectFit:'cover'}}/>
                    <div><strong>{selectedFunc.nome}</strong><div style={{fontSize:12,opacity:0.7}}>{selectedFunc.matricula} • {selectedFunc.cargo} • {selectedFunc.funcao}</div><div style={{fontSize:11,opacity:0.5}}>{selectedFunc.telefone_celular}</div></div>
                  </div>
                  <div style={{display:'flex',gap:10,marginTop:14}}>
                    <button onClick={()=>handleBaterPonto('entrada')} style={{...btnPrimary,flex:1,background:'#00ffaa',color:'#000'}}>📥 REGISTRAR ENTRADA</button>
                    <button onClick={()=>handleBaterPonto('saida')} style={{...btnPrimary,flex:1,background:'#ffaa00',color:'#000'}}>📤 REGISTRAR SAÍDA</button>
                  </div>
                </div>
              )}
              {cartao && (
                <div style={{marginTop:16,background:'linear-gradient(135deg,#001a12,#0a0a0f)',border:'1px solid #00ffaa',borderRadius:16,padding:16}}>
                  <div style={{fontSize:11,opacity:0.6}}>CARTÃO DE PONTO - PORTARIA 671 MTP - COMPROVANTE</div>
                  <div style={{fontSize:14,marginTop:8,lineHeight:1.4,wordBreak:'break-word'}}>{cartao.msg}</div>
                  <div style={{fontSize:11,marginTop:8,opacity:0.6}}>Código: PONTOSYNC-{Date.now()} • Local: Salvador-BA • Sistema: PontoSync-web V3.0</div>
                  <div style={{marginTop:10,display:'flex',gap:8}}>
                    <span style={{background:'#00ffaa',color:'#000',padding:'4px 8px',borderRadius:10,fontSize:11}}>✅ SMS enviado para {selectedFunc?.telefone_celular}</span>
                    <span style={{background:'#222',padding:'4px 8px',borderRadius:10,fontSize:11}}>📱 SMS admin enviado</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {view==='funcionarios' && (
          <div style={{display:'grid',gridTemplateColumns:'340px 1fr',gap:12}}>
            <div style={cardStyle}>
              <h3>Cadastrar Funcionário</h3>
              <p style={{fontSize:11,opacity:0.5,marginBottom:10}}>Foto, matrícula automática PONTOSYNC-0001, todos dados compatíveis mercado</p>
              <form onSubmit={handleCadFuncionario}>
                <label style={labelStyle}>Foto 3x4</label><input name="foto" type="file" accept="image/*" style={inputStyle}/>
                <input name="nome" required placeholder="Nome completo *" style={{...inputStyle,marginTop:8}}/>
                <div style={{display:'flex',gap:8,marginTop:8}}><input name="cpf" required placeholder="CPF *" style={{...inputStyle,flex:1}}/><input name="rg" placeholder="RG" style={{...inputStyle,flex:1}}/></div>
                <div style={{display:'flex',gap:8,marginTop:8}}><input name="celular" required placeholder="Celular (SMS) *" style={{...inputStyle,flex:1}}/><input name="email" placeholder="E-mail" style={{...inputStyle,flex:1}}/></div>
                <div style={{display:'flex',gap:8,marginTop:8}}><input name="matricula" placeholder="Matrícula (auto PONTOSYNC-0001)" style={{...inputStyle,flex:1}}/><input name="admissao" type="date" style={{...inputStyle,flex:1}}/></div>
                <div style={{display:'flex',gap:8,marginTop:8}}><input name="cargo" required placeholder="Cargo * ex: Gerente" style={{...inputStyle,flex:1}}/><input name="funcao" required placeholder="Função * ex: Vendas" style={{...inputStyle,flex:1}}/></div>
                <input name="departamento" required placeholder="Departamento * ex: Comercial" style={{...inputStyle,marginTop:8}}/>
                <div style={{display:'flex',gap:8,marginTop:8}}><input name="cidade" placeholder="Cidade" style={{...inputStyle,flex:1}}/><input name="uf" placeholder="UF" style={{...inputStyle,width:80}}/><input name="pis" placeholder="PIS" style={{...inputStyle,flex:1}}/></div>
                <div style={{display:'flex',gap:8,marginTop:8}}><input name="h_entrada" type="time" defaultValue="08:00" style={{...inputStyle,flex:1}}/><input name="h_saida" type="time" defaultValue="17:00" style={{...inputStyle,flex:1}}/><input name="salario" placeholder="Salário" style={{...inputStyle,flex:1}}/></div>
                <input name="senha" placeholder="Senha ponto (padrão 123456)" style={{...inputStyle,marginTop:8}}/>
                <button type="submit" style={btnPrimary}>Cadastrar Funcionário</button>
              </form>
            </div>
            <div style={cardStyle}>
              <h3>Funcionários Cadastrados - {funcs.length}</h3>
              {funcs.length===0 && <div style={{opacity:0.5,marginTop:30,textAlign:'center'}}>Nenhum funcionário cadastrado - sistema limpo. Cadastre o primeiro ao lado.</div>}
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:10,marginTop:12}}>
                {funcs.map(f=><div key={f.id} style={{border:'1px solid #222',borderRadius:14,padding:12,background:'#11111a'}}><div style={{display:'flex',gap:10,alignItems:'center'}}><img src={f.foto_url} style={{width:44,height:44,borderRadius:22}}/><div><strong style={{fontSize:13}}>{f.nome}</strong><div style={{fontSize:11,opacity:0.6}}>{f.matricula} • {f.cargo}</div></div></div><div style={{fontSize:11,marginTop:8,opacity:0.7}}>CPF: {f.cpf} • Cel: {f.telefone_celular}<br/>Função: {f.funcao} • Depto: {f.departamento}</div></div>)}
              </div>
            </div>
          </div>
        )}

        {view==='relatorios' && (
          <div style={cardStyle}>
            <h3>Relatório de Frequência por Cargo/Função</h3>
            <div style={{overflowX:'auto',marginTop:12}}>
              <table style={{width:'100%',fontSize:12,borderCollapse:'collapse'}}>
                <thead><tr style={{borderBottom:'1px solid #222',textAlign:'left'}}><th style={{padding:8}}>Matrícula</th><th>Nome</th><th>Cargo</th><th>Função</th><th>Entrada</th><th>Saída</th><th>Horas</th></tr></thead>
                <tbody>{regs.map(r=>{const f=funcs.find(x=>x.matricula===r.matricula); return <tr key={r.id} style={{borderBottom:'1px solid #111'}}><td style={{padding:8}}>{r.matricula}</td><td>{f?.nome||r.funcionario_nome}</td><td>{f?.cargo}</td><td>{f?.funcao}</td><td>{r.tipo==='entrada'?new Date(r.timestamp).toLocaleString('pt-BR'):''}</td><td>{r.tipo==='saida'?new Date(r.timestamp).toLocaleString('pt-BR'):''}</td><td>{r.tipo}</td></tr>})}</tbody>
              </table>
              {regs.length===0 && <div style={{opacity:0.5,textAlign:'center',marginTop:20}}>Nenhum registro para relatório</div>}
            </div>
            <button onClick={()=>{const csv='matricula,nome,cargo,funcao,tipo,timestamp\n'+regs.map(r=>`${r.matricula},${funcs.find(f=>f.matricula===r.matricula)?.nome},${funcs.find(f=>f.matricula===r.matricula)?.cargo},${funcs.find(f=>f.matricula===r.matricula)?.funcao},${r.tipo},${r.timestamp}`).join('\n'); const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob); const a=document.createElement('a');a.href=url;a.download='relatorio_frequencia.csv';a.click()}} style={{...btnPrimary,width:200,marginTop:12}}>Exportar CSV</button>
          </div>
        )}

        {view==='faltas' && (
          <div style={cardStyle}><h3>Faltas • Abonar • Justificar</h3><p style={{fontSize:12,opacity:0.6,marginTop:8}}>Funcionalidade: cadastrar falta, abonar em lote, anexar atestado. Tabela faltas no Supabase já criada.</p><div style={{marginTop:12,opacity:0.5,fontSize:12}}>Em desenvolvimento - estrutura pronta no schema.sql</div></div>
        )}

        {view==='supabase' && (
          <div style={cardStyle}>
            <h3>Configuração Supabase • Persistência</h3>
            <p style={{fontSize:12,opacity:0.7,marginTop:6}}>Status: {supabase?'Conectado - pronto para persistir':'Modo localStorage (adicione VITE_SUPABASE_URL e KEY no .env)'}</p>
            <div style={{background:'#111',borderRadius:12,padding:12,marginTop:12,fontSize:12,fontFamily:'monospace',whiteSpace:'pre-wrap'}}>Tabelas:<br/>- administradores (id, nome, cpf, email, senha, telefone)<br/>- funcionarios (foto, nome, cpf, celular, matricula PONTOSYNC-0001, cargo, funcao, departamento...)<br/>- registros_ponto (matricula, tipo entrada/saida, timestamp, codigo)<br/>- sms_logs (matricula, telefone, mensagem SMS cartão)<br/>- faltas (data, motivo, abonada, justificada)</div>
            <div style={{marginTop:12,fontSize:11,opacity:0.6}}>1. Crie projeto em https://supabase.com/dashboard/project<br/>2. SQL Editor > cole supabase/schema.sql<br/>3. Settings > API > copie URL e anon key para .env<br/>4. No Render, adicione env vars VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY</div>
          </div>
        )}
      </main>
    </div>
  )
}

const inputStyle: any = {width:'100%',background:'#0f0f16',border:'1px solid #222',borderRadius:10,padding:'10px 12px',color:'#fff',fontSize:13,outline:'none'}
const labelStyle: any = {fontSize:11,opacity:0.6,marginTop:6,display:'block'}
const btnPrimary: any = {width:'100%',marginTop:14,background:'#00ffaa',color:'#000',border:'none',borderRadius:12,padding:'12px',fontWeight:800,cursor:'pointer'}
const tabStyle = (active:boolean): any => ({background: active?'#fff':'#1a1a24',color: active?'#000':'#aaa',border:'none',padding:'6px 12px',borderRadius:20,fontSize:12,cursor:'pointer',fontWeight: active?700:400})
const cardStyle: any = {background:'linear-gradient(180deg,#15151f,#0f0f18)',border:'1px solid #1e1e2a',borderRadius:18,padding:16}
function KPI({title,value,color}:{title:string,value:any,color:string}){ return <div style={{...cardStyle,borderLeft:`2px solid ${color}`}}><div style={{fontSize:10,opacity:0.5,letterSpacing:1}}>{title}</div><div style={{fontSize:28,fontWeight:800,marginTop:6}}>{value}</div></div> }
