/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { CadInfoConta, ThemeColor } from "../types";
import { Scissors, Phone, MapPin, Store, Sparkles, LogOut, UserCheck, Cloud, Wifi, WifiOff, Menu } from "lucide-react";

interface CompanyHeaderProps {
  infoConta: CadInfoConta | undefined;
  activeTheme: ThemeColor;
  userName: string;
  userRole: string;
  tipoAssinatura: string | undefined;
  dataValidade: string | undefined;
  onLogout: () => void;
  onOpenSync: () => void;
  isOnline: boolean;
  hasPendingSync: boolean;
  onMenuClick?: () => void;
  showLogout?: boolean;
}

export default function CompanyHeader({
  infoConta,
  activeTheme,
  userName,
  userRole,
  tipoAssinatura,
  dataValidade,
  onLogout,
  onOpenSync,
  isOnline,
  hasPendingSync,
  onMenuClick,
  showLogout,
}: CompanyHeaderProps) {
  // Check if we have populated company settings
  const hasSettings =
    infoConta &&
    infoConta.NomeEmpresa &&
    infoConta.NomeEmpresa.trim().length > 0;

  // Compute remaining days and subscription safety status props
  const getSubscriptionStateProps = () => {
    if (userRole === "Administrador") {
      return { color: "bg-emerald-500", text: "Vitalício", pulse: false };
    }
    if (tipoAssinatura === "Vitalício") {
      return { color: "bg-emerald-500", text: "Vitalício", pulse: false };
    }
    if (!dataValidade) {
      return { color: "bg-emerald-500", text: "Ativo", pulse: false };
    }

    try {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const todayTime = new Date(todayStr).getTime();
      const valTime = new Date(dataValidade).getTime();

      const diffMs = valTime - todayTime; // positive if in the future, negative if past validity
      const daysDiff = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (daysDiff > 5) {
        return { color: "bg-emerald-500", text: `Ativo (${daysDiff} d restantes)`, pulse: false };
      } else if (daysDiff >= 0) {
        return { color: "bg-blue-500 animate-pulse", text: `Expira em ${daysDiff} d`, pulse: false };
      } else {
        const overdueDays = Math.abs(daysDiff);
        if (overdueDays <= 3) {
          return { color: "bg-amber-400", text: `Tolerância (${overdueDays} d expirado)`, pulse: false };
        } else {
          return { color: "bg-rose-500 animate-pulse", text: `Modo Restrito (Expirado há ${overdueDays} d)`, pulse: true };
        }
      }
    } catch (e) {
      return { color: "bg-emerald-500", text: "Ativo", pulse: false };
    }
  };

  const subState = getSubscriptionStateProps();

  return (
    <header
      className={`relative md:sticky md:top-0 z-30 border-b transition-all duration-300 ${activeTheme.border}`}
      style={{ backgroundColor: activeTheme.bgLightHex }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Brand/Identity Container */}
          <div className="flex items-start gap-3 sm:gap-4">
            {/* Menu Drawer Toggle Button */}
            {onMenuClick && (
              <button
                type="button"
                id="btn-open-sidebar-menu"
                onClick={onMenuClick}
                className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 shadow-xs transition cursor-pointer self-center shrink-0"
                title="Abrir Menu de Navegação Completo"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}

            {/* Logo Area */}
            {hasSettings && infoConta.Logo ? (
              <img
                src={infoConta.Logo}
                alt="Logo Empresa"
                referrerPolicy="no-referrer"
                className="h-16 w-16 rounded-2xl object-cover ring-2 ring-white border border-slate-200 shadow-xs flex-shrink-0"
              />
            ) : (
              <div className={`p-4 rounded-2xl text-white shadow-xs flex-shrink-0 ${activeTheme.primary}`}>
                <Scissors className="h-7 w-7 animate-pulse" />
              </div>
            )}

            <div className="flex flex-col justify-center min-h-[64px]">
              <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-slate-900 leading-tight">
                {hasSettings ? infoConta.NomeEmpresa : "Banho e Tosa Empresa"}
              </h1>

              {/* Default Subtitle falls back if setting does not exist */}
              {!hasSettings && (
                <p className="text-xs text-slate-500 font-medium">
                  Movimento Diário (Agenda)
                </p>
              )}

              {/* Dynamic Metadata details - Distributed vertically */}
              {hasSettings && (
                <div className="flex flex-col gap-1 mt-1.5 text-[11px] text-slate-600 font-mono">
                  {infoConta.Fone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      {infoConta.Fone}
                    </span>
                  )}
                  {infoConta.Endereco && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {infoConta.Endereco}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* User Info & Actions Area */}
          <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 sm:gap-4 md:gap-5 self-stretch md:self-auto border-t md:border-t-0 pt-2.5 md:pt-0 border-slate-200/40">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-left md:text-right">
              {/* Indicador de Conexão e Sincronização offline */}
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold shadow-3xs border transition-all duration-300 ${
                  isOnline
                    ? hasPendingSync
                      ? "bg-amber-50/90 border-amber-200 text-amber-700 animate-pulse"
                      : "bg-emerald-50/90 border-emerald-200 text-emerald-700"
                    : "bg-rose-50/90 border-rose-250 text-rose-700 animate-pulse"
                }`}
                title={
                  isOnline
                    ? hasPendingSync
                      ? "Operando Online (Enviando modificações geradas offline...)"
                      : "Sistema Online e Sincronizado"
                    : "Operando Offline (Modo de Contingência local ativo)"
                }
              >
                {isOnline ? (
                  hasPendingSync ? (
                    <>
                      <Cloud className="h-3 w-3 text-amber-500 animate-bounce" />
                      <span>Sincronizando...</span>
                    </>
                  ) : (
                    <>
                      <Wifi className="h-3 w-3 text-emerald-500" />
                      <span>Online</span>
                    </>
                  )
                ) : (
                  <>
                    <WifiOff className="h-3 w-3 text-rose-500 animate-ping" />
                    <span>Aguardando Sinc</span>
                  </>
                )}
              </div>

              <span className="hidden sm:inline bg-white/70 border border-slate-200/60 px-2 py-1 rounded-md text-[10px] text-slate-600 font-mono font-semibold font-sans">
                Sessão Segura
              </span>
              
              {/* Dynamic vertical status bar showing subscription status */}
              <div
                className={`w-1.5 h-9 rounded-full ${subState.color} ${subState.pulse ? "shadow-[0_0_8px_rgba(239,68,68,0.5)]" : ""}`}
                title={subState.text}
              />

              <div className="text-left md:text-right flex flex-col justify-center py-0.5">
                <div className="text-xs sm:text-sm font-semibold text-slate-800 flex items-center gap-1.5 md:justify-end">
                  <UserCheck className="h-4 w-4 text-slate-500" />
                  <span>{userName}</span>
                </div>
                <div className="text-[10px] sm:text-[11px] font-mono text-slate-400 capitalize flex items-center gap-1.5 md:justify-end mt-0.5">
                  <span>Acesso: <strong className="text-emerald-600 font-bold">{userRole}</strong></span>
                  <span className="text-slate-300">|</span>
                  <span className="text-[9px] text-slate-500 font-bold">{subState.text}</span>
                </div>
              </div>
            </div>

            {/* Botões de Ação Agrupados para evitar quebra/overflow incorreto no mobile */}
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 ml-auto md:ml-0 flex-shrink-0">
              {userRole === "Administrador" && (
                <button
                  onClick={onOpenSync}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 border border-sky-200 hover:border-sky-300 text-sky-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                  title="Sincronizar com o Firebase"
                >
                  <Cloud className="h-3.5 w-3.5" />
                  <span>Sincronizar</span>
                </button>
              )}

              {showLogout && (
                <button
                  onClick={onLogout}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 text-rose-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                  title="Sair do aplicativo"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sair</span>
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
