import { gerarUuid } from './gerar-uuid';

const FORMATO_UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('gerarUuid', () => {
  it('gera um UUID v4 (o formato do Idempotency-Key)', () => {
    expect(gerarUuid()).toMatch(FORMATO_UUID_V4);
  });

  it('cada chamada gera um valor diferente', () => {
    const valores = new Set(Array.from({ length: 500 }, () => gerarUuid()));
    expect(valores.size).toBe(500);
  });

  // Nem todo aparelho tem crypto.randomUUID: sem ele, o app ainda precisa de uma chave valida.
  describe('sem crypto.randomUUID', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

    beforeEach(() => {
      Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
    });

    afterEach(() => {
      if (original) Object.defineProperty(globalThis, 'crypto', original);
    });

    it('ainda gera um UUID v4 valido e diferente a cada vez', () => {
      const a = gerarUuid();
      const b = gerarUuid();
      expect(a).toMatch(FORMATO_UUID_V4);
      expect(b).toMatch(FORMATO_UUID_V4);
      expect(a).not.toBe(b);
    });
  });
});
