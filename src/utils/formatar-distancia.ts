// Distancia para a pessoa ler: "350 m" ou "1,3 km". Feito a mao, sem Intl, para nao depender do
// suporte do aparelho. Metros arredondam de 10 em 10 (350 m, e nao 347 m: a precisao do GPS nao
// justifica o detalhe). Valor invalido ou negativo devolve "" (melhor vazio que "NaN m").

export function formatarDistancia(metros: number): string {
  if (!Number.isFinite(metros) || metros < 0) return '';
  // Maior que zero nunca vira "0 m" (1 m arredondaria para 0): o minimo mostrado e 10 m,
  // igual ao que a API Java fala ("a farmacia mais perto fica a 10 metros").
  const arredondado = metros > 0 ? Math.max(10, Math.round(metros / 10) * 10) : 0;
  if (arredondado < 1000) return `${arredondado} m`;
  const km = (arredondado / 1000).toFixed(1).replace('.', ',');
  return `${km.replace(/,0$/, '')} km`;
}
