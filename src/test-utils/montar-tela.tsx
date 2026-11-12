// Ajudantes SO para testes das telas: monta o roteador de verdade (expo-router/testing-library)
// com o AuthProvider e o ApisProvider reais, trocando apenas a API de autenticacao por uma
// versao controlada pelo teste (jest.fn). Assim o teste prova o que a tela envia e como reage
// aos erros, sem rede e sem SecureStore.

import { Slot } from 'expo-router';
import { renderRouter, screen, waitFor } from 'expo-router/testing-library';
import type { ReactElement } from 'react';
import { Text } from 'react-native';

import { ApisProvider } from '../contexts/ApisContext';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import type { AuthApi, Sessao } from '../services/api/types';
import type { ArmazenamentoSessao } from '../services/armazenamento-sessao';

export const sessaoDeTeste: Sessao = {
  token: 'tok-123',
  expiraEm: '2999-01-01T00:00:00.000Z',
  usuario: { id: 1, nome: 'Maria', role: 'CIDADAO' },
};

export function criarAuthApiMock(): jest.Mocked<AuthApi> {
  return { login: jest.fn(), cadastrar: jest.fn(), excluirConta: jest.fn() };
}

export function criarArmazenamentoEmMemoria(inicial: Sessao | null = null): ArmazenamentoSessao {
  let guardada = inicial;
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

// Mostra o status da sessao na tela (testID "status") para o teste conferir login e logout.
function EstadoDaSessao() {
  const { status } = useAuth();
  return <Text testID="status">{status}</Text>;
}

// O renderRouter so aceita telas escritas como funcao simples (sem props).
type Componente = () => ReactElement | null;

interface OpcoesMontagem {
  auth: AuthApi;
  armazenamento?: ArmazenamentoSessao;
  /** Rotas extras (alem de "index"), para testar navegacao entre telas. */
  rotas?: Record<string, Componente>;
  url?: string;
}

/** Monta a tela na rota "index" e espera a sessao terminar de carregar. */
export async function montarTela(Tela: Componente, opcoes: OpcoesMontagem) {
  const armazenamento = opcoes.armazenamento ?? criarArmazenamentoEmMemoria();
  await renderRouter(
    {
      _layout: () => (
        <ApisProvider apis={{ auth: opcoes.auth }}>
          <AuthProvider api={opcoes.auth} armazenamento={armazenamento}>
            <EstadoDaSessao />
            <Slot />
          </AuthProvider>
        </ApisProvider>
      ),
      index: Tela,
      ...opcoes.rotas,
    },
    { initialUrl: opcoes.url ?? '/' },
  );
  await waitFor(() => expect(screen.getByTestId('status')).not.toHaveTextContent('carregando'));
  return { armazenamento };
}
