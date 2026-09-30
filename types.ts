/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CadUsuario {
  Id: string;
  Nome: string;
  Senha: string;
  Permissoes: "Administrador" | "Usuário";
  Segmento?: "petshop" | "lavarapido" | string;
  Tipo_Assinatura?: "Mensal" | "Teste" | "Vitalício";
  Data_Inicio?: string;
  Data_Validade?: string;
  NivelAcesso?: string;
  permission_level?: number;
  IdUsuarioMaster?: string;
  Email?: string;
  Fone?: string;
  Endereco?: string;
  Observacoes?: string;
}

export interface CadCliente {
  Id: string;
  Nome: string;
  Telefone: string;
  Endereco: string;
  Ativo: boolean;
  IdUsuarioDono: string;
  CpfCnpj?: string;
  RgIe?: string;
  Email?: string;
  Cep?: string;
  Numero?: string;
  Complemento?: string;
  Bairro?: string;
  Cidade?: string;
  Estado?: string;
  DataNascimento?: string;
  DataCadastro?: string;
  LimiteCredito?: number;
  SaldoDevedor?: number;
}

export interface CadPets {
  Id: string;
  Nome: string;
  Especie: string;
  Raca?: string; // Foreign Key or string value of CadRaca
  Porte: string;
  Sexo: string;
  IdCliente: string; // Foreign Key to CadCliente
  Ativo: boolean;
  // Novos campos clínicos / manejo (Custo R$ 0,00 de IA)
  Alergias_Restricoes?: string;
  Condicao_Saude?: string;
  Medicamento_Uso?: string;
  Data_Vacina_Raiva?: string;
  Nivel_Agressiveness?: "Dócil" | "Arisco" | "Bravo" | string;
  Medos_Traumas?: string;
  Obs_Manejo?: string;
  Tipo_Pelo?: "Curto" | "Longo" | "Duro" | "Primitivo" | string;
  EstStyle_Tosa_Preferido?: string;
  Data_Nascimento?: string;
  Foto_Pet?: string;
}

export interface CadProdutos {
  Id: string;
  Nome: string;
  Tipo: string;
  Preco: number;
  Ativo: boolean;
  Custo?: number;
  CodigoDeBarras?: string;
  UnidadeMedida?: string;
  Fornecedor?: string;
  DataUltimaCompra?: string;
  NCM?: string;
  CEST?: string;
  OrigemProduto?: string | number;
  IdUsuarioDono?: string;
}

export interface LotesProdutos {
  IdLote: string;
  IdProduto: string; // Foreign Key to CadProdutos
  NumeroLote: string;
  QuantidadeLote: number;
  ValidadeLote: string; // Date "YYYY-MM-DD"
  DataEntrada: string; // Date "YYYY-MM-DD"
  Ativo?: boolean;
}

export interface CadRaca {
  Id: string;
  Raca: string;
  Especie: string;
  IdUsuarioDono?: string;
  status_registro?: string;
}

export interface CadMovDiario {
  Id: string;
  Cliente: string; // Id of CadCliente or Name of CadCliente
  Telefone: string; // Auto-filled from Client
  Endereco: string; // Auto-filled from Client
  Observacao: string;
  IdUsuarioDono: string; // Isolated per user
  Data?: string; // Data opcional para compatibilidade de backups
  Hora?: string;
  Status?: string;
  Ativo?: boolean;
  Total?: number;
}

export interface CadDetMovDiario {
  Id: string;
  IdCadMovDiario: string; // Foreign key back to CadMovDiario
  IdPet?: string; // Foreign key link pointing directly to CadPets.Id (Logical Type: Text)
  Data: string; // YYYY-MM-DD
  Hora: string; // HH:MM
  NomePet: string; // Auto-filled pet name from selected client's pets
  Quantidade: number;
  Servico: string; // ID of CadProdutos or Name of CadProdutos
  PrecoUnitario: number; // Auto-filled price of CadProdutos
  Tipo?: "Entrada" | "Saída"; // Dynamic option for positive or negative line totals
  TotalDaLinha: number; // Calculated: PrecoUnitario * Quantidade (signed positive or negative)
  Realizado: boolean;
  Pago: boolean;
  PagoEm?: string;
  Ativo: boolean;
}

export interface CadInfoConta {
  Id: string;
  NomeEmpresa: string;
  Logo: string; // Base64 image
  Endereco: string;
  Fone: string;
  CorFundo: string; // Hex color or Tailwind class name
  IdUsuarioDono: string;
  Razao_Social?: string;
  Documento_Identificacao?: string;
  CEP_Estabelecimento?: string;
}

export interface AiConsumptionLog {
  Id: string;
  IdUsuario: string;
  NomeUsuario: string;
  TipoRequisicao: string; // ex: "Análise Comercial", "Resumo de Atendimentos", etc.
  DataHora: string; // YYYY-MM-DD HH:MM
  InputTokens: number;
  OutputTokens: number;
  TotalTokens: number;
}

// Full state of simulated database
export interface QueuedAiRequest {
  Id: string;
  UserId: string;
  UserName: string;
  Tipo: string;
  Periodo: string; // key: "start_end"
  DataHora: string;
  Stats: {
    totalRevenue: number;
    totalScheduled: number;
    realizadosCount: number;
    faturamentoPendente: number;
    topClient: string;
    topService: string;
    ticketMedio: string;
  };
}

