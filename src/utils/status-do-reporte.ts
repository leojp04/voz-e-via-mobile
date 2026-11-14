// Como cada status e a urgencia do reporte aparecem na tela: texto em portugues e cores da
// etiqueta. A cor NUNCA e a unica pista (o rotulo sempre vem escrito) e cada par de cores passa
// de 4,5:1 de contraste, conferido em status-do-reporte.test.ts (WCAG 2.2 AA).

import type { StatusReporte, Urgencia } from '../services/api/types';
import { cores } from '../theme';

export interface EstiloDoStatus {
  rotulo: string;
  fundo: string;
  texto: string;
}

const ESTILOS: Record<StatusReporte, EstiloDoStatus> = {
  ABERTO: { rotulo: 'Aberto', fundo: cores.superficie, texto: cores.acao },
  EM_ANALISE: { rotulo: 'Em análise', fundo: '#FFF1C9', texto: '#5C4300' },
  EM_EXECUCAO: { rotulo: 'Em execução', fundo: '#DCE8F5', texto: cores.acao },
  RESOLVIDO: { rotulo: 'Resolvido', fundo: '#DDEFE0', texto: '#1B5E20' },
  CANCELADO: { rotulo: 'Cancelado', fundo: '#EBEBEB', texto: cores.textoSecundario },
};

/**
 * Estilo de um status. Aceita qualquer texto: se a API ganhar um status novo antes do app, a tela
 * mostra o proprio texto em cores neutras, em vez de quebrar.
 */
export function estiloDoStatus(status: string): EstiloDoStatus {
  return (
    (ESTILOS as Record<string, EstiloDoStatus | undefined>)[status] ?? {
      rotulo: status,
      fundo: cores.superficie,
      texto: cores.texto,
    }
  );
}

const ROTULOS_DA_URGENCIA: Record<Urgencia, string> = {
  BAIXA: 'Baixa',
  MEDIA: 'Média',
  ALTA: 'Alta',
};

export function rotuloDaUrgencia(urgencia: Urgencia): string {
  return ROTULOS_DA_URGENCIA[urgencia];
}
