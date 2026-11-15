// Traduz a pagina da API Java para a Pagina do app (docs/adr/0002: so os adaptadores conhecem a API).
// Formato conferido na API Java rodando (PaginaResponse): { conteudo, pagina, tamanho,
// totalElementos, totalPaginas, ultima }, com a primeira pagina sendo a 0 (Spring).
// O app usa { itens, pagina, tamanho, total } e conta a partir de 1, como a API .NET.

import type { Pagina } from '../types';

export interface PaginaDoJava<T> {
  conteudo: T[];
  /** Conta a partir de 0. */
  pagina: number;
  tamanho: number;
  totalElementos: number;
  totalPaginas: number;
  ultima: boolean;
}

export function paraPagina<T>(pagina: PaginaDoJava<T>): Pagina<T> {
  return {
    itens: pagina.conteudo,
    pagina: pagina.pagina + 1,
    tamanho: pagina.tamanho,
    total: pagina.totalElementos,
  };
}
