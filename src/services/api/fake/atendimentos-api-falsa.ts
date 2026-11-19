// API de atendimentos FALSA (docs/adr/0004): devolve os mesmos locais de exemplo que o assistente
// falso, perto do ponto pedido.

import type { AtendimentosApi } from '../types';
import { montarAtendimentos } from './assistente-api-falsa';

export function criarAtendimentosApiFalsa(): AtendimentosApi {
  return {
    proximos: async ({ tipo, latitude, longitude }) =>
      montarAtendimentos(tipo, latitude, longitude),
  };
}