export interface HistoricoAcoes {
  ID_Historico: string;
  Master_ID: string;
  Nome_Usuario: string;
  Nivel_Usuario: string;
  Data_Hora: string;
  Descricao: string;
}

export interface CadFornecedores {
  ID_Fornecedor: string;
  Nome_Fornecedor: string;
  Categoria: string;
  Telefone: string;
  CNPJ_CPF: string;
  Chave_Pix: string;
}

export type CadFronecedores = CadFornecedores;

export interface DatabaseState {
  usuarios: CadUsuario[];
  clientes: CadCliente[];
  pets: CadPets[];
  produtos: CadProdutos[];
  lotesProdutos: LotesProdutos[];
  racas: CadRaca[];
  movimentos: CadMovDiario[];
  detalhesMov: CadDetMovDiario[];
  infoContas: CadInfoConta[];
  aiConsumo?: AiConsumptionLog[];
  aiConsumoQueue?: QueuedAiRequest[];
  aiRelatoriosGerados?: { [key: string]: boolean }; // Rule 3: Trava de Execução Única por Status
  prePedidos?: PrePedido[];
  prePedidoItens?: PrePedidoItens[];
  caixaDiario?: CaixaDiario[];
  caixaMovimentacao?: CaixaMovimentacao[];
  caixaSaldosForma?: CaixaSaldosForma[];
  historicoAcoes?: HistoricoAcoes[];
  fornecedores?: CadFornecedores[];
  prePedidosCompra?: PrePedidoCompra[];
  controleRetornos?: ControleRetorno[];
  formQuestions?: FormQuestionItem[];
  atendimentosForm?: AtendimentoFormItem[];
}

export interface FormQuestionItem {
  Id: string;
  Texto: string;
  Tipo: "Texto" | "Opções" | "Sim/Não";
  Opcoes?: string;
  Ordem: number;
}

export interface AtendimentoFormPet {
  nome: string;
  raca: string;
  idade: string;
  pelo: string;
  temperamento: string;
  cuidado: string;
  alergico: string;
  servico: string;
}

export interface AtendimentoFormItem {
  Id: string;
  TutorNome: string;
  TutorTelefone: string;
  Status: "Pendente" | "Concluído";
  CreatedAt: string;
  CompletedAt?: string;
  Respostas?: Record<string, string>;
  Pets?: AtendimentoFormPet[];
  TutorEndereco?: string;
  TutorLevaTraz?: string;
}

export interface ControleRetorno {
  Id: string;
  IdCliente: string;
  NomeCliente: string;
  IdPet: string;
  NomePet: string;
  UltimoServico: string;
  NomeServico: string;
  DataSugerida: string;
  DataRegistro: string;
  Status: "Pendente" | "Agendado";
  IdUsuarioDono?: string;
}

export type ThemeColor = {
  name: string;
  primary: string;
  bgLightHex: string;
  accent: string;
  text: string;
  border: string;
};

export interface PrePedidoCompraItem {
  ID_Produto: string;
  Quantidade_Pedida: number;
  Preco_Custo_Atual: number;
}

export interface PrePedidoCompra {
  ID_Pedido: string;
  ID_Fornecedor: string;
  Data_Pedido: string;
  Status: "Pendente" | "Enviado" | "Recebido";
  Itens: PrePedidoCompraItem[];
  IdUsuarioDono?: string; // Isolated per user just like movements and clients
}

export interface PrePedido {
  Id: string;
  NomeCliente: string;
  Data: string;
  Hora: string;
  Status: string;
  Cliente?: string;
  DataHora?: string;
  IdUsuarioDono?: string;
}

export interface PrePedidoItens {
  Id: string;
  IdPrePedido: string;
  IdProdutoServico: string;
  Quantidade: number;
  ValorUnitario: number;
  IdProduto?: string;
  NomeProduto?: string;
  PrecoUnitario?: number;
}

export interface CaixaDiario {
  Id: string;
  IdUsuarioMaster: string;
  DataAbertura: string;
  DataFechamento?: string;
  SaldoInicial: number;
  Status: "Aberto" | "Fechado";
  IdUsuarioDono?: string;
}

export interface CaixaMovimentacao {
  Id: string;
  IdCaixaDiario: string;
  Tipo: "Entrada" | "Saída";
  Origem: "Venda" | "Sangria" | "Suprimento";
  Valor: number;
  FormaPagamento: string;
  DataHora: string;
  // Extended fields for sales history tracking
  IdVenda?: string;
  NomeCliente?: string;
  ClienteId?: string;
  DocumentoCliente?: string;
  Itens?: string; // stringified JSON format of BoxCartItem[]
  StatusVenda?: "Ativo" | "Cancelado";
  ValorTotalVenda?: number;
  ValorOriginal?: number;
  ValorCobrado?: number;
  DataAgendamento?: string;
  Observacao?: string;
  IdUsuarioDono?: string;
}

export interface CaixaSaldosForma {
  Id: string;
  IdUsuarioMaster: string;
  FormaPagamento: string;
  SaldoAcumulado: number;
}

