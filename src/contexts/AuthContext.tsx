// Contexto de autenticacao: guarda quem esta logado e oferece login e logout para todas as telas.
// Um "contexto" do React e uma caixa compartilhada: o AuthProvider fica na raiz do app e
// qualquer tela le a sessao com o hook useAuth(), sem passar props de tela em tela.
// A sessao persiste no SecureStore (ver docs/adr/0003) e e restaurada ao abrir o app.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { AuthApi, Sessao } from '../services/api/types';
import type { ArmazenamentoSessao } from '../services/armazenamento-sessao';

/** "carregando" = ainda lendo o cofre ao abrir o app (a tela mostra um indicador, sem piscar o login). */
export type StatusAuth = 'carregando' | 'autenticado' | 'anonimo';

export interface ValorAuth {
  status: StatusAuth;
  sessao: Sessao | null;
  login(email: string, senha: string): Promise<void>;
  /** Apaga o token do cofre e volta ao estado anonimo. */
  logout(): Promise<void>;
  /** Token atual, lido na hora (serve de "obterToken" para o cliente HTTP). */
  obterToken(): string | null;
}

interface PropsAuthProvider {
  api: AuthApi;
  armazenamento: ArmazenamentoSessao;
  children: ReactNode;
}

const AuthContext = createContext<ValorAuth | null>(null);

function sessaoVenceu(sessao: Sessao): boolean {
  const vencimento = Date.parse(sessao.expiraEm);
  // Data ilegivel (NaN) conta como vencida: na duvida, pede login de novo.
  return Number.isNaN(vencimento) || vencimento <= Date.now();
}

export function AuthProvider({ api, armazenamento, children }: PropsAuthProvider) {
  const [status, setStatus] = useState<StatusAuth>('carregando');
  const [sessao, setSessao] = useState<Sessao | null>(null);
  // Espelho da sessao em uma ref para o obterToken ser sincrono e nunca ficar defasado.
  const sessaoRef = useRef<Sessao | null>(null);

  const aplicarSessao = useCallback((nova: Sessao | null) => {
    sessaoRef.current = nova;
    setSessao(nova);
    setStatus(nova ? 'autenticado' : 'anonimo');
  }, []);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      let guardada: Sessao | null = null;
      try {
        guardada = await armazenamento.ler();
        if (guardada && sessaoVenceu(guardada)) {
          await armazenamento.apagar();
          guardada = null;
        }
      } catch {
        guardada = null;
      }
      if (!cancelado) aplicarSessao(guardada);
    })();
    return () => {
      cancelado = true;
    };
  }, [armazenamento, aplicarSessao]);

  const login = useCallback(
    async (email: string, senha: string) => {
      const nova = await api.login(email, senha);
      await armazenamento.salvar(nova);
      aplicarSessao(nova);
    },
    [api, armazenamento, aplicarSessao],
  );

  const logout = useCallback(async () => {
    // Zera a sessao em memoria primeiro: mesmo se apagar do cofre falhar, o app ja saiu.
    aplicarSessao(null);
    await armazenamento.apagar();
  }, [armazenamento, aplicarSessao]);

  const obterToken = useCallback(() => sessaoRef.current?.token ?? null, []);

  const valor = useMemo<ValorAuth>(
    () => ({ status, sessao, login, logout, obterToken }),
    [status, sessao, login, logout, obterToken],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth(): ValorAuth {
  const valor = useContext(AuthContext);
  if (!valor) {
    throw new Error('useAuth precisa estar dentro de um <AuthProvider>.');
  }
  return valor;
}
