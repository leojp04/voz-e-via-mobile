// API de perfil de emergencia REAL: fala com a API Java pelo cliente HTTP (docs/adr/0002).
// Implementa o mesmo contrato PerfisApi da API falsa, entao as telas nao percebem a troca.
//
// Contrato conferido no codigo do Java (PerfilEmergenciaController) e ao vivo em 16/11/2026:
//  - GET  /api/v1/perfis-emergencia/meu   (so CIDADAO; 404 se ainda nao existe perfil);
//  - POST /api/v1/perfis-emergencia       (o cidadao NAO manda cidadaoEmail: vale o dono do token);
//  - PUT  /api/v1/perfis-emergencia/{id}  (o cidadao dono ou o cuidador responsavel).

import type { ClienteHttp } from '../cliente-http';
import { ErroApi } from '../erro';
import type { PerfilEmergencia, PerfisApi } from '../types';

export function criarPerfisApiReal(cliente: ClienteHttp): PerfisApi {
  return {
    async meu() {
      try {
        return await cliente.get<PerfilEmergencia>('/api/v1/perfis-emergencia/meu');
      } catch (erro) {
        // 404 nao e falha: a pessoa ainda nao criou o perfil.
        if (erro instanceof ErroApi && erro.status === 404) return null;
        throw erro;
      }
    },

    criar(dados) {
      return cliente.post<PerfilEmergencia>('/api/v1/perfis-emergencia', dados);
    },

    atualizar(id, dados) {
      return cliente.put<PerfilEmergencia>(`/api/v1/perfis-emergencia/${id}`, dados);
    },
  };
}
