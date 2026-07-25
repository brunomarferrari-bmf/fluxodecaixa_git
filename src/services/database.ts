/**
 * Supabase & Dual-Layer Shared Establishment Database Service
 * Provides 100% persistent shared data across all users and sessions.
 * Implements Union-Merge pattern (localStorage + Supabase pool) so no entry is ever lost or erased.
 */
import { supabase } from './supabase';
import { Transaction, Tag, UserProfile, RecurrenceRule, Account, AccountTransfer } from '../types';

const STORAGE_KEYS = {
  TRANSACTIONS: 'theparlor_cashflow_transactions_v3',
  TAGS: 'theparlor_cashflow_tags_v3',
  PROFILE: 'theparlor_cashflow_profile_v1',
  RECURRENCE_RULES: 'theparlor_cashflow_recurrences_v1',
  ACCOUNTS: 'theparlor_accounts_v1',
  TRANSFERS: 'theparlor_account_transfers_v1',
};

// Helper: get current user id (if available)
async function getUserId(): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || 'shared_establishment';
  } catch {
    return 'shared_establishment';
  }
}

// ─────────────────────────────────────────────
// TRANSACTIONS
// ─────────────────────────────────────────────
export async function fetchTransactions(): Promise<Transaction[]> {
  const local = fetchTransactionsFromLocal();
  let remote: Transaction[] = [];

  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });

    if (!error && data) {
      remote = data.map(dbRowToTransaction);
    }
  } catch (err) {
    console.warn('Supabase fetchTransactions warning:', err);
  }

  // UNION MERGE: Merge local & remote by ID to prevent any data loss
  const mergedMap = new Map<string, Transaction>();
  local.forEach((t) => mergedMap.set(t.id, t));
  remote.forEach((t) => mergedMap.set(t.id, t));

  const merged = Array.from(mergedMap.values()).sort((a, b) => b.date.localeCompare(a.date));
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(merged));
  return merged;
}

export async function upsertTransaction(tx: Transaction): Promise<void> {
  // 1. Update localStorage immediately
  const current = fetchTransactionsFromLocal();
  const exists = current.some((t) => t.id === tx.id);
  const updated = exists
    ? current.map((t) => (t.id === tx.id ? tx : t))
    : [tx, ...current];

  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updated));

  // 2. Sync to Supabase
  try {
    const userId = await getUserId();
    await supabase
      .from('transactions')
      .upsert(transactionToDbRow(tx, userId), { onConflict: 'id' });
  } catch (err) {
    console.warn('Supabase upsertTransaction warning:', err);
  }
}

export async function upsertTransactions(txs: Transaction[]): Promise<void> {
  if (txs.length === 0) return;

  // 1. Update localStorage immediately
  const current = fetchTransactionsFromLocal();
  const currentMap = new Map(current.map((t) => [t.id, t]));
  txs.forEach((tx) => currentMap.set(tx.id, tx));
  const updated = Array.from(currentMap.values()).sort((a, b) => b.date.localeCompare(a.date));

  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updated));

  // 2. Sync to Supabase
  try {
    const userId = await getUserId();
    const rows = txs.map((tx) => transactionToDbRow(tx, userId));
    const BATCH = 100;
    for (let i = 0; i < rows.length; i += BATCH) {
      await supabase
        .from('transactions')
        .upsert(rows.slice(i, i + BATCH), { onConflict: 'id' });
    }
  } catch (err) {
    console.warn('Supabase batch upsertTransactions warning:', err);
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  const current = fetchTransactionsFromLocal();
  const updated = current.filter((t) => t.id !== id);
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updated));

  try {
    await supabase.from('transactions').delete().eq('id', id);
  } catch (err) {
    console.warn('Supabase deleteTransaction warning:', err);
  }
}

export async function deleteTransactions(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const idSet = new Set(ids);
  const current = fetchTransactionsFromLocal();
  const updated = current.filter((t) => !idSet.has(t.id));
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updated));

  try {
    await supabase.from('transactions').delete().in('id', ids);
  } catch (err) {
    console.warn('Supabase deleteTransactions warning:', err);
  }
}

function fetchTransactionsFromLocal(): Transaction[] {
  const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }
  return [];
}

