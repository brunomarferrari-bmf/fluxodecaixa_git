import React, { useState } from 'react';
import { Transaction } from '../../types';
import {
  formatCurrency,
  formatDateBR,
  getTodayISO,
} from '../../utils/formatters';
import {
  PieChart,
  TrendingUp,
  TrendingDown,
  Scale,
  CreditCard,
  Grid,
  Calendar,
  RotateCcw,
} from 'lucide-react';

interface MonthlyClosingViewProps {
  transactions: Transaction[];
}

export const MonthlyClosingView: React.FC<MonthlyClosingViewProps> = ({
  transactions,
}) => {
  const todayIso = getTodayISO();
  const todayParts = todayIso.split('-').map(Number);
  const year = todayParts[0];
  const monthNum = todayParts[1];
  const monthStr = String(monthNum).padStart(2, '0');

  // Calculate default start and end dates for current month
  const lastDayNum = new Date(year, monthNum, 0).getDate();
  const lastDayStr = String(lastDayNum).padStart(2, '0');

  const defaultStartDate = `${year}-${monthStr}-01`;
  const defaultEndDate = `${year}-${monthStr}-${lastDayStr}`;

  const [startDate, setStartDate] = useState<string>(defaultStartDate);
  const [endDate, setEndDate] = useState<string>(defaultEndDate);

  const handleSetCurrentMonth = () => {
    setStartDate(defaultStartDate);
    setEndDate(defaultEndDate);
  };

  const handleClearDates = () => {
    setStartDate('');
    setEndDate('');
  };

  // Filter transactions belonging to date range
  const monthTransactions = transactions.filter((tx) => {
    if (startDate && tx.date < startDate) return false;
    if (endDate && tx.date > endDate) return false;
    return true;
  });

  // Total entries & total exits of period
  const totalEntries = monthTransactions
    .filter((tx) => tx.type === 'entrada')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalExits = monthTransactions
    .filter((tx) => tx.type === 'saida')
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Period Balance = total entries - total exits
  const monthBalance = totalEntries - totalExits;

  // Category breakdown for exits
  const categoryExitsMap: Record<string, number> = {};
  monthTransactions
    .filter((tx) => tx.type === 'saida')
    .forEach((tx) => {
      categoryExitsMap[tx.category] = (categoryExitsMap[tx.category] || 0) + tx.amount;
    });

  // Category breakdown for entries
  const categoryEntriesMap: Record<string, number> = {};
  monthTransactions
    .filter((tx) => tx.type === 'entrada')
    .forEach((tx) => {
      categoryEntriesMap[tx.category] = (categoryEntriesMap[tx.category] || 0) + tx.amount;
    });

  // Payment methods breakdown
  const paymentMethodMap: Record<string, { entries: number; exits: number }> = {};
  monthTransactions.forEach((tx) => {
    const method = tx.paymentMethod || 'Outros';
    if (!paymentMethodMap[method]) {
      paymentMethodMap[method] = { entries: 0, exits: 0 };
    }
    if (tx.type === 'entrada') {
      paymentMethodMap[method].entries += tx.amount;
    } else {
      paymentMethodMap[method].exits += tx.amount;
    }
  });

  // Date label description
  const periodLabel =
    startDate && endDate
      ? `${formatDateBR(startDate)} a ${formatDateBR(endDate)}`
      : startDate
      ? `A partir de ${formatDateBR(startDate)}`
      : endDate
      ? `Até ${formatDateBR(endDate)}`
      : 'Todos os Períodos';

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Date Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white border border-gray-200 p-5 rounded-lg shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-[#E4D8BE]/20 border border-[#C19848]/20 text-[#C19848] flex items-center justify-center shrink-0">
            <PieChart className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Dashboard - Fechamento por Período
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              Exibindo consolidação para: <strong className="text-gray-700">{periodLabel}</strong>
            </p>
          </div>
        </div>

        {/* Date Inputs */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-md border border-gray-200">
            <Calendar className="w-4 h-4 text-[#C19848] shrink-0" />
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold mb-0.5">Data Inicial</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-800 font-mono focus:outline-none focus:ring-1 focus:ring-[#C19848]"
                />
              </div>
              <span className="text-gray-400 font-bold self-end mb-1">até</span>
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold mb-0.5">Data Final</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-800 font-mono focus:outline-none focus:ring-1 focus:ring-[#C19848]"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleSetCurrentMonth}
              className="px-3 py-2 rounded-md bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 transition-all cursor-pointer text-xs font-semibold shadow-2xs flex items-center gap-1"
              title="Filtrar por Mês Atual"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#C19848]" />
              <span>Mês Atual</span>
            </button>

            {(startDate || endDate) && (
              <button
                onClick={handleClearDates}
                className="px-2.5 py-2 rounded-md bg-white hover:bg-gray-50 text-gray-500 border border-gray-200 transition-all cursor-pointer text-xs font-medium"
                title="Limpar Filtro de Datas"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Saldo do Período */}
        <div className="p-5 rounded-lg bg-white border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Resultado Líquido do Período
            </span>
            <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
              monthBalance >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
            }`}>
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-2xl sm:text-3xl font-bold font-mono mt-2 ${
            monthBalance >= 0 ? 'text-emerald-600' : 'text-red-600'
          }`}>
            {formatCurrency(monthBalance)}
          </p>
          <p className="text-[11px] text-gray-500 mt-1.5 font-medium">
            Entradas - Saídas no período selecionado
          </p>
        </div>

        {/* Total Entradas do Período */}
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
            {formatCurrency(totalEntries)}
          </p>
          <p className="text-[11px] text-gray-500 mt-1.5 font-medium">
            {monthTransactions.filter((tx) => tx.type === 'entrada').length} recebimento(s)
          </p>
        </div>

        {/* Total Saídas do Período */}
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
            {formatCurrency(totalExits)}
          </p>
          <p className="text-[11px] text-gray-500 mt-1.5 font-medium">
            {monthTransactions.filter((tx) => tx.type === 'saida').length} pagamento(s)
          </p>
        </div>

      </div>

      {/* Breakdowns Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Category Breakdown (Despesas / Saídas) */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-red-600 font-bold text-xs uppercase tracking-wider">
            <Grid className="w-4 h-4" />
            <span>Detalhamento de Saídas por Categoria</span>
          </div>

          {Object.keys(categoryExitsMap).length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center font-medium">Sem saídas neste período.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(categoryExitsMap)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, val]) => {
                  const percent = totalExits > 0 ? (val / totalExits) * 100 : 0;
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-gray-800">{cat}</span>
                        <span className="font-mono text-red-600">{formatCurrency(val)} ({percent.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-red-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Category Breakdown (Receitas / Entradas) */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
            <Grid className="w-4 h-4" />
            <span>Detalhamento de Entradas por Categoria</span>
          </div>

          {Object.keys(categoryEntriesMap).length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center font-medium">Sem entradas neste período.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(categoryEntriesMap)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, val]) => {
                  const percent = totalEntries > 0 ? (val / totalEntries) * 100 : 0;
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-gray-800">{cat}</span>
                        <span className="font-mono text-emerald-600">{formatCurrency(val)} ({percent.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

      </div>

      {/* Payment Method Distribution Table */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-[#C19848] font-bold text-xs uppercase tracking-wider">
          <CreditCard className="w-4 h-4" />
          <span>Movimentação por Forma de Pagamento</span>
        </div>

        <div className="overflow-x-auto border border-gray-200 rounded-md">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[10px] font-semibold border-b border-gray-200">
              <tr>
                <th className="p-3">Forma de Pagamento</th>
                <th className="p-3 text-right">Entradas (R$)</th>
                <th className="p-3 text-right">Saídas (R$)</th>
                <th className="p-3 text-right">Líquido (R$)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-800">
              {Object.entries(paymentMethodMap).map(([method, data]) => {
                const net = data.entries - data.exits;
                return (
                  <tr key={method} className="hover:bg-gray-50/80">
                    <td className="p-3 font-semibold text-gray-900">{method}</td>
                    <td className="p-3 text-right font-mono text-emerald-600 font-semibold">
                      +{formatCurrency(data.entries)}
                    </td>
                    <td className="p-3 text-right font-mono text-red-600 font-semibold">
                      -{formatCurrency(data.exits)}
                    </td>
                    <td className={`p-3 text-right font-mono font-bold ${
                      net >= 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(net)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
