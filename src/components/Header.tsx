import React from 'react';
import { ActiveView, UserProfile } from '../types';
import {
  LayoutDashboard,
  Calendar,
  PieChart,
  Search,
  Menu,
} from 'lucide-react';

interface HeaderProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  onOpenNewTransaction: () => void;
  userProfile?: UserProfile;
  onOpenProfile: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  setActiveView,
  onOpenNewTransaction,
  userProfile,
  onOpenProfile,
}) => {
  const navItems = [
    { id: 'calendario', label: 'Calendário', icon: Calendar },
  ] as const;

  return (
    <header className="sticky top-0 z-30 bg-[#203723] text-white shadow-md border-b border-[#C19848]/25">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-4">
          
          {/* Logo & Fixed Title with Menu Button */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenProfile}
              className="w-9 h-9 rounded-lg bg-[#C19848] hover:bg-[#C19848]/90 text-[#203723] flex items-center justify-center font-bold text-sm transition-all shadow-sm cursor-pointer group relative overflow-hidden border border-[#C19848]/30"
              title="Abrir Menu de Configurações & Perfil"
            >
              {userProfile?.avatarUrl ? (
                <img
                  src={userProfile.avatarUrl}
                  alt={userProfile.name || 'Avatar'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Menu className="w-5 h-5 text-[#203723] group-hover:scale-110 transition-transform" />
              )}
            </button>
            <div onClick={onOpenProfile} className="cursor-pointer group">
              <h1 className="text-sm font-bold tracking-[0.1em] text-[#C19848] uppercase font-brand leading-none group-hover:text-[#E4D8BE] transition-colors">
                The Parlor
              </h1>
              <span className="text-[9px] uppercase font-semibold text-[#E4D8BE] tracking-[0.15em] mt-0.5 block font-brand italic">
                Fluxo de Caixa
              </span>
            </div>
          </div>

          {/* Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-1 overflow-x-auto py-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id as ActiveView)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-[13px] font-brand tracking-wide transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-[#C19848] text-[#203723] font-bold shadow-sm'
                      : 'text-[#E4D8BE] hover:text-[#C19848] hover:bg-[#C19848]/10'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Magnifying Glass Search Button */}
            <button
              onClick={() => setActiveView('busca')}
              className={`p-2 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center justify-center ${
                activeView === 'busca'
                  ? 'bg-[#C19848] text-[#203723] shadow-sm'
                  : 'text-[#E4D8BE] hover:text-[#C19848] hover:bg-[#C19848]/10'
              }`}
              title="Buscar Lançamentos"
            >
              <Search className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex items-center gap-1 overflow-x-auto pb-2 pt-1 border-t border-[#C19848]/15 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as ActiveView)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[13px] font-brand tracking-wide shrink-0 transition-all ${
                  isActive
                    ? 'bg-[#C19848] text-[#203723] font-bold'
                    : 'text-[#E4D8BE] bg-[#203723]/40 hover:bg-[#C19848]/10'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
          
          {/* Search Button in Mobile Nav as well */}
          <button
            onClick={() => setActiveView('busca')}
            className={`p-1.5 rounded-md text-xs font-medium shrink-0 transition-all flex items-center justify-center ${
              activeView === 'busca'
                ? 'bg-[#C19848] text-[#203723] font-bold'
                : 'text-[#E4D8BE] bg-[#203723]/40 hover:bg-[#C19848]/10'
            }`}
            title="Buscar Lançamentos"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </header>
  );
};

