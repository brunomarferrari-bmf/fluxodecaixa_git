import React, { useState } from 'react';
import { Transaction, Tag, Account, AccountTransfer } from '../../types';
import { TagBadge } from '../TagBadge';
import {
  formatCurrency,
  formatDateBR,
  formatDayOfWeek,
  getTodayISO,
  getWeekDays,
} from '../../utils/formatters';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Calendar,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Wallet,
} from 'lucide-react';

interface WeeklyViewProps {
  transactions: Transaction[];
  tags?: Tag[];
  onOpenNewTransaction: (date: string) => void;
  onEditTransaction: (tx: Transaction) => void;
  accounts?: Account[];
  transfers?: AccountTransfer[];
}

export const WeeklyView: React.FC<WeeklyViewProps> = ({
  transactions,
  tags,
  onOpenNewTransaction,
  onEditTransaction,
  accounts = [],
  transfers = [],
}) => {
  const todayIso = getTodayISO();

  // Helper to compute total accounts balance for a specific date
  const getAccountTotalOnDate = (dateIso: string) => {
    if (!accounts || accounts.length === 0) return 0;
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

  // Reference date ISO to anchor the current 7-day week
  const [refDateIso, setRefDateIso] = useState<string>(todayIso);

  // Get week days (Segunda a Domingo = 7 dias)
  const allWeekDays = getWeekDays(refDateIso);
  const weekDays = allWeekDays;
  const firstDayStr = formatDateBR(weekDays[0]);
  const lastDayStr = formatDateBR(weekDays[6]);

  // Selected day state (defaults to today if in current week, else first day of week)
  const [selectedDayIso, setSelectedDayIso] = useState<string | null>(() => {
    return weekDays.includes(todayIso) ? todayIso : weekDays[0];
  });

  const handlePrevWeek = () => {
    const [y, m, d] = refDateIso.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() - 7);
    const yr = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, '0');
    const dy = String(date.getDate()).padStart(2, '0');
    const newRef = `${yr}-${mo}-${dy}`;
    setRefDateIso(newRef);
    const newWeekDays = getWeekDays(newRef);
    setSelectedDayIso(newWeekDays[0]);
  };

  const handleNextWeek = () => {
    const [y, m, d] = refDateIso.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + 7);
    const yr = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, '0');
    const dy = String(date.getDate()).padStart(2, '0');
    const newRef = `${yr}-${mo}-${dy}`;
    setRefDateIso(newRef);
    const newWeekDays = getWeekDays(newRef);
    setSelectedDayIso(newWeekDays[0]);
  };

  // Metrics for each working day of the week
  const daysData = weekDays.map((dateIso) => {
    const dayTxs = transactions.filter((tx) => tx.date === dateIso);
    const entries = dayTxs
      .filter((tx) => tx.type === 'entrada')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const exits = dayTxs
      .filter((tx) => tx.type === 'saida')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const balance = entries - exits;
    return { dateIso, dayTxs, entries, exits, balance };
  });

  // Total Week Balance = sum of daily balances of the week
  const weekBalance = daysData.reduce((sum, d) => sum + d.balance, 0);
  const weekEntries = daysData.reduce((sum, d) => sum + d.entries, 0);
  const weekExits = daysData.reduce((sum, d) => sum + d.exits, 0);

  // Selected Day Details Metrics
  const activeDayData = selectedDayIso
    ? daysData.find((d) => d.dateIso === selectedDayIso) || {
        dateIso: selectedDayIso,
        dayTxs: transactions.filter((tx) => tx.date === selectedDayIso),
        entries: transactions
          .filter((tx) => tx.date === selectedDayIso && tx.type === 'entrada')
          .reduce((sum, tx) => sum + tx.amount, 0),
        exits: transactions
          .filter((tx) => tx.date === selectedDayIso && tx.type === 'saida')
          .reduce((sum, tx) => sum + tx.amount, 0),
        balance: 0,
      }
    : null;

  if (activeDayData && selectedDayIso) {
    activeDayData.balance = activeDayData.entries - activeDayData.exits;
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Subcategory / Week Period Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-gray-200 p-4 rounded-lg shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-[#E4D8BE]/20 border border-[#C19848]/20 text-[#C19848] flex items-center justify-center shrink-0">
            <CalendarDays className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Semana de {firstDayStr} a {lastDayStr}
            </h3>
            <p className="text-xs text-gray-500 font-medium">
              Acompanhamento de 7 visões diárias lado a lado (Segunda a Domingo)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevWeek}
            className="px-3 py-1.5 rounded-md bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold shadow-xs"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Semana Anterior</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRefDateIso(todayIso);
              setSelectedDayIso(todayIso);
            }}
            className="px-3 py-1.5 rounded-md bg-[#C19848] hover:bg-[#C19848]/90 text-[#203723] border border-[#C19848]/30 text-xs font-bold transition-all cursor-pointer"
          >
            Semana Atual
          </button>

          <button
            type="button"
            onClick={handleNextWeek}
            className="px-3 py-1.5 rounded-md bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold shadow-xs"
          >
            <span>Próxima Semana</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Week Total KPI Bar */}
      <div className={`grid grid-cols-1 ${accounts.length > 0 ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
        <div className="p-4 rounded-lg bg-white border border-gray-200 shadow-xs">
          <span className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider">
            Entradas da Semana
          </span>
          <p className="text-2xl font-bold font-mono text-emerald-600 mt-1">
            {formatCurrency(weekEntries)}
          </p>
        </div>

        <div className="p-4 rounded-lg bg-white border border-gray-200 shadow-xs">
          <span className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider">
            Saídas da Semana
          </span>
          <p className="text-2xl font-bold font-mono text-red-600 mt-1">
            {formatCurrency(weekExits)}
          </p>
        </div>

        <div className={`p-4 rounded-lg border shadow-xs ${
          weekBalance >= 0
            ? 'bg-white border-gray-200'
            : 'bg-white border-red-200'
        }`}>
          <span className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider">
            Saldo da Semana
          </span>
          <p className={`text-2xl font-bold font-mono mt-1 ${
            weekBalance >= 0 ? 'text-emerald-600' : 'text-red-600'
          }`}>
            {formatCurrency(weekBalance)}
          </p>
          <p className="text-[11px] text-gray-400 mt-1 font-medium">
            Soma dos saldos diários dos 7 dias da semana
          </p>
        </div>

        {/* Section 3: 4th Top Card - Saldo das contas ao fim da semana */}
        {accounts.length > 0 && (
          <div className="p-4 rounded-lg bg-[#E4D8BE]/15 border border-[#C19848]/30 shadow-xs">
            <span className="text-[10px] uppercase font-semibold text-gray-600 tracking-wider flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5 text-[#C19848]" />
              Saldo das contas ao fim da semana
            </span>
            <p className="text-2xl font-bold font-mono text-slate-800 mt-1">
              {formatCurrency(getAccountTotalOnDate(weekDays[6]))}
            </p>
            <p className="text-[11px] text-gray-500 mt-1 font-medium">
              Posição consolidada no domingo ({formatDateBR(weekDays[6])})
            </p>
          </div>
        )}
      </div>

      {/* 7 Daily Summary Cards Side-by-Side (Clean & Uncluttered) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {daysData.map((d) => {
          const isToday = d.dateIso === todayIso;
          const isSelected = d.dateIso === selectedDayIso;

          return (
            <div
              key={d.dateIso}
              onClick={() => setSelectedDayIso(d.dateIso)}
              className={`rounded-lg border p-2.5 flex flex-col justify-start transition-all cursor-pointer bg-white shadow-xs select-none ${
                isSelected
                  ? 'ring-2 ring-[#C19848] border-[#C19848] bg-[#E4D8BE]/10 shadow-sm'
                  : isToday
                  ? 'border-amber-300 bg-amber-50/30 hover:border-amber-400'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
              }`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 uppercase">
                    {formatDayOfWeek(d.dateIso).substring(0, 3)}
                  </p>
                  <p className={`text-xs font-extrabold ${isToday ? 'text-amber-700' : 'text-gray-900'}`}>
                    {formatDateBR(d.dateIso).substring(0, 5)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDayIso(d.dateIso);
                    onOpenNewTransaction(d.dateIso);
                  }}
                  className="p-1 rounded bg-[#E4D8BE]/20 hover:bg-[#E4D8BE]/45 text-[#C19848] transition-colors cursor-pointer"
                  title="Novo Lançamento neste dia"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Clean Metric Totals (Name & Value) */}
              <div className="pt-2.5 space-y-2">
                <div>
                  <span className="text-[9px] text-gray-400 block font-medium uppercase">Saldo do Dia</span>
                  <p className={`text-sm font-extrabold font-mono ${
                    d.balance > 0 ? 'text-emerald-600' : d.balance < 0 ? 'text-red-600' : 'text-gray-700'
                  }`}>
                    {formatCurrency(d.balance)}
                  </p>
                </div>

                <div className="pt-1.5 border-t border-gray-100 text-[10px] space-y-1 font-medium">
                  <div className="flex justify-between items-center text-gray-500">
                    <span>Entradas:</span>
                    <span className="text-emerald-600 font-mono font-semibold">+{formatCurrency(d.entries)}</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-500">
                    <span>Saídas:</span>
                    <span className="text-red-600 font-mono font-semibold">-{formatCurrency(d.exits)}</span>
                  </div>

                  {/* Section 3: Line of Total Accounts Balance */}
                  {accounts.length > 0 && (
                    <div className="flex justify-between items-center text-gray-600 pt-1 border-t border-gray-100">
                      <span className="text-[9px] font-semibold text-gray-500 truncate" title="Saldo total das contas">Total Contas:</span>
                      <span className="text-[10px] font-bold font-mono text-slate-700">
                        {formatCurrency(getAccountTotalOnDate(d.dateIso))}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Clickable Transaction Lines (Title + Value) */}
              <div className="mt-3 pt-2 border-t border-gray-100 space-y-1.5">
                {d.dayTxs.length === 0 ? (
                  <p className="text-[10px] text-gray-400 italic text-center py-2">
                    Sem lançamentos
                  </p>
                ) : (
                  d.dayTxs.map((tx) => (
                    <div
                      key={tx.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDayIso(d.dateIso);
                        onEditTransaction(tx);
                      }}
                      className={`p-2 rounded-md border text-[11px] flex items-center justify-between gap-1.5 transition-all cursor-pointer shadow-xs ${
                        tx.type === 'entrada'
                          ? 'bg-emerald-100 hover:bg-emerald-200 border-emerald-300 text-emerald-950'
                          : 'bg-red-100 hover:bg-red-200 border-red-300 text-red-950'
                      }`}
                      title={`Clique para editar: ${tx.title}`}
                    >
                      <span className={`font-bold truncate min-w-0 flex-1 leading-tight ${
                        tx.type === 'entrada' ? 'text-emerald-950' : 'text-red-950'
                      }`}>
                        {tx.title}
                      </span>
                      <span className={`font-extrabold font-mono text-[11px] shrink-0 ${
                        tx.type === 'entrada' ? 'text-emerald-800' : 'text-red-800'
                      }`}>
                        {tx.type === 'entrada' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* DETALHES DO DIA SELECIONADO (QUADRO DE APOIO DE LISTAS) */}
      {selectedDayIso && activeDayData && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-5 animate-fade-in">
          
          {/* Support Panel Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#C19848] flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" />
                Detalhes do Dia
              </div>
              <h3 className="text-lg font-bold text-gray-900 mt-0.5">
                {formatDayOfWeek(selectedDayIso)}, {formatDateBR(selectedDayIso)}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenNewTransaction(selectedDayIso)}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-2 rounded-md shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Lançamento neste Dia</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDayIso(null)}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                title="Fechar Detalhes"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Daily Metrics Cards (Reordered: Entradas, Saídas, Saldo do Dia, Saldo das Contas) */}
          <div className={`grid grid-cols-1 ${accounts.length > 0 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-3`}>
            <div className="p-3.5 rounded-md bg-gray-50 border border-gray-200">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-gray-500">Total de Entradas</span>
              <p className="text-xl font-bold font-mono text-emerald-600 mt-1">
                {formatCurrency(activeDayData.entries)}
              </p>
            </div>

            <div className="p-3.5 rounded-md bg-gray-50 border border-gray-200">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-gray-500">Total de Saídas</span>
              <p className="text-xl font-bold font-mono text-red-600 mt-1">
                {formatCurrency(activeDayData.exits)}
              </p>
            </div>

            <div className={`p-3.5 rounded-md border ${
              activeDayData.balance >= 0
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-gray-500">Saldo do Dia</span>
              <p className={`text-xl font-bold font-mono mt-1 ${
                activeDayData.balance >= 0 ? 'text-emerald-700' : 'text-red-700'
              }`}>
                {formatCurrency(activeDayData.balance)}
              </p>
            </div>

            {/* Section 4: 4th Card - Saldo das Contas */}
            {accounts.length > 0 && (
              <div className="p-3.5 rounded-md bg-[#E4D8BE]/15 border border-[#C19848]/30">
                <span className="text-[10px] uppercase font-semibold tracking-wider text-gray-600 flex items-center gap-1">
                  <Wallet className="w-3 h-3 text-[#C19848]" />
                  Saldo das Contas
                </span>
                <p className="text-xl font-bold font-mono text-slate-800 mt-1">
                  {formatCurrency(getAccountTotalOnDate(selectedDayIso))}
                </p>
              </div>
            )}
          </div>

          {/* Descriptive List of Expenses and Postings */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Lista de Lançamentos do Dia ({activeDayData.dayTxs.length})
            </h4>

            {activeDayData.dayTxs.length === 0 ? (
              <div className="p-6 text-center bg-gray-50 border border-gray-200 rounded-md text-gray-500 text-xs font-medium">
                Nenhum lançamento registrado neste dia.
              </div>
            ) : (
              <div className="border border-gray-200 rounded-md overflow-hidden bg-white divide-y divide-gray-100">
                {activeDayData.dayTxs.map((tx) => (
                  <div
                    key={tx.id}
                    onClick={() => onEditTransaction(tx)}
                    className="p-3 hover:bg-[#C19848]/5 transition-all cursor-pointer flex items-center justify-between gap-4 group"
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

    </div>
  );
};
