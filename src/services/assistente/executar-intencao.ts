// Executor de intencoes do assistente: transforma a resposta do Java ("socorro", "isso e golpe?")
// numa acao. Regras de seguranca (plano unico, secao 4.2):
//  - So roda DEPOIS de a pessoa tocar em confirmar na tela; a IA nunca age sozinha.
//  - Reportar abre o FORMULARIO preenchido (a pessoa revisa e envia). Nada e enviado sozinho.
//  - Nunca finge que avisou alguem: se a API falhar, diz isso e manda ligar para o SAMU (192).
//  - Quando algo nao puder ser feito, devolve um aviso claro em vez de falhar calado.
// As dependencias (API, GPS, navegacao) entram por parametro: assim o executor e testado sem
// aparelho e a tela so liga os fios.

import type { PontoNoMapa } from '../../utils/url-do-mapa';
import type {
  AssistenteApi,
  EntidadesDaFala,
  Intencao,
  RespostaAssistente,
  ResultadoEmergencia,
  ResultadoVerificacao,
} from '../api/types';

export interface DestinoDeNavegacao {
  pathname: '/reportes/novo';
  params: Record<string, string>;
}

export interface Dependencias {
  assistente: Pick<AssistenteApi, 'acionarEmergencia' | 'verificarMensagem'>;
  obterLocalizacao: () => Promise<PontoNoMapa>;
  navegar: (destino: DestinoDeNavegacao) => void;
}

export type ResultadoDaExecucao =
  /** A acao foi entregue a outra tela (formulario de reporte). */
  | { tipo: 'feito' }
  /** Nao foi possivel; "mensagem" explica o que a pessoa pode fazer. */
  | { tipo: 'aviso'; mensagem: string }
  /** Intencao so informativa: a resposta na tela ja e tudo. */
  | { tipo: 'nada' }
  /** Os contatos foram avisados; a tela oferece ligar para o numero de emergencia. */
  | { tipo: 'emergencia'; resultado: ResultadoEmergencia; telefoneEmergencia: string }
  /** Parecer do Java sobre a mensagem suspeita. */
  | { tipo: 'verificacao'; resultado: ResultadoVerificacao };

const SAMU = '192';
// Limites da API Java (EmergenciaRequest e VerificacaoRequest).
const MAX_TEXTO_EMERGENCIA = 300;
const MAX_TEXTO_VERIFICACAO = 2000;

const COM_ACAO: readonly Intencao[] = ['SOCORRO', 'VERIFICAR_INFORMACAO', 'ZELADORIA_REPORT'];

/** Diz se a intencao pede um botao de acao na tela (as informativas so mostram a resposta). */
export function intencaoTemAcao(intencao: Intencao): boolean {
  return COM_ACAO.includes(intencao);
}

// Codigo da categoria do reporte (API .NET) para cada problema de rua que o Java reconhece.
const CATEGORIA_DO_PROBLEMA: Record<NonNullable<EntidadesDaFala['problemaRua']>, string> = {
  BURACO: 'BURACO',
  CALCADA_DANIFICADA: 'CALCADA',
  RAMPA_BLOQUEADA: 'RAMPA',
  ILUMINACAO: 'ILUMINACAO',
  LIXO_OU_ENTULHO: 'LIXO',
  ARVORE_CAIDA: 'OUTRO',
  ALAGAMENTO: 'OUTRO',
  OUTRO: 'OUTRO',
};

async function acionarSocorro(texto: string, deps: Dependencias): Promise<ResultadoDaExecucao> {
  let ponto: PontoNoMapa | undefined;
  try {
    ponto = await deps.obterLocalizacao();
  } catch {
    // Sem GPS o alerta ainda sai: avisar os contatos vale mais que a coordenada.
    ponto = undefined;
  }
  try {
    const resultado = await deps.assistente.acionarEmergencia({
      ...(ponto ? { latitude: ponto.latitude, longitude: ponto.longitude } : {}),
      textoOriginal: texto.slice(0, MAX_TEXTO_EMERGENCIA),
    });
    return { tipo: 'emergencia', resultado, telefoneEmergencia: SAMU };
  } catch {
    return {
      tipo: 'aviso',
      mensagem: `Não foi possível avisar seus contatos. Ligue agora para o SAMU: ${SAMU}.`,
    };
  }
}

async function verificar(texto: string, deps: Dependencias): Promise<ResultadoDaExecucao> {
  const limpo = texto.trim();
  if (!limpo) {
    return { tipo: 'aviso', mensagem: 'Cole ou digite a mensagem que você quer verificar.' };
  }
  if (limpo.length > MAX_TEXTO_VERIFICACAO) {
    return {
      tipo: 'aviso',
      mensagem: `A mensagem é longa demais. Envie até ${MAX_TEXTO_VERIFICACAO} letras.`,
    };
  }
  try {
    const resultado = await deps.assistente.verificarMensagem({ texto: limpo });
    return { tipo: 'verificacao', resultado };
  } catch {
    return {
      tipo: 'aviso',
      mensagem: 'Não foi possível verificar agora. Verifique a internet e tente de novo.',
    };
  }
}

function abrirNovoReporte(
  resposta: RespostaAssistente,
  texto: string,
  deps: Dependencias,
): ResultadoDaExecucao {
  const params: Record<string, string> = {};
  const { problemaRua } = resposta.entidades;
  if (problemaRua) params.categoria = CATEGORIA_DO_PROBLEMA[problemaRua];
  // O reporte nao tem CRITICA: o nivel mais alto dele e ALTA.
  if (resposta.urgencia) {
    params.urgencia = resposta.urgencia === 'CRITICA' ? 'ALTA' : resposta.urgencia;
  }
  const descricao = texto.trim();
  if (descricao) params.descricao = descricao;
  deps.navegar({ pathname: '/reportes/novo', params });
  return { tipo: 'feito' };
}

/** "texto" e o que a pessoa disse ou digitou: serve de descricao, de alerta ou de mensagem a checar. */
export async function executarIntencao(
  resposta: RespostaAssistente,
  texto: string,
  deps: Dependencias,
): Promise<ResultadoDaExecucao> {
  switch (resposta.intencao) {
    case 'SOCORRO':
      return acionarSocorro(texto, deps);
    case 'VERIFICAR_INFORMACAO':
      return verificar(texto, deps);
    case 'ZELADORIA_REPORT':
      return abrirNovoReporte(resposta, texto, deps);
    case 'BUSCAR_ATENDIMENTO':
    case 'TIRAR_DUVIDA':
    case 'DESCONHECIDA':
      return { tipo: 'nada' };
  }
}
