// Data e hora para a pessoa ler: "13/11/2026 às 09:05", no horario do aparelho. A API manda em
// UTC (texto ISO 8601). Feito a mao, sem Intl, para nao depender do suporte do aparelho.
// Texto que nao e uma data devolve "" (melhor um espaco vazio do que "NaN/NaN/NaN").

const doisDigitos = (n: number) => String(n).padStart(2, '0');

export function formatarData(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '';
  const dia = doisDigitos(data.getDate());
  const mes = doisDigitos(data.getMonth() + 1);
  const hora = doisDigitos(data.getHours());
  const minuto = doisDigitos(data.getMinutes());
  return `${dia}/${mes}/${data.getFullYear()} às ${hora}:${minuto}`;
}
