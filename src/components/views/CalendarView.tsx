import React, { useState } from 'react';
import { Transaction, Tag, Account, AccountTransfer } from '../../types';
import { TagBadge } from '../TagBadge';
import { WeeklyView } from './WeeklyView';
import {
  formatCurrency,
  formatMonthYear,
  formatDateBR,
  formatDayOfWeek,
  getTodayISO,
} from '../../utils/formatters';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Calendar as CalendarIcon,
  CalendarDays,
  Wallet,
} from 'lucide-react';

interface CalendarViewProps {
  transactions: Transaction[];
  tags?: Tag[];
  onOpenNewTransaction: (date: string) => void;
  onEditTransaction: (tx: Transaction) => void;
  accounts?: Account[];
  transfers?: AccountTransfer[];
  initialViewMode?: 'mensal' | 'semanal';
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  transactions,
  tags,
  onOpenNewTransaction,
  onEditTransaction,
  accounts = [],
  transfers = [],
  initialViewMode = 'semanal',
}) => {
  const todayIso = getTodayISO();
  const todayParts = todayIso.split('-').map(Number);

  // View mode state (mensal vs semanal - default semanal per Section 1)
  const [viewMode, setViewMode] = useState<'mensal' | 'semanal'>(initialViewMode);

  // Month state (zero-based month index: 0 = January, 6 = July, etc.)
  const [currentYear, setCurrentYear] = useState<number>(todayParts[0]);
  const [currentMonth, setCurrentMonth] = useState<number>(todayParts[1] - 1);

  // Selected Day state for Day Detail view (Section 4.4)
  const [selectedDayIso, setSelectedDayIso] = useState<string | null>(todayIso);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Build grid calendar days for current month (Segunda a Domingo - 7 dias)
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday...

  // Offset in a 7-day week grid starting on Monday (1):
  // If 1st is Monday (1) -> 0 blank boxes. If 1st is Sunday (0) -> 6 blank boxes.
  const startOffset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  const dayBoxes: Array<{ dateIso: string; dayNumber: number } | null> = [];

  // Padding blank boxes before start of month
  for (let i = 0; i < startOffset; i++) {
    dayBoxes.push(null);
  }

  // Actual days in month (all 7 days including Sunday)
  for (let day = 1; day <= daysInMonth; day++) {
    const monthStr = String(currentMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateIso = `${currentYear}-${monthStr}-${dayStr}`;
    dayBoxes.push({ dateIso, dayNumber: day });
  }

  // Month Totals & End of Month Account Balance
  const monthStr = String(currentMonth + 1).padStart(2, '0');
  const startOfMonthIso = `${currentYear}-${monthStr}-01`;
  const endOfMonthIso = `${currentYear}-${monthStr}-${String(daysInMonth).padStart(2, '0')}`;

  const monthTransactions = transactions.filter((tx) => tx.date >= startOfMonthIso && tx.date <= endOfMonthIso);
  const monthEntries = monthTransactions
    .filter((tx) => tx.type === 'entrada')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const monthExits = monthTransactions
    .filter((tx) => tx.type === 'saida')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const monthBalance = monthEntries - monthExits;

  const getAccountTotalOnDate = (dateIso: string) => {
    let total = 0;
    accounts.forEach((acc) => {
      if (dateIso < acc.referenceDate) return;
      let accBal = acc.initialBalance;
      transactions.forEach((tx) => {
        const isLinked = tx.accountId === acc.id || (!tx.accountId && acc.isDefault);
        if (isLinked && tx.date >= acc.referenceDate && tx.date <= dateIso) {
          if (tx.type === 'entrada') accBal += tx.amount;
          else accBal -= tx.amount;
        }
      });
      transfers.forEach((tr) => {
        if (tr.date >= acc.referenceDate && tr.date <= dateIso) {
          if (tr.sourceAccountId === acc.id) accBal -= tr.amount;
          if (tr.destinationAccountId === acc.id) accBal += tr.amount;
        }
      });
      total += accBal;
    });
    return total;
  };

  // Helper to compute daily balance for a specific ISO date (Section 7 rule: day balance is independent)
  const getDayMetrics = (dateIso: string) => {
    const dayTxs = transactions.filter((tx) => tx.date === dateIso);
    const entries = dayTxs
      .filter((tx) => tx.type === 'entrada')
      .reduce((s, tx) => s + tx.amount, 0);
    const exits = dayTxs
      .filter((tx) => tx.type === 'saida')
      .reduce((s, tx) => s + tx.amount, 0);
    const balance = entries - exits;
    return { dayTxs, entries, exits, balance, hasTxs: dayTxs.length > 0 };
  };

  // Selected Day Details Metrics
  const selectedDayMetrics = selectedDayIso ? getDayMetrics(selectedDayIso) : null;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Main Fixed Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-gray-200 p-5 rounded-lg shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#203723] text-white flex items-center justify-center shrink-0 shadow-xs border border-[#C19848]/20">
            <CalendarIcon className="w-5 h-5 text-[#C19848]" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">
              Calendário
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              Controle e acompanhamento do fluxo de caixa por período
            </p>
          </div>
        </div>

        {/* View Mode Switcher Toggle & Novo Lançamento Button */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => onOpenNewTransaction(selectedDayIso || todayIso)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2 rounded-md shadow-xs transition-all active:scale-95 cursor-pointer"
            title="Novo Lançamento"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Lançamento</span>
          </button>

          <div className="inline-flex p-1 bg-gray-100 rounded-lg border border-gray-200 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('mensal')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'mensal'
                  ? 'bg-[#C19848] text-[#203723] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Visão Mensal</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('semanal')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'semanal'
                  ? 'bg-[#C19848] text-[#203723] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Visão Semanal</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main View Content: Weekly vs Monthly */}
      {viewMode === 'semanal' ? (
        <WeeklyView
          transactions={transactions}
          tags={tags}
          onOpenNewTransaction={onOpenNewTransaction}
          onEditTransaction={onEditTransaction}
          accounts={accounts}
          transfers={transfers}
        />
      ) : (
        <>
          {/* Subcategory / Month Period Navigation Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-gray-200 p-4 rounded-lg shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-[#E4D8BE]/20 border border-[#C19848]/20 text-[#C19848] flex items-center justify-center shrink-0">
                <CalendarIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Mês de {formatMonthYear(currentYear, currentMonth)}
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  Grade de saldos diários por mês
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="px-3 py-1.5 rounded-md bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold shadow-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Mês Anterior</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCurrentYear(todayParts[0]);
                  setCurrentMonth(todayParts[1] - 1);
                  setSelectedDayIso(todayIso);
                }}
                className="px-3 py-1.5 rounded-md bg-[#C19848] hover:bg-[#C19848]/90 text-[#203723] border border-[#C19848]/30 text-xs font-bold transition-all cursor-pointer"
              >
                Mês Atual
              </button>

              <button
                type="button"
                onClick={handleNextMonth}
                className="px-3 py-1.5 rounded-md bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold shadow-xs"
              >
                <span>Próximo Mês</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Month Total KPI Bar */}
          <div className={`grid grid-cols-1 ${accounts.length > 0 ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
            <div className="p-4 rounded-lg bg-white border border-gray-200 shadow-xs">
              <span className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider">
                Entradas do Mês
              </span>
              <p className="text-2xl font-bold font-mono text-emerald-600 mt-1">
                {formatCurrency(monthEntries)}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-white border border-gray-200 shadow-xs">
              <span className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider">
                Saídas do Mês
              </span>
              <p className="text-2xl font-bold font-mono text-red-600 mt-1">
                {formatCurrency(monthExits)}
              </p>
            </div>

            <div className={`p-4 rounded-lg border shadow-xs ${
              monthBalance >= 0
                ? 'bg-white border-gray-200'
                : 'bg-white border-red-200'
            }`}>
              <span className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider">
                Saldo do Mês
              </span>
              <p className={`text-2xl font-bold font-mono mt-1 ${
                monthBalance >= 0 ? 'text-emerald-700' : 'text-red-700'
              }`}>
            </h4>

            {selectedDayMetrics.dayTxs.length === 0 ? (
              <div className="p-6 text-center bg-gray-50 border border-gray-200 rounded-md text-gray-500 text-xs font-medium">
                Nenhum lançamento registrado neste dia.
              </div>
            ) : (
              <div className="border border-gray-200 rounded-md overflow-hidden bg-white divide-y divide-gray-100">
                {selectedDayMetrics.dayTxs.map((tx) => (
                  <div
                    key={tx.id}
                    onClick={() => onEditTransaction(tx)}
                    className="p-3 hover:bg-gray-50 transition-all cursor-pointer flex items-center justify-between gap-4 group"
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
                          <p className="text-xs font-semibold text-gray-900 group-hover:text-[#C19848] transition-colors truncate">
                            {tx.title}
                          </p>
                          <TagBadge categoryName={tx.category || tx.tagCode} tags={tags} />
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                          <span>{tx.category}</span>
                          <span>•</span>
                          <span>{tx.paymentMethod}</span>
                          {tx.description && (
                            <>
                              <span>•</span>
                              <span className="italic text-gray-400 truncate max-w-xs">{tx.description}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className={`text-sm sm:text-base font-bold font-mono ${
                        tx.type === 'entrada' ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {tx.type === 'entrada' ? '+' : '-'} {formatCurrency(tx.amount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
        </>
      )}

    </div>
  );
};
