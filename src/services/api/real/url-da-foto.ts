// A API .NET devolve a foto so como caminho ("/uploads/abc.jpg") e so aceita esse formato de volta.
// O app precisa da URL completa para mostrar a imagem, entao convertemos nos dois sentidos aqui.

function semBarraFinal(base: string): string {
  return base.replace(/\/+$/, '');
}

/** "/uploads/abc.jpg" -> "http://servidor/uploads/abc.jpg". Valores nulos ou ja completos ficam como estao. */
export function paraUrlCompleta<T extends string | null | undefined>(base: string, url: T): T {
  if (typeof url === 'string' && url.startsWith('/')) {
    return `${semBarraFinal(base)}${url}` as T;
  }
  return url;
}

/** "http://servidor/uploads/abc.jpg" -> "/uploads/abc.jpg", o formato que a API aceita. */
export function paraCaminhoDaApi<T extends string | null | undefined>(base: string, url: T): T {
  const prefixo = semBarraFinal(base);
  if (typeof url === 'string' && url.startsWith(`${prefixo}/`)) {
    return url.slice(prefixo.length) as T;
  }
  return url;
}
