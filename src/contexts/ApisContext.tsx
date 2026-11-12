// Contexto das APIs: entrega o objeto "Apis" (auth e, nas proximas etapas, reportes e contatos)
// a qualquer tela com o hook useApis(). A tela nao sabe se recebe a API real ou a falsa:
// quem decide isso e a fabrica (ver services/api/fabrica.ts e docs/adr/0004).

import { createContext, useContext, type ReactNode } from 'react';

import type { Apis } from '../services/api/fabrica';

const ApisContext = createContext<Apis | null>(null);

interface PropsApisProvider {
  apis: Apis;
  children: ReactNode;
}

export function ApisProvider({ apis, children }: PropsApisProvider) {
  return <ApisContext.Provider value={apis}>{children}</ApisContext.Provider>;
}

export function useApis(): Apis {
  const apis = useContext(ApisContext);
  if (!apis) {
    throw new Error('useApis precisa estar dentro de um <ApisProvider>.');
  }
  return apis;
}
