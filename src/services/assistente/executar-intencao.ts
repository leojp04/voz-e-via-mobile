// Executor de intencoes do assistente: transforma a resposta da API ("quero ligar para a filha")
// numa acao do aparelho. Regras de seguranca (plano unico, secao 4.2):
//  - So roda DEPOIS de a pessoa tocar em confirmar na tela; a IA nunca age sozinha.
//  - Ligar abre o DISCADOR (a pessoa ainda toca em ligar) e reportar abre o FORMULARIO preenchido
//    (a pessoa revisa e envia). Nada e enviado ou discado automaticamente.
//  - Quando algo nao puder ser feito, devolve um aviso claro em vez de falhar calado.
// As dependencias (API de contatos, discador, mapa, GPS, navegacao) entram por parametro: assim o
// executor e testado sem aparelho e a tela so liga os fios.

import type { PontoNoMapa } from '../../utils/url-do-mapa';
import type { Contato, ContatosApi, Intencao, RespostaAssistente } from '../api/types';

export interface DestinoDeNavegacao {
  pathname: '/reportes' | '/reportes/novo';
  params?: Record<string, string>;
}

export interface Dependencias {
  contatos: ContatosApi;
  ligarPara: (telefone: string) => void;
  abrirBuscaNoMapa: (busca: string, ponto?: PontoNoMapa) => void;
  obterLocalizacao: () => Promise<PontoNoMapa>;
  navegar: (destino: DestinoDeNavegacao) => void;
}

export type ResultadoDaExecucao =
  /** A acao foi entregue ao aparelho (discador, mapa ou outra tela). */
  | { tipo: 'feito' }
  /** Nao foi possivel; "mensagem" explica o que a pessoa pode fazer. */
  | { tipo: 'aviso'; mensagem: string }
  /** Intencao so informativa: a resposta na tela ja e tudo. */
  | { tipo: 'nada' };

const SEM_ACAO: readonly Intencao[] = ['DUVIDA_DIREITO', 'NAO_ENTENDI'];

/** Diz se a intencao pede um botao de acao na tela (as informativas so mostram a resposta). */
export function intencaoTemAcao(intencao: Intencao): boolean {
  return !SEM_ACAO.includes(intencao);
}

const TAMANHO_DA_PAGINA = 50;

// Minusculas e sem acento: "Mãe", "mae" e "MAE" sao o mesmo apelido.
function simplificar(texto: string): string {
  return texto.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

async function listarTodosOsContatos(contatos: ContatosApi): Promise<Contato[]> {
  const todos: Contato[] = [];
  for (let pagina = 1; ; pagina++) {
    const resultado = await contatos.listar(pagina, TAMANHO_DA_PAGINA);
    todos.push(...resultado.itens);
    if (resultado.itens.length === 0 || todos.length >= resultado.total) return todos;
  }
}

async function ligarParaContato(
  apelido: string | undefined,
  deps: Dependencias,
): Promise<ResultadoDaExecucao> {
  if (!apelido?.trim()) {
    return {
      tipo: 'aviso',
      mensagem: 'Não entendi para quem ligar. Abra Contatos e ligue pelo botão.',
    };
  }

  let todos: Contato[];
  try {
    todos = await listarTodosOsContatos(deps.contatos);
  } catch {
    return {
      tipo: 'aviso',
      mensagem:
        'Não foi possível consultar seus contatos agora. Verifique a internet e tente de novo.',
    };
  }

  const procurado = simplificar(apelido);
  const achados = todos.filter((c) => simplificar(c.apelido) === procurado);

  if (achados.length === 0) {
    return {
      tipo: 'aviso',
      mensagem: `Não encontrei "${apelido}" nos seus contatos. Abra Contatos para conferir o apelido.`,
    };
  }
  if (achados.length > 1) {
    return {
      tipo: 'aviso',
      mensagem: `Você tem mais de um contato chamado "${apelido}". Abra Contatos e ligue pelo botão.`,
    };
  }
  deps.ligarPara(achados[0].telefone);
  return { tipo: 'feito' };
}

async function abrirLocalProximo(
  busca: string | undefined,
  deps: Dependencias,
): Promise<ResultadoDaExecucao> {
  if (!busca?.trim()) {
    return { tipo: 'aviso', mensagem: 'Não entendi o que procurar perto de você. Tente de novo.' };
  }
  let ponto: PontoNoMapa | undefined;
  try {
    ponto = await deps.obterLocalizacao();
  } catch {
    // Sem GPS (permissao negada, por exemplo) o app de mapas ainda busca perto do aparelho.
    ponto = undefined;
  }
  deps.abrirBuscaNoMapa(busca, ponto);
  return { tipo: 'feito' };
}

function abrirNovoReporte(
  parametros: Record<string, string>,
  deps: Dependencias,
): ResultadoDaExecucao {
  const params: Record<string, string> = {};
  for (const chave of ['categoria', 'urgencia', 'descricao']) {
    const valor = parametros[chave];
    if (valor) params[chave] = valor;
  }
  deps.navegar({ pathname: '/reportes/novo', params });
  return { tipo: 'feito' };
}

export async function executarIntencao(
  resposta: RespostaAssistente,
  deps: Dependencias,
): Promise<ResultadoDaExecucao> {
  switch (resposta.intencao) {
    case 'LIGAR_CONTATO':
      return ligarParaContato(resposta.parametros.apelido, deps);
    case 'LOCAL_PROXIMO':
      return abrirLocalProximo(resposta.parametros.busca, deps);
    case 'REPORTAR_PROBLEMA':
      return abrirNovoReporte(resposta.parametros, deps);
    case 'CONSULTAR_REPORTES':
      deps.navegar({ pathname: '/reportes' });
      return { tipo: 'feito' };
    case 'EMERGENCIA':
      // O disparo do alerta depende da API Java (vinculos de cuidador, ainda nao existe).
      // Por honestidade, nao fingimos que avisamos ninguem.
      return {
        tipo: 'aviso',
        mensagem:
          'O aviso aos cuidadores ainda não está disponível neste aplicativo. Em emergência, ligue para o SAMU: 192.',
      };
    case 'DUVIDA_DIREITO':
    case 'NAO_ENTENDI':
      return { tipo: 'nada' };
  }
}
