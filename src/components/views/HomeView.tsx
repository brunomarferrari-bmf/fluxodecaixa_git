import React from 'react';
import { Transaction, ActiveView, Tag } from '../../types';
import { TagBadge } from '../TagBadge';
import {
  formatCurrency,
  getTodayISO,
  formatDateBR,
  formatDayOfWeek,
} from '../../utils/formatters';
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Plus,
  Calendar,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

interface HomeViewProps {
  transactions: Transaction[];
  tags?: Tag[];
  onOpenNewTransaction: (date?: string) => void;
  onEditTransaction: (tx: Transaction) => void;
  setActiveView: (view: ActiveView) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  transactions,
  tags,
  onOpenNewTransaction,
  onEditTransaction,
  setActiveView,
}) => {
  const todayIso = getTodayISO();

  // Filter today's transactions
  const todayTransactions = transactions.filter((tx) => tx.date === todayIso);

  // Compute today's entries, exits, and balance
  const todayEntries = todayTransactions
    .filter((tx) => tx.type === 'entrada')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const todayExits = todayTransactions
    .filter((tx) => tx.type === 'saida')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const todayBalance = todayEntries - todayExits;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Welcome & Date Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-gray-200 p-5 rounded-lg shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-[#C19848] text-[11px] font-semibold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            Visão Geral Diária
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            TheParlor — Fluxo de Hoje
          </h2>
          <p className="text-gray-500 text-xs mt-0.5 font-medium">
            {formatDayOfWeek(todayIso)}, {formatDateBR(todayIso)}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onOpenNewTransaction('')}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-2 rounded-md shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Lançamento</span>
          </button>

          <button
            onClick={() => setActiveView('calendario')}
            className="flex items-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs px-3.5 py-2 rounded-md border border-gray-300 transition-all cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-[#C19848]" />
            <span>Calendário Mensal</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Today's Balance Card */}
        <div className="p-5 rounded-lg bg-white border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Saldo do Dia
            </span>
            <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
              todayBalance >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
            }`}>
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-2xl sm:text-3xl font-bold font-mono mt-2 ${
            todayBalance >= 0 ? 'text-emerald-600' : 'text-red-600'
          }`}>
            {formatCurrency(todayBalance)}
          </p>
          <p className="text-[11px] text-gray-500 mt-1.5 font-medium">
            Entradas ({formatCurrency(todayEntries)}) − Saídas ({formatCurrency(todayExits)})
          </p>
        </div>

        {/* Total Entries */}
        <div className="p-5 rounded-lg bg-white border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Total de Entradas
            </span>
            <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-emerald-600 mt-2">
            {formatCurrency(todayEntries)}
          </p>
          <p className="text-[11px] text-gray-500 mt-1.5 font-medium">
            {todayTransactions.filter((tx) => tx.type === 'entrada').length} lançamento(s) de entrada
          </p>
        </div>

        {/* Total Exits */}
        <div className="p-5 rounded-lg bg-white border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Total de Saídas
            </span>
            <div className="w-8 h-8 rounded-md bg-red-50 text-red-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-red-600 mt-2">
            {formatCurrency(todayExits)}
          </p>
          <p className="text-[11px] text-gray-500 mt-1.5 font-medium">
            {todayTransactions.filter((tx) => tx.type === 'saida').length} lançamento(s) de saída
          </p>
        </div>

      </div>

      {/* Today's Transactions List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-xs">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              Lançamentos de Hoje ({todayTransactions.length})
            </h3>
            <p className="text-[11px] text-gray-500 font-medium mt-0.5">
              Clique em qualquer linha para editar ou detalhar o lançamento
            </p>
          </div>
          <button
            onClick={() => onOpenNewTransaction(todayIso)}
            className="flex items-center gap-1 text-xs font-semibold text-[#C19848] hover:text-[#C19848]/90 bg-[#E4D8BE]/20 hover:bg-[#E4D8BE]/30 border border-[#C19848]/20 px-3 py-1.5 rounded-md transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar a Hoje</span>
          </button>
        </div>

        {todayTransactions.length === 0 ? (
          <div className="p-10 text-center text-gray-500 text-xs font-medium">
            Nenhum lançamento registrado no dia de hoje.
            <div className="mt-3">
              <button
                onClick={() => onOpenNewTransaction(todayIso)}
                className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold px-3.5 py-2 rounded-md transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                Registrar primeiro lançamento de hoje
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {todayTransactions.map((tx) => (
              <div
                key={tx.id}
                onClick={() => onEditTransaction(tx)}
                className="p-3.5 hover:bg-gray-50 transition-all cursor-pointer flex items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-md shrink-0 flex items-center justify-center font-bold ${
                    tx.type === 'entrada'
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      : 'bg-red-50 text-red-600 border border-red-100'
                  }`}>
                    {tx.type === 'entrada' ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {tx.recurrenceRuleId && !tx.recurrenceModified && (
                        <RefreshCw className="w-3.5 h-3.5 text-purple-500 shrink-0" title="Gerado por recorrência" />
                      )}
                      <p className="text-xs font-semibold text-gray-900 truncate group-hover:text-[#C19848] transition-colors">
                        {tx.title}
                      </p>
                      <TagBadge categoryName={tx.category || tx.tagCode} tags={tags} />
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] text-gray-700 font-medium">{tx.category}</span>
                      <span>•</span>
                      <span>{tx.paymentMethod}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className={`text-sm sm:text-base font-bold font-mono ${
                    tx.type === 'entrada' ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {tx.type === 'entrada' ? '+' : '-'} {formatCurrency(tx.amount)}
                  </p>
                  <p className="text-[10px] text-gray-400 capitalize font-medium">
                    {tx.type}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
