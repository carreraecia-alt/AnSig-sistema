// BLINDAGEM DE CUSTOS & TRAVAMENTO DE PERSISTÊNCIA EM SEGUNDO PLANO:
// Fica expressamente determinado que este painel de controle (Modo Deus) só interage com os registros de consumo de IA
// sob demanda estrita e direta por meio de evento de clique manual ("Atualizar Consumo" ou "Simular & Registrar Consumo").
// O aplicativo é totalmente proibido de manter conexões abertas de segundo plano (como websockets, polling de loop contínuo,
// ou setInterval de varredura) para monitorar as tabelas de movimentação diária, protegendo contra loops infinitos de processamento.

import React, { useState, useMemo } from "react";
import { DatabaseState, CadUsuario, AiConsumptionLog, CadRaca } from "../types";
import { INITIAL_BREEDS } from "../data/initialBreeds";
import {
  Activity, TrendingUp, Coins, Users, ShieldAlert, Layers, Calendar,
  Plus, Search, ArrowUpRight, BarChart3, Sparkles, RefreshCw, Eye, Check
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import JsonBackupImporter from "./JsonBackupImporter";
import SqlBackupRestore from "./SqlBackupRestore";

interface AdminGodModeDashboardProps {
  db: DatabaseState;
  onUpdateDbState: (updateFn: (prev: DatabaseState) => DatabaseState) => void;
  currentUser: CadUsuario;
  activeTheme: {
    primary: string;
    bgLightHex: string;
    accent: string;
    text: string;
    border: string;
  };
}

export default function AdminGodModeDashboard({
  db,
  onUpdateDbState,
  currentUser,
  activeTheme
}: AdminGodModeDashboardProps) {
  // Local snapshots of AI logs to prevent automatic reactivity (manual pull only)
  const [localLogs, setLocalLogs] = useState<AiConsumptionLog[]>(() => db.aiConsumo || []);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Period filters: "todo" (All historical) | "atual" (Mês atual)
  const [periodFilter, setPeriodFilter] = useState<"todo" | "atual">("todo");

  // Dynamically compute current year-month prefix
  const currentYearMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`; // e.g., "2026-06"
  }, []);

  // Compute active logs filtered by period selection
  const activeLogs = useMemo(() => {
    if (periodFilter === "atual") {
      return localLogs.filter(log => log.DataHora && log.DataHora.startsWith(currentYearMonth));
    }
    return localLogs;
  }, [localLogs, periodFilter, currentYearMonth]);

  // Handler for manual pull of consumption from database
  const handleRefreshConsumo = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLocalLogs(db.aiConsumo || []);
      setIsRefreshing(false);
    }, 600); // Friendly layout transition latency
  };
  
  // Dashboard Modes: "todos" | "individual" | "comparar"
  const [filterMode, setFilterMode] = useState<"todos" | "individual" | "comparar">("todos");
  
  // For Individual Mode: active single user ID
  const [selectedIndividualUser, setSelectedIndividualUser] = useState<string>(() => {
    return db.usuarios[0]?.Id || "";
  });
  
  // For Comparison Mode: Set of active user IDs to compare
  const [comparedUserIds, setComparedUserIds] = useState<Set<string>>(() => {
    return new Set(db.usuarios.map(u => u.Id));
  });

  // Simulator Drawer/Form states
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatorUserId, setSimulatorUserId] = useState(currentUser.Id);
  const [simulatorReportType, setSimulatorReportType] = useState("Resumo de Atendimentos");
  const [simulationPromptResult, setSimulationPromptResult] = useState<string | null>(null);

  // Table search & order
  const [searchTerm, setSearchTerm] = useState("");
  const [orderBy, setOrderBy] = useState<"desc" | "asc">("desc");

  // Helper mapping of User ID to User metadata
  const userMap = useMemo(() => {
    const map = new Map<string, CadUsuario>();
    db.usuarios.forEach(u => map.set(u.Id, u));
    return map;
  }, [db.usuarios]);

  // Toggle compared users
  const handleToggleComparedUser = (userId: string) => {
    const nextSet = new Set(comparedUserIds);
    if (nextSet.has(userId)) {
      if (nextSet.size > 1) { // keep at least one
        nextSet.delete(userId);
      }
    } else {
      nextSet.add(userId);
    }
    setComparedUserIds(nextSet);
  };

  // Group AI consumption logs by unique date (YYYY-MM-DD)
  // Recharts needs a flat chronological list of dates where each key represents a line
  const chartData = useMemo(() => {
    // 1. Collect all unique dates formatted as YYYY-MM-DD
    const dateGroupsMap: { [date: string]: { [userId: string]: number; Total: number } } = {};
    
    // Seed default days in early June if needed, or collect from logs
    activeLogs.forEach(log => {
      if (!log.DataHora) return;
      const dateOnly = log.DataHora.split(" ")[0]; // Get YYYY-MM-DD
      if (!dateGroupsMap[dateOnly]) {
        dateGroupsMap[dateOnly] = { Total: 0 };
        // Pre-fill all existing user keys with 0
        db.usuarios.forEach(u => {
          dateGroupsMap[dateOnly][u.Id] = 0;
        });
      }
      
      const val = log.TotalTokens || 0;
      dateGroupsMap[dateOnly][log.IdUsuario] = (dateGroupsMap[dateOnly][log.IdUsuario] || 0) + val;
      dateGroupsMap[dateOnly].Total += val;
    });

    // 2. Format into flat array sorted chronologically
    const sortedDates = Object.keys(dateGroupsMap).sort();
    
    return sortedDates.map(dateStr => {
      const entry = dateGroupsMap[dateStr];
      // Format YYYY-MM-DD to DD/MM for aesthetic chart labels
      const parts = dateStr.split("-");
      const formattedLabel = parts.length === 3 ? `${parts[2]}/${parts[1]}` : dateStr;
      
      const payload: any = {
        dateRaw: dateStr,
        label: formattedLabel,
        Total: entry.Total
      };
      
      // Map user tokens with clean column keys
      db.usuarios.forEach(u => {
        payload[u.Nome] = entry[u.Id] || 0;
        // Also map under clean user ID
        payload[u.Id] = entry[u.Id] || 0;
      });
      
      return payload;
    });
  }, [activeLogs, db.usuarios]);

  // General computed stats for display widgets
  const computedMetrics = useMemo(() => {
    let logsFiltered = activeLogs;
    if (filterMode === "individual") {
      logsFiltered = activeLogs.filter(log => log.IdUsuario === selectedIndividualUser);
    } else if (filterMode === "comparar") {
      logsFiltered = activeLogs.filter(log => comparedUserIds.has(log.IdUsuario));
    }

    const totalInput = logsFiltered.reduce((acc, current) => acc + (current.InputTokens || 0), 0);
    const totalOutput = logsFiltered.reduce((acc, current) => acc + (current.OutputTokens || 0), 0);
    const totalTokens = totalInput + totalOutput;
    
    // Mock financial calculation ($0.075 per 1M input tokens + $0.30 per 1M output tokens for Flash model)
    const costInput = (totalInput / 1000000) * 0.075;
    const costOutput = (totalOutput / 1000000) * 0.30;
    const estimatedCostUsd = costInput + costOutput;

    return {
      totalRequests: logsFiltered.length,
      totalInput,
      totalOutput,
      totalTokens,
      estimatedCostUsd: Number(estimatedCostUsd.toFixed(5)),
      avgPromptLength: logsFiltered.length > 0 ? Math.round(totalTokens / logsFiltered.length) : 0
    };
  }, [activeLogs, filterMode, selectedIndividualUser, comparedUserIds]);

  // Color map for users so each user has a static beautiful line color
  const userColors = useMemo(() => {
    const palette = [
      "#6366f1", // Indigo
      "#f59e0b", // Amber
      "#ec4899", // Pink
      "#3b82f6", // Blue
      "#10b981", // Emerald
      "#ef4444", // Red
      "#8b5cf6", // Purple
      "#06b6d4"  // Cyan
    ];
    const colors: { [userId: string]: string } = {};
    db.usuarios.forEach((u, idx) => {
      colors[u.Nome] = palette[idx % palette.length];
      colors[u.Id] = palette[idx % palette.length];
    });
    return colors;
  }, [db.usuarios]);

  // Filter and sort raw logs for log auditor
  const filteredAndSortedLogs = useMemo(() => {
    let result = [...activeLogs];
    
    // search text filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(log => 
        log.NomeUsuario.toLowerCase().includes(q) ||
        log.TipoRequisicao.toLowerCase().includes(q) ||
        log.DataHora.includes(q)
      );
    }

    // mode filters
    if (filterMode === "individual") {
      result = result.filter(log => log.IdUsuario === selectedIndividualUser);
    } else if (filterMode === "comparar") {
      result = result.filter(log => comparedUserIds.has(log.IdUsuario));
    }

    // sorting
    result.sort((a, b) => {
      if (!a.DataHora || !b.DataHora) return 0;
      const timeA = new Date(a.DataHora.replace(" ", "T")).getTime();
      const timeB = new Date(b.DataHora.replace(" ", "T")).getTime();
      return orderBy === "desc" ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [activeLogs, filterMode, selectedIndividualUser, comparedUserIds, searchTerm, orderBy]);

  // Process a simulation request to create random new analytical log
  const handleSimulateAiCall = (e: React.FormEvent) => {
    e.preventDefault();

    const requestingUser = userMap.get(simulatorUserId);
    if (requestingUser && (requestingUser.Nome === "petshop_pro" || requestingUser.Id === "user-2")) {
      alert("PROIBIDO: O perfil petshop_pro está marcado como Inativo/Background e totalmente bloqueado de acionar APIs ou consumir tokens do Gemini por salvaguarda de custo.");
      return;
    }

    setIsSimulating(true);
    setSimulationPromptResult(null);

    // Simulate standard prompt execution latency
    setTimeout(() => {
      const requestingUser = userMap.get(simulatorUserId);
      const randInput = Math.floor(Math.random() * 800) + 1200; // 1200 - 2000
      const randOutput = Math.floor(Math.random() * 400) + 300; // 300 - 700
      const total = randInput + randOutput;

      const dateObj = new Date();
      // Format YYYY-MM-DD HH:MM
      const y = dateObj.getFullYear();
      const m = String(dateObj.getMonth() + 1).padStart(2, "0");
      const d = String(dateObj.getDate()).padStart(2, "0");
      const hr = String(dateObj.getHours()).padStart(2, "0");
      const mn = String(dateObj.getMinutes()).padStart(2, "0");
      const formattedTimestamp = `${y}-${m}-${d} ${hr}:${mn}`;

      const newLog: AiConsumptionLog = {
        Id: `ai-simulated-${Date.now()}`,
        IdUsuario: simulatorUserId,
        NomeUsuario: requestingUser?.Nome || "Operador",
        TipoRequisicao: simulatorReportType,
        DataHora: formattedTimestamp,
        InputTokens: randInput,
        OutputTokens: randOutput,
        TotalTokens: total
      };

      // Heuristically generate a cute prompt result matching selected report
      let feedback = "";
      if (simulatorReportType === "Resumo de Atendimentos") {
        feedback = `[Análise IA Flash]: O operador ${requestingUser?.Nome} realizou auditoria de agendamentos. Foram identificados 3 clientes reincidentes esta semana. Recomenda-se disparar mensagem promocional de retorno.`;
      } else if (simulatorReportType === "Análise Comercial") {
        feedback = `[Análise IA Flash]: Processando faturamento do dia. Ticket médio sob controle (R$ 55,00). Recomendação de inteligência: ofertar hidratação de pelos como up-selling para cães de porte grande.`;
      } else {
        feedback = `[Análise IA Flash]: Produtividade de agendamento em alta. 96% de atendimentos marcados como concluídos com sucesso hoje. Nenhum atraso recorrente observado.`;
      }

      onUpdateDbState((prev) => {
        const nextConsumo = prev.aiConsumo ? [...prev.aiConsumo, newLog] : [newLog];
        return {
          ...prev,
          aiConsumo: nextConsumo
        };
      });

      // Update local snapshotted logs as well so simulation reflects immediately
      setLocalLogs((prev) => [...prev, newLog]);

      setSimulationPromptResult(feedback);
      setIsSimulating(false);
    }, 1200);
  };

  // Forced sync for luizcarrera
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleForceSyncLuizCarrera = () => {
    setIsSyncing(true);
    setSyncStatus("Localizando usuário 'luizcarrera'...");

    setTimeout(() => {
      onUpdateDbState((prev) => {
        const oldUsers = prev.usuarios || [];
        let targetUser = oldUsers.find(u => u.Nome.toLowerCase() === "luizcarrera");
        let updatedUsers = [...oldUsers];

        if (!targetUser) {
          targetUser = {
            Id: "user-luizcarrera",
            Nome: "luizcarrera",
            Senha: "luiz",
            Permissoes: "Usuário",
            Tipo_Assinatura: "Mensal",
            Data_Inicio: "2026-06-05",
            Data_Validade: "2027-06-05"
          };
          updatedUsers.push(targetUser);
        }

        const targetUserId = targetUser.Id;
        const otherRacas = (prev.racas || []).filter(r => r.IdUsuarioDono !== targetUserId);
        
        const luizcarreraBreeds = INITIAL_BREEDS.map((r, index) => ({
          Id: `raca-std-${targetUserId}-${index + 1}`,
          Raca: r.Raca,
          Especie: r.Especie,
          IdUsuarioDono: targetUserId,
          status_registro: "padrão"
        }));

        const updatedRacas = [...otherRacas, ...luizcarreraBreeds];

        const hasInfo = (prev.infoContas || []).some(i => i.IdUsuarioDono === targetUserId);
        let updatedInfo = prev.infoContas ? [...prev.infoContas] : [];
        if (!hasInfo) {
          updatedInfo.push({
            Id: `info-${targetUserId}-${Date.now()}`,
            NomeEmpresa: "Pet Shop de luizcarrera",
            Logo: "",
            Endereco: "Endereço Padrão, 123 - Cidade",
            Fone: "(00) 00000-0000",
            CorFundo: "emerald",
            IdUsuarioDono: targetUserId
          });
        }

        setSyncStatus(`Sincronização realizada! ${luizcarreraBreeds.length} raças padrão vinculadas.`);
        setIsSyncing(false);

        return {
          ...prev,
          usuarios: updatedUsers,
          racas: updatedRacas,
          infoContas: updatedInfo
        };
      });
    }, 1200);
  };

  return (
    <div className="space-y-6">
      
      {/* SECTION 1: HEADER BANNER WITH GOD MODE NOTICE */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-md text-white overflow-hidden relative">
        <div className="absolute right-0 top-0 h-40 w-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 h-28 w-28 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-900/40 border border-indigo-500/20 rounded-full text-xs font-semibold text-indigo-300 font-mono">
            <ShieldAlert className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
            <span>Acesso Restrito: Administrador (Modo Deus)</span>
          </div>
          
          <h1 className="text-xl md:text-2xl font-black tracking-tight font-sans">
            Controle de Consumo de IA <span className="text-indigo-400 font-mono text-sm uppercase px-1.5 py-0.5 bg-slate-850 rounded-md">God Mode</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl font-sans">
            Audite o tráfego de requisições, volume de tokens, e os custos computacionais da API da Inteligência Artificial do Gemini por operador em tempo real.
          </p>
        </div>

        <div className="mt-4 md:mt-0 flex items-center gap-2 relative z-10">
          <div className="px-4.5 py-2.5 bg-slate-850/80 border border-slate-800 rounded-xl flex items-center gap-3">
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Activity className="h-4 w-4" />
            </span>
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Status API</div>
              <div className="text-xs font-extrabold flex items-center gap-1.5 text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                Desejável (GCP Active)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: ANALYTICAL METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Total de Chamadas</span>
            <div className="text-2xl font-black text-slate-800">{computedMetrics.totalRequests}</div>
            <p className="text-[10px] text-slate-500">Requisições IA registradas</p>
          </div>
          <p className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Sparkles className="h-5 w-5" /></p>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Tokens Processados</span>
            <div className="text-2xl font-black text-slate-800 font-mono">
              {computedMetrics.totalTokens >= 1000 ? `${(computedMetrics.totalTokens / 1000).toFixed(1)}k` : computedMetrics.totalTokens}
            </div>
            <p className="text-[10px] text-slate-500 font-mono">
              In: {computedMetrics.totalInput >= 1000 ? `${(computedMetrics.totalInput / 1000).toFixed(1)}k` : computedMetrics.totalInput} | Out: {computedMetrics.totalOutput >= 1000 ? `${(computedMetrics.totalOutput / 1000).toFixed(1)}k` : computedMetrics.totalOutput}
            </p>
          </div>
          <p className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Coins className="h-5 w-5" /></p>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Média por Prompt</span>
            <div className="text-2xl font-black text-slate-800 font-mono">{computedMetrics.avgPromptLength}</div>
            <p className="text-[10px] text-slate-500">Tokens médios por chamada</p>
          </div>
          <p className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><BarChart3 className="h-5 w-5" /></p>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Custo Estimado (GCP)</span>
            <div className="text-2xl font-black text-slate-800 font-mono text-emerald-600">
              ${computedMetrics.estimatedCostUsd > 0 ? computedMetrics.estimatedCostUsd.toFixed(4) : "0.00"}
            </div>
            <p className="text-[10px] text-slate-500">Baseado em tarifas de IA Flash</p>
          </div>
          <span className="p-3 bg-rose-50 text-rose-600 rounded-xl"><TrendingUp className="h-5 w-5" /></span>
        </div>

      </div>

      {/* SECTION 3: LINE CHART PANEL WITH SELECTORS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        
        {/* Selector & Mode controls header */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Gráfico de Uso de Tokens ao Longo do Tempo</h2>
            <p className="text-xs text-slate-500">
              Veja o volume total de tokens acumulados e compare perfis de operacionais.
            </p>
            
            {/* Manual Sync controls & Period controls row */}
            <div className="flex flex-wrap items-center gap-2 pt-1.5">
              <button
                type="button"
                onClick={handleRefreshConsumo}
                disabled={isRefreshing}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-xl transition-all shadow-3xs cursor-pointer hover:bg-indigo-100/70 active:scale-98 ${
                  isRefreshing ? "opacity-60 cursor-not-allowed" : ""
                }`}
              >
                <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
                <span>{isRefreshing ? "Atualizando..." : "Atualizar Consumo"}</span>
              </button>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl select-none">
                <button
                  type="button"
                  onClick={() => setPeriodFilter("todo")}
                  className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    periodFilter === "todo"
                      ? "bg-white text-slate-900 border border-slate-200/50 shadow-3xs font-black"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Todo o Período
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodFilter("atual")}
                  className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    periodFilter === "atual"
                      ? "bg-white text-slate-900 border border-slate-200/50 shadow-3xs font-black"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Atual
                </button>
              </div>
            </div>
          </div>

          {/* SEMENTED VIEW SELECTOR MODE */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            
            {/* Segmentation tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl select-none w-full sm:w-auto justify-between">
              <button
                type="button"
                onClick={() => setFilterMode("todos")}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  filterMode === "todos"
                    ? "bg-white text-slate-900 border border-slate-200/50 shadow-3xs font-extrabold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Todos (Total)
              </button>
              
              <button
                type="button"
                onClick={() => setFilterMode("individual")}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  filterMode === "individual"
                    ? "bg-white text-slate-900 border border-slate-200/50 shadow-3xs font-extrabold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Individual
              </button>
              
              <button
                type="button"
                onClick={() => setFilterMode("comparar")}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  filterMode === "comparar"
                    ? "bg-white text-slate-900 border border-slate-200/50 shadow-3xs font-extrabold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Comparar Perfis
              </button>
            </div>

            {/* DYNAMIC MODE CONTROLS */}
            {filterMode === "individual" && (
              <div className="w-full sm:w-auto">
                <select
                  value={selectedIndividualUser}
                  onChange={(e) => setSelectedIndividualUser(e.target.value)}
                  className="w-full sm:w-56 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl text-slate-700 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                >
                  {db.usuarios.map(u => (
                    <option key={u.Id} value={u.Id}>
                      {u.Nome} ({u.Permissoes}) [{u.Segmento === "lavarapido" ? "🚗 Lava Rápido" : "🐶 Pet Shop"}]
                    </option>
                  ))}
                </select>
              </div>
            )}

            {filterMode === "comparar" && (
              <div className="flex flex-wrap items-center gap-1.5">
                {db.usuarios.map(u => {
                  const isActive = comparedUserIds.has(u.Id);
                  const col = userColors[u.Nome] || "#cbd5e1";
                  const segIcon = u.Segmento === "lavarapido" ? "🚗" : "🐶";
                  return (
                    <button
                      key={u.Id}
                      type="button"
                      onClick={() => handleToggleComparedUser(u.Id)}
                      className={`px-2.5 py-1 text-[11px] font-semibold border rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                        isActive
                          ? "bg-slate-50 text-slate-800 border-slate-350 shadow-3xs"
                          : "bg-white text-slate-400 border-slate-200 opacity-60"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: col }} />
                      <span className="text-[10px]">{segIcon}</span>
                      <span>{u.Nome}</span>
                      {isActive && <Check className="h-3 w-3 text-slate-550 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}

          </div>
        </div>

        {/* LINE CHART GRAPH AREA WITH RECHARTS */}
        <div className="w-full h-80 bg-slate-950 p-4 rounded-2xl relative overflow-hidden shadow-inner border border-slate-900">
          <div className="absolute top-3 left-4 text-[9px] font-mono text-slate-500 select-none uppercase tracking-widest z-10">
            Escala Log: Total de Tokens Filtrados
          </div>

          {/* Empty state visual overlay handler */}
          {chartData.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20 bg-slate-950/90 rounded-2xl">
              <BarChart3 className="h-8 w-8 text-indigo-400/40 mb-2 animate-pulse" />
              <p className="text-xs font-bold text-slate-300">Nenhum registro de consumo localizado</p>
              <p className="text-[10px] text-slate-500 font-mono mt-1">
                Filtro corrente: {periodFilter === "atual" ? "Mês Atual" : "Todo o Período"}
              </p>
            </div>
          ) : null}

          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 15, left: -22, bottom: 5 }}
            >
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis 
                dataKey="label" 
                stroke="#64748b" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(tick) => (tick >= 1000 ? `${(tick / 1000).toFixed(0)}k` : tick)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#334155",
                  borderWidth: "1px",
                  borderRadius: "12px",
                  fontSize: "11px",
                  color: "#f1f5f9",
                  fontFamily: "monospace"
                }}
                labelStyle={{ fontWeight: "bold", color: "#94a3b8", marginBottom: "4px" }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36} 
                iconType="circle"
                wrapperStyle={{ fontSize: "11px", paddingTop: "12px", color: "#94a3b8" }}
              />

              {/* RENDER LINES DEPENDING ON ACTIVE MODE */}
              {filterMode === "todos" && (
                <Line
                  type="monotone"
                  dataKey="Total"
                  name="Tokens Acumulados"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  activeDot={{ r: 6 }}
                  dot={{ r: 3, strokeWidth: 1 }}
                />
              )}

              {filterMode === "individual" && (
                <Line
                  type="monotone"
                  dataKey={db.usuarios.find(u => u.Id === selectedIndividualUser)?.Nome || "Total"}
                  name={`${db.usuarios.find(u => u.Id === selectedIndividualUser)?.Nome || "Usuário"} (Tokens)`}
                  stroke={userColors[db.usuarios.find(u => u.Id === selectedIndividualUser)?.Nome || "Total"] || "#6366f1"}
                  strokeWidth={3}
                  activeDot={{ r: 6 }}
                  dot={{ r: 3, strokeWidth: 1 }}
                />
              )}

              {filterMode === "comparar" && 
                db.usuarios.map(u => {
                  if (!comparedUserIds.has(u.Id)) return null;
                  return (
                    <Line
                      key={u.Id}
                      type="monotone"
                      dataKey={u.Nome}
                      name={u.Nome}
                      stroke={userColors[u.Nome]}
                      strokeWidth={2.5}
                      activeDot={{ r: 5 }}
                      dot={{ r: 2.5 }}
                    />
                  );
                })
              }
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Informative footer */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 border border-slate-150 rounded-xl gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="h-2 w-2 rounded-full bg-indigo-500" />
            <span>Tarifa base do <strong>Gemini 1.5 Flash</strong> ativa: $0.075 por 1M Input / $0.30 por 1M Output.</span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono font-bold">Consumo Computacional Isolado</p>
        </div>

      </div>

      {/* SQL BACKUP RESTORE (.SQL / .TXT) */}
      <SqlBackupRestore
        currentUser={currentUser}
        currentDb={db}
        onUpdateDbState={onUpdateDbState}
      />

      {/* JSON BACKUP IMPORTER (OFFLINE / SQLITE / LOCAL) */}
      <JsonBackupImporter currentDb={db} onUpdateDbState={onUpdateDbState} />

      {/* DEVELOPER FORCED SYNC PANEL */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 animate-fadeIn">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-rose-500 mb-1">
              <RefreshCw className="h-4 w-4 text-rose-500 animate-spin-slow" />
              <span className="text-[10px] uppercase font-bold tracking-wider font-mono">Sincronização de Dados de Segurança</span>
            </div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Forçar Sincronização de Raças ('Base Padrão')</h2>
            <p className="text-xs text-slate-500">
              Restaura e sincroniza todos os registros da biblioteca padrão de raças (status_registro = 'padrão') para o perfil de operadores cadastrados.
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-50 border border-slate-100 rounded-2xl p-5">
          <div className="space-y-1.5 flex-1">
            <span className="text-xs font-bold text-slate-700">Operador Destinatário:</span>
            <div className="flex items-center gap-2.5">
              <span className="text-xs bg-indigo-100 text-indigo-700 font-mono px-2.5 py-1 py-0.5 rounded-lg font-bold">
                luizcarrera
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                ID Coleção Vinculada: user-luizcarrera
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Esta ação localizará o perfil de <strong>luizcarrera</strong> (ou criará um caso não exista) e forçará a sincronização de todas as {INITIAL_BREEDS.length} raças da Base Padrão com a flag <code>status_registro: "padrão"</code>, integrando os dados e atualizando o backup em tempo real no Firestore de forma isolada.
            </p>
          </div>

          <div className="shrink-0 w-full md:w-auto flex flex-col gap-2">
            <button
              type="button"
              onClick={handleForceSyncLuizCarrera}
              disabled={isSyncing}
              className={`w-full md:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-98 cursor-pointer`}
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "Sincronizando..." : "Executar Sincronização Forçada"}</span>
            </button>
            {syncStatus && (
              <span className="text-[10px] font-semibold text-emerald-600 text-center max-w-[200px] leading-tight bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                {syncStatus}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 4: INTERACTIVE AI REQUEST SIMULATOR & LOG LIST */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 1. Request Simulator Form */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-1.5 text-indigo-600 mb-1">
              <Sparkles className="h-4 w-4" />
              <span className="text-[10px] uppercase font-bold tracking-wider font-mono">Controle de Testes</span>
            </div>
            <h3 className="text-sm font-bold text-slate-800">Simulador de Transações de IA</h3>
            <p className="text-xs text-slate-500">
              Dispare uma requisição fictícia para simular processamento e registrar tokens imediatamente.
            </p>
          </div>

          <form onSubmit={handleSimulateAiCall} className="space-y-4">
            
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Operador Solicitante
              </label>
              <select
                value={simulatorUserId}
                onChange={(e) => setSimulatorUserId(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-700 text-xs font-semibold focus:outline-hidden"
              >
                {db.usuarios.map(u => (
                  <option key={u.Id} value={u.Id}>
                    {u.Nome} ({u.Permissoes}) [{u.Segmento === "lavarapido" ? "🚗 Lava Rápido" : "🐶 Pet Shop"}]
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Tipo do Relatório / Requisição
              </label>
              <select
                value={simulatorReportType}
                onChange={(e) => setSimulatorReportType(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3.5 py-2.5 rounded-xl text-slate-700 text-xs font-semibold focus:outline-hidden"
              >
                <option value="Resumo de Atendimentos">Resumo Inteligente de Atendimentos</option>
                <option value="Análise Comercial">Análise Comercial e Faturamento</option>
                <option value="Análise de Desempenho">Análise de Produtividade do Operador</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSimulating}
              className={`w-full py-3 rounded-xl text-xs font-bold text-white shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isSimulating 
                  ? "bg-slate-400 cursor-not-allowed" 
                  : "bg-indigo-600 hover:bg-indigo-750 active:scale-98"
              }`}
            >
              {isSimulating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Processando Prompts...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Simular & Registrar Consumo</span>
                </>
              )}
            </button>
          </form>

          {/* Prompt result mock analysis display */}
          {simulationPromptResult && (
            <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-1.5 animate-fadeIn">
              <div className="flex items-center justify-between text-[10px] text-indigo-400 font-mono font-bold uppercase tracking-wider">
                <span>Resultado do Gemini</span>
                <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-md">Usage OK</span>
              </div>
              <p className="text-xs text-slate-650 leading-relaxed font-sans">{simulationPromptResult}</p>
            </div>
          )}

        </div>

        {/* 2. Audit Trail Log List */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 lg:col-span-2">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Trilha de Auditoria (Logs em Tempo Real)</h3>
              <p className="text-xs text-slate-500">Histórico detalhado de requisições registradas na base de dados.</p>
            </div>
            
            <button
              type="button"
              onClick={() => setOrderBy(prev => prev === "desc" ? "asc" : "desc")}
              className="text-xs text-slate-600 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-lg bg-slate-50 flex items-center gap-1 cursor-pointer font-semibold self-start sm:self-auto"
            >
              Organizar: {orderBy === "desc" ? "Mais Recentes" : "Mais Antigos"}
            </button>
          </div>

          <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Pesquisar por operador, tipo ou data..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-slate-700 font-semibold text-xs outline-hidden"
            />
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-150">
                <tr>
                  <th className="p-3">Operador</th>
                  <th className="p-3">Tipo Requisição</th>
                  <th className="p-3">Tokens (In / Out)</th>
                  <th className="p-3">Total Tokens</th>
                  <th className="p-3">Data e Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-650">
                {filteredAndSortedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center p-6 text-slate-400 font-semibold italic">
                      Nenhum registro de consumo corresponde à pesquisa atual.
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedLogs.map((log) => {
                    const col = userColors[log.NomeUsuario] || "#94a3b8";
                    return (
                      <tr key={log.Id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-semibold text-slate-800">
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: col }} />
                            <span>{log.NomeUsuario}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-md text-[10px] font-semibold">
                            {log.TipoRequisicao}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-500">
                          {log.InputTokens} / {log.OutputTokens}
                        </td>
                        <td className="p-3 font-mono text-[11px] font-extrabold text-indigo-650">
                          {log.TotalTokens}
                        </td>
                        <td className="p-3 font-mono text-slate-450 whitespace-nowrap">
                          {log.DataHora}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>

      </div>

    </div>
  );
}
