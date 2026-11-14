import { act, renderHook } from '@testing-library/react-native';

import { ErroAparelho } from '../aparelho/erro-aparelho';
import { pararDeFalar } from './falar';
import {
  iniciarReconhecimento,
  reconhecimentoDisponivel,
  type OpcoesDeReconhecimento,
} from './reconhecimento';
import { useEscutaDeVoz } from './use-escuta-de-voz';

// O servico de voz e nativo; aqui so conferimos como o hook guarda o estado e conversa com ele.
jest.mock('./reconhecimento');
jest.mock('./falar');

const iniciar = iniciarReconhecimento as jest.Mock;
const disponivel = reconhecimentoDisponivel as jest.Mock;
const parar = jest.fn();
const cancelar = jest.fn();

let opcoesDoServico: OpcoesDeReconhecimento;

beforeEach(() => {
  jest.clearAllMocks();
  disponivel.mockReturnValue(true);
  (pararDeFalar as jest.Mock).mockResolvedValue(undefined);
  iniciar.mockImplementation(async (opcoes: OpcoesDeReconhecimento) => {
    opcoesDoServico = opcoes;
    return { parar, cancelar };
  });
});

const montar = (aoTexto = jest.fn()) => renderHook(() => useEscutaDeVoz({ aoTexto }));

const consentimento = () =>
  new ErroAparelho('CONSENTIMENTO_NECESSARIO', 'O sistema da Apple ou do Google pode processar.');

describe('useEscutaDeVoz', () => {
  it('diz se o aparelho tem algum reconhecedor de fala', async () => {
    disponivel.mockReturnValue(false);
    const { result } = await montar();
    expect(result.current.disponivel).toBe(false);
  });

  it('ao tocar, corta a leitura em voz alta (o app nao se escuta) e comeca a ouvir', async () => {
    const { result } = await montar();
    await act(async () => result.current.alternar());
    expect(pararDeFalar).toHaveBeenCalledTimes(1);
    expect(iniciar).toHaveBeenCalledWith(expect.any(Object), { permitirSistema: false });
    expect(result.current.ouvindo).toBe(true);
  });

  it('repassa o texto reconhecido, parcial e final', async () => {
    const aoTexto = jest.fn();
    const { result } = await montar(aoTexto);
    await act(async () => result.current.alternar());
    await act(async () => opcoesDoServico.aoTexto('ligar para', false));
    await act(async () => opcoesDoServico.aoTexto('ligar para a Maria', true));
    expect(aoTexto).toHaveBeenNthCalledWith(1, 'ligar para', false);
    expect(aoTexto).toHaveBeenNthCalledWith(2, 'ligar para a Maria', true);
  });

  it('quando o microfone fecha, deixa de estar ouvindo', async () => {
    const { result } = await montar();
    await act(async () => result.current.alternar());
    await act(async () => opcoesDoServico.aoTerminar());
    expect(result.current.ouvindo).toBe(false);
  });

  it('tocar de novo enquanto ouve para de ouvir (e nao abre um segundo microfone)', async () => {
    const { result } = await montar();
    await act(async () => result.current.alternar());
    await act(async () => result.current.alternar());
    expect(parar).toHaveBeenCalledTimes(1);
    expect(iniciar).toHaveBeenCalledTimes(1);
  });

  it('dois toques seguidos antes de o microfone abrir iniciam uma escuta so', async () => {
    const { result } = await montar();
    await act(async () => {
      void result.current.alternar();
      void result.current.alternar();
    });
    expect(iniciar).toHaveBeenCalledTimes(1);
  });

  it('erro do servico durante a escuta vira mensagem para mostrar', async () => {
    const { result } = await montar();
    await act(async () => result.current.alternar());
    await act(async () =>
      opcoesDoServico.aoErro('Não ouvi nada. Toque no microfone e fale de novo.'),
    );
    expect(result.current.erro).toBe('Não ouvi nada. Toque no microfone e fale de novo.');
  });

  it('comecar de novo apaga o erro anterior', async () => {
    const { result } = await montar();
    await act(async () => result.current.alternar());
    await act(async () => opcoesDoServico.aoErro('Falhou.'));
    await act(async () => opcoesDoServico.aoTerminar());
    await act(async () => result.current.alternar());
    expect(result.current.erro).toBeNull();
  });

  it('erro do aparelho (ex.: permissao negada) mostra a mensagem e nao fica ouvindo', async () => {
    iniciar.mockRejectedValue(new ErroAparelho('PERMISSAO_NEGADA', 'Permita o microfone.'));
    const { result } = await montar();
    await act(async () => result.current.alternar());
    expect(result.current.erro).toBe('Permita o microfone.');
    expect(result.current.ouvindo).toBe(false);
    expect(result.current.precisaAviso).toBe(false);
  });

  it('falha inesperada tambem vira mensagem simples', async () => {
    iniciar.mockRejectedValue(new Error('boom nativo 0x81'));
    const { result } = await montar();
    await act(async () => result.current.alternar());
    expect(result.current.erro).toMatch(/digite/i);
    expect(result.current.erro).not.toContain('0x81');
    expect(result.current.ouvindo).toBe(false);
  });
});

