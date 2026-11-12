// Cliente HTTP do app, feito com o "fetch" que ja vem no React Native (ver docs/adr/0002).
// Ele acrescenta o token, converte a resposta em JSON e padroniza todo erro como ErroApi.
// As telas e as APIs reais so conhecem este cliente, nunca o fetch direto.

import { ErroApi } from './erro';

export interface OpcoesClienteHttp {
  /** Endereco base da API, ex.: "http://localhost:8080". */
  baseUrl: string;
  /** Devolve o token atual (ou null sem sessao). Lido a cada requisicao. */
  obterToken?: () => string | null;
  /** Chamado quando uma requisicao COM token recebe 401 (sessao vencida): o app volta ao login. */
  aoNaoAutorizado?: () => void;
  /** Troca do fetch, usada nos testes. */
  fetchImpl?: typeof fetch;
}

/** Opcoes de uma chamada especifica. */
export interface OpcoesChamada {
  /** Token desta chamada; tem prioridade sobre o "obterToken" do cliente. */
  token?: string;
}

export interface ClienteHttp {
  get<T>(caminho: string, opcoes?: OpcoesChamada): Promise<T>;
  post<T>(caminho: string, corpo?: unknown, opcoes?: OpcoesChamada): Promise<T>;
  delete<T>(caminho: string, opcoes?: OpcoesChamada): Promise<T>;
}

const MENSAGEM_SEM_CONEXAO = 'Sem conexão. Verifique a internet e tente de novo.';
const MENSAGEM_ERRO_SERVIDOR = 'Algo deu errado no servidor. Tente de novo.';
const MENSAGEM_ERRO_GENERICA = 'Não foi possível concluir a operação. Tente de novo.';

function mensagemPadrao(status: number): string {
  return status >= 500 ? MENSAGEM_ERRO_SERVIDOR : MENSAGEM_ERRO_GENERICA;
}

// Le o corpo como texto e tenta converter em JSON; corpo vazio ou nao-JSON vira undefined.
async function lerCorpo(resposta: Response): Promise<unknown> {
  const texto = await resposta.text();
  if (!texto) return undefined;
  try {
    return JSON.parse(texto);
  } catch {
    return undefined;
  }
}

// Formato de erro do Java: { timestamp, status, erro, mensagem, campos: [{ campo, mensagem }] }.
function converterErro(status: number, corpo: unknown): ErroApi {
  const dados = (corpo && typeof corpo === 'object' ? corpo : {}) as {
    mensagem?: unknown;
    campos?: unknown;
  };
  const mensagem =
    typeof dados.mensagem === 'string' && dados.mensagem ? dados.mensagem : mensagemPadrao(status);
  const campos: Record<string, string> = {};
  if (Array.isArray(dados.campos)) {
    for (const item of dados.campos) {
      if (item && typeof item.campo === 'string' && typeof item.mensagem === 'string') {
        campos[item.campo] = item.mensagem;
      }
    }
  }
  return new ErroApi(status, mensagem, campos);
}

export function criarClienteHttp({
  baseUrl,
  obterToken,
  aoNaoAutorizado,
  fetchImpl = fetch,
}: OpcoesClienteHttp): ClienteHttp {
  const base = baseUrl.replace(/\/+$/, '');

  async function requisitar<T>(
    metodo: string,
    caminho: string,
    corpo?: unknown,
    opcoes?: OpcoesChamada,
  ): Promise<T> {
    const token = opcoes?.token ?? obterToken?.() ?? null;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (corpo !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;

    let resposta: Response;
    try {
      resposta = await fetchImpl(`${base}${caminho}`, {
        method: metodo,
        headers,
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
      });
    } catch {
      throw new ErroApi(0, MENSAGEM_SEM_CONEXAO);
    }

    const dados = await lerCorpo(resposta);
    if (!resposta.ok) {
      if (resposta.status === 401 && token) aoNaoAutorizado?.();
      throw converterErro(resposta.status, dados);
    }
    return dados as T;
  }

  return {
    get: (caminho, opcoes) => requisitar('GET', caminho, undefined, opcoes),
    post: (caminho, corpo, opcoes) => requisitar('POST', caminho, corpo, opcoes),
    delete: (caminho, opcoes) => requisitar('DELETE', caminho, undefined, opcoes),
  };
}
