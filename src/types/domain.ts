export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: "cold" | "warm" | "hot";
  lastContact: string;
  nextAction: string;
  interest: number;
  createdAt: string;
  notes: string;
  interactions: Interaction[];
}

export interface Interaction {
  id: string;
  type: "call" | "whatsapp" | "email" | "meeting";
  date: string;
  notes: string;
}

export interface Sale {
  id: string;
  clientName: string;
  cardValue: number;
  downPayment: number;
  commission: number;
  status: "pending" | "approved" | "paid";
  clientStatus: "ativo" | "inadimplente" | "quitado";
  date: string;
  productType: string;
  installments?: number;
  installmentValue?: number | null;
  /** Soma das parcelas com status paga (não é a entrada à vista do contrato). */
  paidInstallments?: number;
  lanceOfertado?: boolean;
  diaAssembleia?: number | null;
  dataAssembleia?: string | null;
  cpf?: string;
  phone?: string;
  email?: string;
  notes?: string;
  adminFee?: number;
  commissionPercent?: number;
  sellerName?: string;
  parcelas?: Parcela[];
  parcelasResumo?: ParcelasResumo;
}

export interface ParcelasResumo {
  total: number;
  pagas: number;
  pendentes: number;
  atrasadas: number;
  valorPago: number;
  valorPendente: number;
  valorAtrasado: number;
}

export interface Parcela {
  id: string;
  saleId: string;
  numero: number;
  dueDate: string;
  amount: number;
  paidAt: string | null;
  status: "pendente" | "paga" | "atrasada";
  clientName?: string;
  productType?: string;
}

export interface Seller {
  id: string;
  name: string;
  avatar: string;
  totalSales: number;
  commission: number;
  position: number;
  badge?: string | null;
  monthGoal?: number;
  contracts?: number;
  goalProgress?: number;
  inadimplentes?: number;
  totalEntrada?: number;
}

export type UserRole = "MASTER" | "ADMIN" | "VENDEDOR";

export interface AuthUser {
  id: number;
  login: string;
  nome: string;
  email: string;
  role?: UserRole;
  empresa_id?: number | null;
  month_goal?: number;
}

export interface ManagedUser {
  id: number;
  login: string;
  nome: string;
  email: string;
  role: UserRole;
  status: "ATIVO" | "INATIVO";
  monthGoal: number;
  empresaId?: number | null;
  cobrarFatura?: boolean;
}

export type AuditNivel = "INFO" | "WARN" | "ERROR" | "SECURITY";

export interface AuditLogEntry {
  id: number;
  empresaId: number | null;
  usuarioId: number | null;
  usuarioNome: string | null;
  usuarioLogin: string | null;
  nivel: AuditNivel;
  acao: string;
  recurso: string;
  recursoId: string;
  mensagem: string;
  ip: string;
  createdAt: string;
  payload: Record<string, unknown> | null;
}

export type FormaCobranca = "MENSAL" | "ANUAL";
export type EmpresaStatus = "ATIVA" | "INATIVA" | "SUSPENSA";
export type FaturaStatus = "ABERTA" | "PAGA" | "PARCIAL" | "VENCIDA" | "CANCELADA";

export interface Plano {
  id: number;
  codigo: string;
  nome: string;
  descricao: string;
  valorMensal: number;
  valorAnual: number;
  maxUsuarios: number | null;
  ativo: boolean;
}

export interface Empresa {
  id: number;
  nome: string;
  slug: string;
  documento: string;
  email: string;
  telefone: string;
  status: EmpresaStatus;
  planoCodigo: string;
  planoNome?: string;
  precoPersonalizado?: boolean;
  formaCobranca: FormaCobranca;
  valorMensalUsuario: number;
  valorAnualUsuario: number;
  diaVencimento: number;
  observacoes?: string;
  qtdUsuarios: number;
  qtdUsuariosCobraveis?: number;
  valorEstimadoFatura: number;
  admin?: ManagedUser | null;
  usuarios?: ManagedUser[];
  faturaAberta?: Fatura | null;
}

export interface FaturaItem {
  id: number;
  faturaId: number;
  usuarioId: number;
  usuarioNome: string;
  valor: number;
  valorPago: number;
  saldo: number;
  status: "ABERTA" | "PAGA";
  pagoEm: string | null;
}

export interface Fatura {
  id: number;
  empresaId: number;
  empresaNome: string;
  numero: string;
  tipoMovimento: "RECEBER" | "PAGAR";
  tipoPeriodo: "MENSAL" | "ANUAL" | "AVULSA";
  referencia: string;
  descricao: string;
  valor: number;
  valorPago: number;
  saldo: number;
  status: FaturaStatus;
  vencimento: string;
  pagoEm: string | null;
  observacoes?: string;
  itens?: FaturaItem[];
  itensPagos?: number;
  itensTotal?: number;
}

export interface FaturasResumo {
  empresa: {
    nome: string;
    status: EmpresaStatus;
    planoCodigo: string;
    planoNome?: string;
    planoPremium: boolean;
    formaCobranca: FormaCobranca;
    valorMensalUsuario: number;
    valorAnualUsuario: number;
    diaVencimento: number;
    qtdUsuarios: number;
    qtdUsuariosCobraveis?: number;
    valorEstimadoFatura: number;
  };
  cobrarFatura: boolean;
  faturaAberta: Fatura | null;
  proximoVencimento: string | null;
  totalEmAberto: number;
  faturasEmAberto: Fatura[];
  faturasPagas: Fatura[];
  meuItem: FaturaItem | null;
}

export interface FinanceiroGeral {
  aReceber: number;
  aPagar: number;
  totalEmAberto: number;
  totalPago: number;
}

export interface DashboardStats {
  totalSales: number;
  totalEntrada?: number;
  totalRecebido?: number;
  contractsCount: number;
  leadsCount?: number;
  totalLeads?: number;
  activeClientsPercent: number;
  delinquentClientsPercent: number;
  clientsAtivos: number;
  clientsInadimplentes: number;
  clientsQuitados?: number;
  totalClients: number;
}
