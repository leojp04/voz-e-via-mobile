// API do assistente REAL: fala com a API Java pelo cliente HTTP (docs/adr/0002).
// Implementa o mesmo contrato AssistenteApi da API falsa. Caminhos e campos lidos do codigo do
// Java: VozController, EmergenciaController e GolpeController (rotas /api/v1/...).

import type { ClienteHttp } from '../cliente-http';
import type {
  AssistenteApi,
  AtendimentosProximos,
  ClassificacaoGolpe,
  EntidadesDaFala,
  Intencao,
  OrientacaoServico,
  ResultadoEmergencia,
  ResultadoVerificacao,
  RespostaAssistente,
} from '../types';

const INTENCOES: readonly Intencao[] = [
  'SOCORRO',
  'BUSCAR_ATENDIMENTO',
  'VERIFICAR_INFORMACAO',
  'ZELADORIA_REPORT',
  'TIRAR_DUVIDA',
  'DESCONHECIDA',
];

const CLASSIFICACOES: readonly ClassificacaoGolpe[] = [
  'SEM_SINAIS_DE_RISCO',
  'NAO_E_POSSIVEL_AVALIAR',
  'SUSPEITA',
  'PROVAVEL_GOLPE',
];

const SEM_ENTIDADES: EntidadesDaFala = {
  tipoAtendimento: null,
  exigeAcessibilidade: null,
  problemaRua: null,
  impedeCadeirante: null,
  referenciaLocal: null,
};

// So abre link https (o Java manda o site oficial da base curada; qualquer outra coisa vira "sem link").
function normalizarOrientacao(
  bruta: Partial<OrientacaoServico> | null | undefined,
): OrientacaoServico | null {
  if (!bruta || !bruta.titulo || !bruta.resumo) return null;
  return {
    titulo: bruta.titulo,
    resumo: bruta.resumo,
    passos: bruta.passos ?? [],
    link: bruta.link?.startsWith('https://') ? bruta.link : null,
    telefone: bruta.telefone ?? null,
    orgao: bruta.orgao ?? '',
    localPresencial: bruta.localPresencial ?? null,
    sobreGolpe: bruta.sobreGolpe === true,
  };
}

// A resposta vem de uma IA: o app nao confia no formato. Intencao desconhecida vira DESCONHECIDA
// (nunca executa uma acao que nao conhece) e campo ausente vira um valor seguro.
function normalizar(bruta: Partial<RespostaAssistente>): RespostaAssistente {
  return {
    intencao: INTENCOES.find((i) => i === bruta.intencao) ?? 'DESCONHECIDA',
    urgencia: bruta.urgencia ?? null,
    entidades: { ...SEM_ENTIDADES, ...bruta.entidades },
    mensagemFalada: bruta.mensagemFalada ?? '',
    confianca: bruta.confianca ?? 0,
    analisadoPor: bruta.analisadoPor === 'REGRAS' ? 'REGRAS' : 'IA_E_REGRAS',
    atendimentos: (bruta.atendimentos as AtendimentosProximos | null | undefined) ?? null,
    orientacao: normalizarOrientacao(bruta.orientacao),
  };
}

// Sem resposta clara, nunca dizemos "sem risco": o app prefere avisar que nao deu para avaliar.
function normalizarVerificacao(bruta: Partial<ResultadoVerificacao>): ResultadoVerificacao {
  return {
    classificacao:
      CLASSIFICACOES.find((c) => c === bruta.classificacao) ?? 'NAO_E_POSSIVEL_AVALIAR',
    tipoGolpe: bruta.tipoGolpe ?? null,
    sinais: bruta.sinais ?? [],
    orientacao: bruta.orientacao ?? '',
    canalOficial: bruta.canalOficial ?? null,
    mensagemFalada: bruta.mensagemFalada ?? '',
    fontes: bruta.fontes ?? [],
  };
}

export function criarAssistenteApiReal(cliente: ClienteHttp): AssistenteApi {
  return {
    async interpretar({ texto, latitude, longitude }) {
      const temPonto = latitude !== undefined && longitude !== undefined;
      const resposta = await cliente.post<Partial<RespostaAssistente>>(
        '/api/v1/voz/intencoes',
        temPonto ? { texto, localizacao: { latitude, longitude } } : { texto },
      );
      return normalizar(resposta);
    },

    async acionarEmergencia(pedido) {
      const resposta = await cliente.post<Partial<ResultadoEmergencia>>(
        '/api/v1/emergencias',
        pedido,
      );
      return {
        id: resposta.id as number,
        contatosNotificados: resposta.contatosNotificados ?? 0,
        mensagemFalada: resposta.mensagemFalada ?? '',
      };
    },

    async verificarMensagem(pedido) {
      const resposta = await cliente.post<Partial<ResultadoVerificacao>>(
        '/api/v1/verificacoes',
        pedido,
      );
      return normalizarVerificacao(resposta);
    },
  };
}
