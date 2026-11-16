// API de contatos de emergencia FALSA, em memoria (ver docs/adr/0004). Imita o que o CIDADAO ve
// no Java: o perfil de emergencia ja existe com alguns contatos, e a pessoa pode criar, editar e
// excluir os proprios (ate 10, como no Java). Cada API falsa tem a sua lista, entao um teste nao
// afeta o outro. Sem token valido a resposta e 401, como na API real.

import { ErroApi } from '../erro';
import type { Contato, ContatosApi, DadosContato, Pagina } from '../types';

const TAMANHO_MAXIMO_DA_PAGINA = 50;
const MAXIMO_DE_CONTATOS = 10;

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

// Mesmas regras do ContatoEmergenciaRequest do Java (nome, telefone BR, parentesco, prioridade).
function validar(dados: DadosContato): void {
  const digitos = dados.telefone.replace(/\D/g, '');
  const parentescoLongo = dados.parentesco !== null && dados.parentesco.length > 60;
  const invalido =
    dados.nome.trim().length < 1 ||
    dados.nome.length > 120 ||
    digitos.length < 10 ||
    digitos.length > 11 ||
    parentescoLongo ||
    !Number.isInteger(dados.prioridade) ||
    dados.prioridade < 1 ||
    dados.prioridade > 10;
  if (invalido) throw new ErroApi(400, 'Dados do contato inválidos.');
}

// O Java guarda o telefone com o codigo do pais: "11955554444" vira "+5511955554444".
function normalizarTelefone(telefone: string): string {
  return `+55${telefone.replace(/\D/g, '')}`;
}

export function criarContatosApiFalsa({
  obterToken,
  idDoToken,
  latenciaMs = 0,
  aoNaoAutorizado,
}: Opcoes): ContatosApi {
  const esperar = () => (latenciaMs > 0 ? new Promise((r) => setTimeout(r, latenciaMs)) : null);

  const contatos: Contato[] = CONTATOS_DE_EXEMPLO.map((contato) => ({ ...contato }));
  let proximoId = Math.max(...contatos.map((c) => c.id)) + 1;

  const exigirSessao = (): void => {
    const token = obterToken();
    if (idDoToken(token) === null) {
      // So e "sessao vencida" quando havia token (sem token e so "nao logado").
      if (token) aoNaoAutorizado?.();
      throw new ErroApi(401, 'Sessão inválida. Entre novamente.');
    }
  };

  const achar = (id: number): Contato => {
    const contato = contatos.find((c) => c.id === id);
    if (!contato) throw new ErroApi(404, 'Contato não encontrado.');
    return contato;
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
      const ordenados = [...contatos].sort((a, b) => a.prioridade - b.prioridade || a.id - b.id);
      const itens = ordenados
        .slice((pagina - 1) * tamanho, pagina * tamanho)
        .map((contato) => ({ ...contato }));
      return { itens, pagina, tamanho, total: ordenados.length };
    },

    async obter(id: number): Promise<Contato> {
      await esperar();
      exigirSessao();
      return { ...achar(id) };
    },

    async criar(dados: DadosContato): Promise<Contato> {
      await esperar();
      exigirSessao();
      validar(dados);
      if (contatos.length >= MAXIMO_DE_CONTATOS) {
        throw new ErroApi(409, 'O perfil já tem o máximo de 10 contatos.');
      }
      const criado: Contato = {
        id: proximoId++,
        nome: dados.nome.trim(),
        parentesco: dados.parentesco,
        telefone: normalizarTelefone(dados.telefone),
        prioridade: dados.prioridade,
      };
      contatos.push(criado);
      return { ...criado };
    },

    async editar(id: number, dados: DadosContato): Promise<Contato> {
      await esperar();
      exigirSessao();
      const existente = achar(id);
      validar(dados);
      existente.nome = dados.nome.trim();
      existente.parentesco = dados.parentesco;
      existente.telefone = normalizarTelefone(dados.telefone);
      existente.prioridade = dados.prioridade;
      return { ...existente };
    },

    async excluir(id: number): Promise<void> {
      await esperar();
      exigirSessao();
      contatos.splice(contatos.indexOf(achar(id)), 1);
    },
  };
}
