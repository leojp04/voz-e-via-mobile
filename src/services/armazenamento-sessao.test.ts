import { criarArmazenamentoSecureStore } from './armazenamento-sessao';
import type { Sessao } from './api/types';

// O SecureStore real so existe no aparelho (Keychain/Keystore); aqui o trocamos por um Map.
const mockCofre = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (chave: string) => mockCofre.get(chave) ?? null),
  setItemAsync: jest.fn(async (chave: string, valor: string) => {
    mockCofre.set(chave, valor);
  }),
  deleteItemAsync: jest.fn(async (chave: string) => {
    mockCofre.delete(chave);
  }),
}));

const sessao: Sessao = {
  token: 'tok-123',
  expiraEm: '2030-01-01T00:00:00.000Z',
  usuario: { id: 1, nome: 'Maria', role: 'CIDADAO' },
};

beforeEach(() => mockCofre.clear());

describe('criarArmazenamentoSecureStore', () => {
  it('devolve null quando nao ha sessao guardada', async () => {
    expect(await criarArmazenamentoSecureStore().ler()).toBeNull();
  });

  it('guarda a sessao e a le de volta igual', async () => {
    const armazenamento = criarArmazenamentoSecureStore();
    await armazenamento.salvar(sessao);
    expect(await armazenamento.ler()).toEqual(sessao);
  });

  it('apaga a sessao guardada', async () => {
    const armazenamento = criarArmazenamentoSecureStore();
    await armazenamento.salvar(sessao);
    await armazenamento.apagar();
    expect(await armazenamento.ler()).toBeNull();
    expect(mockCofre.size).toBe(0);
  });

  it('trata conteudo corrompido como sem sessao', async () => {
    const armazenamento = criarArmazenamentoSecureStore();
    await armazenamento.salvar(sessao);
    mockCofre.set([...mockCofre.keys()][0], 'isto-nao-e-json');
    expect(await armazenamento.ler()).toBeNull();
  });

  it('trata JSON sem o formato de sessao como sem sessao', async () => {
    const armazenamento = criarArmazenamentoSecureStore();
    await armazenamento.salvar(sessao);
    mockCofre.set([...mockCofre.keys()][0], JSON.stringify({ qualquer: 'coisa' }));
    expect(await armazenamento.ler()).toBeNull();
  });
});
