// Fabrica das APIs: decide se o app usa as APIs REAIS (fetch) ou as FALSAS (em memoria).
// A escolha vem de EXPO_PUBLIC_USE_FAKE_API (ver docs/adr/0004). As telas pedem "auth" aqui e
// nao sabem qual das duas recebem, porque as duas seguem o mesmo contrato (types.ts).

import { criarClienteHttp } from './cliente-http';
import { criarAssistenteApiFalsa } from './fake/assistente-api-falsa';
import { criarAuthApiFalsa } from './fake/auth-api-falsa';
import { criarContatosApiFalsa } from './fake/contatos-api-falsa';
import { criarFotosApiFalsa } from './fake/fotos-api-falsa';
import { criarPerfisApiFalsa } from './fake/perfis-api-falsa';
import { criarReportesApiFalsa } from './fake/reportes-api-falsa';
import { criarAssistenteApiReal } from './real/assistente-api-real';
import { criarAuthApiReal } from './real/auth-api-real';
import { criarContatosApiReal } from './real/contatos-api-real';
import { criarFotosApiReal } from './real/fotos-api-real';
import { criarPerfisApiReal } from './real/perfis-api-real';
import { criarReportesApiReal } from './real/reportes-api-real';
import type {
  AssistenteApi,
  AuthApi,
  ContatosApi,
  FotosApi,
  PerfisApi,
  ReportesApi,
} from './types';

export interface OpcoesFabrica {
  /** true = API falsa em memoria; false = API real. */
  usarApiFalsa: boolean;
  /** Endereco da API Java, ex.: "http://localhost:8080". */
  urlJava: string;
  /** Endereco da API .NET (reportes e fotos), ex.: "http://localhost:5080". */
  urlDotnet: string;
  /** Devolve o token da sessao atual (ou null). Usado so pela API real. */
  obterToken?: () => string | null;
  /** Chamado quando a API real responde 401 a uma chamada com token (sessao vencida). */
  aoNaoAutorizado?: () => void;
  /** Troca do fetch, usada nos testes. */
  fetchImpl?: typeof fetch;
}

export interface Apis {
  auth: AuthApi;
  reportes: ReportesApi;
  fotos: FotosApi;
  perfis: PerfisApi;
  contatos: ContatosApi;
  assistente: AssistenteApi;
}

export function criarApis({
  usarApiFalsa,
  urlJava,
  urlDotnet,
  obterToken,
  aoNaoAutorizado,
  fetchImpl,
}: OpcoesFabrica): Apis {
  if (usarApiFalsa) {
    // As APIs falsas de reportes, fotos e contatos descobrem o dono de cada pedido pelo token, usando a
    // memoria da autenticacao falsa (a mesma instancia, para os tokens baterem).
    const auth = criarAuthApiFalsa();
    const sessaoDasFalsas = {
      obterToken: obterToken ?? (() => null),
      idDoToken: auth.idDoToken,
      aoNaoAutorizado,
    };
    // Como no Java, os contatos ficam dentro do perfil: a pessoa comeca sem perfil e sem contatos.
    const perfis = criarPerfisApiFalsa(sessaoDasFalsas);
    return {
      auth,
      reportes: criarReportesApiFalsa(sessaoDasFalsas),
      fotos: criarFotosApiFalsa(sessaoDasFalsas),
      perfis,
      contatos: criarContatosApiFalsa({
        ...sessaoDasFalsas,
        temPerfil: perfis.temPerfil,
        contatosIniciais: [],
      }),
      assistente: criarAssistenteApiFalsa(sessaoDasFalsas),
    };
  }
  // Dois servidores, duas URLs, mesma sessao: o token do login (Java) vale tambem no .NET.
  const clienteJava = criarClienteHttp({
    baseUrl: urlJava,
    obterToken,
    aoNaoAutorizado,
    fetchImpl,
  });
  const clienteDotnet = criarClienteHttp({
    baseUrl: urlDotnet,
    obterToken,
    aoNaoAutorizado,
    fetchImpl,
  });
  return {
    auth: criarAuthApiReal(clienteJava),
    reportes: criarReportesApiReal(clienteDotnet, urlDotnet),
    fotos: criarFotosApiReal(clienteDotnet, urlDotnet),
    perfis: criarPerfisApiReal(clienteJava),
    contatos: criarContatosApiReal(clienteJava),
    assistente: criarAssistenteApiReal(clienteJava),
  };
}

/**
 * Interpreta o valor de EXPO_PUBLIC_USE_FAKE_API. Seguro por padrao: so o texto exato "true"
 * liga a API falsa; variavel ausente ou com erro de digitacao cai na API real.
 */
export function usarApiFalsaDoAmbiente(valor: string | undefined): boolean {
  return valor === 'true';
}