function transactionToDbRow(tx: Transaction, userId: string) {
  return {
    id: tx.id,
    user_id: userId,
    date: tx.date,
    title: tx.title,
    amount: tx.amount,
    type: tx.type,
    category: tx.category || '',
    tag_code: tx.tagCode || '',
    payment_method: tx.paymentMethod || '',
    description: tx.description || '',
    created_at: tx.createdAt,
    recurrence_rule_id: tx.recurrenceRuleId || null,
    recurrence_modified: tx.recurrenceModified || false,
    account_id: tx.accountId || null,
  };
}

function dbRowToTransaction(row: Record<string, unknown>): Transaction {
  return {
    id: row.id as string,
    date: row.date as string,
    title: row.title as string,
    amount: Number(row.amount),
    type: row.type as 'entrada' | 'saida',
    category: (row.category as string) || '',
    tagCode: (row.tag_code as string) || '',
    paymentMethod: (row.payment_method as string) || '',
    description: (row.description as string) || '',
    createdAt: row.created_at as string,
    recurrenceRuleId: (row.recurrence_rule_id as string) || undefined,
    recurrenceModified: (row.recurrence_modified as boolean) || false,
    accountId: (row.account_id as string) || undefined,
  };
}

// ─────────────────────────────────────────────
// TAGS
// ─────────────────────────────────────────────
export async function fetchTags(): Promise<Tag[]> {
  const local = fetchTagsFromLocal();
  let remote: Tag[] = [];

  try {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('name');

    if (!error && data) {
      remote = data.map(dbRowToTag);
    }
  } catch (err) {
    console.warn('Supabase fetchTags warning:', err);
  }

  const mergedMap = new Map<string, Tag>();
  local.forEach((t) => mergedMap.set(t.id, t));
  remote.forEach((t) => mergedMap.set(t.id, t));

  const merged = Array.from(mergedMap.values());
  localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(merged));
  return merged;
}

export async function upsertTag(tag: Tag): Promise<void> {
  const current = fetchTagsFromLocal();
  const exists = current.some((t) => t.id === tag.id);
  const updated = exists ? current.map((t) => (t.id === tag.id ? tag : t)) : [...current, tag];
  localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(updated));

  try {
    const userId = await getUserId();
    await supabase.from('tags').upsert(tagToDbRow(tag, userId), { onConflict: 'id' });
  } catch {}
}

export async function upsertTags(tags: Tag[]): Promise<void> {
  if (tags.length === 0) return;
  const current = fetchTagsFromLocal();
  const currentMap = new Map(current.map((t) => [t.id, t]));
  tags.forEach((t) => currentMap.set(t.id, t));
  const updated = Array.from(currentMap.values());
  localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(updated));

  try {
    const userId = await getUserId();
    const rows = tags.map((t) => tagToDbRow(t, userId));
    await supabase.from('tags').upsert(rows, { onConflict: 'id' });
  } catch {}
}

export async function deleteTag(id: string): Promise<void> {
  const current = fetchTagsFromLocal();
  const updated = current.filter((t) => t.id !== id);
  localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(updated));

  try {
    await supabase.from('tags').delete().eq('id', id);
  } catch {}
}

function fetchTagsFromLocal(): Tag[] {
  const saved = localStorage.getItem(STORAGE_KEYS.TAGS);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }
  return [];
}

function tagToDbRow(tag: Tag, userId: string) {
  return {
    id: tag.id,
    user_id: userId,
    name: tag.name,
    color: tag.color || null,
    observation: tag.observation || null,
    code: tag.code || null,
  };
}

function dbRowToTag(row: Record<string, unknown>): Tag {
  return {
    id: row.id as string,
    name: row.name as string,
    color: (row.color as string) || undefined,
    observation: (row.observation as string) || undefined,
    code: (row.code as string) || undefined,
  };
}

// ─────────────────────────────────────────────
// RECURRENCE RULES
// ─────────────────────────────────────────────
export async function fetchRecurrenceRules(): Promise<RecurrenceRule[]> {
  const local = fetchRecurrenceRulesFromLocal();
  let remote: RecurrenceRule[] = [];

  try {
    const { data, error } = await supabase
      .from('recurrence_rules')
      .select('*')
      .order('created_at');

    if (!error && data) {
      remote = data.map(dbRowToRule);
    }
  } catch (err) {
    console.warn('Supabase fetchRecurrenceRules warning:', err);
  }

  const mergedMap = new Map<string, RecurrenceRule>();
  local.forEach((r) => mergedMap.set(r.id, r));
  remote.forEach((r) => mergedMap.set(r.id, r));

  const merged = Array.from(mergedMap.values());
  localStorage.setItem(STORAGE_KEYS.RECURRENCE_RULES, JSON.stringify(merged));
  return merged;
}

