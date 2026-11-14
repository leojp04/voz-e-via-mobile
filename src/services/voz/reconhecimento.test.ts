import { ErroAparelho } from '../aparelho/erro-aparelho';
import {
  iniciarReconhecimento,
  reconhecimentoDisponivel,
  reconhecimentoNoAparelho,
} from './reconhecimento';

// O expo-speech-recognition e nativo (microfone e motor de fala do aparelho), entao nos testes
// ele e simulado. "mockModulo = null" representa um app sem o nativo (Expo Go, Jest, web): o
// require do modulo real lanca erro, e o servico tem de aguentar isso.
type Ouvinte = (evento: unknown) => void;

let mockModulo: Record<string, jest.Mock> | null = null;
let ouvintes: Record<string, Ouvinte> = {};
const removerOuvinte = jest.fn();

jest.mock('expo-speech-recognition', () => ({
  get ExpoSpeechRecognitionModule() {
    if (mockModulo === null) throw new Error('modulo nativo ausente');
    return mockModulo;
  },
}));

function criarModuloFalso(
  opcoes: { aoVivo?: boolean; permitido?: boolean; disponivel?: boolean } = {},
) {
  const { aoVivo = true, permitido = true, disponivel = true } = opcoes;
  return {
    supportsOnDeviceRecognition: jest.fn(() => aoVivo),
    isRecognitionAvailable: jest.fn(() => disponivel),
    requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: permitido }),
    start: jest.fn(),
    stop: jest.fn(),
    abort: jest.fn(),
    addListener: jest.fn((nome: string, ouvinte: Ouvinte) => {
      ouvintes[nome] = ouvinte;
      return { remove: removerOuvinte };
    }),
  };
}

const emitir = (nome: string, evento: unknown = null) => ouvintes[nome]?.(evento);

function chamadas() {
  return { aoTexto: jest.fn(), aoErro: jest.fn(), aoTerminar: jest.fn() };
}

async function erroDe(promessa: Promise<unknown>): Promise<ErroAparelho> {
  const erro = await promessa.then(
    () => null,
    (e: unknown) => e,
  );
  expect(erro).toBeInstanceOf(ErroAparelho);
  return erro as ErroAparelho;
}

beforeEach(() => {
  jest.clearAllMocks();
  ouvintes = {};
  mockModulo = criarModuloFalso();
});

describe('reconhecimentoDisponivel', () => {
  it('e falso quando o app nao tem o modulo nativo (Expo Go, web, testes)', () => {
    mockModulo = null;
    expect(reconhecimentoDisponivel()).toBe(false);
  });

  it('e falso quando o aparelho nao tem nenhum reconhecedor de fala', () => {
    mockModulo = criarModuloFalso({ aoVivo: false, disponivel: false });
    expect(reconhecimentoDisponivel()).toBe(false);
  });

  it('e verdadeiro mesmo sem modelo local, desde que o sistema reconheca fala', () => {
    mockModulo = criarModuloFalso({ aoVivo: false });
    expect(reconhecimentoDisponivel()).toBe(true);
  });
});

describe('reconhecimentoNoAparelho', () => {
  it('e falso sem o modulo nativo', () => {
    mockModulo = null;
    expect(reconhecimentoNoAparelho()).toBe(false);
  });

  it('e falso quando o aparelho nao reconhece fala sem internet', () => {
    mockModulo = criarModuloFalso({ aoVivo: false });
    expect(reconhecimentoNoAparelho()).toBe(false);
  });

  it('e verdadeiro quando o aparelho reconhece fala no proprio aparelho', () => {
    expect(reconhecimentoNoAparelho()).toBe(true);
  });
});

