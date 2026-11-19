// Cliente HTTP do app, feito com o "fetch" que ja vem no React Native (ver docs/adr/0002).
// Ele acrescenta o token, converte a resposta em JSON e padroniza todo erro como ErroApi.
// As telas e as APIs reais so conhecem este cliente, nunca o fetch direto.

import { File } from 'expo-file-system';

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
  /**
   * Tempo maximo de uma chamada, em ms. Sem limite, uma API travada deixa a tela "carregando" para
   * sempre. O padrao cobre a primeira chamada depois de um deploy (cerca de 15 s) e a IA (ate 30 s).
   */
  tempoLimiteMs?: number;
}

/** Opcoes de uma chamada especifica. */
export interface OpcoesChamada {
  /** Token desta chamada; tem prioridade sobre o "obterToken" do cliente. */
  token?: string;
  /** Cabecalhos extras desta chamada, ex.: o "Idempotency-Key" do POST /api/reportes. */
  cabecalhos?: Record<string, string>;
  /**
   * Um 401 desta chamada NAO e "sessao vencida": o erro sobe normalmente, mas o app nao sai.
   * Usado na exclusao de conta, onde o .NET responde 401 a quem ja foi excluido e o app precisa
   * seguir para excluir a conta no Java em vez de deslogar no meio do caminho.
   */
  naoDeslogarEm401?: boolean;
}

/** Arquivo do aparelho (ex.: foto) a ser enviado como multipart. */
export interface ArquivoParaEnvio {
  /** Endereco local do arquivo, ex.: "file:///.../foto.jpg". */
  uri: string;
  nome: string;
  /** Tipo MIME, ex.: "image/jpeg". */
  tipo: string;
}

export interface ClienteHttp {
  get<T>(caminho: string, opcoes?: OpcoesChamada): Promise<T>;
  post<T>(caminho: string, corpo?: unknown, opcoes?: OpcoesChamada): Promise<T>;
  put<T>(caminho: string, corpo?: unknown, opcoes?: OpcoesChamada): Promise<T>;
  delete<T>(caminho: string, opcoes?: OpcoesChamada): Promise<T>;
  /** POST multipart com um arquivo no campo "arquivo" (upload da foto do reporte). */
  enviarArquivo<T>(caminho: string, arquivo: ArquivoParaEnvio, opcoes?: OpcoesChamada): Promise<T>;
}

const MENSAGEM_SEM_CONEXAO = 'Sem conexão. Verifique a internet e tente de novo.';
const MENSAGEM_DEMOROU = 'O servidor demorou para responder. Tente de novo.';
/** Status do ErroApi quando a chamada passa do tempo limite (o mesmo codigo HTTP de "Request Timeout"). */
export const STATUS_TEMPO_ESGOTADO = 408;
const TEMPO_LIMITE_PADRAO_MS = 45_000;
const MENSAGEM_ERRO_SERVIDOR = 'Algo deu errado no servidor. Tente de novo.';
const MENSAGEM_ERRO_GENERICA = 'Não foi possível concluir a operação. Tente de novo.';

const MENSAGEM_MUITAS_TENTATIVAS = 'Muitas tentativas. Espere um pouco e tente de novo.';

