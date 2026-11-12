// Calcula o hash do commit que vira "extra.commitHash" no app.config.ts.
//
// Por que e um .js na raiz e nao um .ts em src/: o Expo so transpila o proprio app.config.ts, entao
// um "require" de outro .ts falha com "Cannot find module" (descoberto ao iniciar o app). Um .js em
// CommonJS o Node carrega direto. Ver docs/adr/0006. O "git" vem de fora (injetado) para o teste
// nao depender de ter Git instalado nem do estado do repositorio.

const DESCONHECIDO = 'desconhecido';

/**
 * Hash curto do HEAD. Se existirem alteracoes nao commitadas, ganha o sufixo "-sujo": assim a
 * tela "Sobre o App" nunca afirma que o app corresponde a um commit quando nao corresponde.
 *
 * @param {(args: string[]) => string} git roda "git <args>" e devolve o que o comando imprimiu;
 *   lanca erro se o Git falhar.
 * @returns {string}
 */
function calcularHashDoCommit(git) {
  try {
    const hash = git(['rev-parse', '--short', 'HEAD']).trim();
    if (!hash) return DESCONHECIDO;
    const temAlteracoes = git(['status', '--porcelain']).trim() !== '';
    return temAlteracoes ? `${hash}-sujo` : hash;
  } catch {
    return DESCONHECIDO;
  }
}

module.exports = { calcularHashDoCommit };
