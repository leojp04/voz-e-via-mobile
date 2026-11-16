import { validarContato } from './validar-contato';

// Mesmas regras do ContatoEmergenciaRequest do Java: nome ate 120, telefone BR com DDD, parentesco
// opcional ate 60 e prioridade de 1 a 10. Quem decide de verdade e a API; aqui so se ajuda a
// pessoa a corrigir cedo.
const valido = {
  nome: 'Marina Souza',
  parentesco: 'filha' as string | null,
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

  it('limita o nome a 120 letras', () => {
    expect(validarContato({ ...valido, nome: 'a'.repeat(121) }).nome).toBeDefined();
    expect(validarContato({ ...valido, nome: 'a'.repeat(120) }).nome).toBeUndefined();
  });

  it('parentesco e opcional: vazio, so espacos ou nulo passam', () => {
    expect(validarContato({ ...valido, parentesco: null })).toEqual({});
    expect(validarContato({ ...valido, parentesco: '' })).toEqual({});
    expect(validarContato({ ...valido, parentesco: '   ' })).toEqual({});
  });

  it('limita o parentesco a 60 letras', () => {
    expect(validarContato({ ...valido, parentesco: 'a'.repeat(61) }).parentesco).toBeDefined();
    expect(validarContato({ ...valido, parentesco: 'a'.repeat(60) }).parentesco).toBeUndefined();
  });

  it('exige telefone com DDD (10 ou 11 numeros)', () => {
    expect(validarContato({ ...valido, telefone: '98888777' }).telefone).toBeDefined();
    expect(validarContato({ ...valido, telefone: '119888877770' }).telefone).toBeDefined();
  });

  it('exige prioridade de 1 a 10', () => {
    expect(validarContato({ ...valido, prioridade: 0 }).prioridade).toBeDefined();
    expect(validarContato({ ...valido, prioridade: 11 }).prioridade).toBeDefined();
    expect(validarContato({ ...valido, prioridade: 10 }).prioridade).toBeUndefined();
    expect(validarContato({ ...valido, prioridade: 1.5 }).prioridade).toBeDefined();
  });
});
