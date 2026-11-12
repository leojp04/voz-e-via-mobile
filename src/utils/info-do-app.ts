// Le versao e hash do commit da configuracao do Expo (preenchida em app.config.ts no build).
// Recebe a configuracao como argumento para ser testavel; a tela passa Constants.expoConfig.

export interface InfoDoApp {
  versao: string;
  commitHash: string;
}

interface ConfigDoApp {
  version?: string;
  extra?: Record<string, unknown>;
}

export function lerInfoDoApp(config: ConfigDoApp | null | undefined): InfoDoApp {
  const hash = config?.extra?.commitHash;
  return {
    versao: config?.version ?? 'desconhecida',
    commitHash: typeof hash === 'string' && hash !== '' ? hash : 'desconhecido',
  };
}
