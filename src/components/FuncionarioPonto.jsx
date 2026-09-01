 import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { enviarSMS, formatarReciboPonto, verificarFerias } from '../lib/sms';
import { buscarBancoHoras, atualizarBancoHoras, calcularSaldoAcumulado } from '../lib/bancoHoras';
import toast from 'react-hot-toast';

const FuncionarioPonto = () => {
  const [matricula, setMatricula] = useState('');
  const [funcionario, setFuncionario] = useState(null);
  const [loading, setLoading] = useState(false);
  const [registroAtual, setRegistroAtual] = useState(null);
  const [localizacao, setLocalizacao] = useState(null);
  const [infoFerias, setInfoFerias] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [bancoHoras, setBancoHoras] = useState(null);
  const [saldoAcumulado, setSaldoAcumulado] = useState(0);

  const HORARIO_INICIO = 6;
  const HORARIO_FIM = 20;

  const verificarHorarioPermitido = () => {
    const agora = new Date();
    const hora = agora.getHours();
    return hora >= HORARIO_INICIO && hora < HORARIO_FIM;
  };

  const buscarAdmin = async () => {
    try {
      const { data, error } = await supabase
        .from('administradores')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1);

      if (error) throw error;
      if (data && data.length > 0) setAdmin(data[0]);
    } catch (error) {
      console.error('❌ Erro ao buscar admin:', error);
    }
  };

  useEffect(() => {
    buscarAdmin();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocalizacao({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.log('Geolocalização não autorizada')
      );
    }
  }, []);

  const buscarFuncionario = async () => {
    if (!matricula.trim()) {
      toast.error('Digite a matrícula');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('funcionarios')
        .select('*')
        .eq('matricula', matricula)
        .single();

      if (error || !data) {
        toast.error('Funcionário não encontrado');
        setFuncionario(null);
        return;
      }

      setFuncionario(data);

      const ferias = verificarFerias(data);
      setInfoFerias(ferias);

      const banco = await buscarBancoHoras(data.id);
      setBancoHoras(banco);

      const saldo = await calcularSaldoAcumulado(data.id);
      setSaldoAcumulado(saldo);

      const hoje = new Date().toISOString().split('T')[0];
      const { data: registros } = await supabase
        .from('registros_ponto')
        .select('*')
        .eq('funcionario_id', data.id)
        .gte('timestamp', hoje)
        .order('timestamp', { ascending: false });

      if (registros && registros.length > 0) {
        setRegistroAtual(registros[0]);
      }

      toast.success(`Bem-vindo, ${data.nome}!`);
    } catch (error) {
      toast.error('Erro ao buscar funcionário');
    } finally {
      setLoading(false);
    }
  };

  const registrarPonto = async (tipo) => {
    if (!funcionario) {
      toast.error('Funcionário não identificado');
      return;
    }

    if (!verificarHorarioPermitido()) {
      toast.error(`⏰ Ponto permitido apenas das 06:00 às 20:00.`);
      return;
    }

    if (infoFerias?.emFerias) {
      toast.error(`🚫 Funcionário em férias até ${new Date(infoFerias.fim).toLocaleDateString('pt-BR')}`);
      return;
    }

    const hoje = new Date().toISOString().split('T')[0];
    const { data: registros } = await supabase
      .from('registros_ponto')
      .select('*')
      .eq('funcionario_id', funcionario.id)
      .gte
