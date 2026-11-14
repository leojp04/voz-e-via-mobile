import { formatarTelefone } from './formatar-telefone';

describe('formatarTelefone', () => {
  it('formata celular (11 digitos)', () => {
    expect(formatarTelefone('11988887777')).toBe('(11) 98888-7777');
  });

  it('formata telefone fixo (10 digitos)', () => {
    expect(formatarTelefone('1133334444')).toBe('(11) 3333-4444');
  });

  it('aceita o que ja vem com mascara', () => {
    expect(formatarTelefone('(11) 98888-7777')).toBe('(11) 98888-7777');
  });

  it('formata aos poucos enquanto a pessoa digita', () => {
    expect(formatarTelefone('')).toBe('');
    expect(formatarTelefone('1')).toBe('(1');
    expect(formatarTelefone('11')).toBe('(11');
    expect(formatarTelefone('119')).toBe('(11) 9');
    expect(formatarTelefone('1198888')).toBe('(11) 9888-8');
    expect(formatarTelefone('11988887')).toBe('(11) 9888-87');
  });

  it('ignora letras e o que passa de 11 digitos', () => {
    expect(formatarTelefone('abc11988887777999')).toBe('(11) 98888-7777');
  });
});
