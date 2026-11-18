// Leitura da resposta em voz alta, pelo expo-speech (sintese de voz do proprio aparelho; o texto
// nao sai do celular). A voz e um reforco: a resposta continua escrita na tela, entao qualquer
// falha aqui e engolida em vez de derrubar o assistente.

import * as Speech from 'expo-speech';

import { IDIOMA_DO_APP } from '../../theme';

/** Le o texto em voz alta, cortando antes qualquer fala em andamento. Nao lanca erro. */
export async function falar(texto: string): Promise<void> {
  const limpo = texto.trim();
  if (limpo.length === 0) return;
  try {
    await Speech.stop();
    Speech.speak(limpo, { language: IDIOMA_DO_APP });
  } catch {
    // Sem motor de voz no aparelho: a pessoa ainda le a resposta na tela.
  }
}

/** Interrompe a fala em andamento (cancelar, editar o texto ou sair da tela). Nao lanca erro. */
export async function pararDeFalar(): Promise<void> {
  try {
    await Speech.stop();
  } catch {
    // Nada para parar.
  }
}
