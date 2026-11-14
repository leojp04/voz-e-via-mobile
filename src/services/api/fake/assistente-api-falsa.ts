// API do assistente FALSA, em memoria (ver docs/adr/0004). Nao usa IA: reconhece palavras-chave
// para o app poder ser testado sem a API Java. Imita as regras da API real (plano unico, secoes
// 4.2 e 8.1): exige sessao (401), texto de 1 a 500 letras (400) e devolve a mesma estrutura.

import { ErroApi } from '../erro';
import type { AssistenteApi, PedidoAssistente, RespostaAssistente } from '../types';

const TEXTO_MAXIMO = 500;

interface Opcoes {
  /** Devolve o token da sessao atual (ou null). */
  obterToken: () => string | null;
  /** Descobre o usuario dono do token (vem da API de autenticacao falsa). */
  idDoToken: (token: string | null) => number | null;
  /** Atraso simulado em milissegundos, para ver os indicadores de carregamento. */
  latenciaMs?: number;
  /** Chamado quando ha token mas ele nao vale (sessao vencida), como o 401 da API real. */
  aoNaoAutorizado?: () => void;
}

// Minusculas e sem acento, para "caí" e "CAI" serem a mesma palavra.
function simplificar(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const CATEGORIAS: { codigo: string; palavra: RegExp }[] = [
  { codigo: 'CALCADA', palavra: /\bcalcadas?\b/ },
  { codigo: 'RAMPA', palavra: /\brampas?\b/ },
  { codigo: 'BURACO', palavra: /\bburacos?\b/ },
  { codigo: 'ILUMINACAO', palavra: /\b(iluminacao|poste|postes)\b/ },
  { codigo: 'SEMAFORO_SONORO', palavra: /\bsemaforos?\b/ },
  { codigo: 'PISO_TATIL', palavra: /\bpiso tatil\b/ },
  { codigo: 'LIXO', palavra: /\b(lixo|entulho)\b/ },
];

const LOCAIS: Record<string, string> = {
  farmacia: 'farmácia',
  hospital: 'hospital',
  mercado: 'mercado',
  padaria: 'padaria',
  banco: 'banco',
  posto: 'posto de saúde',
};

function primeira(texto: string): string {
  const limpo = texto.trim();
  return limpo.charAt(0).toUpperCase() + limpo.slice(1);
}

function resposta(
  parcial: Partial<RespostaAssistente> & Pick<RespostaAssistente, 'intencao' | 'respostaFalada'>,
): RespostaAssistente {
  return { parametros: {}, fontes: [], precisaConfirmacao: false, ...parcial };
}

function interpretar(texto: string): RespostaAssistente {
  const t = simplificar(texto);

  if (/\bdireito\b/.test(t)) {
    return resposta({
      intencao: 'DUVIDA_DIREITO',
      respostaFalada:
        'Pela lei, pessoas com deficiência e idosas têm direitos ao transporte e ao atendimento prioritário.',
      fontes: ['Lei Brasileira de Inclusão (Lei 13.146/2015)'],
    });
  }

  const ligar = t.match(/\bligar (?:para|pra) (?:a |o |minha |meu )?([a-z]+)/);
  if (ligar) {
    return resposta({
      intencao: 'LIGAR_CONTATO',
      parametros: { apelido: ligar[1] },
      respostaFalada: `Quer ligar para ${ligar[1]}?`,
      precisaConfirmacao: true,
    });
  }

  const local = Object.keys(LOCAIS).find((chave) => new RegExp(`\\b${chave}\\b`).test(t));
  if (local && /\b(perto|proxim[oa])\b/.test(t)) {
    return resposta({
      intencao: 'LOCAL_PROXIMO',
      parametros: { busca: LOCAIS[local] },
      respostaFalada: `Vou abrir o mapa com ${LOCAIS[local]} perto de você.`,
      precisaConfirmacao: true,
    });
  }

  if (/\b(minha reclamacao|minhas reclamacoes|meus reportes|meu reporte)\b/.test(t)) {
    return resposta({
      intencao: 'CONSULTAR_REPORTES',
      respostaFalada: 'Vou abrir os seus reportes.',
    });
  }

  // Antes da emergencia: "a calcada esta quebrada, quase cai" e um reporte, nao um pedido de ajuda.
  const categoria = CATEGORIAS.find((c) => c.palavra.test(t));
  if (categoria) {
    const urgencia = /\b(cai|caiu|perigo|perigoso|risco|enorme)\b/.test(t) ? 'ALTA' : 'MEDIA';
    return resposta({
      intencao: 'REPORTAR_PROBLEMA',
      parametros: { categoria: categoria.codigo, urgencia, descricao: primeira(texto) },
      respostaFalada: `Entendi. Vou registrar o problema com urgência ${urgencia === 'ALTA' ? 'alta' : 'média'}. Posso confirmar?`,
      precisaConfirmacao: true,
    });
  }

  if (/\b(socorro|cai|caiu)\b/.test(t) || /\bpreciso de ajuda\b/.test(t)) {
    return resposta({
      intencao: 'EMERGENCIA',
      respostaFalada: 'Você precisa de ajuda? Posso avisar seus cuidadores agora.',
      precisaConfirmacao: true,
    });
  }

  return resposta({
    intencao: 'NAO_ENTENDI',
    respostaFalada: 'Não entendi. Pode repetir ou usar os botões da tela inicial?',
  });
}

export function criarAssistenteApiFalsa({
  obterToken,
  idDoToken,
  latenciaMs = 0,
  aoNaoAutorizado,
}: Opcoes): AssistenteApi {
  const esperar = () => (latenciaMs > 0 ? new Promise((r) => setTimeout(r, latenciaMs)) : null);

  const exigirSessao = (): void => {
    const token = obterToken();
    if (idDoToken(token) === null) {
      // So e "sessao vencida" quando havia token (sem token e so "nao logado").
      if (token) aoNaoAutorizado?.();
      throw new ErroApi(401, 'Sessão inválida. Entre novamente.');
    }
  };

  return {
    async interpretar(pedido: PedidoAssistente): Promise<RespostaAssistente> {
      await esperar();
      exigirSessao();
      const texto = pedido.texto.trim();
      if (texto.length < 1 || texto.length > TEXTO_MAXIMO) {
        throw new ErroApi(400, `O texto deve ter de 1 a ${TEXTO_MAXIMO} letras.`);
      }
      return interpretar(texto);
    },
  };
}
