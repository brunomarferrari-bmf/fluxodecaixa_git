/**
 * Supabase Database Service
 * Replaces localStorage-based storage with Supabase persistence.
 * All data is scoped to the authenticated user via Row Level Security.
 */
import { supabase } from './supabase';
import { Transaction, Tag, UserProfile, RecurrenceRule } from '../types';

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
