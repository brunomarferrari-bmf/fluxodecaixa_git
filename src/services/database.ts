/**
 * Supabase Database Service
 * Replaces localStorage-based storage with Supabase persistence.
 * All data is scoped to the authenticated user via Row Level Security.
 */
import { supabase } from './supabase';
import { Transaction, Tag, UserProfile, RecurrenceRule, Account, AccountTransfer } from '../types';

// ─────────────────────────────────────────────
// HELPER: get current user id (throws if not authed)
// ─────────────────────────────────────────────
async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  return user.id;
}

// ─────────────────────────────────────────────
// TRANSACTIONS
// ─────────────────────────────────────────────
export async function fetchTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }

  return (data || []).map(dbRowToTransaction);
}

export async function upsertTransaction(tx: Transaction): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase
    .from('transactions')
    .upsert(transactionToDbRow(tx, userId), { onConflict: 'id' });

  if (error) console.error('Error upserting transaction:', error);
}

export async function upsertTransactions(txs: Transaction[]): Promise<void> {
  if (txs.length === 0) return;
  const userId = await getUserId();
  const rows = txs.map(tx => transactionToDbRow(tx, userId));

  const BATCH = 100;
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await supabase
      .from('transactions')
      .upsert(rows.slice(i, i + BATCH), { onConflict: 'id' });
    if (error) console.error('Error batch upserting transactions:', error);
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);

  if (error) console.error('Error deleting transaction:', error);
}

export async function deleteTransactions(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase
    .from('transactions')
    .delete()
    .in('id', ids);

  if (error) console.error('Error deleting transactions:', error);
}

// Row converters
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
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching tags:', error);
    return [];
  }

  return (data || []).map(dbRowToTag);
}

export async function upsertTag(tag: Tag): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase
    .from('tags')
    .upsert(tagToDbRow(tag, userId), { onConflict: 'id' });

  if (error) console.error('Error upserting tag:', error);
}

export async function upsertTags(tags: Tag[]): Promise<void> {
  if (tags.length === 0) return;
  const userId = await getUserId();
  const rows = tags.map(t => tagToDbRow(t, userId));
  const { error } = await supabase
    .from('tags')
    .upsert(rows, { onConflict: 'id' });

  if (error) console.error('Error batch upserting tags:', error);
}

export async function deleteTag(id: string): Promise<void> {
  const { error } = await supabase
    .from('tags')
    .delete()
    .eq('id', id);

  if (error) console.error('Error deleting tag:', error);
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
  const { data, error } = await supabase
    .from('recurrence_rules')
    .select('*')
    .order('created_at');

  if (error) {
    console.error('Error fetching recurrence rules:', error);
    return [];
  }

  return (data || []).map(dbRowToRule);
}

export async function upsertRecurrenceRule(rule: RecurrenceRule): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase
    .from('recurrence_rules')
    .upsert(ruleToDbRow(rule, userId), { onConflict: 'id' });

  if (error) console.error('Error upserting recurrence rule:', error);
}

export async function upsertRecurrenceRules(rules: RecurrenceRule[]): Promise<void> {
  if (rules.length === 0) return;
  const userId = await getUserId();
  const rows = rules.map(r => ruleToDbRow(r, userId));
  const { error } = await supabase
    .from('recurrence_rules')
    .upsert(rows, { onConflict: 'id' });

  if (error) console.error('Error batch upserting recurrence rules:', error);
}

export async function deleteRecurrenceRule(id: string): Promise<void> {
  const { error } = await supabase
    .from('recurrence_rules')
    .delete()
    .eq('id', id);

  if (error) console.error('Error deleting recurrence rule:', error);
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  if (!data) return null;

  return {
    name: (data.name as string) || user.user_metadata?.full_name || user.email || '',
    email: (data.email as string) || user.email || '',
    avatarUrl: (data.avatar_url as string) || user.user_metadata?.avatar_url || '',
    role: (data.role as string) || '',
    accessLevel: (data.access_level as string) || 'Administrador',
  };
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('user_profiles')
    .upsert({
      id: user.id,
      name: profile.name,
      email: profile.email,
      avatar_url: profile.avatarUrl || '',
      role: profile.role || '',
      access_level: profile.accessLevel || '',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  if (error) console.error('Error saving user profile:', error);
}

// ─────────────────────────────────────────────
// ACCOUNTS & TRANSFERS (with LocalStorage fallback)
// ─────────────────────────────────────────────
const LOCAL_STORAGE_ACCOUNTS = 'theparlor_accounts_v1';
const LOCAL_STORAGE_TRANSFERS = 'theparlor_account_transfers_v1';

export async function fetchAccounts(): Promise<Account[]> {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && data) {
      return data.map((row: any) => ({
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
    console.warn('Supabase accounts table not available, using localStorage fallback');
  }

  // Fallback to localStorage
  const saved = localStorage.getItem(LOCAL_STORAGE_ACCOUNTS);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }
  return [];
}

export async function upsertAccount(account: Account): Promise<void> {
  // Update local storage first
  const current = await fetchAccounts();
  const exists = current.some(a => a.id === account.id);
  const updated = exists
    ? current.map(a => (a.id === account.id ? account : a))
    : [...current, account];

  // Enforce single default account rule
  if (account.isDefault) {
    updated.forEach(a => {
      if (a.id !== account.id) a.isDefault = false;
    });
  }

  localStorage.setItem(LOCAL_STORAGE_ACCOUNTS, JSON.stringify(updated));

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
  } catch {
    // Ignore error if table is not created yet
  }
}

export async function upsertAccounts(accounts: Account[]): Promise<void> {
  localStorage.setItem(LOCAL_STORAGE_ACCOUNTS, JSON.stringify(accounts));

  try {
    const userId = await getUserId();
    const rows = accounts.map(a => ({
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
  } catch {
    // Ignore error if table not created
  }
}

export async function deleteAccount(id: string): Promise<void> {
  const current = await fetchAccounts();
  const updated = current.filter(a => a.id !== id);
  localStorage.setItem(LOCAL_STORAGE_ACCOUNTS, JSON.stringify(updated));

  try {
    await supabase.from('accounts').delete().eq('id', id);
  } catch {
    // Ignore
  }
}

export async function fetchAccountTransfers(): Promise<AccountTransfer[]> {
  try {
    const { data, error } = await supabase
      .from('account_transfers')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data.map((row: any) => ({
        id: row.id,
        sourceAccountId: row.source_account_id,
        destinationAccountId: row.destination_account_id,
        amount: Number(row.amount),
        date: row.date,
        createdAt: row.created_at,
      }));
    }
  } catch {
    // Fallback
  }

  const saved = localStorage.getItem(LOCAL_STORAGE_TRANSFERS);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }
  return [];
}

export async function upsertAccountTransfer(transfer: AccountTransfer): Promise<void> {
  const current = await fetchAccountTransfers();
  const updated = [transfer, ...current.filter(t => t.id !== transfer.id)];
  localStorage.setItem(LOCAL_STORAGE_TRANSFERS, JSON.stringify(updated));

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
  } catch {
    // Ignore
  }
}

