import React, { useState } from 'react';
import { Account, AccountTransfer, Transaction } from '../../types';
import { formatCurrency, formatDateBR, getTodayISO, generateUniqueId } from '../../utils/formatters';
import {
  Wallet,
  Plus,
  ArrowLeftRight,
  ChevronRight,
  ArrowLeft,
  Building2,
  User,
  AlertCircle,
  RefreshCw,
  Info,
  RotateCcw,
  Check,
  ShieldCheck,
} from 'lucide-react';

interface AccountsViewProps {
  accounts: Account[];
  transfers: AccountTransfer[];
  transactions: Transaction[];
  onSaveAccount: (account: Account) => Promise<void>;
  onSaveTransfer: (transfer: AccountTransfer) => Promise<void>;
}

type ViewSubMode = 'list' | 'new' | 'edit' | 'transfer' | 'detail';

export const AccountsView: React.FC<AccountsViewProps> = ({
  accounts,
  transfers,
  transactions,
  onSaveAccount,
  onSaveTransfer,
}) => {
  const todayIso = getTodayISO();

  // Navigation mode inside accounts view
  const [subMode, setSubMode] = useState<ViewSubMode>('list');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // Form states for new/edit account
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [nickname, setNickname] = useState('');
  const [ownerType, setOwnerType] = useState<'PF' | 'PJ'>('PJ');
  const [financialInstitution, setFinancialInstitution] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [referenceDate, setReferenceDate] = useState(todayIso);
  const [isDefault, setIsDefault] = useState(false);
  const [formError, setFormError] = useState('');

  // Form states for transfer
  const [transferSourceId, setTransferSourceId] = useState('');
  const [transferDestId, setTransferDestId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDate, setTransferDate] = useState(todayIso);
  const [transferError, setTransferError] = useState('');

  // State for 28-day simulation checkboxes
  const [simulatedTxIds, setSimulatedTxIds] = useState<Set<string>>(new Set());

  // ─── Helper: calculate updated real balance for an account ───
  const calculateAccountBalance = (account: Account, untilDate: string = todayIso) => {
    let balance = account.initialBalance;

    // Add/subtract real transactions linked to this account starting from referenceDate
    transactions.forEach((tx) => {
      if (tx.accountId === account.id || (!tx.accountId && account.isDefault)) {
        if (tx.date >= account.referenceDate && tx.date <= untilDate) {
          if (tx.type === 'entrada') {
            balance += tx.amount;
          } else {
            balance -= tx.amount;
          }
        }
      }
    });

    // Add/subtract transfers involving this account
    transfers.forEach((tr) => {
      if (tr.date >= account.referenceDate && tr.date <= untilDate) {
        if (tr.sourceAccountId === account.id) {
          balance -= tr.amount;
        }
        if (tr.destinationAccountId === account.id) {
          balance += tr.amount;
        }
      }
    });

    return balance;
  };

  // Open New Account Form
  const handleOpenNewAccount = () => {
    setEditingAccount(null);
    setNickname('');
    setOwnerType('PJ');
    setFinancialInstitution('');
    setInitialBalance('0,00');
    setReferenceDate(todayIso);
    setIsDefault(accounts.length === 0);
    setFormError('');
    setSubMode('new');
  };

  // Open Edit Account Form
  const handleOpenEditAccount = (acc: Account) => {
    setEditingAccount(acc);
    setNickname(acc.nickname);
    setOwnerType(acc.ownerType);
    setFinancialInstitution(acc.financialInstitution || '');
    setInitialBalance(String(acc.initialBalance));
    setReferenceDate(acc.referenceDate);
    setIsDefault(acc.isDefault);
    setFormError('');
    setSubMode('edit');
  };

  // Save Account
  const handleSaveAccountForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!nickname.trim()) {
      setFormError('Apelido da conta é obrigatório.');
      return;
    }

    const parsedBalance = parseFloat(initialBalance.replace(/\./g, '').replace(',', '.'));
    if (isNaN(parsedBalance)) {
      setFormError('Saldo inicial inválido.');
      return;
    }

    if (!referenceDate) {
      setFormError('Data de referência é obrigatória.');
      return;
    }

    // Rule: first account is automatically default
    const finalIsDefault = accounts.length === 0 ? true : isDefault;

    // Rule: block unchecking if it's the only default account
    if (editingAccount && editingAccount.isDefault && !finalIsDefault) {
      const otherDefaults = accounts.filter(a => a.id !== editingAccount.id && a.isDefault);
      if (otherDefaults.length === 0) {
        setFormError('O sistema precisa ter pelo menos uma conta padrão. Marque outra conta como padrão antes de alterar esta.');
        return;
      }
    }

    const newAcc: Account = {
      id: editingAccount ? editingAccount.id : generateUniqueId(),
      nickname: nickname.trim(),
      ownerType,
      financialInstitution: financialInstitution.trim() || undefined,
      initialBalance: parsedBalance,
      referenceDate,
      isDefault: finalIsDefault,
      createdAt: editingAccount ? editingAccount.createdAt : new Date().toISOString(),
    };

    await onSaveAccount(newAcc);
    setSubMode('list');
  };

  // Open Transfer Form
  const handleOpenTransfer = () => {
    if (accounts.length < 2) return;
    setTransferSourceId(accounts[0]?.id || '');
    setTransferDestId(accounts[1]?.id || '');
    setTransferAmount('');
    setTransferDate(todayIso);
    setTransferError('');
    setSubMode('transfer');
  };

  // Save Transfer
  const handleSaveTransferForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError('');

    if (!transferSourceId || !transferDestId) {
      setTransferError('Selecione a conta de origem e a conta de destino.');
      return;
    }

    if (transferSourceId === transferDestId) {
      setTransferError('A conta de destino não pode ser igual à conta de origem.');
      return;
    }

    const parsedAmount = parseFloat(transferAmount.replace(/\./g, '').replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setTransferError('O valor da transferência deve ser maior que zero.');
      return;
    }

    const newTransfer: AccountTransfer = {
      id: generateUniqueId(),
      sourceAccountId: transferSourceId,
      destinationAccountId: transferDestId,
      amount: parsedAmount,
      date: transferDate,
      createdAt: new Date().toISOString(),
    };

    await onSaveTransfer(newTransfer);
    setSubMode('list');
  };

  // Open Account Detail
  const handleOpenDetail = (accountId: string) => {
    setSelectedAccountId(accountId);
    setSimulatedTxIds(new Set());
    setSubMode('detail');
  };

  // Selected account for detail view
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  // Future transactions for 28-day simulation (between today and next 28 days)
  const next28DaysDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 28);
    return d.toISOString().split('T')[0];
  })();

  const future28DaysTxs = selectedAccount
    ? transactions.filter((tx) => {
        const isLinked = tx.accountId === selectedAccount.id || (!tx.accountId && selectedAccount.isDefault);
        return isLinked && tx.date >= todayIso && tx.date <= next28DaysDate;
      }).sort((a, b) => a.date.localeCompare(b.date))
    : [];

  // Calculate simulated balance for 28 days
  const updatedRealBalance = selectedAccount ? calculateAccountBalance(selectedAccount, todayIso) : 0;
  
  const simulatedAddition = future28DaysTxs.reduce((sum, tx) => {
    if (simulatedTxIds.has(tx.id)) {
      return sum + (tx.type === 'entrada' ? tx.amount : -tx.amount);
    }
    return sum;
  }, 0);

  const simulatedBalance = updatedRealBalance + simulatedAddition;

  const toggleSimulatedTx = (txId: string) => {
    setSimulatedTxIds((prev) => {
      const next = new Set(prev);
      if (next.has(txId)) {
        next.delete(txId);
      } else {
        next.add(txId);
      }
      return next;
    });
  };

  // Render Sub-Views
  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ==================== SUB-VIEW 1: LISTA DE CONTAS ==================== */}
      {subMode === 'list' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-gray-200 p-5 rounded-lg shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#203723] text-white flex items-center justify-center shrink-0 shadow-xs border border-[#C19848]/20">
                <Wallet className="w-5 h-5 text-[#C19848]" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">
                  Cadastro de Contas
                </h2>
                <p className="text-xs text-gray-500 font-medium">
                  Acompanhamento do estoque real de dinheiro por conta bancária e caixa
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleOpenNewAccount}
                className="flex items-center gap-1.5 bg-[#C19848] hover:bg-[#C19848]/90 text-[#203723] text-xs font-bold px-4 py-2 rounded-md shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Conta</span>
              </button>

              {accounts.length >= 2 && (
                <button
                  type="button"
                  onClick={handleOpenTransfer}
                  className="flex items-center gap-1.5 bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 text-xs font-semibold px-4 py-2 rounded-md shadow-xs transition-all cursor-pointer"
                >
                  <ArrowLeftRight className="w-4 h-4 text-[#C19848]" />
                  <span>Transferir entre Contas</span>
                </button>
              )}
            </div>
          </div>

          {/* Accounts List Content */}
          {accounts.length === 0 ? (
            /* Estado Vazio */
            <div className="bg-white border border-gray-200 rounded-lg p-10 text-center shadow-xs max-w-xl mx-auto space-y-4 my-8">
              <div className="w-14 h-14 rounded-full bg-[#E4D8BE]/20 text-[#C19848] flex items-center justify-center mx-auto border border-[#C19848]/30">
                <Wallet className="w-7 h-7 text-[#C19848]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-900">
                  Nenhuma conta cadastrada
                </h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
                  Cadastre suas contas para acompanhar o saldo real do seu dinheiro, além do fluxo de caixa.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenNewAccount}
                className="inline-flex items-center gap-2 bg-[#C19848] hover:bg-[#C19848]/90 text-[#203723] text-xs font-bold px-5 py-2.5 rounded-md shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Minha Primeira Conta</span>
              </button>
            </div>
          ) : (
            /* Estado com uma ou mais contas */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((acc) => {
                const balance = calculateAccountBalance(acc, todayIso);
                const isNegative = balance < 0;

                return (
                  <div
                    key={acc.id}
                    onClick={() => handleOpenDetail(acc.id)}
                    className="bg-white border border-gray-200 hover:border-[#C19848]/60 hover:shadow-md rounded-lg p-5 transition-all cursor-pointer flex flex-col justify-between relative group"
                  >
                    <div>
                      {/* Top Header of Card */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="text-base font-bold text-gray-900 group-hover:text-[#C19848] transition-colors leading-tight">
                            {acc.nickname}
                          </h3>
                          {acc.financialInstitution && (
                            <p className="text-xs text-gray-500 font-medium flex items-center gap-1 mt-0.5">
                              <Building2 className="w-3 h-3 text-gray-400" />
                              <span>{acc.financialInstitution}</span>
                            </p>
                          )}
                        </div>

                        {/* Conta Padrão Badge */}
                        {acc.isDefault && accounts.length >= 2 && (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-[#E4D8BE]/30 text-[#203723] px-2 py-0.5 rounded font-bold border border-[#C19848]/30 shrink-0">
                            <ShieldCheck className="w-3 h-3 text-[#C19848]" />
                            Conta padrão
                          </span>
                        )}
                      </div>

                      {/* Owner type badge */}
                      <span className="inline-block text-[10px] uppercase font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                        {acc.ownerType === 'PF' ? 'Pessoa Física (PF)' : 'Pessoa Jurídica (PJ)'}
                      </span>
                    </div>

                    {/* Updated Balance Section */}
                    <div className="mt-6 pt-4 border-t border-gray-100 flex items-end justify-between">
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase font-semibold block">
                          Saldo Atualizado
                        </span>
                        {/* Neutral Red for negative balance exception as per Section 2.1 */}
                        <p className={`text-xl font-bold font-mono ${
                          isNegative ? 'text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded inline-block mt-0.5' : 'text-emerald-700'
                        }`}>
                          {formatCurrency(balance)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 text-xs font-semibold text-[#C19848] group-hover:translate-x-1 transition-transform">
                        <span>Detalhes</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== SUB-VIEW 2: FORMULÁRIO DE NOVA / EDIÇÃO DE CONTA ==================== */}
      {(subMode === 'new' || subMode === 'edit') && (
        <div className="max-w-xl mx-auto bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSubMode('list')}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {subMode === 'new' ? 'Nova Conta Bancária' : 'Editar Conta Bancária'}
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  Cadastre o local onde o saldo de dinheiro fica armazenado
                </p>
              </div>
            </div>
          </div>

          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSaveAccountForm} className="space-y-4">
            {/* 1. Apelido da Conta */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Apelido da Conta <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Ex: Itaú Empresa, Bradesco PF, Caixa Geral"
                className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C19848]/30 focus:border-[#C19848]"
              />
            </div>

            {/* 2. Tipo de Titular */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Tipo de Titular <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOwnerType('PJ')}
                  className={`px-3 py-2 rounded-md text-xs font-semibold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    ownerType === 'PJ'
                      ? 'bg-[#C19848] text-[#203723] border-[#C19848] font-bold'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Pessoa Jurídica (PJ)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOwnerType('PF')}
                  className={`px-3 py-2 rounded-md text-xs font-semibold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    ownerType === 'PF'
                      ? 'bg-[#C19848] text-[#203723] border-[#C19848] font-bold'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Pessoa Física (PF)</span>
                </button>
              </div>
            </div>

            {/* 3. Instituição Financeira */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Instituição Financeira <span className="text-gray-400 font-normal">(Opcional)</span>
              </label>
              <input
                type="text"
                value={financialInstitution}
                onChange={(e) => setFinancialInstitution(e.target.value)}
                placeholder="Ex: Banco Itaú, Nubank, Semeando, Dinheiro Físico"
                className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C19848]/30 focus:border-[#C19848]"
              />
            </div>

            {/* 4. Saldo Atual */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Saldo Atual / Inicial <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                placeholder="Ex: 5000.00 ou -1200.00"
                className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C19848]/30 focus:border-[#C19848] font-mono"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Aceita valores negativos em caso de limite de cheque especial utilizado.
              </p>
            </div>

            {/* 5. Data de Referência do Saldo */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Data de Referência do Saldo <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={referenceDate}
                onChange={(e) => setReferenceDate(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C19848]/30 focus:border-[#C19848]"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Data a partir da qual os lançamentos reais passam a somar ou subtrair sobre este valor digitado.
              </p>
            </div>

            {/* 6. Conta Padrão (Switch, só aparece a partir da 2ª conta) */}
            {accounts.length >= 1 && (subMode === 'new' || (subMode === 'edit' && accounts.length >= 2)) && (
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-800 block">Conta Padrão</span>
                  <span className="text-[10px] text-gray-500 block">
                    Será a conta pré-selecionada nos novos lançamentos
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDefault(!isDefault)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    isDefault ? 'bg-[#C19848]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform shadow-xs ${
                      isDefault ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            )}

            {/* Form Actions */}
            <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSubMode('list')}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-[#C19848] hover:bg-[#C19848]/90 text-[#203723] font-bold text-xs px-5 py-2.5 rounded-md shadow-xs transition-all cursor-pointer"
              >
                Salvar Conta
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==================== SUB-VIEW 3: TRANSFERÊNCIA ENTRE CONTAS ==================== */}
      {subMode === 'transfer' && (
        <div className="max-w-xl mx-auto bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSubMode('list')}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Transferência entre Contas
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  Movimente saldo entre suas contas sem alterar as métricas de fluxo de caixa
                </p>
              </div>
            </div>
          </div>

          {transferError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{transferError}</span>
            </div>
          )}

          <form onSubmit={handleSaveTransferForm} className="space-y-4">
            {/* Conta Origem */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Conta de Origem <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={transferSourceId}
                onChange={(e) => setTransferSourceId(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C19848]/30 focus:border-[#C19848]"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.nickname} ({formatCurrency(calculateAccountBalance(acc))})
                  </option>
                ))}
              </select>
            </div>

            {/* Conta Destino */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Conta de Destino <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={transferDestId}
                onChange={(e) => setTransferDestId(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C19848]/30 focus:border-[#C19848]"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id} disabled={acc.id === transferSourceId}>
                    {acc.nickname} {acc.id === transferSourceId ? '(Origem)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Valor */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Valor da Transferência <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="0,00"
                className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C19848]/30 focus:border-[#C19848] font-mono font-bold"
              />
            </div>

            {/* Data */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Data da Movimentação <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C19848]/30 focus:border-[#C19848]"
              />
            </div>

            <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-md text-[11px] text-amber-900 font-medium leading-relaxed">
              <Info className="w-3.5 h-3.5 text-amber-700 inline-block mr-1" />
              Transferências não entram em total de entradas nem de saídas do Dashboard e do Calendário.
            </div>

            {/* Form Actions */}
            <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSubMode('list')}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-[#C19848] hover:bg-[#C19848]/90 text-[#203723] font-bold text-xs px-5 py-2.5 rounded-md shadow-xs transition-all cursor-pointer"
              >
                Confirmar Transferência
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==================== SUB-VIEW 4: DETALHE DA CONTA & SIMULAÇÃO 28 DIAS ==================== */}
      {subMode === 'detail' && selectedAccount && (
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-gray-200 p-5 rounded-lg shadow-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSubMode('list')}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
                title="Voltar à lista"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">
                    {selectedAccount.nickname}
                  </h2>
                  {selectedAccount.isDefault && accounts.length >= 2 && (
                    <span className="text-[10px] bg-[#E4D8BE]/30 text-[#203723] px-2 py-0.5 rounded font-bold border border-[#C19848]/30">
                      Conta padrão
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 font-medium">
                  {selectedAccount.financialInstitution || 'Instituição não informada'} • {selectedAccount.ownerType === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleOpenEditAccount(selectedAccount)}
              className="px-3.5 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              Editar Conta
            </button>
          </div>

          {/* PARTE 1: SALDO ATUALIZADO (FATO) */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Parte 1: Saldo Atualizado (Fato)
              </span>
              <span className="text-[11px] text-gray-400">
                Data de referência: {formatDateBR(selectedAccount.referenceDate)}
              </span>
            </div>

            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-[11px] text-emerald-800 font-semibold block">Saldo Atualizado</span>
                <p className="text-2xl font-extrabold font-mono text-emerald-700 mt-0.5">
                  {formatCurrency(updatedRealBalance)}
                </p>
              </div>
              <div className="text-right text-[11px] text-gray-500 space-y-0.5">
                <p>Saldo de partida: <span className="font-mono font-semibold">{formatCurrency(selectedAccount.initialBalance)}</span></p>
              </div>
            </div>
          </div>

          {/* PARTE 2: PRÓXIMOS 28 DIAS (HIPÓTESE, SOB DEMANDA) */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-xs space-y-4">
            <div className="border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">
                Parte 2: Próximos 28 Dias (Simulação)
              </h3>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                Selecione lançamentos futuros para simular como seu saldo pode se comportar.
              </p>
            </div>

            {/* Simulated Balance Box */}
            <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-amber-900 block">Saldo Simulado</span>
                <p className="text-2xl font-extrabold font-mono text-amber-800 mt-0.5">
                  {formatCurrency(simulatedBalance)}
                </p>
                <p className="text-[10px] text-amber-700 mt-1 italic">
                  Simulação não salva. Suas seleções são apagadas ao sair desta tela.
                </p>
              </div>

              {simulatedTxIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => setSimulatedTxIds(new Set())}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Limpar Seleção ({simulatedTxIds.size})</span>
                </button>
              )}
            </div>

            {/* List of Future Transactions in the Next 28 Days */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Lançamentos Futuros ({future28DaysTxs.length})
              </h4>

              {future28DaysTxs.length === 0 ? (
                <div className="p-6 text-center bg-gray-50 border border-gray-200 rounded-md text-gray-500 text-xs font-medium">
                  Nenhum lançamento previsto para os próximos 28 dias nesta conta.
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
                        className={`p-3 flex items-center justify-between gap-3 transition-colors cursor-pointer select-none ${
                          isChecked ? 'bg-amber-50/60' : 'hover:bg-gray-50'
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
                              {formatDateBR(tx.date)} • {tx.category}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className={`text-xs font-bold font-mono ${
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
        </div>
      )}
    </div>
  );
};
