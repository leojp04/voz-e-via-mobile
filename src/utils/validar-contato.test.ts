import { validarContato } from './validar-contato';

const valido = {
  nome: 'Marina Souza',
  apelido: 'filha',
  telefone: '(11) 98888-7777',
  prioridade: 1,
};

describe('validarContato', () => {
  it('nao acusa erro quando tudo esta certo', () => {
    expect(validarContato(valido)).toEqual({});
  });

  it('aceita telefone fixo, com ou sem mascara', () => {
    expect(validarContato({ ...valido, telefone: '1133334444' })).toEqual({});
    expect(validarContato({ ...valido, telefone: '(11) 3333-4444' })).toEqual({});
  });

  it('pede o nome com pelo menos 2 letras, ignorando espacos nas pontas', () => {
    expect(validarContato({ ...valido, nome: ' A ' }).nome).toBeDefined();
    expect(validarContato({ ...valido, nome: '' }).nome).toBeDefined();
  });

  it('limita o nome a 80 e o apelido a 30 letras', () => {
    expect(validarContato({ ...valido, nome: 'a'.repeat(81) }).nome).toBeDefined();
    expect(validarContato({ ...valido, apelido: 'a'.repeat(31) }).apelido).toBeDefined();
    expect(validarContato({ ...valido, apelido: 'a'.repeat(30) }).apelido).toBeUndefined();
  });

  it('exige apelido', () => {
    expect(validarContato({ ...valido, apelido: '  ' }).apelido).toBeDefined();
  });

  it('exige telefone com DDD (10 ou 11 numeros)', () => {
    expect(validarContato({ ...valido, telefone: '98888777' }).telefone).toBeDefined();
    expect(validarContato({ ...valido, telefone: '119888877770' }).telefone).toBeDefined();
  });

  it('exige prioridade de 1 a 5', () => {
    expect(validarContato({ ...valido, prioridade: 0 }).prioridade).toBeDefined();
    expect(validarContato({ ...valido, prioridade: 6 }).prioridade).toBeDefined();
    expect(validarContato({ ...valido, prioridade: 5 }).prioridade).toBeUndefined();
  });
});
