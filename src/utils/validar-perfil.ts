// Validacao do perfil de emergencia. Tudo e opcional; so ha o limite de 500 caracteres por texto
// (PerfilEmergenciaRequest do Java). Devolve as mensagens por campo; objeto vazio = tudo certo.
// Dado de saude: a mensagem nunca repete o que a pessoa digitou.

import type { DadosPerfil } from '../services/api/types';

const LIMITE = 500;

export function validarPerfil(dados: DadosPerfil): Record<string, string> {
  const campos: Record<string, string> = {};
  const textos = {
    condicoesSaude: dados.condicoesSaude,
    medicamentos: dados.medicamentos,
    observacoes: dados.observacoes,
  };
  for (const [campo, texto] of Object.entries(textos)) {
    if (texto !== null && texto.length > LIMITE) campos[campo] = 'Use até 500 letras neste campo.';
  }
  return campos;
}
