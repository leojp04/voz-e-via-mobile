// Configuracao dinamica do Expo. O Expo le o app.json primeiro e entrega o conteudo dele em
// "config"; aqui so acrescentamos o hash do commit, calculado no momento do build. Assim a versao
// distribuida (Firebase) carrega o hash do codigo que a gerou. Ver docs/adr/0006.

import type { ConfigContext, ExpoConfig } from 'expo/config';
import { execFileSync } from 'node:child_process';

import { calcularHashDoCommit } from './hash-do-commit';

const rodarGit = (args: string[]) =>
  execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'Voz & Via',
  slug: config.slug ?? 'voz-e-via-mobile',
  extra: { ...config.extra, commitHash: calcularHashDoCommit(rodarGit) },
});
