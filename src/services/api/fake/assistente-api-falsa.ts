// API do assistente FALSA, em memoria (ver docs/adr/0004). Nao usa IA: reconhece palavras-chave
// para o app poder ser testado sem a API Java. Imita o contrato REAL do Java (5 intencoes, em
// /api/v1/voz/intencoes, /api/v1/emergencias e /api/v1/verificacoes): exige sessao (401), valida
// tamanhos (400) e devolve a mesma estrutura.
// A API falsa de emergencia NAO avisa ninguem (contatosNotificados = 0), para o app nao prometer
// o que so a API real faz.

import { ErroApi } from '../erro';
import type {
  AssistenteApi,
  AtendimentoProximo,
  AtendimentosProximos,
  EntidadesDaFala,
  PedidoAssistente,
  ProblemaRua,
  ResultadoVerificacao,
  RespostaAssistente,
  TipoAtendimento,
} from '../types';

const TEXTO_MAXIMO = 500;
const EMERGENCIA_MAXIMO = 300;
const VERIFICACAO_MAXIMO = 2000;

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

const PROBLEMAS: { problema: ProblemaRua; palavra: RegExp }[] = [
  { problema: 'CALCADA_DANIFICADA', palavra: /\bcalcadas?\b/ },
  { problema: 'RAMPA_BLOQUEADA', palavra: /\brampas?\b/ },
  { problema: 'BURACO', palavra: /\bburacos?\b/ },
  { problema: 'ILUMINACAO', palavra: /\b(iluminacao|poste|postes)\b/ },
  { problema: 'LIXO_OU_ENTULHO', palavra: /\b(lixo|entulho)\b/ },
  { problema: 'ARVORE_CAIDA', palavra: /\barvores?\b/ },
  { problema: 'ALAGAMENTO', palavra: /\b(alagamento|alagou|enchente)\b/ },
];

const ATENDIMENTOS: { tipo: TipoAtendimento; palavra: RegExp }[] = [
  { tipo: 'HOSPITAL', palavra: /\bhospital\b/ },
  { tipo: 'UPA', palavra: /\bupa\b/ },
  { tipo: 'UBS', palavra: /\b(ubs|posto de saude)\b/ },
  { tipo: 'FARMACIA', palavra: /\bfarmacia\b/ },
  { tipo: 'CRAS', palavra: /\bcras\b/ },
  { tipo: 'DELEGACIA', palavra: /\bdelegacia\b/ },
  { tipo: 'DEFENSORIA', palavra: /\bdefensoria\b/ },
];

const NOME_DO_TIPO: Record<TipoAtendimento, string> = {
  HOSPITAL: 'Hospital',
  UPA: 'UPA',
  UBS: 'UBS',
  FARMACIA: 'Farmácia',
  CRAS: 'CRAS',
  DELEGACIA: 'Delegacia',
  DEFENSORIA: 'Defensoria Pública',
};

const SEM_ENTIDADES: EntidadesDaFala = {
  tipoAtendimento: null,
  exigeAcessibilidade: null,
  problemaRua: null,
  impedeCadeirante: null,
  referenciaLocal: null,
};

function resposta(
  parcial: Partial<RespostaAssistente> & Pick<RespostaAssistente, 'intencao' | 'mensagemFalada'>,
): RespostaAssistente {
  return {
    urgencia: null,
    entidades: SEM_ENTIDADES,
    confianca: 0.9,
    atendimentos: null,
    orientacao: null,
    ...parcial,
  };
}

