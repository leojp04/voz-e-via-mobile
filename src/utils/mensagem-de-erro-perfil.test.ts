import { ErroApi } from '../services/api/erro';
import { mensagemDeErroAoSalvarPerfil } from './mensagem-de-erro';

describe('mensagemDeErroAoSalvarPerfil', () => {
  it.each([
    [0, 'Sem conexão. O perfil não foi salvo. Tente de novo.'],
    [400, 'Confira os dados do perfil. Ele não foi salvo.'],
    [404, 'Perfil não encontrado. Ele não foi salvo.'],
    [409, 'Você já tem um perfil. Abra "Meu perfil" para editar. Nada foi salvo.'],
    [500, 'O servidor está com problemas. O perfil não foi salvo. Tente de novo em instantes.'],
  ])('status %i diz que o perfil NAO foi salvo', (status, frase) => {
    expect(mensagemDeErroAoSalvarPerfil(new ErroApi(status, 'x'))).toBe(frase);
  });

  it('erro desconhecido tambem diz que nao salvou', () => {
    expect(mensagemDeErroAoSalvarPerfil(new Error('boom'))).toBe(
      'Não foi possível salvar o perfil. Tente de novo.',
    );
  });
});
