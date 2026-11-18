// Avisa o leitor de tela de uma mensagem que acabou de aparecer (um erro, um aviso).
// No Android, accessibilityLiveRegion faz isso sozinho. No iOS essa prop NÃO existe: o VoiceOver só
// lê o erro se a pessoa navegar até ele. Por isso, no iOS, o app anuncia por conta própria com
// AccessibilityInfo.announceForAccessibility. No Android não se anuncia, senão a fala sai duplicada.

import { useEffect } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/** Pede ao VoiceOver (iOS) que leia o texto agora. Não faz nada no Android nem com texto vazio. */
export function anunciar(texto: string): void {
  if (Platform.OS !== 'ios') return;
  const limpo = texto.trim();
  if (limpo === '') return;
  AccessibilityInfo.announceForAccessibility(limpo);
}

/**
 * Anuncia a mensagem quando ela aparece ou muda. Redesenhos com o mesmo texto não repetem o aviso;
 * quando a mensagem some (null, undefined ou vazia) não se anuncia nada.
 */
export function useAnunciar(texto: string | null | undefined): void {
  useEffect(() => {
    if (texto) anunciar(texto);
  }, [texto]);
}
