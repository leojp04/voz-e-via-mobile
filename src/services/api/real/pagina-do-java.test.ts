import { paraPagina, type PaginaDoJava } from './pagina-do-java';

// Formato conferido na API Java rodando (PaginaResponse): a primeira pagina e a 0.
function paginaDoJava(sobrescrever: Partial<PaginaDoJava<string>> = {}): PaginaDoJava<string> {
  return {
    conteudo: ['a', 'b'],
    pagina: 0,
    tamanho: 2,
    totalElementos: 5,
    totalPaginas: 3,
    ultima: false,
    ...sobrescrever,
  };
}

describe('paraPagina', () => {
  it('troca conteudo por itens e totalElementos por total', () => {
    expect(paraPagina(paginaDoJava())).toMatchObject({
      itens: ['a', 'b'],
      tamanho: 2,
      total: 5,
    });
  });

  it('converte a pagina do Spring (conta de 0) para a do app (conta de 1)', () => {
    expect(paraPagina(paginaDoJava({ pagina: 0 })).pagina).toBe(1);
    expect(paraPagina(paginaDoJava({ pagina: 2 })).pagina).toBe(3);
  });

  it('nao deixa vazar os campos do Java para as telas', () => {
    const resultado = paraPagina(paginaDoJava());

    expect(Object.keys(resultado).sort()).toEqual(['itens', 'pagina', 'tamanho', 'total']);
  });

  it('lista vazia vira pagina 1 sem itens', () => {
    const vazia = paginaDoJava({
      conteudo: [],
      pagina: 0,
      totalElementos: 0,
      totalPaginas: 0,
      ultima: true,
    });

    expect(paraPagina(vazia)).toEqual({ itens: [], pagina: 1, tamanho: 2, total: 0 });
  });
});
