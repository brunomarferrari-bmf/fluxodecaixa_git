import React, { useState } from 'react';
import { ActiveView, Account, AccountTransfer, Transaction } from '../../types';
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
  ShieldCheck,
  TrendingUp,
  Edit2,
  Trash2,
  Info,
} from 'lucide-react';

interface AccountsViewProps {
  accounts: Account[];
  transfers: AccountTransfer[];
  transactions: Transaction[];
  onSaveAccount: (account: Account) => Promise<void>;
  onSaveTransfer: (transfer: AccountTransfer) => Promise<void>;
  onDeleteAccount?: (accountId: string) => Promise<void>;
  onNavigateView?: (view: ActiveView) => void;
}

type ViewSubMode = 'list' | 'new' | 'edit' | 'transfer';

export const AccountsView: React.FC<AccountsViewProps> = ({
  accounts,
  transfers,
  transactions,
  onSaveAccount,
  onSaveTransfer,
  onDeleteAccount,
  onNavigateView,
}) => {
  const todayIso = getTodayISO();

  // Navigation mode inside accounts view
  const [subMode, setSubMode] = useState<ViewSubMode>('list');

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

  // Helper: calculate updated real balance for an account
  const calculateAccountBalance = (account: Account, untilDate: string = todayIso) => {
    let balance = account.initialBalance;

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

  // Delete Account
  const handleDeleteAccountConfirm = async (acc: Account) => {
    if (window.confirm(`Deseja realmente excluir a conta "${acc.nickname}"?`)) {
      if (onDeleteAccount) {
        await onDeleteAccount(acc.id);
      }
    }
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

    const finalIsDefault = accounts.length === 0 ? true : isDefault;

    if (editingAccount && editingAccount.isDefault && !finalIsDefault) {
      const otherDefaults = accounts.filter((a) => a.id !== editingAccount.id && a.isDefault);
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

  // Open Transfer Form (with optional default source account ID)
  const handleOpenTransfer = (sourceId?: string) => {
    if (accounts.length < 2) {
      alert('É necessário ter pelo menos duas contas cadastradas para realizar uma transferência entre contas.');
      return;
    }
    const source = sourceId || accounts[0]?.id || '';
    const dest = accounts.find((a) => a.id !== source)?.id || '';
    setTransferSourceId(source);
    setTransferDestId(dest);
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
                  onClick={() => handleOpenTransfer()}
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
                    className="bg-white border border-gray-200 hover:border-[#C19848]/60 hover:shadow-md rounded-lg p-5 transition-all flex flex-col justify-between relative group"
                  >
                    <div>
                      {/* Top Header of Card */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-bold text-gray-900 leading-tight truncate">
                              {acc.nickname}
                            </h3>
                            {acc.isDefault && accounts.length >= 2 && (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-[#E4D8BE]/30 text-[#203723] px-2 py-0.5 rounded font-bold border border-[#C19848]/30 shrink-0">
                                <ShieldCheck className="w-3 h-3 text-[#C19848]" />
                                Padrão
                              </span>
                            )}
                          </div>
                          {acc.financialInstitution && (
                            <p className="text-xs text-gray-500 font-medium flex items-center gap-1 mt-0.5">
                              <Building2 className="w-3 h-3 text-gray-400" />
                              <span>{acc.financialInstitution}</span>
                            </p>
                          )}
                        </div>

                        {/* Card Header Actions (Edit & Delete) */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEditAccount(acc)}
                            className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                            title="Editar conta"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {onDeleteAccount && (
                            <button
                              type="button"
                              onClick={() => handleDeleteAccountConfirm(acc)}
                              className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Excluir conta"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Owner type badge */}
                      <span className="inline-block text-[10px] uppercase font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                        {acc.ownerType === 'PF' ? 'Pessoa Física (PF)' : 'Pessoa Jurídica (PJ)'}
                      </span>
                    </div>

                    {/* Updated Balance Section */}
                    <div className="mt-6 pt-4 border-t border-gray-100 flex items-end justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase font-semibold block">
                          Saldo Atualizado
                        </span>
                        <p className={`text-xl font-bold font-mono ${
                          isNegative ? 'text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded inline-block mt-0.5' : 'text-emerald-700'
                        }`}>
                          {formatCurrency(balance)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Button 1: Transferência (Replaces Detalhes) */}
                        <button
                          type="button"
                          onClick={() => handleOpenTransfer(acc.id)}
                          className="px-3 py-1.5 rounded bg-[#C19848] hover:bg-[#C19848]/90 text-[#203723] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                          title="Transferir saldo entre contas"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                          <span>Transferência</span>
                        </button>

                        {/* Button 2: Projeção Shortcut */}
                        {onNavigateView && (
                          <button
                            type="button"
                            onClick={() => onNavigateView('projecao')}
                            className="p-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer"
                            title="Ver Projeção de Caixa"
                          >
                            <TrendingUp className="w-4 h-4 text-[#C19848]" />
                          </button>
                        )}
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
                    className={`w-4 h-4 rounded-full bg-[#203723] absolute top-1 transition-transform shadow-xs ${
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
    </div>
  );
};
