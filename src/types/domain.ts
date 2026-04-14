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
  commission: number;
  status: "pending" | "approved" | "paid";
  date: string;
  productType: string;
}

export interface Seller {
  id: string;
  name: string;
  avatar: string;
  totalSales: number;
  commission: number;
  position: number;
  badge?: string;
  monthGoal?: number;
}

export interface AuthUser {
  id: number;
  login: string;
  nome: string;
  email: string;
  month_goal?: number;
}
