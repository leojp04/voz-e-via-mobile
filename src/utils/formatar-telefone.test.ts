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

  it('tira o codigo do pais (+55) de um numero colado, sem trocar o destino da ligacao', () => {
    expect(formatarTelefone('+55 (11) 98888-7777')).toBe('(11) 98888-7777');
    expect(formatarTelefone('5511988887777')).toBe('(11) 98888-7777');
    expect(formatarTelefone('551133334444')).toBe('(11) 3333-4444');
  });

  it('com DDD 55 (RS), um numero de 11 digitos continua inteiro', () => {
    expect(formatarTelefone('55988887777')).toBe('(55) 98888-7777');
  });
});
