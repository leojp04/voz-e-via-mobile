// Avisa o leitor de tela de uma mensagem que acabou de aparecer (um erro, um aviso).
// No Android, accessibilityLiveRegion faz isso sozinho. No iOS essa prop NÃO existe: o VoiceOver só
// lê o erro se a pessoa navegar até ele. Por isso, no iOS, o app anuncia por conta própria. No
// Android não se anuncia, senão a fala sai duplicada.
//
// Visto no iPhone: ao ativar "Entrar" o VoiceOver está falando o nome do botão, e um aviso disparado
// nesse exato instante se perdia. Por isso o aviso (1) espera um instante e (2) entra na FILA
// (queue: true) atrás da fala em andamento, em vez de cortá-la ou ser cortado.

import { useEffect } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/** Quanto o aviso espera antes de ser dito, em ms, para não colidir com a fala do botão ativado. */
export const ATRASO_DO_ANUNCIO_MS = 500;

/**
 * Pede ao VoiceOver (iOS) que leia o texto, depois de um pequeno atraso e na fila. Não faz nada no
 * Android nem com texto vazio. Devolve uma função que cancela o aviso se ele ainda não foi dito.
 */
export function anunciar(texto: string): () => void {
  const cancelarNada = () => {};
  if (Platform.OS !== 'ios') return cancelarNada;
  const limpo = texto.trim();
  if (limpo === '') return cancelarNada;

  const espera = setTimeout(() => {
    AccessibilityInfo.announceForAccessibilityWithOptions(limpo, { queue: true });
  }, ATRASO_DO_ANUNCIO_MS);
  return () => clearTimeout(espera);
}

/**
 * Anuncia a mensagem quando ela aparece ou muda. Redesenhos com o mesmo texto não repetem o aviso;
 * se a mensagem some antes do atraso acabar, o aviso é cancelado (não se lê um erro que já sumiu).
 */
export function useAnunciar(texto: string | null | undefined): void {
  useEffect(() => {
    if (!texto) return;
    return anunciar(texto);
  }, [texto]);
}
