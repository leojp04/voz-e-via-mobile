import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { CampoTexto } from './CampoTexto';

describe('CampoTexto', () => {
  it('mostra o rótulo e o campo com o mesmo nome acessível', async () => {
    await render(<CampoTexto rotulo="E-mail" valor="" aoMudar={jest.fn()} />);
    expect(screen.getByText('E-mail')).toBeOnTheScreen();
    expect(screen.getByLabelText('E-mail')).toBeOnTheScreen();
  });

  it('avisa quando o texto muda', async () => {
    const aoMudar = jest.fn();
    await render(<CampoTexto rotulo="Nome" valor="" aoMudar={aoMudar} />);
    await fireEvent.changeText(screen.getByLabelText('Nome'), 'Maria');
    expect(aoMudar).toHaveBeenCalledWith('Maria');
  });

  it('mostra a mensagem de erro quando há erro', async () => {
    await render(
      <CampoTexto rotulo="E-mail" valor="x" aoMudar={jest.fn()} erro="E-mail inválido." />,
    );
    expect(screen.getByText('E-mail inválido.')).toBeOnTheScreen();
  });

  it('não mostra erro quando não há erro', async () => {
    await render(<CampoTexto rotulo="E-mail" valor="" aoMudar={jest.fn()} erro={null} />);
    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
  });

  it('esconde o texto digitado quando é senha', async () => {
    await render(<CampoTexto rotulo="Senha" valor="" aoMudar={jest.fn()} senha />);
    expect(screen.getByLabelText('Senha').props.secureTextEntry).toBe(true);
  });

  describe('multilinha (ex.: descricao do reporte)', () => {
    it('por padrao e de uma linha so', async () => {
      await render(<CampoTexto rotulo="Nome" valor="" aoMudar={jest.fn()} />);
      expect(screen.getByLabelText('Nome').props.multiline).toBeFalsy();
    });

    it('com multilinha aceita varias linhas, com o cursor no topo, e fica mais alto', async () => {
      await render(<CampoTexto rotulo="Descrição" valor="" aoMudar={jest.fn()} multilinha />);
      const campo = screen.getByLabelText('Descrição');
      expect(campo.props.multiline).toBe(true);
      expect(campo.props.textAlignVertical).toBe('top');
      const estilo = StyleSheet.flatten(campo.props.style);
      expect(estilo.minHeight).toBeGreaterThanOrEqual(120);
    });
  });

  it('repassa o tipo de teclado', async () => {
    await render(
      <CampoTexto rotulo="E-mail" valor="" aoMudar={jest.fn()} tipoTeclado="email-address" />,
    );
    expect(screen.getByLabelText('E-mail').props.keyboardType).toBe('email-address');
  });
});
