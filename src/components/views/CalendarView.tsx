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
          {/* Calendar Grid */}
      <div className="bg-white border border-gray-200 rounded-lg p-2.5 sm:p-4 shadow-xs">
        
        {/* Days of week header (Segunda a Domingo) */}
        <div className="grid grid-cols-7 gap-1.5 mb-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          <div>Seg</div>
          <div>Ter</div>
          <div>Qua</div>
          <div>Qui</div>
          <div>Sex</div>
          <div>Sáb</div>
          <div>Dom</div>
        </div>

        {/* Day Squares Grid (7 colunas) */}
        <div className="grid grid-cols-7 gap-1.5">
          {dayBoxes.map((box, idx) => {
            if (!box) {
              return (
                <div
                  key={`empty_${idx}`}
                  className="h-20 sm:h-24 rounded-md bg-gray-50/50 border border-gray-100 pointer-events-none"
                />
              );
            }

            const { dateIso, dayNumber } = box;
            const { balance, hasTxs } = getDayMetrics(dateIso);
            const isToday = dateIso === todayIso;
            const isSelected = dateIso === selectedDayIso;

            return (
              <div
                key={dateIso}
                onClick={() => setSelectedDayIso(dateIso)}
                className={`h-20 sm:h-24 rounded-md p-2 flex flex-col justify-between border transition-all cursor-pointer relative ${
                  isSelected
                    ? 'ring-2 ring-[#C19848] border-[#C19848] bg-[#E4D8BE]/15 shadow-xs'
                    : isToday
                    ? 'bg-amber-50/50 border-amber-300'
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/60'
                }`}
              >
                {/* Header of square: Day Number & Plus Action Button */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[11px] sm:text-xs font-bold font-mono ${
                      isToday
                        ? 'text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded'
                        : 'text-gray-700'
                    }`}
                  >
                    {dayNumber}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDayIso(dateIso);
                      onOpenNewTransaction(dateIso);
                    }}
                    className="p-1 rounded bg-[#E4D8BE]/20 hover:bg-[#E4D8BE]/45 text-[#C19848] transition-colors cursor-pointer"
                    title="Novo Lançamento neste dia"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Body of square: Daily Balance */}
                <div className="mt-auto">
                  <span className="text-[9px] text-gray-400 block font-sans font-medium">Saldo</span>
                  <p
                    className={`text-[11px] sm:text-xs font-bold font-mono truncate ${
                      hasTxs
                        ? balance > 0
                          ? 'text-emerald-600'
                          : balance < 0
                          ? 'text-red-600'
                          : 'text-gray-600'
                        : 'text-gray-300'
                    }`}
                  >
                    {hasTxs ? formatCurrency(balance) : 'R$ 0,00'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DETALHE DO DIA */}
      {selectedDayIso && selectedDayMetrics && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-5">
          
          {/* Day Detail Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#C19848] flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5" />
                Detalhe do Dia
              </div>
              <h3 className="text-lg font-bold text-gray-900 mt-0.5">
                {formatDayOfWeek(selectedDayIso)}, {formatDateBR(selectedDayIso)}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenNewTransaction(selectedDayIso)}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-2 rounded-md shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Lançamento neste Dia</span>
              </button>

              <button
                onClick={() => setSelectedDayIso(null)}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                title="Fechar Detalhes"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Daily Metrics Top Cards */}
          <div className={`grid grid-cols-1 ${accounts.length > 0 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-3`}>
            <div className={`p-3.5 rounded-md border ${
              selectedDayMetrics.balance >= 0
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-gray-500">Saldo do Dia</span>
              <p className={`text-xl font-bold font-mono mt-1 ${
                selectedDayMetrics.balance >= 0 ? 'text-emerald-700' : 'text-red-700'
              }`}>
                {formatCurrency(selectedDayMetrics.balance)}
              </p>
            </div>

            <div className="p-3.5 rounded-md bg-gray-50 border border-gray-200">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-gray-500">Total de Entradas</span>
              <p className="text-xl font-bold font-mono text-emerald-600 mt-1">
                {formatCurrency(selectedDayMetrics.entries)}
              </p>
            </div>

            <div className="p-3.5 rounded-md bg-gray-50 border border-gray-200">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-gray-500">Total de Saídas</span>
              <p className="text-xl font-bold font-mono text-red-600 mt-1">
                {formatCurrency(selectedDayMetrics.exits)}
              </p>
            </div>

            {/* Section 4: 4th Card - Saldo das Contas (Neutral Color) */}
            {accounts.length > 0 && (() => {
              let totalAccountBal = 0;
              accounts.forEach((acc) => {
                if (selectedDayIso < acc.referenceDate) return;
                let accBal = acc.initialBalance;
                transactions.forEach((tx) => {
                  const isLinked = tx.accountId === acc.id || (!tx.accountId && acc.isDefault);
                  if (isLinked && tx.date >= acc.referenceDate && tx.date <= selectedDayIso) {
                    if (tx.type === 'entrada') accBal += tx.amount;
                    else accBal -= tx.amount;
                  }
                });
                transfers.forEach((tr) => {
                  if (tr.date >= acc.referenceDate && tr.date <= selectedDayIso) {
                    if (tr.sourceAccountId === acc.id) accBal -= tr.amount;
                    if (tr.destinationAccountId === acc.id) accBal += tr.amount;
                  }
                });
                totalAccountBal += accBal;
              });

              return (
                <div className="p-3.5 rounded-md bg-[#E4D8BE]/15 border border-[#C19848]/30">
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-gray-600 flex items-center gap-1">
                    <Wallet className="w-3 h-3 text-[#C19848]" />
                    Saldo das Contas
                  </span>
                  <p className="text-xl font-bold font-mono text-slate-800 mt-1">
                    {formatCurrency(totalAccountBal)}
                  </p>
                </div>
              );
            })()}
          </div>

          {/* List of transactions for this specific day */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Lista de Transações ({selectedDayMetrics.dayTxs.length})
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
