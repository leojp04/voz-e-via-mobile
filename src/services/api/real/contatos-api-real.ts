// API de contatos REAL: fala com a API Java pelo cliente HTTP (docs/adr/0002).
// Implementa o mesmo contrato ContatosApi da API falsa, entao as telas nao percebem a troca.
//
// Contrato conferido no codigo do Java (ContatoEmergenciaController):
//  - os contatos ficam DENTRO do perfil de emergencia: /api/v1/perfis-emergencia/{perfilId}/contatos;
//  - o cidadao descobre o id do proprio perfil em GET /api/v1/perfis-emergencia/meu;
//  - desde 16/11/2026 (commit 5690563 do Java) o cidadao tambem cria, edita e exclui os proprios
//    contatos; ate 10 por perfil (409 no 11o).

import type { ClienteHttp } from '../cliente-http';
import { ErroApi } from '../erro';
import type { Contato, ContatosApi } from '../types';
import { paraPagina, type PaginaDoJava } from './pagina-do-java';

interface PerfilDoJava {
  id: number;
}

export function criarContatosApiReal(cliente: ClienteHttp): ContatosApi {
  // Pergunta ao Java qual e o perfil do usuario logado. Sem cache de proposito: se a pessoa sair
  // e outra entrar, um id guardado apontaria para o perfil errado.
  const caminhoDosContatos = async () => {
    const perfil = await cliente.get<PerfilDoJava>('/api/v1/perfis-emergencia/meu');
    return `/api/v1/perfis-emergencia/${perfil.id}/contatos`;
  };

  return {
    // O Spring (Pageable) conta as paginas a partir de 0 e o app, a partir de 1, e os nomes dos
    // campos tambem mudam (conteudo, totalElementos). A conversao fica em paraPagina, para as
    // telas nunca precisarem saber disso.
    async listar(pagina, tamanho) {
      let caminho: string;
      try {
        caminho = await caminhoDosContatos();
      } catch (erro) {
        // Sem perfil (404), quem e cidadao ainda nao tem contatos: so o cuidador cria o perfil.
        if (erro instanceof ErroApi && erro.status === 404) {
          return { itens: [], pagina, tamanho, total: 0 };
        }
        throw erro;
      }
      const resultado = await cliente.get<PaginaDoJava<Contato>>(
        `${caminho}?page=${pagina - 1}&size=${tamanho}`,
      );
      return paraPagina(resultado);
    },

    async obter(id) {
      return cliente.get<Contato>(`${await caminhoDosContatos()}/${id}`);
    },

    async criar(dados) {
      return cliente.post<Contato>(await caminhoDosContatos(), dados);
    },

    async editar(id, dados) {
      return cliente.put<Contato>(`${await caminhoDosContatos()}/${id}`, dados);
    },

    async excluir(id) {
      await cliente.delete<void>(`${await caminhoDosContatos()}/${id}`);
    },
  };
}
