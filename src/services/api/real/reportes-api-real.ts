// API de reportes REAL: fala com a API .NET pelo cliente HTTP (docs/adr/0002).
// Implementa o mesmo contrato ReportesApi da API falsa, entao as telas nao percebem a troca.
// Caminhos conforme o plano unico (secao 8.2).

import type { ClienteHttp } from '../cliente-http';
import type { Categoria, Pagina, Reporte, ReporteResumo, ReportesApi } from '../types';

export function criarReportesApiReal(cliente: ClienteHttp): ReportesApi {
  return {
    listarCategorias: () => cliente.get<Categoria[]>('/api/categorias'),

    // O Idempotency-Key e obrigatorio no POST: repetir a chave devolve o mesmo reporte.
    criar: (dados, chaveIdempotencia) =>
      cliente.post<Reporte>('/api/reportes', dados, {
        cabecalhos: { 'Idempotency-Key': chaveIdempotencia },
      }),

    listarMeus: (pagina, tamanho) =>
      cliente.get<Pagina<ReporteResumo>>(`/api/reportes/meus?page=${pagina}&size=${tamanho}`),

    obter: (id) => cliente.get<Reporte>(`/api/reportes/${id}`),

    editar: (id, dados) => cliente.put<Reporte>(`/api/reportes/${id}`, dados),

    cancelar: (id) => cliente.delete<void>(`/api/reportes/${id}`),
  };
}
