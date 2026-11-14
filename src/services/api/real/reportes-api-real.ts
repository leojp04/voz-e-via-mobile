// API de reportes REAL: fala com a API .NET pelo cliente HTTP (docs/adr/0002).
// Implementa o mesmo contrato ReportesApi da API falsa, entao as telas nao percebem a troca.
// Caminhos conforme o plano unico (secao 8.2). Tres adaptacoes ao contrato real do .NET:
//  - o POST recebe o CODIGO da categoria (ex.: "RAMPA"), nao o id;
//  - o PUT SUBSTITUI descricao, endereco e foto: o que nao for reenviado e apagado;
//  - a foto vem como caminho ("/uploads/..."), que aqui vira URL completa (e volta a caminho ao enviar).

import { ErroApi } from '../erro';
import type { ClienteHttp } from '../cliente-http';
import type { Categoria, Pagina, Reporte, ReporteResumo, ReportesApi } from '../types';
import { paraCaminhoDaApi, paraUrlCompleta } from './url-da-foto';

export function criarReportesApiReal(cliente: ClienteHttp, urlBase: string): ReportesApi {
  let categoriasEmMemoria: Categoria[] | null = null;

  async function listarCategorias(): Promise<Categoria[]> {
    categoriasEmMemoria ??= await cliente.get<Categoria[]>('/api/categorias');
    return categoriasEmMemoria;
  }

  // O .NET manda fotoUrl so como caminho e nao manda "historico" ao criar.
  function normalizar<T extends object>(reporte: T): T {
    const { fotoUrl } = reporte as { fotoUrl?: string | null };
    return fotoUrl === undefined
      ? reporte
      : { ...reporte, fotoUrl: paraUrlCompleta(urlBase, fotoUrl) };
  }

  async function obter(id: number): Promise<Reporte> {
    const reporte = normalizar(await cliente.get<Reporte>(`/api/reportes/${id}`));
    return { ...reporte, historico: reporte.historico ?? [] };
  }

  return {
    listarCategorias,

    // O Idempotency-Key e obrigatorio no POST: repetir a chave devolve o mesmo reporte.
    criar: async (dados, chaveIdempotencia) => {
      const { categoriaId, ...resto } = dados;
      const categoria = (await listarCategorias()).find((c) => c.id === categoriaId);
      if (!categoria) {
        throw new ErroApi(400, 'Categoria inválida. Escolha uma das categorias da lista.');
      }
      const criado = await cliente.post<Reporte>(
        '/api/reportes',
        {
          ...resto,
          categoria: categoria.codigo,
          fotoUrl: paraCaminhoDaApi(urlBase, dados.fotoUrl),
        },
        { cabecalhos: { 'Idempotency-Key': chaveIdempotencia } },
      );
      return { ...normalizar(criado), historico: criado.historico ?? [] };
    },

    listarMeus: async (pagina, tamanho) => {
      const resultado = await cliente.get<Pagina<ReporteResumo>>(
        `/api/reportes/meus?page=${pagina}&size=${tamanho}`,
      );
      return { ...resultado, itens: resultado.itens.map(normalizar) };
    },

    obter,

    // fotoUrl: ausente = manter a foto atual, null = remover, texto = trocar.
    editar: async (id, dados) => {
      const atual = await obter(id);
      const fotoUrl = dados.fotoUrl === undefined ? (atual.fotoUrl ?? null) : dados.fotoUrl;
      const editado = await cliente.put<Reporte>(`/api/reportes/${id}`, {
        descricao: dados.descricao,
        endereco: atual.endereco ?? null,
        fotoUrl: paraCaminhoDaApi(urlBase, fotoUrl),
      });
      return { ...normalizar(editado), historico: editado.historico ?? [] };
    },

    cancelar: (id) => cliente.delete<void>(`/api/reportes/${id}`),
  };
}
