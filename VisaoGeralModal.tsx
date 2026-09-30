/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { CadDetMovDiario, CadMovDiario, CadProdutos, ThemeColor, ControleRetorno } from "../types";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  Calendar,
  Sparkles,
} from "lucide-react";

interface VisaoGeralModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  detalhesMov: CadDetMovDiario[];
  movimentos: CadMovDiario[];
  produtos: CadProdutos[];
  effectiveUserId: string;
  isAdminViewAll: boolean;
  activeTheme: ThemeColor;
  onDaySelect: (dateStr: string) => void;
  isInline?: boolean;
  controleRetornos?: ControleRetorno[];
}

const MONTHS_PT = [
  "JANEIRO",
  "FEVEREIRO",
  "MARÇO",
  "ABRIL",
  "MAIO",
  "JUNHO",
  "JULHO",
  "AGOSTO",
  "SETEMBRO",
  "OUTUBRO",
  "NOVEMBRO",
  "DEZEMBRO"
];

const WEEKDAYS_PT = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

export default function VisaoGeralModal({
  isOpen = false,
  onClose,
  detalhesMov,
  movimentos,
  produtos,
  effectiveUserId,
  isAdminViewAll,
  activeTheme,
  onDaySelect,
  isInline = false,
  controleRetornos = [],
}: VisaoGeralModalProps) {
  if (!isInline && !isOpen) return null;

  // Track the currently viewed month/year in the calendar
  const [viewDate, setViewDate] = useState(() => new Date());

  const todayStr = useMemo(() => {
    const todayObj = new Date();
    return `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, "0")}-${String(todayObj.getDate()).padStart(2, "0")}`;
  }, []);

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth(); // 0-11

  // Navigation handlers
  const handlePrevMonth = () => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handlePrevYear = () => {
    setViewDate(new Date(currentYear - 1, currentMonth, 1));
  };

  const handleNextYear = () => {
    setViewDate(new Date(currentYear + 1, currentMonth, 1));
  };

  const handleToday = () => {
    setViewDate(new Date());
  };

  // Filter movements belonging to this user (or all if admin view is active)
  const userMovsSet = useMemo(() => {
    const set = new Set<string>();
    movimentos.forEach((m) => {
      if (isAdminViewAll || m.IdUsuarioDono === effectiveUserId) {
        set.add(m.Id);
      }
    });
    return set;
  }, [movimentos, effectiveUserId, isAdminViewAll]);

  // Filter active appointments
  const activeAppointments = useMemo(() => {
    return detalhesMov.filter(
      (det) => det.Ativo && det.IdCadMovDiario && userMovsSet.has(det.IdCadMovDiario)
    );
  }, [detalhesMov, userMovsSet]);

  const scopedRetornos = useMemo(() => {
    if (isAdminViewAll) return controleRetornos;
    return controleRetornos.filter((r) => !r.IdUsuarioDono || r.IdUsuarioDono === effectiveUserId);
  }, [controleRetornos, effectiveUserId, isAdminViewAll]);

  // Group appointments by date string "YYYY-MM-DD"
  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, CadDetMovDiario[]>();
    activeAppointments.forEach((det) => {
      const dStr = det.Data; // Already in "YYYY-MM-DD" format
      if (!map.has(dStr)) {
        map.set(dStr, []);
      }
      map.get(dStr)!.push(det);
    });
    return map;
  }, [activeAppointments]);

  // Generate calendar grid array
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday...
    const numDays = new Date(currentYear, currentMonth + 1, 0).getDate();

    const daysList: { day: number | null; dateStr: string | null; isToday: boolean }[] = [];

    // Padding for days before the start of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      daysList.push({ day: null, dateStr: null, isToday: false });
    }

    // Days of the month
    for (let d = 1; d <= numDays; d++) {
      const mStr = String(currentMonth + 1).padStart(2, "0");
      const dStr = String(d).padStart(2, "0");
      const dateStr = `${currentYear}-${mStr}-${dStr}`;
      daysList.push({
        day: d,
        dateStr,
        isToday: dateStr === todayStr,
      });
    }

    return daysList;
  }, [currentYear, currentMonth, todayStr]);  // Styled event color tags helper
  const getEventTagStyle = (servicoName: string) => {
    const nameLower = servicoName.toLowerCase();
    if (nameLower.includes("banho")) {
      return "bg-emerald-50 text-emerald-800 border border-emerald-200";
    }
    if (nameLower.includes("tosa")) {
      return "bg-sky-50 text-sky-800 border border-sky-200";
    }
    if (nameLower.includes("vacina") || nameLower.includes("consulta") || nameLower.includes("vet")) {
      return "bg-amber-50 text-amber-800 border border-amber-200";
    }
    return "bg-indigo-50 text-indigo-800 border border-indigo-200";
  };

  // Get service display name
  const getServiceName = (servicoId: string) => {
    const p = produtos.find((item) => item.Id === servicoId);
    return p ? p.Nome : servicoId;
  };

  // Helper to resolve colors matching the theme presets exactly
  const themeClasses = useMemo(() => {
    const name = activeTheme.name;
    switch (name) {
      case "emerald":
        return {
          headerBg: "bg-gradient-to-r from-emerald-600 to-emerald-800",
          btnToday: "text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100",
          cellHoverBorder: "hover:border-emerald-400",
          cellIsTodayRing: "ring-2 ring-emerald-500/80 border-emerald-500",
          cellIsTodayBg: "bg-emerald-600 text-white shadow-3xs",
          cellIsTodayText: "text-emerald-600",
          sparkles: "text-emerald-500",
        };
      case "sky":
        return {
          headerBg: "bg-gradient-to-r from-sky-500 to-sky-700",
          btnToday: "text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100",
          cellHoverBorder: "hover:border-sky-400",
          cellIsTodayRing: "ring-2 ring-sky-500/80 border-sky-500",
          cellIsTodayBg: "bg-sky-500 text-white shadow-3xs",
          cellIsTodayText: "text-sky-600",
          sparkles: "text-sky-500",
        };
      case "amber":
        return {
          headerBg: "bg-gradient-to-r from-amber-500 to-amber-700",
          btnToday: "text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100",
          cellHoverBorder: "hover:border-amber-400",
          cellIsTodayRing: "ring-2 ring-amber-500/80 border-amber-500",
          cellIsTodayBg: "bg-amber-500 text-slate-950 shadow-3xs",
          cellIsTodayText: "text-amber-600",
          sparkles: "text-amber-500",
        };
      case "rose":
        return {
          headerBg: "bg-gradient-to-r from-rose-500 to-rose-700",
          btnToday: "text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100",
          cellHoverBorder: "hover:border-rose-400",
          cellIsTodayRing: "ring-2 ring-rose-500/80 border-rose-500",
          cellIsTodayBg: "bg-rose-500 text-white shadow-3xs",
          cellIsTodayText: "text-rose-600",
          sparkles: "text-rose-500",
        };
      case "slate":
        return {
          headerBg: "bg-gradient-to-r from-slate-600 to-slate-800",
          btnToday: "text-slate-700 bg-slate-100 border border-slate-300 hover:bg-slate-200",
          cellHoverBorder: "hover:border-slate-400",
          cellIsTodayRing: "ring-2 ring-slate-500/80 border-slate-500",
          cellIsTodayBg: "bg-slate-700 text-white shadow-3xs",
          cellIsTodayText: "text-slate-600",
          sparkles: "text-slate-500",
        };
      case "purple":
        return {
          headerBg: "bg-gradient-to-r from-purple-600 to-purple-800",
          btnToday: "text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100",
          cellHoverBorder: "hover:border-purple-400",
          cellIsTodayRing: "ring-2 ring-purple-500/80 border-purple-500",
          cellIsTodayBg: "bg-purple-600 text-white shadow-3xs",
          cellIsTodayText: "text-purple-600",
          sparkles: "text-purple-500",
        };
      case "indigo":
      default:
        return {
          headerBg: "bg-gradient-to-r from-indigo-600 to-indigo-800",
          btnToday: "text-indigo-700 bg-indigo-50 border border-indigo-150 hover:bg-indigo-100",
          cellHoverBorder: "hover:border-indigo-400",
          cellIsTodayRing: "ring-2 ring-indigo-500/80 border-indigo-500",
          cellIsTodayBg: "bg-indigo-600 text-white shadow-3xs",
          cellIsTodayText: "text-indigo-600",
          sparkles: "text-indigo-500",
        };
    }
  }, [activeTheme.name]);

  const content = (
    <div className={`w-full bg-white rounded-3xl ${isInline ? 'shadow-xs border border-slate-200' : 'shadow-2xl border border-slate-100'} overflow-hidden flex flex-col transform transition-all` + (!isInline ? " w-full h-full max-w-6xl max-h-[92vh] animate-scale-up" : " h-auto")}>
      {/* Modal Header - Hidden when isInline is true to save vertical space on Visão Geral page */}
      {!isInline && (
        <div className={`px-6 py-3.5 text-white flex items-center justify-between shrink-0 ${themeClasses.headerBg}`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl text-white shadow-xs ${activeTheme.primary}`}>
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display tracking-tight flex items-center gap-1.5">
                Visão Geral Calendário Mensal
              </h2>
              <p className="text-[10px] text-slate-100 font-sans mt-0.5 opacity-90">
                Navegue visualmente por todos os agendamentos cadastrados e clique em qualquer dia para ir diretamente aos detalhes da data.
              </p>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer active:scale-95"
              title="Fechar Calendário"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      )}

      {/* Navigation & Month/Year Display Row */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
        {/* Quick controls left: Year toggle */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl shadow-3xs border border-slate-200 select-none">
          <button
            type="button"
            onClick={handlePrevYear}
            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-all cursor-pointer active:scale-95"
            title="Ano Anterior"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-all cursor-pointer active:scale-95 animate-pulse-subtle"
            title="Mês Anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Centered Month / Year */}
        <div className="flex items-center gap-3">
          <span className="text-base font-black font-mono tracking-wider text-slate-800">
            {MONTHS_PT[currentMonth]} / {currentYear}
          </span>
          <button
            type="button"
            onClick={handleToday}
            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer active:scale-95 shadow-3xs uppercase tracking-wider font-mono ${themeClasses.btnToday}`}
          >
            Hoje
          </button>
        </div>

        {/* Quick controls right: Month toggle */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl shadow-3xs border border-slate-200 select-none">
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-all cursor-pointer active:scale-95"
            title="Próximo Mês"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleNextYear}
            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-all cursor-pointer active:scale-95"
            title="Próximo Ano"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Weekdays Header Grid */}
      <div className="grid grid-cols-7 bg-slate-100/80 border-b border-slate-200 text-center font-mono text-[10px] font-extrabold uppercase tracking-widest text-slate-500 py-2 shrink-0 select-none">
        {WEEKDAYS_PT.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      {/* Monthly Grid Body */}
      <div className="flex-1 bg-slate-50 p-2 select-none">
        <div className="grid grid-cols-7 gap-1 h-full min-h-[340px]">
          {calendarDays.map((cell, idx) => {
            const dayAppts = cell.dateStr ? appointmentsByDate.get(cell.dateStr) || [] : [];
            const hasRetornoAlert = cell.dateStr
              ? scopedRetornos.some((r) => r.DataSugerida === cell.dateStr && r.Status === "Pendente")
              : false;

            return (
              <div
                key={idx}
                onClick={() => {
                  if (cell.dateStr) {
                    onDaySelect(cell.dateStr);
                  }
                }}
                className={`relative min-h-[68px] p-1 rounded-xl border flex flex-col justify-between transition-all select-none overflow-hidden ${
                  cell.day
                    ? `bg-white border-slate-250 cursor-pointer ${themeClasses.cellHoverBorder} hover:shadow-md group active:scale-[0.98]`
                    : "bg-slate-100/45 border-transparent pointer-events-none"
                } ${
                  cell.isToday
                    ? themeClasses.cellIsTodayRing
                    : ""
                }`}
              >
                {/* Day Number */}
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-1">
                    <span
                      className={`font-mono text-[10px] font-bold px-1 py-0.5 rounded-md ${
                        cell.isToday
                          ? themeClasses.cellIsTodayBg
                          : "text-slate-400 group-hover:text-slate-700"
                      }`}
                    >
                      {cell.day}
                    </span>
                    {hasRetornoAlert && (
                      <span className="text-[8px] font-black font-mono tracking-wider text-red-600 bg-red-50 border border-red-200 px-1 py-0.2 rounded-xs shrink-0 animate-pulse" title="Alerta de Retorno Recorrente">
                        ALERTA
                      </span>
                    )}
                  </div>
                  {cell.isToday && (
                    <span className={`text-[8px] font-black font-mono tracking-wider uppercase ${themeClasses.cellIsTodayText}`}>
                      Hoje
                    </span>
                  )}
                  {!cell.isToday && dayAppts.length > 0 && (
                    <span className="text-[8.5px] font-bold text-slate-400 font-mono bg-slate-50 border border-slate-200 px-0.5 rounded-sm shrink-0">
                      {dayAppts.length}
                    </span>
                  )}
                </div>

                {/* Appointments container */}
                <div className="flex-1 space-y-0.5 overflow-y-auto max-h-[46px] custom-scrollbar">
                  {dayAppts.map((appt) => {
                    const serviceName = getServiceName(appt.Servico);
                    const isRetornoOverdue = appt.IdPet 
                      ? scopedRetornos.some((r) => r.IdPet === appt.IdPet && r.Status === "Pendente" && todayStr >= r.DataSugerida)
                      : (appt.NomePet 
                        ? scopedRetornos.some((r) => r.Status === "Pendente" && r.NomePet.trim().toLowerCase() === appt.NomePet.trim().toLowerCase() && todayStr >= r.DataSugerida)
                        : false);

                    return (
                      <div
                        key={appt.Id}
                        className={`flex items-center gap-1 text-[7px] py-[0.5px] px-1 rounded-xs leading-none truncate ${getEventTagStyle(
                          serviceName
                        )} ${isRetornoOverdue ? "!border-red-500 border-2 ring-2 ring-red-500/20 bg-red-50/25" : ""}`}
                        title={`${appt.Hora} - ${appt.NomePet} (${serviceName})${isRetornoOverdue ? " [Retorno Recorrente Pendente]" : ""}`}
                      >
                        <span className="font-extrabold text-slate-950 shrink-0 text-[6px] bg-white/70 px-0.5 py-[0.5px] rounded-xs">
                          {appt.Hora}
                        </span>
                        <span className="font-bold truncate text-slate-800 grow text-[6.5px]">
                          {appt.NomePet} &bull; {serviceName}
                        </span>
                        {appt.Realizado && (
                          <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" title="Realizado" />
                        )}
                        {isRetornoOverdue && (
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0 border border-white animate-pulse" title="Retorno Recorrente" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Background interactive visual accent */}
                {cell.day && (
                  <div className="absolute right-1 bottom-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <Sparkles className={`h-2.5 w-2.5 ${themeClasses.sparkles}`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-slate-100 border-t border-slate-200 px-6 py-2 text-center font-mono text-[9px] text-slate-400 shrink-0 select-none">
        Dica: Serviços marcados com bolinha verde estão concluídos na agenda diária. Clique em qualquer data para abrir.
      </div>
    </div>
  );

  if (isInline) {
    return content;
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 select-none">
      {content}
    </div>
  );
}
