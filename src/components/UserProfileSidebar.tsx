import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, ActiveView } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
  X,
  User,
  Mail,
  Camera,
  Trash2,
  Save,
  CheckCircle2,
  ArrowLeft,
  ChevronRight,
  FolderTree,
  Upload,
  LogOut,
  Settings,
  RefreshCw,
  Wallet,
} from 'lucide-react';

interface UserProfileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSaveProfile: (updatedProfile: UserProfile) => void;
  onNavigateView?: (view: ActiveView) => void;
}

type SidebarView = 'menu' | 'profile';

export const UserProfileSidebar: React.FC<UserProfileSidebarProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
  onNavigateView,
}) => {
  const { signOut } = useAuth();
  // Navigation view state inside the sidebar
  const [activeView, setActiveView] = useState<SidebarView>('menu');

  // Form state
  const [formData, setFormData] = useState<UserProfile>(profile);

  // General feedback
  const [saveSuccess, setSaveSuccess] = useState(false);

  // File input ref for avatar
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync form data & reset active view to 'menu' whenever the drawer opens
  useEffect(() => {
    if (isOpen) {
      setActiveView('menu');
      setFormData(profile);
      setSaveSuccess(false);
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  // Handle Avatar Upload
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert('A foto deve ter no máximo 3MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const newAvatarUrl = reader.result as string;
        setFormData((prev) => {
          const updated = { ...prev, avatarUrl: newAvatarUrl };
          onSaveProfile(updated);
          return updated;
        });
      };
      reader.readAsDataURL(file);
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleRemoveAvatar = () => {
    setFormData((prev) => {
      const updated = { ...prev, avatarUrl: '' };
      onSaveProfile(updated);
      return updated;
    });
  };

  // Handle Save Profile
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(formData);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Sidebar Drawer coming from Left */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-50 transform transition-transform duration-300 ease-in-out border-r border-gray-200">
        
        {/* Hidden File Input for Avatar Upload */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleAvatarChange}
          accept="image/png, image/jpeg, image/webp"
          className="hidden"
        />

        {/* Drawer Header */}
        <div className="p-5 bg-[#203723] text-white flex items-center justify-between shrink-0 border-b border-[#C19848]/20">
          <div className="flex items-center gap-3">
            {activeView === 'profile' ? (
              <button
                type="button"
                onClick={() => setActiveView('menu')}
                className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-[#203723]/80 transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                title="Voltar"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-9 h-9 rounded-lg bg-[#C19848] text-[#203723] flex items-center justify-center font-bold">
                <Settings className="w-5 h-5 text-[#203723]" />
              </div>
            )}

            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                {activeView === 'menu' ? 'Menu do Sistema' : 'Editar Perfil'}
              </h2>
              <p className="text-xs text-gray-400 font-medium">
                {activeView === 'menu'
                  ? 'Opções de navegação e conta'
                  : 'Gerencie nome de exibição, cargo e foto'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert Banner */}
        {saveSuccess && activeView === 'profile' && (
          <div className="bg-emerald-50 border-b border-emerald-200 p-3 px-5 flex items-center gap-2 text-emerald-800 text-xs font-semibold animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Perfil atualizado com sucesso!</span>
          </div>
        )}

        {/* ==================== VIEW 1: MENU LIST ==================== */}
        {activeView === 'menu' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* User Info Card Summary */}
            <div className="bg-gradient-to-r from-[#203723] via-[#203723]/95 to-[#203723] text-white p-4 rounded-xl shadow-xs border border-[#C19848]/20 flex items-center gap-3.5 relative overflow-hidden">
              {/* Clickable Avatar Circle */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="relative shrink-0 cursor-pointer group/avatar"
                title="Clique para alterar a foto do avatar"
              >
                <div className="w-14 h-14 rounded-full bg-[#C19848] text-[#203723] flex items-center justify-center font-bold text-xl overflow-hidden border-2 border-[#C19848]/50 shadow-inner group-hover/avatar:border-[#C19848] transition-colors">
                  {(formData.avatarUrl || profile.avatarUrl) ? (
                    <img
                      src={formData.avatarUrl || profile.avatarUrl}
                      alt={profile.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-7 h-7 text-[#203723]" />
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 p-1 bg-[#C19848] text-[#203723] rounded-full shadow-xs group-hover/avatar:bg-[#C19848]/90 transition-colors">
                  <Camera className="w-3 h-3 text-[#203723]" />
                </div>
              </div>

              {/* Clickable Text Area - opens Profile Edit form */}
              <div
                onClick={() => setActiveView('profile')}
                className="min-w-0 flex-1 cursor-pointer group/info"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white truncate group-hover/info:text-[#E4D8BE] transition-colors">
                    {profile.name || 'Administrador'}
                  </h3>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover/info:text-white transition-colors" />
                </div>
                <p className="text-xs text-gray-300 truncate font-medium">
                  {profile.email}
                </p>
                <div className="mt-1">
                  <span className="inline-block text-[10px] bg-[#C19848]/20 text-[#E4D8BE] px-2 py-0.5 rounded-md font-semibold border border-[#C19848]/20">
                    {profile.accessLevel || 'Administrador'}
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation Shortcut Options Section */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              {/* Gestão de Contas */}
              <button
                type="button"
                onClick={() => {
                  onNavigateView?.('contas');
                  onClose();
                }}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-[#C19848]/5 border border-gray-200 hover:border-[#C19848]/20 transition-all text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Wallet className="w-4 h-4 text-[#C19848]" />
                  <span className="text-xs font-semibold text-gray-800 group-hover:text-[#203723]">
                    Gestão de Contas
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#C19848]" />
              </button>

              {/* Importar / Exportar Excel */}
              <button
                type="button"
                onClick={() => {
                  onNavigateView?.('excel');
                  onClose();
                }}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-[#C19848]/5 border border-gray-200 hover:border-[#C19848]/20 transition-all text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Upload className="w-4 h-4 text-[#C19848]" />
                  <span className="text-xs font-semibold text-gray-800 group-hover:text-[#203723]">
                    Importação via Excel (.xlsx)
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#C19848]" />
              </button>

              {/* Gerenciar Categorias */}
              <button
                type="button"
                onClick={() => {
                  onNavigateView?.('tags');
                  onClose();
                }}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-[#C19848]/5 border border-gray-200 hover:border-[#C19848]/20 transition-all text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <FolderTree className="w-4 h-4 text-[#C19848]" />
                  <span className="text-xs font-semibold text-gray-800 group-hover:text-[#203723]">
                    Gerenciador de Categorias
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#C19848]" />
              </button>

              {/* Pagamentos Recorrentes */}
              <button
                type="button"
                onClick={() => {
                  onNavigateView?.('recorrencias');
                  onClose();
                }}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-[#C19848]/5 border border-gray-200 hover:border-[#C19848]/20 transition-all text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <RefreshCw className="w-4 h-4 text-[#C19848]" />
                  <span className="text-xs font-semibold text-gray-800 group-hover:text-[#203723]">
                    Pagamentos recorrentes
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#C19848]" />
              </button>
            </div>
            
            {/* Botão Sair do Sistema (Logout) */}
            <div className="pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={async () => {
                  onClose();
                  await signOut();
                }}
                className="w-full flex items-center justify-center gap-2.5 p-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs border border-red-200 hover:border-red-300 transition-all cursor-pointer shadow-xs active:scale-98"
              >
                <LogOut className="w-4 h-4 text-red-600" />
                <span>Sair do Sistema</span>
              </button>
            </div>

            {/* Brand Signature in Sidebar */}
            <div className="pt-4 border-t border-gray-100 flex flex-col items-center justify-center text-center pb-2 mt-2">
              <span className="font-brand font-bold text-sm tracking-widest text-[#C19848] uppercase">The Parlor</span>
              <span className="font-brand italic text-[10px] text-gray-400 mt-0.5">Fluxo de Caixa</span>
            </div>
          </div>
        )}

        {/* ==================== VIEW 2: PROFILE EDIT FORM ==================== */}
        {activeView === 'profile' && (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-6">
            
            {/* User Basic Info Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                <User className="w-4 h-4 text-[#C19848]" />
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Dados Pessoais
                </h3>
              </div>

              {/* Avatar section inside edit form */}
              <div className="flex items-center gap-4 bg-gray-50 p-3.5 rounded-lg border border-gray-200">
                <div className="relative w-14 h-14 rounded-full bg-[#C19848] text-[#203723] flex items-center justify-center font-bold text-xl overflow-hidden border-2 border-[#C19848] shrink-0">
                  {formData.avatarUrl ? (
                    <img
                      src={formData.avatarUrl}
                      alt={formData.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-7 h-7 text-[#203723]" />
                  )}
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-gray-800">Foto de Perfil</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-[11px] font-semibold rounded shadow-2xs transition-colors cursor-pointer"
                    >
                      Alterar Foto
                    </button>
                    {formData.avatarUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="px-2.5 py-1 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-[11px] font-semibold rounded transition-colors cursor-pointer"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Nome */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nome do Usuário / Exibição
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C19848]/20 focus:border-[#C19848] font-medium"
                  placeholder="Ex: Bruno Ferrari"
                />
              </div>

              {/* Cargo */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Cargo
                </label>
                <input
                  type="text"
                  required
                  value={formData.accessLevel || ''}
                  onChange={(e) => setFormData({ ...formData, accessLevel: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C19848]/20 focus:border-[#C19848] font-medium"
                  placeholder="Ex: Administrador, Colaborador, Gerente"
                />
              </div>

              {/* E-mail Principal (Autenticação Google) */}
              <div>
                <label className="text-xs font-semibold text-gray-700 flex items-center gap-1 mb-1">
                  <Mail className="w-3.5 h-3.5 text-gray-500" />
                  <span>E-mail da Conta</span>
                </label>
                <div className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 font-medium flex items-center justify-between">
                  <span className="truncate">{formData.email}</span>
                  <span className="text-[10px] font-bold bg-[#E4D8BE]/30 text-[#203723] px-2 py-0.5 rounded border border-[#C19848]/20 shrink-0 ml-2">
                    Google SSO
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Save Button */}
            <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setActiveView('menu')}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 bg-[#C19848] hover:bg-[#C19848]/90 text-[#203723] font-bold text-xs px-5 py-2 rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Alterações</span>
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
