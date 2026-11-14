// Contrato da API de autenticacao (API Java), conforme a secao 6 do plano unico.
// A API real e a API falsa implementam esta mesma interface, entao as telas nao sabem qual usam.

export type Papel = 'CIDADAO' | 'CUIDADOR' | 'GESTOR';

export interface Usuario {
  id: number;
  nome: string;
  role: Papel;
}

export interface Sessao {
  token: string;
  /** Data de vencimento do token, em texto ISO 8601. */
  expiraEm: string;
  usuario: Usuario;
}

export interface DadosCadastro {
  nome: string;
  email: string;
  telefone: string;
  senha: string;
  /** O gestor nao se cadastra pelo app (e criado por script no banco). */
  role: 'CIDADAO' | 'CUIDADOR';
  consentimento: boolean;
}

export interface AuthApi {
  /** Erros: 401 (e-mail ou senha errados), 0 (sem conexao). */
  login(email: string, senha: string): Promise<Sessao>;
  /** Erros: 400 (dados invalidos), 409 (e-mail ja cadastrado), 0 (sem conexao). */
  cadastrar(dados: DadosCadastro): Promise<Usuario>;
  /** Exclui a propria conta (direito do titular na LGPD). Erro: 401 (token invalido). */
  excluirConta(token: string): Promise<void>;
}

// ---------------------------------------------------------------------------------------------
// Reportes de zeladoria (API .NET), conforme as secoes 7 e 8.2 do plano unico.
// ---------------------------------------------------------------------------------------------

export type Urgencia = 'BAIXA' | 'MEDIA' | 'ALTA';

/** ABERTO -> EM_ANALISE -> EM_EXECUCAO -> RESOLVIDO; ABERTO -> CANCELADO (pelo cidadao). */
export type StatusReporte = 'ABERTO' | 'EM_ANALISE' | 'EM_EXECUCAO' | 'RESOLVIDO' | 'CANCELADO';

export interface Categoria {
  id: number;
  /** Ex.: CALCADA, RAMPA, BURACO, ILUMINACAO, SEMAFORO_SONORO, PISO_TATIL, LIXO, OUTRO. */
  codigo: string;
  nome: string;
}

export interface HistoricoStatus {
  /** null na criacao do reporte. */
  statusAnterior: StatusReporte | null;
  statusNovo: StatusReporte;
  observacao?: string;
  /** Texto ISO 8601. */
  criadoEm: string;
}

/** O que a lista "Meus reportes" mostra. */
export interface ReporteResumo {
  id: number;
  /** Ex.: "VV-2026-000123". */
  protocolo: string;
  categoria: Categoria;
  descricao: string;
  urgencia: Urgencia;
  status: StatusReporte;
  criadoEm: string;
}

/** Reporte completo, como o detalhe mostra. */
export interface Reporte extends ReporteResumo {
  latitude: number;
  longitude: number;
  /** Rua e numero, quando o aparelho conseguiu converter o GPS. */
  endereco?: string;
  fotoUrl?: string;
  atualizadoEm: string;
  historico: HistoricoStatus[];
}

/**
 * Pagina de resultados. Suposicao (confirmar com quem faz a API .NET): "pagina" comeca em 1 e a
 * resposta traz { itens, pagina, tamanho, total }.
 */
export interface Pagina<T> {
  itens: T[];
  pagina: number;
  tamanho: number;
  total: number;
}

export interface DadosNovoReporte {
  categoriaId: number;
  descricao: string;
  latitude: number;
  longitude: number;
  endereco?: string;
  /** URL devolvida pelo upload da foto (FotosApi.enviar). */
  fotoUrl?: string;
  urgencia: Urgencia;
}

/** Edicao so de descricao e foto, e so com o reporte ABERTO. */
export interface DadosEdicaoReporte {
  descricao: string;
  /** undefined mantem a foto; null remove; texto troca. */
  fotoUrl?: string | null;
}

export interface ReportesApi {
  /** Erro: 0 (sem conexao). */
  listarCategorias(): Promise<Categoria[]>;
  /**
   * Cria o reporte. A "chaveIdempotencia" (UUID gerado ao abrir o formulario) vai no cabecalho
   * Idempotency-Key: repetir a mesma chave com o mesmo corpo devolve o MESMO reporte.
   * Erros: 400 (dados invalidos ou sem chave), 422 (chave ja usada com outro conteudo),
   * 429 (muitas criacoes por minuto), 401, 0.
   */
  criar(dados: DadosNovoReporte, chaveIdempotencia: string): Promise<Reporte>;
  /** Lista so os reportes do proprio usuario, do mais novo ao mais antigo. Erro: 400, 401, 0. */
  listarMeus(pagina: number, tamanho: number): Promise<Pagina<ReporteResumo>>;
  /** Erros: 404 (nao existe ou e de outra pessoa), 401, 0. */
  obter(id: number): Promise<Reporte>;
  /** Erros: 400, 404, 409 (o reporte nao esta mais ABERTO), 401, 0. */
  editar(id: number, dados: DadosEdicaoReporte): Promise<Reporte>;
  /** Cancela (status CANCELADO). Erros: 404, 409 (nao esta mais ABERTO), 401, 0. */
  cancelar(id: number): Promise<void>;
}

/** Foto escolhida no aparelho, pronta para o upload. */
export interface ArquivoFoto {
  uri: string;
  nome: string;
  /** "image/jpeg" ou "image/png". */
  tipo: string;
}

export interface FotosApi {
  /** Envia a foto e devolve a URL guardada (o banco so guarda a URL). Erros: 400 (tipo), 401, 0. */
  enviar(arquivo: ArquivoFoto): Promise<{ fotoUrl: string }>;
}

// ---------------------------------------------------------------------------------------------
// Contatos de emergencia (API Java), conforme as secoes 5 e 8.1 do plano unico.
// ---------------------------------------------------------------------------------------------

export interface Contato {
  id: number;
  nome: string;
  /** Como a pessoa chama o contato; o assistente usa para "ligar para minha filha". */
  apelido: string;
  /** So digitos, com DDD (10 ou 11). */
  telefone: string;
  /**
   * Suposicao (confirmar com quem faz a API Java): inteiro de 1 a 5, sendo 1 o mais importante
   * (primeiro a ser chamado).
   */
  prioridade: number;
}

export interface DadosContato {
  nome: string;
  apelido: string;
  /** Pode vir com mascara, ex.: "(11) 98888-7777"; a API guarda so os digitos. */
  telefone: string;
  prioridade: number;
}

export interface ContatosApi {
  /**
   * Lista so os contatos do proprio usuario, por prioridade e depois por nome. "pagina" comeca
   * em 1 no app (a API real converte para o 0 do Spring). Erros: 400, 401, 0.
   */
  listar(pagina: number, tamanho: number): Promise<Pagina<Contato>>;
  /** Erros: 404 (nao existe ou e de outra pessoa), 401, 0. */
  obter(id: number): Promise<Contato>;
  /** Erros: 400 (dados invalidos, com "campos"), 401, 0. */
  criar(dados: DadosContato): Promise<Contato>;
  /** Erros: 400, 404, 401, 0. */
  editar(id: number, dados: DadosContato): Promise<Contato>;
  /** Erros: 404, 401, 0. */
  excluir(id: number): Promise<void>;
}
