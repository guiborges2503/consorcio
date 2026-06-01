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
  cpf?: string;
  phone?: string;
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

export type UserRole = "ADMIN" | "VENDEDOR";

export interface AuthUser {
  id: number;
  login: string;
  nome: string;
  email: string;
  role?: UserRole;
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
