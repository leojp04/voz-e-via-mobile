import { calcularHashDoCommit } from './hash-do-commit';

// O "git" injetado recebe os argumentos (ex.: ['rev-parse', '--short', 'HEAD']) e devolve o texto
// que o comando imprimiria. Assim o teste não depende de ter Git nem do estado deste repositório.
function gitFalso(respostas: Record<string, string>) {
  return jest.fn((args: string[]) => {
    const resposta = respostas[args.join(' ')];
    if (resposta === undefined) throw new Error(`comando inesperado: ${args.join(' ')}`);
    return resposta;
  });
}

describe('calcularHashDoCommit', () => {
  it('devolve o hash curto do HEAD quando a árvore está limpa', () => {
    const git = gitFalso({ 'rev-parse --short HEAD': 'fcc8aaa\n', 'status --porcelain': '' });
    expect(calcularHashDoCommit(git)).toBe('fcc8aaa');
  });

  it('acrescenta -sujo quando há alterações não commitadas (o hash não pode mentir)', () => {
    const git = gitFalso({
      'rev-parse --short HEAD': 'fcc8aaa\n',
      'status --porcelain': ' M src/app/_layout.tsx\n',
    });
    expect(calcularHashDoCommit(git)).toBe('fcc8aaa-sujo');
  });

  it('devolve "desconhecido" quando o Git não está disponível', () => {
    const git = jest.fn(() => {
      throw new Error('git: command not found');
    });
    expect(calcularHashDoCommit(git)).toBe('desconhecido');
  });

  it('devolve "desconhecido" quando o Git responde vazio', () => {
    const git = gitFalso({ 'rev-parse --short HEAD': '\n', 'status --porcelain': '' });
    expect(calcularHashDoCommit(git)).toBe('desconhecido');
  });
});