describe('iniciarReconhecimento: o que impede de comecar', () => {
  it('sem o modulo nativo, avisa que a voz esta indisponivel', async () => {
    mockModulo = null;
    const erro = await erroDe(iniciarReconhecimento(chamadas()));
    expect(erro.codigo).toBe('INDISPONIVEL');
    expect(erro.message).toContain('Digite');
  });

  it('sem nenhum reconhecedor no aparelho, avisa que a voz esta indisponivel', async () => {
    mockModulo = criarModuloFalso({ aoVivo: false, disponivel: false });
    const erro = await erroDe(iniciarReconhecimento(chamadas(), { permitirSistema: true }));
    expect(erro.codigo).toBe('INDISPONIVEL');
    expect(mockModulo.start).not.toHaveBeenCalled();
  });

  it('sem modelo local, NAO usa o sistema sozinho: pede o aviso antes e nao liga o microfone', async () => {
    mockModulo = criarModuloFalso({ aoVivo: false });
    const erro = await erroDe(iniciarReconhecimento(chamadas()));
    expect(erro.codigo).toBe('CONSENTIMENTO_NECESSARIO');
    expect(erro.message).toContain('Apple ou do Google');
    expect(mockModulo.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(mockModulo.start).not.toHaveBeenCalled();
  });

  it('sem modelo local, depois do aviso aceito, usa o reconhecedor do sistema', async () => {
    mockModulo = criarModuloFalso({ aoVivo: false });
    await iniciarReconhecimento(chamadas(), { permitirSistema: true });
    expect(mockModulo.start).toHaveBeenCalledWith(
      expect.objectContaining({ lang: 'pt-BR', requiresOnDeviceRecognition: false }),
    );
  });

  it('com a permissao negada, avisa onde liberar e nao liga o microfone', async () => {
    mockModulo = criarModuloFalso({ permitido: false });
    const erro = await erroDe(iniciarReconhecimento(chamadas()));
    expect(erro.codigo).toBe('PERMISSAO_NEGADA');
    expect(erro.message).toContain('configurações');
    expect(mockModulo.start).not.toHaveBeenCalled();
  });
});

describe('iniciarReconhecimento: ouvindo', () => {
  it('com modelo local, escuta em portugues do Brasil so no aparelho e para ao fim da frase', async () => {
    await iniciarReconhecimento(chamadas());
    expect(mockModulo?.start).toHaveBeenCalledWith({
      lang: 'pt-BR',
      requiresOnDeviceRecognition: true,
      interimResults: true,
      continuous: false,
    });
  });

  it('repassa o texto reconhecido, parcial e final', async () => {
    const c = chamadas();
    await iniciarReconhecimento(c);
    emitir('result', { isFinal: false, results: [{ transcript: 'ligar para', confidence: 0.5 }] });
    emitir('result', {
      isFinal: true,
      results: [{ transcript: 'ligar para a Maria', confidence: 0.9 }],
    });
    expect(c.aoTexto).toHaveBeenNthCalledWith(1, 'ligar para', false);
    expect(c.aoTexto).toHaveBeenNthCalledWith(2, 'ligar para a Maria', true);
  });

  it('ignora resultado sem nenhum texto', async () => {
    const c = chamadas();
    await iniciarReconhecimento(c);
    emitir('result', { isFinal: true, results: [] });
    expect(c.aoTexto).not.toHaveBeenCalled();
  });

  it('quando ninguem fala, pede para tentar de novo', async () => {
    const c = chamadas();
    await iniciarReconhecimento(c);
    emitir('error', { error: 'no-speech', message: 'No speech detected' });
    expect(c.aoErro).toHaveBeenCalledWith(expect.stringContaining('Não ouvi'));
  });

  it('cancelar de proposito nao e erro', async () => {
    const c = chamadas();
    await iniciarReconhecimento(c);
    emitir('error', { error: 'aborted', message: 'aborted' });
    expect(c.aoErro).not.toHaveBeenCalled();
  });

  it('qualquer outro erro vira uma mensagem simples, sem texto tecnico', async () => {
    const c = chamadas();
    await iniciarReconhecimento(c);
    emitir('error', { error: 'audio-capture', message: 'AVAudioEngine failed 561145187' });
    expect(c.aoErro).toHaveBeenCalledTimes(1);
    expect(c.aoErro.mock.calls[0][0]).not.toContain('AVAudioEngine');
    expect(c.aoErro.mock.calls[0][0]).toContain('digite');
  });

  it('ao terminar, avisa a tela e solta os ouvintes (sem vazamento)', async () => {
    const c = chamadas();
    await iniciarReconhecimento(c);
    emitir('end');
    expect(c.aoTerminar).toHaveBeenCalledTimes(1);
    expect(removerOuvinte).toHaveBeenCalledTimes(3);
  });

  it('parar pede o resultado final e cancelar descarta a fala', async () => {
    const controle = await iniciarReconhecimento(chamadas());
    controle.parar();
    expect(mockModulo?.stop).toHaveBeenCalledTimes(1);
    controle.cancelar();
    expect(mockModulo?.abort).toHaveBeenCalledTimes(1);
  });
});
