import React, { useState, useEffect, useCallback } from 'react';
import {
  Transaction,
  Tag,
  ActiveView,
  ImportValidationResult,
  UserProfile,
  RecurrenceRule,
  Account,
  AccountTransfer,
} from './types';
import {
  fetchTransactions,
  upsertTransaction,
  upsertTransactions,
  deleteTransaction as dbDeleteTransaction,
  deleteTransactions,
  fetchTags,
  upsertTag,
  upsertTags,
  deleteTag as dbDeleteTag,
  fetchRecurrenceRules,
  upsertRecurrenceRule,
  upsertRecurrenceRules,
  deleteRecurrenceRule as dbDeleteRecurrenceRule,
  fetchUserProfile,
  saveUserProfile,
  fetchAccounts,
  upsertAccount,
  fetchAccountTransfers,
  upsertAccountTransfer,
} from './services/database';
import { syncRecurrencesSupabase } from './services/recurrence';
import { generateUniqueId } from './utils/formatters';
import { useAuth } from './contexts/AuthContext';

import { Header } from './components/Header';
import { TransactionPanel } from './components/TransactionPanel';
import { ImportPreviewModal } from './components/ImportPreviewModal';
import { UserProfileSidebar } from './components/UserProfileSidebar';
import { LoginPage } from './components/LoginPage';
import { UnauthorizedPage } from './components/UnauthorizedPage';

import { HomeView } from './components/views/HomeView';
import { CalendarView } from './components/views/CalendarView';
import { MonthlyClosingView } from './components/views/MonthlyClosingView';
import { SearchFilterView } from './components/views/SearchFilterView';
import { ExcelView } from './components/views/ExcelView';
import { TagsManagementView } from './components/views/TagsManagementView';
import { RecurrencesView } from './components/views/RecurrencesView';
import { AccountsView } from './components/views/AccountsView';

const DEFAULT_PROFILE: UserProfile = {
  name: 'Administrador',
  email: 'admin@theparlor.com.br',
  avatarUrl: '',
  role: 'Gerente Financeiro',
  accessLevel: 'Administrador',
};

