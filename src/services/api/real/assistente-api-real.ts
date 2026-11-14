// API do assistente REAL: fala com a API Java pelo cliente HTTP (docs/adr/0002).
// Implementa o mesmo contrato AssistenteApi da API falsa. Caminho conforme o plano unico (secao 8.1).

import type { ClienteHttp } from '../cliente-http';
import type { AssistenteApi, Intencao, RespostaAssistente } from '../types';

const INTENCOES: readonly Intencao[] = [
  'REPORTAR_PROBLEMA',
  'CONSULTAR_REPORTES',
  'EMERGENCIA',
  'LIGAR_CONTATO',
  'LOCAL_PROXIMO',
  'DUVIDA_DIREITO',
  'NAO_ENTENDI',
];

// A resposta vem de uma IA: o app nao confia no formato. Intencao desconhecida vira NAO_ENTENDI
// (nunca executa uma acao que nao conhece) e campo ausente vira um valor seguro. Na duvida, pede
// confirmacao.
function normalizar(bruta: Partial<RespostaAssistente>): RespostaAssistente {
  const intencao = INTENCOES.find((i) => i === bruta.intencao) ?? 'NAO_ENTENDI';
  return {
    intencao,
    parametros: bruta.parametros ?? {},
    respostaFalada: bruta.respostaFalada ?? '',
    fontes: bruta.fontes ?? [],
    precisaConfirmacao: bruta.precisaConfirmacao ?? true,
  };
}

export function criarAssistenteApiReal(cliente: ClienteHttp): AssistenteApi {
  return {
    async interpretar(pedido) {
      const resposta = await cliente.post<Partial<RespostaAssistente>>(
        '/api/assistente/interpretar',
        pedido,
      );
      return normalizar(resposta);
    },
  };
}
