// Mostra o telefone com mascara brasileira: "(11) 98888-7777" (celular) ou "(11) 3333-4444"
// (fixo). Serve para exibir o numero guardado e para mascarar enquanto a pessoa digita.

const MAXIMO_DE_DIGITOS = 11;

export function formatarTelefone(texto: string): string {
  const digitos = texto.replace(/\D/g, '').slice(0, MAXIMO_DE_DIGITOS);
  if (digitos.length <= 2) return digitos.length === 0 ? '' : `(${digitos}`;

  const ddd = digitos.slice(0, 2);
  const resto = digitos.slice(2);
  // Com 11 digitos o hifen vem depois do 5o (celular); antes disso, depois do 4o.
  const corte = digitos.length > 10 ? 5 : 4;
  const numero = resto.length > 4 ? `${resto.slice(0, corte)}-${resto.slice(corte)}` : resto;
  return `(${ddd}) ${numero}`;
}
