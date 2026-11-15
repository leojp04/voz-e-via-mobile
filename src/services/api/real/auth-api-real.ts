// API de autenticacao REAL: fala com a API Java pelo cliente HTTP (docs/adr/0002).
// Implementa o mesmo contrato AuthApi da API falsa, entao as telas nao percebem a troca.
// Caminhos e campos conferidos na API Java rodando (repositorio vivavoz): prefixo /api/v1, o token
// vem em "accessToken" e o papel em "papel". O app usa "token" e "role", entao a traducao fica so aqui.

import type { ClienteHttp } from '../cliente-http';
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

export function criarAuthApiReal(cliente: ClienteHttp): AuthApi {
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

    // A confirmar com o time Java: esse endpoint ainda nao existe no repositorio deles (pedido
    // enviado). O token vem como argumento (contrato AuthApi), entao vai direto nesta chamada.
    excluirConta: (token) => cliente.delete<void>('/api/v1/auth/eu', { token }),
  };
}
