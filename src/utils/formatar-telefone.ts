// Mostra o telefone com mascara brasileira: "(11) 98888-7777" (celular) ou "(11) 3333-4444"
// (fixo). Serve para exibir o numero guardado e para mascarar enquanto a pessoa digita.

const MAXIMO_DE_DIGITOS = 11;

// Numero colado com o codigo do pais (+55): com 12 digitos ou mais e comecando por 55, o 55 sai.
// Sem isso, cortar nos 11 digitos guardaria um numero ERRADO (ex.: "(55) 11988-8877") que passa
// na validacao, e o botao "Ligar" chamaria a pessoa errada. Com 11 digitos ou menos nao mexe,
// porque 55 tambem e um DDD de verdade (Rio Grande do Sul).
function semCodigoDoPais(digitos: string): string {
  return digitos.length > MAXIMO_DE_DIGITOS && digitos.startsWith('55')
    ? digitos.slice(2)
    : digitos;
}

export function formatarTelefone(texto: string): string {
  const digitos = semCodigoDoPais(texto.replace(/\D/g, '')).slice(0, MAXIMO_DE_DIGITOS);
  if (digitos.length <= 2) return digitos.length === 0 ? '' : `(${digitos}`;

  const ddd = digitos.slice(0, 2);
  const resto = digitos.slice(2);
  // Com 11 digitos o hifen vem depois do 5o (celular); antes disso, depois do 4o.
  const corte = digitos.length > 10 ? 5 : 4;
  const numero = resto.length > 4 ? `${resto.slice(0, corte)}-${resto.slice(corte)}` : resto;
  return `(${ddd}) ${numero}`;
}
