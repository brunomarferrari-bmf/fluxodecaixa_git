/**
 * Formata um valor numérico para a moeda corrente brasileira (BRL).
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Converte data ISO YYYY-MM-DD para o formato exibido DD/MM/AAAA.
 */
export function formatDateBR(dateString: string): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  if (!year || !month || !day) return dateString;
  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
}

/**
 * Retorna o nome por extenso do mês e ano (ex: "Julho de 2026").
 */
export function formatMonthYear(year: number, monthZeroBased: number): string {
  const date = new Date(year, monthZeroBased, 1);
  const monthName = date.toLocaleDateString('pt-BR', { month: 'long' });
  const capitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  return `${capitalized} de ${year}`;
}

/**
 * Retorna o nome do dia da semana (ex: "Segunda-feira").
 */
export function formatDayOfWeek(dateString: string): string {
  if (!dateString) return '';
  const [y, m, d] = dateString.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dayName = date.toLocaleDateString('pt-BR', { weekday: 'long' });
  return dayName.charAt(0).toUpperCase() + dayName.slice(1);
}

/**
 * Obtém a data de hoje no formato YYYY-MM-DD local.
 */
export function getTodayISO(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calcula os 7 dias da semana contendo a data informada (começando no Domingo ou Segunda).
 * Por padrão no Brasil, a semana no calendário financeiro pode iniciar na Segunda-feira.
 */
export function getWeekDays(referenceDateIso: string): string[] {
  const [y, m, d] = referenceDateIso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  
  // Pegar a segunda-feira da semana
  const dayOfWeek = date.getDay(); // 0 = Domingo, 1 = Segunda, ...
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);

  const weekDays: string[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    const yr = day.getFullYear();
    const mo = String(day.getMonth() + 1).padStart(2, '0');
    const dy = String(day.getDate()).padStart(2, '0');
    weekDays.push(`${yr}-${mo}-${dy}`);
  }

  return weekDays;
}

/**
 * Gera ID único para transações e tags.
 */
export function generateUniqueId(): string {
  return 'id_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
}
