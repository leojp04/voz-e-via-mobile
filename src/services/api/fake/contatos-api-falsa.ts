// API de contatos de emergencia FALSA, em memoria (ver docs/adr/0004). Imita as regras da API
// Java (plano unico, secao 8.1): cada contato pertence a um usuario, contato de outra pessoa
// responde 404 e os dados sao validados com 400. Os dados somem quando o app fecha.

import { ErroApi } from '../erro';
import type { Contato, ContatosApi, DadosContato, Pagina } from '../types';

const NOME_MINIMO = 2;
const NOME_MAXIMO = 80;
const APELIDO_MAXIMO = 30;
const PRIORIDADE_MINIMA = 1;
const PRIORIDADE_MAXIMA = 5;
const TAMANHO_MAXIMO_DA_PAGINA = 50;

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

interface ContatoArmazenado extends Contato {
  usuarioId: number;
}

function semDono({ usuarioId: _usuarioId, ...contato }: ContatoArmazenado): Contato {
  return { ...contato };
}

function soDigitos(texto: string): string {
  return texto.replace(/\D/g, '');
}

// Valida e devolve os dados limpos (sem espacos nas pontas, telefone so com digitos).
function validar(dados: DadosContato): DadosContato {
  const campos: Record<string, string> = {};
  const nome = dados.nome.trim();
  const apelido = dados.apelido.trim();
  const telefone = soDigitos(dados.telefone);

  if (nome.length < NOME_MINIMO || nome.length > NOME_MAXIMO) {
    campos.nome = `O nome deve ter de ${NOME_MINIMO} a ${NOME_MAXIMO} letras.`;
  }
  if (apelido.length < 1 || apelido.length > APELIDO_MAXIMO) {
    campos.apelido = `O apelido deve ter de 1 a ${APELIDO_MAXIMO} letras.`;
  }
  if (telefone.length < 10 || telefone.length > 11) {
    campos.telefone = 'Digite o telefone com DDD (10 ou 11 números).';
  }
  if (
    !Number.isInteger(dados.prioridade) ||
    dados.prioridade < PRIORIDADE_MINIMA ||
    dados.prioridade > PRIORIDADE_MAXIMA
  ) {
    campos.prioridade = `A prioridade vai de ${PRIORIDADE_MINIMA} a ${PRIORIDADE_MAXIMA}.`;
  }
  if (Object.keys(campos).length > 0) throw new ErroApi(400, 'Dados inválidos.', campos);
  return { nome, apelido, telefone, prioridade: dados.prioridade };
}

export function criarContatosApiFalsa({
  obterToken,
  idDoToken,
  latenciaMs = 0,
  aoNaoAutorizado,
}: Opcoes): ContatosApi {
  const contatos = new Map<number, ContatoArmazenado>();
  let proximoId = 1;

  const esperar = () => (latenciaMs > 0 ? new Promise((r) => setTimeout(r, latenciaMs)) : null);

  const usuarioAtual = (): number => {
    const token = obterToken();
    const id = idDoToken(token);
    if (id === null) {
      // So e "sessao vencida" quando havia token (sem token e so "nao logado").
      if (token) aoNaoAutorizado?.();
      throw new ErroApi(401, 'Sessão inválida. Entre novamente.');
    }
    return id;
  };

  // Contato que existe E e do usuario; senao 404 (nao revela que existe).
  const contatoDoUsuario = (id: number, usuarioId: number): ContatoArmazenado => {
    const contato = contatos.get(id);
    if (!contato || contato.usuarioId !== usuarioId) {
      throw new ErroApi(404, 'Contato não encontrado.');
    }
    return contato;
  };

  return {
    async listar(pagina: number, tamanho: number): Promise<Pagina<Contato>> {
      await esperar();
      const usuarioId = usuarioAtual();
      if (
        !Number.isInteger(pagina) ||
        pagina < 1 ||
        !Number.isInteger(tamanho) ||
        tamanho < 1 ||
        tamanho > TAMANHO_MAXIMO_DA_PAGINA
      ) {
        throw new ErroApi(400, 'Página ou tamanho inválido.');
      }
      const meus = [...contatos.values()]
        .filter((c) => c.usuarioId === usuarioId)
        .sort((a, b) => a.prioridade - b.prioridade || a.nome.localeCompare(b.nome) || a.id - b.id);
      const itens = meus.slice((pagina - 1) * tamanho, pagina * tamanho).map(semDono);
      return { itens, pagina, tamanho, total: meus.length };
    },

    async obter(id: number): Promise<Contato> {
      await esperar();
      return semDono(contatoDoUsuario(id, usuarioAtual()));
    },

    async criar(dados: DadosContato): Promise<Contato> {
      await esperar();
      const usuarioId = usuarioAtual();
      const limpos = validar(dados);
      const contato: ContatoArmazenado = { id: proximoId++, usuarioId, ...limpos };
      contatos.set(contato.id, contato);
      return semDono(contato);
    },

    async editar(id: number, dados: DadosContato): Promise<Contato> {
      await esperar();
      const contato = contatoDoUsuario(id, usuarioAtual());
      Object.assign(contato, validar(dados));
      return semDono(contato);
    },

    async excluir(id: number): Promise<void> {
      await esperar();
      const contato = contatoDoUsuario(id, usuarioAtual());
      contatos.delete(contato.id);
    },
  };
}
