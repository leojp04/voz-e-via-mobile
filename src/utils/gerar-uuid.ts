// Gera um UUID v4 (texto aleatorio unico, como "3f2b8c1e-9a4d-4e7b-8c5a-1d2e3f4a5b6c").
// O app usa como "Idempotency-Key" ao criar um reporte: a mesma chave, reenviada, faz a API
// devolver o mesmo reporte em vez de criar outro. A chave nao e segredo, so precisa ser unica,
// entao o gerador simples de reserva (Math.random) basta quando o aparelho nao tem crypto.

export function gerarUuid(): string {
  const nativo = globalThis.crypto?.randomUUID?.();
  if (nativo) return nativo;
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (letra) => {
    const sorteado = Math.floor(Math.random() * 16);
    // "y" precisa começar com 8, 9, a ou b (variante do UUID); "x" aceita qualquer hexadecimal.
    const digito = letra === 'x' ? sorteado : (sorteado % 4) + 8;
    return digito.toString(16);
  });
}
