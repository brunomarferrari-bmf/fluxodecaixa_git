import React, { useState } from 'react';
import { Transaction, Account, AccountTransfer } from '../../types';
import {
  formatCurrency,
  formatDateBR,
  getTodayISO,
} from '../../utils/formatters';
import {
  TrendingUp,
  Wallet,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  CalendarDays,
  RefreshCw,
} from 'lucide-react';

interface ProjecaoCaixaViewProps {
  transactions: Transaction[];
  accounts: Account[];
  transfers: AccountTransfer[];
}

export const ProjecaoCaixaView: React.FC<ProjecaoCaixaViewProps> = ({
  transactions,
  accounts,
  transfers,
}) => {
  const todayIso = getTodayISO();

  // Selected Account Filter ('all' or account.id)
  const defaultAccountId = accounts.find((a) => a.isDefault)?.id || (accounts.length > 0 ? accounts[0].id : 'all');
  const [selectedAccountId, setSelectedAccountId] = useState<string>(defaultAccountId);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  // Helper to calculate real updated balance up to today for a specific account
  const calculateAccountBalance = (acc: Account, upToDate: string = todayIso) => {
    if (upToDate < acc.referenceDate) return acc.initialBalance;
    let bal = acc.initialBalance;

    transactions.forEach((tx) => {
      const isLinked = tx.accountId === acc.id || (!tx.accountId && acc.isDefault);
      if (isLinked && tx.date >= acc.referenceDate && tx.date <= upToDate) {
        if (tx.type === 'entrada') bal += tx.amount;
        else bal -= tx.amount;
      }
    });

    transfers.forEach((tr) => {
      if (tr.date >= acc.referenceDate && tr.date <= upToDate) {
        if (tr.sourceAccountId === acc.id) bal -= tr.amount;
        if (tr.destinationAccountId === acc.id) bal += tr.amount;
      }
    });

    return bal;
  };

  // Calculate Real Updated Balance for selected account or consolidated 'all'
  const updatedRealBalance = (() => {
    if (selectedAccountId === 'all') {
      return accounts.reduce((sum, acc) => sum + calculateAccountBalance(acc, todayIso), 0);
    }
    if (selectedAccount) {
      return calculateAccountBalance(selectedAccount, todayIso);
    }
    return 0;
  })();

  // End of current week (Sunday) ISO string
  const endOfWeekIso = (() => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 is Sun, 1 is Mon...
    const distanceToSun = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const sunDate = new Date(now);
    sunDate.setDate(now.getDate() + distanceToSun);
    return sunDate.toISOString().split('T')[0];
  })();

  // End of current month ISO string
  const endOfMonthIso = (() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDay.toISOString().split('T')[0];
  })();

  // Filter future transactions (today onwards) for selected account
  const allFutureTxs = transactions
    .filter((tx) => {
      if (tx.date < todayIso) return false;
      if (selectedAccountId === 'all') return true;
      if (!selectedAccount) return false;
      return tx.accountId === selectedAccount.id || (!tx.accountId && selectedAccount.isDefault);
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  // Future Txs in current week
  const futureWeekTxs = allFutureTxs.filter((tx) => tx.date <= endOfWeekIso);
  const weekFutureEntries = futureWeekTxs.filter((t) => t.type === 'entrada').reduce((sum, t) => sum + t.amount, 0);
  const weekFutureExits = futureWeekTxs.filter((t) => t.type === 'saida').reduce((sum, t) => sum + t.amount, 0);
  const weekFutureNet = weekFutureEntries - weekFutureExits;

  // Future Txs in current month
  const futureMonthTxs = allFutureTxs.filter((tx) => tx.date <= endOfMonthIso);
  const monthFutureEntries = futureMonthTxs.filter((t) => t.type === 'entrada').reduce((sum, t) => sum + t.amount, 0);
  const monthFutureExits = futureMonthTxs.filter((t) => t.type === 'saida').reduce((sum, t) => sum + t.amount, 0);
  const monthFutureNet = monthFutureEntries - monthFutureExits;

  // Calculate Running Balance line by line
  let currentRunningBalance = updatedRealBalance;
  const runningBalanceTxs = allFutureTxs.map((tx) => {
    if (tx.type === 'entrada') {
      currentRunningBalance += tx.amount;
    } else {
      currentRunningBalance -= tx.amount;
    }
    return {
      ...tx,
      projectedAccountBalance: currentRunningBalance,
    };
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white border border-gray-200 p-5 rounded-lg shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#203723] text-white flex items-center justify-center shrink-0 shadow-xs border border-[#C19848]/20">
            <TrendingUp className="w-5 h-5 text-[#C19848]" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">
              Projeção de Caixa
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              Saldo real de hoje e projeção acumulada linha a linha para lançamentos futuros
            </p>
          </div>
        </div>

        {/* Account Selector */}
        {accounts.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-600 whitespace-nowrap">
              Filtrar por Conta:
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="bg-white border border-gray-300 rounded-md px-3 py-1.5 text-xs text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#C19848]/30 focus:border-[#C19848]"
            >
              <option value="all">Todas as Contas (Consolidado)</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.nickname} ({acc.ownerType})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {accounts.length === 0 ? (
        <div className="p-10 text-center bg-white border border-gray-200 rounded-lg shadow-xs space-y-3">
          <Wallet className="w-10 h-10 text-[#C19848] mx-auto" />
          <h3 className="text-base font-bold text-gray-800">Nenhuma conta cadastrada</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Cadastre suas contas bancárias na seção de <strong>Cadastro de Contas</strong> para visualizar a projeção de caixa linha a linha.
          </p>
        </div>
      ) : (
        <>
          {/* HEADER CARDS: 3 Containers (Saldo Atualizado + Semana Vigente + Mês Vigente) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Container 1: PARTE 1 - SALDO ATUALIZADO (FATO) */}
            <div className="bg-white border border-emerald-200 rounded-lg p-5 shadow-xs flex flex-col justify-between space-y-3 relative overflow-hidden bg-emerald-50/20">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                  Saldo Atualizado (Fato)
                </span>
                <span className="text-[10px] text-gray-400 font-medium">Hoje</span>
              </div>

              <div>
                <span className="text-[11px] text-emerald-900 font-semibold block">
                  {selectedAccount ? selectedAccount.nickname : 'Consolidado todas as contas'}
                </span>
                <p className={`text-2xl font-extrabold font-mono mt-0.5 ${
                  updatedRealBalance >= 0 ? 'text-emerald-700' : 'text-red-600'
                }`}>
                  {formatCurrency(updatedRealBalance)}
                </p>
              </div>

              <div className="pt-2 border-t border-emerald-100 flex items-center justify-between text-[10px] text-gray-500 font-medium">
                <span>Data ref: {selectedAccount ? formatDateBR(selectedAccount.referenceDate) : formatDateBR(todayIso)}</span>
                {selectedAccount && <span>Partida: {formatCurrency(selectedAccount.initialBalance)}</span>}
              </div>
            </div>

            {/* Container 2: LANÇAMENTOS FUTUROS — SEMANA VIGENTE */}
            <div className="bg-white border border-amber-200 rounded-lg p-5 shadow-xs flex flex-col justify-between space-y-3 relative overflow-hidden bg-amber-50/20">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-amber-600" />
                  Futuro — Semana Vigente
                </span>
                <span className="text-[10px] text-amber-700 font-semibold">Até {formatDateBR(endOfWeekIso).substring(0, 5)}</span>
              </div>

              <div>
                <span className="text-[11px] text-amber-900 font-semibold block">
                  Resultado Previsto na Semana ({futureWeekTxs.length} lança.)
                </span>
                <p className={`text-2xl font-extrabold font-mono mt-0.5 ${
                  weekFutureNet >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {weekFutureNet >= 0 ? '+' : ''}{formatCurrency(weekFutureNet)}
                </p>
              </div>

              <div className="pt-2 border-t border-amber-100 flex items-center justify-between text-[10px] text-gray-500 font-medium">
                <span className="text-emerald-600 font-semibold">Entradas: +{formatCurrency(weekFutureEntries)}</span>
                <span className="text-red-600 font-semibold">Saídas: -{formatCurrency(weekFutureExits)}</span>
              </div>
            </div>

            {/* Container 3: LANÇAMENTOS FUTUROS — MÊS VIGENTE */}
            <div className="bg-white border border-blue-200 rounded-lg p-5 shadow-xs flex flex-col justify-between space-y-3 relative overflow-hidden bg-blue-50/20">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  Futuro — Mês Vigente
                </span>
                <span className="text-[10px] text-blue-700 font-semibold">Até {formatDateBR(endOfMonthIso).substring(0, 5)}</span>
              </div>

              <div>
                <span className="text-[11px] text-blue-900 font-semibold block">
                  Resultado Previsto no Mês ({futureMonthTxs.length} lança.)
                </span>
                <p className={`text-2xl font-extrabold font-mono mt-0.5 ${
                  monthFutureNet >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {monthFutureNet >= 0 ? '+' : ''}{formatCurrency(monthFutureNet)}
                </p>
              </div>

              <div className="pt-2 border-t border-blue-100 flex items-center justify-between text-[10px] text-gray-500 font-medium">
                <span className="text-emerald-600 font-semibold">Entradas: +{formatCurrency(monthFutureEntries)}</span>
                <span className="text-red-600 font-semibold">Saídas: -{formatCurrency(monthFutureExits)}</span>
              </div>
            </div>

          </div>

          {/* MAIN PROJECTION LIST (LINHA A LINHA - SALDO DE CONTAS ACUMULADO) */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-xs space-y-4">
            <div className="border-b border-gray-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-gray-900 uppercase tracking-wide">
                  Lista de Lançamentos Futuros — Projeção Acumulada
                </h3>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  Visualização detalhada linha a linha com a atualização automática do Saldo de Contas após cada movimento
                </p>
              </div>
              <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded">
                Total: {runningBalanceTxs.length} lançamentos futuros
              </span>
            </div>

            {runningBalanceTxs.length === 0 ? (
              <div className="p-10 text-center bg-gray-50 border border-gray-200 rounded-lg text-gray-500 text-xs font-medium space-y-1">
                <p className="font-bold text-gray-700 text-sm">Nenhum lançamento futuro agendado</p>
                <p>Todos os lançamentos previstos já foram realizados ou não há novas movimentações cadastradas.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {runningBalanceTxs.map((tx) => {
                  const isEntrada = tx.type === 'entrada';
                  const isRecurrence = Boolean(tx.recurrenceRuleId);

                  return (
                    <div
                      key={tx.id}
                      className="bg-white border border-gray-200 hover:border-gray-300 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all shadow-2xs"
                    >
                      {/* Left Block: Icon + Details */}
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Type Icon Badge */}
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            isEntrada
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                              : 'bg-red-100 text-red-700 border border-red-200'
                          }`}
                        >
                          {isEntrada ? (
                            <ArrowUpRight className="w-5 h-5" />
                          ) : (
                            <ArrowDownRight className="w-5 h-5" />
                          )}
                        </div>

                        {/* Text Infos */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                isEntrada
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-red-50 text-red-800 border border-red-200'
                              }`}
                            >
                              {isEntrada ? 'Entrada' : 'Saída'}
                            </span>

                            {tx.category && (
                              <span className="text-[10px] font-semibold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-200/60">
                                {tx.category}
                              </span>
                            )}

                            {isRecurrence && (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-semibold border border-amber-200"
                                title="Gerado por regra de recorrência"
                              >
                                <RefreshCw className="w-3 h-3" />
                                Recorrente
                              </span>
                            )}
                          </div>

                          <h4 className="text-xs font-bold text-gray-900 mt-1 truncate">
                            {tx.title}
                          </h4>

                          <p className="text-[11px] text-gray-500 mt-0.5 font-medium">
                            <span className="font-semibold text-gray-700">{formatDateBR(tx.date)}</span>
                            {tx.paymentMethod ? ` • ${tx.paymentMethod}` : ''}
                            {tx.description ? ` • ${tx.description}` : ''}
                          </p>
                        </div>
                      </div>

                      {/* Right Block: Amount & Cumulative Running Account Balance */}
                      <div className="flex items-center sm:items-end justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                        {/* Transaction Amount */}
                        <div className="text-right">
                          <span className="text-[9px] uppercase font-semibold text-gray-400 block">Valor</span>
                          <p
                            className={`text-sm sm:text-base font-extrabold font-mono ${
                              isEntrada ? 'text-emerald-600' : 'text-red-600'
                            }`}
                          >
                            {isEntrada ? '+' : '-'} {formatCurrency(tx.amount)}
                          </p>
                        </div>

                        {/* Running Account Balance after this transaction */}
                        <div className="text-right bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-md">
                          <span className="text-[9px] uppercase font-bold text-slate-500 block">
                            Saldo de Contas
                          </span>
                          <p
                            className={`text-xs sm:text-sm font-extrabold font-mono ${
                              tx.projectedAccountBalance >= 0 ? 'text-slate-800' : 'text-red-700'
                            }`}
                          >
                            {formatCurrency(tx.projectedAccountBalance)}
                          </p>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