export function montarAtendimentos(
  tipo: TipoAtendimento,
  latitude: number,
  longitude: number,
): AtendimentosProximos {
  const nome = NOME_DO_TIPO[tipo];
  const urgencia = tipo === 'HOSPITAL' || tipo === 'UPA';
  const local = (id: number, metros: number, confirmada: boolean): AtendimentoProximo => ({
    id,
    nome: `${nome} Exemplo ${id}`,
    tipo,
    endereco: `Rua Exemplo, ${id * 100}`,
    telefone: '1130000000',
    latitude: latitude + id * 0.002,
    longitude: longitude + id * 0.002,
    distanciaMetros: metros,
    acessibilidade: confirmada ? 'SIM' : 'DESCONHECIDA',
    banheiroAdaptado: confirmada ? true : null,
    funciona24h: urgencia ? true : null,
    aviso: confirmada ? null : 'Acessibilidade não informada. Ligue antes de ir.',
    rotas: {
      googleMaps: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
      waze: `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`,
      geo: `geo:${latitude},${longitude}`,
    },
  });
  return {
    tipo,
    atendimentos: [local(1, 450, true), local(2, 1200, false)],
    semAcessivelNoRaio: false,
    mensagemFalada: `${nome} mais perto: ${nome} Exemplo 1, a 450 metros.`,
    orientacaoEmergencia: urgencia ? 'Em urgência, ligue 192 (SAMU).' : null,
    telefoneEmergencia: urgencia ? '192' : null,
    observacao: 'Dados de exemplo da API falsa.',
    creditoDados: '© Colaboradores do OpenStreetMap (licença ODbL)',
  };
}

function interpretar(pedido: PedidoAssistente): RespostaAssistente {
  const t = simplificar(pedido.texto);
  const cadeira = /\b(cadeira|cadeirante|andador|rampa)\b/.test(t);

  // Antes do socorro: "a calcada esta quebrada, quase cai" e um reporte, nao um pedido de ajuda.
  const problema = PROBLEMAS.find((p) => p.palavra.test(t));
  if (problema) {
    return resposta({
      intencao: 'ZELADORIA_REPORT',
      urgencia: /\b(cai|caiu|perigo|perigoso|risco|enorme)\b/.test(t) ? 'ALTA' : 'MEDIA',
      entidades: {
        ...SEM_ENTIDADES,
        problemaRua: problema.problema,
        impedeCadeirante: cadeira ? true : null,
      },
      mensagemFalada: 'Entendi. Vou abrir o formulário do reporte para você conferir.',
    });
  }

  if (/\b(socorro|cai|caiu)\b/.test(t) || /\bpreciso de ajuda\b/.test(t)) {
    return resposta({
      intencao: 'SOCORRO',
      urgencia: 'CRITICA',
      mensagemFalada: 'Você precisa de ajuda? Posso avisar seus contatos agora.',
    });
  }

  const atendimento = ATENDIMENTOS.find((a) => a.palavra.test(t));
  if (atendimento && /\b(perto|proxim[oa])\b/.test(t)) {
    const temPonto = pedido.latitude !== undefined && pedido.longitude !== undefined;
    const lista = temPonto
      ? montarAtendimentos(atendimento.tipo, pedido.latitude as number, pedido.longitude as number)
      : null;
    return resposta({
      intencao: 'BUSCAR_ATENDIMENTO',
      entidades: {
        ...SEM_ENTIDADES,
        tipoAtendimento: atendimento.tipo,
        exigeAcessibilidade: cadeira ? true : null,
      },
      mensagemFalada:
        lista?.mensagemFalada ?? `Vou procurar ${NOME_DO_TIPO[atendimento.tipo]} perto de você.`,
      atendimentos: lista,
    });
  }

  if (/\b(golpe|golpista|fraude|mensagem suspeita|e verdade)\b/.test(t)) {
    return resposta({
      intencao: 'VERIFICAR_INFORMACAO',
      mensagemFalada: 'Cole ou fale a mensagem que você recebeu, e eu confiro para você.',
    });
  }

  // Depois do golpe: "recebi uma mensagem do INSS, isso e golpe?" e verificacao, nao duvida.
  if (/\b(aposentadoria|aposentar|inss|prova de vida)\b/.test(t)) {
    const resumo =
      'A aposentadoria é pedida pelo Meu INSS, no site ou no aplicativo, sem ir a uma agência. Se precisar de ajuda, ligue 135.';
    return resposta({
      intencao: 'TIRAR_DUVIDA',
      urgencia: 'BAIXA',
      mensagemFalada: resumo,
      orientacao: {
        titulo: 'Pedir aposentadoria',
        resumo,
        passos: [
          'Entre no Meu INSS com a sua conta gov.br.',
          'Toque em Novo pedido e digite aposentadoria.',
        ],
        link: 'https://meu.inss.gov.br',
        telefone: '135',
        orgao: 'INSS',
        localPresencial: null,
        sobreGolpe: false,
      },
    });
  }

  return resposta({
    intencao: 'DESCONHECIDA',
    confianca: 0,
    mensagemFalada: 'Não entendi. Pode repetir ou usar os botões da tela inicial?',
  });
}

