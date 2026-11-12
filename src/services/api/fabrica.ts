// Fabrica das APIs: decide se o app usa as APIs REAIS (fetch) ou as FALSAS (em memoria).
// A escolha vem de EXPO_PUBLIC_USE_FAKE_API (ver docs/adr/0004). As telas pedem "auth" aqui e
// nao sabem qual das duas recebem, porque as duas seguem o mesmo contrato (types.ts).

import { criarClienteHttp } from './cliente-http';
import { criarAuthApiFalsa } from './fake/auth-api-falsa';
import { criarAuthApiReal } from './real/auth-api-real';
import type { AuthApi } from './types';

export interface OpcoesFabrica {
  /** true = API falsa em memoria; false = API real. */
  usarApiFalsa: boolean;
  /** Endereco da API Java, ex.: "http://localhost:8080". */
  urlJava: string;
  /** Devolve o token da sessao atual (ou null). Usado so pela API real. */
  obterToken?: () => string | null;
  /** Chamado quando a API real responde 401 a uma chamada com token (sessao vencida). */
  aoNaoAutorizado?: () => void;
  /** Troca do fetch, usada nos testes. */
  fetchImpl?: typeof fetch;
}

export interface Apis {
  auth: AuthApi;
}

export function criarApis({
  usarApiFalsa,
  urlJava,
  obterToken,
  aoNaoAutorizado,
  fetchImpl,
}: OpcoesFabrica): Apis {
  if (usarApiFalsa) {
    return { auth: criarAuthApiFalsa() };
  }
  const clienteJava = criarClienteHttp({
    baseUrl: urlJava,
    obterToken,
    aoNaoAutorizado,
    fetchImpl,
  });
  return { auth: criarAuthApiReal(clienteJava) };
}

/**
 * Interpreta o valor de EXPO_PUBLIC_USE_FAKE_API. Seguro por padrao: so o texto exato "true"
 * liga a API falsa; variavel ausente ou com erro de digitacao cai na API real.
 */
export function usarApiFalsaDoAmbiente(valor: string | undefined): boolean {
  return valor === 'true';
}