export async function upsertRecurrenceRule(rule: RecurrenceRule): Promise<void> {
  const current = fetchRecurrenceRulesFromLocal();
  const exists = current.some((r) => r.id === rule.id);
  const updated = exists ? current.map((r) => (r.id === rule.id ? rule : r)) : [...current, rule];
  localStorage.setItem(STORAGE_KEYS.RECURRENCE_RULES, JSON.stringify(updated));

  try {
    const userId = await getUserId();
    await supabase.from('recurrence_rules').upsert(ruleToDbRow(rule, userId), { onConflict: 'id' });
  } catch {}
}

export async function upsertRecurrenceRules(rules: RecurrenceRule[]): Promise<void> {
  if (rules.length === 0) return;
  const current = fetchRecurrenceRulesFromLocal();
  const currentMap = new Map(current.map((r) => [r.id, r]));
  rules.forEach((r) => currentMap.set(r.id, r));
  const updated = Array.from(currentMap.values());
  localStorage.setItem(STORAGE_KEYS.RECURRENCE_RULES, JSON.stringify(updated));

  try {
    const userId = await getUserId();
    const rows = rules.map((r) => ruleToDbRow(r, userId));
    await supabase.from('recurrence_rules').upsert(rows, { onConflict: 'id' });
  } catch {}
}

export async function deleteRecurrenceRule(id: string): Promise<void> {
  const current = fetchRecurrenceRulesFromLocal();
  const updated = current.filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEYS.RECURRENCE_RULES, JSON.stringify(updated));

  try {
    await supabase.from('recurrence_rules').delete().eq('id', id);
  } catch {}
}

function fetchRecurrenceRulesFromLocal(): RecurrenceRule[] {
  const saved = localStorage.getItem(STORAGE_KEYS.RECURRENCE_RULES);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }
  return [];
}

function ruleToDbRow(rule: RecurrenceRule, userId: string) {
  return {
    id: rule.id,
    user_id: userId,
    title: rule.title,
    amount: rule.amount,
    type: rule.type,
    category: rule.category || '',
    tag_code: rule.tagCode || '',
    payment_method: rule.paymentMethod || '',
    frequency: rule.frequency,
    repeat_day: rule.repeatDay || '',
    start_date: rule.startDate,
    end_date: rule.endDate || null,
    is_paused: rule.isPaused,
    created_at: rule.createdAt,
  };
}

function dbRowToRule(row: Record<string, unknown>): RecurrenceRule {
  return {
    id: row.id as string,
    title: row.title as string,
    amount: Number(row.amount),
    type: row.type as 'entrada' | 'saida',
    category: (row.category as string) || '',
    tagCode: (row.tag_code as string) || '',
    paymentMethod: (row.payment_method as string) || '',
    frequency: row.frequency as RecurrenceRule['frequency'],
    repeatDay: (row.repeat_day as string) || '',
    startDate: row.start_date as string,
    endDate: (row.end_date as string) || undefined,
    isPaused: (row.is_paused as boolean) || false,
    createdAt: row.created_at as string,
  };
}

// ─────────────────────────────────────────────
// USER PROFILE
// ─────────────────────────────────────────────
export async function fetchUserProfile(): Promise<UserProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        const profile: UserProfile = {
          name: (data.name as string) || user.user_metadata?.full_name || user.email || '',
          email: (data.email as string) || user.email || '',
          avatarUrl: (data.avatar_url as string) || user.user_metadata?.avatar_url || '',
          role: (data.role as string) || '',
          accessLevel: (data.access_level as string) || 'Administrador',
        };
        localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
        return profile;
      }
    }
  } catch {}

  const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }
  return null;
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  try {
    const userId = await getUserId();
    await supabase.from('user_profiles').upsert({
      id: userId,
      name: profile.name,
      email: profile.email,
      avatar_url: profile.avatarUrl || '',
      role: profile.role || '',
      access_level: profile.accessLevel || '',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  } catch {}
}

// ─────────────────────────────────────────────
// ACCOUNTS & TRANSFERS
// ─────────────────────────────────────────────
export async function fetchAccounts(): Promise<Account[]> {
  const local = fetchAccountsFromLocal();
  let remote: Account[] = [];

  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && data) {
      remote = data.map((row: any) => ({
        id: row.id,
        nickname: row.nickname,
        ownerType: row.owner_type || 'PF',
        financialInstitution: row.financial_institution || '',
        initialBalance: Number(row.initial_balance || 0),
        referenceDate: row.reference_date,
        isDefault: Boolean(row.is_default),
        createdAt: row.created_at,
      }));
    }
  } catch (err) {
    console.warn('Supabase fetchAccounts warning:', err);
  }

  const mergedMap = new Map<string, Account>();
  local.forEach((a) => mergedMap.set(a.id, a));
  remote.forEach((a) => mergedMap.set(a.id, a));

  const merged = Array.from(mergedMap.values());
  localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(merged));
  return merged;
}

