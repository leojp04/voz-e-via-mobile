// API de contatos REAL: fala com a API Java pelo cliente HTTP (docs/adr/0002).
// Implementa o mesmo contrato ContatosApi da API falsa, entao as telas nao percebem a troca.
// Caminhos conforme o plano unico (secao 8.1).

import type { ClienteHttp } from '../cliente-http';
import type { Contato, ContatosApi, Pagina } from '../types';

export function criarContatosApiReal(cliente: ClienteHttp): ContatosApi {
  return {
    // O Spring (Pageable) conta as paginas a partir de 0 e o app, a partir de 1. A conversao
    // fica so aqui, para as telas nunca precisarem saber disso.
    async listar(pagina, tamanho) {
      const resultado = await cliente.get<Pagina<Contato>>(
        `/api/contatos?page=${pagina - 1}&size=${tamanho}`,
      );
      return { ...resultado, pagina: resultado.pagina + 1 };
    },

    obter: (id) => cliente.get<Contato>(`/api/contatos/${id}`),

    criar: (dados) => cliente.post<Contato>('/api/contatos', dados),

    editar: (id, dados) => cliente.put<Contato>(`/api/contatos/${id}`, dados),

    excluir: (id) => cliente.delete<void>(`/api/contatos/${id}`),
  };
}
