/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { DatabaseState, CadUsuario, CadCliente, CadPets, CadProdutos, CadRaca, CadMovDiario, CadDetMovDiario, CadInfoConta, LotesProdutos, PrePedido, PrePedidoItens, HistoricoAcoes, CaixaDiario, CaixaMovimentacao, CaixaSaldosForma, CadFornecedores, PrePedidoCompra, ControleRetorno } from "./types";
import { getInitialDatabase, saveDatabase } from "./data/initialDb";
import { INITIAL_BREEDS } from "./data/initialBreeds";
import { getTheme } from "./data/themes";
import { safeStorage } from "./utils/storage";
import { runFirebaseMigrationToLocal } from "./utils/firebaseMigration";
import { uploadDatabaseBackup, downloadDatabaseBackup, mergeDatabaseStates, downloadAllAccountsDatabaseBackups, subscribeToDatabaseBackup } from "./utils/firebase";
import { bootstrapAndMigrateLocalToFirestore, resolveSyncDocumentIds, updateSyncStatus } from "./utils/firebaseSyncEngine";

// Sub-components
import Login from "./components/Login";
import CompanyHeader from "./components/CompanyHeader";
import ScheduleSheet from "./components/ScheduleSheet";
import ClientsSheet from "./components/ClientsSheet";
import PetsSheet from "./components/PetsSheet";
import ProductsSheet from "./components/ProductsSheet";
import RacasSheet from "./components/RacasSheet";
import UsersSheet from "./components/UsersSheet";
import SuppliersSheet from "./components/SuppliersSheet";
import PrePedidosCompraSheet from "./components/PrePedidosCompraSheet";
import SettingsSheet from "./components/SettingsSheet";
import FirebaseSyncModal from "./components/FirebaseSyncModal";
import ReportSheet from "./components/ReportSheet";
import SchemaSheet from "./components/SchemaSheet";
import WhatsAppFormPanel from "./components/WhatsAppFormPanel";
import WhatsAppClientForm from "./components/WhatsAppClientForm";
import AdminGodModeDashboard from "./components/AdminGodModeDashboard";
import PrePedidoMobileModal from "./components/PrePedidoMobileModal";
import CaixaSheet from "./components/CaixaSheet";
import HistoricoCaixaSheet from "./components/HistoricoCaixaSheet";
import AlertasRetornoSheet from "./components/AlertasRetornoSheet";
import VisaoGeralModal from "./components/VisaoGeralModal";
import PublicReceiptView from "./components/PublicReceiptView";

// Icons for navigation
import {
  CalendarDays,
  UsersRound,
  Sparkles,
  Scissors,
  Bookmark,
  UserCheck,
  Sliders,
  LogOut,
  Info,
  FileSpreadsheet,
  Database,
  MessageSquare,
  Activity,
  ShoppingBag,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  ChevronsUp,
  ChevronsDown,
  Coins,
  Menu,
  X,
  Users,
  Bell,
  LayoutGrid,
  ArrowLeft,
  Car,
  Wrench
} from "lucide-react";
import { getTermos, MARCAS_AUTOMOTIVAS_PADRAO } from "./data/dicionarioTermos";

function getDatabaseStateForUser(userId: string, fullDb: DatabaseState): DatabaseState {
  const userObj = (fullDb.usuarios || []).find(u => u.Id === userId);
  const targetOwnerId = userObj?.IdUsuarioMaster || userId;
  const isPreRegistered = targetOwnerId === "user-1" || targetOwnerId === "user-2" || !targetOwnerId;

  // Inclui clientes do usuário dono OU sem dono definido (garante compatibilidade com backups do Banho e Tosa EXE original)
  const userClients = (fullDb.clientes || []).filter(c => 
    !c.IdUsuarioDono || c.IdUsuarioDono === targetOwnerId || isPreRegistered
  );
  const userClientIds = new Set(userClients.map(c => c.Id));
  const userPets = (fullDb.pets || []).filter(p => !p.IdCliente || userClientIds.has(p.IdCliente) || isPreRegistered);

  // Inclui movimentos do usuário dono OU sem dono definido
  const userMovimentos = (fullDb.movimentos || []).filter(m => 
    !m.IdUsuarioDono || m.IdUsuarioDono === targetOwnerId || isPreRegistered
  );
  const userMovIds = new Set(userMovimentos.map(m => m.Id));

  // Inclui detalhes de movimento cujo pai está em userMovIds OU sem IdCadMovDiario definido
  const userDetalhesMov = (fullDb.detalhesMov || []).filter(d => 
    !d.IdCadMovDiario || userMovIds.has(d.IdCadMovDiario) || isPreRegistered
  );
  
  const userProducts = (fullDb.produtos || []).filter(p => {
    return !p.IdUsuarioDono || p.IdUsuarioDono === targetOwnerId || isPreRegistered;
  });

  const userProductIds = new Set(userProducts.map(p => p.Id));
  const filteredLotes = (fullDb.lotesProdutos || []).filter(l => !l.IdProduto || userProductIds.has(l.IdProduto) || isPreRegistered);

  const userRacas = fullDb.racas || [];

  const userInfoContas = (fullDb.infoContas || []).filter(i => !i.IdUsuarioDono || i.IdUsuarioDono === targetOwnerId || isPreRegistered);
  const userControleRetornos = (fullDb.controleRetornos || []).filter(r => !r.IdUsuarioDono || r.IdUsuarioDono === targetOwnerId || isPreRegistered);

  // Preserve and scope Caixa, PrePedidos, and technical collections
  const userCaixaDiario = (fullDb.caixaDiario || []).filter(c => !c.IdUsuarioMaster || c.IdUsuarioMaster === targetOwnerId || isPreRegistered);
  const userCaixaIds = new Set(userCaixaDiario.map(c => c.Id));
  const userCaixaMovimentacao = (fullDb.caixaMovimentacao || []).filter(m => !m.IdCaixaDiario || userCaixaIds.has(m.IdCaixaDiario) || isPreRegistered);
  const userCaixaSaldosForma = (fullDb.caixaSaldosForma || []).filter(s => !s.IdUsuarioMaster || s.IdUsuarioMaster === targetOwnerId || isPreRegistered);

  const userPrePedidos = (fullDb.prePedidos || []).filter(p => !p.IdUsuarioDono || p.IdUsuarioDono === targetOwnerId || isPreRegistered);
  const userPrePedidoIds = new Set(userPrePedidos.map(p => p.Id));
  const userPrePedidoItens = (fullDb.prePedidoItens || []).filter(i => !i.IdPrePedido || userPrePedidoIds.has(i.IdPrePedido) || isPreRegistered);

  const userPrePedidosCompra = (fullDb.prePedidosCompra || []).filter(p => !p.IdUsuarioDono || p.IdUsuarioDono === targetOwnerId || isPreRegistered);
  const userHistoricoAcoes = (fullDb.historicoAcoes || []).filter(h => !h.Master_ID || h.Master_ID === targetOwnerId || isPreRegistered);
  const userAiConsumo = (fullDb.aiConsumo || []).filter(a => !a.IdUsuario || a.IdUsuario === targetOwnerId || isPreRegistered);
  const userAiConsumoQueue = (fullDb.aiConsumoQueue || []).filter(q => !q.UserId || q.UserId === targetOwnerId || isPreRegistered);

  return {
    clientes: userClients,
    pets: userPets,
    produtos: userProducts,
    lotesProdutos: filteredLotes,
    racas: userRacas,
    movimentos: userMovimentos,
    detalhesMov: userDetalhesMov,
    usuarios: fullDb.usuarios,
    infoContas: userInfoContas,
    controleRetornos: userControleRetornos,
    caixaDiario: userCaixaDiario,
    caixaMovimentacao: userCaixaMovimentacao,
    caixaSaldosForma: userCaixaSaldosForma,
    prePedidos: userPrePedidos,
    prePedidoItens: userPrePedidoItens,
    fornecedores: fullDb.fornecedores || [],
    prePedidosCompra: userPrePedidosCompra,
    historicoAcoes: userHistoricoAcoes,
    aiConsumo: userAiConsumo,
    aiConsumoQueue: userAiConsumoQueue,
    aiRelatoriosGerados: fullDb.aiRelatoriosGerados || {},
  };
}

export function deductProductLots(
  productId: string,
  quantityToDeduct: number,
  lots: LotesProdutos[]
): { updatedLots: LotesProdutos[]; deductedQty: number } {
  // Find lots for this product with quantity > 0
  const productLots = lots
    .filter((l) => l.IdProduto === productId && l.QuantidadeLote > 0)
    // Sort by nearest expiration date first (PEPS)
    .sort((a, b) => {
      const dateA = new Date(a.ValidadeLote).getTime();
      const dateB = new Date(b.ValidadeLote).getTime();
      if (dateA !== dateB) return dateA - dateB;
      // If same expiration, sort by entry date
      const entryA = new Date(a.DataEntrada).getTime();
      const entryB = new Date(b.DataEntrada).getTime();
      return entryA - entryB;
    });

  let remaining = quantityToDeduct;
  const lotIdsToUpdate = new Map<string, number>();

  for (const lot of productLots) {
    if (remaining <= 0) break;
    const available = lot.QuantidadeLote;
    if (available >= remaining) {
      lotIdsToUpdate.set(lot.IdLote, available - remaining);
      remaining = 0;
    } else {
      lotIdsToUpdate.set(lot.IdLote, 0);
      remaining -= available;
    }
  }

  // Map updated quantities back to main list
  const updatedLots = lots.map((l) => {
    if (lotIdsToUpdate.has(l.IdLote)) {
      return {
        ...l,
        QuantidadeLote: lotIdsToUpdate.get(l.IdLote)!,
      };
    }
    return l;
  });

  return { updatedLots, deductedQty: quantityToDeduct - remaining };
}

