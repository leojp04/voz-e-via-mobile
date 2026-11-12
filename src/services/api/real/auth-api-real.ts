// API de autenticacao REAL: fala com a API Java pelo cliente HTTP (docs/adr/0002).
// Implementa o mesmo contrato AuthApi da API falsa, entao as telas nao percebem a troca.
// Caminhos conforme o plano unico (secoes 6 e 8.1).

import type { ClienteHttp } from '../cliente-http';
import type { AuthApi, DadosCadastro, Sessao, Usuario } from '../types';

export function criarAuthApiReal(cliente: ClienteHttp): AuthApi {
  return {
    login: (email, senha) => cliente.post<Sessao>('/api/auth/login', { email, senha }),

    cadastrar: (dados: DadosCadastro) => cliente.post<Usuario>('/api/auth/cadastro', dados),

    // O token vem como argumento (contrato AuthApi), entao vai direto nesta chamada.
    excluirConta: (token) => cliente.delete<void>('/api/usuarios/me', { token }),
  };
}