function verificar(texto: string): ResultadoVerificacao {
  const t = simplificar(texto);
  const sinais: string[] = [];
  if (/https?:\/\//.test(t) || /\blink\b/.test(t)) sinais.push('A mensagem traz um link.');
  if (/\b(hoje|urgente|imediatamente|ultimo dia)\b/.test(t)) sinais.push('Pede pressa.');
  if (/\b(bloquead|cancelad|suspens)/.test(t)) sinais.push('Ameaça bloquear algo seu.');
  if (/\b(pix|senha|codigo|cartao)\b/.test(t)) sinais.push('Pede dinheiro ou dados pessoais.');

  if (sinais.length >= 2) {
    return {
      classificacao: 'PROVAVEL_GOLPE',
      tipoGolpe: 'OUTRO',
      sinais,
      orientacao: 'Não clique em links nem passe dados. Ligue para o canal oficial da empresa.',
      canalOficial: 'Use o telefone que está no site ou no cartão da empresa.',
      mensagemFalada: 'Isso parece golpe. Não clique no link e não passe seus dados.',
      fontes: [
        { titulo: 'Orientação de exemplo', orgao: 'API falsa', url: 'https://exemplo.test' },
      ],
    };
  }
  // Sem sinais claros a API falsa nunca diz "seguro": so a API real analisa de verdade.
  return {
    classificacao: 'NAO_E_POSSIVEL_AVALIAR',
    tipoGolpe: null,
    sinais,
    orientacao: 'Na dúvida, não clique em links e fale com alguém de confiança.',
    canalOficial: null,
    mensagemFalada: 'Não consegui avaliar. Na dúvida, não clique em links.',
    fontes: [],
  };
}

export function criarAssistenteApiFalsa({
  obterToken,
  idDoToken,
  latenciaMs = 0,
  aoNaoAutorizado,
}: Opcoes): AssistenteApi {
  const esperar = () => (latenciaMs > 0 ? new Promise((r) => setTimeout(r, latenciaMs)) : null);
  let proximoIdEmergencia = 1;

  const exigirSessao = (): void => {
    const token = obterToken();
    if (idDoToken(token) === null) {
      // So e "sessao vencida" quando havia token (sem token e so "nao logado").
      if (token) aoNaoAutorizado?.();
      throw new ErroApi(401, 'Sessão inválida. Entre novamente.');
    }
  };

  return {
    async interpretar(pedido) {
      await esperar();
      exigirSessao();
      const texto = pedido.texto.trim();
      if (texto.length < 1 || texto.length > TEXTO_MAXIMO) {
        throw new ErroApi(400, `O texto deve ter de 1 a ${TEXTO_MAXIMO} letras.`);
      }
      return interpretar({ ...pedido, texto });
    },

    async acionarEmergencia(pedido) {
      await esperar();
      exigirSessao();
      if ((pedido.textoOriginal?.length ?? 0) > EMERGENCIA_MAXIMO) {
        throw new ErroApi(400, `A frase pode ter no máximo ${EMERGENCIA_MAXIMO} letras.`);
      }
      return {
        id: proximoIdEmergencia++,
        contatosNotificados: 0,
        mensagemFalada: 'Pedido de socorro registrado. Em emergência, ligue 192.',
      };
    },

    async verificarMensagem(pedido) {
      await esperar();
      exigirSessao();
      const texto = pedido.texto.trim();
      if (texto.length < 1 || texto.length > VERIFICACAO_MAXIMO) {
        throw new ErroApi(400, `A mensagem deve ter de 1 a ${VERIFICACAO_MAXIMO} letras.`);
      }
      return verificar(texto);
    },
  };
}
