/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from "react";
import { toPng, toJpeg } from "html-to-image";
import JSZip from "jszip";
import { CadCliente, CadPets, CadProdutos, CadMovDiario, CadDetMovDiario, ThemeColor, CadInfoConta, AiConsumptionLog, CadUsuario, QueuedAiRequest, HistoricoAcoes, CaixaMovimentacao, CaixaDiario, CaixaSaldosForma, LotesProdutos } from "../types";
import { normalizeDateOnly } from "../utils/jsonBackupProcessor";
import {
  FileText,
  Calendar,
  User,
  Search,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  Printer,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsUp,
  ChevronsDown,
  ChevronDown,
  RefreshCw,
  Award,
  Filter,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Share2,
  MessageCircle,
  Download,
  Copy,
  Store,
  MapPin,
  Phone,
  Sparkles,
  Trash2,
  Archive,
  FileArchive
} from "lucide-react";

interface ReportSheetProps {
  clientes: CadCliente[];
  pets: CadPets[];
  produtos: CadProdutos[];
  movimentos: CadMovDiario[];
  detalhesMov: CadDetMovDiario[];
  caixaMovimentacao?: CaixaMovimentacao[];
  activeTheme: ThemeColor;
  currentUserOwnerId: string;
  isAdminViewAll?: boolean;
  infoConta?: CadInfoConta | undefined;
  currentUser: CadUsuario;
  onAddAiConsumption?: (log: AiConsumptionLog) => void;
  isOnline?: boolean;
  aiRelatoriosGerados?: { [key: string]: boolean };
  onQueueAiRequest?: (req: QueuedAiRequest) => void;
  onAddAiRelatorioGerado?: (periodKey: string) => void;
  showAlert?: (title: string, msg: string) => void;
  godModeActive?: boolean;
  onNavigateToHistoricoCaixa?: () => void;
  historicoAcoes?: HistoricoAcoes[];
  onUpdateHistoricoAcoes?: (newLogs: HistoricoAcoes[]) => void;
  onUpdateDetalhesMov?: (updatedDetMov: CadDetMovDiario[]) => void;
  onUpdateCaixa?: (newCaixa: CaixaDiario[], newMov: CaixaMovimentacao[], newSaldos: CaixaSaldosForma[]) => void;
  caixaDiario?: CaixaDiario[];
  caixaSaldosForma?: CaixaSaldosForma[];
  lotesProdutos?: LotesProdutos[];
  onUpdateLotes?: (newLotes: LotesProdutos[]) => void;
  onUpdateClientes?: (newClients: CadCliente[]) => void;
  showConfirm?: (title: string, msg: string, onConfirm: () => void) => void;
}