function mensagemPadrao(status: number): string {
  if (status === 429) return MENSAGEM_MUITAS_TENTATIVAS;
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

function textoNaoVazio(valor: unknown): string | null {
  return typeof valor === 'string' && valor ? valor : null;
}

// "Descricao" -> "descricao": o .NET devolve o nome do campo como na classe (PascalCase).
function nomeDoCampo(nome: string): string {
  return nome.charAt(0).toLowerCase() + nome.slice(1);
}

// Entende os dois formatos de erro das nossas APIs:
//  - Java (conferido na API rodando): { type, title, status, detail, codigo, mensagemFalada,
//    campos?: [{ campo, mensagem }] }. A "mensagemFalada" e a frase simples feita para a pessoa
//    (e para ser lida em voz alta); o "detail" e tecnico, so entra se ela faltar.
//  - .NET (ProblemDetails do ASP.NET): { title, status, detail?, errors?: { Campo: ["mensagem"] } }
// O "title" do .NET vem em ingles (ex.: "One or more validation errors occurred."), entao nunca
// e mostrado; sem mensagem nenhuma vale a mensagem padrao em portugues.
function converterErro(status: number, corpo: unknown): ErroApi {
  const dados = (corpo && typeof corpo === 'object' ? corpo : {}) as {
    mensagemFalada?: unknown;
    mensagem?: unknown;
    detail?: unknown;
    campos?: unknown;
    errors?: unknown;
  };
  const mensagem =
    textoNaoVazio(dados.mensagemFalada) ??
    textoNaoVazio(dados.mensagem) ??
    textoNaoVazio(dados.detail);
  const campos: Record<string, string> = {};
  if (Array.isArray(dados.campos)) {
    for (const item of dados.campos) {
      if (item && typeof item.campo === 'string' && typeof item.mensagem === 'string') {
        campos[item.campo] = item.mensagem;
      }
    }
  }
  if (dados.errors && typeof dados.errors === 'object' && !Array.isArray(dados.errors)) {
    for (const [campo, mensagens] of Object.entries(dados.errors)) {
      const primeira = Array.isArray(mensagens) ? mensagens.find(textoNaoVazio) : mensagens;
      const texto = textoNaoVazio(primeira);
      if (texto) campos[nomeDoCampo(campo)] = texto;
    }
  }
  return new ErroApi(status, mensagem ?? mensagemPadrao(status), campos);
}

export function criarClienteHttp({
  baseUrl,
  obterToken,
  aoNaoAutorizado,
  fetchImpl = fetch,
  tempoLimiteMs = TEMPO_LIMITE_PADRAO_MS,
}: OpcoesClienteHttp): ClienteHttp {
  const base = baseUrl.replace(/\/+$/, '');

  async function requisitar<T>(
    metodo: string,
    caminho: string,
    corpo?: unknown,
    opcoes?: OpcoesChamada,
  ): Promise<T> {
    const token = opcoes?.token ?? obterToken?.() ?? null;
    // Os extras entram primeiro: assim nenhum cabecalho da chamada consegue trocar o Authorization.
    const headers: Record<string, string> = { ...opcoes?.cabecalhos, Accept: 'application/json' };
    // Multipart (FormData): sem Content-Type de proposito, o fetch monta o "boundary" sozinho.
    const ehMultipart = corpo instanceof FormData;
    if (corpo !== undefined && !ehMultipart) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;

    const controle = new AbortController();
    let esgotou = false;
    const relogio = setTimeout(() => {
      esgotou = true;
      controle.abort();
    }, tempoLimiteMs);
    let resposta: Response;
    try {
      resposta = await fetchImpl(`${base}${caminho}`, {
        method: metodo,
        headers,
        body: corpo === undefined ? undefined : ehMultipart ? corpo : JSON.stringify(corpo),
        signal: controle.signal,
      });
    } catch {
      throw esgotou
        ? new ErroApi(STATUS_TEMPO_ESGOTADO, MENSAGEM_DEMOROU)
        : new ErroApi(0, MENSAGEM_SEM_CONEXAO);
    } finally {
      clearTimeout(relogio);
    }

    const dados = await lerCorpo(resposta);
    if (!resposta.ok) {
      if (resposta.status === 401 && token && !opcoes?.naoDeslogarEm401) aoNaoAutorizado?.();
      throw converterErro(resposta.status, dados);
    }
    return dados as T;
  }

  return {
    get: (caminho, opcoes) => requisitar('GET', caminho, undefined, opcoes),
    post: (caminho, corpo, opcoes) => requisitar('POST', caminho, corpo, opcoes),
    put: (caminho, corpo, opcoes) => requisitar('PUT', caminho, corpo, opcoes),
    delete: (caminho, opcoes) => requisitar('DELETE', caminho, undefined, opcoes),
    enviarArquivo: (caminho, arquivo, opcoes) => {
      const formulario = new FormData();
      // O "fetch" do Expo nao aceita o formato antigo { uri, name, type } (erro "Unsupported
      // FormDataPart implementation"): o arquivo do aparelho entra como File do expo-file-system.
      formulario.append('arquivo', new File(arquivo.uri) as unknown as Blob, arquivo.nome);
      return requisitar('POST', caminho, formulario, opcoes);
    },
  };
}
