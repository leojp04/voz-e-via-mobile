// API de autenticacao FALSA, em memoria. Serve so para desenvolver e testar o app antes de a
// API Java existir (ver docs/adr/0004). Os dados somem quando o app fecha.
// Aqui a senha fica em texto puro por simplicidade; a API real guarda apenas o hash (BCrypt).

import { ErroApi } from '../erro';
import type { AuthApi, DadosCadastro, Sessao, Usuario } from '../types';

interface UsuarioArmazenado extends Usuario {
  email: string;
  senha: string;
}

interface Opcoes {
  /** Atraso simulado em milissegundos, para ver os indicadores de carregamento. */
  latenciaMs?: number;
}

const VALIDADE_DO_TOKEN_MS = 60 * 60 * 1000;
const MENSAGEM_LOGIN_INVALIDO = 'E-mail ou senha incorretos.';

function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function criarAuthApiFalsa({ latenciaMs = 0 }: Opcoes = {}): AuthApi {
  const usuarios = new Map<number, UsuarioArmazenado>();
  const tokens = new Map<string, number>();
  let proximoId = 1;

  const esperar = () => (latenciaMs > 0 ? new Promise((r) => setTimeout(r, latenciaMs)) : null);

  const acharPorEmail = (email: string) =>
    [...usuarios.values()].find((u) => u.email === normalizarEmail(email));

  return {
    async login(email, senha): Promise<Sessao> {
      await esperar();
      const usuario = acharPorEmail(email);
      if (!usuario || usuario.senha !== senha) {
        throw new ErroApi(401, MENSAGEM_LOGIN_INVALIDO);
      }
      const token = `fake-token-${usuario.id}-${Math.random().toString(36).slice(2)}`;
      tokens.set(token, usuario.id);
      return {
        token,
        expiraEm: new Date(Date.now() + VALIDADE_DO_TOKEN_MS).toISOString(),
        usuario: { id: usuario.id, nome: usuario.nome, role: usuario.role },
      };
    },

    async cadastrar(dados: DadosCadastro): Promise<Usuario> {
      await esperar();
      if (!dados.consentimento) {
        throw new ErroApi(400, 'Dados inválidos.', {
          consentimento: 'É preciso aceitar o uso dos dados.',
        });
      }
      if (acharPorEmail(dados.email)) {
        throw new ErroApi(409, 'Este e-mail já está cadastrado.');
      }
      const id = proximoId++;
      usuarios.set(id, {
        id,
        nome: dados.nome.trim(),
        role: dados.role,
        email: normalizarEmail(dados.email),
        senha: dados.senha,
      });
      return { id, nome: dados.nome.trim(), role: dados.role };
    },

    async excluirConta(token): Promise<void> {
      await esperar();
      const id = tokens.get(token);
      if (id === undefined || !usuarios.has(id)) {
        throw new ErroApi(401, 'Sessão inválida. Entre novamente.');
      }
      usuarios.delete(id);
      for (const [t, dono] of tokens) {
        if (dono === id) tokens.delete(t);
      }
    },
  };
}
