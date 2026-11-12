import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ErroApi } from '../services/api/erro';
import type { Sessao } from '../services/api/types';
import type { ArmazenamentoSessao } from '../services/armazenamento-sessao';
import { useApis } from './ApisContext';
import { AppProviders } from './AppProviders';
import { useAuth } from './AuthContext';

const sessaoValida: Sessao = {
  token: 'tok-123',
  expiraEm: '2999-01-01T00:00:00.000Z',
  usuario: { id: 1, nome: 'Maria', role: 'CIDADAO' },
};

function criarArmazenamentoEmMemoria(): ArmazenamentoSessao {
  let guardada: Sessao | null = null;
  return {
    ler: jest.fn(async () => guardada),
    salvar: jest.fn(async (s: Sessao) => {
      guardada = s;
    }),
    apagar: jest.fn(async () => {
      guardada = null;
    }),
  };
}

function resposta(status: number, corpo?: unknown) {
  return new Response(corpo === undefined ? undefined : JSON.stringify(corpo), { status });
}

// Servidor falso: o login responde 200 (ou 401, se loginOk for false) e qualquer outra rota
// responde 401, como faria a API Java com um token vencido.
function criarFetchFalso(loginOk: boolean) {
  return jest.fn(async (url: string) =>
    url.endsWith('/api/auth/login')
      ? loginOk
        ? resposta(200, sessaoValida)
        : resposta(401, { mensagem: 'E-mail ou senha incorretos.' })
      : resposta(401, { mensagem: 'Sessao vencida.' }),
  );
}

function montar(fetchImpl: jest.Mock, armazenamento: ArmazenamentoSessao) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AppProviders
      usarApiFalsa={false}
      urlJava="http://localhost:8080"
      armazenamento={armazenamento}
      fetchImpl={fetchImpl as unknown as typeof fetch}
    >
      {children}
    </AppProviders>
  );
  return renderHook(() => ({ auth: useAuth(), apis: useApis() }), { wrapper });
}

describe('AppProviders', () => {
  it('derruba a sessao quando uma chamada COM token recebe 401', async () => {
    const armazenamento = criarArmazenamentoEmMemoria();
    const { result } = await montar(criarFetchFalso(true), armazenamento);
    await waitFor(() => expect(result.current.auth.status).toBe('anonimo'));

    await act(async () => {
      await result.current.auth.login('maria@exemplo.com', 'Senha@123');
    });
    expect(result.current.auth.status).toBe('autenticado');

    await act(async () => {
      await expect(result.current.apis.auth.excluirConta('tok-123')).rejects.toBeInstanceOf(
        ErroApi,
      );
    });

    await waitFor(() => expect(result.current.auth.status).toBe('anonimo'));
    expect(result.current.auth.sessao).toBeNull();
    expect(armazenamento.apagar).toHaveBeenCalled();
  });

  it('NAO faz logout quando o 401 vem de uma chamada sem token (login errado)', async () => {
    const armazenamento = criarArmazenamentoEmMemoria();
    const { result } = await montar(criarFetchFalso(false), armazenamento);
    await waitFor(() => expect(result.current.auth.status).toBe('anonimo'));

    await act(async () => {
      await expect(result.current.auth.login('maria@exemplo.com', 'errada')).rejects.toMatchObject({
        status: 401,
      });
    });

    expect(result.current.auth.status).toBe('anonimo');
    expect(armazenamento.apagar).not.toHaveBeenCalled();
  });

  it('as APIs enviam o token da sessao atual nas chamadas seguintes ao login', async () => {
    const fetchImpl = criarFetchFalso(true);
    const { result } = await montar(fetchImpl, criarArmazenamentoEmMemoria());
    await waitFor(() => expect(result.current.auth.status).toBe('anonimo'));
    await act(async () => {
      await result.current.auth.login('maria@exemplo.com', 'Senha@123');
    });

    await act(async () => {
      await result.current.apis.auth.excluirConta(sessaoValida.token).catch(() => {});
    });

    const [, init] = fetchImpl.mock.calls[1] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok-123');
  });
});

describe('useApis', () => {
  it('lanca um erro claro quando usado fora de um <ApisProvider>', async () => {
    const silenciar = jest.spyOn(console, 'error').mockImplementation(() => {});
    // No RNTL 14 o renderHook e assincrono: o erro de render chega como promessa rejeitada.
    await expect(renderHook(() => useApis())).rejects.toThrow(/ApisProvider/);
    silenciar.mockRestore();
  });
});
