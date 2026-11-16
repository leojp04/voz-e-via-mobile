// API de perfil de emergencia FALSA, em memoria (ver docs/adr/0004). Imita o Java: o cidadao
// comeca SEM perfil (meu() devolve null), cria o proprio (um so; 409 na segunda vez) e o edita.
// A mobilidade e opcional. Sem token valido a resposta e 401, como na API real.
// "temPerfil" nao existe na API real: serve para a API falsa de contatos saber se ha perfil
// (no Java os contatos ficam dentro do perfil).

import { ErroApi } from '../erro';
import type { DadosPerfil, PerfilEmergencia, PerfisApi } from '../types';

const TAMANHO_MAXIMO_DO_TEXTO = 500;

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

export type PerfisApiFalsa = PerfisApi & { temPerfil: () => boolean };

function validar(dados: DadosPerfil): void {
  const textos = [dados.condicoesSaude, dados.medicamentos, dados.observacoes];
  if (textos.some((texto) => texto !== null && texto.length > TAMANHO_MAXIMO_DO_TEXTO)) {
    throw new ErroApi(400, 'Dados do perfil inválidos.');
  }
}

export function criarPerfisApiFalsa({
  obterToken,
  idDoToken,
  latenciaMs = 0,
  aoNaoAutorizado,
}: Opcoes): PerfisApiFalsa {
  const esperar = () => (latenciaMs > 0 ? new Promise((r) => setTimeout(r, latenciaMs)) : null);

  let perfil: PerfilEmergencia | null = null;

  const exigirSessao = (): void => {
    const token = obterToken();
    if (idDoToken(token) === null) {
      // So e "sessao vencida" quando havia token (sem token e so "nao logado").
      if (token) aoNaoAutorizado?.();
      throw new ErroApi(401, 'Sessão inválida. Entre novamente.');
    }
  };

  return {
    temPerfil: () => perfil !== null,

    async meu() {
      await esperar();
      exigirSessao();
      return perfil ? { ...perfil } : null;
    },

    async criar(dados) {
      await esperar();
      exigirSessao();
      validar(dados);
      if (perfil) throw new ErroApi(409, 'Você já tem um perfil de emergência.');
      perfil = { id: 1, ...dados };
      return { ...perfil };
    },

    async atualizar(id, dados) {
      await esperar();
      exigirSessao();
      if (!perfil || perfil.id !== id) throw new ErroApi(404, 'Perfil não encontrado.');
      validar(dados);
      perfil = { id, ...dados };
      return { ...perfil };
    },
  };
}
