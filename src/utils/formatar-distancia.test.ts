import { formatarDistancia } from './formatar-distancia';

describe('formatarDistancia', () => {
  it('mostra metros, arredondados de 10 em 10, abaixo de 1 km', () => {
    expect(formatarDistancia(350)).toBe('350 m');
    expect(formatarDistancia(347)).toBe('350 m');
    expect(formatarDistancia(0)).toBe('0 m');
  });

  it('distancia maior que zero nunca vira "0 m": o minimo mostrado e 10 m', () => {
    expect(formatarDistancia(1)).toBe('10 m');
    expect(formatarDistancia(4)).toBe('10 m');
    expect(formatarDistancia(0.4)).toBe('10 m');
  });

  it('mostra km com uma casa e virgula a partir de 1 km', () => {
    expect(formatarDistancia(1000)).toBe('1 km');
    expect(formatarDistancia(1250)).toBe('1,3 km');
    expect(formatarDistancia(12340)).toBe('12,3 km');
  });

  it('nao mostra 1000 m: 996 m ja vira 1 km', () => {
    expect(formatarDistancia(996)).toBe('1 km');
  });

  it('valor invalido ou negativo devolve texto vazio', () => {
    expect(formatarDistancia(Number.NaN)).toBe('');
    expect(formatarDistancia(-5)).toBe('');
  });
});
