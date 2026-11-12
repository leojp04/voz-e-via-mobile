import { lerInfoDoApp } from './info-do-app';

describe('lerInfoDoApp', () => {
  it('lê versão e hash da configuração do Expo', () => {
    expect(lerInfoDoApp({ version: '1.0.0', extra: { commitHash: 'fcc8aaa' } })).toEqual({
      versao: '1.0.0',
      commitHash: 'fcc8aaa',
    });
  });

  it('sem configuração, usa valores que deixam claro que faltam dados', () => {
    expect(lerInfoDoApp(null)).toEqual({ versao: 'desconhecida', commitHash: 'desconhecido' });
    expect(lerInfoDoApp(undefined)).toEqual({ versao: 'desconhecida', commitHash: 'desconhecido' });
  });

  it('ignora um hash que não seja texto', () => {
    expect(lerInfoDoApp({ version: '1.0.0', extra: { commitHash: 42 } }).commitHash).toBe(
      'desconhecido',
    );
  });
});