export default function App() {
  const { user, status, signOut } = useAuth();
  // Default to 'calendario' as per Section 1 (Weekly view with today selected and details open)
  const [activeView, setActiveView] = useState<ActiveView>('calendario');

  // Core Data State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [rules, setRules] = useState<RecurrenceRule[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transfers, setTransfers] = useState<AccountTransfer[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [dataLoading, setDataLoading] = useState(true);

  // User Profile Sidebar State
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Slide-over Panel State
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [panelDefaultDate, setPanelDefaultDate] = useState<string>('');

  // Import Preview Modal State
  const [importResult, setImportResult] = useState<ImportValidationResult | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Toast message
  const [toastMessage, setToastMessage] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // ─── Load all data from Supabase on mount ───────────────────
  const loadAllData = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      const [fetchedRules, fetchedTags, profile, fetchedAccounts, fetchedTransfers] = await Promise.all([
        fetchRecurrenceRules(),
        fetchTags(),
        fetchUserProfile(),
        fetchAccounts(),
        fetchAccountTransfers(),
      ]);

      setRules(fetchedRules);
      setTags(fetchedTags);
      setAccounts(fetchedAccounts);
      setTransfers(fetchedTransfers);

      if (profile) {
        setUserProfile(profile);
      } else {
        // Build profile from Google auth user data
        const googleProfile: UserProfile = {
          ...DEFAULT_PROFILE,
          name: user.user_metadata?.full_name || user.email || 'Usuário',
          email: user.email || '',
          avatarUrl: user.user_metadata?.avatar_url || '',
        };
        setUserProfile(googleProfile);
        await saveUserProfile(googleProfile);
      }

      // Sync recurrences (Supabase-aware)
      if (fetchedRules.length > 0) {
        const newTxs = await syncRecurrencesSupabase(fetchedRules);
        const allTxs = await fetchTransactions();
        setTransactions(allTxs);
        if (newTxs.length > 0) {
          // transactions already saved by syncRecurrencesSupabase
        }
      } else {
        const allTxs = await fetchTransactions();
        setTransactions(allTxs);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  // ─── Accounts & Transfers Handlers ────────────────────────────
  const handleSaveAccount = async (account: Account) => {
    await upsertAccount(account);
    const updated = await fetchAccounts();
    setAccounts(updated);
    showToast('Conta bancária salva com sucesso!');
  };

  const handleSaveTransfer = async (transfer: AccountTransfer) => {
    await upsertAccountTransfer(transfer);
    const updated = await fetchAccountTransfers();
    setTransfers(updated);
    showToast('Transferência realizada com sucesso!');
  };

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // ─── Profile ─────────────────────────────────────────────────
  const handleSaveProfile = async (updatedProfile: UserProfile) => {
    setUserProfile(updatedProfile);
    await saveUserProfile(updatedProfile);
    showToast('Perfil atualizado com sucesso!');
  };

  // ─── Rules ───────────────────────────────────────────────────
  const handleUpdateRules = async (newRules: RecurrenceRule[]) => {
    setRules(newRules);
    await upsertRecurrenceRules(newRules);
    // Re-sync recurrences
    const newTxs = await syncRecurrencesSupabase(newRules);
    if (newTxs.length > 0) {
      const allTxs = await fetchTransactions();
      setTransactions(allTxs);
    }
  };

  const handleSaveRule = async (rule: RecurrenceRule) => {
    const isExisting = rules.some(r => r.id === rule.id);

    if (isExisting) {
      // Filter transactions to match new date range
      let updatedTxs = [...transactions];

      const toDelete = updatedTxs.filter(t => {
        if (t.recurrenceRuleId === rule.id) {
          if (t.date < rule.startDate) return true;
          if (rule.endDate && t.date > rule.endDate) return true;
        }
        return false;
      });
      if (toDelete.length > 0) {
        await deleteTransactions(toDelete.map(t => t.id));
        updatedTxs = updatedTxs.filter(t => !toDelete.find(d => d.id === t.id));
      }

      // Update unmodified recurrence transactions
      const toUpdate = updatedTxs
        .filter(t => t.recurrenceRuleId === rule.id && !t.recurrenceModified)
        .map(t => ({
          ...t,
          title: rule.title,
          amount: rule.amount,
          type: rule.type,
          category: rule.category,
          tagCode: rule.tagCode,
          paymentMethod: rule.paymentMethod,
        }));

      if (toUpdate.length > 0) {
        await upsertTransactions(toUpdate);
        updatedTxs = updatedTxs.map(t => toUpdate.find(u => u.id === t.id) || t);
      }

      setTransactions(updatedTxs);
    }

    const newRules = isExisting
      ? rules.map(r => r.id === rule.id ? rule : r)
      : [...rules, rule];

    await upsertRecurrenceRule(rule);
    await handleUpdateRules(newRules);
    showToast(isExisting ? 'Recorrência atualizada!' : 'Nova recorrência criada!');
  };

  const handleDeleteRule = async (id: string) => {
    await dbDeleteRecurrenceRule(id);
    const newRules = rules.filter(r => r.id !== id);
    setRules(newRules);
    showToast('Recorrência excluída.');
  };

  const handleTogglePauseRule = async (id: string, isPaused: boolean) => {
    const rule = rules.find(r => r.id === id);
    if (!rule) return;
    const updated = { ...rule, isPaused };
    await upsertRecurrenceRule(updated);
    const newRules = rules.map(r => r.id === id ? updated : r);
    setRules(newRules);
    showToast(isPaused ? 'Recorrência pausada.' : 'Recorrência retomada.');
  };

  // ─── Transactions ─────────────────────────────────────────────
  const handleUpdateTransactions = async (newTxs: Transaction[]) => {
    setTransactions(newTxs);
  };

  // ─── Tags ─────────────────────────────────────────────────────
  const handleUpdateTags = async (newTags: Tag[]) => {
    setTags(newTags);
    await upsertTags(newTags);
  };

  // ─── Transaction Panel Triggers ──────────────────────────────
  const handleOpenNewTransaction = (defaultDate: string = '') => {
    setEditingTransaction(null);
    setPanelDefaultDate(defaultDate);
    setIsPanelOpen(true);
  };

  const handleOpenEditTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsPanelOpen(true);
  };

  // ─── Save Transaction (Create or Update) ─────────────────────
  const handleSaveTransaction = async (
    txData: Omit<Transaction, 'id' | 'createdAt'> & { id?: string },
    editScope?: 'single' | 'future'
  ) => {
    if (txData.id) {
      const existingTx = transactions.find(t => t.id === txData.id);
      if (existingTx?.recurrenceRuleId && editScope === 'future') {
        const ruleId = existingTx.recurrenceRuleId;
        const rule = rules.find(r => r.id === ruleId);
        if (rule) {
          const updatedRule = {
            ...rule,
            amount: txData.amount,
            title: txData.title,
            type: txData.type,
            category: txData.category,
            tagCode: txData.tagCode,
            paymentMethod: txData.paymentMethod,
          };
          const newRules = rules.map(r => r.id === ruleId ? updatedRule : r);

          // Remove future unmodified recurrence txs
          const toDelete = transactions.filter(
            t => t.recurrenceRuleId === ruleId && !t.recurrenceModified && t.date >= txData.date
          );
          await deleteTransactions(toDelete.map(t => t.id));
          const updatedTxs = transactions.filter(t => !toDelete.find(d => d.id === t.id));

          setRules(newRules);
          await upsertRecurrenceRules(newRules);
          await upsertTransactions(updatedTxs);

          // Re-sync
          const synced = await syncRecurrencesSupabase(newRules);
          if (synced.length > 0) {
            const allTxs = await fetchTransactions();
            setTransactions(allTxs);
          } else {
            setTransactions(updatedTxs);
          }

          showToast('Regra atualizada para esta e as futuras.');
          return;
        }
      }

      // Update single existing transaction
      const updatedTx: Transaction = {
        ...existingTx!,
        title: txData.title,
        date: txData.date,
        amount: txData.amount,
        type: txData.type,
        category: txData.category,
        tagCode: txData.tagCode,
        paymentMethod: txData.paymentMethod,
        description: txData.description,
        recurrenceModified: existingTx?.recurrenceRuleId ? true : existingTx?.recurrenceModified,
      };
      await upsertTransaction(updatedTx);
      const updated = transactions.map(t => t.id === txData.id ? updatedTx : t);
      await handleUpdateTransactions(updated);
      showToast('Lançamento atualizado com sucesso.');
    } else {
      // Create new
      const newTx: Transaction = {
        id: generateUniqueId(),
        createdAt: new Date().toISOString(),
        title: txData.title,
        date: txData.date,
        amount: txData.amount,
        type: txData.type,
        category: txData.category,
        tagCode: txData.tagCode,
        paymentMethod: txData.paymentMethod,
        description: txData.description,
      };
      await upsertTransaction(newTx);
      await handleUpdateTransactions([newTx, ...transactions]);
      showToast('Lançamento registrado com sucesso.');
    }
  };

  // ─── Delete Transaction ────────────────────────────────────────
  const handleDeleteTransaction = async (id: string, deleteScope?: 'single' | 'future') => {
    const existingTx = transactions.find(t => t.id === id);
    if (existingTx?.recurrenceRuleId && deleteScope === 'future') {
      const ruleId = existingTx.recurrenceRuleId;
      const rule = rules.find(r => r.id === ruleId);
      if (rule) {
        const d = new Date(existingTx.date);
        d.setDate(d.getDate() - 1);
        const prevDate = d.toISOString().split('T')[0];

        const updatedRule = { ...rule, endDate: prevDate, isPaused: true };
        const newRules = rules.map(r => r.id === ruleId ? updatedRule : r);

        const toDelete = transactions.filter(
          t => t.recurrenceRuleId === ruleId && !t.recurrenceModified && t.date >= existingTx.date
        );
        await deleteTransactions(toDelete.map(t => t.id));
        const updatedTxs = transactions.filter(t => !toDelete.find(d => d.id === t.id));

        setRules(newRules);
        await upsertRecurrenceRules(newRules);
        await handleUpdateTransactions(updatedTxs);
        showToast('Lançamentos futuros excluídos e regra encerrada.');
        return;
      }
    }

    await dbDeleteTransaction(id);
    const updated = transactions.filter(t => t.id !== id);
    await handleUpdateTransactions(updated);
    showToast('Lançamento excluído com sucesso.');
  };

  // ─── Tags ──────────────────────────────────────────────────────
  const handleAddNewTag = async (newTag: Tag) => {
    if (!tags.some(t => t.name.toLowerCase() === newTag.name.toLowerCase())) {
      const updated = [...tags, newTag];
      await handleUpdateTags(updated);
    }
  };

  const handleSaveTag = async (tag: Tag) => {
    const exists = tags.some(t => t.id === tag.id);
    if (exists) {
      const updated = tags.map(t => (t.id === tag.id ? tag : t));
      await upsertTag(tag);
      setTags(updated);
      showToast(`Categoria "${tag.name}" atualizada.`);
    } else {
      await handleAddNewTag(tag);
      showToast(`Categoria "${tag.name}" criada.`);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    await dbDeleteTag(tagId);
    const updated = tags.filter(t => t.id !== tagId);
    setTags(updated);
    showToast('Categoria removida.');
  };

  // ─── Excel Import ──────────────────────────────────────────────
  const handleConfirmImport = async (customValidRows?: ImportValidationResult['validRows']) => {
    const rowsToImport = customValidRows || importResult?.validRows;
    if (!rowsToImport || rowsToImport.length === 0) return;

    // Create new tags from import if tagCode is present
    const existingCodes = new Set(tags.map(t => (t.code || '').toUpperCase()));
    const newTagsToCreate: Tag[] = [];

    rowsToImport.forEach(row => {
      if (row.tagCode && !existingCodes.has(row.tagCode.toUpperCase())) {
        existingCodes.add(row.tagCode.toUpperCase());
        newTagsToCreate.push({
          id: generateUniqueId(),
          code: row.tagCode.toUpperCase(),
          name: `Tag ${row.tagCode.toUpperCase()}`,
        });
      }
    });

    if (newTagsToCreate.length > 0) {
      await handleUpdateTags([...tags, ...newTagsToCreate]);
    }

    // Create new transactions from import
    const newTransactions: Transaction[] = rowsToImport.map(row => ({
      id: generateUniqueId(),
      createdAt: new Date().toISOString(),
      date: row.date,
      type: row.type,
      title: row.title,
      amount: row.amount,
      category: row.category,
      tagCode: row.tagCode || '',
      paymentMethod: row.paymentMethod || 'Outros',
      description: row.description || '',
    }));

    await upsertTransactions(newTransactions);
    const allTxs = await fetchTransactions();
    setTransactions(allTxs);

    setIsImportModalOpen(false);
    setImportResult(null);
    showToast(`${newTransactions.length} lançamento(s) importado(s) com sucesso!`);
  };

  // ─── Authentication gates ──────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#faf6ee] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-[#C19848]/30 border-t-[#C19848] rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-500 font-medium">Autenticando...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <LoginPage />;
  }

  if (status === 'unauthorized') {
    return <UnauthorizedPage />;
  }

  // ─── Loading state ─────────────────────────────────────────────
  if (dataLoading) {
    return (
      <div className="min-h-screen bg-[#faf6ee] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-[#C19848]/30 border-t-[#C19848] rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-500 font-medium">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf6ee] text-gray-900 font-sans flex flex-col selection:bg-[#C19848]/30 selection:text-gray-950">

      {/* Fixed Top Header */}
      <Header
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenNewTransaction={() => handleOpenNewTransaction('')}
        userProfile={userProfile}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      {/* Toast Banner Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#203723] text-white text-xs font-semibold px-5 py-3 rounded-lg shadow-2xl flex items-center gap-2 border border-[#C19848]/20">
          <span className="w-2 h-2 rounded-full bg-[#C19848]"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className={`flex-1 w-full mx-auto py-6 transition-all ${
        activeView === 'calendario' || activeView === 'semanal'
          ? 'max-w-[1500px] px-2 sm:px-4 lg:px-5'
          : 'max-w-7xl px-4 sm:px-6 lg:px-8'
      }`}>
        {(activeView === 'inicio' || activeView === 'calendario' || activeView === 'semanal' || activeView === 'fechamento') && (
          <CalendarView
            transactions={transactions}
            tags={tags}
            onOpenNewTransaction={handleOpenNewTransaction}
            onEditTransaction={handleOpenEditTransaction}
            accounts={accounts}
            transfers={transfers}
            initialViewMode="semanal"
          />
        )}

        {activeView === 'contas' && (
          <AccountsView
            accounts={accounts}
            transfers={transfers}
            transactions={transactions}
            onSaveAccount={handleSaveAccount}
            onSaveTransfer={handleSaveTransfer}
          />
        )}

        {activeView === 'busca' && (
          <SearchFilterView
            transactions={transactions}
            tags={tags}
            onEditTransaction={handleOpenEditTransaction}
          />
        )}

        {activeView === 'excel' && (
          <ExcelView
            transactions={transactions}
            tags={tags}
            onShowImportPreview={result => {
              setImportResult(result);
              setIsImportModalOpen(true);
            }}
          />
        )}

        {activeView === 'tags' && (
          <TagsManagementView
            tags={tags}
            transactions={transactions}
            onSaveTag={handleSaveTag}
            onDeleteTag={handleDeleteTag}
          />
        )}

        {activeView === 'recorrencias' && (
          <RecurrencesView
            rules={rules}
            tags={tags}
            onSaveRule={handleSaveRule}
            onDeleteRule={handleDeleteRule}
            onTogglePause={handleTogglePauseRule}
          />
        )}
      </main>

      {/* Elegant System Footer */}
      <footer className="w-full bg-[#203723] text-gray-400 py-6 px-4 mt-auto border-t border-[#C19848]/15 text-center shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center gap-1">
          <p className="font-brand font-bold text-xs tracking-widest text-[#C19848] uppercase">The Parlor</p>
          <p className="font-brand italic text-[11px] text-[#E4D8BE]/80">Fluxo de Caixa — Gestão Inteligente &amp; Elegante</p>
          <p className="text-[10px] text-gray-500 mt-2">© 2026 Todos os direitos reservados.</p>
        </div>
      </footer>

      {/* Slide-over Transaction Panel */}
      <TransactionPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        onSave={handleSaveTransaction}
        onDelete={handleDeleteTransaction}
        transactionToEdit={editingTransaction}
        defaultDate={panelDefaultDate}
        tags={tags}
        onAddNewTag={handleAddNewTag}
        accounts={accounts}
      />

      {/* Import Preview Modal */}
      <ImportPreviewModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        validationResult={importResult}
        onConfirmImport={handleConfirmImport}
        tags={tags}
      />

      {/* User Profile & Settings Left Sidebar */}
      <UserProfileSidebar
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        profile={userProfile}
        onSaveProfile={handleSaveProfile}
        onNavigateView={setActiveView}
      />

    </div>
  );
}
