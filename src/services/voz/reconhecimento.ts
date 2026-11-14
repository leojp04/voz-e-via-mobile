// Reconhecimento de fala (a pessoa fala, o app escreve), pelo expo-speech-recognition. Decisao D7
// do plano: a fala vira texto no celular e a NOSSA API so recebe texto. Ordem de preferencia:
//   1. Modelo local do aparelho: o audio nao sai do celular (sempre que existir, e sempre usado).
//   2. Reconhecedor do sistema (Apple ou Google), que pode usar o servidor deles: so depois de a
//      pessoa aceitar um aviso. A biblioteca so respeita "requiresOnDeviceRecognition" se o
//      aparelho suportar; por isso conferimos o suporte ANTES e nunca deixamos cair no servidor
//      sem a pessoa saber.
//   3. Nenhum reconhecedor: a pessoa digita.
//
// O modulo nativo so existe no development build. Ele e carregado dentro de try/catch, a cada uso,
// porque importa-lo no Expo Go ou na web lanca erro e derrubaria o app inteiro.

import type { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

import { ErroAparelho } from '../aparelho/erro-aparelho';

type ModuloDeFala = typeof ExpoSpeechRecognitionModule;

const IDIOMA = 'pt-BR';

const MSG_SEM_NATIVO = 'A voz não está disponível neste aparelho. Digite o que você precisa.';
const MSG_CONSENTIMENTO =
  'Este aparelho não entende voz sem internet. Para usar a voz, o áudio pode ser processado pelo serviço de fala da Apple ou do Google. O Voz & Via não recebe o áudio, só o texto. Você pode digitar se preferir.';
const MSG_PERMISSAO =
  'Para falar com o assistente, permita o microfone e o reconhecimento de fala nas configurações do aparelho.';
const MSG_NAO_OUVI = 'Não ouvi nada. Toque no microfone e fale de novo.';
const MSG_FALHA = 'Não consegui ouvir você. Tente de novo ou digite o que você precisa.';

export interface OpcoesDeReconhecimento {
  /** Texto reconhecido ate agora; `final` e verdadeiro quando o aparelho terminou a frase. */
  aoTexto: (texto: string, final: boolean) => void;
  /** Mensagem pronta para mostrar a pessoa (nunca texto tecnico). */
  aoErro: (mensagem: string) => void;
  /** O microfone fechou (frase acabou, parou ou deu erro). */
  aoTerminar: () => void;
}

export interface ControleDeReconhecimento {
  /** Para de ouvir e entrega o que entendeu ate aqui. */
  parar: () => void;
  /** Para de ouvir e descarta a fala. */
  cancelar: () => void;
}

function carregarModulo(): ModuloDeFala | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ExpoSpeechRecognitionModule } = require('expo-speech-recognition') as {
      ExpoSpeechRecognitionModule: ModuloDeFala;
    };
    return ExpoSpeechRecognitionModule ?? null;
  } catch {
    return null;
  }
}

function entendeNoAparelho(modulo: ModuloDeFala): boolean {
  try {
    return modulo.supportsOnDeviceRecognition();
  } catch {
    return false;
  }
}

function sistemaReconhece(modulo: ModuloDeFala): boolean {
  try {
    return modulo.isRecognitionAvailable();
  } catch {
    return false;
  }
}

/** Verdadeiro se o aparelho tem algum reconhecedor de fala (local ou do sistema). */
export function reconhecimentoDisponivel(): boolean {
  const modulo = carregarModulo();
  return modulo !== null && (entendeNoAparelho(modulo) || sistemaReconhece(modulo));
}

/** Verdadeiro so se da para reconhecer fala sem o audio sair do celular. */
export function reconhecimentoNoAparelho(): boolean {
  const modulo = carregarModulo();
  return modulo !== null && entendeNoAparelho(modulo);
}

export interface OpcoesDeInicio {
  /** A pessoa aceitou o aviso de que o sistema (Apple ou Google) pode processar a fala. */
  permitirSistema?: boolean;
}

export async function iniciarReconhecimento(
  opcoes: OpcoesDeReconhecimento,
  inicio: OpcoesDeInicio = {},
): Promise<ControleDeReconhecimento> {
  const modulo = carregarModulo();
  if (modulo === null) throw new ErroAparelho('INDISPONIVEL', MSG_SEM_NATIVO);

  const local = entendeNoAparelho(modulo);
  if (!local) {
    if (!sistemaReconhece(modulo)) throw new ErroAparelho('INDISPONIVEL', MSG_SEM_NATIVO);
    if (!inicio.permitirSistema) {
      throw new ErroAparelho('CONSENTIMENTO_NECESSARIO', MSG_CONSENTIMENTO);
    }
  }

  const permissao = await modulo.requestPermissionsAsync();
  if (!permissao.granted) throw new ErroAparelho('PERMISSAO_NEGADA', MSG_PERMISSAO);

  const assinaturas = [
    modulo.addListener('result', (evento) => {
      const texto = evento.results[0]?.transcript;
      if (texto) opcoes.aoTexto(texto, evento.isFinal);
    }),
    modulo.addListener('error', (evento) => {
      // "aborted" e a propria pessoa cancelando: nao e falha.
      if (evento.error === 'aborted') return;
      opcoes.aoErro(evento.error === 'no-speech' ? MSG_NAO_OUVI : MSG_FALHA);
    }),
    modulo.addListener('end', () => {
      assinaturas.forEach((assinatura) => assinatura.remove());
      opcoes.aoTerminar();
    }),
  ];

  modulo.start({
    lang: IDIOMA,
    requiresOnDeviceRecognition: local,
    interimResults: true,
    continuous: false,
  });

  return { parar: () => modulo.stop(), cancelar: () => modulo.abort() };
}
