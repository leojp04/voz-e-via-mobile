import { render, screen } from '@testing-library/react-native';

import type { ResultadoVerificacao } from '../services/api/types';
import { CartaoVerificacao } from './CartaoVerificacao';

const resultado: ResultadoVerificacao = {
  classificacao: 'PROVAVEL_GOLPE',
  tipoGolpe: 'FALSO_PARENTE',
  sinais: ['Pede dinheiro com urgência', 'Número desconhecido'],
  orientacao: 'Não faça o Pix. Ligue para a pessoa no número que você já tem.',
  canalOficial: 'Disque 100',
  mensagemFalada: 'Isso parece golpe.',
  fontes: [
    { titulo: 'Golpe do falso parente', orgao: 'Órgão Exemplo', url: 'https://exemplo.gov/1' },
  ],
};

async function montar(parcial: Partial<ResultadoVerificacao> = {}) {
  await render(<CartaoVerificacao resultado={{ ...resultado, ...parcial }} />);
}

describe('CartaoVerificacao', () => {
  it.each([
    ['PROVAVEL_GOLPE', 'Provável golpe'],
    ['SUSPEITA', 'Mensagem suspeita'],
    ['NAO_E_POSSIVEL_AVALIAR', 'Não foi possível avaliar'],
    ['SEM_SINAIS_DE_RISCO', 'Sem sinais de risco'],
  ] as const)('classificacao %s aparece em texto: "%s"', async (classificacao, texto) => {
    await montar({ classificacao });
    expect(screen.getByText(texto)).toBeOnTheScreen();
  });

  it('mostra o tipo de golpe, os sinais, a orientacao e o canal oficial', async () => {
    await montar();
    expect(screen.getByText('Falso parente')).toBeOnTheScreen();
    expect(screen.getByText('Pede dinheiro com urgência')).toBeOnTheScreen();
    expect(screen.getByText('Número desconhecido')).toBeOnTheScreen();
    expect(
      screen.getByText('Não faça o Pix. Ligue para a pessoa no número que você já tem.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Canal oficial: Disque 100')).toBeOnTheScreen();
  });

  it.each([
    ['FALSO_BENEFICIO', 'Falso benefício'],
    ['FALSA_CENTRAL_BANCO', 'Falsa central do banco'],
    ['FALSO_PARENTE', 'Falso parente'],
    ['FALSA_COBRANCA', 'Falsa cobrança'],
    ['PREMIO_FALSO', 'Falso prêmio'],
    ['FALSA_ENTREGA', 'Falsa entrega'],
    ['FALSO_SERVICO_SAUDE', 'Falso serviço de saúde'],
    ['LINK_MALICIOSO', 'Link malicioso'],
    ['OUTRO', 'Outro tipo de golpe'],
  ])('tipo de golpe %s aparece como texto legivel: "%s"', async (codigo, texto) => {
    await montar({ tipoGolpe: codigo });
    expect(screen.getByText(texto)).toBeOnTheScreen();
    expect(screen.queryByText(codigo)).toBeNull();
  });

  it('esconde o tipo quando e NENHUM ou um codigo que o app nao conhece (nunca mostra o codigo cru)', async () => {
    await montar({ tipoGolpe: 'NENHUM' });
    expect(screen.queryByText('NENHUM')).toBeNull();
    expect(screen.queryByText('Outro tipo de golpe')).toBeNull();
    await montar({ tipoGolpe: 'TIPO_NOVO_DO_JAVA' });
    expect(screen.queryByText('TIPO_NOVO_DO_JAVA')).toBeNull();
  });

  it('mostra as fontes com titulo e orgao', async () => {
    await montar();
    expect(screen.getByText('Fonte: Golpe do falso parente (Órgão Exemplo)')).toBeOnTheScreen();
  });

  it('omite tipo de golpe, sinais, canal oficial e fontes quando nao ha', async () => {
    await montar({ tipoGolpe: null, sinais: [], canalOficial: null, fontes: [] });
    expect(screen.queryByText('Falso parente')).toBeNull();
    expect(screen.queryByText(/Sinais encontrados/)).toBeNull();
    expect(screen.queryByText(/Canal oficial/)).toBeNull();
    expect(screen.queryByText(/Fonte:/)).toBeNull();
  });

  it('"Sem sinais de risco" nao promete seguranca: avisa que nao garante', async () => {
    await montar({ classificacao: 'SEM_SINAIS_DE_RISCO' });
    expect(screen.getByText(/não garante que a mensagem seja segura/i)).toBeOnTheScreen();
  });

  it('nos outros casos nao mostra esse aviso extra', async () => {
    await montar({ classificacao: 'PROVAVEL_GOLPE' });
    expect(screen.queryByText(/não garante que a mensagem seja segura/i)).toBeNull();
  });
});