export function returnToProductLots(
  productId: string,
  quantityToReturn: number,
  lots: LotesProdutos[]
): LotesProdutos[] {
  // Find lots for this product
  const productLots = lots
    .filter((l) => l.IdProduto === productId)
    // Sort by nearest expiration first
    .sort((a, b) => {
      const dateA = new Date(a.ValidadeLote).getTime();
      const dateB = new Date(b.ValidadeLote).getTime();
      return dateA - dateB;
    });

  if (productLots.length === 0) {
    // If no lots exist for this product, let's create a generic "RETORNO" lot to avoid losing inventory
    const newLot: LotesProdutos = {
      IdLote: `lote-ret-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      IdProduto: productId,
      NumeroLote: "RETORNO",
      QuantidadeLote: quantityToReturn,
      ValidadeLote: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 1 year
      DataEntrada: new Date().toISOString().split("T")[0],
    };
    return [...lots, newLot];
  }

  // Put physical inventory back into the first expiring lot (nearest to expiration)
  const targetLotId = productLots[0].IdLote;
  return lots.map((l) => {
    if (l.IdLote === targetLotId) {
      return {
        ...l,
        QuantidadeLote: l.QuantidadeLote + quantityToReturn,
      };
    }
    return l;
  });
}

export default function App() {
  // 1. Core database state initialized with localStorage
  const [db, setDb] = useState<DatabaseState>(() => getInitialDatabase());

  // Check for public client session via dynamic URL parameter
  const [idAtendimento, setIdAtendimento] = useState<string | null>(null);
  const [idVendaParam, setIdVendaParam] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idValue = params.get("idAtendimento");
    if (idValue) {
      setIdAtendimento(idValue);
    }
    const vendaValue = params.get("idVenda");
    if (vendaValue) {
      setIdVendaParam(vendaValue);
    }
  }, []);

  // 0. Session ID and BroadcastChannel for same-device reactive cross-tab and cross-PWA updates
  const sessionId = useMemo(() => Math.random().toString(36).substring(2, 9), []);
  const broadcastChannel = useMemo(() => {
    try {
      return new BroadcastChannel("banho-tosa-db-channel");
    } catch (e) {
      return null;
    }
  }, []);

  const isLocalChangeRef = useRef<boolean>(
    safeStorage.getItem("BANHO_TOSA_PENDING_SYNC") === "true"
  );
  const lastReceivedPayloadRef = useRef<string | null>(null);
  const lastUploadedPayloadRef = useRef<string | null>(null);
  const lastUploadedSlicesRef = useRef<Record<string, string>>({});

  // 2. Logged-in user state (persists across sessions for convenience)
  const [currentUser, setCurrentUser] = useState<CadUsuario | null>(() => {
    const saved = safeStorage.getItem("BANHO_TOSA_CURRENT_USER");
    if (saved) {
      try {
        const u = JSON.parse(saved) as CadUsuario;
        if (u) {
          if (!u.Segmento) {
            u.Segmento = "petshop";
          }
          if (u.Permissoes === "Administrador") {
            u.Tipo_Assinatura = "Vitalício";
            u.Data_Validade = "";
          }
        }
        return u;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Administrator filters to choose viewing either "all users" or "single user"
  const [adminFilterMode, setAdminFilterMode] = useState<"all" | "single">("single");
  const [selectedUserId, setSelectedUserId] = useState<string>(() => {
    const saved = safeStorage.getItem("BANHO_TOSA_CURRENT_USER");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as CadUsuario;
        return parsed.Id;
      } catch (e) {
        return "";
      }
    }
    return "";
  });

  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);
  const [hasPendingSync, setHasPendingSync] = useState<boolean>(() => {
    return safeStorage.getItem("BANHO_TOSA_PENDING_SYNC") === "true";
  });

  const [godModeActive, setGodModeActive] = useState<boolean>(false);

  const handleDisableGodMode = () => {
    setGodModeActive(false);
    updateDbState((prev) => ({
      ...prev,
      aiConsumoQueue: [], // Matar processos de background
      aiRelatoriosGerados: {} // Limpar o cache de relatórios de IA
    }));
    showAlert(
      "Modo Deus Desativado",
      "Processos em segundo plano interrompidos e o cache de consultas de IA foi totalmente limpo e redefinido."
    );
  };

  const [isPrePedidoModalOpen, setIsPrePedidoModalOpen] = useState(false);

  const handleSavePrePedido = (newPrePedido: PrePedido, newItens: PrePedidoItens[]) => {
    updateDbState((prev) => ({
      ...prev,
      prePedidos: [...(prev.prePedidos || []), newPrePedido],
      prePedidoItens: [...(prev.prePedidoItens || []), ...newItens],
    }));
  };

  const isAdmin = currentUser?.Permissoes === "Administrador";
  const isAdminViewAll = isAdmin && adminFilterMode === "all";
  const isSubUser = currentUser?.NivelAcesso === "Subusuário" || currentUser?.NivelAcesso === "subusuario" || currentUser?.NivelAcesso === "Subuser";
  const userPermissionLevel = currentUser?.permission_level ?? 1;
  const effectiveUserId = isAdmin && adminFilterMode === "single" && selectedUserId 
    ? selectedUserId 
    : (currentUser?.IdUsuarioMaster || currentUser?.Id || "");

  const effectiveUser = db.usuarios?.find((u) => u.Id === effectiveUserId) || currentUser;
  const currentSegmento = (effectiveUser?.Segmento || currentUser?.Segmento || "petshop").toLowerCase();
  const isLavaRapido = currentSegmento === "lavarapido";
  const termosApp = getTermos(currentSegmento);

  // Sync selectedUserId with logged in customer
  useEffect(() => {
    if (currentUser && !selectedUserId) {
      setSelectedUserId(currentUser.Id);
    }
  }, [currentUser]);

  // Rotina de inicialização e migração segura:
  // 1. Garante que os dados locais pré-existentes do navegador (notebook) sejam migrados para o Firestore.
  // 2. Se a nuvem já tiver dados mais recentes ou fatias enviadas de outro dispositivo, mescla sem perder nada.
  useEffect(() => {
    const initSync = async () => {
      try {
        console.log("[INICIALIZAÇÃO FIRESTORE] Verificando sincronização e dados locais...");
        const { state, didMigrate } = await bootstrapAndMigrateLocalToFirestore(effectiveUserId || "user-1", currentUser?.Nome || "carrera");
        if (didMigrate) {
          setDb(state);
        }
      } catch (e) {
        console.warn("[INICIALIZAÇÃO FIRESTORE] Executando com banco local e fallback resiliente:", e);
      }
    };

    initSync();
  }, [effectiveUserId]);

  // Listen to network changes for PWA sync
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Automatically trigger sync check when reclaiming internet access
      setTimeout(() => {
        setIsSyncingOffline(true);
      }, 1500);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Sequential Synchronization for Offline AI Requests (Rule 4)
  useEffect(() => {
    const queue = db.aiConsumoQueue || [];
    if (!godModeActive) {
      if (isSyncingOffline) {
        setIsSyncingOffline(false);
      }
      return;
    }
    if (isSyncingOffline && isOnline && queue.length > 0) {
      const processSequentially = async () => {
        setIsSyncingOffline(false); // lock immediately to avoid redundant loops
        
        showAlert(
          "Sincronização PWA Ativada",
          `Conexão com a internet restabelecida! Detectamos ${queue.length} requisições de IA agendadas offline. Iniciando sincronização sequencial de segurança...`
        );

        // Copy working state
        let currentDb = { ...db };

        for (let i = 0; i < queue.length; i++) {
          const req = queue[i];

          // SECURITY GUARDIAN: Skip and discard ghost/background triggers from inactive/phantom profiles like petshop_pro
          if (
            req.UserName === "petshop_pro" || 
            req.UserId === "user-2" || 
            req.Tipo?.includes("CadDetMovDiario") || 
            req.Tipo?.includes("CadMovDiario") ||
            req.Tipo?.includes("Movimento") ||
            req.Tipo?.includes("Faturamento")
          ) {
            console.warn(
              "Segurança de Custos Zero: Ignorando gatilho de automação em segundo plano ou tarefa financeira para:",
              req.UserName,
              "Tipo:",
              req.Tipo
            );
            continue;
          }

          // Beautiful gap to highlight gradual progress (Rule 4 sequential wait)
          await new Promise((resolve) => setTimeout(resolve, 1800));

          const totalTokens = req.Stats.totalScheduled * 65 + 1350 + 580 + Math.floor(Math.random() * 150);
          const mockSyncedLog = {
            Id: `ai-synced-${req.Id}`,
            IdUsuario: req.UserId,
            NomeUsuario: req.UserName,
            TipoRequisicao: `${req.Tipo} (PWA Sincronizado)`,
            DataHora: req.DataHora,
            InputTokens: Math.floor(totalTokens * 0.7),
            OutputTokens: Math.floor(totalTokens * 0.3),
            TotalTokens: totalTokens
          };

          currentDb = {
            ...currentDb,
            aiConsumo: [...(currentDb.aiConsumo || []), mockSyncedLog],
            aiRelatoriosGerados: {
              ...(currentDb.aiRelatoriosGerados || {}),
              [req.Periodo]: true
            }
          };

          // Update state and persistent localStorage midway to show progressive registration in 'Modo Deus'
          setDb(currentDb);
          saveDatabase(currentDb);

          showAlert(
            `Sincronizando (${i + 1}/${queue.length})`,
            `Relatório [${req.Periodo.replace("_", " até ")}] sincronizado com o Gemini 1.5 Flash e tokens registrados!`
          );
        }

        // Clean up queue once fully completed
        const finalDb = {
          ...currentDb,
          aiConsumoQueue: []
        };

        setDb(finalDb);
        saveDatabase(finalDb);

        // Sync with Firestore if user is logged in
        if (currentUser) {
          isLocalChangeRef.current = true;
          if (broadcastChannel) {
            broadcastChannel.postMessage({
              type: "SYNC_DB",
              db: finalDb,
              senderId: sessionId,
            });
          }
        }

        setTimeout(() => {
          showAlert(
            "Sincronização Concluída",
            "Todas as requisições pendentes de IA foram enviadas e os tokens correspondentes foram debitados e auditados com sucesso no Modo Deus!"
          );
        }, 1200);
      };

      processSequentially().catch((e) => {
        console.error("Failed to sync offline AI requests", e);
      });
    } else {
      setIsSyncingOffline(false);
    }
  }, [isSyncingOffline, isOnline, db.aiConsumoQueue]);

  // 3. Navigation Tab Selection state (espelhando fielmente o Banho e Tosa EXE original)
  const getInitialTab = (): string => {
    try {
      const hash = window.location.hash.replace("#", "").toLowerCase().trim();
      const validTabs = [
        "agenda", "visaogeral", "caixa", "historico_caixa", "alertas_retorno",
        "clientes", "pets", "servicos", "racas", "fornecedores", "pre_pedidos_compra",
        "conta", "relatorio", "relatorios", "ficheiras_whatsapp", "usuarios", "schema", "consumo"
      ];
      if (hash === "relatorios") return "relatorio";
      if (hash && validTabs.includes(hash)) {
        return hash;
      }
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab")?.toLowerCase().trim();
      if (tabParam === "relatorios") return "relatorio";
      if (tabParam && validTabs.includes(tabParam)) {
        return tabParam;
      }
    } catch (e) {}
    return "agenda";
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialTab);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [prefilledClientIdForNewPet, setPrefilledClientIdForNewPet] = useState<string | null>(null);
  const [prefilledRetorno, setPrefilledRetorno] = useState<ControleRetorno | ControleRetorno[] | null>(null);
  const [prefilledDate, setPrefilledDate] = useState<string | null>(null);
  const [isVisaoGeralOpen, setIsVisaoGeralOpen] = useState(false);

  // Sincroniza hash do navegador com o activeTab
  useEffect(() => {
    try {
      if (window.location.hash.replace("#", "") !== activeTab) {
        window.history.replaceState(null, "", `#${activeTab}`);
      }
    } catch (e) {}
  }, [activeTab]);

  useEffect(() => {
    const handleHashChange = () => {
      const newHash = window.location.hash.replace("#", "").toLowerCase().trim();
      const targetTab = newHash === "relatorios" ? "relatorio" : newHash;
      if (targetTab && targetTab !== activeTab) {
        setActiveTab(targetTab);
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [activeTab]);

  // Global Scroll helper functions for floating navigation panel
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToBottom = () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
  };

  const scrollPageUp = () => {
    const scrollAmount = window.innerHeight * 0.8;
    window.scrollBy({ top: -scrollAmount, behavior: "smooth" });
  };

  const scrollPageDown = () => {
    const scrollAmount = window.innerHeight * 0.8;
    window.scrollBy({ top: scrollAmount, behavior: "smooth" });
  };

  // Redirection guard to auto-protect restricted admin tabs for sub-users and inactive God Mode
  useEffect(() => {
    const userPermissionLevel = currentUser?.permission_level ?? 1;
    if ((isSubUser || userPermissionLevel === 2 || userPermissionLevel === 3) && (activeTab === "conta" || activeTab === "usuarios" || activeTab === "schema")) {
      setActiveTab("agenda");
    }
    // Protect technical panels when God Mode is OFF
    if (!godModeActive && (activeTab === "consumo" || activeTab === "schema")) {
      setActiveTab("agenda");
    }
  }, [isSubUser, activeTab, godModeActive, currentUser]);

  // 4. Firebase Cloud Sync state and handlers
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  const handleApplySyncState = (newDb: DatabaseState) => {
    isLocalChangeRef.current = true;
    setHasPendingSync(true);
    safeStorage.setItem("BANHO_TOSA_PENDING_SYNC", "true");
    setDb(newDb);
    saveDatabase(newDb);
    triggerCloudSync(newDb);
    if (broadcastChannel) {
      broadcastChannel.postMessage({
        type: "SYNC_DB",
        db: newDb,
        senderId: sessionId,
      });
    }
  };

  // Broadcast listener for cross-tab synchronizations or PWA installs on the same device
  useEffect(() => {
    if (!broadcastChannel) return;
    const handleBroadcastMessage = (event: MessageEvent) => {
      if (
        event.data &&
        event.data.type === "SYNC_DB" &&
        event.data.senderId !== sessionId
      ) {
        const receivedState = event.data.db as DatabaseState;
        isLocalChangeRef.current = false;
        setDb(receivedState);
        saveDatabase(receivedState);
      }
    };
    broadcastChannel.addEventListener("message", handleBroadcastMessage);
    return () => {
      broadcastChannel.removeEventListener("message", handleBroadcastMessage);
    };
  }, [broadcastChannel, sessionId]);

  // Sincronização em Tempo Real com o Google Cloud Firestore:
  // Conecta listeners onSnapshot de alta sensibilidade para garantir que qualquer alteração salva
  // no notebook (ou outro aparelho) apareça automaticamente no celular sem necessidade de restauração manual.
  const syncUserName = currentUser?.Nome || "Sistema";
  const lastSyncedTimestampRef = useRef<string | null>(null);

  // Monitora tanto o canal padrão compartilhado ('user-1') quanto o canal específico do usuário
  const targetSyncDocIds = useMemo(() => {
    return resolveSyncDocumentIds(effectiveUserId);
  }, [effectiveUserId]);

  useEffect(() => {
    if (!targetSyncDocIds || targetSyncDocIds.length === 0) return;

    let isMounted = true;
    console.log(`[FIRESTORE REALTIME] Conectando motor de sincronização em tempo real nos documentos:`, targetSyncDocIds);

    const unsubscribers: (() => void)[] = [];

    targetSyncDocIds.forEach((targetId) => {
      const unsub = subscribeToDatabaseBackup(
        targetId,
        (remoteState, syncedBy, lastSynced, remoteSessionId) => {
          if (!isMounted) return;

          // Se a alteração foi disparada especificamente por ESTA MESMA aba/janela deste dispositivo,
          // apenas limpa o estado de pendência local para confirmar o envio
          if (remoteSessionId && remoteSessionId === sessionId) {
            isLocalChangeRef.current = false;
            setHasPendingSync(false);
            safeStorage.setItem("BANHO_TOSA_PENDING_SYNC", "false");
            updateSyncStatus({ isSyncing: false, lastSyncedAt: lastSynced, error: null });
            return;
          }

          // Se já aplicamos exatamente este mesmo snapshot neste ciclo, evita re-render redundante
          if (lastSynced && lastSynced === lastSyncedTimestampRef.current) {
            return;
          }
          lastSyncedTimestampRef.current = lastSynced;

          console.log(
            `[FIRESTORE REALTIME] Nova alteração detectada na nuvem (documento '${targetId}' gravado por '${syncedBy}' às ${lastSynced})! Atualizando tela do celular/dispositivo instantaneamente...`
          );

          // Atualiza estado do React com o merge inteligente
          setDb((prevDb) => {
            const merged = mergeDatabaseStates(prevDb, remoteState);
            saveDatabase(merged);
            return merged;
          });

          // Atualiza o status global de sincronização
          updateSyncStatus({
            isSyncing: false,
            lastSyncedAt: lastSynced || new Date().toISOString(),
            syncedBy,
            error: null,
          });

          isLocalChangeRef.current = false;
          setHasPendingSync(false);
          safeStorage.setItem("BANHO_TOSA_PENDING_SYNC", "false");

          // Propaga via BroadcastChannel para outras abas abertas no mesmo dispositivo (PWA)
          if (broadcastChannel) {
            try {
              broadcastChannel.postMessage({
                type: "SYNC_DB",
                db: remoteState,
                senderId: sessionId,
              });
            } catch (bcErr) {
              // Ignora erro em navegadores que bloqueiem BroadcastChannel
            }
          }
        },
        (error) => {
          console.warn(`[FIRESTORE REALTIME] Status do documento '${targetId}':`, error?.message || error);
        }
      );

      if (unsub) {
        unsubscribers.push(unsub);
      }
    });

    return () => {
      isMounted = false;
      unsubscribers.forEach((fn) => {
        try {
          fn();
        } catch (e) {
          // Cleanup seguro
        }
      });
    };
  }, [targetSyncDocIds, sessionId, broadcastChannel]);

  // Debounce automático para envio ao Firestore sempre que ocorrer alteração local
  const cloudUploadTimerRef = useRef<any>(null);
  const triggerCloudSync = (latestDb: DatabaseState) => {
    if (cloudUploadTimerRef.current) {
      clearTimeout(cloudUploadTimerRef.current);
    }
    isLocalChangeRef.current = true;
    setHasPendingSync(true);
    safeStorage.setItem("BANHO_TOSA_PENDING_SYNC", "true");
    updateSyncStatus({ isSyncing: true, error: null });

    cloudUploadTimerRef.current = setTimeout(async () => {
      try {
        console.log("[FIRESTORE SYNC] Enviando dados atualizados para o Firestore em tempo real...");
        
        // Dispara o upload para todos os canais de sincronização ativos (garantindo que user-1 e effectiveUserId recebam)
        const uploadTargets = resolveSyncDocumentIds(effectiveUserId);
        await Promise.all(
          uploadTargets.map((targetDocId) =>
            uploadDatabaseBackup(targetDocId, syncUserName, latestDb, sessionId)
          )
        );

        setHasPendingSync(false);
        safeStorage.setItem("BANHO_TOSA_PENDING_SYNC", "false");
        isLocalChangeRef.current = false;
        
        const nowIso = new Date().toISOString();
        updateSyncStatus({
          isSyncing: false,
          lastSyncedAt: nowIso,
          syncedBy: syncUserName,
          error: null,
        });

        console.log("[FIRESTORE SYNC] Dados sincronizados com a nuvem com sucesso!");
      } catch (err: any) {
        console.warn("[FIRESTORE SYNC] Erro ou offline ao sincronizar com Firestore, mantido em cache local:", err);
        updateSyncStatus({
          isSyncing: false,
          error: err?.message || "Erro na sincronização",
        });
      }
    }, 1000); // 1.0s de debounce responsivo para propagação ultra-rápida entre dispositivos
  };

  // Global modal state to bypass iframe confirm/alert restrictions beautifully
  const [modalDialog, setModalDialog] = useState<{
    type: "confirm" | "alert";
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    confirmClass?: string;
    cancelClass?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  } | null>(null);

  const showConfirm = (
    title: string,
    description: string,
    onConfirm: () => void,
    onCancel?: () => void,
    confirmText?: string,
    cancelText?: string,
    confirmClass?: string,
    cancelClass?: string
  ) => {
    setModalDialog({
      type: "confirm",
      title,
      description,
      confirmText,
      cancelText,
      confirmClass,
      cancelClass,
      onConfirm: () => {
        onConfirm();
        setModalDialog(null);
      },
      onCancel: () => {
        if (onCancel) onCancel();
        setModalDialog(null);
      },
    });
  };

  const showAlert = (title: string, description: string) => {
    setModalDialog({
      type: "alert",
      title,
      description,
      onConfirm: () => setModalDialog(null),
    });
  };

  // Save database updates
  const updateDbState = (updater: (prev: DatabaseState) => DatabaseState) => {
    isLocalChangeRef.current = true;
    setHasPendingSync(true);
    safeStorage.setItem("BANHO_TOSA_PENDING_SYNC", "true");
    setDb((prev) => {
      const updated = updater(prev);
      
      // Force 'Geral' pet presence for any recorded client if not exist, and deduplicate/normalize
      let didChange = false;
      const initialPets = updated.pets || [];
      const nonGeralPets = initialPets.filter(
        (p) => !p.Nome || p.Nome.trim().toLowerCase() !== "geral"
      );
      const geralPets = initialPets.filter(
        (p) => p.Nome && p.Nome.trim().toLowerCase() === "geral"
      );

      const updatedGeralPets: any[] = [];
      
      if (updated.clientes && Array.isArray(updated.clientes)) {
        updated.clientes.forEach((client) => {
          const clientId = client.Id;
          const clientGerals = geralPets.filter((p) => p.IdCliente === clientId);

          if (clientGerals.length === 0) {
            updatedGeralPets.push({
              Id: `pet-geral-${clientId}-${Math.random().toString(36).substr(2, 5)}`,
              Nome: "Geral",
              Especie: "_",
              Raca: "_",
              Porte: "_",
              Sexo: "_",
              IdCliente: clientId,
              Ativo: true,
            });
            didChange = true;
          } else {
            const first = clientGerals[0];
            const updatedFirst = {
              ...first,
              Nome: "Geral",
              Especie: "_",
              Raca: "_",
              Porte: "_",
              Sexo: "_",
            };
            updatedGeralPets.push(updatedFirst);

            if (
              first.Nome !== "Geral" ||
              first.Especie !== "_" ||
              first.Sexo !== "_" ||
              first.Raca !== "_" ||
              first.Porte !== "_"
            ) {
              didChange = true;
            }

            if (clientGerals.length > 1) {
              didChange = true;
            }
          }
        });
      }

      const finalPets = didChange ? [...nonGeralPets, ...updatedGeralPets] : initialPets;
      let finalDb = didChange ? { ...updated, pets: finalPets } : updated;

      // Ensure all Administrators are permanently 'Vitalício' with empty 'Data_Validade'
      if (finalDb.usuarios && Array.isArray(finalDb.usuarios)) {
        let sweptLogins = false;
        const normalizedUsuarios = finalDb.usuarios.map((u) => {
          if (u.Permissoes === "Administrador" && (u.Tipo_Assinatura !== "Vitalício" || u.Data_Validade !== "")) {
            sweptLogins = true;
            return { ...u, Tipo_Assinatura: "Vitalício" as const, Data_Validade: "" };
          }
          return u;
        });
        if (sweptLogins) {
          finalDb = { ...finalDb, usuarios: normalizedUsuarios };
        }
      }

      saveDatabase(finalDb);

      // Dispara envio automático com debounce para o Google Firestore
      triggerCloudSync(finalDb);

      if (broadcastChannel) {
        broadcastChannel.postMessage({
          type: "SYNC_DB",
          db: finalDb,
          senderId: sessionId,
        });
      }
      return finalDb;
    });
  };

  // Persist login session helpers
  const handleLoginSuccess = (user: CadUsuario) => {
    setCurrentUser(user);
    safeStorage.setItem("BANHO_TOSA_CURRENT_USER", JSON.stringify(user));
    // Reset tab to default: Admin starts at God Mode, Users start at Agenda
    if (user.Permissoes === "Administrador") {
      setActiveTab("consumo");
    } else {
      setActiveTab("agenda");
    }
  };

  const handleLogout = () => {
    showConfirm(
      "Sair do Painel",
      "Deseja realmente desconectar-se do painel de controle e encerrar sua sessão?",
      () => {
        setCurrentUser(null);
        safeStorage.removeItem("BANHO_TOSA_CURRENT_USER");
      }
    );
  };

  // Find active user company metadata dynamically (CadInfoConta)
  const activeUserConfig = useMemo(() => {
    if (!currentUser) return undefined;
    const ownerId = currentUser.IdUsuarioMaster || currentUser.Id;
    return db.infoContas.find((info) => info.IdUsuarioDono === ownerId);
  }, [db.infoContas, currentUser]);

  // Filter products/services based on ownership and security rules
  const visibleProdutos = useMemo(() => {
    if (!db.produtos) return [];
    if (isAdminViewAll) {
      return db.produtos;
    }
    const isPreRegistered = effectiveUserId === "user-1" || effectiveUserId === "user-2";
    if (isPreRegistered) {
      return db.produtos.filter(
        (p) => !p.IdUsuarioDono || p.IdUsuarioDono === effectiveUserId
      );
    }
    return db.produtos.filter(
      (p) => p.IdUsuarioDono === effectiveUserId
    );
  }, [db.produtos, effectiveUserId, isAdminViewAll]);

  // Filter breeds / vehicle brands based on ownership and security rules - set as global table
  const visibleRacas = useMemo(() => {
    const isSegmentoAutomotivo = currentSegmento === "lavarapido" || currentSegmento === "oficina";

    if (isSegmentoAutomotivo) {
      const baseMarcas: CadRaca[] = MARCAS_AUTOMOTIVAS_PADRAO.map((marca, index) => ({
        Id: `marca-std-${index + 1}`,
        Raca: marca,
        Especie: marca.toLowerCase().includes("moto") || marca === "Yamaha" || marca === "BMW Motorrad" ? "Moto" : "Carro",
        IdUsuarioDono: effectiveUserId,
        status_registro: "padrão",
      }));

      const dbRacas = db.racas || [];
      const userCustomMarcas = dbRacas.filter((r) =>
        r.Especie === "Carro" ||
        r.Especie === "Moto" ||
        r.Especie === "Veículo" ||
        r.Especie === "Montadora" ||
        MARCAS_AUTOMOTIVAS_PADRAO.some((m) => m.toLowerCase() === r.Raca.toLowerCase())
      );

      const merged = [...userCustomMarcas];
      baseMarcas.forEach((base) => {
        const exists = merged.some(
          (m) => m.Raca.toLowerCase() === base.Raca.toLowerCase()
        );
        if (!exists) {
          merged.push(base);
        }
      });
      return merged;
    }

    const baseRacas = INITIAL_BREEDS.map((r, index) => ({
      Id: `raca-std-${effectiveUserId}-${index + 1}`,
      Raca: r.Raca,
      Especie: r.Especie,
      IdUsuarioDono: effectiveUserId,
      status_registro: "padrão"
    }));

    const dbRacas = db.racas || [];
    const merged = [...dbRacas];

    // Ensure all standard base breeds are always visible and present in the list
    baseRacas.forEach((base) => {
      const exists = merged.some(
        (m) => m.Raca.toLowerCase() === base.Raca.toLowerCase()
      );
      if (!exists) {
        merged.push(base);
      }
    });

    return merged;
  }, [db.racas, effectiveUserId, currentSegmento]);

  // Find active theme configuration based on color stored in Config (with soft emerald as default fallback)
  const activeTheme = useMemo(() => {
    const colorName = activeUserConfig?.CorFundo || "emerald";
    return getTheme(colorName);
  }, [activeUserConfig]);

  // Determine dynamic accent background for custom highlighted themes
  const customBackgroundStyle = useMemo(() => {
    return {
      backgroundColor: activeTheme.bgLightHex,
    };
  }, [activeTheme]);

  // Check if standard user subscription is restricted / in read-only mode (expired for > 3 days)
  const isSubscriptionRestricted = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.Permissoes === "Administrador") return false;
    if (currentUser.Tipo_Assinatura === "Vitalício") return false;
    if (!currentUser.Data_Validade) return false;

    try {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const todayTime = new Date(todayStr).getTime();
      const valTime = new Date(currentUser.Data_Validade).getTime();

      const diffMs = todayTime - valTime; // positive standard days overdue
      const daysDiff = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      return daysDiff > 3;
    } catch (e) {
      return false;
    }
  }, [currentUser]);

  // 5. If client is filling dynamic form (WhatsApp Link), bypass normal layout and login checks entirely
  if (idAtendimento) {
    return <WhatsAppClientForm idAtendimento={idAtendimento} />;
  }

  if (idVendaParam) {
    return <PublicReceiptView idVenda={idVendaParam} db={db} />;
  }

  // Block renders until logged in
  if (!currentUser) {
    return <Login usuarios={db.usuarios} onLoginSuccess={handleLoginSuccess} />;
  }

  // Centralized action history log helper
  const createHistoricoAcoesEntry = (descricao: string): HistoricoAcoes => {
    const currentLevelLabel = isSubUser 
      ? `Nível ${userPermissionLevel}`
      : "Master";
    return {
      ID_Historico: "hist-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
      Master_ID: effectiveUserId || currentUser?.Id || "master",
      Nome_Usuario: currentUser?.Nome || "Sistema",
      Nivel_Usuario: currentLevelLabel,
      Data_Hora: new Date().toLocaleString("pt-BR"),
      Descricao: descricao
    };
  };

  // Handle Updates for individual tables
  const handleUpdateClientes = (updatedClientes: CadCliente[]) => {
    updateDbState((prev) => {
      let desc = "Clientes atualizados";
      if ((prev.clientes || []).length < updatedClientes.length) {
        const added = updatedClientes[updatedClientes.length - 1];
        desc = `Novo cliente cadastrado: "${added?.Nome || ''}"`;
      } else if ((prev.clientes || []).length > updatedClientes.length) {
        desc = "Cliente removido";
      } else {
        const changedItem = updatedClientes.find((c, i) => prev.clientes?.[i] && JSON.stringify(c) !== JSON.stringify(prev.clientes[i]));
        if (changedItem) {
          desc = `Cliente "${changedItem.Nome}" atualizado`;
        }
      }
      const newEntry = createHistoricoAcoesEntry(desc);
      return {
        ...prev,
        clientes: updatedClientes,
        historicoAcoes: [newEntry, ...(prev.historicoAcoes || [])]
      };
    });
  };

  const handleUpdatePets = (updatedPets: CadPets[]) => {
    updateDbState((prev) => {
      let desc = "Pets atualizados";
      if ((prev.pets || []).length < updatedPets.length) {
        const added = updatedPets[updatedPets.length - 1];
        desc = `Novo pet cadastrado: "${added?.Nome || ''}"`;
      } else if ((prev.pets || []).length > updatedPets.length) {
        desc = "Pet removido";
      } else {
        const changedItem = updatedPets.find((p, i) => prev.pets?.[i] && JSON.stringify(p) !== JSON.stringify(prev.pets[i]));
        if (changedItem) {
          desc = `Pet "${changedItem.Nome}" atualizado`;
        }
      }
      const newEntry = createHistoricoAcoesEntry(desc);
      return {
        ...prev,
        pets: updatedPets,
        historicoAcoes: [newEntry, ...(prev.historicoAcoes || [])]
      };
    });
  };

  const handleUpdateProdutos = (updatedProdutos: CadProdutos[]) => {
    updateDbState((prev) => {
      let desc = "Serviços/Produtos atualizados";
      if ((prev.produtos || []).length < updatedProdutos.length) {
        const added = updatedProdutos[updatedProdutos.length - 1];
        desc = `Novo serviço/produto adicionado: "${added?.Nome || ''}"`;
      } else if ((prev.produtos || []).length > updatedProdutos.length) {
        desc = "Serviço/produto desativado/removido";
      } else {
        const changedItem = updatedProdutos.find((p, i) => prev.produtos?.[i] && JSON.stringify(p) !== JSON.stringify(prev.produtos[i]));
        if (changedItem) {
          desc = `Serviço "${changedItem.Nome}" editado`;
        }
      }

      const isPreRegistered = effectiveUserId === "user-1" || effectiveUserId === "user-2";
      const otherUsersProducts = (prev.produtos || []).filter((p) => {
        if (isPreRegistered) {
          return p.IdUsuarioDono && p.IdUsuarioDono !== effectiveUserId;
        } else {
          return !p.IdUsuarioDono || p.IdUsuarioDono !== effectiveUserId;
        }
      });

      const merged = [
        ...otherUsersProducts,
        ...updatedProdutos.filter((p) => {
          if (isPreRegistered) {
            return !p.IdUsuarioDono || p.IdUsuarioDono === effectiveUserId;
          } else {
            return p.IdUsuarioDono === effectiveUserId;
          }
        })
      ];

      const newEntry = createHistoricoAcoesEntry(desc);
      return {
        ...prev,
        produtos: merged,
        historicoAcoes: [newEntry, ...(prev.historicoAcoes || [])]
      };
    });
  };

  const handleUpdateFornecedores = (updatedFornecedores: CadFornecedores[]) => {
    updateDbState((prev) => {
      let desc = "Fornecedores atualizados";
      if ((prev.fornecedores || []).length < updatedFornecedores.length) {
        const added = updatedFornecedores[updatedFornecedores.length - 1];
        desc = `Novo fornecedor adicionado: "${added?.Nome_Fornecedor || ''}"`;
      } else if ((prev.fornecedores || []).length > updatedFornecedores.length) {
        desc = "Fornecedor removido";
      } else {
        const changedItem = updatedFornecedores.find((f, i) => prev.fornecedores?.[i] && JSON.stringify(f) !== JSON.stringify(prev.fornecedores[i]));
        if (changedItem) {
          desc = `Fornecedor "${changedItem.Nome_Fornecedor}" editado`;
        }
      }
      const newEntry = createHistoricoAcoesEntry(desc);
      return {
        ...prev,
        fornecedores: updatedFornecedores,
        historicoAcoes: [newEntry, ...(prev.historicoAcoes || [])]
      };
    });
  };

  const handleUpdatePrePedidosCompra = (updatedPrePedidosCompra: PrePedidoCompra[]) => {
    updateDbState((prev) => {
      let desc = "Pré-pedidos de compras atualizados";
      if ((prev.prePedidosCompra || []).length < updatedPrePedidosCompra.length) {
        const added = updatedPrePedidosCompra[0]; // added at front
        const supplier = prev.fornecedores?.find(f => f.ID_Fornecedor === added?.ID_Fornecedor);
        desc = `Novo pré-pedido criado para: "${supplier?.Nome_Fornecedor || added?.ID_Fornecedor || ''}"`;
      } else if ((prev.prePedidosCompra || []).length > updatedPrePedidosCompra.length) {
        desc = "Pré-pedido de compra removido";
      } else {
        desc = "Status de pré-pedido de compra atualizado";
      }
      const newEntry = createHistoricoAcoesEntry(desc);
      return {
        ...prev,
        prePedidosCompra: updatedPrePedidosCompra,
        historicoAcoes: [newEntry, ...(prev.historicoAcoes || [])]
      };
    });
  };

  const handleUpdateRacas = (updatedRacas: CadRaca[]) => {
    const isUserAdminMaster = currentUser?.Permissoes === "Administrador" || currentUser?.NivelAcesso === "AdministradorMaster" || currentUser?.NivelAcesso === "Master";

    if (!isUserAdminMaster) {
      // Find the currently visible breeds for this user
      const originalVisible = db.racas.filter((r) => {
        const isPreRegistered = effectiveUserId === "user-1" || effectiveUserId === "user-2";
        if (isPreRegistered) {
          return !r.IdUsuarioDono || r.IdUsuarioDono === effectiveUserId;
        }
        return r.IdUsuarioDono === effectiveUserId;
      });

      // Check if any base breed or another user's breed was deleted
      const deletedBreeds = originalVisible.filter(oldR => !updatedRacas.some(newR => newR.Id === oldR.Id));
      const deletedUnauthorized = deletedBreeds.filter(oldR => 
        !oldR.Id.startsWith("raca-custom-") || oldR.IdUsuarioDono !== effectiveUserId
      );

      // Check if any base breed or another user's breed was edited
      const editedBreeds = updatedRacas.filter(newR => {
        const oldR = originalVisible.find(o => o.Id === newR.Id);
        if (!oldR) return false;
        return oldR.Raca !== newR.Raca || oldR.Especie !== newR.Especie;
      });
      const editedUnauthorized = editedBreeds.filter(newR => 
        !newR.Id.startsWith("raca-custom-") || newR.IdUsuarioDono !== effectiveUserId
      );

      // Check for illegal additions (must be custom and belong to user)
      const addedBreeds = updatedRacas.filter(newR => !originalVisible.some(oldR => oldR.Id === newR.Id));
      const addedUnauthorized = addedBreeds.filter(newR => 
        !newR.Id.startsWith("raca-custom-") || newR.IdUsuarioDono !== effectiveUserId
      );

      if (deletedUnauthorized.length > 0 || editedUnauthorized.length > 0 || addedUnauthorized.length > 0) {
        showAlert("ERRO: Operação Negada", "Ação restrita ao Administrador. Registros de raças que fazem parte da base inicial são imutáveis.");
        return;
      }
    }

    updateDbState((prev) => {
      let desc = "Biblioteca de raças atualizada";
      if ((prev.racas || []).length < updatedRacas.length) {
        const added = updatedRacas[updatedRacas.length - 1];
        desc = `Nova raça adicionada: "${added?.Raca || ''}"`;
      }

      const isPreRegistered = effectiveUserId === "user-1" || effectiveUserId === "user-2";
      const otherUsersRacas = (prev.racas || []).filter((r) => {
        if (isPreRegistered) {
          return r.IdUsuarioDono && r.IdUsuarioDono !== effectiveUserId;
        } else {
          return !r.IdUsuarioDono || r.IdUsuarioDono !== effectiveUserId;
        }
      });

      const merged = [
        ...otherUsersRacas,
        ...updatedRacas.filter((r) => {
          if (isPreRegistered) {
            return !r.IdUsuarioDono || r.IdUsuarioDono === effectiveUserId;
          } else {
            return r.IdUsuarioDono === effectiveUserId;
          }
        })
      ];

      const newEntry = createHistoricoAcoesEntry(desc);
      return {
        ...prev,
        racas: merged,
        historicoAcoes: [newEntry, ...(prev.historicoAcoes || [])]
      };
    });
  };

  const handleUpdateMovimentos = (updatedMov: CadMovDiario[]) => {
    updateDbState((prev) => {
      let desc = "Agenda de movimentos atualizada";
      const oldMov = prev.movimentos || [];
      if (updatedMov.length > oldMov.length) {
        const added = updatedMov[updatedMov.length - 1];
        desc = `Agendou novo movimento de serviços para: "${added?.Cliente || 'Agendamento Sem Cliente'}"`;
      } else if (updatedMov.length < oldMov.length) {
        desc = "Agendamento excluído/removido da agenda";
      } else {
        const changed = updatedMov.find((m, i) => oldMov[i] && JSON.stringify(m) !== JSON.stringify(oldMov[i]));
        if (changed) {
          desc = `Agendamento alterado para o cliente: "${changed.Cliente || 'Sem Nome'}"`;
        }
      }
      const newEntry = createHistoricoAcoesEntry(desc);
      return {
        ...prev,
        movimentos: updatedMov,
        historicoAcoes: [newEntry, ...(prev.historicoAcoes || [])]
      };
    });
  };

  const handleUpdateControleRetornos = (updatedRetornos: ControleRetorno[]) => {
    updateDbState((prev) => {
      let desc = "Controle de retornos atualizado";
      const oldRet = prev.controleRetornos || [];
      if (updatedRetornos.length > oldRet.length) {
        desc = "Novo retorno recorrente registrado";
      } else if (updatedRetornos.length < oldRet.length) {
        desc = "Alerta de retorno removido";
      } else {
        const changed = updatedRetornos.find((r, i) => oldRet[i] && JSON.stringify(r) !== JSON.stringify(oldRet[i]));
        if (changed && changed.Status === "Agendado" && oldRet.find(x => x.Id === changed.Id)?.Status === "Pendente") {
          desc = `Agendamento de retorno realizado com sucesso para o pet: "${changed.NomePet}"`;
        }
      }
      const newEntry = createHistoricoAcoesEntry(desc);
      return {
        ...prev,
        controleRetornos: updatedRetornos,
        historicoAcoes: [newEntry, ...(prev.historicoAcoes || [])]
      };
    });
  };

  const handleUpdateLotesProdutos = (updatedLotes: LotesProdutos[]) => {
    updateDbState((prev) => {
      let desc = "Lotes de produtos atualizados";
      if ((prev.lotesProdutos || []).length < updatedLotes.length) {
        desc = "Novo lote de mercadoria cadastrado";
      }
      const newEntry = createHistoricoAcoesEntry(desc);
      return {
        ...prev,
        lotesProdutos: updatedLotes,
        historicoAcoes: [newEntry, ...(prev.historicoAcoes || [])]
      };
    });
  };

  const handleUpdateDetailsMov = (updatedDetMov: CadDetMovDiario[]) => {
    updateDbState((prev) => {
      const oldList = prev.detalhesMov || [];
      const newList = updatedDetMov;
      
      let currentLots = prev.lotesProdutos ? [...prev.lotesProdutos] : [];
      let desc = "Detalhes de agendamentos atualizados";
      
      if (newList.length > oldList.length) {
        const added = newList[newList.length - 1];
        desc = `Adicionou serviço/produto ao agendamento: "${added?.Servico || ''}" (${added?.Quantidade || 1}x)`;
      } else if (newList.length < oldList.length) {
        desc = "Serviço estornado no agendamento";
      } else {
        const changed = newList.find((item, i) => oldList[i] && JSON.stringify(item) !== JSON.stringify(oldList[i]));
        if (changed) {
          const oldItem = oldList.find(o => o.Id === changed.Id);
          if (oldItem && oldItem.Ativo && !changed.Ativo) {
            desc = "Serviço estornado no agendamento";
          } else {
            desc = `Alterou serviço/produto "${changed.Servico}" no agendamento`;
          }
        }
      }

      const newEntry = createHistoricoAcoesEntry(desc);
      
      // Index old items
      const oldMap = new Map<string, CadDetMovDiario>();
      oldList.forEach(item => oldMap.set(item.Id, item));
      
      newList.forEach(newItem => {
        if (newItem.Ativo && newItem.Tipo === "Entrada") {
          const oldItem = oldMap.get(newItem.Id);
          
          let qtyToDeduct = 0;
          if (!oldItem || !oldItem.Ativo || oldItem.Tipo !== "Entrada") {
            qtyToDeduct = Number(newItem.Quantidade || 0);
          } else if (newItem.Quantidade > oldItem.Quantidade) {
            qtyToDeduct = newItem.Quantidade - oldItem.Quantidade;
          } else if (newItem.Quantidade < oldItem.Quantidade) {
            const qtyToReturn = oldItem.Quantidade - newItem.Quantidade;
            currentLots = returnToProductLots(newItem.Servico, qtyToReturn, currentLots);
          }
          
          if (qtyToDeduct > 0) {
            const { updatedLots } = deductProductLots(newItem.Servico, qtyToDeduct, currentLots);
            currentLots = updatedLots;
          }
        } else if (oldMap.has(newItem.Id)) {
          const oldItem = oldMap.get(newItem.Id)!;
          if (oldItem.Ativo && oldItem.Tipo === "Entrada") {
            const qtyToReturn = Number(oldItem.Quantidade || 0);
            currentLots = returnToProductLots(oldItem.Servico, qtyToReturn, currentLots);
          }
        }
      });
      
      // Also check if any old item was completely deleted/omitted in newList
      const newIds = new Set(newList.map(item => item.Id));
      oldList.forEach(oldItem => {
        if (!newIds.has(oldItem.Id) && oldItem.Ativo && oldItem.Tipo === "Entrada") {
          const qtyToReturn = Number(oldItem.Quantidade || 0);
          currentLots = returnToProductLots(oldItem.Servico, qtyToReturn, currentLots);
        }
      });
      
      return {
        ...prev,
        detalhesMov: newList,
        lotesProdutos: currentLots,
        historicoAcoes: [newEntry, ...(prev.historicoAcoes || [])]
      };
    });
  };

  const handleUpdateUsuarios = (updatedUsuarios: CadUsuario[]) => {
    updateDbState((prev) => {
      let desc = "Configuração de colaboradores gerida";
      const oldList = prev.usuarios || [];
      let newProdutos = prev.produtos ? [...prev.produtos] : [];
      let newInfoContas = prev.infoContas ? [...prev.infoContas] : [];
      let newRacas = prev.racas ? [...prev.racas] : [];

      const normalizedUsuarios = updatedUsuarios.map((u) => ({
        ...u,
        Segmento: u.Segmento || "petshop",
      }));

      normalizedUsuarios.forEach((newUser) => {
        const isMaster = newUser.NivelAcesso === "Master" || newUser.Permissoes === "Administrador";
        if (isMaster) {
          const oldUser = oldList.find((u) => u.Id === newUser.Id);
          const wasMaster = oldUser && (oldUser.NivelAcesso === "Master" || oldUser.Permissoes === "Administrador");
          
          if (!wasMaster) {
            // Newly created or configured Master user!
            // 1. Assign exactly one standard service if they have none
            const userHasServices = newProdutos.some((p) => p.IdUsuarioDono === newUser.Id);
            if (!userHasServices) {
              const standardService: CadProdutos = {
                Id: `prod-std-${newUser.Id}-${Date.now()}`,
                Nome: newUser.Segmento === "lavarapido" ? "Lavagem Simples" : "Serviço Padrão",
                Tipo: "Outro",
                Preco: 50.00,
                Ativo: true,
              };
              (standardService as any).IdUsuarioDono = newUser.Id;
              newProdutos.push(standardService);
            }

            // 2. Assign exactly one default infoConta configuration if they have none
            const userHasInfo = newInfoContas.some((i) => i.IdUsuarioDono === newUser.Id);
            if (!userHasInfo) {
              const defaultEmpresaName = newUser.Segmento === "lavarapido" 
                ? `Lava Rápido de ${newUser.Nome}` 
                : `Pet Shop de ${newUser.Nome}`;
              const standardInfo: CadInfoConta = {
                Id: `info-${newUser.Id}-${Date.now()}`,
                NomeEmpresa: defaultEmpresaName,
                Logo: "", // No logo by default
                Endereco: "Endereço Padrão, 123 - Cidade",
                Fone: "(00) 00000-0000",
                CorFundo: newUser.Segmento === "lavarapido" ? "sky" : "emerald",
                IdUsuarioDono: newUser.Id
              };
              newInfoContas.push(standardInfo);
            }

            // 3. Assign base library of breeds (INITIAL_BREEDS) for this user if they don't have them already
            const userHasRacas = newRacas.some((r) => r.IdUsuarioDono === newUser.Id);
            if (!userHasRacas) {
              const userClonedRacas = INITIAL_BREEDS.map((r, index) => ({
                Id: `raca-std-${newUser.Id}-${index + 1}`,
                Raca: r.Raca,
                Especie: r.Especie,
                IdUsuarioDono: newUser.Id,
                status_registro: "padrão"
              }));
              newRacas.push(...userClonedRacas);
            }
          }
        }
      });

      if (normalizedUsuarios.length > oldList.length) {
        const added = normalizedUsuarios[normalizedUsuarios.length - 1];
        desc = `Novo colaborador registrado: "${added?.Nome || ''}" (${added?.Segmento === 'lavarapido' ? 'Lava Rápido' : 'Pet Shop'})`;
      } else if (normalizedUsuarios.length < oldList.length) {
        desc = "Colaborador excluído/removido";
      } else {
        const changed = normalizedUsuarios.find((u, i) => oldList[i] && JSON.stringify(u) !== JSON.stringify(oldList[i]));
        if (changed) {
          desc = `Colaborador "${changed.Nome}" teve seus dados/permissões alterados`;
        }
      }
      const newEntry = createHistoricoAcoesEntry(desc);
      return {
        ...prev,
        usuarios: normalizedUsuarios,
        produtos: newProdutos,
        infoContas: newInfoContas,
        racas: newRacas,
        historicoAcoes: [newEntry, ...(prev.historicoAcoes || [])]
      };
    });
  };

  const handleSaveInfoConta = (updatedInfo: CadInfoConta) => {
    updateDbState((prev) => {
      const list = prev.infoContas ? [...prev.infoContas] : [];
      const idx = list.findIndex((i) => i.Id === updatedInfo.Id);
      let desc = "Configurações gerais da conta alteradas";
      if (idx > -1) {
        list[idx] = updatedInfo;
      } else {
        list.push(updatedInfo);
      }
      const newEntry = createHistoricoAcoesEntry(desc);
      return {
        ...prev,
        infoContas: list,
        historicoAcoes: [newEntry, ...(prev.historicoAcoes || [])]
      };
    });
  };

  const handleUpdateCaixa = (newCaixa: CaixaDiario[], newMov: CaixaMovimentacao[], newSaldos: CaixaSaldosForma[]) => {
    updateDbState((prev) => {
      let desc = "Movimentação registrada no Caixa";
      const oldMov = prev.caixaMovimentacao || [];
      
      // Check if any transaction was cancelled/reversed (Estorno)
      const hasAnyCancelledNow = newMov.some((m) => {
        const oldItem = oldMov.find((om) => om.Id === m.Id);
        return (!oldItem && m.StatusVenda === "Cancelado") || (oldItem && oldItem.StatusVenda !== "Cancelado" && m.StatusVenda === "Cancelado");
      });

      if (hasAnyCancelledNow) {
        desc = "Estorno realizado no Caixa / Venda PDV";
      } else if (newMov.length > oldMov.length) {
        const added = newMov[newMov.length - 1];
        if (added) {
          desc = `Operação no Caixa / Venda PDV: ${added.Tipo} - R$ ${added.Valor.toFixed(2)} [${added.Origem} | ${added.FormaPagamento}]`;
        }
      } else if (newMov.length < oldMov.length) {
        desc = "Lançamento de Caixa estornado ou excluído";
      } else {
        const changed = newMov.find((m, i) => oldMov[i] && JSON.stringify(m) !== JSON.stringify(oldMov[i]));
        if (changed) {
          desc = `Lançamento de Caixa alterado: ${changed.Tipo} - R$ ${changed.Valor.toFixed(2)} [${changed.Origem} | ${changed.FormaPagamento}]`;
        }
      }
      const newEntry = createHistoricoAcoesEntry(desc);
      return {
        ...prev,
        caixaDiario: newCaixa,
        caixaMovimentacao: newMov,
        caixaSaldosForma: newSaldos,
        historicoAcoes: [newEntry, ...(prev.historicoAcoes || [])]
      };
    });
  };

  return (
    <div className="min-h-screen text-slate-800 transition-all font-sans" style={customBackgroundStyle}>
          <CompanyHeader
        infoConta={activeUserConfig}
        activeTheme={activeTheme}
        userName={currentUser.Nome}
        userRole={currentUser.Permissoes}
        tipoAssinatura={currentUser.Tipo_Assinatura}
        dataValidade={currentUser.Data_Validade}
        onLogout={handleLogout}
        onOpenSync={() => setIsSyncModalOpen(true)}
        isOnline={isOnline}
        hasPendingSync={hasPendingSync}
        onMenuClick={isAdmin ? () => setIsSidebarOpen(true) : undefined}
        showLogout={isAdmin}
      />

      {/* 2. Top Navigation Menu Bar (Sticky at the top - espelhando fielmente o Banho e Tosa EXE original) */}
      {isAdmin && (
        <nav className="bg-slate-900 text-slate-100 sticky top-0 z-40 shadow-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center overflow-x-auto custom-scrollbar gap-1 sm:gap-2 select-none h-12 pr-4">
            
            {/* Movimento Diário (Agenda) */}
            <button
              type="button"
              id="tab-nav-agenda"
              onClick={() => setActiveTab("agenda")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === "agenda"
                  ? `${activeTheme.primary} shadow-sm font-bold text-white`
                  : "text-slate-350 hover:text-white hover:bg-slate-800"
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Movimento Diário (Agenda)
            </button>

            {/* Visão Geral */}
            <button
              type="button"
              id="tab-nav-visaogeral"
              onClick={() => setActiveTab("visaogeral")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === "visaogeral"
                  ? `${activeTheme.primary} shadow-sm font-bold text-white`
                  : "text-slate-350 hover:text-white hover:bg-slate-800"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Visão Geral
            </button>

            {/* Terminal Caixa */}
            <button
              type="button"
              id="tab-nav-caixa"
              onClick={() => setActiveTab("caixa")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === "caixa"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-bold"
                  : "text-emerald-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Coins className="h-3.5 w-3.5" />
              Terminal Caixa
            </button>

            {/* Histórico de Caixa */}
            <button
              type="button"
              id="tab-nav-historico-caixa"
              onClick={() => setActiveTab("historico_caixa")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === "historico_caixa"
                  ? "bg-emerald-700 text-white shadow-sm font-bold"
                  : "text-slate-350 hover:text-white hover:bg-slate-800"
              }`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Histórico Caixa
            </button>

            {/* Alertas de Retorno */}
            <button
              type="button"
              id="tab-nav-alertas-retorno"
              onClick={() => setActiveTab("alertas_retorno")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === "alertas_retorno"
                  ? "bg-amber-600 text-white shadow-sm font-bold"
                  : "text-amber-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Bell className="h-3.5 w-3.5" />
              Alertas Retorno
            </button>

            {/* Clientes */}
            <button
              type="button"
              id="tab-nav-clientes"
              onClick={() => setActiveTab("clientes")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === "clientes"
                  ? `${activeTheme.primary} shadow-sm font-bold text-white`
                  : "text-slate-350 hover:text-white hover:bg-slate-800"
              }`}
            >
              <UsersRound className="h-3.5 w-3.5" />
              Clientes (CadCliente)
            </button>

            {/* Pets / Veículos */}
            <button
              type="button"
              id="tab-nav-pets"
              onClick={() => setActiveTab("pets")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === "pets"
                  ? `${activeTheme.primary} shadow-sm font-bold text-white`
                  : "text-slate-350 hover:text-white hover:bg-slate-800"
              }`}
            >
              {termosApp.iconeTipo === "car" ? (
                <Car className="h-3.5 w-3.5" />
              ) : termosApp.iconeTipo === "wrench" ? (
                <Wrench className="h-3.5 w-3.5" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {termosApp.navItemLabel}
            </button>

            {/* Serviços e Produtos */}
            <button
              type="button"
              id="tab-nav-servicos"
              onClick={() => setActiveTab("servicos")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === "servicos"
                  ? `${activeTheme.primary} shadow-sm font-bold text-white`
                  : "text-slate-350 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Scissors className="h-3.5 w-3.5" />
              Serviços (CadProdutos)
            </button>

            {/* Biblioteca de Raças / Marcas */}
            <button
              type="button"
              id="tab-nav-racas"
              onClick={() => setActiveTab("racas")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === "racas"
                  ? `${activeTheme.primary} shadow-sm font-bold text-white`
                  : "text-slate-350 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Bookmark className="h-3.5 w-3.5" />
              {termosApp.navItemMarcasRacas || (currentSegmento === "petshop" ? "Raças (CadRaças)" : "Marcas (CadMarcas)")}
            </button>

            {/* Fornecedores */}
            <button
              type="button"
              id="tab-nav-fornecedores"
              onClick={() => setActiveTab("fornecedores")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === "fornecedores"
                  ? `${activeTheme.primary} shadow-sm font-bold text-white`
                  : "text-slate-350 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Fornecedores (CadFornecedores)
            </button>

            {/* Pré-Pedidos Fornecedor */}
            <button
              type="button"
              id="tab-nav-pre-pedidos"
              onClick={() => setActiveTab("pre_pedidos_compra")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === "pre_pedidos_compra"
                  ? `${activeTheme.primary} shadow-sm font-bold text-white`
                  : "text-slate-350 hover:text-white hover:bg-slate-800"
              }`}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Pré-Pedidos (PrePedidos)
            </button>

            {/* Fichas WhatsApp */}
            <button
              type="button"
              id="tab-nav-fichas-whatsapp"
              onClick={() => setActiveTab("ficheiras_whatsapp")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === "ficheiras_whatsapp"
                  ? `${activeTheme.primary} shadow-sm font-bold text-white`
                  : "text-slate-350 hover:text-white hover:bg-slate-800"
              }`}
              title="Fichas WhatsApp"
            >
              <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
              Fichas WhatsApp
            </button>

            {/* Relatórios */}
            <button
              type="button"
              id="tab-nav-relatorios"
              onClick={() => setActiveTab("relatorio")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === "relatorio" || activeTab === "relatorios"
                  ? `${activeTheme.primary} shadow-sm font-bold text-white`
                  : "text-slate-350 hover:text-white hover:bg-slate-800"
              }`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Relatórios
            </button>

            {/* Customização Conta */}
            {!isSubUser && userPermissionLevel !== 2 && userPermissionLevel !== 3 && (
              <button
                type="button"
                id="tab-nav-branding"
                onClick={() => setActiveTab("conta")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  activeTab === "conta"
                    ? `${activeTheme.primary} shadow-sm font-bold text-white`
                    : "text-slate-350 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Sliders className="h-3.5 w-3.5" />
                Branding (CadInfoConta)
              </button>
            )}

            {/* ADMIN ONLY CONTROLS */}
            {isAdmin && (
              <button
                type="button"
                id="tab-nav-usuarios"
                onClick={() => setActiveTab("usuarios")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition border border-dashed border-indigo-500/30 cursor-pointer ${
                  activeTab === "usuarios"
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                    : "text-indigo-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <UserCheck className="h-3.5 w-3.5" />
                Usuários (CadUsuario)
              </button>
            )}

            {isAdmin && godModeActive && (
              <button
                type="button"
                id="tab-nav-schema"
                onClick={() => setActiveTab("schema")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition border border-dashed border-indigo-500/30 cursor-pointer ${
                  activeTab === "schema"
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                    : "text-indigo-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Database className="h-3.5 w-3.5" />
                Estrutura BD
              </button>
            )}

            {isAdmin && godModeActive && (
              <button
                type="button"
                id="tab-nav-consumo"
                onClick={() => setActiveTab("consumo")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition border border-dashed border-indigo-500/30 cursor-pointer ${
                  activeTab === "consumo"
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-extrabold"
                    : "text-indigo-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Activity className="h-3.5 w-3.5 text-indigo-300" />
                Modo Deus (Consumo)
              </button>
            )}

            {/* Trailing empty space for smooth right-end scrolling */}
            <div className="w-8 shrink-0 h-1" />

          </div>
        </div>
      </nav>
      )}

      {/* Sidebar Drawer Component */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex overflow-hidden">
          {/* Overlay backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
            onClick={() => setIsSidebarOpen(false)}
          />

          {/* Drawer Panel Container */}
          <div className="relative flex flex-col w-full max-w-xs bg-slate-950 text-slate-100 shadow-2xl h-full z-10 transform transition-transform duration-300 ease-in-out border-r border-slate-800 animate-in slide-in-from-left duration-300">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800/80 bg-slate-900">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl text-white shadow-xs ${activeTheme.primary}`}>
                  <Scissors className="h-5 w-5" />
                </div>
                <div className="font-display font-black text-sm tracking-wider text-slate-200">
                  MENU SISTEMA
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                aria-label="Fechar Menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable list of navigation items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
              
              {/* Section: Principal */}
              <div className="space-y-1.5">
                <h3 className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Principal
                </h3>

                {/* Movimento Diário (Agenda) */}
                <button
                  type="button"
                  id="drawer-agenda"
                  onClick={() => {
                    setActiveTab("agenda");
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    activeTab === "agenda"
                      ? `${activeTheme.primary} font-bold text-white shadow-sm`
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <CalendarDays className="h-4 w-4" />
                  Movimento Diário (Agenda)
                </button>

                {/* Visão Geral */}
                <button
                  type="button"
                  id="drawer-visaogeral"
                  onClick={() => {
                    setActiveTab("visaogeral");
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    activeTab === "visaogeral"
                      ? `${activeTheme.primary} font-bold text-white shadow-sm`
                      : "text-slate-350 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                  Visão Geral
                </button>
              </div>

              {/* Section: Operações */}
              <div className="space-y-1.5">
                <h3 className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Operações e Caixa
                </h3>
                
                {/* Terminal Caixa */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("caixa");
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    activeTab === "caixa"
                      ? "text-emerald-400 bg-emerald-500/10 font-bold border border-emerald-500/20"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Coins className="h-4 w-4 text-emerald-450" />
                  Terminal Caixa (PDV)
                </button>

                {/* Histórico de Caixa */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("historico_caixa");
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    activeTab === "historico_caixa"
                      ? "text-indigo-400 bg-indigo-500/10 font-bold border border-indigo-500/20"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <FileSpreadsheet className="h-4 w-4 text-indigo-455" />
                  Histórico de Caixa
                </button>

                {/* Movimento Diário (Agenda) */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("agenda");
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    activeTab === "agenda"
                      ? "text-slate-100 bg-slate-800 font-bold border border-slate-700"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <CalendarDays className="h-4 w-4" />
                  Movimento Diário (Agenda)
                </button>

                {/* Visão Geral (Calendário Mensal) */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("visaogeral");
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    activeTab === "visaogeral"
                      ? "text-slate-100 bg-slate-800 font-bold border border-slate-700"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <LayoutGrid className="h-4 w-4 text-indigo-400" />
                  Visão Geral
                </button>

                {/* Alertas de Retorno */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("alertas_retorno");
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    activeTab === "alertas_retorno"
                      ? "text-slate-100 bg-slate-800 font-bold border border-slate-700"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Bell className="h-4 w-4" />
                  Alertas de Retorno
                </button>
              </div>

              {/* Section: Cadastros */}
              <div className="space-y-1.5">
                <h3 className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Cadastros
                </h3>

                {/* Clientes */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("clientes");
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    activeTab === "clientes"
                      ? "text-slate-100 bg-slate-800 font-bold border border-slate-700"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <UsersRound className="h-4 w-4" />
                  Clientes (CadCliente)
                </button>

                {/* Pets / Veículos */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("pets");
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    activeTab === "pets"
                      ? "text-slate-100 bg-slate-800 font-bold border border-slate-700"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  {termosApp.iconeTipo === "car" ? (
                    <Car className="h-4 w-4" />
                  ) : termosApp.iconeTipo === "wrench" ? (
                    <Wrench className="h-4 w-4" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {termosApp.navItemLabel}
                </button>

                {/* Serviços e Produtos */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("servicos");
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    activeTab === "servicos"
                      ? "text-slate-100 bg-slate-800 font-bold border border-slate-700"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Scissors className="h-4 w-4" />
                  Serviços (CadProdutos)
                </button>

                {/* Biblioteca de Raças / Marcas */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("racas");
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    activeTab === "racas"
                      ? "text-slate-100 bg-slate-800 font-bold border border-slate-700"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Bookmark className="h-4 w-4" />
                  {termosApp.navItemMarcasRacas || (currentSegmento === "petshop" ? "Raças (CadRaças)" : "Marcas (CadMarcas)")}
                </button>

                {/* Fornecedores */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("fornecedores");
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    activeTab === "fornecedores"
                      ? "text-slate-100 bg-slate-800 font-bold border border-slate-700"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Users className="h-4 w-4" />
                  Fornecedores (CadFronecedores)
                </button>

                {/* Pré-Pedidos Fornecedor */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("pre_pedidos_compra");
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    activeTab === "pre_pedidos_compra"
                      ? "text-slate-100 bg-slate-800 font-bold border border-slate-700"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <ShoppingBag className="h-4 w-4" />
                  Pré-Pedidos Fornecedor (PrePedidos)
                </button>
              </div>

              {/* Section: Ferramentas e Relatórios */}
              <div className="space-y-1.5">
                <h3 className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Ferramentas e Relatórios
                </h3>

                {/* Fichas WhatsApp */}
                <button
                  type="button"
                  id="drawer-ficheiras-whatsapp"
                  onClick={() => {
                    setActiveTab("ficheiras_whatsapp");
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    activeTab === "ficheiras_whatsapp"
                      ? `${activeTheme.primary} font-bold text-white shadow-sm`
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                  title="Fichas WhatsApp"
                >
                  <MessageSquare className="h-4 w-4 text-emerald-400" />
                  Fichas WhatsApp
                </button>

                {/* Relatórios (visível explicitamente abaixo de Fichas WhatsApp) */}
                <button
                  type="button"
                  id="drawer-relatorios"
                  onClick={() => {
                    setActiveTab("relatorio");
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    activeTab === "relatorio" || activeTab === "relatorios"
                      ? `${activeTheme.primary} font-bold text-white shadow-sm`
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                  title="Relatórios Gerenciais e Financeiros"
                >
                  <div className="flex items-center gap-2.5">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Relatórios</span>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    activeTab === "relatorio" || activeTab === "relatorios"
                      ? "bg-white/20 text-white font-bold"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}>
                    ZIP / PDF
                  </span>
                </button>
              </div>

              {/* Section: Configurações & Segurança */}
              {( (!isSubUser && userPermissionLevel !== 2 && userPermissionLevel !== 3) || isAdmin ) && (
                <div className="space-y-1.5">
                  <h3 className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Configurações
                  </h3>

                  {/* Customização Conta */}
                  {!isSubUser && userPermissionLevel !== 2 && userPermissionLevel !== 3 && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("conta");
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        activeTab === "conta"
                          ? "text-slate-100 bg-slate-800 font-bold border border-slate-700"
                          : "text-slate-300 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      <Sliders className="h-4 w-4" />
                      Branding (CadInfoConta)
                    </button>
                  )}

                  {/* ADMIN ONLY CONTROLS */}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("usuarios");
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition border border-dashed border-indigo-500/20 cursor-pointer ${
                        activeTab === "usuarios"
                          ? "bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                          : "text-indigo-450 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      <UserCheck className="h-4 w-4" />
                      Usuários (CadUsuario)
                    </button>
                  )}

                  {isAdmin && godModeActive && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("schema");
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition border border-dashed border-indigo-500/20 cursor-pointer ${
                        activeTab === "schema"
                          ? "bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                          : "text-indigo-455 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      <Database className="h-4 w-4" />
                      Estrutura BD
                    </button>
                  )}

                  {/* Controle de Consumo (Modo Deus) */}
                  {isAdmin && godModeActive && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("consumo");
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition border border-dashed border-indigo-500/20 cursor-pointer ${
                        activeTab === "consumo"
                          ? "bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                          : "text-indigo-455 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      <Activity className="h-4 w-4 text-indigo-300" />
                      Modo Deus (Consumo)
                    </button>
                  )}
                </div>
              )}

            </div>

            {/* Footer containing User session identity info */}
            <div className="p-4 border-t border-slate-800/80 bg-slate-900 flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                  {currentUser?.Nome ? currentUser.Nome.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-200 truncate">{currentUser?.Nome}</p>
                  <p className="text-[10px] text-slate-500 font-mono truncate">{currentUser?.Permissoes}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  handleLogout();
                  setIsSidebarOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/15 transition cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Sair da Conta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Sticky Fixed Hamburger Button (Apenas para Administrador) */}
      {isAdmin && (
        <div className="fixed left-3 top-24 sm:top-28 md:left-6 md:top-32 z-40 print:hidden select-none animate-fade-in">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className={`p-2 md:p-2.5 rounded-xl text-white shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-95 ${activeTheme.primary} hover:brightness-105 flex items-center justify-center`}
            aria-label="Abrir Menu Hambúrguer"
            title="Abrir Menu do Sistema"
          >
            <Menu className="h-4 w-4 md:h-4.5 md:w-4.5" />
          </button>
        </div>
      )}

      {/* 3. Screen Container Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Back to Visão Geral button (only on other screens) */}
        {activeTab !== "visaogeral" && (
          <div className="mb-6 animate-fade-in select-none">
            <button
              type="button"
              onClick={() => setActiveTab("visaogeral")}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 text-xs font-bold rounded-2xl transition shadow-3xs cursor-pointer active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para Visão Geral
            </button>
          </div>
        )}

        {/* Administrador Global Filter Bar e Controle do Modo Deus */}
        {isAdmin && (
          <div className="mb-6 flex flex-col gap-4 animate-fade-in select-none">
            
            {/* GOD MODE TOGGLE STRIP - FIRST ITEM IN ADMIN PANEL */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-3xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 text-white overflow-hidden relative">
              <div className="absolute right-0 top-0 h-32 w-32 bg-rose-500/10 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center gap-3.5 relative z-10 w-full md:w-auto">
                <div className={`p-2.5 rounded-2xl shrink-0 ${godModeActive ? "bg-rose-500/15 text-rose-400 animate-pulse" : "bg-slate-800 text-slate-450"}`}>
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider font-sans text-slate-100 flex items-center gap-1.5 flex-wrap">
                    Controle de Segurança: Modo Deus
                    {godModeActive ? (
                      <span className="text-[9px] bg-rose-500/25 text-rose-300 px-1.5 py-0.5 rounded-md font-mono uppercase animate-pulse">Ativado</span>
                    ) : (
                      <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-md font-mono uppercase">Desativado</span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-400 max-w-xl leading-snug font-sans mt-0.5">
                    Este switch controla a ativação de toda a área de 'Estrutura BD' e das ferramentas de IA associadas. Padrão desativado para economizar recursos de IA.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 relative z-10 shrink-0 self-end md:self-auto">
                <span className="text-xs font-bold text-slate-350 font-sans hidden sm:inline">
                  Ativar Modo Deus:
                </span>
                
                {/* Toggle Switch */}
                <button
                  type="button"
                  id="god-mode-toggle-switch"
                  onClick={() => {
                    if (godModeActive) {
                      handleDisableGodMode();
                    } else {
                      setGodModeActive(true);
                      showAlert(
                        "Modo Deus Ativado",
                        "Ferramentas técnicas avançadas habilitadas! O painel de consumo de IA e a estrutura técnica de banco de dados estão liberados para uso."
                      );
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-hidden ${
                    godModeActive ? "bg-rose-500" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ${
                      godModeActive ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Administrador Filter Mode Panel */}
            <div className="p-4 bg-white border border-indigo-100/85 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-white rounded-xl shadow-xs">
                  <UserCheck className="h-4.5 w-4.5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-sans">
                    Filtro de Escopo do Administrador
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Selecione se deseja visualizar os dados de todos os usuários cadastrados ou focar em um operador específico.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Radio options / Buttons selector */}
                <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setAdminFilterMode("all")}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      adminFilterMode === "all"
                        ? "bg-white text-indigo-700 shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900 font-semibold"
                    }`}
                  >
                    Ver Todos os Usuários
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminFilterMode("single")}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      adminFilterMode === "single"
                        ? "bg-white text-indigo-700 shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900 font-semibold"
                    }`}
                  >
                    Ver um Único Usuário
                  </button>
                </div>

                {/* Individual user selection dropdown (if single mode is chosen) */}
                {adminFilterMode === "single" && (
                  <div className="flex items-center gap-2 animate-fade-in">
                    <span className="text-[11px] text-slate-500 font-semibold">
                      Operador:
                    </span>
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="bg-white border border-slate-200 hover:border-slate-350 text-xs font-semibold text-slate-850 rounded-xl px-3 py-1.5 tracking-tight focus:outline-hidden cursor-pointer"
                    >
                      {db.usuarios.map((u) => (
                        <option key={u.Id} value={u.Id}>
                          {u.Nome} ({u.Permissoes})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* Dynamic sheet selection */}
        <div className="min-h-[500px]">
          {activeTab === "visaogeral" && (
            <VisaoGeralModal
              isInline={true}
              detalhesMov={db.detalhesMov}
              movimentos={db.movimentos}
              produtos={visibleProdutos}
              effectiveUserId={effectiveUserId}
              isAdminViewAll={isAdminViewAll}
              activeTheme={activeTheme}
              controleRetornos={db.controleRetornos || []}
              onDaySelect={(dateStr) => {
                setPrefilledDate(dateStr);
                setActiveTab("agenda");
              }}
            />
          )}

          {activeTab === "consumo" && isAdmin && (
            <AdminGodModeDashboard
              db={db}
              onUpdateDbState={updateDbState}
              currentUser={currentUser}
              activeTheme={activeTheme}
            />
          )}

          {activeTab === "agenda" && (
            <ScheduleSheet
              clientes={db.clientes}
              pets={db.pets}
              produtos={visibleProdutos}
              movimentos={db.movimentos}
              detalhesMov={db.detalhesMov}
              prePedidos={db.prePedidos || []}
              prePedidoItens={db.prePedidoItens || []}
              caixaDiario={db.caixaDiario || []}
              caixaMovimentacao={db.caixaMovimentacao || []}
              caixaSaldosForma={db.caixaSaldosForma || []}
              lotesProdutos={db.lotesProdutos || []}
              activeTheme={activeTheme}
              currentUserOwnerId={effectiveUserId}
              isAdminViewAll={isAdminViewAll}
              onUpdateMovimentos={handleUpdateMovimentos}
              onUpdateDetalhesMov={handleUpdateDetailsMov}
              onUpdatePrePedidos={(newPre) => updateDbState((prev) => ({ ...prev, prePedidos: newPre }))}
              onUpdateCaixa={handleUpdateCaixa}
              onUpdateClientes={handleUpdateClientes}
              onUpdateLotes={handleUpdateLotesProdutos}
              currentUser={currentUser}
              showConfirm={showConfirm}
              showAlert={showAlert}
              isRestricted={isSubscriptionRestricted}
              userPermissionLevel={userPermissionLevel}
              onNavigateToCaixa={() => setActiveTab("caixa")}
              godModeActive={godModeActive}
              controleRetornos={db.controleRetornos || []}
              onUpdateControleRetornos={handleUpdateControleRetornos}
              prefilledRetornoToSchedule={prefilledRetorno}
              onClearPrefilledRetorno={() => setPrefilledRetorno(null)}
              prefilledDate={prefilledDate || undefined}
              onClearPrefilledDate={() => setPrefilledDate(null)}
            />
          )}

          {activeTab === "alertas_retorno" && (
            <AlertasRetornoSheet
              controleRetornos={db.controleRetornos || []}
              activeTheme={activeTheme}
              currentUserOwnerId={effectiveUserId}
              isAdminViewAll={isAdminViewAll}
              onUpdateControleRetornos={handleUpdateControleRetornos}
              onStartScheduleRetorno={(retorno) => {
                setPrefilledRetorno(retorno);
                setActiveTab("agenda");
              }}
              showConfirm={showConfirm}
              showAlert={showAlert}
            />
          )}

          {activeTab === "clientes" && (
            <ClientsSheet
              clientes={db.clientes}
              pets={db.pets}
              activeTheme={activeTheme}
              currentUserOwnerId={effectiveUserId}
              isAdminViewAll={isAdminViewAll}
              onUpdateClientes={handleUpdateClientes}
              showConfirm={showConfirm}
              showAlert={showAlert}
              isRestricted={isSubscriptionRestricted}
              userPermissionLevel={userPermissionLevel}
              onAddPetForClient={(clientId) => {
                setPrefilledClientIdForNewPet(clientId);
                setActiveTab("pets");
              }}
            />
          )}

          {activeTab === "pets" && (
            <PetsSheet
              pets={db.pets}
              clientes={db.clientes}
              racas={visibleRacas}
              activeTheme={activeTheme}
              currentUserOwnerId={effectiveUserId}
              currentUser={currentUser}
              segmento={currentSegmento}
              isAdminViewAll={isAdminViewAll}
              isAdmin={isAdmin}
              onUpdatePets={handleUpdatePets}
              showConfirm={showConfirm}
              showAlert={showAlert}
              isRestricted={isSubscriptionRestricted}
              userPermissionLevel={userPermissionLevel}
              prefilledClientIdForNewPet={prefilledClientIdForNewPet}
              onClearPrefilledClientId={() => setPrefilledClientIdForNewPet(null)}
            />
          )}

          {activeTab === "servicos" && (
            <ProductsSheet
              produtos={visibleProdutos}
              lotesProdutos={db.lotesProdutos || []}
              fornecedores={db.fornecedores || []}
              onUpdateFornecedores={handleUpdateFornecedores}
              activeTheme={activeTheme}
              currentUserOwnerId={effectiveUserId}
              isAdminViewAll={isAdminViewAll}
              onUpdateProdutos={handleUpdateProdutos}
              onUpdateLotesProdutos={handleUpdateLotesProdutos}
              showConfirm={showConfirm}
              showAlert={showAlert}
              isRestricted={isSubscriptionRestricted}
              userPermissionLevel={userPermissionLevel}
            />
          )}

          {activeTab === "racas" && (
            <RacasSheet
              racas={visibleRacas}
              activeTheme={activeTheme}
              onUpdateRacas={handleUpdateRacas}
              showConfirm={showConfirm}
              showAlert={showAlert}
              isRestricted={isSubscriptionRestricted}
              userPermissionLevel={userPermissionLevel}
              currentUserOwnerId={effectiveUserId}
              currentUser={currentUser || undefined}
              godModeActive={godModeActive}
              segmento={currentSegmento}
            />
          )}

          {activeTab === "fornecedores" && (
            <SuppliersSheet
              fornecedores={db.fornecedores || []}
              activeTheme={activeTheme}
              onUpdateFornecedores={handleUpdateFornecedores}
              showConfirm={showConfirm}
              showAlert={showAlert}
              isRestricted={isSubscriptionRestricted}
              userPermissionLevel={userPermissionLevel}
            />
          )}

          {activeTab === "pre_pedidos_compra" && (
            <PrePedidosCompraSheet
              prePedidosCompra={db.prePedidosCompra || []}
              fornecedores={db.fornecedores || []}
              produtos={visibleProdutos}
              activeTheme={activeTheme}
              currentUserOwnerId={effectiveUserId}
              isAdminViewAll={isAdminViewAll}
              onUpdatePrePedidosCompra={handleUpdatePrePedidosCompra}
              showConfirm={showConfirm}
              showAlert={showAlert}
              userPermissionLevel={userPermissionLevel}
              lotesProdutos={db.lotesProdutos || []}
              onUpdateLotesProdutos={handleUpdateLotesProdutos}
            />
          )}

          {activeTab === "conta" && !isSubUser && userPermissionLevel !== 2 && userPermissionLevel !== 3 && (
            <SettingsSheet
              infoConta={activeUserConfig}
              activeTheme={activeTheme}
              currentUserOwnerId={currentUser.Id}
              onSaveInfoConta={handleSaveInfoConta}
              showConfirm={showConfirm}
              showAlert={showAlert}
              usuarios={db.usuarios}
              onUpdateUsuarios={(updated) => updateDbState((prev) => ({ ...prev, usuarios: updated }))}
              db={db}
              currentUser={currentUser}
              onUpdateDbState={updateDbState}
            />
          )}

          {(activeTab === "relatorio" || activeTab === "relatorios") && (
            <ReportSheet
              clientes={db.clientes}
              pets={db.pets}
              produtos={visibleProdutos}
              movimentos={db.movimentos}
              detalhesMov={db.detalhesMov}
              caixaMovimentacao={db.caixaMovimentacao || []}
              activeTheme={activeTheme}
              currentUserOwnerId={effectiveUserId}
              isAdminViewAll={isAdminViewAll}
              infoConta={activeUserConfig}
              currentUser={currentUser}
              onAddAiConsumption={(log) => updateDbState((prev) => ({ ...prev, aiConsumo: prev.aiConsumo ? [...prev.aiConsumo, log] : [log] }))}
              isOnline={isOnline}
              aiRelatoriosGerados={db.aiRelatoriosGerados || {}}
              onQueueAiRequest={(req) => updateDbState((prev) => ({ ...prev, aiConsumoQueue: prev.aiConsumoQueue ? [...prev.aiConsumoQueue, req] : [req] }))}
              onAddAiRelatorioGerado={(periodKey) => updateDbState((prev) => ({ ...prev, aiRelatoriosGerados: { ...(prev.aiRelatoriosGerados || {}), [periodKey]: true } }))}
              showAlert={showAlert}
              godModeActive={godModeActive}
              onNavigateToHistoricoCaixa={() => setActiveTab("historico_caixa")}
              historicoAcoes={db.historicoAcoes || []}
              onUpdateHistoricoAcoes={(newLogs) => updateDbState((prev) => ({ ...prev, historicoAcoes: newLogs }))}
              onUpdateDetalhesMov={(updated) => updateDbState((prev) => ({ ...prev, detalhesMov: updated }))}
              onUpdateCaixa={(newCaixa, newMov, newSaldos) => updateDbState((prev) => ({ ...prev, caixaDiario: newCaixa, caixaMovimentacao: newMov, caixaSaldosForma: newSaldos }))}
              caixaDiario={db.caixaDiario || []}
              caixaSaldosForma={db.caixaSaldosForma || []}
              lotesProdutos={db.lotesProdutos || []}
              onUpdateLotes={(newLotes) => updateDbState((prev) => ({ ...prev, lotesProdutos: newLotes }))}
              onUpdateClientes={(newClients) => updateDbState((prev) => ({ ...prev, clientes: newClients }))}
              showConfirm={showConfirm}
            />
          )}

          {activeTab === "ficheiras_whatsapp" && userPermissionLevel !== 3 && (
            <WhatsAppFormPanel
              dbBackup={db}
              activeTheme={activeTheme}
              showConfirm={showConfirm}
              showAlert={showAlert}
              userPermissionLevel={userPermissionLevel}
            />
          )}

          {activeTab === "caixa" && (
            <CaixaSheet
              clientes={db.clientes}
              produtos={visibleProdutos}
              prePedidos={db.prePedidos || []}
              prePedidoItens={db.prePedidoItens || []}
              caixaDiario={db.caixaDiario || []}
              caixaMovimentacao={db.caixaMovimentacao || []}
              caixaSaldosForma={db.caixaSaldosForma || []}
              detalhesMov={db.detalhesMov}
              movimentos={db.movimentos}
              lotesProdutos={db.lotesProdutos || []}
              activeTheme={activeTheme}
              currentUser={currentUser}
              currentUserOwnerId={effectiveUserId}
              isAdminViewAll={isAdminViewAll}
              infoContas={db.infoContas || []}
              usuarios={db.usuarios || []}
              onUpdateCaixa={handleUpdateCaixa}
              onUpdateDetalhesMov={handleUpdateDetailsMov}
              onUpdatePrePedidos={(newPre) => updateDbState((prev) => ({ ...prev, prePedidos: newPre }))}
              onUpdateClientes={handleUpdateClientes}
              onUpdateLotes={handleUpdateLotesProdutos}
              showConfirm={showConfirm}
              showAlert={showAlert}
              userPermissionLevel={userPermissionLevel}
              onBackToSchedule={() => setActiveTab("agenda")}
            />
          )}

          {activeTab === "historico_caixa" && (
            <HistoricoCaixaSheet
              clientes={db.clientes}
              produtos={visibleProdutos}
              lotesProdutos={db.lotesProdutos || []}
              caixaDiario={db.caixaDiario || []}
              caixaMovimentacao={db.caixaMovimentacao || []}
              caixaSaldosForma={db.caixaSaldosForma || []}
              movimentos={db.movimentos}
              detalhesMov={db.detalhesMov}
              onUpdateDetalhesMov={handleUpdateDetailsMov}
              prePedidos={db.prePedidos || []}
              onUpdatePrePedidos={(newPre) => updateDbState((prev) => ({ ...prev, prePedidos: newPre }))}
              activeTheme={activeTheme}
              currentUser={currentUser}
              currentUserOwnerId={effectiveUserId}
              isAdminViewAll={isAdminViewAll}
              onUpdateCaixa={handleUpdateCaixa}
              onUpdateLotes={handleUpdateLotesProdutos}
              onUpdateClientes={handleUpdateClientes}
              showConfirm={showConfirm}
              showAlert={showAlert}
              onBackToCaixa={() => setActiveTab("caixa")}
            />
          )}

          {activeTab === "usuarios" && isAdmin && (
            <UsersSheet
              usuarios={db.usuarios}
              activeTheme={activeTheme}
              currentUser={currentUser}
              onUpdateUsuarios={handleUpdateUsuarios}
              showConfirm={showConfirm}
              showAlert={showAlert}
            />
          )}

          {activeTab === "schema" && isAdmin && (
            <SchemaSheet
              db={db}
              activeTheme={activeTheme}
            />
          )}
        </div>

      </main>

      {/* Decorative simple footer */}
      <footer className="py-8 bg-slate-900 border-t border-slate-800 mt-20 text-center font-mono">
        <p className="text-xs text-slate-500">
          Banho e Tosa Empresa &bull; Desenvolvido no Notion-Spreadsheet Layout
        </p>
        <p className="text-[10px] text-slate-600 mt-1">
          Versão PWA Base em Modo Isolado por Usuário Logado
        </p>
      </footer>

      {/* Firebase Cloud Synchronization Panel Modal overlay */}
      <FirebaseSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        localDb={db}
        onApplySyncState={handleApplySyncState}
        currentUser={currentUser}
        activeTheme={activeTheme}
      />

      {/* Global floating pre-sale button - hidden on Agenda screen, visible on other screens */}
      {activeTab !== "agenda" && (
        <div className="fixed bottom-6 right-6 z-[60]">
          <button
            onClick={() => setIsPrePedidoModalOpen(true)}
            className={`flex items-center gap-2 px-4 py-3.5 text-white rounded-full font-extrabold shadow-xl hover:shadow-2xl transition text-xs tracking-tight cursor-pointer active:scale-95 ${activeTheme.primary}`}
          >
            <ShoppingCart className="h-4.5 w-4.5" />
            Nova Pré-Venda
          </button>
        </div>
      )}

      {/* Pre-Pedido mobile creation modal sheet */}
      <PrePedidoMobileModal
        isOpen={isPrePedidoModalOpen}
        onClose={() => setIsPrePedidoModalOpen(false)}
        produtos={visibleProdutos}
        activeTheme={activeTheme}
        onSavePrePedido={handleSavePrePedido}
        showAlert={showAlert}
      />

      {/* Global Iframe-Safe Confirmation/Alert Modal */}
      {modalDialog && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 select-none animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-100/80 overflow-hidden transform transition-all p-6 space-y-4 flex flex-col max-h-[80vh]">
            <div className="flex items-start gap-3.5 text-slate-800 overflow-y-auto flex-1 custom-scrollbar">
              <div className={`p-2.5 rounded-2xl text-white shrink-0 shadow-xs ${modalDialog.type === "confirm" ? "bg-amber-500" : "bg-indigo-600"}`}>
                <Info className="h-5 w-5" />
              </div>
              <div className="space-y-1 min-w-0">
                <h3 className="font-bold text-slate-900 text-sm font-sans tracking-tight leading-tight">
                  {modalDialog.title}
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed font-sans break-words">
                  {modalDialog.description}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 font-sans text-xs shrink-0">
              {(modalDialog.type === "confirm" || modalDialog.onCancel) && (
                <button
                  type="button"
                  onClick={modalDialog.onCancel || (() => setModalDialog(null))}
                  className={modalDialog.cancelClass || "px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-150 text-slate-700 font-semibold rounded-xl cursor-pointer hover:text-slate-950 transition-colors"}
                >
                  {modalDialog.cancelText || "Cancelar"}
                </button>
              )}
              <button
                type="button"
                onClick={modalDialog.onConfirm}
                className={modalDialog.confirmClass || `px-4.5 py-2 font-semibold text-white rounded-xl shadow-xs cursor-pointer hover:shadow transition-all ${
                  modalDialog.type === "confirm" ? "bg-red-500 hover:bg-red-650" : "bg-indigo-600 hover:bg-indigo-750"
                }`}
              >
                {modalDialog.confirmText || "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Quick Navigation Panel (Only outside 'visaogeral') */}
      {activeTab !== "visaogeral" && (
        <div className="fixed top-1/2 -translate-y-1/2 right-4 md:right-6 z-[999] flex flex-col gap-2.5 print:hidden animate-fade-in">
          {/* Menu Hambúrguer Flutuante (Acessível a todos os usuários) */}
          <button
            type="button"
            id="btn-floating-hamburger-menu"
            onClick={() => setIsSidebarOpen(true)}
            className={`group relative flex items-center justify-center w-11 h-11 bg-white text-slate-800 border-2 rounded-full shadow-lg hover:shadow-xl transition-all cursor-pointer active:scale-95 ${
              activeTheme.name === "emerald" ? "border-emerald-500 text-emerald-700 hover:bg-emerald-50" :
              activeTheme.name === "sky" ? "border-sky-500 text-sky-700 hover:bg-sky-50" :
              activeTheme.name === "amber" ? "border-amber-500 text-amber-700 hover:bg-amber-50" :
              activeTheme.name === "rose" ? "border-rose-500 text-rose-700 hover:bg-rose-50" :
              activeTheme.name === "slate" ? "border-slate-600 text-slate-800 hover:bg-slate-100" :
              activeTheme.name === "purple" ? "border-purple-500 text-purple-700 hover:bg-purple-50" :
              "border-indigo-500 text-indigo-700 hover:bg-indigo-50"
            }`}
            title="Menu do Sistema"
            aria-label="Abrir Menu do Sistema"
          >
            <Menu className="h-5 w-5" />
            <span className="absolute right-14 scale-0 group-hover:scale-100 transition-all duration-100 origin-right whitespace-nowrap bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg pointer-events-none select-none">
              Menu do Sistema
            </span>
          </button>

          {/* Divisor sutil */}
          <div className="w-6 h-[1px] bg-slate-300 mx-auto my-0.5" />

          {/* Ir para o Topo */}
          <button
            type="button"
            onClick={scrollToTop}
            className={`group relative flex items-center justify-center w-10 h-10 bg-white/95 text-slate-500 border border-slate-200 rounded-full shadow-md hover:shadow-lg transition-all backdrop-blur-xs cursor-pointer active:scale-95 ${
              activeTheme.name === "emerald" ? "hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50/50" :
              activeTheme.name === "sky" ? "hover:text-sky-600 hover:border-sky-300 hover:bg-sky-50/50" :
              activeTheme.name === "amber" ? "hover:text-amber-600 hover:border-amber-300 hover:bg-amber-50/50" :
              activeTheme.name === "rose" ? "hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50/50" :
              activeTheme.name === "slate" ? "hover:text-slate-700 hover:border-slate-400 hover:bg-slate-100/50" :
              activeTheme.name === "purple" ? "hover:text-purple-600 hover:border-purple-300 hover:bg-purple-50/50" :
              "hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/50"
            }`}
            title="Ir para o Topo"
          >
            <ChevronUp className="h-4.5 w-4.5" />
            <span className="absolute right-12 scale-0 group-hover:scale-100 transition-all duration-100 origin-right whitespace-nowrap bg-slate-800 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-md pointer-events-none select-none">
              Ir para o Topo
            </span>
          </button>

          {/* Subir Página */}
          <button
            type="button"
            onClick={scrollPageUp}
            className={`group relative flex items-center justify-center w-10 h-10 bg-white/95 text-slate-500 border border-slate-200 rounded-full shadow-md hover:shadow-lg transition-all backdrop-blur-xs cursor-pointer active:scale-95 ${
              activeTheme.name === "emerald" ? "hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50/50" :
              activeTheme.name === "sky" ? "hover:text-sky-600 hover:border-sky-300 hover:bg-sky-50/50" :
              activeTheme.name === "amber" ? "hover:text-amber-600 hover:border-amber-300 hover:bg-amber-50/50" :
              activeTheme.name === "rose" ? "hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50/50" :
              activeTheme.name === "slate" ? "hover:text-slate-700 hover:border-slate-400 hover:bg-slate-100/50" :
              activeTheme.name === "purple" ? "hover:text-purple-600 hover:border-purple-300 hover:bg-purple-50/50" :
              "hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/50"
            }`}
            title="Subir Página"
          >
            <ChevronsUp className="h-4.5 w-4.5" />
            <span className="absolute right-12 scale-0 group-hover:scale-100 transition-all duration-100 origin-right whitespace-nowrap bg-slate-800 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-md pointer-events-none select-none">
              Subir Página
            </span>
          </button>

          {/* Descer Página */}
          <button
            type="button"
            onClick={scrollPageDown}
            className={`group relative flex items-center justify-center w-10 h-10 bg-white/95 text-slate-500 border border-slate-200 rounded-full shadow-md hover:shadow-lg transition-all backdrop-blur-xs cursor-pointer active:scale-95 ${
              activeTheme.name === "emerald" ? "hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50/50" :
              activeTheme.name === "sky" ? "hover:text-sky-600 hover:border-sky-300 hover:bg-sky-50/50" :
              activeTheme.name === "amber" ? "hover:text-amber-600 hover:border-amber-300 hover:bg-amber-50/50" :
              activeTheme.name === "rose" ? "hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50/50" :
              activeTheme.name === "slate" ? "hover:text-slate-700 hover:border-slate-400 hover:bg-slate-100/50" :
              activeTheme.name === "purple" ? "hover:text-purple-600 hover:border-purple-300 hover:bg-purple-50/50" :
              "hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/50"
            }`}
            title="Descer Página"
          >
            <ChevronsDown className="h-4.5 w-4.5" />
            <span className="absolute right-12 scale-0 group-hover:scale-100 transition-all duration-100 origin-right whitespace-nowrap bg-slate-800 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-md pointer-events-none select-none">
              Descer Página
            </span>
          </button>

          {/* Ir para o Fim */}
          <button
            type="button"
            onClick={scrollToBottom}
            className={`group relative flex items-center justify-center w-10 h-10 bg-white/95 text-slate-500 border border-slate-200 rounded-full shadow-md hover:shadow-lg transition-all backdrop-blur-xs cursor-pointer active:scale-95 ${
              activeTheme.name === "emerald" ? "hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50/50" :
              activeTheme.name === "sky" ? "hover:text-sky-600 hover:border-sky-300 hover:bg-sky-50/50" :
              activeTheme.name === "amber" ? "hover:text-amber-600 hover:border-amber-300 hover:bg-amber-50/50" :
              activeTheme.name === "rose" ? "hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50/50" :
              activeTheme.name === "slate" ? "hover:text-slate-700 hover:border-slate-400 hover:bg-slate-100/50" :
              activeTheme.name === "purple" ? "hover:text-purple-600 hover:border-purple-300 hover:bg-purple-50/50" :
              "hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/50"
            }`}
            title="Ir para o Fim"
          >
            <ChevronDown className="h-4.5 w-4.5" />
            <span className="absolute right-12 scale-0 group-hover:scale-100 transition-all duration-100 origin-right whitespace-nowrap bg-slate-800 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-md pointer-events-none select-none">
              Ir para o Fim
            </span>
          </button>
        </div>
      )}

    </div>
  );
}
