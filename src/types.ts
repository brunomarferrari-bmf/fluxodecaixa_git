export type TransactionType = 'entrada' | 'saida';

export const CATEGORIAS_SAIDA = [
  'Cozinha',
  'Bar',
  'Aluguel',
  'Salários',
  'Fornecedores',
  'Manutenção e equipamento',
  'Impostos e taxas',
  'Outros',
] as const;

export const CATEGORIAS_ENTRADA = [
  'Vendas',
  'Aporte',
  'Reembolso',
  'Outros',
] as const;

export type CategoriaSaida = typeof CATEGORIAS_SAIDA[number];
export type CategoriaEntrada = typeof CATEGORIAS_ENTRADA[number];

export const FORMAS_PAGAMENTO = [
  'PIX',
  'Cartão de crédito',
  'Cartão de débito',
  'Dinheiro',
  'Transferência',
] as const;

export type FormaPagamento = typeof FORMAS_PAGAMENTO[number];

export interface Category {
  id: string;
  name: string; // Ex: "Aluguel", "Fornecedor", "Caixa", "Salário", "Transferência no bank"
  color?: string; // Hex color code (e.g. #2563eb)
  observation?: string; // Observação / Descrição estendida
  code?: string; // Backwards compatibility
}

export type Tag = Category;

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  title: string; // Nome do lançamento
  amount: number; // Valor em Reais (positivo)
  type: TransactionType; // 'entrada' | 'saida'
  category: string;
  tagCode: string; // Código ou Nome da categoria
  paymentMethod: FormaPagamento | string;
  description?: string;
  createdAt: string;
  recurrenceRuleId?: string; // ID of the recurrence rule that generated this
  recurrenceModified?: boolean; // If this specific occurrence was modified manually
}

export type RecurrenceFrequency = 'semanal' | 'quinzenal' | 'mensal' | 'bimestral' | 'anual';

export interface RecurrenceRule {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  category: string;
  tagCode: string;
  paymentMethod: string;
  frequency: RecurrenceFrequency;
  repeatDay: string; // '1'-'31' or '0'-'6' for day of week
  startDate: string;
  endDate?: string;
  isPaused: boolean;
  createdAt: string;
}

export interface FilterState {
  category: string;
  tagCode: string;
  startDate: string;
  endDate: string;
  paymentMethod: string;
  type: 'todos' | 'entrada' | 'saida';
  searchQuery: string;
}

export type ActiveView = 'inicio' | 'calendario' | 'semanal' | 'fechamento' | 'busca' | 'tags' | 'categorias' | 'excel' | 'recorrencias';

export interface ImportValidationResult {
  validRows: Array<{
    date: string;
    type: TransactionType;
    title: string;
    amount: number;
    category: string;
    tagCode: string;
    paymentMethod: string;
    description: string;
  }>;
  errors: Array<{
    rowIndex: number;
    reason: string;
    data: any;
  }>;
}

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl?: string;
  role?: string;
  accessLevel?: string;
}
