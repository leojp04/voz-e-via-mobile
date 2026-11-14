import { validarCategoria, validarDescricaoDoReporte, validarLocalizacao } from './validators';

describe('validarDescricaoDoReporte', () => {
  it('aceita de 10 a 500 letras (mesma regra da API)', () => {
    expect(validarDescricaoDoReporte('A calçada está quebrada.')).toBeNull();
    expect(validarDescricaoDoReporte('a'.repeat(10))).toBeNull();
    expect(validarDescricaoDoReporte('a'.repeat(500))).toBeNull();
  });

  it('vazia ou so espacos: pede para descrever', () => {
    expect(validarDescricaoDoReporte('')).toBe('Descreva o problema.');
    expect(validarDescricaoDoReporte('     ')).toBe('Descreva o problema.');
  });

  it('curta demais: pede mais detalhe', () => {
    expect(validarDescricaoDoReporte('buraco')).toBe(
      'Descreva com pelo menos 10 letras, para a prefeitura entender.',
    );
  });

  it('o espaco nas pontas nao conta', () => {
    expect(validarDescricaoDoReporte('  buraco  ')).not.toBeNull();
  });

  it('longa demais: avisa o limite', () => {
    expect(validarDescricaoDoReporte('a'.repeat(501))).toBe(
      'A descrição pode ter no máximo 500 caracteres.',
    );
  });
});

describe('validarCategoria', () => {
  it('sem categoria escolhida: pede para escolher', () => {
    expect(validarCategoria(null)).toBe('Escolha uma categoria.');
  });

  it('com categoria escolhida: valido', () => {
    expect(validarCategoria(3)).toBeNull();
  });
});

describe('validarLocalizacao', () => {
  it('sem localizacao: explica como informar', () => {
    expect(validarLocalizacao(false)).toBe(
      'Toque em "Usar minha localização" para dizer onde está o problema.',
    );
  });

  it('com localizacao: valido', () => {
    expect(validarLocalizacao(true)).toBeNull();
  });
});
