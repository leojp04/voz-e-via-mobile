// API de contatos de emergencia FALSA, em memoria (ver docs/adr/0004). Imita o que o CIDADAO ve
// no Java: o perfil de emergencia ja existe (quem cria e o cuidador) com alguns contatos, e o app
// so consulta. Sem token valido a resposta e 401, como na API real.

import { ErroApi } from '../erro';
import type { Contato, ContatosApi, Pagina } from '../types';

const TAMANHO_MAXIMO_DA_PAGINA = 50;

// Contatos de exemplo, ja no formato do Java: telefone normalizado (+55...) e parentesco opcional.
const CONTATOS_DE_EXEMPLO: readonly Contato[] = [
  {
    id: 1,
    nome: 'Marina Souza',
    parentesco: 'filha',
    telefone: '+5511988887777',
    prioridade: 1,
  },
  {
    id: 2,
    nome: 'Carlos Souza',
    parentesco: 'filho',
    telefone: '+5511977776666',
    prioridade: 2,
  },
  {
    id: 3,
    nome: 'Dra. Helena Prado',
    parentesco: null,
    telefone: '+551133334444',
    prioridade: 3,
  },
];

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

export function criarContatosApiFalsa({
  obterToken,
  idDoToken,
  latenciaMs = 0,
  aoNaoAutorizado,
}: Opcoes): ContatosApi {
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
    async listar(pagina: number, tamanho: number): Promise<Pagina<Contato>> {
      await esperar();
      exigirSessao();
      if (
        !Number.isInteger(pagina) ||
        pagina < 1 ||
        !Number.isInteger(tamanho) ||
        tamanho < 1 ||
        tamanho > TAMANHO_MAXIMO_DA_PAGINA
      ) {
        throw new ErroApi(400, 'Página ou tamanho inválido.');
      }
      const ordenados = [...CONTATOS_DE_EXEMPLO].sort(
        (a, b) => a.prioridade - b.prioridade || a.id - b.id,
      );
      const itens = ordenados
        .slice((pagina - 1) * tamanho, pagina * tamanho)
        .map((contato) => ({ ...contato }));
      return { itens, pagina, tamanho, total: ordenados.length };
    },

    async obter(id: number): Promise<Contato> {
      await esperar();
      exigirSessao();
      const contato = CONTATOS_DE_EXEMPLO.find((c) => c.id === id);
      if (!contato) throw new ErroApi(404, 'Contato não encontrado.');
      return { ...contato };
    },
  };
}
