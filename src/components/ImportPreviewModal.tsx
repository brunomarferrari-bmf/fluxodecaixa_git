import React, { useState, useEffect } from 'react';
import { ImportValidationResult, Tag, CATEGORIAS_ENTRADA, CATEGORIAS_SAIDA, FORMAS_PAGAMENTO, TransactionType } from '../types';
import { formatCurrency, formatDateBR } from '../utils/formatters';
import { CheckCircle2, AlertTriangle, FileSpreadsheet, X, Trash2, Edit3, Check, ArrowRight } from 'lucide-react';

interface ImportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  validationResult: ImportValidationResult | null;
  onConfirmImport: (validRows: ImportValidationResult['validRows']) => void;
  tags?: Tag[];
}

interface LocalValidRow {
  id: string;
  date: string;
  type: TransactionType;
  title: string;
  amount: number;
  category: string;
  tagCode: string;
  paymentMethod: string;
  description: string;
}

interface LocalErrorRow {
  id: string;
  rowIndex: number;
  reason: string;
  data: any;
}

export const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({
  isOpen,
  onClose,
  validationResult,
  onConfirmImport,
  tags = [],
}) => {
  const [validRows, setValidRows] = useState<LocalValidRow[]>([]);
  const [errorRows, setErrorRows] = useState<LocalErrorRow[]>([]);
  const [editingErrorId, setEditingErrorId] = useState<string | null>(null);

  // Form state for inline editing of error lines
  const [editForm, setEditForm] = useState<{
    date: string;
    type: TransactionType;
    title: string;
    amount: string;
    category: string;
    paymentMethod: string;
    description: string;
  }>({
    date: '',
    type: 'saida',
    title: '',
    amount: '',
    category: '',
    paymentMethod: 'PIX',
    description: '',
  });

  const [editFormError, setEditFormError] = useState<string>('');

  // All registered categories in the system
  const allCategories = Array.from(
    new Set([
      ...CATEGORIAS_ENTRADA,
      ...CATEGORIAS_SAIDA,
      ...tags.map((t) => t.name),
    ])
  );

  useEffect(() => {
    if (validationResult) {
      setValidRows(
        validationResult.validRows.map((r, i) => ({
          ...r,
          id: `valid-${i}-${Date.now()}`,
        }))
      );
      setErrorRows(
        validationResult.errors.map((e, i) => ({
          ...e,
          id: `error-${i}-${Date.now()}`,
        }))
      );
      setEditingErrorId(null);
    }
  }, [validationResult, isOpen]);

  if (!isOpen || !validationResult) return null;

  // Pre-fill correction form from raw data
  const startEditingErrorRow = (errRow: LocalErrorRow) => {
    setEditingErrorId(errRow.id);
    setEditFormError('');

    const raw = errRow.data;
    let date = new Date().toISOString().split('T')[0];
    let type: TransactionType = 'saida';
    let title = 'Lançamento';
    let amount = '';
    let category = '';
    let paymentMethod = 'PIX';
    let description = '';

    if (Array.isArray(raw)) {
      const rawDate = raw[0] ? String(raw[0]).trim() : '';
      const rawType = raw[1] ? String(raw[1]).trim() : '';
      const rawTitle = raw[2] ? String(raw[2]).trim() : '';
      const rawAmount = raw[3] !== undefined && raw[3] !== null ? String(raw[3]).trim() : '';
      const rawCat = raw[4] ? String(raw[4]).trim() : '';
      const rawPay = raw[5] ? String(raw[5]).trim() : (raw[6] ? String(raw[6]).trim() : '');
      const rawDesc = raw[6] ? String(raw[6]).trim() : (raw[7] ? String(raw[7]).trim() : '');

      if (rawDate.includes('/')) {
        const parts = rawDate.split('/');
        if (parts.length === 3) {
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          let year = parts[2];
          if (year.length === 2) year = '20' + year;
          date = `${year}-${month}-${day}`;
        }
      } else if (rawDate.includes('-')) {
        date = rawDate;
      }

      if (rawType.toLowerCase().includes('entrada')) {
        type = 'entrada';
      }

      if (rawTitle) title = rawTitle;

      const cleaned = rawAmount.replace('R$', '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
      const parsedAmt = parseFloat(cleaned);
      if (!isNaN(parsedAmt) && parsedAmt > 0) {
        amount = String(parsedAmt);
      }

      if (rawCat) {
        const match = allCategories.find((c) => c.toLowerCase() === rawCat.toLowerCase());
        category = match || rawCat;
      }

      if (rawPay) {
        const payMatch = FORMAS_PAGAMENTO.find((p) => p.toLowerCase() === rawPay.toLowerCase());
        paymentMethod = payMatch || rawPay;
      }

      if (rawDesc) description = rawDesc;
    }

    if (!category && allCategories.length > 0) {
      category = type === 'entrada' ? CATEGORIAS_ENTRADA[0] : CATEGORIAS_SAIDA[0];
    }

    setEditForm({
      date,
      type,
      title,
      amount,
      category,
      paymentMethod,
      description,
    });
  };

  const handleSaveCorrection = (errRow: LocalErrorRow) => {
    setEditFormError('');

    if (!editForm.date) {
      setEditFormError('A data é obrigatória.');
      return;
    }
    if (!editForm.title.trim()) {
      setEditFormError('O nome do lançamento é obrigatório.');
      return;
    }
    const numAmount = parseFloat(editForm.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setEditFormError('Informe um valor numérico positivo.');
      return;
    }
    if (!editForm.category) {
      setEditFormError('Selecione uma categoria.');
      return;
    }

    const isCatValid = allCategories.some(
      (c) => c.toLowerCase() === editForm.category.toLowerCase()
    );

    if (!isCatValid) {
      setEditFormError(`A categoria "${editForm.category}" precisa ser selecionada da lista cadastrada.`);
      return;
    }

    const newValid: LocalValidRow = {
      id: `corrected-${Date.now()}`,
      date: editForm.date,
      type: editForm.type,
      title: editForm.title.trim(),
      amount: numAmount,
      category: editForm.category,
      tagCode: '',
      paymentMethod: editForm.paymentMethod || 'PIX',
      description: editForm.description.trim(),
    };

    setValidRows((prev) => [...prev, newValid]);
    setErrorRows((prev) => prev.filter((e) => e.id !== errRow.id));
    setEditingErrorId(null);
  };

  const handleDeleteErrorRow = (id: string) => {
    setErrorRows((prev) => prev.filter((e) => e.id !== id));
    if (editingErrorId === id) setEditingErrorId(null);
  };

  const handleDeleteValidRow = (id: string) => {
    setValidRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleConfirm = () => {
    onConfirmImport(validRows);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden text-gray-900">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-[#E4D8BE]/20 border border-[#C19848]/20 text-[#C19848] flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Conferência de Importação Excel</h2>
              <p className="text-xs text-gray-500 font-medium">
                Revise, corrija ou exclua lançamentos antes de confirmar a inclusão no fluxo de caixa
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          
          {/* Summary status cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-3">
              <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
              <div>
                <p className="text-[10px] uppercase font-bold text-emerald-800">Lançamentos Válidos</p>
                <p className="text-xl font-bold font-mono text-gray-900">{validRows.length}</p>
                <p className="text-[10px] text-gray-500 font-medium">Prontos para serem importados</p>
              </div>
            </div>

            <div className={`p-3.5 rounded-lg flex items-center gap-3 ${
              errorRows.length > 0 
                ? 'bg-red-50 border border-red-200' 
                : 'bg-gray-50 border border-gray-200'
            }`}>
              <AlertTriangle className={`w-7 h-7 shrink-0 ${errorRows.length > 0 ? 'text-red-600' : 'text-gray-400'}`} />
              <div>
                <p className={`text-[10px] uppercase font-bold ${errorRows.length > 0 ? 'text-red-800' : 'text-gray-500'}`}>
                  Linhas Rejeitadas
                </p>
                <p className="text-xl font-bold font-mono text-gray-900">{errorRows.length}</p>
                <p className="text-[10px] text-gray-500 font-medium">
                  {errorRows.length > 0 ? 'Adeque ou exclua cada linha abaixo' : 'Nenhuma inconsistência pendente'}
                </p>
              </div>
            </div>
          </div>

          {/* List of errors with Adequar/Excluir controls */}
          {errorRows.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-red-600 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Alertas e Inconsistências Encontradas ({errorRows.length})
              </h3>
              
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {errorRows.map((err) => {
                  const isEditing = editingErrorId === err.id;

                  return (
                    <div
                      key={err.id}
                      className="bg-red-50/60 border border-red-200 rounded-md p-3 space-y-2.5 transition-all text-xs"
                    >
                      {/* Top bar of error item */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-start gap-2 text-red-800">
                          <span className="font-mono bg-red-100 border border-red-200 px-1.5 py-0.5 rounded text-[10px] font-bold text-red-800 shrink-0">
                            Linha {err.rowIndex}
                          </span>
                          <span className="leading-relaxed font-medium">{err.reason}</span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => (isEditing ? setEditingErrorId(null) : startEditingErrorRow(err))}
                            className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md bg-white border border-red-300 text-red-800 hover:bg-red-100 transition-colors shadow-2xs cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3 text-red-700" />
                            <span>{isEditing ? 'Fechar' : 'Adequar / Corrigir'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteErrorRow(err.id)}
                            title="Excluir linha com erro"
                            className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-md bg-white border border-red-200 text-red-600 hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Excluir Linha</span>
                          </button>
                        </div>
                      </div>

                      {/* Inline Form to Edit & Correct Error Line */}
                      {isEditing && (
                        <div className="mt-2 bg-white border border-emerald-300 rounded-md p-3.5 space-y-3 shadow-xs animate-fade-in text-gray-800">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 border-b border-gray-100 pb-2">
                            <Check className="w-4 h-4 text-emerald-600" />
                            <span>Corrigir Dados da Linha {err.rowIndex}</span>
                          </div>

                          {editFormError && (
                            <div className="p-2 bg-red-100 border border-red-300 rounded text-red-800 text-[11px] font-semibold">
                              {editFormError}
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                            
                            {/* Data */}
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                                Data
                              </label>
                              <input
                                type="date"
                                value={editForm.date}
                                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                                className="w-full p-1.5 border border-gray-300 rounded focus:border-emerald-600 focus:outline-none bg-white font-mono"
                              />
                            </div>

                            {/* Tipo */}
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                                Tipo
                              </label>
                              <select
                                value={editForm.type}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, type: e.target.value as TransactionType })
                                }
                                className="w-full p-1.5 border border-gray-300 rounded focus:border-emerald-600 focus:outline-none bg-white font-semibold"
                              >
                                <option value="entrada">Entrada</option>
                                <option value="saida">Saída</option>
                              </select>
                            </div>

                            {/* Nome / Título */}
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                                Lançamento (Nome)
                              </label>
                              <input
                                type="text"
                                value={editForm.title}
                                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                className="w-full p-1.5 border border-gray-300 rounded focus:border-emerald-600 focus:outline-none bg-white"
                                placeholder="Nome do lançamento"
                              />
                            </div>

                            {/* Valor */}
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                                Valor (R$)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={editForm.amount}
                                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                                className="w-full p-1.5 border border-gray-300 rounded focus:border-emerald-600 focus:outline-none bg-white font-mono"
                                placeholder="0.00"
                              />
                            </div>

                            {/* Categoria Dropdown */}
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                                Categoria Cadastrada
                              </label>
                              <select
                                value={editForm.category}
                                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                                className="w-full p-1.5 border border-emerald-400 bg-emerald-50/40 rounded focus:border-emerald-600 focus:outline-none font-semibold text-emerald-950"
                              >
                                <option value="">-- Selecione uma Categoria --</option>
                                <optgroup label="Categorias de Saída">
                                  {CATEGORIAS_SAIDA.map((cat) => (
                                    <option key={cat} value={cat}>
                                      {cat}
                                    </option>
                                  ))}
                                </optgroup>
                                <optgroup label="Categorias de Entrada">
                                  {CATEGORIAS_ENTRADA.map((cat) => (
                                    <option key={cat} value={cat}>
                                      {cat}
                                    </option>
                                  ))}
                                </optgroup>
                                {tags.length > 0 && (
                                  <optgroup label="Outras Categorias / Tags">
                                    {tags.map((t) => (
                                      <option key={t.id} value={t.name}>
                                        {t.name}
                                      </option>
                                    ))}
                                  </optgroup>
                                )}
                              </select>
                            </div>

                            {/* Pagamento */}
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                                Forma de Pagamento
                              </label>
                              <select
                                value={editForm.paymentMethod}
                                onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })}
                                className="w-full p-1.5 border border-gray-300 rounded focus:border-emerald-600 focus:outline-none bg-white"
                              >
                                {FORMAS_PAGAMENTO.map((p) => (
                                  <option key={p} value={p}>
                                    {p}
                                  </option>
                                ))}
                                <option value="Outros">Outros</option>
                              </select>
                            </div>

                          </div>

                          <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
                            <button
                              type="button"
                              onClick={() => setEditingErrorId(null)}
                              className="px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 text-xs font-semibold"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveCorrection(err)}
                              className="px-3.5 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Salvar &amp; Mover para Válidos</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Table Preview of Valid Rows */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
              Prévia dos Lançamentos Válidos ({validRows.length})
            </h3>
            {validRows.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 border border-gray-200 rounded-md text-gray-400 text-xs font-medium">
                Nenhum lançamento válido encontrado para importação.
              </div>
            ) : (
              <div className="border border-gray-200 rounded-md overflow-hidden bg-white">
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[10px] font-semibold sticky top-0">
                      <tr>
                        <th className="p-2.5">Data</th>
                        <th className="p-2.5">Tipo</th>
                        <th className="p-2.5">Lançamento</th>
                        <th className="p-2.5">Categoria</th>
                        <th className="p-2.5">Pagamento</th>
                        <th className="p-2.5 text-right">Valor</th>
                        <th className="p-2.5 text-center w-10">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-800">
                      {validRows.map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50">
                          <td className="p-2.5 font-mono">{formatDateBR(row.date)}</td>
                          <td className="p-2.5 font-semibold">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              row.type === 'entrada' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              {row.type === 'entrada' ? 'Entrada' : 'Saída'}
                            </span>
                          </td>
                          <td className="p-2.5 font-semibold text-gray-900">{row.title}</td>
                          <td className="p-2.5 text-gray-500">{row.category}</td>
                          <td className="p-2.5 font-medium text-gray-700">{row.paymentMethod || '-'}</td>
                          <td className="p-2.5 text-right font-bold font-mono">
                            {formatCurrency(row.amount)}
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteValidRow(row.id)}
                              title="Remover este lançamento da importação"
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-200 bg-gray-50/50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold transition-all cursor-pointer"
          >
            Cancelar Importação
          </button>

          <button
            onClick={handleConfirm}
            disabled={validRows.length === 0}
            className={`px-4 py-2 rounded-md text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 ${
              validRows.length > 0
                ? 'bg-[#203723] hover:bg-[#203723]/90 text-white cursor-pointer font-bold'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <span>Confirmar e Importar {validRows.length} Lançamento(s)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