describe('useEscutaDeVoz: aviso antes do reconhecedor do sistema', () => {
  it('sem modelo local, pede o aviso em vez de ouvir', async () => {
    iniciar.mockRejectedValueOnce(consentimento());
    const { result } = await montar();
    await act(async () => result.current.alternar());
    expect(result.current.precisaAviso).toBe(true);
    expect(result.current.ouvindo).toBe(false);
    expect(result.current.erro).toBeNull();
  });

  it('aceitar o aviso fecha o aviso e comeca a ouvir com o sistema liberado', async () => {
    iniciar.mockRejectedValueOnce(consentimento());
    const { result } = await montar();
    await act(async () => result.current.alternar());
    await act(async () => result.current.aceitarAviso());
    expect(result.current.precisaAviso).toBe(false);
    expect(iniciar).toHaveBeenLastCalledWith(expect.any(Object), { permitirSistema: true });
    expect(result.current.ouvindo).toBe(true);
  });

  it('depois de aceitar, os proximos toques nao perguntam de novo (vale so nesta sessao)', async () => {
    iniciar.mockRejectedValueOnce(consentimento());
    const { result } = await montar();
    await act(async () => result.current.alternar());
    await act(async () => result.current.aceitarAviso());
    await act(async () => opcoesDoServico.aoTerminar());
    await act(async () => result.current.alternar());
    expect(iniciar).toHaveBeenLastCalledWith(expect.any(Object), { permitirSistema: true });
  });

  it('recusar o aviso fecha o aviso e nao liga o microfone', async () => {
    iniciar.mockRejectedValueOnce(consentimento());
    const { result } = await montar();
    await act(async () => result.current.alternar());
    await act(async () => result.current.recusarAviso());
    expect(result.current.precisaAviso).toBe(false);
    expect(iniciar).toHaveBeenCalledTimes(1);
  });

  it('depois de recusar, tocar no microfone pergunta de novo', async () => {
    iniciar.mockRejectedValueOnce(consentimento()).mockRejectedValueOnce(consentimento());
    const { result } = await montar();
    await act(async () => result.current.alternar());
    await act(async () => result.current.recusarAviso());
    await act(async () => result.current.alternar());
    expect(result.current.precisaAviso).toBe(true);
  });
});

describe('useEscutaDeVoz: ao sair da tela', () => {
  it('cancela o microfone se ainda estava ouvindo', async () => {
    const { result, unmount } = await montar();
    await act(async () => result.current.alternar());
    await unmount();
    expect(cancelar).toHaveBeenCalledTimes(1);
  });

  it('nao faz nada se nao estava ouvindo', async () => {
    const { unmount } = await montar();
    await unmount();
    expect(cancelar).not.toHaveBeenCalled();
  });
});
