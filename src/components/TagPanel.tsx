import React, { useState, useEffect } from 'react';
import { Tag } from '../types';
import { TagBadge } from './TagBadge';
import { X, Check, Palette, FolderTree, AlignLeft } from 'lucide-react';
import { generateUniqueId } from '../utils/formatters';

export const PRESET_CATEGORY_COLORS = [
  { name: 'Vermelho Carmim', hex: '#B91C1C' },
  { name: 'Laranja Escuro', hex: '#C2410C' },
  { name: 'Âmbar', hex: '#D97706' },
  { name: 'Verde Oliva', hex: '#4D7C0F' },
  { name: 'Verde Esmeralda', hex: '#059669' },
  { name: 'Teal', hex: '#0D9488' },
  { name: 'Azul Céu', hex: '#0284C7' },
  { name: 'Azul Royal', hex: '#2563EB' },
  { name: 'Índigo', hex: '#4F46E5' },
  { name: 'Violeta', hex: '#7C3AED' },
  { name: 'Roxo', hex: '#9333EA' },
  { name: 'Fúcsia', hex: '#C026D3' },
  { name: 'Rosa', hex: '#DB2777' },
  { name: 'Vermelho Rosa', hex: '#E11D48' },
  { name: 'Verde Floresta', hex: '#052E16' },
  { name: 'Verde Vibrante', hex: '#15803D' },
  { name: 'Laranja Queimado', hex: '#9A3412' },
  { name: 'Grafite Slate', hex: '#475569' },
];

interface TagPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTag: (category: Tag) => void;
  tagToEdit: Tag | null;
  existingTags: Tag[];
}

export const TagPanel: React.FC<TagPanelProps> = ({
  isOpen,
  onClose,
  onSaveTag,
  tagToEdit,
  existingTags,
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#2563eb');
  const [observation, setObservation] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (tagToEdit) {
      setName(tagToEdit.name || tagToEdit.code || '');
      setColor(tagToEdit.color || '#2563eb');
      setObservation(tagToEdit.observation || '');
    } else {
      setName('');
      setColor('#2563eb');
      setObservation('');
    }
    setError('');
  }, [tagToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanName = name.trim();

    if (!cleanName) {
      setError('Informe o nome da categoria.');
      return;
    }

    // Check duplicate name
    const isDuplicate = existingTags.some(
      (t) => t.name.trim().toLowerCase() === cleanName.toLowerCase() && t.id !== tagToEdit?.id
    );

    if (isDuplicate) {
      setError(`Já existe uma categoria chamada "${cleanName}".`);
      return;
    }

    onSaveTag({
      id: tagToEdit ? tagToEdit.id : generateUniqueId(),
      name: cleanName,
      color: color || '#2563eb',
      observation: observation.trim(),
      code: tagToEdit?.code || cleanName.substring(0, 10).toUpperCase(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end transition-opacity duration-300">
      
      {/* Backdrop overlay */}
      <div className="flex-1 cursor-pointer" onClick={onClose} />

      {/* Floating Side Drawer */}
      <div className="w-full max-w-md bg-white border-l border-gray-200 h-full flex flex-col shadow-2xl relative text-gray-900 z-10 animate-slide-left">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#E4D8BE]/20 border border-[#C19848]/20 text-[#C19848] flex items-center justify-center shrink-0">
              <FolderTree className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {tagToEdit ? 'Editar Categoria' : 'Cadastrar Nova Categoria'}
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                Menu flutuante de personalização de categorias
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          
          {error && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Nome da Categoria */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FolderTree className="w-3.5 h-3.5 text-[#C19848]" />
              Nome da Categoria *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Aluguel, Fornecedor, Caixa, Salário, Transferência no bank"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C19848]/20 focus:border-[#C19848] font-semibold"
            />
            <span className="text-[10px] text-gray-400 mt-1 block font-medium">
              Nome editável da macro categoria que será exibido nas visões e no calendário
            </span>
          </div>

          {/* Cor da Categoria */}
          <div className="space-y-3 pt-1">
            <label className="block text-[11px] font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-[#C19848]" />
              Cor da Categoria
            </label>

            {/* Color Swatches Grid */}
            <div className="grid grid-cols-6 gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              {PRESET_CATEGORY_COLORS.map((c) => {
                const isSelected = color.toLowerCase() === c.hex.toLowerCase();
                return (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.name}
                    onClick={() => setColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer relative ${
                      isSelected
                        ? 'ring-2 ring-offset-2 ring-gray-900 scale-110 shadow-sm'
                        : 'hover:scale-105 opacity-90 hover:opacity-100'
                    }`}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white drop-shadow-md" />}
                  </button>
                );
              })}
            </div>

            {/* Custom Color Selector */}
            <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-md">
              <div className="relative flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-8 h-8 rounded border border-gray-300 cursor-pointer p-0 bg-transparent"
                />
                <span className="text-xs font-mono font-bold text-gray-700 uppercase">
                  {color}
                </span>
              </div>
              <span className="text-[11px] text-gray-400 font-medium ml-auto">
                Cor personalizada (Hex)
              </span>
            </div>
          </div>

          {/* Campo de Observação */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <AlignLeft className="w-3.5 h-3.5 text-[#C19848]" />
              Observações / Detalhes (Opcional)
            </label>
            <textarea
              rows={3}
              placeholder="Ex: Inclui pagamento de insumos de bebidas, fornecedores via Nubank e notas fiscais de reposição..."
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C19848]/20 focus:border-[#C19848] font-medium resize-none"
            />
            <span className="text-[10px] text-gray-400 mt-1 block font-medium">
              Maiores descrições e diretrizes de uso para esta categoria
            </span>
          </div>

          {/* Live Preview Card */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
              Prévia da Categoria
            </span>
            <div className="space-y-1.5">
              <TagBadge categoryName={name || 'Nome da Categoria'} color={color} />
              {observation && (
                <p className="text-[11px] text-gray-500 italic bg-white p-2 rounded border border-gray-200">
                  "{observation}"
                </p>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-[#C19848] hover:bg-[#C19848]/90 text-[#203723] text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer border border-[#C19848]/20"
            >
              <Check className="w-3.5 h-3.5 text-[#203723]" />
              {tagToEdit ? 'Salvar Alterações' : 'Criar Categoria'}
            </button>
          </div>

        </form>
      </div>

    </div>
  );
};
