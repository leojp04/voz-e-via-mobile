import type { DadosPerfil } from '../services/api/types';
import { validarPerfil } from './validar-perfil';

const vazio: DadosPerfil = {
  mobilidade: 'NAO_INFORMADO',
  condicoesSaude: null,
  medicamentos: null,
  observacoes: null,
};

describe('validarPerfil', () => {
  it('perfil todo em branco e valido (tudo e opcional)', () => {
    expect(validarPerfil(vazio)).toEqual({});
  });

  it('aceita textos de ate 500 caracteres', () => {
    expect(validarPerfil({ ...vazio, condicoesSaude: 'a'.repeat(500) })).toEqual({});
  });

  it('recusa texto com mais de 500 caracteres, dizendo qual campo', () => {
    const erros = validarPerfil({
      ...vazio,
      condicoesSaude: 'a'.repeat(501),
      medicamentos: 'b'.repeat(501),
      observacoes: 'c'.repeat(501),
    });
    expect(Object.keys(erros).sort()).toEqual(['condicoesSaude', 'medicamentos', 'observacoes']);
    expect(erros.medicamentos).toBe('Use até 500 letras neste campo.');
  });
});
