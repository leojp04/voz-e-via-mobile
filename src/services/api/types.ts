// Contrato da API de autenticacao (API Java), conforme a secao 6 do plano unico.
// A API real e a API falsa implementam esta mesma interface, entao as telas nao sabem qual usam.

export type Papel = 'CIDADAO' | 'CUIDADOR' | 'GESTOR';

export interface Usuario {
  id: number;
  nome: string;
  role: Papel;
}

export interface Sessao {
  token: string;
  /** Data de vencimento do token, em texto ISO 8601. */
  expiraEm: string;
  usuario: Usuario;
}

export interface DadosCadastro {
  nome: string;
  email: string;
  telefone: string;
  senha: string;
  /** O gestor nao se cadastra pelo app (e criado por script no banco). */
  role: 'CIDADAO' | 'CUIDADOR';
  consentimento: boolean;
}

export interface AuthApi {
  /** Erros: 401 (e-mail ou senha errados), 0 (sem conexao). */
  login(email: string, senha: string): Promise<Sessao>;
  /** Erros: 400 (dados invalidos), 409 (e-mail ja cadastrado), 0 (sem conexao). */
  cadastrar(dados: DadosCadastro): Promise<Usuario>;
  /** Exclui a propria conta (direito do titular na LGPD). Erro: 401 (token invalido). */
  excluirConta(token: string): Promise<void>;
}
