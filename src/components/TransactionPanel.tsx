import React, { useState, useEffect } from 'react';
import {
  X,
  PlusCircle,
  Check,
  Trash2,
  FolderTree,
  DollarSign,
  Calendar,
  FileText,
  CreditCard,
  AlignLeft,
  RefreshCw,
} from 'lucide-react';
import {
  Transaction,
  TransactionType,
  FORMAS_PAGAMENTO,
  Tag,
} from '../types';
import { TagBadge } from './TagBadge';
import { getTodayISO, generateUniqueId } from '../utils/formatters';

interface TransactionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Omit<Transaction, 'id' | 'createdAt'> & { id?: string }, editScope?: 'single' | 'future') => void;
  onDelete?: (id: string, deleteScope?: 'single' | 'future') => void;
  transactionToEdit: Transaction | null;
  defaultDate?: string;
  tags: Tag[];
  onAddNewTag: (newCategory: Tag) => void;
}

export const TransactionPanel: React.FC<TransactionPanelProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  transactionToEdit,
  defaultDate,
  tags,
  onAddNewTag,
}) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(getTodayISO());
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('saida');
  const [category, setCategory] = useState<string>('Aluguel');
  const [tagCode, setTagCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>(FORMAS_PAGAMENTO[0]);
  const [description, setDescription] = useState('');
  const [editScope, setEditScope] = useState<'single' | 'future'>('single');
  const [confirmAction, setConfirmAction] = useState<'save' | 'delete' | null>(null);

  // States for inline new category creation
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#C19848');
  const [newCatObservation, setNewCatObservation] = useState('');
  const [catError, setCatError] = useState('');

  useEffect(() => {
    if (transactionToEdit) {
      setTitle(transactionToEdit.title);
      setDate(transactionToEdit.date);
      setAmount(String(transactionToEdit.amount));
      setType(transactionToEdit.type);
      setCategory(transactionToEdit.category || transactionToEdit.tagCode || (tags[0]?.name || 'Aluguel'));
      setTagCode(transactionToEdit.tagCode || transactionToEdit.category || '');
      setPaymentMethod(transactionToEdit.paymentMethod || FORMAS_PAGAMENTO[0]);
      setDescription(transactionToEdit.description || '');
    } else {
      // Reset for new transaction
      setTitle('');
      setDate(defaultDate || getTodayISO());
      setAmount('');
      setType('saida');
      const defaultCatName = tags.length > 0 ? tags[0].name : 'Aluguel';
      setCategory(defaultCatName);
      setTagCode(defaultCatName);
      setPaymentMethod(FORMAS_PAGAMENTO[0]);
      setDescription('');
    }
    setIsCreatingCategory(false);
    setNewCatName('');
    setNewCatColor('#C19848');
    setNewCatObservation('');
    setCatError('');
  }, [transactionToEdit, defaultDate, isOpen, tags]);

  const handleCreateInlineCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setCatError('');
    const name = newCatName.trim();

    if (!name) {
      setCatError('Informe o nome da categoria.');
      return;
    }

    if (tags.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      setCatError(`A categoria "${name}" já existe.`);
      return;
    }

    const createdCategory: Tag = {
      id: generateUniqueId(),
      name,
      color: newCatColor,
      observation: newCatObservation.trim(),
      code: name.substring(0, 10).toUpperCase(),
    };

    onAddNewTag(createdCategory);
    setCategory(name);
    setTagCode(name);
    setIsCreatingCategory(false);
    setNewCatName('');
    setNewCatObservation('');
  };

  const handleFinalSave = () => {
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (!title.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      return;
    }
    const selectedCat = category || (tags[0]?.name || 'Geral');
    onSave({
      id: transactionToEdit ? transactionToEdit.id : undefined,
      title: title.trim(),
      date,
      amount: parsedAmount,
      type,
      category: selectedCat,
      tagCode: tagCode || selectedCat,
      paymentMethod,
      description: description.trim(),
    }, editScope);
    onClose();
  };

  const handleFinalDelete = () => {
    if (transactionToEdit && onDelete) {
      onDelete(transactionToEdit.id, transactionToEdit.recurrenceRuleId ? editScope : undefined);
      onClose();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (transactionToEdit?.recurrenceRuleId) {
      setConfirmAction('save');
      return;
    }
    handleFinalSave();
  };

  if (!isOpen) return null;

  const selectedCatObj = tags.find(
    (t) =>
      t.name.toLowerCase() === category.toLowerCase() ||
      (t.code && t.code.toLowerCase() === category.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end transition-opacity duration-300">
      
      {/* Click outside to cancel */}
      <div className="flex-1 cursor-pointer" onClick={onClose} />

      {/* Slide-over panel container */}
      <div className="w-full max-w-lg bg-white border-l border-gray-200 h-full flex flex-col shadow-2xl relative text-gray-900 z-10 animate-slide-left">
        
        {/* Panel Header */}
        <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {transactionToEdit ? 'Editar Lançamento' : 'Novo Lançamento'}
            </h2>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              TheParlor — Gestão de Fluxo de Caixa
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {confirmAction ? (
            <div className="flex-1 flex flex-col h-full">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-5 mb-6">
                <label className="block text-sm font-bold text-purple-900 mb-2 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Lançamento Recorrente
                </label>
                <p className="text-xs text-purple-700 font-medium mb-4">
                  Este lançamento foi gerado automaticamente por uma regra. Defina o escopo da ação antes de {confirmAction === 'save' ? 'salvar' : 'excluir'}:
                </p>
                
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer group bg-white p-3 rounded-md border border-purple-100 hover:border-purple-300 transition-colors">
                    <input 
                      type="radio" 
                      name="editScope" 
                      value="single" 
                      checked={editScope === 'single'}
                      onChange={() => setEditScope('single')}
                      className="mt-0.5 w-4 h-4 text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <span className="block text-sm font-bold text-gray-900 group-hover:text-purple-700">Somente esta ocorrência</span>
                      <span className="block text-xs text-gray-500 font-medium">{confirmAction === 'save' ? 'Altera' : 'Exclui'} apenas este dia. A regra original permanece gerando as demais ocorrências.</span>
                    </div>
                  </label>
                  
                  <label className="flex items-start gap-3 cursor-pointer group bg-white p-3 rounded-md border border-purple-100 hover:border-purple-300 transition-colors">
                    <input 
                      type="radio" 
                      name="editScope" 
                      value="future" 
                      checked={editScope === 'future'}
                      onChange={() => setEditScope('future')}
                      className="mt-0.5 w-4 h-4 text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <span className="block text-sm font-bold text-gray-900 group-hover:text-purple-700">Esta e as futuras</span>
                      <span className="block text-xs text-gray-500 font-medium">{confirmAction === 'save' ? 'Atualiza' : 'Encerra'} a regra a partir de hoje. Ocorrências passadas são mantidas no histórico.</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Confirmation Actions */}
              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-3 mt-auto">
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  className="px-4 py-2 rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-semibold transition-all cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={confirmAction === 'save' ? handleFinalSave : handleFinalDelete}
                  className={`px-6 py-2 rounded-md text-white text-sm font-bold shadow-xs transition-all cursor-pointer ${
                    confirmAction === 'save' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  Confirmar {confirmAction === 'save' ? 'Salvar' : 'Excluir'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Tipo: Entrada ou Saída */}
              <div>
            <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              Tipo do Lançamento
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-md border border-gray-200">
              <button
                type="button"
                onClick={() => setType('saida')}
                className={`py-2 rounded text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  type === 'saida'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-white shrink-0" />
                Saída (Despesa)
              </button>
              <button
                type="button"
                onClick={() => setType('entrada')}
                className={`py-2 rounded text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  type === 'entrada'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-white shrink-0" />
                Entrada (Receita)
              </button>
            </div>
          </div>

          {/* Nome do Lançamento */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1">
              Nome do Lançamento *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Aluguel do Mês, Fornecedor de Bebidas, Caixas Diários, Folha Salário"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C19848]/20 focus:border-[#C19848] font-medium"
            />
          </div>

          {/* Data e Valor em Grid 2 Colunas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1">
                Data *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-md pl-9 pr-2.5 py-2 text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C19848]/20 focus:border-[#C19848] font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1">
                Valor (R$) *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-md pl-9 pr-2.5 py-2 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C19848]/20 focus:border-[#C19848]"
                />
              </div>
            </div>
          </div>

          {/* Categoria com Seleção e Criação Rápida */}
          <div className="p-3.5 rounded-md bg-gray-50 border border-gray-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <FolderTree className="w-3.5 h-3.5 text-[#C19848]" />
                Categoria *
              </label>
              <button
                type="button"
                onClick={() => setIsCreatingCategory(!isCreatingCategory)}
                className="text-[11px] font-semibold text-[#C19848] hover:text-[#C19848]/85 flex items-center gap-1 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                {isCreatingCategory ? 'Selecionar existente' : 'Nova categoria'}
              </button>
            </div>

            {isCreatingCategory ? (
              <div className="space-y-2.5 pt-2 border-t border-gray-200 animate-fade-in">
                {catError && (
                  <p className="text-xs text-red-700 bg-red-50 p-2 rounded border border-red-200 font-medium">
                    {catError}
                  </p>
                )}
                <div>
                  <input
                    type="text"
                    placeholder="Nome da categoria (ex: Aluguel, Fornecedor, Caixa)"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs font-semibold text-gray-900"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-gray-500 font-medium shrink-0">Cor:</label>
                  <input
                    type="color"
                    value={newCatColor}
                    onChange={(e) => setNewCatColor(e.target.value)}
                    className="w-6 h-6 rounded border border-gray-300 cursor-pointer p-0"
                  />
                  <TagBadge categoryName={newCatName || 'Categoria'} color={newCatColor} />
                </div>
                <div>
                  <textarea
                    rows={2}
                    placeholder="Observação / Descrição da categoria (Opcional)"
                    value={newCatObservation}
                    onChange={(e) => setNewCatObservation(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded p-2 text-xs text-gray-800 resize-none font-medium"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCreateInlineCategory}
                  className="w-full bg-[#203723] hover:bg-[#203723]/90 text-white text-xs font-semibold py-1.5 rounded flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Salvar e Usar Categoria
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setTagCode(e.target.value);
                  }}
                  className="w-full bg-white border border-gray-300 rounded-md px-2.5 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C19848]/20 focus:border-[#C19848] cursor-pointer font-bold"
                >
                  {tags.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
                {selectedCatObj && (
                  <div className="p-2 bg-white rounded border border-gray-200/80 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 font-medium">Identificação no Calendário:</span>
                      <TagBadge categoryName={selectedCatObj.name} color={selectedCatObj.color} />
                    </div>
                    {selectedCatObj.observation && (
                      <p className="text-[10px] text-gray-500 italic flex items-center gap-1 pt-1 border-t border-gray-100">
                        <AlignLeft className="w-3 h-3 text-[#C19848] shrink-0" />
                        <span>{selectedCatObj.observation}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Forma de Pagamento */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1">
              Forma de Pagamento
            </label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-md pl-9 pr-8 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C19848]/20 focus:border-[#C19848] appearance-none cursor-pointer font-medium"
              >
                {FORMAS_PAGAMENTO.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Descrição opcional */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1">
              Descrição / Observações (Opcional)
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
              <textarea
                rows={2}
                placeholder="Detalhes adicionais, número da nota fiscal ou observações..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-md pl-9 pr-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C19848]/20 focus:border-[#C19848] resize-none font-medium"
              />
            </div>
          </div>

          {/* Footer Actions for Normal Mode */}
          <div className="pt-3 border-t border-gray-200 flex items-center justify-between gap-3 mt-4">
            {transactionToEdit && onDelete ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (transactionToEdit.recurrenceRuleId) {
                        setConfirmAction('delete');
                      } else if (confirm(`Excluir o lançamento "${transactionToEdit.title}"?`)) {
                        handleFinalDelete();
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1.5 rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-md bg-[#203723] hover:bg-[#203723]/90 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                  >
                    Salvar Lançamento
                  </button>
                </div>
              </div>
            </>
          )}

        </form>
      </div>
    </div>
  );
};

