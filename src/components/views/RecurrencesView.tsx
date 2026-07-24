import React, { useState } from 'react';
import { RecurrenceRule, TransactionType, FormaPagamento, FORMAS_PAGAMENTO, Tag, RecurrenceFrequency } from '../../types';
import { Plus, X, Trash2, Edit2, Play, Pause, RefreshCw, AlertCircle, Save } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RecurrencesViewProps {
  rules: RecurrenceRule[];
  tags: Tag[];
  onSaveRule: (rule: RecurrenceRule) => void;
  onDeleteRule: (id: string) => void;
  onTogglePause: (id: string, isPaused: boolean) => void;
}

export const RecurrencesView: React.FC<RecurrencesViewProps> = ({
  rules,
  tags,
  onSaveRule,
  onDeleteRule,
  onTogglePause,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [type, setType] = useState<TransactionType>('saida');
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>(FORMAS_PAGAMENTO[0]);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('mensal');
  const [repeatDay, setRepeatDay] = useState('1');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState('');

  const [errorMsg, setErrorMsg] = useState('');

  const resetForm = () => {
    setTitle('');
    setAmount('');
    setType('saida');
    setCategory('');
    setPaymentMethod(FORMAS_PAGAMENTO[0]);
    setFrequency('mensal');
    setRepeatDay('1');
    setStartDate(format(new Date(), 'yyyy-MM-dd'));
    setEndDate('');
    setEditingId(null);
    setIsEditing(false);
    setErrorMsg('');
  };

  const handleEdit = (rule: RecurrenceRule) => {
    setTitle(rule.title);
    setAmount(rule.amount.toString());
    setType(rule.type);
    
    const tag = tags.find(t => t.code === rule.tagCode || t.name === rule.category);
    setCategory(tag ? tag.id : (rule.category || rule.tagCode));
    
    setPaymentMethod(rule.paymentMethod);
    setFrequency(rule.frequency);
    setRepeatDay(rule.repeatDay);
    setStartDate(rule.startDate);
    setEndDate(rule.endDate || '');
    setEditingId(rule.id);
    setIsEditing(true);
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount || !category || !startDate) {
      setErrorMsg('Preencha os campos obrigatórios.');
      return;
    }
    
    const numericAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMsg('Valor inválido.');
      return;
    }

    const tagObj = tags.find((t) => t.id === category || t.name === category || t.code === category);
    if (!tagObj) {
      setErrorMsg('Categoria inválida.');
      return;
    }

    const rule: RecurrenceRule = {
      id: editingId || `rec_rule_${Date.now()}`,
      title,
      amount: numericAmount,
      type,
      category: tagObj.name,
      tagCode: tagObj.code || tagObj.name,
      paymentMethod,
      frequency,
      repeatDay,
      startDate,
      endDate: endDate || undefined,
      isPaused: false,
      createdAt: new Date().toISOString(),
    };

    onSaveRule(rule);
    resetForm();
  };

  const getFrequencyLabel = (freq: string, day: string) => {
    switch (freq) {
      case 'semanal': return `Toda semana (Dia ${day})`;
      case 'quinzenal': return `A cada 15 dias (Dia ${day})`;
      case 'mensal': return `Todo mês (Dia ${day})`;
      case 'bimestral': return `A cada 2 meses (Dia ${day})`;
      case 'anual': return `Uma vez ao ano (Dia ${day})`;
      default: return freq;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50/50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-[#C19848]" />
            Pagamentos Recorrentes
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Gere lançamentos automaticamente em uma janela rolante.
          </p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 bg-[#C19848] hover:bg-[#C19848]/90 text-[#203723] font-bold text-xs px-4 py-2 rounded-lg shadow-sm transition-all border border-[#C19848]/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Recorrência</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isEditing ? (
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h2 className="text-sm font-bold text-gray-800">
                {editingId ? 'Editar Recorrência' : 'Criar Nova Recorrência'}
              </h2>
              <button
                onClick={resetForm}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs font-semibold flex items-center gap-2 border border-red-100">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nome / Descrição</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#C19848] focus:border-[#C19848] text-sm"
                    placeholder="Ex: Assinatura de Internet"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo</label>
                  <div className="flex rounded-lg shadow-sm">
                    <button
                      type="button"
                      onClick={() => setType('saida')}
                      className={`flex-1 py-2 text-xs font-bold rounded-l-lg border ${
                        type === 'saida'
                          ? 'bg-red-50 text-red-700 border-red-200 z-10'
                          : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Saída
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('entrada')}
                      className={`flex-1 py-2 text-xs font-bold rounded-r-lg border-y border-r ${
                        type === 'entrada'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 z-10'
                          : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Entrada
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#C19848] focus:border-[#C19848] text-sm"
                    placeholder="0,00"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#C19848] focus:border-[#C19848] text-sm"
                  >
                    <option value="">Selecione...</option>
                    {tags.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Forma de Pagamento</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#C19848] focus:border-[#C19848] text-sm"
                  >
                    {FORMAS_PAGAMENTO.map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Frequência</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#C19848] focus:border-[#C19848] text-sm"
                  >
                    <option value="semanal">Semanal</option>
                    <option value="quinzenal">Quinzenal</option>
                    <option value="mensal">Mensal</option>
                    <option value="bimestral">Bimestral</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Dia de Repetição</label>
                  <input
                    type="text"
                    required
                    value={repeatDay}
                    onChange={(e) => setRepeatDay(e.target.value)}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#C19848] focus:border-[#C19848] text-sm"
                    placeholder="Ex: 5"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    Dia do mês (1-31) ou dia da semana (0=Dom, 1=Seg) dependendo da frequência.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Data de Início</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#C19848] focus:border-[#C19848] text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Data de Término (Opcional)</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#C19848] focus:border-[#C19848] text-sm"
                  />
                </div>
              </div>
              
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-[#C19848] hover:bg-[#C19848]/90 text-[#203723] font-bold text-sm px-6 py-2 rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4 text-[#203723]" />
                  Salvar
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-4">
            {rules.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                <RefreshCw className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-gray-900 font-bold mb-1">Nenhuma recorrência cadastrada</h3>
                <p className="text-gray-500 text-sm">Automatize seus pagamentos ou recebimentos recorrentes.</p>
              </div>
            ) : (
              rules.map(rule => (
                <div key={rule.id} className={`bg-white rounded-xl shadow-xs border flex flex-col md:flex-row items-stretch overflow-hidden ${rule.isPaused ? 'border-gray-200 opacity-60' : 'border-[#E4D8BE]/40'}`}>
                  {/* Left Color Bar */}
                  <div className={`w-1.5 shrink-0 ${rule.isPaused ? 'bg-gray-300' : (rule.type === 'entrada' ? 'bg-emerald-500' : 'bg-red-500')}`} />
                  
                  <div className="flex-1 p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-bold text-base ${rule.isPaused ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{rule.title}</h3>
                        {rule.isPaused && (
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold">
                            PAUSADO
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1.5 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                          {rule.category}
                        </span>
                        <span className="font-semibold text-gray-600">
                          {getFrequencyLabel(rule.frequency, rule.repeatDay)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-1 shrink-0">
                      <span className={`font-bold text-lg ${rule.type === 'entrada' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {rule.type === 'entrada' ? '+ ' : '- '}
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rule.amount)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 md:bg-transparent border-t md:border-t-0 md:border-l border-gray-100 p-2 md:p-4 flex flex-row md:flex-col items-center justify-end md:justify-center gap-2 shrink-0">
                    <button
                      onClick={() => handleEdit(rule)}
                      className="p-2 text-[#C19848] hover:bg-[#E4D8BE]/10 rounded-lg transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onTogglePause(rule.id, !rule.isPaused)}
                      className={`p-2 rounded-lg transition-colors cursor-pointer ${rule.isPaused ? 'text-emerald-600 hover:bg-emerald-50' : 'text-amber-600 hover:bg-amber-50'}`}
                      title={rule.isPaused ? "Retomar" : "Pausar"}
                    >
                      {rule.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Tem certeza que deseja excluir esta recorrência? Ocorrências futuras não serão geradas.')) {
                          onDeleteRule(rule.id);
                        }
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