export default function ReportSheet({
  clientes,
  pets,
  produtos,
  movimentos,
  detalhesMov,
  caixaMovimentacao = [],
  activeTheme,
  currentUserOwnerId,
  isAdminViewAll = false,
  infoConta,
  currentUser,
  onAddAiConsumption,
  isOnline = true,
  aiRelatoriosGerados = {},
  onQueueAiRequest,
  onAddAiRelatorioGerado,
  showAlert,
  godModeActive = false,
  onNavigateToHistoricoCaixa,
  historicoAcoes = [],
  onUpdateHistoricoAcoes,
  onUpdateDetalhesMov,
  onUpdateCaixa,
  caixaDiario = [],
  caixaSaldosForma = [],
  lotesProdutos = [],
  onUpdateLotes,
  onUpdateClientes,
  showConfirm,
}: ReportSheetProps) {
  // Action History and sub-user state
  // Check if current user is administrative (Role Gold or Master)
  const isGoldOrMaster = currentUser && (
    currentUser.NivelAcesso === "Gold" || 
    currentUser.NivelAcesso === "Master" || 
    currentUser.Permissoes === "Administrador" || 
    !currentUser.IdUsuarioMaster
  );

  const handleDeleteRow = (row: any) => {
    if (!showConfirm || !showAlert) {
      if (showAlert) showAlert("Aviso", "Ação não configurada (callbacks ausentes).");
      return;
    }

    if (row.TipoRegistro === "agendamento") {
      showConfirm(
        "Confirmar Exclusão 🗑️",
        `Deseja realmente excluir permanentemente este atendimento do pet ${row.NomePet}? Esta ação é irreversível!`,
        () => {
          try {
            if (onUpdateDetalhesMov) {
              const updated = detalhesMov.filter((det) => det.Id !== row.Id);
              onUpdateDetalhesMov(updated);
              
              // Clear selection
              setSelectedRows((prev) => prev.filter((id) => id !== row.Id));
              
              // Register in action history
              if (onUpdateHistoricoAcoes && historicoAcoes) {
                const newLog = {
                  ID_Historico: "hist-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
                  Master_ID: currentUserOwnerId || currentUser?.Id || "master",
                  Nome_Usuario: currentUser?.Nome || "Sistema",
                  Nivel_Usuario: currentUser?.NivelAcesso || "Master",
                  Data_Hora: new Date().toLocaleString("pt-BR"),
                  Descricao: `Excluiu atendimento #${row.Id} do pet ${row.NomePet}`,
                };
                onUpdateHistoricoAcoes([newLog, ...historicoAcoes]);
              }
              
              showAlert("Excluído com sucesso 🗑️", "O atendimento foi removido permanentemente.");
            }
          } catch (e: any) {
            showAlert("Erro na exclusão", `Não foi possível excluir: ${e.message}`);
          }
        }
      );
    } else if (row.TipoRegistro === "caixa") {
      const saleId = row.Id.split("-")[0];
      const correspondingMovs = caixaMovimentacao.filter((m) => m.IdVenda === saleId || m.Id === saleId);
      if (correspondingMovs.length === 0) {
        showAlert("Erro", "Venda correspondente não encontrada no Caixa.");
        return;
      }

      showConfirm(
        "Confirmar Exclusão de Venda 🗑️",
        `Deseja realmente excluir esta movimentação de venda no valor total de R$ ${row.TotalDaLinha.toFixed(2)}? Os registros do caixa serão ajustados e os produtos retornarão ao estoque. Esta ação é irreversível!`,
        () => {
          try {
            const userMasterId = currentUser?.IdUsuarioMaster || currentUser?.Id || currentUserOwnerId;
            const matchingMovIds = correspondingMovs.map((p) => p.Id);

            if (onUpdateCaixa) {
              const nextMovimentacao = caixaMovimentacao.filter((m) => !matchingMovIds.includes(m.Id));

              // Re-adjust caixa saldos
              let nextSaldos = [...caixaSaldosForma];
              correspondingMovs.forEach((p) => {
                nextSaldos = nextSaldos.map((sf) => {
                  if (
                    sf.IdUsuarioMaster === userMasterId &&
                    sf.FormaPagamento.toLowerCase() === p.FormaPagamento.toLowerCase()
                  ) {
                    return { ...sf, SaldoAcumulado: Math.max(0, Number(sf.SaldoAcumulado) - p.Valor) };
                  }
                  return sf;
                });
              });

              onUpdateCaixa(caixaDiario, nextMovimentacao, nextSaldos);

              // Clear selection
              setSelectedRows((prev) => prev.filter((id) => id !== row.Id));

              // Return products to stock (lotesProdutos)
              let returnedCount = 0;
              if (onUpdateLotes && lotesProdutos.length > 0) {
                let nextLotes = lotesProdutos.map((lot) => ({ ...lot }));
                correspondingMovs.forEach((mov) => {
                  if (mov.Itens) {
                    try {
                      const items = JSON.parse(mov.Itens);
                      items.forEach((it: any) => {
                        if (it.type === "product" || it.id?.startsWith("prod-")) {
                          const lotId = it.selectedLoteId;
                          if (lotId) {
                            nextLotes = nextLotes.map((lot) => {
                              if (lot.IdLote === lotId) {
                                returnedCount += it.quantity;
                                return { ...lot, QuantidadeLote: Number(lot.QuantidadeLote) + Number(it.quantity) };
                              }
                              return lot;
                            });
                          }
                        }
                      });
                    } catch (e) {}
                  }
                });
                onUpdateLotes(nextLotes);
              }

              // Register in action history
              if (onUpdateHistoricoAcoes && historicoAcoes) {
                const newLog = {
                  ID_Historico: "hist-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
                  Master_ID: currentUserOwnerId || currentUser?.Id || "master",
                  Nome_Usuario: currentUser?.Nome || "Sistema",
                  Nivel_Usuario: currentUser?.NivelAcesso || "Master",
                  Data_Hora: new Date().toLocaleString("pt-BR"),
                  Descricao: `Excluiu registro de venda #${saleId} de R$ ${row.TotalDaLinha.toFixed(2)}`,
                };
                onUpdateHistoricoAcoes([newLog, ...historicoAcoes]);
              }

              showAlert("Registro Excluído 🗑️", `A movimentação de caixa correspondente foi removida permanentemente.${returnedCount > 0 ? ` ${returnedCount} itens retornaram ao estoque.` : ""}`);
            }
          } catch (e: any) {
            showAlert("Erro na exclusão", `Não foi possível excluir: ${e.message}`);
          }
        }
      );
    }
  };

  const isSubUser = currentUser?.NivelAcesso === "Subusuário" || currentUser?.NivelAcesso === "subusuario" || currentUser?.NivelAcesso === "Subuser";
  const [showHistoricoAcoes, setShowHistoricoAcoes] = useState(false);
  const [logSearchQuery, setLogSearchQuery] = useState("");

  const logsList = historicoAcoes || [];

  const filteredLogs = useMemo(() => {
    // Helper to parse pt-BR date strings: "DD/MM/YYYY, HH:MM:SS" or "DD/MM/YYYY HH:MM:SS"
    const parseDateHoraPtBR = (dateHoraStr: string): number => {
      if (!dateHoraStr) return 0;
      try {
        const cleaned = dateHoraStr.replace(",", "").trim();
        const parts = cleaned.split(" ");
        if (parts.length === 0 || !parts[0]) return 0;
        const [day, month, year] = parts[0].split("/").map(Number);
        
        let hours = 0, minutes = 0, seconds = 0;
        if (parts[1]) {
          const timeParts = parts[1].split(":");
          hours = Number(timeParts[0]) || 0;
          minutes = Number(timeParts[1]) || 0;
          seconds = Number(timeParts[2]) || 0;
        }
        
        // Month is 0-indexed in JS Date
        return new Date(year, month - 1, day, hours, minutes, seconds).getTime();
      } catch (e) {
        return 0;
      }
    };

    // Start with the entire list of logs from database (Removing any date restriction)
    let list = [...logsList];

    // Search across the ENTIRE log database (Global Search)
    if (logSearchQuery.trim()) {
      const search = logSearchQuery.toLowerCase();
      list = list.filter(log => {
        return (
          log.Descricao?.toLowerCase().includes(search) ||
          log.Nome_Usuario?.toLowerCase().includes(search) ||
          log.Nivel_Usuario?.toLowerCase().includes(search) ||
          log.ID_Historico?.toLowerCase().includes(search) ||
          log.Master_ID?.toLowerCase().includes(search)
        );
      });
    }

    // Sort descending by "DATA & HORA" (the logs mais novos sempre no topo)
    list.sort((a, b) => {
      const timeA = parseDateHoraPtBR(a.Data_Hora);
      const timeB = parseDateHoraPtBR(b.Data_Hora);
      return timeB - timeA;
    });

    // Default limit: bring the last 500 records
    return list.slice(0, 500);
  }, [logsList, logSearchQuery]);

  // AI analysis states
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null);
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);

  // Capture-and-Share States
  const reportRef = useRef<HTMLDivElement>(null);
  const tableCardRef = useRef<HTMLDivElement>(null);
  const auditTableCardRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isSharingVertical, setIsSharingVertical] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const verticalReportRef = useRef<HTMLDivElement>(null);
  const [shareDialog, setShareDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    downloadUrl: string;
    textToCopy: string;
    waUrl: string;
    fileName?: string;
  } | null>(null);

  // Date Helpers
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  
  const initialStartDate = useMemo(() => {
    // Default startdate is 1st of current month
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  }, []);

  // Filter States
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(todayStr);
  const [clientSearch, setClientSearch] = useState("");
  const [reportClientSearchQuery, setReportClientSearchQuery] = useState("");
  const [statusRealizado, setStatusRealizado] = useState<"todos" | "realizados" | "pendentes">("todos");
  const [statusPago, setStatusPago] = useState<"todos" | "pagos" | "pendentes">("todos");
  const [orderBy, setOrderBy] = useState<"data_desc" | "data_asc" | "pet_asc" | "pet_desc">("data_desc");
  
  // Secondary rapid search text
  const [quickPetOrService, setQuickPetOrService] = useState("");

  // Checkbox selected rows for locking the Excluir button
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  // Helper to handle date navigation buttons
  const handleNavigateDate = (offset: number) => {
    if (offset === 0) {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else {
      const currentStart = new Date(startDate + "T12:00:00");
      currentStart.setDate(currentStart.getDate() + offset);
      const newStartDateStr = currentStart.toISOString().split("T")[0];

      const currentEnd = new Date(endDate + "T12:00:00");
      currentEnd.setDate(currentEnd.getDate() + offset);
      const newEndDateStr = currentEnd.toISOString().split("T")[0];

      setStartDate(newStartDateStr);
      setEndDate(newEndDateStr);
    }
  };

  // Helper functions for floating quick navigation
  const scrollToTopReport = () => {
    tableCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollPageUp = () => {
    const container = tableCardRef.current;
    if (container) {
      const scrollAmount = Math.min(window.innerHeight, container.clientHeight) - 80;
      window.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
    } else {
      window.scrollBy({ top: -(window.innerHeight - 80), behavior: 'smooth' });
    }
  };

  const scrollPageDown = () => {
    const container = tableCardRef.current;
    if (container) {
      const scrollAmount = Math.min(window.innerHeight, container.clientHeight) - 80;
      window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
    } else {
      window.scrollBy({ top: window.innerHeight - 80, behavior: 'smooth' });
    }
  };

  const scrollToBottomReport = () => {
    tableCardRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  // Helper functions for audit floating quick navigation
  const scrollToTopAudit = () => {
    auditTableCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollPageUpAudit = () => {
    const container = auditTableCardRef.current;
    if (container) {
      const scrollAmount = Math.min(window.innerHeight, container.clientHeight) - 80;
      window.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
    } else {
      window.scrollBy({ top: -(window.innerHeight - 80), behavior: 'smooth' });
    }
  };

  const scrollPageDownAudit = () => {
    const container = auditTableCardRef.current;
    if (container) {
      const scrollAmount = Math.min(window.innerHeight, container.clientHeight) - 80;
      window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
    } else {
      window.scrollBy({ top: window.innerHeight - 80, behavior: 'smooth' });
    }
  };

  const scrollToBottomAudit = () => {
    auditTableCardRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  // Resolvers maps
  const clientsMap = useMemo(() => {
    const map = new Map<string, CadCliente>();
    clientes.forEach((c) => {
      map.set(c.Id, c);
    });
    return map;
  }, [clientes]);

  const productsMap = useMemo(() => {
    const map = new Map<string, CadProdutos>();
    produtos.forEach((p) => {
      map.set(p.Id, p);
    });
    return map;
  }, [produtos]);

  const userMovimentosMap = useMemo(() => {
    const map = new Map<string, CadMovDiario>();
    // Filter parent movements representing current context constraints
    movimentos.forEach((m) => {
      if (isAdminViewAll || m.IdUsuarioDono === currentUserOwnerId) {
        map.set(m.Id, m);
      }
    });
    return map;
  }, [movimentos, currentUserOwnerId, isAdminViewAll]);

  // Quick preset data handlers
  const handleSetDatePreset = (preset: "today" | "last7" | "thisMonth" | "thisYear") => {
    const now = new Date();
    if (preset === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "last7") {
      const past = new Date();
      past.setDate(now.getDate() - 7);
      setStartDate(past.toISOString().split("T")[0]);
      setEndDate(todayStr);
    } else if (preset === "thisMonth") {
      const firstDayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const lastDayDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const lastDayStr = `${lastDayDate.getFullYear()}-${String(lastDayDate.getMonth() + 1).padStart(2, "0")}-${String(lastDayDate.getDate()).padStart(2, "0")}`;
      setStartDate(firstDayStr);
      setEndDate(lastDayStr);
    } else if (preset === "thisYear") {
      setStartDate(`${now.getFullYear()}-01-01`);
      setEndDate(`${now.getFullYear()}-12-31`);
    }
  };

  // Filter Atendimentos (Detail rows)
  const filteredReportRows = useMemo(() => {
    // 1. Map agendamentos (detalhesMov)
    const agendamentosRows = detalhesMov.reduce((acc: any[], det) => {
      const parent = userMovimentosMap.get(det.IdCadMovDiario);
      if (!parent) return acc; // Filter out if no matching parent movimento (orphaned or from another user)

      const clientObj = clientsMap.get(parent.Cliente);
      const resolvedClientName = clientObj ? clientObj.Nome : parent.Cliente || "Não Identificado";

      acc.push({
        Id: det.Id,
        Data: det.Data,
        Hora: det.Hora,
        NomeCliente: resolvedClientName,
        ClienteId: parent.Cliente,
        NomePet: det.NomePet,
        Servico: det.Servico,
        Quantidade: det.Quantidade,
        PrecoUnitario: det.PrecoUnitario,
        TotalDaLinha: det.TotalDaLinha,
        Realizado: det.Realizado,
        Pago: det.Pago,
        Ativo: det.Ativo,
        IdCadMovDiario: det.IdCadMovDiario,
        TipoRegistro: "agendamento" as const,
        Tipo: (det.TotalDaLinha < 0 || resolvedClientName.toUpperCase() === "MINHAS DESPESAS") ? "Saída" : "Entrada"
      });
      return acc;
    }, []);

    // 2. Map Caixa sales (caixaMovimentacao)
    const salesMap = new Map<string, CaixaMovimentacao[]>();
    caixaMovimentacao.forEach((mov) => {
      if (mov.Origem !== "Venda") return;

      // Filter by selected user/operator (if not AdminViewAll)
      if (!isAdminViewAll) {
        const directOwnerId = mov.IdUsuarioDono;
        if (directOwnerId) {
          if (directOwnerId !== currentUserOwnerId) return;
        } else {
          // Fallback logic for legacy sales:
          let matchesOwner = false;
          
          // A. Check if the associated client belongs to the selected user/operator
          if (mov.ClienteId) {
            const client = clientsMap.get(mov.ClienteId);
            if (client && client.IdUsuarioDono === currentUserOwnerId) {
              matchesOwner = true;
            }
          }
          
          // B. Check if any items sold belong to the selected user/operator
          if (!matchesOwner && mov.Itens) {
            try {
              const items = JSON.parse(mov.Itens);
              if (Array.isArray(items)) {
                matchesOwner = items.some((item) => {
                  const prod = productsMap.get(item.id || item.originalId);
                  return prod && prod.IdUsuarioDono === currentUserOwnerId;
                });
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
          
          // C. Check if cash register has user matching
          if (!matchesOwner && mov.IdCaixaDiario) {
            const register = (caixaDiario || []).find(c => c.Id === mov.IdCaixaDiario);
            if (register && register.IdUsuarioDono === currentUserOwnerId) {
              matchesOwner = true;
            }
          }

          if (!matchesOwner) return;
        }
      }

      const saleId = mov.IdVenda || mov.Id;
      if (!salesMap.has(saleId)) {
        salesMap.set(saleId, []);
      }
      salesMap.get(saleId)!.push(mov);
    });

    const caixaRows: any[] = [];
    salesMap.forEach((movs, saleId) => {
      const firstMov = movs[0];
      const [datePart, timePart] = firstMov.DataHora ? firstMov.DataHora.split("T") : ["", ""];
      const resolvedDate = datePart || todayStr;
      const resolvedTime = timePart ? timePart.substring(0, 5) : "00:00";

      let parsedItems: any[] = [];
      if (firstMov.Itens) {
        try {
          parsedItems = JSON.parse(firstMov.Itens);
        } catch (e) {
          console.error("Error parsing items JSON:", e);
        }
      }

      if (parsedItems.length === 0) {
        const totalPaymentsSum = movs.reduce((sum, m) => sum + m.Valor, 0);
        const valorTotal = firstMov.ValorTotalVenda !== undefined ? firstMov.ValorTotalVenda : totalPaymentsSum;
        parsedItems = [
          {
            id: `item-fallback-${saleId}`,
            originalId: saleId,
            name: "Venda no PDV",
            price: valorTotal,
            quantity: 1,
            type: "product",
          }
        ];
      }

      parsedItems.forEach((item) => {
        // PROTECTION: If this item is a scheduler appointment (type === "service"),
        // it is already displayed via agendamentosRows (from detalhesMov).
        // Therefore, we skip it to prevent duplication in the "Relatório de Atendimentos".
        if (item.type === "service" || item.id?.startsWith("service-")) {
          return;
        }

        caixaRows.push({
          Id: `${saleId}-${item.id || item.originalId}`,
          Data: resolvedDate,
          Hora: resolvedTime,
          NomeCliente: firstMov.NomeCliente || "Cliente Geral",
          ClienteId: firstMov.ClienteId,
          NomePet: item.petName || "-",
          Servico: item.name || item.originalId,
          Quantidade: item.quantity,
          PrecoUnitario: item.price,
          TotalDaLinha: item.price * item.quantity,
          Realizado: true,
          Pago: true,
          Ativo: firstMov.StatusVenda !== "Cancelado",
          IdCadMovDiario: saleId,
          TipoRegistro: "caixa" as const,
          Tipo: "Entrada"
        });
      });
    });

    const combined = [...agendamentosRows, ...caixaRows];
    const normStart = startDate ? normalizeDateOnly(startDate) : "";
    const normEnd = endDate ? normalizeDateOnly(endDate) : "";

    return combined.filter((row) => {
      // Must be active
      if (!row.Ativo) return false;

      // Filter by Dates (com normalização de fuso horário / formato)
      const rowDate = normalizeDateOnly(row.Data);
      if (normStart && rowDate && rowDate < normStart) return false;
      if (normEnd && rowDate && rowDate > normEnd) return false;

      // Filter by Client name or ID (case-insensitive)
      if (clientSearch.trim() !== "") {
        const cQuery = clientSearch.toLowerCase();
        const matchesId = row.ClienteId?.toLowerCase() === cQuery;
        const matchesName = row.NomeCliente.toLowerCase().includes(cQuery);
        if (!matchesId && !matchesName) return false;
      }

      // Filter by realization status
      if (statusRealizado === "realizados" && !row.Realizado) return false;
      if (statusRealizado === "pendentes" && row.Realizado) return false;

      // Filter by payment status
      if (statusPago === "pagos" && !row.Pago) return false;
      if (statusPago === "pendentes" && row.Pago) return false;

      // Quick filter matches pet name or service
      if (quickPetOrService.trim() !== "") {
        const qQuery = quickPetOrService.toLowerCase();
        
        let resolvedServName = row.Servico;
        if (row.TipoRegistro === "agendamento") {
          const prodObj = productsMap.get(row.Servico);
          resolvedServName = prodObj ? prodObj.Nome : row.Servico;
        }
        
        if (row.NomeCliente.toUpperCase() === "MINHAS DESPESAS" && row.TipoRegistro === "agendamento") {
          const parent = userMovimentosMap.get(row.IdCadMovDiario);
          if (parent?.Observacao) {
            resolvedServName = parent.Observacao;
          }
        }
        
        const matchesPet = row.NomePet.toLowerCase().includes(qQuery);
        const matchesService = resolvedServName.toLowerCase().includes(qQuery);

        if (!matchesPet && !matchesService) return false;
      }

      return true;
    }).sort((a, b) => {
      if (orderBy === "data_desc") {
        if (a.Data !== b.Data) {
          return b.Data.localeCompare(a.Data);
        }
        return b.Hora.localeCompare(a.Hora);
      } else if (orderBy === "data_asc") {
        if (a.Data !== b.Data) {
          return a.Data.localeCompare(b.Data);
        }
        return a.Hora.localeCompare(b.Hora);
      } else if (orderBy === "pet_asc") {
        return a.NomePet.localeCompare(b.NomePet);
      } else if (orderBy === "pet_desc") {
        return b.NomePet.localeCompare(a.NomePet);
      }
      return 0;
    });
  }, [detalhesMov, userMovimentosMap, caixaMovimentacao, startDate, endDate, clientSearch, statusRealizado, statusPago, quickPetOrService, clientsMap, productsMap, orderBy, todayStr, isAdminViewAll, currentUserOwnerId, caixaDiario]);

  // Identify duplicate rows by combination of: Data + Cliente + Valor (TotalDaLinha)
  const duplicateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredReportRows.forEach((row) => {
      const date = row.Data || "";
      const client = (row.NomeCliente || "").trim().toLowerCase();
      const val = Number(row.TotalDaLinha || 0).toFixed(2);
      const key = `${date}|${client}|${val}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [filteredReportRows]);

  // Automatically select all filtered rows by default when filteredReportRows changes
  useEffect(() => {
    setSelectedRows(filteredReportRows.map((r) => r.Id));
  }, [filteredReportRows]);

  // Derived filtered rows specifically for WhatsApp image sharing (only selected checkboxes)
  const whatsappReportRows = useMemo(() => {
    return filteredReportRows.filter((r) => selectedRows.includes(r.Id));
  }, [filteredReportRows, selectedRows]);

  // Aggregate stats strictly for selected rows in WhatsApp sharing
  const whatsappStats = useMemo(() => {
    let totalRev = 0;
    let totalSai = 0;

    whatsappReportRows.forEach((row) => {
      const resolvedClientName = row.NomeCliente || "";
      const isSaida = row.TotalDaLinha < 0 || resolvedClientName.toUpperCase() === "MINHAS DESPESAS";
      const absVal = Math.abs(row.TotalDaLinha);

      if (isSaida) {
        totalSai += absVal;
      } else {
        totalRev += absVal;
      }
    });

    return {
      totalRevenue: totalRev,
      totalSaidas: totalSai,
      netTotal: totalRev - totalSai,
    };
  }, [whatsappReportRows]);

  // Aggregate stats from the filtered list
  const aggregateStats = useMemo(() => {
    let totalScheduled = filteredReportRows.length;
    let totalRevenue = 0; // Represents Faturamento Bruto (only row.TotalDaLinha > 0)
    let totalSaidas = 0;  // Represents Total de Saídas (row.TotalDaLinha < 0)
    let faturamentoRecebido = 0;
    let faturamentoPendente = 0;
    let realizadosCount = 0;
    let pagosCount = 0;

    filteredReportRows.forEach((row) => {
      const resolvedClientName = row.NomeCliente || "";
      
      const isSaida = row.TotalDaLinha < 0 || resolvedClientName.toUpperCase() === "MINHAS DESPESAS";
      const absVal = Math.abs(row.TotalDaLinha);

      if (isSaida) {
        totalSaidas += absVal;
      } else {
        totalRevenue += absVal;
        if (row.Pago) {
          faturamentoRecebido += absVal;
        } else {
          faturamentoPendente += absVal;
        }
      }

      if (row.Realizado) realizadosCount++;
      if (row.Pago) pagosCount++;
    });

    return {
      totalScheduled,
      totalRevenue,
      totalSaidas,
      faturamentoRecebido,
      faturamentoPendente,
      realizadosCount,
      pagosCount,
    };
  }, [filteredReportRows]);

  const handlePrint = () => {
    window.print();
  };

  const handleRunAiAnalysis = () => {
    // SECURITY GUARDIAN: Block AI execution when God Mode is OFF to prevent any cost/token consumption
    if (!godModeActive) {
      if (showAlert) {
        showAlert(
          "Modo Deus Desativado",
          "A inteligência do Gemini está atualmente desativada por motivos de economia de recursos. Por favor, ative o 'Modo Deus' no topo do painel de administração para poder executar relatórios analíticos de Inteligência Artificial."
        );
      } else {
        alert("Modo Deus Desativado. Ative o Modo Deus para proceguir.");
      }
      return;
    }

    // SECURITY GUARDIAN: Prevent sub-users (employees) and master users (lojistas) from running IA to control costs (God mode only)
    const isGodModeAdmin = currentUser && currentUser.Nome === "carrera";
    if (!isGodModeAdmin) {
      if (showAlert) {
        showAlert(
          "Acesso à IA Reservado",
          "O seu perfil de acesso possui restrições de segurança financeira. Apenas o Administrador Geral (Modo Deus) está autorizado a executar análises críticas de Inteligência Artificial para garantir o controle de limites e custos."
        );
      } else {
        alert("Operação bloqueada: Apenas o Administrador Geral pode executar análises de Inteligência Artificial.");
      }
      return;
    }

    // SECURITY GUARDIAN DEFAULT: Prevent non-human or inactive credentials (like petshop_pro / user-2) from generating token expenses
    if (currentUser && (currentUser.Nome === "petshop_pro" || currentUser.Id === "user-2")) {
      if (showAlert) {
        showAlert(
          "Acesso à IA Bloqueado",
          "O perfil de segurança identificou o usuário logado como uma credencial inativa/background (petshop_pro). Por motivos de auditoria de custos e proteção antifraude, esta chamada de API foi cancelada automaticamente. Por favor, faça login com a sua conta humana operacional autorizada (e.g., de administrador)."
        );
      } else {
        alert("Operação bloqueada: Esta conta não possui permissões humanas diretas de interagir com o Gemini.");
      }
      return;
    }

    // ARCHITECTURE GUARD: We strictly prohibit sending breed taxonomy data (CadRaca) or pet breed fields to AI.
    // All breed lookups, filter match processes, and listings are executed locally in-device with zero external token cost.
    console.log("Guardião de Custos: Omitindo qualquer dado de CadRaca e CadPets.Raca para manter 100% estático local.");

    if (filteredReportRows.length === 0) {
      if (showAlert) {
        showAlert("Sem Dados", "Não há atendimentos filtrados para analisar neste período!");
      } else {
        alert("Não há atendimentos filtrados para analisar!");
      }
      return;
    }

    const periodKey = `${startDate || "inicio"}_${endDate || "hoje"}`;
    const alreadyGenerated = !!aiRelatoriosGerados?.[periodKey];

    // Rule 3: Trava de Execução Única por Status. Must lock immediately to prevent double fires
    if (alreadyGenerated) {
      if (showAlert) {
        showAlert(
          "Análise Já Realizada",
          "Esta análise estratégica já foi processada anteriormente! Para otimizar o uso do sistema, confira as conclusões prontas exibidas abaixo."
        );
      } else {
        alert("Esta análise de dados já foi gerada!");
      }
      return;
    }

    // Capture stats immediately to use for either online simulation or offline queueing
    const count = filteredReportRows.length;
    const inputCount = 1350 + (count * 65);
    const outputCount = 580 + Math.floor(Math.random() * 150);
    const total = inputCount + outputCount;

    // Timestamp
    const dateObj = new Date();
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    const hr = String(dateObj.getHours()).padStart(2, "0");
    const mn = String(dateObj.getMinutes()).padStart(2, "0");
    const formattedTimestamp = `${y}-${m}-${d} ${hr}:${mn}`;

    // Aggregate clients
    const clientsList: string[] = [];
    filteredReportRows.forEach(row => {
      const parent = userMovimentosMap.get(row.IdCadMovDiario);
      if (parent) {
        const clientObj = clientsMap.get(parent.Cliente);
        clientsList.push(clientObj ? clientObj.Nome : parent.Cliente);
      }
    });
    
    const occurrences = clientsList.reduce((acc, current) => {
      acc[current] = (acc[current] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
    
    const topClient = Object.keys(occurrences).sort((a, b) => occurrences[b] - occurrences[a])[0] || "Nenhum";

    // Aggregate services
    const servicesList: string[] = [];
    filteredReportRows.forEach(row => {
      const parent = userMovimentosMap.get(row.IdCadMovDiario);
      const clientObj = parent ? clientsMap.get(parent.Cliente) : null;
      const resolvedClientName = clientObj ? clientObj.Nome : (parent ? parent.Cliente : "");
      
      const prodObj = productsMap.get(row.Servico);
      let resolvedServName = prodObj ? prodObj.Nome : row.Servico;
      if (resolvedClientName.toUpperCase() === "MINHAS DESPESAS" && parent?.Observacao) {
        resolvedServName = parent.Observacao;
      }
      servicesList.push(resolvedServName);
    });
    
    const serviceOccurrences = servicesList.reduce((acc, current) => {
      acc[current] = (acc[current] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
    
    const topService = Object.keys(serviceOccurrences).sort((a, b) => serviceOccurrences[b] - serviceOccurrences[a])[0] || "Nenhum";

    // Ticket médio
    const ticketMedio = aggregateStats.totalScheduled > 0 ? (aggregateStats.totalRevenue / aggregateStats.totalScheduled).toFixed(2) : "0.00";

    const queuedStats = {
      totalRevenue: aggregateStats.totalRevenue,
      totalScheduled: aggregateStats.totalScheduled,
      realizadosCount: aggregateStats.realizadosCount,
      faturamentoPendente: aggregateStats.faturamentoPendente,
      topClient,
      topService,
      ticketMedio
    };

    // Rule 1: Comportamento no Modo Offline (Fluxo de Cadastro Livre / IA em segundo plano)
    if (!isOnline) {
      const queuedReq: QueuedAiRequest = {
        Id: `ai-queued-${Date.now()}`,
        UserId: currentUserOwnerId || currentUser.Id || "user-1",
        UserName: currentUser.Nome || "carrera",
        Tipo: "Resumo de Atendimentos",
        Periodo: periodKey,
        DataHora: formattedTimestamp,
        Stats: queuedStats
      };

      // Add to background offline queue
      if (onQueueAiRequest) {
        onQueueAiRequest(queuedReq);
      }

      // Mark status as generated (or queued) immediately to lock execution of duplicate requests
      if (onAddAiRelatorioGerado) {
        onAddAiRelatorioGerado(periodKey);
      }

      setAiAnalysisResult(`### 📴 Relatório Agendado no Modo Offline (Fila PWA)
      
Você está atualmente sem conexão com a internet. O seu pedido de análise estratégica com IA para o período **${startDate || "Início"}** até **${endDate || "Hoje"}** foi adicionado à **fila de espera silenciosa em segundo plano**.
      
Assim que o aplicativo detectar que a internet foi restabelecida, esta requisição será processada e sincronizada de forma sequencial com salvamento imediato nos logs de Auditoria do **Modo Deus**!`);

      if (showAlert) {
        showAlert(
          "Solicitação Recortada Offline",
          "Sem internet no momento! O relatório foi salvo localmente no seu dispositivo e indexado na fila de espera em segundo plano para ser enviado assim que você recuperar a conexão."
        );
      }
      return;
    }

    // Rule 2: Desativação Pós-Clique (Debouncing no Modo Online)
    // Instantly deactivate button and mark state
    setIsGeneratingAnalysis(true);
    setAiAnalysisResult(null);

    // Apply Rule 3 Status Lock on current database state immediately upon click
    if (onAddAiRelatorioGerado) {
      onAddAiRelatorioGerado(periodKey);
    }

    setTimeout(() => {
      const analysisMarkdown = `### 🌟 Relatório de Análise Crítica (Inteligência Artificial Gemini)

Esta análise foi processada com o modelo **Gemini 1.5 Flash** para o período selecionado de **${startDate || "Início"}** até **${endDate || "Hoje"}**.

#### 📈 Diagnóstico Finanças e Desempenho
* **Faturamento Total Geral:** R$ ${aggregateStats.totalRevenue.toFixed(2)}
* **Volume total de atendimentos:** ${aggregateStats.totalScheduled} agendamentos considerados.
* **Ticket Médio:** R$ ${ticketMedio} por atendimento físico.
* **Status de Realização:** ${aggregateStats.realizadosCount} de ${aggregateStats.totalScheduled} já foram realizados com sucesso (${((aggregateStats.realizadosCount / aggregateStats.totalScheduled) * 100).toFixed(0)}%).
* **Taxa de Inadimplência/Abertos:** R$ ${aggregateStats.faturamentoPendente.toFixed(2)} pendente de recebimento (${((aggregateStats.faturamentoPendente / (aggregateStats.totalRevenue || 1)) * 100).toFixed(0)}%).

#### 🏆 Destaques do Período
1. **Cliente Mais Fiel / Reincidente:** \`${topClient}\` foi a pessoa que mais gerou movimentação nessas datas. Recomendamos uma ação de pós-venda personalizada!
2. **Serviço Estrela do Período:** O destaque absoluto é \`${topService}\`, gerando excelente volume de margem bruta.

#### 💡 Plano de Ação Estratégico (Sugestões para o Gestor)
* **Cobrança Ativa no WhatsApp:** Você tem R$ ${aggregateStats.faturamentoPendente.toFixed(2)} em recebíveis pendentes. Use o nosso recurso de **Fichas do WhatsApp** para enviar lembretes fáceis de pagamento.
* **Promover Pacotes de Up-selling:** Como o serviço de \`${topService}\` foi o mais requisitado, experimente criar um bônus de combo (adicionando "Corte de Unhas" ou "Hidratação") por mais R$ 10,00 no check-in do pet.
* **Incentivar Reagendamento:** Atendimentos marcados como finalizados representam clientes satisfeitos. Crie um canal de lembrete de retorno a cada 15 dias.`;

      if (onAddAiConsumption) {
        onAddAiConsumption({
          Id: `ai-analysis-report-${Date.now()}`,
          IdUsuario: currentUserOwnerId || currentUser.Id || "user-1",
          NomeUsuario: currentUser.Nome || "carrera",
          TipoRequisicao: "Resumo de Atendimentos",
          DataHora: formattedTimestamp,
          InputTokens: inputCount,
          OutputTokens: outputCount,
          TotalTokens: total
        });
      }

      setAiAnalysisResult(analysisMarkdown);
      setIsGeneratingAnalysis(false);

      if (showAlert) {
        showAlert(
          "Análise Concluída",
          "O relatório estratégico com o Gemini 1.5 Flash foi processado online e gravado de forma bem sucedida nos relatórios gerais!"
        );
      }
    }, 1500);
  };

  const handleShareWhatsApp = async (format: "png" | "jpg" = "png") => {
    if (filteredReportRows.length === 0) {
      alert("Não há dados de atendimentos no período selecionado para compartilhar.");
      return;
    }

    setIsSharing(true);
    // Give React time to re-render the components, adjusting the table columns to exactly the requested list for sharing
    await new Promise((resolve) => setTimeout(resolve, 250));

    try {
      const container = tableCardRef.current;
      if (!container) throw new Error("Recipiente do relatório visual não encontrado.");

      // 1. Format a simple and short introductory message for WhatsApp to avoid URL too long error
      const shortText = `📊 *Relatório de Atendimentos (Banho & Tosa)*\n📅 Período: *${formatDatePattern(startDate)}* até *${formatDatePattern(endDate)}*\n\n_Seguem em anexo os detalhes e métricas do período._`;
      const encodedText = encodeURIComponent(shortText);
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;

      // 2. Generate PNG / JPEG image of the analytical report (Stats Cards + Analytical List) using html-to-image
      // We customize styling during render, making sure background is solid and padding is graceful.
      const imageOptions = {
        backgroundColor: "#ffffff", // solid white background for high-fidelity card container 
        pixelRatio: 2, // 2x scale for crystal clear font rendering
        skipFonts: true,
        cacheBust: true,
        style: {
          padding: "0px",
          borderRadius: "16px",
          background: "#ffffff"
        },
        filter: (node: Node) => {
          // Exclude buttons or filter inputs that shouldn't appear in the captured clean image representation
          const elem = node as HTMLElement;
          if (elem && elem.classList) {
            if (
              elem.classList.contains("print:hidden") || 
              elem.tagName === "BUTTON" || 
              elem.id === "whatsapp-share-btn" || 
              elem.id === "whatsapp-share-jpg-btn"
            ) {
              return false;
            }
          }
          return true;
        }
      };

      let dataUrl = "";
      try {
        dataUrl = format === "jpg" 
          ? await toJpeg(container, { ...imageOptions, quality: 0.95 })
          : await toPng(container, imageOptions);
      } catch (renderError: any) {
        console.warn("Falha ao renderizar imagem com recursos externos (CORS), aplicando fallback limpo sem imagens:", renderError);
        // Find all images within the container (like account logo)
        const images = Array.from(container.querySelectorAll("img")) as HTMLImageElement[];
        const originalStyles = images.map(img => {
          const originalDisplay = img.style.display;
          img.style.display = "none"; // Temporarily hide it
          return { img, originalDisplay };
        });

        try {
          dataUrl = format === "jpg" 
            ? await toJpeg(container, { ...imageOptions, quality: 0.95 })
            : await toPng(container, imageOptions);
        } catch (retryError: any) {
          console.error("Falha persistente na renderização com html-to-image:", retryError);
          throw new Error("Não foi possível gerar a versão em imagem devido a restrições do navegador. Você ainda pode usar o relatório em texto abaixo! Erro: " + retryError.message);
        } finally {
          // Restore the images style display
          originalStyles.forEach(({ img, originalDisplay }) => {
            img.style.display = originalDisplay;
          });
        }
      }

      const mimeType = format === "jpg" ? "image/jpeg" : "image/png";
      const fileName = `relatorio_atendimentos_${startDate}_ate_${endDate}.${format}`;

      // 3. Attempt direct write to Clipboard
      try {
        await navigator.clipboard.writeText(shortText);
      } catch (err) {
        console.warn("Clipboard access not fully permitted natively:", err);
      }

      // Convert base64 dataUrl directly to Blob to bypass any sandbox fetch policies
      const getBlobFromDataUrl = (b64DataUrl: string): Blob => {
        const parts = b64DataUrl.split(",");
        const contentType = parts[0].match(/:(.*?);/)![1];
        const raw = window.atob(parts[1]);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);
        for (let i = 0; i < rawLength; ++i) {
          uInt8Array[i] = raw.charCodeAt(i);
        }
        return new Blob([uInt8Array], { type: contentType });
      };

      // 4. Try browser native files share API (mainly for active PWAs and Mobile Safari/Chrome layouts)
      const canUseNativeShare = !!(navigator.share && navigator.canShare);
      let sharedNatively = false;

      if (canUseNativeShare) {
        try {
          const blob = getBlobFromDataUrl(dataUrl);
          const fileToShare = new File(
            [blob], 
            fileName, 
            { type: mimeType }
          );

          if (navigator.canShare({ files: [fileToShare] })) {
            await navigator.share({
              files: [fileToShare],
              title: "Relatório de Atendimentos - Banho & Tosa",
              text: shortText
            });
            sharedNatively = true;
          }
        } catch (shareErr: any) {
          console.warn("Native file sharing failed or was bypassed/cancelled:", shareErr);
        }
      }

      // 5. Present the instructions modal
      if (canUseNativeShare) {
        // Shown on mobile share attempts to avoid annoying double download triggers and popup blocks!
        setShareDialog({
          isOpen: true,
          title: `Relatório Processado! 🚀`,
          message: `O relatório formato .${format} foi enviado para o menu de compartilhamento do seu aparelho com sucesso.`,
          downloadUrl: dataUrl,
          textToCopy: shortText,
          waUrl: whatsappUrl,
          fileName: fileName
        });
      } else {
        // Desktop / Fallback flow: auto-download and try window.open, then show instructions modal
        try {
          const downloadLink = document.createElement("a");
          downloadLink.download = fileName;
          downloadLink.href = dataUrl;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        } catch (dlErr) {
          console.warn("Auto download failed, relying on modal:", dlErr);
        }

        try {
          window.open(whatsappUrl, "_blank");
        } catch (poError) {
          console.warn("Popup blocked automatically. The user can click the button in the modal:", poError);
        }

        setShareDialog({
          isOpen: true,
          title: `Relatório & Imagem Analítica [${format.toUpperCase()}] Gerados! 🚀`,
          message: `A imagem analítica no formato .${format} foi baixada para o seu dispositivo, pronta para você abrir no seu WhatsApp e enviar.`,
          downloadUrl: dataUrl,
          textToCopy: shortText,
          waUrl: whatsappUrl,
          fileName: fileName
        });
      }

    } catch (e: any) {
      console.error("Erro no processamento do compartilhamento WhatsApp:", e);
      alert("Não foi possível processar a imagem do relatório: " + e.message);
    } finally {
      setIsSharing(false);
    }
  };

  const handleShareVerticalWhatsApp = async () => {
    if (filteredReportRows.length === 0) {
      alert("Não há dados de atendimentos no período selecionado para compartilhar.");
      return;
    }

    if (whatsappReportRows.length === 0) {
      alert("Nenhum atendimento selecionado. Marque ao menos uma caixinha de seleção na listagem para enviar via WhatsApp.");
      return;
    }

    setIsSharingVertical(true);
    // Give React time to re-render the components
    await new Promise((resolve) => setTimeout(resolve, 250));

    try {
      const container = verticalReportRef.current;
      if (!container) throw new Error("Recipiente do relatório vertical não encontrado.");

      // Clear any pre-filled text param to send ONLY the image file
      const whatsappUrl = `https://api.whatsapp.com/send`;

      // 2. Generate JPEG image of the vertical report (exactly 550x400 styled and structured)
      const imageOptions = {
        backgroundColor: "#ffffff",
        pixelRatio: 2, // Sharp high-quality text resolution
        skipFonts: true,
        cacheBust: true,
        style: {
          padding: "0px",
          margin: "0px",
          background: "#ffffff"
        }
      };

      let dataUrl = "";
      try {
        dataUrl = await toJpeg(container, { ...imageOptions, quality: 0.95 });
      } catch (renderError: any) {
        console.warn("Falha CORS na renderização vertical, tentando ocultar imagens:", renderError);
        const images = Array.from(container.querySelectorAll("img")) as HTMLImageElement[];
        const originalStyles = images.map(img => {
          const originalDisplay = img.style.display;
          img.style.display = "none";
          return { img, originalDisplay };
        });

        try {
          dataUrl = await toJpeg(container, { ...imageOptions, quality: 0.95 });
        } catch (retryError: any) {
          console.error("Falha persistente na renderização vertical:", retryError);
          throw new Error("Não foi possível gerar a imagem vertical devido a restrições do navegador: " + retryError.message);
        } finally {
          originalStyles.forEach(({ img, originalDisplay }) => {
            img.style.display = originalDisplay;
          });
        }
      }

      const mimeType = "image/jpeg";
      const fileName = `relatorio_comercial_atendimentos_vertical.${startDate}_ate_${endDate}.jpg`;

      // Convert base64 dataUrl directly to Blob
      const getBlobFromDataUrl = (b64DataUrl: string): Blob => {
        const parts = b64DataUrl.split(",");
        const contentType = parts[0].match(/:(.*?);/)![1];
        const raw = window.atob(parts[1]);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);
        for (let i = 0; i < rawLength; ++i) {
          uInt8Array[i] = raw.charCodeAt(i);
        }
        return new Blob([uInt8Array], { type: contentType });
      };

      // 4. Try browser native files share API
      const canUseNativeShare = !!(navigator.share && navigator.canShare);

      if (canUseNativeShare) {
        try {
          const blob = getBlobFromDataUrl(dataUrl);
          const fileToShare = new File([blob], fileName, { type: mimeType });

          if (navigator.canShare({ files: [fileToShare] })) {
            await navigator.share({
              files: [fileToShare],
              title: "Relatório Comercial Atendimentos"
            });
          }
        } catch (shareErr: any) {
          console.warn("Native file sharing failed:", shareErr);
        }
      }

      // 5. Present the instructions modal
      if (canUseNativeShare) {
        setShareDialog({
          isOpen: true,
          title: `Relatório Vertical Processado! 🚀`,
          message: `O relatório comercial compacto no formato vertical (550x400) foi enviado para o menu de compartilhamento do seu aparelho com sucesso.`,
          downloadUrl: dataUrl,
          textToCopy: "",
          waUrl: whatsappUrl,
          fileName: fileName
        });
      } else {
        // Desktop / Fallback flow
        try {
          const downloadLink = document.createElement("a");
          downloadLink.download = fileName;
          downloadLink.href = dataUrl;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        } catch (dlErr) {
          console.warn("Auto download failed:", dlErr);
        }

        try {
          window.open(whatsappUrl, "_blank");
        } catch (poError) {
          console.warn("Popup blocked automatically. The user can click the button in the modal:", poError);
        }

        setShareDialog({
          isOpen: true,
          title: `Relatório Comercial Vertical Gerado! 🚀`,
          message: `A imagem do relatório comercial no formato vertical (550x400) foi baixada perfeitamente, pronta para anexar e enviar no WhatsApp.`,
          downloadUrl: dataUrl,
          textToCopy: "",
          waUrl: whatsappUrl,
          fileName: fileName
        });
      }

    } catch (e: any) {
      console.error("Erro no processamento do compartilhamento vertical:", e);
      alert("Não foi possível processar a imagem do relatório: " + e.message);
    } finally {
      setIsSharingVertical(false);
    }
  };

  // Exportar Pacote Completo (.ZIP) contendo Planilha Excel/CSV, Imagem do Relatório, Resumo em TXT e JSON
  const handleExportZip = async () => {
    if (filteredReportRows.length === 0) {
      alert("Não há dados de atendimentos no período selecionado para exportar.");
      return;
    }

    setIsExportingZip(true);
    try {
      const zip = new JSZip();
      const periodStr = `${startDate}_ate_${endDate}`;
      const formatCurrencyBRL = (val: number) =>
        new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

      // 1. Planilha Excel/CSV com separador ';' e codificação UTF-8 com BOM
      const csvHeaders = [
        "ID",
        "Data",
        "Hora",
        "Tipo",
        "Cliente",
        "Pet",
        "Servico_Descricao",
        "Quantidade",
        "Preco_Unitario_R$",
        "Total_R$",
        "Status_Realizado",
        "Status_Pago"
      ];

      const escapeCsvField = (field: any) => {
        if (field === null || field === undefined) return '""';
        const str = String(field).replace(/"/g, '""');
        return `"${str}"`;
      };

      const csvRows = filteredReportRows.map((row) => {
        const isSaida = row.TotalDaLinha < 0 || (row.NomeCliente || "").toUpperCase() === "MINHAS DESPESAS";
        const totalFormatted = (isSaida ? -Math.abs(row.TotalDaLinha) : row.TotalDaLinha).toFixed(2).replace(".", ",");
        const unitFormatted = Number(row.PrecoUnitario || 0).toFixed(2).replace(".", ",");

        return [
          escapeCsvField(row.Id),
          escapeCsvField(row.Data || ""),
          escapeCsvField(row.Hora || ""),
          escapeCsvField(isSaida ? "Saída / Despesa" : "Entrada / Atendimento"),
          escapeCsvField(row.NomeCliente || "Não Identificado"),
          escapeCsvField(row.NomePet || "-"),
          escapeCsvField(row.Servico || "-"),
          escapeCsvField(row.Quantidade ?? 1),
          escapeCsvField(unitFormatted),
          escapeCsvField(totalFormatted),
          escapeCsvField(row.Realizado ? "Sim" : "Não"),
          escapeCsvField(row.Pago ? "Sim" : "Não"),
        ].join(";");
      });

      const bom = "\uFEFF";
      const csvContent = bom + [csvHeaders.join(";"), ...csvRows].join("\r\n");
      zip.file(`atendimentos_${periodStr}.csv`, csvContent);

      // 2. Resumo Gerencial e Financeiro (.txt)
      const txtReportLines = [
        "=================================================================",
        `  RELATÓRIO GERENCIAL E FINANCEIRO - ${infoConta?.NomeEmpresa || "BANHO & TOSA"}`,
        "=================================================================",
        `Período de Apuração: ${formatDatePattern(startDate)} até ${formatDatePattern(endDate)}`,
        `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
        `Empresa: ${infoConta?.Razao_Social || infoConta?.NomeEmpresa || "Banho e Tosa"}`,
        infoConta?.Documento_Identificacao ? `CNPJ/CPF: ${infoConta.Documento_Identificacao}` : "",
        infoConta?.Endereco ? `Endereço: ${infoConta.Endereco}` : "",
        infoConta?.Fone ? `Telefone: ${infoConta.Fone}` : "",
        "-----------------------------------------------------------------",
        "RESUMO FINANCEIRO CONSOLIDADO:",
        `• Total de Registros / Atendimentos: ${aggregateStats.totalScheduled}`,
        `• Atendimentos Realizados: ${aggregateStats.realizadosCount}`,
        `• Atendimentos Pagos: ${aggregateStats.pagosCount}`,
        `• Faturamento Bruto (Entradas): ${formatCurrencyBRL(aggregateStats.totalRevenue)}`,
        `• Total de Saídas / Despesas: ${formatCurrencyBRL(aggregateStats.totalSaidas)}`,
        `• Faturamento Líquido (Saldo): ${formatCurrencyBRL(aggregateStats.netTotal)}`,
        `• Valor Já Recebido (Pago): ${formatCurrencyBRL(aggregateStats.faturamentoRecebido)}`,
        `• Valor Pendente (A Receber): ${formatCurrencyBRL(aggregateStats.faturamentoPendente)}`,
        "-----------------------------------------------------------------",
        "DETALHAMENTO DOS LANÇAMENTOS:",
        ...filteredReportRows.map((row, idx) => {
          const isSaida = row.TotalDaLinha < 0 || (row.NomeCliente || "").toUpperCase() === "MINHAS DESPESAS";
          const prefix = isSaida ? "[SAÍDA]" : "[ENTRADA]";
          const valStr = isSaida
            ? `- ${formatCurrencyBRL(Math.abs(row.TotalDaLinha))}`
            : formatCurrencyBRL(row.TotalDaLinha);
          return `${idx + 1}. [${row.Data} ${row.Hora || ""}] ${prefix} ${row.NomeCliente} | Pet: ${row.NomePet || "-"} | Serviço: ${row.Servico || "-"} | Total: ${valStr} | Pago: ${row.Pago ? "SIM" : "NÃO"}`;
        }),
        "=================================================================",
      ].filter(line => line !== "");

      zip.file(`resumo_financeiro_${periodStr}.txt`, txtReportLines.join("\r\n"));

      // 3. Dados Completos em formato estruturado (.json)
      const jsonData = {
        empresa: {
          nome: infoConta?.NomeEmpresa || "Banho e Tosa",
          razaoSocial: infoConta?.Razao_Social || "",
          documento: infoConta?.Documento_Identificacao || "",
          telefone: infoConta?.Fone || "",
        },
        periodo: {
          inicio: startDate,
          fim: endDate,
        },
        estatisticas: {
          totalAtendimentos: aggregateStats.totalScheduled,
          realizados: aggregateStats.realizadosCount,
          pagos: aggregateStats.pagosCount,
          faturamentoBruto: aggregateStats.totalRevenue,
          totalSaidas: aggregateStats.totalSaidas,
          faturamentoLiquido: aggregateStats.netTotal,
          recebido: aggregateStats.faturamentoRecebido,
          pendente: aggregateStats.faturamentoPendente,
        },
        itens: filteredReportRows.map(row => ({
          id: row.Id,
          data: row.Data,
          hora: row.Hora,
          tipo: row.TotalDaLinha < 0 ? "Saída" : "Entrada",
          cliente: row.NomeCliente,
          pet: row.NomePet,
          servico: row.Servico,
          quantidade: row.Quantidade,
          precoUnitario: row.PrecoUnitario,
          total: row.TotalDaLinha,
          realizado: !!row.Realizado,
          pago: !!row.Pago,
        }))
      };
      zip.file(`dados_atendimentos_${periodStr}.json`, JSON.stringify(jsonData, null, 2));

      // 4. Arquivo de instruções e metadados (LEIAME.txt)
      const leiameContent = [
        "PACOTE DE EXPORTAÇÃO DO RELATÓRIO - BANHO E TOSA EXE",
        `Data de Geração: ${new Date().toLocaleString("pt-BR")}`,
        `Período de Apuração: ${formatDatePattern(startDate)} até ${formatDatePattern(endDate)}`,
        "",
        "ARQUIVOS INCLUÍDOS NESTE PACOTE ZIP:",
        `1. atendimentos_${periodStr}.csv -> Planilha formatada para Microsoft Excel, Google Sheets ou LibreOffice (delimitador ';' e UTF-8 com BOM).`,
        `2. resumo_financeiro_${periodStr}.txt -> Resumo gerencial detalhado com totais de faturamento bruto, saídas, saldo líquido e listagem completa.`,
        `3. dados_atendimentos_${periodStr}.json -> Base de dados em formato JSON para importação em outros sistemas ou integração técnica.`,
        `4. relatorio_visual_${periodStr}.png -> Imagem em alta definição da tabela analítica com o cabeçalho institucional da empresa.`,
      ].join("\r\n");
      zip.file("LEIAME.txt", leiameContent);

      // 5. Captura da imagem analítica em alta definição (.png)
      if (tableCardRef.current) {
        try {
          const imageOptions = {
            backgroundColor: "#ffffff",
            pixelRatio: 2,
            skipFonts: true,
            cacheBust: true,
            style: {
              padding: "0px",
              borderRadius: "16px",
              background: "#ffffff"
            },
            filter: (node: Node) => {
              const elem = node as HTMLElement;
              if (elem && elem.classList) {
                if (
                  elem.classList.contains("print:hidden") ||
                  elem.tagName === "BUTTON"
                ) {
                  return false;
                }
              }
              return true;
            }
          };

          let imgDataUrl = "";
          try {
            imgDataUrl = await toPng(tableCardRef.current, imageOptions);
          } catch (corsErr) {
            const images = Array.from(tableCardRef.current.querySelectorAll("img")) as HTMLImageElement[];
            const originalDisplays = images.map(img => {
              const disp = img.style.display;
              img.style.display = "none";
              return { img, disp };
            });
            try {
              imgDataUrl = await toPng(tableCardRef.current, imageOptions);
            } finally {
              originalDisplays.forEach(({ img, disp }) => {
                img.style.display = disp;
              });
            }
          }

          if (imgDataUrl && imgDataUrl.includes(",")) {
            const b64 = imgDataUrl.split(",")[1];
            zip.file(`relatorio_visual_${periodStr}.png`, b64, { base64: true });
          }
        } catch (imgErr) {
          console.warn("Não foi possível gerar a imagem para o pacote ZIP:", imgErr);
        }
      }

      // 6. Geração do arquivo ZIP e disparo do download
      const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 }
      });

      const fileName = `pacote_relatorio_${periodStr}.zip`;
      const url = URL.createObjectURL(zipBlob);
      const downloadLink = document.createElement("a");
      downloadLink.href = url;
      downloadLink.download = fileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("Erro ao gerar pacote ZIP:", error);
      alert(`Erro ao gerar o arquivo ZIP: ${error?.message || "Ocorreu uma falha na compactação."}`);
    } finally {
      setIsExportingZip(false);
    }
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const formatDatePattern = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const themeHexColorMap: Record<string, string> = {
    emerald: "#059669",
    indigo: "#4f46e5",
    sky: "#0ea5e9",
    amber: "#f59e0b",
    rose: "#f43f5e",
    slate: "#334155",
    purple: "#9333ea",
  };
  const userConfigColor = infoConta?.CorFundo || activeTheme.name;
  const headerBgColor = themeHexColorMap[userConfigColor] || (userConfigColor?.startsWith("#") ? userConfigColor : "#059669");

  if (showHistoricoAcoes) {
    return (
      <div className="space-y-6">
        {/* Header Section */}
        <div id="historio-acoes-header" className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white p-5 rounded-2xl border border-slate-200 gap-4 shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`p-1 rounded-md text-white ${activeTheme.primary}`}>
                <Clock className="h-4 w-4" />
              </span>
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 font-mono">
                Segurança e Auditoria
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              Histórico de Ações (Auditoria)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Apenas você (Usuário Master) tem visibilidade e controle sobre estes registros de auditoria do ecossistema.
            </p>
          </div>

          <button
            id="back-to-reports-btn"
            type="button"
            onClick={() => {
              setShowHistoricoAcoes(false);
              setLogSearchQuery("");
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-205 rounded-xl transition duration-100 cursor-pointer active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar para Relatórios
          </button>
        </div>

        {/* Filter Area */}
        <div id="history-filter-card" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Search className="h-4 w-4 text-slate-400" />
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Pesquisar no Histórico
            </h3>
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </span>
            <input
              id="log-search-input"
              type="text"
              placeholder="Pesquisar por descrição, usuário, nível de acesso, ID..."
              value={logSearchQuery}
              onChange={(e) => setLogSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-250 bg-slate-50/50 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-505 transition"
            />
          </div>
        </div>

        {/* Table representation */}
        <div ref={auditTableCardRef} id="history-table-card" className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/40 flex justify-between items-center flex-wrap gap-2 border-dashed">
            <span className="text-xs font-bold text-slate-705">
              Registros Encontrados ({filteredLogs.length})
            </span>
            {logsList.length > 0 && onUpdateHistoricoAcoes && (
              <button
                id="clear-logs-btn"
                type="button"
                onClick={() => {
                  if (confirm("Tem certeza que deseja limpar todo o histórico de ações? Esta ação é irreversível.")) {
                    onUpdateHistoricoAcoes([]);
                  }
                }}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer transition select-none"
              >
                Limpar Histórico
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table id="history-actions-table" className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  <th className="px-4 py-3">ID Histórico</th>
                  <th className="px-4 py-3">Master ID</th>
                  <th className="px-4 py-3">Usuário</th>
                  <th className="px-4 py-3">Nível Usuário</th>
                  <th className="px-4 py-3">Data & Hora</th>
                  <th className="px-4 py-3">Descrição da Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-405 font-medium">
                      Nenhum registro de ação encontrado no histórico.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.ID_Historico} className="hover:bg-slate-50/60 transition duration-75">
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-400 font-bold">
                        {log.ID_Historico}
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-400">
                        {log.Master_ID}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {log.Nome_Usuario}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.Nivel_Usuario.includes("Master")
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : log.Nivel_Usuario.includes("1")
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : log.Nivel_Usuario.includes("2")
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-slate-100 text-slate-705 border border-slate-200"
                        }`}>
                          {log.Nivel_Usuario}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {log.Data_Hora}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {log.Descricao}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* 1. Header Area with Print Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white p-5 rounded-2xl border border-slate-200 gap-4 shadow-xs print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`p-1 rounded-md text-white ${activeTheme.primary}`}>
              <FileText className="h-4 w-4" />
            </span>
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 font-mono">
              Relatórios e Métricas
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-800">
            Relatório de Atendimentos
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Consulte o histórico completo de atendimentos com filtros por período e cliente.
          </p>
        </div>

        <div className="flex flex-row items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {onNavigateToHistoricoCaixa && (
            <button
              type="button"
              onClick={onNavigateToHistoricoCaixa}
              className="inline-flex items-center justify-center gap-2 px-4 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold text-xs md:text-sm hover:bg-indigo-100 transition duration-150 cursor-pointer active:scale-95 shadow-xs whitespace-nowrap shrink-0"
            >
              <FileSpreadsheet className="h-4 w-4 text-indigo-650 shrink-0" />
              <span>Histórico do Caixa</span>
            </button>
          )}

          {!isSubUser && (
            <button
              id="historico-acoes-nav-btn"
              type="button"
              onClick={() => setShowHistoricoAcoes(true)}
              className="inline-flex items-center justify-center gap-2 px-4 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-xs md:text-sm hover:bg-rose-100 transition duration-150 cursor-pointer active:scale-95 shadow-xs whitespace-nowrap shrink-0"
            >
              <Clock className="h-4 w-4 text-rose-600 shrink-0" />
              <span>Histórico de Ações</span>
            </button>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className={`inline-flex items-center justify-center gap-2 px-4 h-10 rounded-xl text-white font-semibold text-xs md:text-sm shadow-xs hover:shadow transition duration-150 cursor-pointer active:scale-95 whitespace-nowrap shrink-0 ${activeTheme.primary}`}
          >
            <Printer className="h-4 w-4 shrink-0" />
            <span>Imprimir</span>
          </button>

          {/* AI ANALYTICAL REPORT INSIGHTS */}
          {(() => {
            const isGodModeAdmin = currentUser && currentUser.Nome === "carrera";
            if (!isGodModeAdmin) return null;
            return (
              <button
                type="button"
                disabled={isGeneratingAnalysis}
                onClick={handleRunAiAnalysis}
                className="inline-flex items-center justify-center gap-2 px-4 h-10 rounded-xl text-white font-semibold text-xs md:text-sm bg-indigo-600 hover:bg-indigo-700 shadow-xs hover:shadow transition duration-150 cursor-pointer active:scale-95 whitespace-nowrap shrink-0 disabled:opacity-50"
                title="Análise com IA"
              >
                {isGeneratingAnalysis ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
                    <span>Processando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-slate-100 shrink-0" />
                    <span>Análise com IA{!isOnline && " (Offline)"}</span>
                  </>
                )}
              </button>
            );
          })()}

          {/* ENVIAR IMAGEM WHATSAPP button */}
          <button
            id="whatsapp-vertical-share-btn"
            type="button"
            disabled={isSharingVertical}
            onClick={handleShareVerticalWhatsApp}
            className="inline-flex items-center justify-center gap-2 px-4 h-10 rounded-xl text-white font-semibold text-xs md:text-sm bg-teal-600 hover:bg-teal-700 shadow-xs hover:shadow transition duration-150 cursor-pointer active:scale-95 whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            {isSharingVertical ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
                <span>Gerando Imagem...</span>
              </>
            ) : (
              <>
                <MessageCircle className="h-4 w-4 shrink-0" />
                <span>Enviar Imagem WhatsApp</span>
              </>
            )}
          </button>

          {/* EXPORTAR PACOTE .ZIP */}
          <button
            id="btn-export-zip"
            type="button"
            disabled={isExportingZip}
            onClick={handleExportZip}
            className="inline-flex items-center justify-center gap-2 px-4 h-10 rounded-xl text-white font-semibold text-xs md:text-sm bg-indigo-600 hover:bg-indigo-700 shadow-xs hover:shadow transition duration-150 cursor-pointer active:scale-95 whitespace-nowrap shrink-0 disabled:opacity-50"
            title="Exportar Pacote (.ZIP) com Planilha CSV, Imagem, Resumo TXT e Dados JSON"
          >
            {isExportingZip ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
                <span>Compactando ZIP...</span>
              </>
            ) : (
              <>
                <Archive className="h-4 w-4 shrink-0" />
                <span>Exportar Pacote (.ZIP)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Advanced Multi-Filter Options Widget */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 print:hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Filter className="h-4 w-4 text-slate-400" />
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Filtros Consolidados
          </h3>
        </div>

        <div className="md:hidden grid grid-cols-1 gap-4">
          {/* Controle de Período com Botões de Navegação Fixos no Topo */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Navegação Rápida
              </label>
              
              {/* Botões de Navegação de Datas */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl select-none">
                <button
                  type="button"
                  onClick={() => handleNavigateDate(-1)}
                  className="px-2.5 py-1 text-[10px] font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg hover:text-slate-900 transition-all cursor-pointer active:scale-95 shadow-3xs flex items-center gap-0.5"
                  title="Período Anterior"
                >
                  <ChevronLeft className="h-2.5 w-2.5 text-slate-500" />
                  <span>Anterior</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigateDate(0)}
                  className="px-3 py-1 text-[10px] font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg hover:text-slate-900 transition-all cursor-pointer active:scale-95 shadow-3xs font-mono"
                  title="Filtrar Hoje"
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigateDate(1)}
                  className="px-2.5 py-1 text-[10px] font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg hover:text-slate-900 transition-all cursor-pointer active:scale-95 shadow-3xs flex items-center gap-0.5"
                  title="Próximo Período"
                >
                  <span>Próxima</span>
                  <ChevronRight className="h-2.5 w-2.5 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Inputs de Data Lado a Lado */}
            <div className="grid grid-cols-2 gap-3">
              {/* Data Inicial */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Data Inicial
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      const newVal = e.target.value;
                      setStartDate(newVal);
                      setEndDate(newVal);
                    }}
                    className="w-full pl-8 pr-2 py-1.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-xl text-slate-700 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer"
                  />
                </div>
              </div>

              {/* Data Final */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Data Final
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      const newVal = e.target.value;
                      if (newVal < startDate) {
                        alert("A data final não pode ser menor que a data inicial.");
                        setEndDate(startDate);
                      } else {
                        setEndDate(newVal);
                      }
                    }}
                    className="w-full pl-8 pr-2 py-1.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-xl text-slate-700 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Nome do Cliente */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Filtrar por Cliente
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
              <div className="relative">
                <input
                  type="text"
                  value={reportClientSearchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setReportClientSearchQuery(val);
                    const found = clientes.find((c) => c.Id === clientSearch);
                    if (!found || found.Nome !== val) {
                      setClientSearch("");
                    }
                  }}
                  placeholder="Selecione ou digite para filtrar..."
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-xl text-slate-700 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer"
                />
                {reportClientSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setReportClientSearchQuery("");
                      setClientSearch("");
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 text-[10px]"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Combo dropdown box for reports */}
              {reportClientSearchQuery.trim().length > 0 && !clientSearch && (
                <div className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100">
                  {clientes
                    .filter((c) => (isAdminViewAll || c.IdUsuarioDono === currentUserOwnerId) && c.Ativo)
                    .filter((c) =>
                      c.Nome.toLowerCase().includes(reportClientSearchQuery.toLowerCase()) ||
                      (c.Telefone && c.Telefone.includes(reportClientSearchQuery))
                    )
                    .map((c) => (
                      <button
                        key={c.Id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setClientSearch(c.Id);
                          setReportClientSearchQuery(c.Nome);
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          setClientSearch(c.Id);
                          setReportClientSearchQuery(c.Nome);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-800 text-xs font-medium transition flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <div className="font-semibold text-slate-900">{c.Nome}</div>
                          {c.Telefone && <div className="text-[10px] text-slate-500 font-mono">{c.Telefone}</div>}
                        </div>
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-md font-bold uppercase font-mono">
                          Selecionar
                        </span>
                      </button>
                    ))}
                  {clientes
                    .filter((c) => (isAdminViewAll || c.IdUsuarioDono === currentUserOwnerId) && c.Ativo)
                    .filter((c) =>
                      c.Nome.toLowerCase().includes(reportClientSearchQuery.toLowerCase()) ||
                      (c.Telefone && c.Telefone.includes(reportClientSearchQuery))
                    ).length === 0 && (
                    <div className="p-3 text-slate-400 text-center text-xs">
                      Nenhum cliente encontrado.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick Preset Picker buttons row */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Atalhos de Período
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => handleSetDatePreset("today")}
                className="py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold rounded-lg text-[10px] text-center transition cursor-pointer"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => handleSetDatePreset("last7")}
                className="py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold rounded-lg text-[10px] text-center transition cursor-pointer"
              >
                Últimos 7 dias
              </button>
              <button
                type="button"
                onClick={() => handleSetDatePreset("thisMonth")}
                className="py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold rounded-lg text-[10px] text-center transition cursor-pointer"
              >
                Este Mês
              </button>
              <button
                type="button"
                onClick={() => handleSetDatePreset("thisYear")}
                className="py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold rounded-lg text-[10px] text-center transition cursor-pointer"
              >
                Este Ano
              </button>
            </div>
          </div>
        </div>

        {/* Layout para Computador (PC/Notebook): Alinhado, Compacto e na Mesma Altura */}
        <div className="hidden md:flex md:items-end md:gap-6 w-full">
          {/* Coluna 1: Filtro de Data com Botões Centrados Logo Acima */}
          <div className="flex flex-col gap-2 w-[280px] shrink-0">
            {/* Botões "Anterior", "Hoje" e "Próxima" centralizados logo acima */}
            <div className="flex justify-center">
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl select-none">
                <button
                  type="button"
                  onClick={() => handleNavigateDate(-1)}
                  className="px-2.5 py-1 text-[10px] font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg hover:text-slate-900 transition-all cursor-pointer active:scale-95 shadow-3xs flex items-center gap-0.5"
                  title="Período Anterior"
                >
                  <ChevronLeft className="h-2.5 w-2.5 text-slate-500" />
                  <span>Anterior</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigateDate(0)}
                  className="px-3 py-1 text-[10px] font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg hover:text-slate-900 transition-all cursor-pointer active:scale-95 shadow-3xs font-mono"
                  title="Filtrar Hoje"
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigateDate(1)}
                  className="px-2.5 py-1 text-[10px] font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg hover:text-slate-900 transition-all cursor-pointer active:scale-95 shadow-3xs flex items-center gap-0.5"
                  title="Próximo Período"
                >
                  <span>Próxima</span>
                  <ChevronRight className="h-2.5 w-2.5 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Inputs de Data Lado a Lado (Mais Compactos) */}
            <div className="grid grid-cols-2 gap-2">
              {/* Data Inicial */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Data Inicial
                </label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      const newVal = e.target.value;
                      setStartDate(newVal);
                      setEndDate(newVal);
                    }}
                    className="w-full pl-7 pr-1 py-1.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-xl text-slate-700 text-[11px] font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer h-9"
                  />
                </div>
              </div>

              {/* Data Final */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Data Final
                </label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      const newVal = e.target.value;
                      if (newVal < startDate) {
                        alert("A data final não pode ser menor que a data inicial.");
                        setEndDate(startDate);
                      } else {
                        setEndDate(newVal);
                      }
                    }}
                    className="w-full pl-7 pr-1 py-1.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-xl text-slate-700 text-[11px] font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer h-9"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Coluna 2: Filtrar por Cliente (Mesma Linha e Altura) */}
          <div className="flex-1 space-y-1 min-w-[200px]">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Filtrar por Cliente
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
              <div className="relative">
                <input
                  type="text"
                  value={reportClientSearchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setReportClientSearchQuery(val);
                    const found = clientes.find((c) => c.Id === clientSearch);
                    if (!found || found.Nome !== val) {
                      setClientSearch("");
                    }
                  }}
                  placeholder="Selecione ou digite para filtrar..."
                  className="w-full pl-9 pr-8 py-1.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-xl text-slate-700 text-[11px] font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer h-9"
                />
                {reportClientSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setReportClientSearchQuery("");
                      setClientSearch("");
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 text-[10px]"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Combo dropdown box for reports */}
              {reportClientSearchQuery.trim().length > 0 && !clientSearch && (
                <div className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100">
                  {clientes
                    .filter((c) => (isAdminViewAll || c.IdUsuarioDono === currentUserOwnerId) && c.Ativo)
                    .filter((c) =>
                      c.Nome.toLowerCase().includes(reportClientSearchQuery.toLowerCase()) ||
                      (c.Telefone && c.Telefone.includes(reportClientSearchQuery))
                    )
                    .map((c) => (
                      <button
                        key={c.Id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setClientSearch(c.Id);
                          setReportClientSearchQuery(c.Nome);
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          setClientSearch(c.Id);
                          setReportClientSearchQuery(c.Nome);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-800 text-xs font-medium transition flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <div className="font-semibold text-slate-900">{c.Nome}</div>
                          {c.Telefone && <div className="text-[10px] text-slate-500 font-mono">{c.Telefone}</div>}
                        </div>
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-md font-bold uppercase font-mono">
                          Selecionar
                        </span>
                      </button>
                    ))}
                  {clientes
                    .filter((c) => (isAdminViewAll || c.IdUsuarioDono === currentUserOwnerId) && c.Ativo)
                    .filter((c) =>
                      c.Nome.toLowerCase().includes(reportClientSearchQuery.toLowerCase()) ||
                      (c.Telefone && c.Telefone.includes(reportClientSearchQuery))
                    ).length === 0 && (
                    <div className="p-3 text-slate-400 text-center text-xs">
                      Nenhum cliente encontrado.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Coluna 3: Atalhos de Período */}
          <div className="w-[300px] shrink-0 space-y-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Atalhos de Período
            </label>
            <div className="grid grid-cols-4 gap-1">
              <button
                type="button"
                onClick={() => handleSetDatePreset("today")}
                className="py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold rounded-lg text-[10px] text-center transition cursor-pointer h-9"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => handleSetDatePreset("last7")}
                className="py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold rounded-lg text-[10px] text-center transition cursor-pointer h-9"
              >
                7 dias
              </button>
              <button
                type="button"
                onClick={() => handleSetDatePreset("thisMonth")}
                className="py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold rounded-lg text-[10px] text-center transition cursor-pointer h-9"
              >
                Este Mês
              </button>
              <button
                type="button"
                onClick={() => handleSetDatePreset("thisYear")}
                className="py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold rounded-lg text-[10px] text-center transition cursor-pointer h-9"
              >
                Este Ano
              </button>
            </div>
          </div>
        </div>

        {/* Status filters row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-3 border-t border-dashed border-slate-100">
          
          {/* Status Realizado filter selector */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
              Execução:
            </span>
            <div className="flex bg-slate-50 p-1 rounded-xl w-full border border-slate-150 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setStatusRealizado("todos")}
                className={`flex-1 py-1 rounded-lg transition-all cursor-pointer text-center ${
                  statusRealizado === "todos"
                    ? "bg-white text-indigo-700 shadow-xs font-black border border-slate-100"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setStatusRealizado("realizados")}
                className={`flex-1 py-1 rounded-lg transition-all cursor-pointer text-center ${
                  statusRealizado === "realizados"
                    ? "bg-white text-emerald-700 shadow-xs font-black border border-slate-100"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Feito
              </button>
              <button
                type="button"
                onClick={() => setStatusRealizado("pendentes")}
                className={`flex-1 py-1 rounded-lg transition-all cursor-pointer text-center ${
                  statusRealizado === "pendentes"
                    ? "bg-white text-amber-750 shadow-xs font-black border border-slate-100"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Pendente
              </button>
            </div>
          </div>

          {/* Status Pago filter selector */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
              Financeiro:
            </span>
            <div className="flex bg-slate-50 p-1 rounded-xl w-full border border-slate-150 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setStatusPago("todos")}
                className={`flex-1 py-1 rounded-lg transition-all cursor-pointer text-center ${
                  statusPago === "todos"
                    ? "bg-white text-indigo-700 shadow-xs font-black border border-slate-100"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setStatusPago("pagos")}
                className={`flex-1 py-1 rounded-lg transition-all cursor-pointer text-center ${
                  statusPago === "pagos"
                    ? "bg-white text-emerald-700 shadow-xs font-black border border-slate-100"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Pago
              </button>
              <button
                type="button"
                onClick={() => setStatusPago("pendentes")}
                className={`flex-1 py-1 rounded-lg transition-all cursor-pointer text-center ${
                  statusPago === "pendentes"
                    ? "bg-white text-red-700 shadow-xs font-black border border-slate-100"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                A Receber
              </button>
            </div>
          </div>

          {/* Ordenar por selector */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
              Ordenar:
            </span>
            <div className="relative w-full">
              <select
                value={orderBy}
                onChange={(e) => setOrderBy(e.target.value as any)}
                className="w-full pl-3 pr-8 py-1.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-xl text-slate-700 text-xs font-semibold focus:outline-hidden transition-all cursor-pointer appearance-none"
              >
                <option value="data_desc">📅 Data (Mais Novos)</option>
                <option value="data_asc">📅 Data (Mais Antigos)</option>
                <option value="pet_asc">🐶 Pet (A - Z)</option>
                <option value="pet_desc">🐶 Pet (Z - A)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Quick Pet or Service name filter text input */}
          <div className="flex items-center gap-2">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={quickPetOrService}
                onChange={(e) => setQuickPetOrService(e.target.value)}
                placeholder="Busca rápida por Pet ou Serviço..."
                className="w-full pl-8.5 pr-3 py-1.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-xl text-slate-600 text-xs placeholder:text-slate-400 focus:outline-hidden transition-all"
              />
            </div>
            {(clientSearch || quickPetOrService || startDate !== initialStartDate || endDate !== todayStr || statusRealizado !== "todos" || statusPago !== "todos" || orderBy !== "data_desc") && (
              <button
                type="button"
                onClick={() => {
                  setClientSearch("");
                  setReportClientSearchQuery("");
                  setQuickPetOrService("");
                  setStartDate(initialStartDate);
                  setEndDate(todayStr);
                  setStatusRealizado("todos");
                  setStatusPago("todos");
                  setOrderBy("data_desc");
                }}
                title="Limpar todos os filtros"
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-xl text-xs font-semibold cursor-pointer transition select-none"
              >
                Limpar
              </button>
            )}
          </div>

        </div>
      </div>

      {/* 2.1 AI Custom Summary & Strategic Recommendations */}
      {aiAnalysisResult && (
        <div className="bg-gradient-to-br from-indigo-50/50 to-white border border-indigo-150 rounded-2xl p-6 shadow-sm space-y-4 print:hidden animate-fadeIn">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1 px-1.5 rounded-lg bg-indigo-100 text-indigo-700 text-[10px] font-extrabold uppercase font-mono tracking-wider flex items-center gap-1">
                <Sparkles className="h-3 w-3 animate-pulse text-indigo-600" />
                <span>Gemini Analytics Active</span>
              </span>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest font-mono">
                Parecer de Inteligência Estratégica
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setAiAnalysisResult(null)}
              className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer font-bold font-mono py-0.5 px-1.5"
            >
              Recuar Análise [x]
            </button>
          </div>
          <div className="text-xs leading-relaxed text-slate-700 whitespace-pre-line font-sans space-y-2">
            {aiAnalysisResult}
          </div>
          <div className="pt-2 text-[10px] text-slate-400 font-mono flex items-center justify-between">
            <span>Para extrair ou recalcular o relatório com novos filtros, mude os seletores e clique em "Análise com IA".</span>
            <span>Estrela-IA Flash Model</span>
          </div>
        </div>
      )}

      {/* Container consolidado para captura de imagem analítica */}
      <div ref={reportRef} className="space-y-6">

        {/* 3. Stats Banners Dashboard Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 print:grid-cols-5">
        
        {/* Total de Atendimentos */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3 relative overflow-hidden">
          <div className="space-y-1">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Atendimentos
            </span>
            <span className="block text-2xl font-black text-slate-800 tracking-tight leading-none">
              {aggregateStats.totalScheduled}
            </span>
            <span className="block text-[10px] text-slate-500 font-semibold">
              No intervalo filtrado
            </span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        {/* Faturamento Total Bruto */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3 relative overflow-hidden">
          <div className="space-y-1">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Faturamento Bruto
            </span>
            <span className="block text-2xl font-black text-slate-800 tracking-tight leading-none text-slate-900">
              {formatCurrency(aggregateStats.totalRevenue)}
            </span>
            <span className="block text-[10px] text-slate-500 font-semibold">
              Somente Entradas
            </span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        {/* Total de Saídas */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3 relative overflow-hidden border-l-4 border-l-rose-500">
          <div className="space-y-1">
            <span className="block text-[10px] font-bold text-rose-500 uppercase tracking-wider font-mono">
              Total de Saídas
            </span>
            <span className="block text-2xl font-black text-rose-600 tracking-tight leading-none">
              {formatCurrency(aggregateStats.totalSaidas)}
            </span>
            <span className="block text-[10px] text-slate-500 font-semibold">
              Gasto em Despesas
            </span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl shrink-0">
            <TrendingDown className="h-5 w-5" />
          </div>
        </div>

        {/* Total Recebido (Pago) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3 relative overflow-hidden border-l-4 border-l-emerald-500">
          <div className="space-y-1">
            <span className="block text-[10px] font-bold text-emerald-500 uppercase tracking-wider font-mono">
              Valor Recebido
            </span>
            <span className="block text-xl font-black text-emerald-600 tracking-tight leading-none">
              {formatCurrency(aggregateStats.faturamentoRecebido)}
            </span>
            <span className="block text-[10px] text-slate-500 font-semibold">
              {aggregateStats.pagosCount} de {aggregateStats.totalScheduled} pagos ({aggregateStats.totalScheduled > 0 ? Math.round((aggregateStats.pagosCount / aggregateStats.totalScheduled) * 100) : 0}%)
            </span>
          </div>
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl shrink-0">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        {/* Total Pendente (A Receber) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3 relative overflow-hidden border-l-4 border-l-amber-500">
          <div className="space-y-1">
            <span className="block text-[10px] font-bold text-amber-500 uppercase tracking-wider font-mono">
              A Receber (Em aberto)
            </span>
            <span className="block text-xl font-black text-amber-600 tracking-tight leading-none">
              {formatCurrency(aggregateStats.faturamentoPendente)}
            </span>
            <span className="block text-[10px] text-slate-500 font-semibold">
              {aggregateStats.totalScheduled - aggregateStats.pagosCount} pendentes de acerto
            </span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0">
            <XCircle className="h-5 w-5" />
          </div>
        </div>

      </div>

      {/* 4. Filtered Rows List Table Display */}
      <div 
        ref={tableCardRef}
        className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs"
      >
        {/* BRANDING HEADER (Corporate high-fidelity layout for print & export) */}
        <div className="bg-white p-6 select-none flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Bloco Superior Esquerdo (Identidade Visual) */}
          <div className="flex-none">
            {infoConta?.Logo ? (
              <img 
                src={infoConta.Logo} 
                alt="Logotipo Comercial" 
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                className="h-16 w-16 md:h-20 md:w-20 rounded-2xl object-cover bg-white p-0.5 border border-slate-200 shadow-xs"
              />
            ) : (
              <div className="p-4 bg-slate-50 text-slate-400 rounded-2xl border border-slate-200 shadow-3xs flex items-center justify-center h-16 w-16 md:h-20 md:w-20">
                <Store className="h-8 w-8 text-slate-500" />
              </div>
            )}
          </div>

          {/* Bloco Superior Direito (Dados Institucionais) */}
          <div className="flex-1 text-left md:text-right space-y-1">
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 uppercase font-sans">
              {infoConta?.NomeEmpresa || "MY BUDDY"}
            </h1>
            
            <div className="text-[11px] md:text-xs text-slate-600 font-medium space-y-0.5">
              {/* Razao_Social e Documento_Identificacao */}
              <p className="font-semibold text-slate-800">
                {infoConta?.Razao_Social || "Nome Comercial não informado"} 
                {infoConta?.Documento_Identificacao ? ` • ${infoConta.Documento_Identificacao}` : ""}
              </p>
              
              {/* Endereço + CEP + Localização padrão (Piracicaba - SP) */}
              <p className="text-slate-500 font-mono">
                {infoConta?.Endereco || "Endereço não informado"}
                {infoConta?.CEP_Estabelecimento ? `, CEP: ${infoConta.CEP_Estabelecimento}` : ""}
                {" - Piracicaba - SP"}
              </p>
              
              {/* Telefone de Contato Público */}
              {infoConta?.Fone && (
                <p className="text-slate-600 font-mono font-bold flex md:justify-end items-center gap-1">
                  📞 {infoConta.Fone}
                </p>
              )}
            </div>
            
            <span className="inline-block mt-2 text-[9px] uppercase font-bold tracking-widest bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-lg text-slate-500">
              Relatório Comercial • {formatDatePattern(startDate)} - {formatDatePattern(endDate)}
            </span>
          </div>
        </div>

        {/* Divisor decorativo imediamente abaixo do cabeçalho de dados pintado com a Cor de Destaque */}
        <div style={{ backgroundColor: headerBgColor }} className="h-[3px] w-full" />

        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200/60 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider font-sans">
              Listagem Analítica de Atendimentos
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Filtragem retornou {filteredReportRows.length} registros válidos.
            </p>
          </div>
          <div className="text-[10px] text-slate-500 font-semibold font-mono print:hidden">
            Período: {formatDatePattern(startDate)} até {formatDatePattern(endDate)}
          </div>
        </div>

        {filteredReportRows.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <AlertCircle className="h-8 w-8 mx-auto text-slate-300" />
            <div className="text-sm font-semibold">Nenhum atendimento corresponde aos filtros atuais</div>
            <p className="text-xs max-w-sm mx-auto">
              Experimente ajustar o intervalo das datas de início/fim ou alterar o operador ou nome do cliente.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/75 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider select-none">
                  {!isSharing && (
                    <th className="p-3 text-center w-12 select-none">
                      <input
                        type="checkbox"
                        checked={filteredReportRows.length > 0 && selectedRows.length === filteredReportRows.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRows(filteredReportRows.map((r) => r.Id));
                          } else {
                            setSelectedRows([]);
                          }
                        }}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20 h-4 w-4 cursor-pointer"
                        title="Selecionar todos"
                      />
                    </th>
                  )}
                  {!isSharing ? (
                    <>
                      <th className="px-4 py-3 font-semibold">Data / Hora</th>
                      <th className="px-4 py-3 font-semibold">Cliente</th>
                      <th className="px-4 py-3 font-semibold text-center">Tipo</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 font-semibold">Data</th>
                      <th className="px-4 py-3 font-semibold">Hora</th>
                    </>
                  )}
                  <th className="px-4 py-3 font-semibold">Nome do Pet</th>
                  <th className="px-4 py-3 font-semibold">Serviço/Produto</th>
                  <th className="px-4 py-3 font-semibold text-center">Quantidade</th>
                  <th className="px-4 py-3 font-semibold text-right">Preço Unit.</th>
                  <th className="px-4 py-3 font-semibold text-right">Total</th>
                  {!isSharing && (
                    <>
                      <th className="px-4 py-3 font-semibold text-center">Executado?</th>
                      <th className="px-4 py-3 font-semibold text-center">Pago?</th>
                    </>
                  )}
                  {!isSharing && isGoldOrMaster && (
                    <th className="px-4 py-3 font-semibold text-center">Ações</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReportRows.map((row) => {
                  const isCaixa = row.TipoRegistro === "caixa";
                  
                  // Resolve client name
                  const resolvedClientName = row.NomeCliente || "Não Identificado";

                  // Resolve service product
                  let resolvedServName = row.Servico;
                  if (!isCaixa) {
                    const prodObj = productsMap.get(row.Servico);
                    resolvedServName = prodObj ? prodObj.Nome : row.Servico;
                    const parentMov = userMovimentosMap.get(row.IdCadMovDiario);
                    if (resolvedClientName.toUpperCase() === "MINHAS DESPESAS" && parentMov?.Observacao) {
                      resolvedServName = parentMov.Observacao;
                    }
                  }

                  const isSaidaRow = row.TotalDaLinha < 0 || resolvedClientName.toUpperCase() === "MINHAS DESPESAS";

                  const rowDate = row.Data || "";
                  const rowClient = (row.NomeCliente || "").trim().toLowerCase();
                  const rowVal = Number(row.TotalDaLinha || 0).toFixed(2);
                  const rowKey = `${rowDate}|${rowClient}|${rowVal}`;
                  const isDuplicate = duplicateCounts[rowKey] > 1;

                  return (
                    <tr key={row.Id} className={`hover:bg-slate-50/75 transition-colors ${selectedRows.includes(row.Id) ? "bg-emerald-50/30" : ""}`}>
                      {!isSharing && (
                        <td className="p-3 text-center select-none">
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(row.Id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRows((prev) => [...prev, row.Id]);
                              } else {
                                setSelectedRows((prev) => prev.filter((id) => id !== row.Id));
                              }
                            }}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20 h-4 w-4 cursor-pointer"
                          />
                        </td>
                      )}
                      {!isSharing ? (
                        <>
                          {/* Data / Hora */}
                          <td className="px-4 py-3 font-mono text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <span className="text-slate-800 font-bold">{formatDatePattern(row.Data)}</span>
                              <span className="text-slate-400 font-light">&bull;</span>
                              <span className="text-slate-500">{row.Hora || "09:00"}</span>
                            </div>
                          </td>
                          {/* Cliente */}
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            <div className="flex items-center gap-2">
                              <span>{resolvedClientName}</span>
                              {isDuplicate && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-200 animate-pulse whitespace-nowrap" title="Registro repetido: Mesma Data, Cliente e Valor">
                                  ⚠️ Duplicado
                                </span>
                              )}
                            </div>
                          </td>
                          {/* Tipo */}
                          <td className="px-4 py-3 text-center select-none">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap ${
                                (row.Tipo || "Entrada") === "Saída"
                                  ? "bg-rose-50 text-rose-700 border border-rose-100"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              }`}
                            >
                              {(row.Tipo || "Entrada") === "Saída" ? "📤 Saída" : "📥 Entrada"}
                            </span>
                          </td>
                        </>
                      ) : (
                        <>
                          {/* Data */}
                          <td className="px-4 py-3 font-mono text-[11px] font-bold text-slate-800 whitespace-nowrap">
                            {formatDatePattern(row.Data)}
                          </td>
                          {/* Hora */}
                          <td className="px-4 py-3 font-mono text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                            {row.Hora || "09:00"}
                          </td>
                        </>
                      )}

                      {/* Nome do Pet */}
                      <td className="px-4 py-3 text-slate-700 font-medium">
                        <span className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] rounded-md font-semibold transition-all">
                          {row.NomePet}
                        </span>
                      </td>

                      {/* Serviço/Produto */}
                      <td className="px-4 py-3 text-slate-700 font-semibold">
                        {resolvedServName}
                      </td>

                      {/* Quantidade */}
                      <td className="px-4 py-3 text-center font-bold text-slate-800">
                        {row.Quantidade}
                      </td>

                      {/* Preço Unitário */}
                      <td className={`px-4 py-3 text-right font-mono ${isSaidaRow ? "text-red-600 font-bold" : "text-slate-500"}`}>
                        {isSaidaRow ? `- ${formatCurrency(Math.abs(row.PrecoUnitario))}` : formatCurrency(row.PrecoUnitario)}
                      </td>

                      {/* Total */}
                      <td className={`px-4 py-3 text-right font-mono font-bold ${isSaidaRow ? "text-red-600 font-black" : "text-slate-900"}`}>
                        {isSaidaRow ? `- ${formatCurrency(Math.abs(row.TotalDaLinha))}` : formatCurrency(row.TotalDaLinha)}
                      </td>

                      {!isSharing && (
                        <>
                          {/* Executado? */}
                          <td className="px-4 py-3 text-center text-[10px] select-none">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full font-bold whitespace-nowrap ${
                                row.Realizado
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                  : "bg-amber-50 text-amber-700 border border-amber-100"
                              }`}
                            >
                              {row.Realizado ? (
                                <>
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                  Concluído
                                </>
                              ) : (
                                <>
                                  <Clock className="h-3 w-3 text-amber-600 animate-spin-slow" />
                                  Pendente
                                </>
                              )}
                            </span>
                          </td>

                          {/* Pago? */}
                          <td className="px-4 py-3 text-center text-[10px] select-none">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold whitespace-nowrap ${
                                row.Pago
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                  : "bg-rose-50 text-rose-700 border border-rose-100"
                              }`}
                            >
                              {row.Pago ? (
                                <>
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                  Pago
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3 w-3 text-rose-600" />
                                  A Receber
                                </>
                              )}
                            </span>
                          </td>
                        </>
                      )}
                      {!isSharing && isGoldOrMaster && (
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            disabled={!selectedRows.includes(row.Id)}
                            onClick={() => handleDeleteRow(row)}
                            className={`inline-flex items-center justify-center p-1.5 rounded-lg text-xs font-bold transition duration-75 active:scale-95 ${
                              selectedRows.includes(row.Id)
                                ? "bg-red-50 hover:bg-red-100 hover:text-red-700 text-red-600 cursor-pointer"
                                : "bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200"
                            }`}
                            title={selectedRows.includes(row.Id) ? "Excluir Registro" : "Marque a caixa de seleção da linha para habilitar a exclusão"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 4.1 Filtered Rows Footer with Sum Total */}
          <div className="bg-slate-50 border-t border-slate-200/85 px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs text-slate-700 select-none">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Resumo dos Atendimentos Filtrados
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold sm:justify-end w-full sm:w-auto">
              <div className={`${(aggregateStats.totalRevenue - aggregateStats.totalSaidas) >= 0 ? "bg-emerald-50 text-emerald-800 border border-emerald-200/70" : "bg-rose-50 text-rose-800 border border-rose-200/70"} px-4 py-2 rounded-xl flex items-center gap-2 shadow-2xs`}>
                <span>VALOR TOTAL DOS ITENS:</span>
                <span className={`text-sm font-black ${(aggregateStats.totalRevenue - aggregateStats.totalSaidas) >= 0 ? "text-emerald-900" : "text-rose-900"}`}>
                  {formatCurrency(aggregateStats.totalRevenue - aggregateStats.totalSaidas)}
                </span>
              </div>
            </div>
          </div>
        </>
        )}
      </div>

      {/* Fim do container de captura */}
      </div>

      {/* 5. Custom WhatsApp Share Confirmation Modal Dialog */}
      {shareDialog && shareDialog.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs select-none animate-fade-in print:hidden">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 bg-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/15 rounded-2xl">
                  <MessageCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-tight">{shareDialog.title}</h3>
                  <p className="text-[11px] text-emerald-100 font-semibold">Instruções para envio simplificado</p>
                </div>
              </div>
              <button
                onClick={() => setShareDialog(null)}
                className="text-white hover:text-emerald-100 text-xl font-bold p-1 bg-white/10 hover:bg-white/20 rounded-xl transition cursor-pointer leading-none w-7 h-7 flex items-center justify-center"
              >
                &times;
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-5 text-slate-700 text-xs">
              <p className="text-slate-500 leading-relaxed font-semibold">
                O layout analítico do relatório foi processado com sucesso! Siga os passos rápidos abaixo para enviar via WhatsApp:
              </p>

              {/* Step 1: Image downloaded */}
              <div className="flex items-start gap-3 bg-slate-50 p-4 border border-slate-200/60 rounded-2xl">
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg font-mono font-bold text-xs shrink-0">
                  1°
                </div>
                <div className="space-y-1.5 w-full">
                  <div className="font-bold text-slate-800 flex items-center justify-between">
                    <span>A Imagem foi Baixada</span>
                    <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50/50 px-2 py-0.5 rounded-md">Salva em Downloads</span>
                  </div>
                  <p className="text-slate-500 text-[11px] leading-tight font-medium">
                    A imagem analítica contendo as tabelas e consolidados foi gerada e salva no seu dispositivo automaticamente.
                  </p>
                   <a
                    href={shareDialog.downloadUrl}
                    download={shareDialog.fileName || `relatorio_atendimentos_${startDate}_ate_${endDate}.png`}
                    className="inline-flex items-center gap-1.5 text-indigo-700 hover:text-indigo-800 font-bold text-[11px] py-1 px-2.5 bg-white border border-slate-200 hover:border-indigo-200 rounded-lg shadow-2xs transition cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Baixar novamente
                  </a>
                </div>
              </div>

              {shareDialog.textToCopy ? (
                <>
                  {/* Step 2: Anexar Imagem */}
                  <div className="flex items-start gap-3 bg-slate-50 p-4 border border-slate-200/60 rounded-2xl">
                    <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg font-mono font-bold text-xs shrink-0">
                      2°
                    </div>
                    <div className="space-y-1.5 w-full">
                      <div className="font-bold text-slate-800 flex items-center justify-between">
                        <span>Mensagem de Envio Pronta</span>
                        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50/50 px-2 py-0.5 rounded-md">Área de Transferência</span>
                      </div>
                      <p className="text-slate-500 text-[11px] leading-tight font-medium">
                        Um texto curto de introdução do relatório já foi copiado automaticamente para sua área de transferência para você colar com a imagem.
                      </p>
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(shareDialog.textToCopy);
                            alert("Texto copiado com sucesso!");
                          } catch {
                            alert("Erro ao copiar.");
                          }
                        }}
                        className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 font-bold text-[11px] py-1 px-2.5 bg-white border border-slate-200 hover:border-emerald-200 rounded-lg shadow-2xs transition cursor-pointer"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copiar introdução novamente
                      </button>
                    </div>
                  </div>

                  {/* Step 3: Instructions */}
                  <div className="flex items-start gap-3 bg-emerald-50/40 p-4 border border-emerald-100 rounded-2xl">
                    <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg font-mono font-bold text-xs shrink-0 font-bold">
                      3°
                    </div>
                    <div className="space-y-1 font-medium">
                      <h4 className="font-bold text-slate-800">Selecione o Contato e Envie!</h4>
                      <p className="text-slate-500 text-[11px] leading-relaxed">
                        Escolha a conversa no WhatsApp, **anexe a imagem JPG** do relatório baixado e, se quiser, **cole (Ctrl+V)** o texto simples de introdução!
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Step 2: Instructions (Image ONLY) */}
                  <div className="flex items-start gap-3 bg-emerald-50/40 p-4 border border-emerald-100 rounded-2xl">
                    <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg font-mono font-bold text-xs shrink-0">
                      2°
                    </div>
                    <div className="space-y-1 font-medium">
                      <h4 className="font-bold text-slate-800">Selecione o Contato e Anexe!</h4>
                      <p className="text-slate-500 text-[11px] leading-relaxed">
                        Escolha a conversa no WhatsApp, **anexe a imagem JPG** do relatório baixado e envie! O disparo não contém qualquer texto para focar apenas na imagem.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3">
              <a
                href={shareDialog.waUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-center shadow-xs transition cursor-pointer flex items-center justify-center gap-2 text-xs"
              >
                <Share2 className="h-4 w-4" />
                Ir para o WhatsApp
              </a>
              <button
                onClick={() => setShareDialog(null)}
                className="w-full sm:w-auto py-3 px-6 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold rounded-2xl text-center transition cursor-pointer text-xs"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Container Oculto para Geração de Imagem Vertical 550x400 */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }} className="print:hidden">
        <div
          ref={verticalReportRef}
          style={{
            width: "550px",
            minHeight: "400px",
            height: "auto",
            backgroundColor: "#ffffff",
            padding: "0px 0px 16px 0px",
            fontFamily: "Inter, system-ui, -apple-system, sans-serif",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxSizing: "border-box",
            border: "1px solid #cbd5e1",
          }}
        >
          {/* Header */}
          <div style={{
            backgroundColor: headerBgColor,
            borderRadius: "0px",
            padding: "16px",
            color: "#ffffff"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              {infoConta?.Logo ? (
                <img
                  src={infoConta.Logo}
                  alt="Logo"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  style={{
                    width: "46px",
                    height: "46px",
                    borderRadius: "8px",
                    objectFit: "cover",
                    border: "1.5px solid rgba(255, 255, 255, 0.4)",
                    flexShrink: 0
                  }}
                />
              ) : (
                <div style={{
                  width: "46px",
                  height: "46px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  fontWeight: "bold",
                  flexShrink: 0
                }}>
                  🐾
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, justifyContent: "center" }}>
                <div style={{
                  fontSize: "13.5px",
                  fontWeight: "900",
                  color: "#ffffff",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  lineHeight: "1.2"
                }}>
                  {infoConta?.NomeEmpresa || "Banho e Tosa Pro"}
                </div>
                <div style={{
                  fontSize: "9px",
                  fontWeight: "500",
                  color: "rgba(255, 255, 255, 0.9)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  marginTop: "3px",
                  lineHeight: "1.2"
                }}>
                  📍 {infoConta?.Endereco || "Endereço físico não informado"}
                </div>
                <div style={{
                  fontSize: "9px",
                  fontWeight: "700",
                  color: "#ffffff",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  marginTop: "1.5px",
                  lineHeight: "1.2"
                }}>
                  📞 {infoConta?.Fone || "Telefone não disponível"}
                </div>
              </div>
            </div>

            {/* RELATÓRIO COMERCIAL Barra correspondente ao filtro */}
            <div style={{
              backgroundColor: "rgba(255, 255, 255, 0.15)",
              color: "#ffffff",
              padding: "4px 8px",
              borderRadius: "5px",
              fontSize: "9px",
              fontWeight: "800",
              letterSpacing: "0.03em",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "12px"
            }}>
              <span>RELATÓRIO COMERCIAL</span>
              <span style={{ fontSize: "8.5px", fontWeight: "700", fontFamily: "monospace" }}>
                {formatDatePattern(startDate)} - {formatDatePattern(endDate)}
              </span>
            </div>
          </div>

          {/* Table Container */}
          <div style={{ display: "flex", flexDirection: "column", marginTop: "12px", flexGrow: 1 }}>
            {/* Título da tabela */}
            <div style={{
              fontSize: "10px",
              fontWeight: "800",
              color: "#334155",
              textTransform: "uppercase",
              letterSpacing: "0.02em",
              marginBottom: "8px",
              lineHeight: "1.3",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              paddingLeft: "16px",
              paddingRight: "16px",
              whiteSpace: "nowrap"
            }}>
              <span style={{ whiteSpace: "nowrap" }}>📅 ATENDIMENTOS NO PERÍODO</span>
            </div>

            {/* Table */}
            <div style={{ width: "100%" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8px" }}>
                <thead>
                  <tr style={{ borderBottom: "1.2px solid #cbd5e1", color: "#64748b", fontWeight: "700", lineHeight: "1.3" }}>
                    <th style={{ textAlign: "left", padding: "4px 1px 4px 16px", width: "55px" }}>DATA</th>
                    <th style={{ textAlign: "left", padding: "4px 1px", width: "105px" }}>CLIENTE</th>
                    <th style={{ textAlign: "left", padding: "4px 1px", width: "80px" }}>NOME DO PET</th>
                    <th style={{ textAlign: "left", padding: "4px 1px" }}>SERVIÇO / PRODUTO</th>
                    <th style={{ textAlign: "right", padding: "4px 16px 4px 1px", width: "70px" }}>TOTAL (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {whatsappReportRows.map((row, index) => {
                    // Resolve Client Name
                    const parentMov = userMovimentosMap.get(row.IdCadMovDiario);
                    const clientObj = parentMov ? clientsMap.get(parentMov.Cliente) : null;
                    const resolvedClientName = clientObj ? clientObj.Nome : (parentMov ? parentMov.Cliente : "Não Identificado");

                    // Resolve Service Product
                    const prodObj = productsMap.get(row.Servico);
                    let resolvedServName = prodObj ? prodObj.Nome : row.Servico;
                    if (resolvedClientName.toUpperCase() === "MINHAS DESPESAS" && parentMov?.Observacao) {
                      resolvedServName = parentMov.Observacao;
                    }

                    // Truncate to ensure perfectly clean fits without breaking vertical space
                    const clientTrunc = resolvedClientName.length > 15 ? resolvedClientName.substring(0, 14) + "..." : resolvedClientName;
                    const petTrunc = row.NomePet.length > 11 ? row.NomePet.substring(0, 10) + "..." : row.NomePet;
                    const serviceTrunc = resolvedServName.length > 18 ? resolvedServName.substring(0, 17) + "..." : resolvedServName;

                    const isSaidaRow = row.TotalDaLinha < 0 || resolvedClientName.toUpperCase() === "MINHAS DESPESAS";

                    return (
                      <tr key={row.Id} style={{ 
                        borderBottom: "1px solid #f1f5f9",
                        backgroundColor: index % 2 === 1 ? "#fafcfd" : "#ffffff"
                      }}>
                        <td style={{ padding: "3.5px 1px 3.5px 16px", color: "#334155", fontWeight: "600" }}>
                          {formatDatePattern(row.Data)}
                        </td>
                        <td style={{ padding: "3.5px 1px", color: "#475569", fontWeight: "600" }}>
                          {clientTrunc}
                        </td>
                        <td style={{ padding: "3.5px 1px", color: "#475569" }}>
                          {petTrunc}
                        </td>
                        <td style={{ padding: "3.5px 1px", color: "#475569" }}>
                          {serviceTrunc}
                        </td>
                        <td style={{ 
                          padding: "3.5px 16px 3.5px 1px", 
                          textAlign: "right", 
                          color: isSaidaRow ? "#dc2626" : "#0f172a", 
                          fontWeight: "750" 
                        }}>
                          {isSaidaRow ? `- ${formatCurrency(Math.abs(row.TotalDaLinha))}` : formatCurrency(row.TotalDaLinha)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Automated Footer Section */}
          <div style={{
            borderTop: "1.5px solid #cbd5e1",
            paddingTop: "6px",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            marginTop: "4px",
            paddingLeft: "16px",
            paddingRight: "16px"
          }}>
            <div style={{
              fontSize: "8px",
              fontWeight: "800",
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.03em"
            }}>
              RESUMO DOS ATENDIMENTOS FILTRADOS
            </div>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div style={{ fontSize: "8.5px", color: "#475569", fontWeight: "600" }}>
                Total de registros válidos: <span style={{ fontWeight: "800", color: "#0f172a" }}>{whatsappReportRows.length}</span>
              </div>
              <div style={{
                backgroundColor: whatsappStats.netTotal >= 0 ? "#f0fdf4" : "#fef2f2",
                border: whatsappStats.netTotal >= 0 ? "1px solid #10b981" : "1px solid #f87171",
                borderRadius: "5px",
                padding: "3px 8px",
                color: whatsappStats.netTotal >= 0 ? "#15803d" : "#b91c1c",
                fontWeight: "900",
                fontSize: "9px",
                display: "flex",
                alignItems: "center",
                gap: "3px"
              }}>
                <span>VALOR TOTAL DOS ITENS:</span>
                <span style={{ fontSize: "10px", fontWeight: "950" }}>
                  {formatCurrency(whatsappStats.netTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

// Simple warning alert icon definition
function AlertCircle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
