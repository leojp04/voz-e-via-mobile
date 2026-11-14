import { cores, razaoDeContraste } from '../theme';
import type { StatusReporte } from '../services/api/types';
import { estiloDoStatus, rotuloDaUrgencia } from './status-do-reporte';

const STATUS: [StatusReporte, string][] = [
  ['ABERTO', 'Aberto'],
  ['EM_ANALISE', 'Em análise'],
  ['EM_EXECUCAO', 'Em execução'],
  ['RESOLVIDO', 'Resolvido'],
  ['CANCELADO', 'Cancelado'],
];

describe('estiloDoStatus', () => {
  it.each(STATUS)('%s tem o rotulo "%s"', (status, rotulo) => {
    expect(estiloDoStatus(status).rotulo).toBe(rotulo);
  });

  // WCAG 2.2 AA: o texto da etiqueta precisa de 4,5:1 contra o fundo dela.
  it.each(STATUS)('%s tem contraste de pelo menos 4,5:1 entre texto e fundo', (status) => {
    const { texto, fundo } = estiloDoStatus(status);
    expect(razaoDeContraste(texto, fundo)).toBeGreaterThanOrEqual(4.5);
  });

  it('cada status tem um fundo diferente (nao depende so de ler o texto)', () => {
    const fundos = STATUS.map(([status]) => estiloDoStatus(status).fundo);
    expect(new Set(fundos).size).toBe(STATUS.length);
  });

  // A API pode ganhar um status novo antes de o app: a tela deve mostrar o texto, nao quebrar.
  it('status desconhecido mostra o proprio texto, em cores neutras e legiveis', () => {
    const estilo = estiloDoStatus('EM_VISTORIA');
    expect(estilo.rotulo).toBe('EM_VISTORIA');
    expect(estilo.texto).toBe(cores.texto);
    expect(razaoDeContraste(estilo.texto, estilo.fundo)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('rotuloDaUrgencia', () => {
  it('traduz para o portugues da tela', () => {
    expect(rotuloDaUrgencia('BAIXA')).toBe('Baixa');
    expect(rotuloDaUrgencia('MEDIA')).toBe('Média');
    expect(rotuloDaUrgencia('ALTA')).toBe('Alta');
  });
});
