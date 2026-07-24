import React, { useState } from 'react';
import { Tag, Transaction } from '../../types';
import { TagBadge } from '../TagBadge';
import { TagPanel } from '../TagPanel';
import { FolderTree, Plus, Edit2, Trash2, AlignLeft } from 'lucide-react';

interface TagsManagementViewProps {
  tags: Tag[];
  transactions: Transaction[];
  onSaveTag: (tag: Tag) => void;
  onDeleteTag: (tagId: string) => void;
}

export const TagsManagementView: React.FC<TagsManagementViewProps> = ({
  tags,
  transactions,
  onSaveTag,
  onDeleteTag,
}) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  const handleOpenCreate = () => {
    setEditingTag(null);
    setIsPanelOpen(true);
  };

  const handleOpenEdit = (tag: Tag) => {
    setEditingTag(tag);
    setIsPanelOpen(true);
  };

  // Usage counts per category
  const getCategoryUsageCount = (catName: string, catCode?: string) => {
    const cleanName = catName.trim().toLowerCase();
    const cleanCode = (catCode || '').trim().toLowerCase();

    return transactions.filter((tx) => {
      const txCat = (tx.category || '').trim().toLowerCase();
      const txTag = (tx.tagCode || '').trim().toLowerCase();
      return (
        txCat === cleanName ||
        (cleanCode && txTag === cleanCode) ||
        (cleanCode && txCat === cleanCode)
      );
    }).length;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-gray-200 p-5 rounded-lg shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-[#E4D8BE]/20 border border-[#C19848]/20 text-[#C19848] flex items-center justify-center shrink-0">
            <FolderTree className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Gestão de Categorias
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              Crie, edite e personalize todas as suas categorias com cores destacadas e observações detalhadas
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-1.5 bg-[#C19848] hover:bg-[#C19848]/90 text-[#203723] font-bold text-xs px-4 py-2 rounded-md shadow-xs transition-all cursor-pointer shrink-0 border border-[#C19848]/20"
        >
          <Plus className="w-4 h-4 text-[#203723]" />
          <span>Cadastrar Nova Categoria</span>
        </button>
      </div>

      {/* Main Grid: Registered Categories List */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-gray-200 pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
            Categorias Cadastradas ({tags.length})
          </h3>
          <span className="text-[11px] text-gray-400 font-medium">
            Clique no ícone de lápis para abrir o menu flutuante e editar nome, cor e observação
          </span>
        </div>

        {tags.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <p className="text-xs text-gray-400 font-medium">
              Nenhuma categoria cadastrada ainda.
            </p>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 bg-[#E4D8BE]/20 border border-[#C19848]/20 text-[#C19848] hover:bg-[#E4D8BE]/35 text-xs font-semibold px-3.5 py-2 rounded-md transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Criar primeira categoria
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {tags.map((t) => {
              const count = getCategoryUsageCount(t.name, t.code);
              return (
                <div
                  key={t.id}
                  className="p-4 rounded-lg bg-gray-50/70 border border-gray-200 flex flex-col justify-between gap-3 group hover:border-gray-300 hover:bg-white transition-all shadow-2xs"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <TagBadge categoryName={t.name} color={t.color} />
                      <span className="text-[10px] text-gray-400 font-medium font-mono">
                        {count} lançamento(s)
                      </span>
                    </div>

                    <p className="text-xs font-bold text-gray-900 truncate">
                      {t.name}
                    </p>

                    {/* Field Observação */}
                    {t.observation ? (
                      <div className="p-2.5 rounded bg-white border border-gray-200/80 text-[11px] text-gray-600 space-y-1">
                        <span className="text-[9px] font-bold uppercase text-gray-400 flex items-center gap-1">
                          <AlignLeft className="w-3 h-3 text-[#C19848]" />
                          Observação
                        </span>
                        <p className="line-clamp-2 leading-relaxed">
                          {t.observation}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[10px] text-gray-400 italic">
                        Nenhuma observação cadastrada.
                      </p>
                    )}
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200/60 mt-1">
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium">
                      <span
                        style={{ backgroundColor: t.color || '#2563eb' }}
                        className="w-2.5 h-2.5 rounded-full inline-block border border-black/10"
                      />
                      <span>Cor personalizada</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(t)}
                        className="p-1.5 rounded text-gray-400 hover:text-[#C19848] hover:bg-[#E4D8BE]/10 transition-colors cursor-pointer"
                        title="Editar no menu flutuante"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Excluir a categoria "${t.name}"?`)) {
                            onDeleteTag(t.id);
                          }
                        }}
                        className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Excluir Categoria"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Side Menu Drawer for Create / Edit Category */}
      <TagPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        onSaveTag={onSaveTag}
        tagToEdit={editingTag}
        existingTags={tags}
      />

    </div>
  );
};
