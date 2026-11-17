// API de autenticacao REAL: fala com a API Java pelo cliente HTTP (docs/adr/0002). So a exclusao de
// conta tambem fala com a API .NET (ver excluirConta).
// Implementa o mesmo contrato AuthApi da API falsa, entao as telas nao percebem a troca.
// Caminhos e campos conferidos na API Java rodando (repositorio vivavoz): prefixo /api/v1, o token
// vem em "accessToken" e o papel em "papel". O app usa "token" e "role", entao a traducao fica so aqui.

import type { ClienteHttp } from '../cliente-http';
import { ehErroApi, ErroExclusaoParcial } from '../erro';
import type { AuthApi, DadosCadastro, Papel, Sessao, Usuario } from '../types';

interface UsuarioDoJava {
  id: number;
  nome: string;
  email: string;
  papel: Papel;
}

interface LoginDoJava {
  accessToken: string;
  tokenType: string;
  expiraEm: string;
  usuario: UsuarioDoJava;
}

function paraUsuario({ id, nome, papel }: UsuarioDoJava): Usuario {
  return { id, nome, role: papel };
}

/**
 * @param cliente cliente da API Java (login, cadastro e a conta).
 * @param clienteDotnet cliente da API .NET; so a exclusao de conta usa (apaga os reportes de la).
 */
export function criarAuthApiReal(cliente: ClienteHttp, clienteDotnet: ClienteHttp): AuthApi {
  return {
    async login(email, senha): Promise<Sessao> {
      const resposta = await cliente.post<LoginDoJava>('/api/v1/auth/login', { email, senha });
      return {
        token: resposta.accessToken,
        expiraEm: resposta.expiraEm,
        usuario: paraUsuario(resposta.usuario),
      };
    },

    // O Java nao guarda o telefone do usuario (so dos contatos), entao ele nao sai do celular.
    async cadastrar({ nome, email, senha, role, consentimento }: DadosCadastro): Promise<Usuario> {
      const criado = await cliente.post<UsuarioDoJava>('/api/v1/auth/cadastro', {
        nome,
        email,
        senha,
        papel: role,
        consentimento,
      });
      return paraUsuario(criado);
    },

    // Exclui a conta nas DUAS APIs, nesta ordem (contrato do time .NET: "o app chama este endpoint
    // antes do DELETE /api/v1/auth/eu do Java, com o mesmo token"). O token vem como argumento
    // (contrato AuthApi), entao vai direto nas duas chamadas.
    //  1. .NET: apaga reportes, historico, fotos e cadastro de la, e passa a recusar o token (401).
    //  2. Java: apaga a conta, o perfil, os contatos, os socorros e o historico de voz.
    // O 401 do .NET (provado na API real) significa "ja excluida la": numa nova tentativa, depois de o
    // Java ter falhado, e preciso seguir para o Java sem deslogar o app (naoDeslogarEm401). Qualquer
    // outro erro do .NET para tudo, e nada foi apagado.
    async excluirConta(token): Promise<void> {
      let dotnetApagou = false;
      try {
        await clienteDotnet.delete<void>('/api/usuarios/eu', { token, naoDeslogarEm401: true });
        dotnetApagou = true;
      } catch (erro) {
        if (!(ehErroApi(erro) && erro.status === 401)) throw erro;
      }

      try {
        await cliente.delete<void>('/api/v1/auth/eu', { token });
      } catch (erro) {
        // Com o .NET ja apagado, a falha do Java deixa a exclusao pela metade e a tela precisa dizer isso.
        // Com 401 do .NET nao se sabe se apagou, entao o erro segue como veio.
        if (dotnetApagou && ehErroApi(erro)) throw new ErroExclusaoParcial(erro);
        throw erro;
      }
    },
  };
}
