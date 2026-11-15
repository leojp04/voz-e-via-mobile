import { fireEvent, render, screen } from '@testing-library/react-native';

import type { AtendimentoProximo } from '../services/api/types';
import { CartaoAtendimento } from './CartaoAtendimento';

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

const atendimento: AtendimentoProximo = {
  id: 1,
  nome: 'UBS Exemplo',
  tipo: 'UBS',
  endereco: 'Rua das Flores, 120 - Centro',
  telefone: '1133334444',
  latitude: -23.55,
  longitude: -46.63,
  distanciaMetros: 350,
  acessibilidade: 'SIM',
  banheiroAdaptado: null,
  funciona24h: null,
  aviso: null,
  rotas: { googleMaps: 'https://maps.example/1', waze: 'https://waze.example/1', geo: 'geo:0,0' },
};

async function montar(parcial: Partial<AtendimentoProximo> = {}) {
  const aoLigar = jest.fn();
  const aoVerNoMapa = jest.fn();
  const resultado = await render(
    <CartaoAtendimento
      atendimento={{ ...atendimento, ...parcial }}
      aoLigar={aoLigar}
      aoVerNoMapa={aoVerNoMapa}
    />,
  );
  return { aoLigar, aoVerNoMapa, resultado };
}

describe('CartaoAtendimento', () => {
  it('mostra nome, tipo em portugues, distancia e endereco', async () => {
    await montar();
    expect(screen.getByText('UBS Exemplo')).toBeOnTheScreen();
    expect(screen.getByText('Posto de saúde (UBS)')).toBeOnTheScreen();
    expect(screen.getByText('350 m')).toBeOnTheScreen();
    expect(screen.getByText('Rua das Flores, 120 - Centro')).toBeOnTheScreen();
  });

  it.each([
    ['SIM', 'Acessível'],
    ['PARCIAL', 'Acessibilidade parcial'],
    ['NAO', 'Sem acessibilidade'],
    ['DESCONHECIDA', 'Acessibilidade não confirmada'],
  ] as const)(
    'acessibilidade %s aparece como texto "%s" (nunca so por cor)',
    async (valor, texto) => {
      await montar({ acessibilidade: valor });
      expect(screen.getByText(texto)).toBeOnTheScreen();
    },
  );

  it('mostra o aviso do Java quando existe', async () => {
    await montar({ aviso: 'Ligue antes para confirmar a rampa.' });
    expect(screen.getByText('Ligue antes para confirmar a rampa.')).toBeOnTheScreen();
  });

  it('nao mostra aviso quando e null', async () => {
    await montar();
    expect(screen.queryByText(/Ligue antes/)).toBeNull();
  });

  it('mostra "Aberto 24 horas" e "Banheiro adaptado" so quando verdadeiros', async () => {
    await montar({ funciona24h: true, banheiroAdaptado: true });
    expect(screen.getByText('Aberto 24 horas')).toBeOnTheScreen();
    expect(screen.getByText('Banheiro adaptado')).toBeOnTheScreen();
  });

  it('nao afirma nada quando 24h e banheiro sao false ou null', async () => {
    await montar({ funciona24h: false, banheiroAdaptado: null });
    expect(screen.queryByText('Aberto 24 horas')).toBeNull();
    expect(screen.queryByText('Banheiro adaptado')).toBeNull();
  });

  it('"Ligar" chama aoLigar com o telefone e o leitor de tela diz quem sera chamado', async () => {
    const { aoLigar } = await montar();
    await fireEvent.press(screen.getByRole('button', { name: 'Ligar para UBS Exemplo' }));
    expect(aoLigar).toHaveBeenCalledWith('1133334444');
  });

  it('sem telefone, nao mostra o botao Ligar', async () => {
    await montar({ telefone: null });
    expect(screen.queryByRole('button', { name: /Ligar/ })).toBeNull();
  });

  it('"Ver no mapa" chama aoVerNoMapa com as coordenadas', async () => {
    const { aoVerNoMapa } = await montar();
    await fireEvent.press(screen.getByRole('button', { name: 'Ver UBS Exemplo no mapa' }));
    expect(aoVerNoMapa).toHaveBeenCalledWith(-23.55, -46.63);
  });
});
