import { fireEvent, render, screen } from '@testing-library/react-native';

import { CampoDeFoto } from './CampoDeFoto';

const foto = { uri: 'file:///cache/foto.jpg', nome: 'foto.jpg', tipo: 'image/jpeg' };

function montar(extras: Partial<Parameters<typeof CampoDeFoto>[0]> = {}) {
  const props = {
    foto: null,
    aoTirarFoto: jest.fn(),
    aoEscolherDaGaleria: jest.fn(),
    aoRemover: jest.fn(),
    ...extras,
  };
  return { props, pronto: render(<CampoDeFoto {...props} />) };
}

describe('CampoDeFoto', () => {
  it('mostra o rotulo "Foto (opcional)" e os dois caminhos: camera e galeria', async () => {
    await montar().pronto;
    expect(screen.getByText('Foto (opcional)')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Tirar foto' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Escolher da galeria' })).toBeOnTheScreen();
  });

  it('sem foto: nao mostra imagem nem o botao de remover', async () => {
    await montar().pronto;
    expect(screen.queryByLabelText('Foto do problema')).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Remover foto' })).not.toBeOnTheScreen();
  });

  it('com foto: mostra a imagem (descrita para o leitor de tela) e o botao de remover', async () => {
    await montar({ foto }).pronto;
    const imagem = screen.getByLabelText('Foto do problema');
    expect(imagem.props.source).toEqual({ uri: foto.uri });
    expect(screen.getByRole('button', { name: 'Remover foto' })).toBeOnTheScreen();
  });

  it('cada botao chama a sua acao', async () => {
    const { props, pronto } = montar({ foto });
    await pronto;
    await fireEvent.press(screen.getByRole('button', { name: 'Tirar foto' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Escolher da galeria' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Remover foto' }));
    expect(props.aoTirarFoto).toHaveBeenCalledTimes(1);
    expect(props.aoEscolherDaGaleria).toHaveBeenCalledTimes(1);
    expect(props.aoRemover).toHaveBeenCalledTimes(1);
  });

  it('ocupado (ex.: enviando): os botoes ficam desabilitados', async () => {
    await montar({ foto, ocupado: true }).pronto;
    expect(screen.getByRole('button', { name: 'Tirar foto' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Escolher da galeria' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remover foto' })).toBeDisabled();
  });

  it('mostra o erro como alerta', async () => {
    await montar({ erro: 'A câmera não está disponível neste aparelho.' }).pronto;
    expect(screen.getByRole('alert')).toHaveTextContent(
      'A câmera não está disponível neste aparelho.',
    );
  });
});