export async function upsertAccount(account: Account): Promise<void> {
  const current = fetchAccountsFromLocal();
  const exists = current.some((a) => a.id === account.id);
  const updated = exists
    ? current.map((a) => (a.id === account.id ? account : a))
    : [...current, account];

  if (account.isDefault) {
    updated.forEach((a) => {
      if (a.id !== account.id) a.isDefault = false;
    });
  }

  localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(updated));

  try {
    const userId = await getUserId();
    await supabase.from('accounts').upsert({
      id: account.id,
      user_id: userId,
      nickname: account.nickname,
      owner_type: account.ownerType,
      financial_institution: account.financialInstitution || null,
      initial_balance: account.initialBalance,
      reference_date: account.referenceDate,
      is_default: account.isDefault,
      created_at: account.createdAt,
    }, { onConflict: 'id' });
  } catch {}
}

export async function upsertAccounts(accounts: Account[]): Promise<void> {
  localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));

  try {
    const userId = await getUserId();
    const rows = accounts.map((a) => ({
      id: a.id,
      user_id: userId,
      nickname: a.nickname,
      owner_type: a.ownerType,
      financial_institution: a.financialInstitution || null,
      initial_balance: a.initialBalance,
      reference_date: a.referenceDate,
      is_default: a.isDefault,
      created_at: a.createdAt,
    }));
    await supabase.from('accounts').upsert(rows, { onConflict: 'id' });
  } catch {}
}

export async function deleteAccount(id: string): Promise<void> {
  const current = fetchAccountsFromLocal();
  const updated = current.filter((a) => a.id !== id);
  if (updated.length > 0 && !updated.some((a) => a.isDefault)) {
    updated[0].isDefault = true;
  }
  localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(updated));

  try {
    await supabase.from('accounts').delete().eq('id', id);
  } catch {}
}

function fetchAccountsFromLocal(): Account[] {
  const saved = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }
  return [];
}

export async function fetchAccountTransfers(): Promise<AccountTransfer[]> {
  const local = fetchTransfersFromLocal();
  let remote: AccountTransfer[] = [];

  try {
    const { data, error } = await supabase
      .from('account_transfers')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      remote = data.map((row: any) => ({
        id: row.id,
        sourceAccountId: row.source_account_id,
        destinationAccountId: row.destination_account_id,
        amount: Number(row.amount),
        date: row.date,
        createdAt: row.created_at,
      }));
    }
  } catch {}

  const mergedMap = new Map<string, AccountTransfer>();
  local.forEach((t) => mergedMap.set(t.id, t));
  remote.forEach((t) => mergedMap.set(t.id, t));

  const merged = Array.from(mergedMap.values());
  localStorage.setItem(STORAGE_KEYS.TRANSFERS, JSON.stringify(merged));
  return merged;
}

export async function upsertAccountTransfer(transfer: AccountTransfer): Promise<void> {
  const current = fetchTransfersFromLocal();
  const updated = [transfer, ...current.filter((t) => t.id !== transfer.id)];
  localStorage.setItem(STORAGE_KEYS.TRANSFERS, JSON.stringify(updated));

  try {
    const userId = await getUserId();
    await supabase.from('account_transfers').upsert({
      id: transfer.id,
      user_id: userId,
      source_account_id: transfer.sourceAccountId,
      destination_account_id: transfer.destinationAccountId,
      amount: transfer.amount,
      date: transfer.date,
      created_at: transfer.createdAt,
    }, { onConflict: 'id' });
  } catch {}
}

function fetchTransfersFromLocal(): AccountTransfer[] {
  const saved = localStorage.getItem(STORAGE_KEYS.TRANSFERS);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }
  return [];
}
