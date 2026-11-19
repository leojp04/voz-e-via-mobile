// API de atendimentos REAL: busca direta dos locais mais perto na API Java (AtendimentoController),
// sem passar pela voz. Devolve o mesmo AtendimentosProximos que o assistente ja mostra.

import type { ClienteHttp } from '../cliente-http';
import type { AtendimentosApi, AtendimentosProximos } from '../types';

// Mesmo numero de locais que o assistente traz (IntencaoVozService.ATENDIMENTOS_NA_RESPOSTA).
const LIMITE = 3;

export function criarAtendimentosApiReal(cliente: ClienteHttp): AtendimentosApi {
  return {
    proximos: ({ tipo, latitude, longitude, acessivel }) =>
      cliente.get<AtendimentosProximos>(
        `/api/v1/atendimentos/proximos?tipo=${tipo}&latitude=${latitude}&longitude=${longitude}` +
          `&acessivel=${acessivel}&limite=${LIMITE}`,
      ),
  };
}
