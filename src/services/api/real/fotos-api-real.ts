// API de fotos REAL: envia a foto do reporte para a API .NET (POST /api/fotos, multipart) e
// recebe a URL guardada. O reporte so leva essa URL (docs/adr/0008).

import type { ClienteHttp } from '../cliente-http';
import type { FotosApi } from '../types';

export function criarFotosApiReal(cliente: ClienteHttp): FotosApi {
  return {
    enviar: (arquivo) => cliente.enviarArquivo<{ fotoUrl: string }>('/api/fotos', arquivo),
  };
}
