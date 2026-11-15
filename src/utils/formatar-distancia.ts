// Distancia para a pessoa ler: "350 m" ou "1,3 km". Feito a mao, sem Intl, para nao depender do
// suporte do aparelho. Metros arredondam de 10 em 10 (350 m, e nao 347 m: a precisao do GPS nao
// justifica o detalhe). Valor invalido ou negativo devolve "" (melhor vazio que "NaN m").

export function formatarDistancia(metros: number): string {
  if (!Number.isFinite(metros) || metros < 0) return '';
  const arredondado = Math.round(metros / 10) * 10;
  if (arredondado < 1000) return `${arredondado} m`;
  const km = (arredondado / 1000).toFixed(1).replace('.', ',');
  return `${km.replace(/,0$/, '')} km`;
}
