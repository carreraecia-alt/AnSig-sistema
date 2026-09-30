/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from "react";
import { ControleRetorno, ThemeColor } from "../types";
import {
  Search,
  CalendarClock,
  Bell,
  AlertTriangle,
  CheckCircle,
  Trash2,
  Calendar,
  Sparkles,
  ChevronUp,
  ChevronsUp,
  ChevronsDown,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Edit2,
  Check,
  X,
} from "lucide-react";

interface AlertasRetornoProps {
  controleRetornos: ControleRetorno[];
  activeTheme: ThemeColor;
  currentUserOwnerId?: string;
  isAdminViewAll?: boolean;
  onUpdateControleRetornos: (updated: ControleRetorno[]) => void;
  onStartScheduleRetorno: (retorno: ControleRetorno | ControleRetorno[]) => void;
  showConfirm: (
    title: string,
    msg: string,
    onConfirm: () => void,
    onCancel?: () => void,
    confirmText?: string,
    cancelText?: string,
    confirmClass?: string,
    cancelClass?: string
  ) => void;
  showAlert: (title: string, msg: string) => void;
}

export default function AlertasRetornoSheet({
  controleRetornos,
  activeTheme,
  currentUserOwnerId,
  isAdminViewAll = false,
  onUpdateControleRetornos,
  onStartScheduleRetorno,
  showConfirm,
  showAlert,
}: AlertasRetornoProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"TODOS" | "VENCIDO" | "PROXIMO">("TODOS");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempDate, setTempDate] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredList.map((item) => item.Id));
    }
  };

  const handleBatchSchedule = () => {
    if (selectedIds.length === 0) {
      showAlert("Nenhum item selecionado ⚠️", "Por favor, selecione ao menos um pet para agendar.");
      return;
    }

    const selectedItems = processedList.filter((item) => selectedIds.includes(item.Id));
    
    // Check if all selected items belong to the same client
    const firstClientId = selectedItems[0]?.IdCliente;
    const sameClient = selectedItems.every((item) => item.IdCliente === firstClientId);

    if (!sameClient) {
      showAlert(
        "Clientes Diferentes Selecionados ⚠️",
        "Por favor, selecione apenas pets de um mesmo proprietário para agendar em lote no mesmo Movimento Diário."
      );
      return;
    }

    // Call onStartScheduleRetorno with the array of selected items!
    onStartScheduleRetorno(selectedItems);
    setSelectedIds([]); // clear selection after scheduling
  };

  const handleSaveDate = (id: string, newDateStr: string) => {
    if (!newDateStr) {
      showAlert("Data Inválida ⚠️", "Por favor, selecione uma data válida de retorno.");
      return;
    }

    const updated = controleRetornos.map((r) => {
      if (r.Id === id) {
        return {
          ...r,
          DataSugerida: newDateStr,
        };
      }
      return r;
    });

    onUpdateControleRetornos(updated);
    setEditingId(null);
    showAlert("Data Atualizada! ✓", "A data sugerida de retorno foi alterada com sucesso.");
  };

  const tableCardRef = useRef<HTMLDivElement>(null);

  const todayStr = useMemo(() => {
    return new Date().toISOString().split("T")[0];
  }, []);

  // Parse "YYYY-MM-DD" string securely
  const parseDate = (dateStr: string): number => {
    try {
      const [year, month, day] = dateStr.split("-").map(Number);
      return new Date(year, month - 1, day).getTime();
    } catch {
      return 0;
    }
  };

  const processedList = useMemo(() => {
    const pendings = controleRetornos
      .filter((r) => r.Status === "Pendente")
      .filter((r) => isAdminViewAll || !r.IdUsuarioDono || r.IdUsuarioDono === currentUserOwnerId);

    return pendings.map((ret) => {
      const targetTime = parseDate(ret.DataSugerida);
      const todayTime = parseDate(todayStr);
      const diffDays = Math.ceil((targetTime - todayTime) / (1000 * 60 * 60 * 24));

      let badgeType: "Vencido" | "Próximo" = "Próximo";
      let badgeColor = "bg-amber-50 text-amber-800 border-amber-200";
      let statusText = "";

      if (diffDays < 0) {
        badgeType = "Vencido";
        badgeColor = "bg-rose-50 text-rose-800 border-rose-200";
        statusText = `Vencido há ${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? "dia" : "dias"}`;
      } else if (diffDays === 0) {
        badgeType = "Próximo";
        badgeColor = "bg-indigo-50 text-indigo-800 border-indigo-200";
        statusText = "Hoje";
      } else {
        badgeType = "Próximo";
        badgeColor = "bg-emerald-50 text-emerald-800 border-emerald-200";
        statusText = `Em ${diffDays} ${diffDays === 1 ? "dia" : "dias"}`;
      }

      return {
        ...ret,
        badgeType,
        badgeColor,
        statusText,
        diffDays,
      };
    });
  }, [controleRetornos, todayStr]);

  const filteredList = useMemo(() => {
    const list = processedList.filter((item) => {
      // 1. Term search
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        item.NomeCliente.toLowerCase().includes(search) ||
        item.NomePet.toLowerCase().includes(search) ||
        item.NomeServico.toLowerCase().includes(search);

      if (!matchesSearch) return false;

      // 2. Filter type
      if (filterType === "VENCIDO" && item.badgeType !== "Vencido") return false;
      if (filterType === "PROXIMO" && item.badgeType !== "Próximo") return false;

      // 3. Date range filter
      if (startDate && item.DataSugerida < startDate) return false;
      if (endDate && item.DataSugerida > endDate) return false;

      return true;
    });

    // Dynamic sorting by DataSugerida
    return [...list].sort((a, b) => {
      const comp = a.DataSugerida.localeCompare(b.DataSugerida);
      return sortDirection === "asc" ? comp : -comp;
    });
  }, [processedList, searchTerm, filterType, startDate, endDate, sortDirection]);

  const stats = useMemo(() => {
    const total = processedList.length;
    const overdue = processedList.filter((item) => item.badgeType === "Vencido").length;
    const upcoming = processedList.filter((item) => item.badgeType === "Próximo").length;
    return { total, overdue, upcoming };
  }, [processedList]);

  const handleDeleteRetorno = (id: string) => {
    showConfirm(
      "Excluir Alerta de Retorno",
      "Tem certeza que deseja remover este alerta de retorno do painel? Esta ação não pode ser desfeita.",
      () => {
        const updated = controleRetornos.filter((r) => r.Id !== id);
        onUpdateControleRetornos(updated);
        showAlert("Alerta Removido ✓", "O alerta de retorno foi excluído com sucesso.");
      }
    );
  };

  // Helper functions for table quick navigation
  const scrollToTopRetornos = () => {
    tableCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollPageUp = () => {
    const container = tableCardRef.current;
    if (container) {
      const scrollAmount = Math.min(window.innerHeight, container.clientHeight) - 80;
      window.scrollBy({ top: -scrollAmount, behavior: "smooth" });
    } else {
      window.scrollBy({ top: -(window.innerHeight - 80), behavior: "smooth" });
    }
  };

  const scrollPageDown = () => {
    const container = tableCardRef.current;
    if (container) {
      const scrollAmount = Math.min(window.innerHeight, container.clientHeight) - 80;
      window.scrollBy({ top: scrollAmount, behavior: "smooth" });
    } else {
      window.scrollBy({ top: window.innerHeight - 80, behavior: "smooth" });
    }
  };

  const scrollToBottomRetornos = () => {
    tableCardRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  return (
    <div className="space-y-6" ref={tableCardRef}>
      {/* Title Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-800 tracking-tight flex items-center gap-2">
            <Bell className="h-5 w-5 text-indigo-600 animate-bounce" />
            Alertas de Retorno Recorrente
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Acompanhe em formato de grade interativa os pets agendados como Recorrentes e crie novos agendamentos com um clique.
          </p>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Pending */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-3xs">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <CalendarClock className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Total Pendentes
            </span>
            <span className="text-2xl font-black text-slate-800 font-mono">
              {stats.total}
            </span>
          </div>
        </div>

        {/* Overdue */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-3xs">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Vencidos (Atrasados)
            </span>
            <span className="text-2xl font-black text-rose-600 font-mono">
              {stats.overdue}
            </span>
          </div>
        </div>

        {/* Upcoming */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-3xs">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Próximos Retornos
            </span>
            <span className="text-2xl font-black text-emerald-600 font-mono">
              {stats.upcoming}
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar / Filters Consolidated */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-3xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative w-full md:max-w-xs shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por pet, dono ou serviço..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-600 transition"
            />
          </div>

          {/* Date Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Início:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-none text-xs text-slate-700 focus:outline-none font-mono py-0 cursor-pointer max-w-[120px]"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Fim:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-none text-xs text-slate-700 focus:outline-none font-mono py-0 cursor-pointer max-w-[120px]"
              />
            </div>

            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-150 text-[11px] font-bold rounded-xl transition-all cursor-pointer active:scale-95"
              >
                Limpar Período
              </button>
            )}
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1.5 self-start xl:self-auto overflow-x-auto max-w-full pb-1 xl:pb-0 shrink-0">
          <button
            onClick={() => setFilterType("TODOS")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition ${
              filterType === "TODOS"
                ? "bg-slate-800 text-white font-bold"
                : "bg-slate-100 hover:bg-slate-250 text-slate-600"
            }`}
          >
            Todos ({stats.total})
          </button>
          <button
            onClick={() => setFilterType("VENCIDO")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition ${
              filterType === "VENCIDO"
                ? "bg-rose-600 text-white font-bold"
                : "bg-rose-50 hover:bg-rose-100 text-rose-700"
            }`}
          >
            Vencidos ({stats.overdue})
          </button>
          <button
            onClick={() => setFilterType("PROXIMO")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition ${
              filterType === "PROXIMO"
                ? "bg-emerald-600 text-white font-bold"
                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
            }`}
          >
            Próximos ({stats.upcoming})
          </button>
        </div>
      </div>

      {/* Batch Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
              <Check className="h-4 w-4 font-bold" />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-900">
                {selectedIds.length} {selectedIds.length === 1 ? "item selecionado" : "itens selecionados"}
              </p>
              <p className="text-[10px] text-indigo-600 mt-0.5">
                Você pode agendar todos no mesmo Movimento Diário se pertencerem ao mesmo cliente.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold rounded-xl cursor-pointer transition active:scale-95 text-center"
            >
              Desmarcar Todos
            </button>
            <button
              onClick={handleBatchSchedule}
              className={`px-4 py-1.5 text-white text-xs font-bold rounded-xl cursor-pointer transition flex items-center gap-1.5 active:scale-95 shadow-xs ${activeTheme.primary}`}
            >
              <Calendar className="h-4 w-4" />
              Agendar Selecionados em Lote
            </button>
          </div>
        </div>
      )}

      {/* Spreadsheet / Grid Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-3xs">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse table-fixed min-w-[950px]">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-mono text-[10px] uppercase font-semibold">
                <th className="w-12 p-3 border-r border-slate-200 text-center">
                  <input
                    type="checkbox"
                    checked={filteredList.length > 0 && selectedIds.length === filteredList.length}
                    onChange={handleToggleSelectAll}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                  />
                </th>
                <th className="w-48 p-3 border-r border-slate-200">Nome do Pet</th>
                <th className="w-52 p-3 border-r border-slate-200">Dono / Proprietário (Cliente)</th>
                <th className="w-48 p-3 border-r border-slate-200">Último Serviço Prestado</th>
                <th
                  className="w-40 p-3 border-r border-slate-200 cursor-pointer select-none hover:bg-slate-200/60 active:bg-slate-200 transition-colors group/header"
                  onClick={() => setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))}
                  title="Clique para ordenar por data (crescente / decrescente)"
                >
                  <div className="flex items-center justify-between">
                    <span>Data Sugerida de Retorno</span>
                    <span className="p-0.5 rounded bg-slate-200/50 text-indigo-600 group-hover/header:bg-slate-200 transition-colors shrink-0">
                      {sortDirection === "asc" ? (
                        <ArrowUp className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5" />
                      )}
                    </span>
                  </div>
                </th>
                <th className="w-40 p-3 border-r border-slate-200">Status</th>
                <th className="w-36 p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-mono">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 bg-white font-sans text-xs">
                    Nenhum alerta de retorno pendente encontrado.
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => {
                  return (
                    <tr
                      key={item.Id}
                      className={`hover:bg-slate-50/80 transition-colors group ${
                        idx % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                      }`}
                    >
                      {/* CHECKBOX */}
                      <td className="p-3 border-r border-slate-100 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.Id)}
                          onChange={() => handleToggleSelect(item.Id)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                        />
                      </td>

                      {/* NOME DO PET */}
                      <td className="p-3 border-r border-slate-100 font-bold text-slate-800">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-indigo-500 shrink-0" />
                          <span className="truncate">{item.NomePet}</span>
                        </div>
                      </td>

                      {/* DONO / PROPRIETÁRIO */}
                      <td className="p-3 border-r border-slate-100 font-semibold text-slate-700">
                        <span className="truncate">{item.NomeCliente}</span>
                      </td>

                      {/* ÚLTIMO SERVIÇO */}
                      <td className="p-3 border-r border-slate-100 text-slate-600">
                        <span className="truncate" title={item.NomeServico}>
                          {item.NomeServico}
                        </span>
                      </td>

                      {/* DATA SUGERIDA */}
                      <td className="p-3 border-r border-slate-100 text-slate-800 font-medium group/cell min-w-[170px]">
                        {editingId === item.Id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="date"
                              value={tempDate}
                              onChange={(e) => setTempDate(e.target.value)}
                              className="px-2 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleSaveDate(item.Id, tempDate);
                                } else if (e.key === "Escape") {
                                  setEditingId(null);
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveDate(item.Id, tempDate)}
                              className="p-1 hover:bg-emerald-50 text-emerald-600 rounded transition"
                              title="Salvar"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="p-1 hover:bg-rose-50 text-rose-600 rounded transition"
                              title="Cancelar"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div
                            className="flex items-center justify-between cursor-pointer py-1 px-1.5 -mx-1.5 rounded-lg hover:bg-slate-100/70 transition-colors"
                            onClick={() => {
                              setEditingId(item.Id);
                              setTempDate(item.DataSugerida);
                            }}
                            title="Clique para editar esta data"
                          >
                            <span>{item.DataSugerida.split("-").reverse().join("/")}</span>
                            <Edit2 className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover/cell:opacity-100 transition-opacity ml-1 shrink-0" />
                          </div>
                        )}
                      </td>

                      {/* STATUS */}
                      <td className="p-3 border-r border-slate-100 font-medium">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-bold font-mono ${item.badgeColor}`}
                        >
                          {item.statusText}
                        </span>
                      </td>

                      {/* AÇÕES */}
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => onStartScheduleRetorno(item)}
                            className={`px-3 py-1.5 font-bold rounded-xl text-white text-[11px] cursor-pointer transition flex items-center gap-1 active:scale-95 shadow-3xs ${activeTheme.primary}`}
                            title="Criar agendamento a partir deste retorno"
                          >
                            <Calendar className="h-3 w-3" />
                            Agendar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRetorno(item.Id)}
                            className="p-2 bg-rose-50 hover:bg-rose-100 border border-rose-150 text-rose-600 hover:text-rose-700 rounded-xl transition cursor-pointer"
                            title="Excluir Alerta"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info message */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 font-mono text-center">
          Os alertas expiram automaticamente assim que o novo agendamento sugerido para o pet é concluído na agenda.
        </div>
      </div>
    </div>
  );
}
