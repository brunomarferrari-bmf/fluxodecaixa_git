import React, { useState } from 'react';
import {
  Transaction,
  Tag,
  CATEGORIAS_ENTRADA,
  CATEGORIAS_SAIDA,
  FORMAS_PAGAMENTO,
  FilterState,
} from '../../types';
import { TagBadge } from '../TagBadge';
import {
  formatCurrency,
  formatDateBR,
} from '../../utils/formatters';
import { exportTransactionsToExcel } from '../../utils/excel';
import {
  Database,
  Search,
  Filter,
  RotateCcw,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  RefreshCw,
  Scale,
  TrendingUp,
  TrendingDown,
  Grid,
  CreditCard,
} from 'lucide-react';

interface SearchFilterViewProps {
  transactions: Transaction[];
  tags: Tag[];
  onEditTransaction: (tx: Transaction) => void;
}

export const SearchFilterView: React.FC<SearchFilterViewProps> = ({
  transactions,
  tags,
  onEditTransaction,
}) => {
  // Combine preset categories and custom registered tags into a unique category list
  const allCategoryNames = Array.from(
    new Set([
      ...tags.map((t) => t.name),
      ...CATEGORIAS_ENTRADA,
      ...CATEGORIAS_SAIDA,
    ])
  ).sort((a, b) => a.localeCompare(b));

  // Filters State
  const [filters, setFilters] = useState<FilterState>({
    category: '',
    tagCode: '',
    startDate: '',
    endDate: '',
    paymentMethod: '',
    type: 'todos',
    searchQuery: '',
  });

  const handleResetFilters = () => {
    setFilters({
      category: '',
      tagCode: '',
      startDate: '',
      endDate: '',
      paymentMethod: '',
      type: 'todos',
      searchQuery: '',
    });
  };

  // Filter logic
  const filteredTransactions = transactions.filter((tx) => {
    // 1. Text Search (title and description)
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase().trim();
      const matchTitle = tx.title.toLowerCase().includes(query);
      const matchDesc = (tx.description || '').toLowerCase().includes(query);
      if (!matchTitle && !matchDesc) return false;
    }

    // 2. Type filter
    if (filters.type !== 'todos') {
      if (tx.type !== filters.type) return false;
    }

    // 3. Category filter
    if (filters.category) {
      if (tx.category.toLowerCase() !== filters.category.toLowerCase()) return false;
    }

    // 4. Payment method filter
    if (filters.paymentMethod) {
      if (tx.paymentMethod !== filters.paymentMethod) return false;
    }

    // 5. Date Range filter
    if (filters.startDate) {
      if (tx.date < filters.startDate) return false;
    }
    if (filters.endDate) {
      if (tx.date > filters.endDate) return false;
    }

    return true;
  });

  // Filtered Lists & Totals
  const filteredEntriesList = filteredTransactions.filter((tx) => tx.type === 'entrada');
  const filteredExitsList = filteredTransactions.filter((tx) => tx.type === 'saida');

  const totalEntries = filteredEntriesList.reduce((sum, tx) => sum + tx.amount, 0);
  const totalExits = filteredExitsList.reduce((sum, tx) => sum + tx.amount, 0);
  const netFilteredBalance = totalEntries - totalExits;

  // Category breakdown for filtered exits
  const categoryExitsMap: Record<string, number> = {};
  filteredExitsList.forEach((tx) => {
    categoryExitsMap[tx.category] = (categoryExitsMap[tx.category] || 0) + tx.amount;
  });

  // Category breakdown for filtered entries
  const categoryEntriesMap: Record<string, number> = {};
  filteredEntriesList.forEach((tx) => {
    categoryEntriesMap[tx.category] = (categoryEntriesMap[tx.category] || 0) + tx.amount;
  });

  // Payment methods breakdown for filtered transactions
  const paymentMethodMap: Record<string, { entries: number; exits: number }> = {};
  filteredTransactions.forEach((tx) => {
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

  const handleExportExcel = () => {
    exportTransactionsToExcel(
      filteredTransactions,
      `TheParlor_Lançamentos_Filtrados_${new Date().toISOString().substring(0, 10)}.xlsx`
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white border border-gray-200 p-5 rounded-lg shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-[#C19848] text-[11px] font-semibold uppercase tracking-wider mb-1">
            <Database className="w-3.5 h-3.5 text-[#C19848]" />
            Consulta e Banco de Dados
          </div>
          <h2 className="text-lg font-bold text-gray-900">
            Banco de Dados
          </h2>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Pesquise por texto, período, tipo, categoria ou forma de pagamento.
          </p>
        </div>

        {/* Export Filtered Results Button */}
        <div>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2 rounded-md shadow-xs transition-all cursor-pointer"
            title="Exportar lançamentos filtrados em Excel"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Resultado ({filteredTransactions.length})</span>
          </button>
        </div>
      </div>

      {/* Filter Controls Panel */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[#C19848]" />
            Filtros de Busca
          </h3>
          <button
            onClick={handleResetFilters}
            className="text-[11px] font-semibold text-gray-500 hover:text-[#C19848] flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Limpar Filtros
          </button>
        </div>

        {/* Search Bar */}
        <div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome do lançamento ou texto da descrição..."
              value={filters.searchQuery}
              onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
              className="w-full bg-white border border-gray-300 rounded-md pl-9 pr-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C19848]/20 focus:border-[#C19848]"
            />
          </div>
        </div>

        {/* Multi-Select Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Tipo */}
          <div>
            <label className="block text-[10px] font-semibold uppercase text-gray-500 mb-1">
              Tipo
            </label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value as any })}
              className="w-full bg-white border border-gray-300 rounded-md px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#C19848]/20 focus:border-[#C19848] font-medium"
            >
              <option value="todos">Todos os tipos</option>
              <option value="entrada">Apenas Entradas</option>
              <option value="saida">Apenas Saídas</option>
            </select>
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-[10px] font-semibold uppercase text-gray-500 mb-1">
              Categoria
            </label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="w-full bg-white border border-gray-300 rounded-md px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#C19848]/20 focus:border-[#C19848] font-medium"
            >
              <option value="">Todas as Categorias</option>
              {allCategoryNames.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Forma de Pagamento */}
          <div>
            <label className="block text-[10px] font-semibold uppercase text-gray-500 mb-1">
              Forma de Pagamento
            </label>
            <select
              value={filters.paymentMethod}
              onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
              className="w-full bg-white border border-gray-300 rounded-md px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#C19848]/20 focus:border-[#C19848]"
            >
              <option value="">Todas as Formas</option>
              {FORMAS_PAGAMENTO.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Período (Data Início / Fim) */}
          <div className="space-y-1">
            <label className="block text-[10px] font-semibold uppercase text-gray-500">
              Período de Data
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                title="Data Inicial"
                className="bg-white border border-gray-300 rounded-md px-2 py-1 text-[11px] text-gray-800"
              />
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                title="Data Final"
                className="bg-white border border-gray-300 rounded-md px-2 py-1 text-[11px] text-gray-800"
              />
            </div>
          </div>

        </div>
      </div>

      {/* Main KPI Cards (Matching Dashboard style for Filtered Results) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Resultado dos Filtros */}
        <div className="p-5 rounded-lg bg-white border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Resultado dos Filtros
            </span>
            <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
              netFilteredBalance >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
            }`}>
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-2xl sm:text-3xl font-bold font-mono mt-2 ${
            netFilteredBalance >= 0 ? 'text-emerald-600' : 'text-red-600'
          }`}>
            {formatCurrency(netFilteredBalance)}
          </p>
          <p className="text-[11px] text-gray-500 mt-1.5 font-medium">
            {filteredTransactions.length} item(s) selecionado(s) pelos filtros
          </p>
        </div>

        {/* Total Entradas Filtradas */}
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
            +{formatCurrency(totalEntries)}
          </p>
          <p className="text-[11px] text-gray-500 mt-1.5 font-medium">
            {filteredEntriesList.length} recebimento(s)
          </p>
        </div>

        {/* Total Saídas Filtradas */}
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
            -{formatCurrency(totalExits)}
          </p>
          <p className="text-[11px] text-gray-500 mt-1.5 font-medium">
            {filteredExitsList.length} pagamento(s)
          </p>
        </div>

      </div>

      {/* Breakdowns Section (Category Exits & Entries) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Category Breakdown (Despesas / Saídas Filtradas) */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-red-600 font-bold text-xs uppercase tracking-wider">
            <Grid className="w-4 h-4" />
            <span>Detalhamento de Saídas por Categoria</span>
          </div>

          {Object.keys(categoryExitsMap).length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center font-medium">Sem saídas nos filtros selecionados.</p>
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

        {/* Category Breakdown (Receitas / Entradas Filtradas) */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
            <Grid className="w-4 h-4" />
            <span>Detalhamento de Entradas por Categoria</span>
          </div>

          {Object.keys(categoryEntriesMap).length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center font-medium">Sem entradas nos filtros selecionados.</p>
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

        {Object.keys(paymentMethodMap).length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center font-medium">Sem movimentação nos filtros selecionados.</p>
        ) : (
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
        )}
      </div>

      {/* Results List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-xs">
        <div className="p-3.5 border-b border-gray-200 bg-gray-50/50 font-bold text-xs text-gray-700 uppercase tracking-wider">
          Resultados Encontrados ({filteredTransactions.length})
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-xs font-medium">
            Nenhum lançamento encontrado para os filtros selecionados.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredTransactions.map((tx) => (
              <div
                key={tx.id}
                onClick={() => onEditTransaction(tx)}
                className="p-3.5 hover:bg-gray-50 transition-all cursor-pointer flex items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-md shrink-0 flex items-center justify-center font-bold ${
                    tx.type === 'entrada'
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      : 'bg-red-50 text-red-600 border border-red-100'
                  }`}>
                    {tx.type === 'entrada' ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-gray-500 font-semibold shrink-0">
                        {formatDateBR(tx.date)}
                      </span>
                      {tx.recurrenceRuleId && !tx.recurrenceModified && (
                        <RefreshCw className="w-3 h-3 text-purple-500 shrink-0" title="Gerado por recorrência" />
                      )}
                      <p className="text-xs font-semibold text-gray-900 group-hover:text-[#C19848] transition-colors truncate">
                        {tx.title}
                      </p>
                      {tx.tagCode && <TagBadge tagCode={tx.tagCode} tags={tags} />}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                      <span>{tx.category}</span>
                      <span>•</span>
                      <span>{tx.paymentMethod}</span>
                      {tx.description && (
                        <>
                          <span>•</span>
                          <span className="italic text-gray-400 truncate max-w-sm">{tx.description}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className={`text-sm sm:text-base font-bold font-mono ${
                    tx.type === 'entrada' ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {tx.type === 'entrada' ? '+' : '-'} {formatCurrency(tx.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
