// Monta os "provedores" da raiz do app: APIs + sessao, ligados um ao outro.
//
// O problema: o AuthProvider precisa da API de login (criada por criarApis), e a criarApis
// precisa saber o token atual e o que fazer num 401, coisas que o proprio AuthProvider tem.
// Cada um depende do outro. A saida e uma "ponte" (um useRef, uma caixinha mutavel): criarApis
// recebe funcoes que olham a ponte, e um componente dentro do AuthProvider preenche a ponte.
// As funcoes so rodam depois de uma chamada de rede, quando a ponte ja esta preenchida.

import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { criarApis } from '../services/api/fabrica';
import {
  criarArmazenamentoSecureStore,
  type ArmazenamentoSessao,
} from '../services/armazenamento-sessao';
import { ApisProvider } from './ApisContext';
import { AuthProvider, useAuth, type ValorAuth } from './AuthContext';

type DadosPonte = Pick<ValorAuth, 'obterToken' | 'logout'>;

// A ponte guarda, numa variavel fechada, a sessao atual (preenchida por LigaPonte) e expoe as
// duas funcoes que a criarApis precisa. Antes de ser preenchida, age como "sem sessao".
function criarPonte() {
  let atual: DadosPonte | null = null;
  return {
    ligar(dados: DadosPonte | null) {
      atual = dados;
    },
    obterToken: () => atual?.obterToken() ?? null,
    // 401 numa chamada com token = sessao vencida: sai do app. O catch evita um erro solto
    // se apagar o token do cofre falhar (a sessao em memoria ja foi zerada).
    aoNaoAutorizado: () => {
      void atual?.logout().catch(() => {});
    },
  };
}

type Ponte = ReturnType<typeof criarPonte>;

interface PropsAppProviders {
  /** true = API falsa em memoria (EXPO_PUBLIC_USE_FAKE_API). */
  usarApiFalsa: boolean;
  /** Endereco da API Java (login, cadastro, assistente). */
  urlJava: string;
  /** Endereco da API .NET (reportes e fotos). */
  urlDotnet: string;
  /** Troca do cofre da sessao; so os testes usam (o padrao e o SecureStore). */
  armazenamento?: ArmazenamentoSessao;
  /** Troca do fetch; so os testes usam. */
  fetchImpl?: typeof fetch;
  children: ReactNode;
}

// Preenche a ponte com o token e o logout da sessao atual. Fica DENTRO do AuthProvider para
// poder usar useAuth(), e escreve na ponte num efeito (nunca durante a renderizacao).
function LigaPonte({ ponte, children }: { ponte: Ponte; children: ReactNode }) {
  const { obterToken, logout } = useAuth();
  useEffect(() => {
    ponte.ligar({ obterToken, logout });
    return () => ponte.ligar(null);
  }, [ponte, obterToken, logout]);
  return <>{children}</>;
}

export function AppProviders({
  usarApiFalsa,
  urlJava,
  urlDotnet,
  armazenamento,
  fetchImpl,
  children,
}: PropsAppProviders) {
  const [ponte] = useState(criarPonte);

  const apis = useMemo(
    () =>
      criarApis({
        usarApiFalsa,
        urlJava,
        urlDotnet,
        fetchImpl,
        obterToken: ponte.obterToken,
        aoNaoAutorizado: ponte.aoNaoAutorizado,
      }),
    [usarApiFalsa, urlJava, urlDotnet, fetchImpl, ponte],
  );

  const cofre = useMemo(() => armazenamento ?? criarArmazenamentoSecureStore(), [armazenamento]);

  return (
    <ApisProvider apis={apis}>
      <AuthProvider api={apis.auth} armazenamento={cofre}>
        <LigaPonte ponte={ponte}>{children}</LigaPonte>
      </AuthProvider>
    </ApisProvider>
  );
}
