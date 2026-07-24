import React, { useState } from 'react';
import { Transaction, Account, AccountTransfer } from '../../types';
import {
  formatCurrency,
  formatDateBR,
  getTodayISO,
} from '../../utils/formatters';
import {
  TrendingUp,
  RotateCcw,
  Check,
  RefreshCw,
  Wallet,
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

  // Simulated Tx IDs for Parte 2
  const [simulatedTxIds, setSimulatedTxIds] = useState<Set<string>>(new Set());

  // Next 28 Days Limit Date
  const next28DaysDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 28);
    return d.toISOString().split('T')[0];
  })();

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

  // Filter future transactions in the next 28 days
  const future28DaysTxs = transactions
    .filter((tx) => {
      if (tx.date < todayIso || tx.date > next28DaysDate) return false;
      if (selectedAccountId === 'all') return true;
      if (!selectedAccount) return false;
      return tx.accountId === selectedAccount.id || (!tx.accountId && selectedAccount.isDefault);
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  // Calculate simulated addition from selected checkboxes
  const simulatedAddition = future28DaysTxs.reduce((sum, tx) => {
    if (simulatedTxIds.has(tx.id)) {
      return sum + (tx.type === 'entrada' ? tx.amount : -tx.amount);
    }
    return sum;
  }, 0);

  const simulatedBalance = updatedRealBalance + simulatedAddition;

  const toggleSimulatedTx = (txId: string) => {
    const next = new Set(simulatedTxIds);
    if (next.has(txId)) {
      next.delete(txId);
    } else {
      next.add(txId);
    }
    setSimulatedTxIds(next);
  };

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
              Acompanhamento de saldo real atualizado e simulação para os próximos 28 dias
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
              onChange={(e) => {
                setSelectedAccountId(e.target.value);
                setSimulatedTxIds(new Set());
              }}
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
            Cadastre suas contas bancárias ou caixas na seção de <strong>Cadastro de Contas</strong> para visualizar o Saldo Atualizado e realizar simulações de fluxo de caixa.
          </p>
        </div>
      ) : (
        <>
          {/* PARTE 1: SALDO ATUALIZADO (FATO) */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-emerald-600" />
                PARTE 1: SALDO ATUALIZADO (FATO)
              </span>
              <span className="text-[11px] text-gray-400 font-medium">
                {selectedAccount
                  ? `Data de referência: ${formatDateBR(selectedAccount.referenceDate)}`
                  : 'Consolidado até a data de hoje'}
              </span>
            </div>

            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] text-emerald-800 font-bold block uppercase tracking-wide">
                  Saldo Atualizado {selectedAccount ? `— ${selectedAccount.nickname}` : '— Consolidado'}
                </span>
                <p className={`text-2xl sm:text-3xl font-extrabold font-mono mt-0.5 ${
                  updatedRealBalance >= 0 ? 'text-emerald-700' : 'text-red-600'
                }`}>
                  {formatCurrency(updatedRealBalance)}
                </p>
              </div>

              {selectedAccount && (
                <div className="text-right text-[11px] text-gray-500 space-y-0.5">
                  <p>Instituição: <span className="font-semibold text-gray-800">{selectedAccount.financialInstitution || 'Outros'}</span></p>
                  <p>Titular: <span className="font-semibold text-gray-800">{selectedAccount.ownerType === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}</span></p>
                  <p>Saldo de partida: <span className="font-mono font-semibold text-gray-800">{formatCurrency(selectedAccount.initialBalance)}</span></p>
                </div>
              )}
            </div>
          </div>

          {/* PARTE 2: PRÓXIMOS 28 DIAS (SIMULAÇÃO) */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-xs space-y-4">
            <div className="border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                Parte 2: Próximos 28 Dias (Simulação)
              </h3>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                Selecione lançamentos futuros para simular como seu saldo pode se comportar.
              </p>
            </div>

            {/* Simulated Balance Box */}
            <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wide block">
                  Saldo Simulado
                </span>
                <p className={`text-2xl sm:text-3xl font-extrabold font-mono mt-0.5 ${
                  simulatedBalance >= 0 ? 'text-amber-800' : 'text-red-600'
                }`}>
                  {formatCurrency(simulatedBalance)}
                </p>
                <p className="text-[10px] text-amber-700 mt-1 italic font-medium">
                  Simulação não salva. Suas seleções são apagadas ao sair desta tela.
                </p>
              </div>

              {simulatedTxIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => setSimulatedTxIds(new Set())}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition-all cursor-pointer self-start sm:self-auto shadow-2xs active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Limpar Seleção ({simulatedTxIds.size})</span>
                </button>
              )}
            </div>

            {/* List of Future Transactions in the Next 28 Days */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600">
                Lançamentos Futuros ({future28DaysTxs.length})
              </h4>

              {future28DaysTxs.length === 0 ? (
                <div className="p-6 text-center bg-gray-50 border border-gray-200 rounded-md text-gray-500 text-xs font-medium">
                  Nenhum lançamento previsto para os próximos 28 dias nesta seleção.
                </div>
              ) : (
                <div className="border border-gray-200 rounded-md divide-y divide-gray-100 overflow-hidden bg-white">
                  {future28DaysTxs.map((tx) => {
                    const isChecked = simulatedTxIds.has(tx.id);
                    const isRecurrence = Boolean(tx.recurrenceRuleId);

                    return (
                      <div
                        key={tx.id}
                        onClick={() => toggleSimulatedTx(tx.id)}
                        className={`p-3.5 flex items-center justify-between gap-3 transition-colors cursor-pointer select-none ${
                          isChecked ? 'bg-amber-50/70' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            className={`w-5 h-5 rounded flex items-center justify-center border transition-colors shrink-0 ${
                              isChecked
                                ? 'bg-[#C19848] border-[#C19848] text-[#203723]'
                                : 'bg-white border-gray-300 text-transparent'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </button>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-gray-900 truncate">
                                {tx.title}
                              </p>
                              {isRecurrence && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded font-semibold" title="Gerado por recorrência">
                                  <RefreshCw className="w-3 h-3" />
                                  <span>Recorrente</span>
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500">
                              {formatDateBR(tx.date)} • {tx.category} • {tx.paymentMethod}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className={`text-xs sm:text-sm font-bold font-mono ${
                            tx.type === 'entrada' ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                            {tx.type === 'entrada' ? '+' : '-'} {formatCurrency(tx.amount)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
