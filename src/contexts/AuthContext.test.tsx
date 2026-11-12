import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ErroApi } from '../services/api/erro';
import type { AuthApi, Sessao } from '../services/api/types';
import type { ArmazenamentoSessao } from '../services/armazenamento-sessao';
import { AuthProvider, useAuth } from './AuthContext';

const sessaoValida: Sessao = {
  token: 'tok-123',
  expiraEm: '2999-01-01T00:00:00.000Z',
  usuario: { id: 1, nome: 'Maria', role: 'CIDADAO' },
};

const sessaoVencida: Sessao = { ...sessaoValida, expiraEm: '2000-01-01T00:00:00.000Z' };

function criarArmazenamentoEmMemoria(inicial: Sessao | null = null) {
  let guardada = inicial;
  const armazenamento: ArmazenamentoSessao = {
    ler: jest.fn(async () => guardada),
    salvar: jest.fn(async (s: Sessao) => {
      guardada = s;
    }),
    apagar: jest.fn(async () => {
      guardada = null;
    }),
  };
  return { armazenamento, guardada: () => guardada };
}

function criarApi(login: AuthApi['login'] = async () => sessaoValida): AuthApi {
  return { login, cadastrar: jest.fn(), excluirConta: jest.fn() };
}

async function montar(api: AuthApi, armazenamento: ArmazenamentoSessao) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthProvider api={api} armazenamento={armazenamento}>
      {children}
    </AuthProvider>
  );
  return renderHook(() => useAuth(), { wrapper });
}

describe('AuthProvider', () => {
  it('fica "carregando" enquanto le o cofre e depois vira "anonimo" se nao ha sessao', async () => {
    // A leitura do cofre so termina quando liberarLeitura() for chamado.
    let liberarLeitura: () => void = () => {};
    const leituraLenta = new Promise<null>((resolver) => {
      liberarLeitura = () => resolver(null);
    });
    const { armazenamento } = criarArmazenamentoEmMemoria();
    armazenamento.ler = jest.fn(() => leituraLenta);

    const { result } = await montar(criarApi(), armazenamento);
    expect(result.current.status).toBe('carregando');

    await act(async () => liberarLeitura());
    await waitFor(() => expect(result.current.status).toBe('anonimo'));
    expect(result.current.sessao).toBeNull();
  });

  it('restaura a sessao guardada ao abrir o app', async () => {
    const { armazenamento } = criarArmazenamentoEmMemoria(sessaoValida);
    const { result } = await montar(criarApi(), armazenamento);

    await waitFor(() => expect(result.current.status).toBe('autenticado'));
    expect(result.current.sessao).toEqual(sessaoValida);
    expect(result.current.obterToken()).toBe('tok-123');
  });

  it('descarta e apaga uma sessao guardada que ja venceu', async () => {
    const { armazenamento, guardada } = criarArmazenamentoEmMemoria(sessaoVencida);
    const { result } = await montar(criarApi(), armazenamento);

    await waitFor(() => expect(result.current.status).toBe('anonimo'));
    expect(guardada()).toBeNull();
  });

  it('login guarda a sessao no armazenamento e passa a "autenticado"', async () => {
    const { armazenamento, guardada } = criarArmazenamentoEmMemoria();
    const { result } = await montar(criarApi(), armazenamento);
    await waitFor(() => expect(result.current.status).toBe('anonimo'));

    await act(async () => {
      await result.current.login('maria@exemplo.com', 'Senha@123');
    });

    expect(result.current.status).toBe('autenticado');
    expect(result.current.sessao).toEqual(sessaoValida);
    expect(guardada()).toEqual(sessaoValida);
  });

  it('login que falha repassa o erro e nao guarda nada', async () => {
    const api = criarApi(async () => {
      throw new ErroApi(401, 'E-mail ou senha incorretos.');
    });
    const { armazenamento, guardada } = criarArmazenamentoEmMemoria();
    const { result } = await montar(api, armazenamento);
    await waitFor(() => expect(result.current.status).toBe('anonimo'));

    let erro: unknown;
    await act(async () => {
      await result.current.login('maria@exemplo.com', 'errada').catch((e) => (erro = e));
    });

    expect(erro).toBeInstanceOf(ErroApi);
    expect((erro as ErroApi).status).toBe(401);
    expect(result.current.status).toBe('anonimo');
    expect(guardada()).toBeNull();
  });

  it('logout apaga o armazenamento e volta para "anonimo"', async () => {
    const { armazenamento, guardada } = criarArmazenamentoEmMemoria(sessaoValida);
    const { result } = await montar(criarApi(), armazenamento);
    await waitFor(() => expect(result.current.status).toBe('autenticado'));

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.status).toBe('anonimo');
    expect(result.current.sessao).toBeNull();
    expect(result.current.obterToken()).toBeNull();
    expect(guardada()).toBeNull();
  });
});

describe('useAuth', () => {
  it('lanca erro claro quando usado fora do AuthProvider', async () => {
    const consoleErro = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(renderHook(() => useAuth())).rejects.toThrow(/AuthProvider/);
    consoleErro.mockRestore();
  });
});
