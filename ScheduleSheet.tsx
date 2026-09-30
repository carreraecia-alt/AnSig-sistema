/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// BLINDAGEM DE CUSTOS & ISOLAMENTO DE GATILHOS DE AGREGAÇÃO:
// Qualquer cálculo financeiro baseado na relação Parent-Child (CadMovDiario e CadDetMovDiario),
// tal como a multiplicação de Quantidade por PrecoUnitario para obter TotalDaLinha ou agregações lógicas por Tipo ('Entrada' | 'Saída'),
// é realizado estritamente por sub-rotinas locais em JavaScript. Nenhuma função agregadora de fluxo de caixa 
// ou mutação nessas tabelas está autorizada a invocar a API do Gemini de forma automática, assíncrona ou em segundo plano.

import React, { useState, useMemo } from "react";
import { CadCliente, CadPets, CadProdutos, CadMovDiario, CadDetMovDiario, ThemeColor, PrePedido, PrePedidoItens, CaixaDiario, CaixaMovimentacao, CaixaSaldosForma, LotesProdutos } from "../types";
import { normalizeDateOnly } from "../utils/jsonBackupProcessor";
import {
  Calendar, CheckSquare, Square, Plus, Trash2, CalendarClock, DollarSign,
  TrendingUp, RefreshCw, Layers, Edit2, Check, FileText, AlertCircle,
  ChevronLeft, ChevronRight, ShoppingBag, Search, User, X
} from "lucide-react";

interface ScheduleSheetProps {
  clientes: CadCliente[];
  pets: CadPets[];
  produtos: CadProdutos[];
  movimentos: CadMovDiario[];
  detalhesMov: CadDetMovDiario[];
  prePedidos: PrePedido[];
  prePedidoItens: PrePedidoItens[];
  caixaDiario: CaixaDiario[];
  caixaMovimentacao: CaixaMovimentacao[];
  caixaSaldosForma: CaixaSaldosForma[];
  lotesProdutos?: LotesProdutos[];
  activeTheme: ThemeColor;
  currentUserOwnerId: string;
  isAdminViewAll?: boolean;
  onUpdateClientes?: (updated: CadCliente[]) => void;
  onUpdateMovimentos: (movs: CadMovDiario[]) => void;
  onUpdateDetalhesMov: (dets: CadDetMovDiario[]) => void;
  onUpdatePrePedidos: (pre: PrePedido[]) => void;
  onUpdateCaixa: (caixaDiario: CaixaDiario[], caixaMovimentacao: CaixaMovimentacao[], caixaSaldosForma: CaixaSaldosForma[]) => void;
  onUpdateLotes?: (newLotes: LotesProdutos[]) => void;
  currentUser: any;
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
  isRestricted?: boolean;
  isMobile?: boolean;
  userPermissionLevel?: number;
  onNavigateToCaixa?: () => void;
  godModeActive?: boolean;
  controleRetornos?: any[];
  onUpdateControleRetornos?: (retornos: any[]) => void;
  prefilledRetornoToSchedule?: any;
  onClearPrefilledRetorno?: () => void;
  prefilledDate?: string;
  onClearPrefilledDate?: () => void;
}

// --- HELPER FUNCTIONS FOR BRAZILIAN CURRENCY (BRL) ENFORCEMENT & RENDERING ---

// Strips letters and formats numbers dynamically as standard Brazilian Currency representation (comma decimal)
const formatCurrency = (val: string | number): string => {
  const str = typeof val === "number" ? val.toFixed(2) : String(val);
  const digits = str.replace(/\D/g, "");
  if (!digits) return "";
  const cents = parseInt(digits, 10);
  if (isNaN(cents)) return "";
  const floatVal = cents / 100;
  return floatVal.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Converts the Brazilian formatted currency format string ("1.234,56") back to standard JavaScript float
const parseCurrencyToFloat = (formattedValue: string): number => {
  if (!formattedValue) return 0;
  const clean = formattedValue.replace(/\D/g, "");
  if (!clean) return 0;
  return parseInt(clean, 10) / 100;
};

// Converts any generic JS float/number directly into pt-BR currency formatted string representation
const formatFloatToCurrency = (val: number): string => {
  if (val === undefined || val === null || isNaN(val)) return "";
  const cents = Math.round(val * 100);
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export default function ScheduleSheet({
  clientes,
  pets,
  produtos,
  movimentos,
  detalhesMov,
  prePedidos,
  prePedidoItens,
  caixaDiario,
  caixaMovimentacao,
  caixaSaldosForma,
  lotesProdutos = [],
  activeTheme,
  currentUserOwnerId,
  isAdminViewAll = false,
  onUpdateClientes,
  onUpdateMovimentos,
  onUpdateDetalhesMov,
  onUpdatePrePedidos,
  onUpdateCaixa,
  onUpdateLotes,
  currentUser,
  showConfirm,
  showAlert,
  isRestricted = false,
  isMobile = false,
  userPermissionLevel = 1,
  onNavigateToCaixa,
  godModeActive = false,
  controleRetornos = [],
  onUpdateControleRetornos,
  prefilledRetornoToSchedule,
  onClearPrefilledRetorno,
  prefilledDate,
  onClearPrefilledDate,
}: ScheduleSheetProps) {
  // App state for active day filtering
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedEndDate, setSelectedEndDate] = useState(todayStr);

  React.useEffect(() => {
    if (prefilledDate) {
      const normalizedPrefilled = normalizeDateOnly(prefilledDate);
      setSelectedDate(normalizedPrefilled);
      setSelectedEndDate(normalizedPrefilled);
      if (onClearPrefilledDate) {
        onClearPrefilledDate();
      }
    }
  }, [prefilledDate, onClearPrefilledDate]);

  // Helper to handle date navigation buttons
  const handleNavigateDate = (offset: number) => {
    if (offset === 0) {
      setSelectedDate(todayStr);
      setSelectedEndDate(todayStr);
    } else {
      const normCurrent = normalizeDateOnly(selectedDate) || todayStr;
      const [y, m, d] = normCurrent.split("-").map(Number);
      const current = new Date(y, m - 1, d);
      current.setDate(current.getDate() + offset);
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, "0");
      const day = String(current.getDate()).padStart(2, "0");
      const newDateStr = `${year}-${month}-${day}`;
      setSelectedDate(newDateStr);
      setSelectedEndDate(newDateStr);
    }
  };

  // Modal / forms UI triggers
  const isPrefillingRef = React.useRef(false);
  const [activeRetornoToMarkCompleted, setActiveRetornoToMarkCompleted] = useState<any>(null);
  const [showAddParentModal, setShowAddParentModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [observacao, setObservacao] = useState("");

  // Modal de Recorrência Direta na Linha do Movimento Diário
  const [rowRecorrenteModal, setRowRecorrenteModal] = useState<{ row: CadDetMovDiario; clientName: string; parent?: CadMovDiario } | null>(null);
  const [rowRecorrenteDays, setRowRecorrenteDays] = useState<number>(7);

  const handleOpenRowRecorrenteModal = (row: CadDetMovDiario, parent?: CadMovDiario, clientName?: string) => {
    setRowRecorrenteModal({
      row,
      clientName: clientName || "Cliente",
      parent,
    });
    setRowRecorrenteDays(7);
  };

  const handleSaveRowRecorrente = () => {
    if (!rowRecorrenteModal) return;
    const { row, clientName, parent } = rowRecorrenteModal;

    const days = Math.max(1, rowRecorrenteDays || 1);
    const baseDate = row.Data || detailData || selectedDate || todayStr;
    const returnDateStr = addDaysToDate(baseDate, days);

    const prodObj = produtos.find((p) => p.Id === row.Servico);
    const nomeServico = prodObj ? prodObj.Nome : (row.Servico || "Serviço");

    const newRetornos = [...(controleRetornos || [])];
    newRetornos.push({
      Id: `retorno-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      IdCliente: parent?.Cliente || "",
      NomeCliente: clientName || "Cliente",
      IdPet: row.IdPet || "",
      NomePet: row.NomePet || "Pet",
      UltimoServico: row.Servico || "prod-default",
      NomeServico: nomeServico,
      DataSugerida: returnDateStr,
      DataRegistro: todayStr,
      Status: "Pendente",
      IdUsuarioDono: currentUserOwnerId,
    });

    if (onUpdateControleRetornos) {
      onUpdateControleRetornos(newRetornos);
    }

    showAlert(
      "Alerta Recorrente Programado ✓",
      `Alerta de retorno para "${row.NomePet || "Pet"}" criado com sucesso!\n\nData do Atendimento: ${baseDate.split("-").reverse().join("/")}\nIntervalo: +${days} dias\nNova Data Sugerida: ${returnDateStr.split("-").reverse().join("/")}`
    );

    setRowRecorrenteModal(null);
  };

  // Step 2 Wizard states corresponding to SAP Build Apps Master-Detail process
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [savedParentId, setSavedParentId] = useState("");
  const [detailData, setDetailData] = useState("");
  const [detailPetName, setDetailPetName] = useState("");
  const [detailHora, setDetailHora] = useState("09:00");
  const [detailProdutoId, setDetailProdutoId] = useState("");
  const [detailQuantidade, setDetailQuantidade] = useState<number>(1);
  const [detailPrecoUnitario, setDetailPrecoUnitario] = useState<number>(0);
  const [detailTipo, setDetailTipo] = useState<"Entrada" | "Saída" | any>("Entrada");

  React.useEffect(() => {
    if (prefilledRetornoToSchedule) {
      if (userPermissionLevel === 3) {
        showAlert?.("Acesso Restrito 🔒", "Nível de permissão 3 (Consulta e Pré-Venda) não autoriza novos agendamentos.");
        if (onClearPrefilledRetorno) onClearPrefilledRetorno();
        return;
      }

      const isArray = Array.isArray(prefilledRetornoToSchedule);
      const items = isArray ? prefilledRetornoToSchedule : [prefilledRetornoToSchedule];
      if (items.length === 0) return;

      const firstItem = items[0];
      const selectedClient = clientes.find((c) => c.Id === firstItem.IdCliente);
      if (!selectedClient) {
        showAlert?.("Erro", "Cliente não encontrado.");
        if (onClearPrefilledRetorno) onClearPrefilledRetorno();
        return;
      }

      isPrefillingRef.current = true;
      setActiveRetornoToMarkCompleted(prefilledRetornoToSchedule);

      // Automatically generate parent record
      const parentId = `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newParent: CadMovDiario = {
        Id: parentId,
        Cliente: selectedClient.Id,
        Telefone: selectedClient.Telefone,
        Endereco: selectedClient.Endereco,
        Observacao: "Retorno de agendamento recorrente programado",
        IdUsuarioDono: selectedClient.IdUsuarioDono || currentUserOwnerId,
      };

      onUpdateMovimentos([...movimentos, newParent]);

      setSelectedClientId(selectedClient.Id);
      setClientSearchQuery(selectedClient.Nome);
      setObservacao("Retorno de agendamento recorrente programado");
      setSavedParentId(parentId);

      const rows = items.map((ret, index) => {
        let defaultPet = ret.NomePet || "Vira-Latas";
        let defaultPetId = ret.IdPet || "";
        
        const pObj = pets.find((pt) => pt.Id === ret.IdPet);
        if (pObj) {
          defaultPet = pObj.Nome;
          defaultPetId = pObj.Id;
        } else {
          const clientPets = pets.filter((p) => p.IdCliente === selectedClient.Id && p.Ativo);
          if (clientPets.length > index && clientPets[index]) {
            defaultPet = clientPets[index].Nome;
            defaultPetId = clientPets[index].Id;
          } else if (clientPets.length > 0) {
            defaultPet = clientPets[0].Nome;
            defaultPetId = clientPets[0].Id;
          }
        }

        let defaultProdId = "";
        let defaultPrice = 0;
        const prodObj = produtos.find(
          (pr) => pr.Id === ret.UltimoServico || pr.Nome === ret.UltimoServico
        );
        if (prodObj) {
          defaultProdId = prodObj.Id;
          defaultPrice = prodObj.Preco;
        } else {
          const defaultProd = produtos.find((p) => p.Ativo);
          if (defaultProd) {
            defaultProdId = defaultProd.Id;
            defaultPrice = defaultProd.Preco;
          }
        }

        const targetDate = ret.DataSugerida || selectedDate;

        return {
          Id: `wz-det-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`,
          Data: targetDate,
          Hora: "09:00",
          NomePet: defaultPet,
          IdPet: defaultPetId,
          Servico: defaultProdId,
          Quantidade: 1,
          PrecoUnitario: defaultPrice,
          Tipo: "Entrada" as "Entrada" | "Saída",
          TotalDaLinha: defaultPrice,
        };
      });

      setWizardRows(rows);

      const firstTargetDate = items[0]?.DataSugerida || selectedDate;
      setDetailData(firstTargetDate);
      setCurrentStep(2); // Directly step 2 as requested
      setIsEditingWizard(false);
      setShowAddParentModal(true);
      if (onClearPrefilledRetorno) {
        onClearPrefilledRetorno();
      }
    }
  }, [
    prefilledRetornoToSchedule,
    clientes,
    userPermissionLevel,
    onClearPrefilledRetorno,
    movimentos,
    onUpdateMovimentos,
    currentUserOwnerId,
    pets,
    produtos,
    selectedDate,
    showAlert
  ]);

  // State for Step 2 wizard interactive datasheet ("folha de dados")
  const [wizardRows, setWizardRows] = useState<any[]>([]);
  const [isEditingWizard, setIsEditingWizard] = useState(false);

  // States for Desktop billing automation (PDV Caixa)
  const [showFaturamentoModal, setShowFaturamentoModal] = useState(false);
  const [selectedDetId, setSelectedDetId] = useState("");
  const [selectedPreId, setSelectedPreId] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("Pix");
  const [pagamentoPix, setPagamentoPix] = useState<string>("");
  const [pagamentoDebito, setPagamentoDebito] = useState<string>("");
  const [pagamentoCredito, setPagamentoCredito] = useState<string>("");
  const [pagamentoDinheiro, setPagamentoDinheiro] = useState<string>("");
  const [pagamentoFiado, setPagamentoFiado] = useState<string>("");
  const [faturamentoServiceSearch, setFaturamentoServiceSearch] = useState("");
  const [faturamentoPreSearch, setFaturamentoPreSearch] = useState("");

  // New Unified PDV Cart & Client states
  const [pdvCart, setPdvCart] = useState<any[]>([]);
  const [pdvClientId, setPdvClientId] = useState("");
  const [pdvClientSearch, setPdvClientSearch] = useState("");
  const [pdvProductSearch, setPdvProductSearch] = useState("");
  const [pdvParentMovId, setPdvParentMovId] = useState("");
  const [pdvPrePedidoId, setPdvPrePedidoId] = useState("");

  // States for row action: Edit Record (Mostrar Tela de Edição)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editRowId, setEditRowId] = useState("");
  const [editRowData, setEditRowData] = useState("");
  const [editRowHora, setEditRowHora] = useState("");
  const [editRowIdPet, setEditRowIdPet] = useState("");
  const [editRowNomePet, setEditRowNomePet] = useState("");
  const [editRowServico, setEditRowServico] = useState("");
  const [editRowTipo, setEditRowTipo] = useState<"Entrada" | "Saída">("Entrada");
  const [editRowQuantidade, setEditRowQuantidade] = useState(1);
  const [editRowPrecoUnitario, setEditRowPrecoUnitario] = useState(0);
  const [editRowRealizado, setEditRowRealizado] = useState(false);
  const [editRowIdCadMovDiario, setEditRowIdCadMovDiario] = useState("");

  // PDV Unified Cart Helpers
  const loadAppointmentToCart = (group: any) => {
    const parentMov = userMovimentos.find(m => m.Id === group.parentId);
    if (parentMov && parentMov.Cliente) {
      setPdvClientId(parentMov.Cliente);
    } else {
      setPdvClientId(""); // Cliente Consumidor
    }
    setPdvParentMovId(group.parentId);

    const clientObj = parentMov?.Cliente ? clientes.find(c => c.Id === parentMov.Cliente) : null;
    const resolvedClientName = clientObj ? clientObj.Nome : (parentMov?.Cliente || "");
    
    const newCartItems = group.dets.map((d: any) => {
      const matchedProd = produtos.find(p => p.Id === d.Servico);
      const pName = matchedProd?.Nome || d.Servico;
      const initialPrice = Number(d.PrecoUnitario) || 0;
      const scheduleDateStr = d.Data ? (d.Hora ? `${d.Data}T${d.Hora}:00` : `${d.Data}T00:00:00`) : undefined;
      const isDespesa = d.Tipo === "Saída" || d.TotalDaLinha < 0 || resolvedClientName.toUpperCase() === "MINHAS DESPESAS" || pName === "Despesa do Dia";
      return {
        id: `service-${d.Id}`,
        type: "service",
        originalId: d.Id,
        name: `${d.NomePet ? d.NomePet + " - " : ""}${pName}`,
        petName: d.NomePet || "",
        price: initialPrice,
        originalPrice: initialPrice,
        quantity: Number(d.Quantidade) || 1,
        parentId: group.parentId,
        tipo: isDespesa ? "Saída" : (d.Tipo || "Entrada"),
        dataAgendamento: scheduleDateStr
      };
    });
    
    setPdvCart(prev => {
      const products = prev.filter(item => item.type !== "service");
      return [...products, ...newCartItems];
    });
  };

  const importPrePedido = (preId: string) => {
    const items = prePedidoItens.filter(i => i.IdPrePedido === preId);
    const preObj = prePedidos.find(p => p.Id === preId);
    if (preObj && preObj.Cliente) {
      setPdvClientId(preObj.Cliente);
    }
    setPdvPrePedidoId(preId);
    
    const newItems = items.map(i => {
      const prod = produtos.find(p => p.Id === i.IdProdutoServico);
      const catalogPrice = prod?.Preco ?? (Number(i.ValorUnitario || i.PrecoUnitario) || 0);
      return {
        id: `product-pre-${i.Id}-${Date.now()}`,
        type: "product",
        originalId: i.IdProdutoServico,
        name: i.NomeProduto || `Produto ID: ${i.IdProdutoServico}`,
        price: Number(i.ValorUnitario || i.PrecoUnitario) || 0,
        originalPrice: catalogPrice,
        quantity: Number(i.Quantidade) || 1,
        parentId: preId
      };
    });
    
    setPdvCart(prev => {
      return [...prev, ...newItems];
    });
  };

  const addProductToCart = (prod: any) => {
    setPdvCart(prev => {
      const existing = prev.find(item => item.type === "product" && item.originalId === prod.Id);
      if (existing) {
        return prev.map(item => item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item);
      } else {
        return [...prev, {
          id: `prod-${prod.Id}-${Date.now()}`,
          type: "product",
          originalId: prod.Id,
          name: prod.Nome,
          price: Number(prod.Preco) || 0,
          originalPrice: Number(prod.Preco) || 0,
          quantity: 1
        }];
      }
    });
  };

  const handleAddProductByQueryOrBarcode = (query: string) => {
    if (!query) return;
    const cleanQuery = query.trim().toLowerCase();
    const foundByBarcode = produtos.find(p => p.CodigoDeBarras && p.CodigoDeBarras.trim() === query.trim());
    const foundByName = foundByBarcode || produtos.find(p => p.Nome.toLowerCase() === cleanQuery);
    
    if (foundByName) {
      addProductToCart(foundByName);
      setPdvProductSearch("");
    } else {
      // Let's add customized custom item directly on-the-fly if not found
      setPdvCart(prev => [...prev, {
        id: `custom-${Date.now()}`,
        type: "product",
        originalId: `custom-id-${Date.now()}`,
        name: query.trim(),
        price: 0,
        originalPrice: 0,
        quantity: 1
      }]);
      setPdvProductSearch("");
    }
  };

  const updateCartItemQty = (id: string, newQty: number) => {
    if (newQty <= 0) {
      setPdvCart(prev => prev.filter(item => item.id !== id));
    } else {
      setPdvCart(prev => prev.map(item => item.id === id ? { ...item, quantity: newQty } : item));
    }
  };

  const updateCartItemPrice = (id: string, newPrice: number) => {
    setPdvCart(prev => prev.map(item => item.id === id ? { ...item, price: Math.max(0, newPrice) } : item));
  };

  const removeCartItem = (id: string) => {
    setPdvCart(prev => prev.filter(item => item.id !== id));
  };

  const handleExecuteFaturamento = () => {
    if (userPermissionLevel !== 1) {
      showAlert("Faturamento Bloqueado 🔒", "Seu nível de permissão não concede acesso às operações de faturamento ou caixa.");
      return;
    }
    if (pdvCart.length === 0) {
      showAlert("Carrinho Vazio ⚠️", "Por favor, adicione pelo menos um item (Atendimento ou Produto) no carrinho antes de faturar.");
      return;
    }

    // --- SMART FIFO STOCK VALIDATION ---
    const productQuantities: { [productId: string]: { name: string; qty: number } } = {};

    for (const item of pdvCart) {
      let productId = item.originalId;

      if (item.type === "pre-pedido") {
        productId = item.productId || item.originalId;
      } else if (item.type === "service") {
        const detRecord = detalhesMov.find((d) => d.Id === item.originalId);
        if (detRecord) {
          productId = detRecord.Servico;
        }
      }

      // Safe lookup prioritizing the current company's products
      let assocProduct = produtos.find(
        (p) => p.Id === productId && (!p.IdUsuarioDono || p.IdUsuarioDono === currentUserOwnerId)
      );
      if (!assocProduct) {
        assocProduct = produtos.find(
          (p) =>
            (!p.IdUsuarioDono || p.IdUsuarioDono === currentUserOwnerId) &&
            (p.Nome === item.name || (item.barcode && p.CodigoDeBarras === item.barcode))
        );
        if (assocProduct) {
          productId = assocProduct.Id;
        }
      }

      // Fallback lookup in case of missing owner mapping
      if (!assocProduct) {
        assocProduct = produtos.find((p) => p.Id === productId);
        if (!assocProduct) {
          assocProduct = produtos.find(
            (p) => p.Nome === item.name || (item.barcode && p.CodigoDeBarras === item.barcode)
          );
        }
        if (assocProduct) {
          productId = assocProduct.Id;
        }
      }

      if (assocProduct && assocProduct.Tipo === "Produto") {
        if (!productQuantities[productId]) {
          productQuantities[productId] = { name: assocProduct.Nome, qty: 0 };
        }
        productQuantities[productId].qty += item.quantity;
      }
    }

    for (const productId of Object.keys(productQuantities)) {
       const { name, qty } = productQuantities[productId];
       const totalAvailable = (lotesProdutos || [])
         .filter((lot) => {
           const matchesId = lot.IdProduto === productId;
           let matchesName = false;
           if (!matchesId) {
             const lotProd = produtos.find((p) => p.Id === lot.IdProduto);
             if (lotProd && lotProd.Nome && name && lotProd.Nome.trim().toLowerCase() === name.trim().toLowerCase()) {
               matchesName = true;
             }
           }
           // A lot is valid if it's not explicitly disabled, OR if it still has available stock.
           const isLoteAtivo = lot.Ativo !== false || lot.QuantidadeLote > 0;
           return (matchesId || matchesName) && isLoteAtivo;
         })
         .reduce((sum, lot) => sum + Math.max(0, lot.QuantidadeLote), 0);

      if (totalAvailable < qty) {
        showAlert(
          "Estoque Insuficiente ⛔",
          `Estoque insuficiente nos lotes disponíveis para o produto "${name}". Quantidade necessária: ${qty}, disponível em estoque: ${totalAvailable}.`
        );
        return;
      }
    }

    const valorTotalItens = pdvCart.reduce((sum, item) => {
      const isSaida = item.tipo === "Saída";
      const val = item.quantity * item.price;
      return sum + (isSaida ? -val : val);
    }, 0);

    const isAnonymous = !pdvClientId;
    const clientNameRepresentation = pdvClientId
      ? (clientes.find(c => c.Id === pdvClientId)?.Nome || "Cliente Cadastrado")
      : "Cliente Consumidor";

    const isTransactionSaida =
      clientNameRepresentation.toUpperCase() === "MINHAS DESPESAS" ||
      pdvCart.some(item => item.tipo === "Saída" || (item as any).type === "Saída") ||
      valorTotalItens < 0;

    const targetAbsTotal = Math.abs(valorTotalItens);

    let effectivePix = Math.abs(Number(pagamentoPix) || 0);
    let effectiveDebito = Math.abs(Number(pagamentoDebito) || 0);
    let effectiveCredito = Math.abs(Number(pagamentoCredito) || 0);
    let effectiveDinheiro = Math.abs(Number(pagamentoDinheiro) || 0);
    let effectiveFiado = Math.abs(Number(pagamentoFiado) || 0);

    if (isTransactionSaida && (effectivePix + effectiveDebito + effectiveCredito + effectiveDinheiro + effectiveFiado === 0)) {
      effectiveDinheiro = targetAbsTotal;
    }

    let somaLancada = effectivePix + effectiveDebito + effectiveCredito + effectiveDinheiro + effectiveFiado;
    const expectedTotal = isTransactionSaida ? targetAbsTotal : valorTotalItens;

    // 1. Bloqueio para Cliente Anônimo: Se a venda for para o 'Cliente Consumidor' (sem cadastro), a opção 'Lançar no Fiado' fica bloqueada
    if (isAnonymous && effectiveFiado > 0) {
      showAlert("Bloqueio de Fiado ⛔", "A opção 'Lançar no Fiado' está bloqueada para vendas rápidas sem cadastro (Cliente Consumidor). Por favor, use Pix, Cartão ou Dinheiro.");
      return;
    }

    if (isAnonymous && Math.abs(somaLancada - expectedTotal) >= 0.015) {
      showAlert("Valor Divergente ⛔", `Para 'Cliente Consumidor', o pagamento deve ser integral e imediato. O total é R$ ${expectedTotal.toFixed(2)}, mas foi informado R$ ${somaLancada.toFixed(2)}.`);
      return;
    }

    let finalFiado = effectiveFiado;

    if (!isAnonymous && somaLancada < expectedTotal) {
      // Cenário B: Diferença para o Fiado lançado automaticamente
      const restanteFiado = expectedTotal - somaLancada;
      finalFiado += restanteFiado;
      somaLancada += restanteFiado; // Now somaLancada == expectedTotal
    } else if (!isAnonymous && Math.abs(somaLancada - expectedTotal) >= 0.015 && somaLancada > expectedTotal) {
      showAlert("Aviso de Excesso ⚠️", `Os valores informados de pagamentos (R$ ${somaLancada.toFixed(2)}) excedem o valor total (R$ ${expectedTotal.toFixed(2)}).`);
      return;
    }

    let updatedClientList = [...clientes];
    if (finalFiado > 0) {
      const targetClient = clientes.find(c => c.Id === pdvClientId);
      if (!targetClient) {
        showAlert("Erro de Crédito ⛔", "Não foi possível localizar o cadastro do cliente para lançar no Fiado.");
        return;
      }

      const limit = targetClient.LimiteCredito !== undefined ? targetClient.LimiteCredito : 0;
      const currentDebito = Number(targetClient.SaldoDevedor) || 0;

      if (limit > 0 && (currentDebito + finalFiado > limit)) {
        showAlert(
          "Limite de Crédito Excedido ⛔",
          `O limite de crédito do cliente ${targetClient.Nome} é de R$ ${limit.toFixed(2)} (Saldo devedor atual: R$ ${currentDebito.toFixed(2)}). Lançar mais R$ ${finalFiado.toFixed(2)} no Fiado excederá este limite!`
        );
        return;
      }

      updatedClientList = clientes.map(c => {
        if (c.Id === pdvClientId) {
          return { ...c, SaldoDevedor: currentDebito + finalFiado };
        }
        return c;
      });
    }

    const userMasterId = currentUser?.IdUsuarioMaster || currentUser?.Id || currentUserOwnerId;
    let currentOpenCaixa = caixaDiario.find(c => c.IdUsuarioMaster === userMasterId && c.Status === "Aberto");
    let updatedCaixaDiarioList = [...caixaDiario];

    if (!currentOpenCaixa) {
      currentOpenCaixa = {
        Id: `caixa-${Date.now()}`,
        IdUsuarioMaster: userMasterId,
        DataAbertura: new Date().toISOString().split("T")[0],
        SaldoInicial: 0,
        Status: "Aberto"
      };
      updatedCaixaDiarioList.push(currentOpenCaixa);
    }

    const updatedCaixaMovList = [...caixaMovimentacao];
    let nextSaldosForma = [...caixaSaldosForma];

    const finalSaleId = `sale-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const normalizedPdvCart = pdvCart.map(item => ({
      ...item,
      originalPrice: item.originalPrice ?? item.price
    }));
    const stringifiedItems = JSON.stringify(normalizedPdvCart);

    let transactionValorOriginal = 0;
    let transactionValorCobrado = 0;
    normalizedPdvCart.forEach((item) => {
      const origPrice = item.originalPrice ?? item.price;
      transactionValorOriginal += origPrice * item.quantity;
      transactionValorCobrado += item.price * item.quantity;
    });

    const activePayments = [
      { key: "Pix", val: effectivePix },
      { key: "Cartão de Débito", val: effectiveDebito },
      { key: "Cartão de Crédito", val: effectiveCredito },
      { key: "Dinheiro", val: effectiveDinheiro },
      { key: "Fiado", val: finalFiado }
    ].filter(p => Math.abs(p.val) > 0.001);

    const nowIso = new Date().toISOString();

    // Determine actual appointment/service date (DataAgendamento)
    let saleDataAgendamento: string | undefined;
    for (const item of pdvCart) {
      if ((item as any).dataAgendamento) {
        saleDataAgendamento = (item as any).dataAgendamento;
        break;
      }
      if (item.type === "service" || item.id?.startsWith("service-")) {
        const foundDet = detalhesMov.find((d) => d.Id === item.originalId);
        if (foundDet && foundDet.Data) {
          saleDataAgendamento = foundDet.Hora ? `${foundDet.Data}T${foundDet.Hora}:00` : `${foundDet.Data}T00:00:00`;
          break;
        }
      }
    }
    if (!saleDataAgendamento) {
      saleDataAgendamento = nowIso;
    }

    // Determine if the transaction is an expense (Saída)
    const parentMov = pdvParentMovId ? userMovimentos.find(m => m.Id === pdvParentMovId) : null;
    if (parentMov && (clientes.find(c => c.Id === parentMov.Cliente)?.Nome?.toUpperCase() === "MINHAS DESPESAS" || parentMov.Cliente?.toUpperCase() === "MINHAS DESPESAS")) {
      // additional check if parentMov indicates MINHAS DESPESAS
    }

    const transactionType: "Entrada" | "Saída" = isTransactionSaida ? "Saída" : "Entrada";

    let expenseObs = parentMov?.Observacao || observacao || "";
    if (!expenseObs && pdvCart.length > 0) {
      expenseObs = pdvCart.map(item => item.name).filter(Boolean).join(", ");
    }

    activePayments.forEach((ap, idx) => {
      const newMov: CaixaMovimentacao = {
        Id: `mov-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
        IdCaixaDiario: currentOpenCaixa.Id,
        Tipo: transactionType,
        Origem: "Venda",
        Valor: Math.abs(ap.val),
        FormaPagamento: ap.key,
        DataHora: nowIso,
        IdVenda: finalSaleId,
        NomeCliente: clientNameRepresentation,
        ClienteId: pdvClientId || undefined,
        Itens: stringifiedItems,
        StatusVenda: "Ativo",
        ValorTotalVenda: valorTotalItens,
        ValorOriginal: transactionValorOriginal,
        ValorCobrado: transactionValorCobrado,
        DataAgendamento: saleDataAgendamento,
        Observacao: expenseObs,
        IdUsuarioDono: currentUserOwnerId,
      };
      updatedCaixaMovList.push(newMov);

      let isSaldoUpdated = false;
      nextSaldosForma = nextSaldosForma.map(sf => {
        if (sf.IdUsuarioMaster === userMasterId && sf.FormaPagamento.toLowerCase() === ap.key.toLowerCase()) {
          isSaldoUpdated = true;
          const currentVal = Number(sf.SaldoAcumulado) || 0;
          const newVal = isTransactionSaida ? currentVal - Math.abs(ap.val) : currentVal + Math.abs(ap.val);
          return { ...sf, SaldoAcumulado: newVal };
        }
        return sf;
      });

      if (!isSaldoUpdated) {
        nextSaldosForma.push({
          Id: `saldo-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
          IdUsuarioMaster: userMasterId,
          FormaPagamento: ap.key,
          SaldoAcumulado: isTransactionSaida ? -Math.abs(ap.val) : Math.abs(ap.val)
        });
      }
    });

    const serviceIdsPaid = new Set(pdvCart.filter(item => item.type === "service").map(item => item.originalId));
    const paymentTimestamp = new Date().toISOString();
    const updatedDetails = detalhesMov.map(det => {
      if (serviceIdsPaid.has(det.Id)) {
        return { ...det, Pago: true, PagoEm: paymentTimestamp };
      }
      return det;
    });

    const updatedPrePedidos = prePedidos.map(pre => {
      if (pdvPrePedidoId && pre.Id === pdvPrePedidoId) {
        return { ...pre, Status: "Faturado" };
      }
      return pre;
    });

    // Decrement stock levels for products in the cart from lotesProdutos
    let updatedLotes = lotesProdutos.map((lot) => ({ ...lot }));
    pdvCart.forEach((item) => {
      if (item.type === "product") {
        let productId = item.originalId;

        // Extremely robust fallback: check if productId is actually in the products catalog,
        // otherwise try to find it by name or barcode, prioritizing current company's products
        let assocProduct = produtos.find(
          (p) => p.Id === productId && (!p.IdUsuarioDono || p.IdUsuarioDono === currentUserOwnerId)
        );
        if (!assocProduct) {
          assocProduct = produtos.find(
            (p) =>
              (!p.IdUsuarioDono || p.IdUsuarioDono === currentUserOwnerId) &&
              (p.Nome === item.name || (item.barcode && p.CodigoDeBarras === item.barcode))
          );
          if (assocProduct) {
            productId = assocProduct.Id;
          }
        }

        // Fallback lookup in case of missing owner mapping
        if (!assocProduct) {
          assocProduct = produtos.find((p) => p.Id === productId);
          if (!assocProduct) {
            assocProduct = produtos.find(
              (p) => p.Nome === item.name || (item.barcode && p.CodigoDeBarras === item.barcode)
            );
          }
          if (assocProduct) {
            productId = assocProduct.Id;
          }
        }

        // Filtering lots for the respective product
        const productLots = updatedLotes.filter((lot) => {
          const matchesId = lot.IdProduto === productId;
          let matchesName = false;
          if (!matchesId) {
            const lotProd = produtos.find((p) => p.Id === lot.IdProduto);
            if (lotProd && lotProd.Nome && item.name && lotProd.Nome.trim().toLowerCase() === item.name.trim().toLowerCase()) {
              matchesName = true;
            }
          }
          // A lot is valid if it's not explicitly disabled, OR if it still has available stock.
          const isLoteAtivo = lot.Ativo !== false || lot.QuantidadeLote > 0;
          return (matchesId || matchesName) && isLoteAtivo;
        });

        if (productLots.length > 0) {
          // Sorting lots by expiry date (nearest expiry date gets deducted first - FIFO/PEPS)
          productLots.sort((a, b) => {
            if (!a.ValidadeLote && !b.ValidadeLote) return 0;
            if (!a.ValidadeLote) return 1;
            if (!b.ValidadeLote) return -1;
            return a.ValidadeLote.localeCompare(b.ValidadeLote);
          });

          // Identify the current active lot
          // It's the one explicitly marked Ativo === true with remaining stock.
          // Otherwise, the first non-empty lot in our FIFO sorted list.
          let activeLotIndex = productLots.findIndex((lot) => lot.Ativo === true && lot.QuantidadeLote > 0);
          if (activeLotIndex === -1) {
            activeLotIndex = productLots.findIndex((lot) => lot.QuantidadeLote > 0);
          }

          let qtyToSubtract = item.quantity;

          if (activeLotIndex !== -1) {
            // Start cascading from the selected activeLotIndex
            let currentIndex = activeLotIndex;
            while (qtyToSubtract > 0 && currentIndex < productLots.length) {
              const currentLot = productLots[currentIndex];
              
              if (currentLot.QuantidadeLote > 0) {
                // Mark as Lote Ativo as we are currently using it
                currentLot.Ativo = true;

                if (qtyToSubtract <= currentLot.QuantidadeLote) {
                  // Can satisfy the remainder from this lot
                  currentLot.QuantidadeLote -= qtyToSubtract;
                  qtyToSubtract = 0;
                  
                  // If it became fully depleted, mark inactive/zerado
                  if (currentLot.QuantidadeLote === 0) {
                    currentLot.Ativo = false;
                  }
                } else {
                  // Consume everything from this lot and find the next one
                  const available = currentLot.QuantidadeLote;
                  currentLot.QuantidadeLote = 0;
                  currentLot.Ativo = false; // mark as inactive/zerado
                  qtyToSubtract -= available;
                  
                  // Find the next lot with stock to mark as Ativo
                  let foundNext = false;
                  for (let i = currentIndex + 1; i < productLots.length; i++) {
                    if (productLots[i].QuantidadeLote > 0) {
                      productLots[i].Ativo = true;
                      foundNext = true;
                      currentIndex = i;
                      break;
                    }
                  }
                  
                  if (!foundNext) {
                    break;
                  }
                }
              } else {
                currentIndex++;
              }
            }
          }

          // Fallback: If still quantity remains (should be prevented by pre-validation), deduct from first lot
          if (qtyToSubtract > 0 && productLots.length > 0) {
            productLots[0].QuantidadeLote -= qtyToSubtract;
            if (productLots[0].QuantidadeLote <= 0) {
              productLots[0].Ativo = false;
            }
          }
        }
      }
    });

    onUpdateDetalhesMov(updatedDetails);
    onUpdatePrePedidos(updatedPrePedidos);
    onUpdateCaixa(updatedCaixaDiarioList, updatedCaixaMovList, nextSaldosForma);
    onUpdateLotes?.(updatedLotes);
    if (finalFiado > 0 && onUpdateClientes) {
      onUpdateClientes(updatedClientList);
    }

    setShowFaturamentoModal(false);
    setSelectedDetId("");
    setSelectedPreId("");
    setPdvCart([]);
    setPdvClientId("");
    setPdvClientSearch("");
    setPdvProductSearch("");
    setPdvParentMovId("");
    setPdvPrePedidoId("");
    setPagamentoPix("");
    setPagamentoDebito("");
    setPagamentoCredito("");
    setPagamentoDinheiro("");
    setPagamentoFiado("");

    const clientNameStr = pdvClientId ? (clientes.find(c => c.Id === pdvClientId)?.Nome || "Cliente") : "Cliente Consumidor";
    const paymentBreakdown = activePayments
      .map(ap => `  ${ap.key === "Fiado" ? "📝 Fiado (Conta)" : ap.key === "Pix" ? "🟩 Pix" : ap.key === "Cartão de Débito" ? "🟦 Débito" : ap.key === "Cartão de Crédito" ? "🟪 Crédito" : "💵 Dinheiro"}: R$ ${ap.val.toFixed(2)}`)
      .join("\n");

    showAlert(
      "Venda Faturada com Sucesso! 💸",
      `Faturamento consolidado para ${clientNameStr}:\n\n` +
      `• Total Geral: R$ ${valorTotalItens.toFixed(2)}\n\n` +
      `Distribuição Lançada:\n${paymentBreakdown}\n\n` +
      `Os serviços correspondentes do Movimento Diário foram alterados para Pago.`
    );
  };

  // Search filter
  const [searchTerm, setSearchTerm] = useState("");

  // Pacote/Repetições modal states
  const [showPacoteModal, setShowPacoteModal] = useState(false);
  const [selectedPacoteRow, setSelectedPacoteRow] = useState<CadDetMovDiario | null>(null);
  const [pacoteIntervalDays, setPacoteIntervalDays] = useState<number>(7);
  const [pacoteQuantity, setPacoteQuantity] = useState<number>(4);
  const [pacoteIntervalType, setPacoteIntervalType] = useState<string>("7");
  const [customIntervalDays, setCustomIntervalDays] = useState<string>("");

  // Reset scroll to 0 when opening any modal on mobile
  React.useEffect(() => {
    if (showFaturamentoModal || showPacoteModal || showAddParentModal || showEditModal) {
      const timer = setTimeout(() => {
        const modals = document.querySelectorAll("#pdv-faturamento-modal, #edit-record-screen-modal, .fixed.inset-0");
        modals.forEach((modal) => {
          modal.scrollTop = 0;
          const scrollables = modal.querySelectorAll(".overflow-y-auto, [class*='overflow-y-auto']");
          scrollables.forEach((el) => {
            el.scrollTop = 0;
          });
        });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [showFaturamentoModal, showPacoteModal, showAddParentModal, showEditModal]);

  // Sorting state for Data and Hora: "Tipo A-z"
  const [sortField, setSortField] = useState<"Data" | "Hora" | "">("Hora");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Map movements & details that belong to the active user and are active (or all if admin view is active)
  const userClientsMap = useMemo(() => {
    const map = new Map<string, CadCliente>();
    clientes.forEach((c) => {
      if (isAdminViewAll || c.IdUsuarioDono === currentUserOwnerId) {
        map.set(c.Id, c);
      }
    });
    return map;
  }, [clientes, currentUserOwnerId, isAdminViewAll]);

  // Filter movements belonging to this user (or all if admin view is active)
  const userMovimentos = useMemo(() => {
    if (isAdminViewAll) return movimentos;
    return movimentos.filter((m) => m.IdUsuarioDono === currentUserOwnerId);
  }, [movimentos, currentUserOwnerId, isAdminViewAll]);

  const userMovimentosMap = useMemo(() => {
    const map = new Map<string, CadMovDiario>();
    userMovimentos.forEach((m) => map.set(m.Id, m));
    return map;
  }, [userMovimentos]);

  // Group open/active/unpaid appointments by parent ID (IdCadMovDiario / ID Pai) for PDV/Caixa
  const groupedAtendimentos = useMemo(() => {
    const groups: { [parentId: string]: CadDetMovDiario[] } = {};

    detalhesMov.forEach((det) => {
      if (det.Ativo && !det.Pago && det.IdCadMovDiario) {
        // Must belong to current owner's scope/permissions
        const parent = userMovimentosMap.get(det.IdCadMovDiario);
        if (parent) {
          if (!groups[det.IdCadMovDiario]) {
            groups[det.IdCadMovDiario] = [];
          }
          groups[det.IdCadMovDiario].push(det);
        }
      }
    });

    return Object.entries(groups).map(([parentId, dets]) => {
      const parent = userMovimentosMap.get(parentId);
      const client = parent ? userClientsMap.get(parent.Cliente) : undefined;
      const clientName = client?.Nome || "Cliente Desconhecido";

      // Formatted pet list, e.g. "Suzy, Bella"
      const petNamesList = Array.from(
        new Set(dets.map((d) => d.NomePet).filter(Boolean))
      ).join(", ");

      // Accumulate price
      const totalValue = dets.reduce(
        (sum, d) => sum + (Number(d.PrecoUnitario) || 0) * (Number(d.Quantidade) || 1),
        0
      );

      // Date/time from the first detail or parent
      const date = dets[0]?.Data || parent?.Data || "";
      const time = dets[0]?.Hora || parent?.Hora || "";

      // List of services
      const services = Array.from(
        new Set(
          dets.map((d) => {
            const prod = produtos.find((p) => p.Id === d.Servico);
            return prod ? prod.Nome : d.Servico;
          })
        )
      ).filter(Boolean).join(" + ");

      return {
        parentId,
        dets,
        clientName,
        petNamesList,
        totalValue,
        services,
        date,
        time,
      };
    });
  }, [detalhesMov, userMovimentosMap, userClientsMap, produtos]);

  // Aggregate and filter all active detail rows for the selected date range
  const selectedDateDetRows = useMemo(() => {
    const normStart = selectedDate ? normalizeDateOnly(selectedDate) : "";
    const normEnd = selectedEndDate ? normalizeDateOnly(selectedEndDate) : "";

    const filtered = detalhesMov.filter((det) => {
      // Must be active and match selected date range
      if (!det.Ativo) return false;

      // Normaliza a data do registro para garantir correspondência exata de calendário (YYYY-MM-DD)
      const rowDate = normalizeDateOnly(det.Data);
      if (normStart && rowDate && rowDate < normStart) return false;
      if (normEnd && rowDate && rowDate > normEnd) return false;
      
      // Must belong to a parent movement owned by current user
      const parent = userMovimentosMap.get(det.IdCadMovDiario);
      if (!parent) return false;

      // Search term filter (Client Name, Pet Name, Service Name)
      if (searchTerm.trim() !== "") {
        const query = searchTerm.toLowerCase();
        // Resolve client name
        const clientObj = userClientsMap.get(parent.Cliente);
        const resolvedClientName = clientObj ? clientObj.Nome : parent.Cliente;
        // Resolve product name
        const prodObj = produtos.find((p) => p.Id === det.Servico);
        const resolvedProdName = prodObj ? prodObj.Nome : det.Servico;

        const matchesClient = resolvedClientName.toLowerCase().includes(query);
        const matchesPet = det.NomePet.toLowerCase().includes(query);
        const matchesService = resolvedProdName.toLowerCase().includes(query);

        return matchesClient || matchesPet || matchesService;
      }

      return true;
    });

    // Sort according to Sort Field (Data or Hora)
    if (sortField === "Data") {
      filtered.sort((a, b) => {
        const valA = a.Data || "";
        const valB = b.Data || "";
        return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    } else if (sortField === "Hora") {
      filtered.sort((a, b) => {
        const valA = a.Hora || "";
        const valB = b.Hora || "";
        return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }

    return filtered;
  }, [detalhesMov, selectedDate, selectedEndDate, userMovimentosMap, searchTerm, userClientsMap, produtos, sortField, sortOrder]);

  // Compute stats for summary banners
  const stats = useMemo(() => {
    let totalScheduled = selectedDateDetRows.length;
    let totalRevenue = 0;
    let totalExpenses = 0;
    let completedCount = 0;
    let paidCount = 0;

    selectedDateDetRows.forEach((row) => {
      totalRevenue += row.TotalDaLinha;
      if (row.TotalDaLinha < 0) {
        totalExpenses += Math.abs(row.TotalDaLinha);
      }
      if (row.Realizado) completedCount++;
      if (row.Pago) paidCount++;
    });

    return { totalScheduled, totalRevenue, totalExpenses, completedCount, paidCount };
  }, [selectedDateDetRows]);

  // Toggle "Pago" status is now disabled to enforce PDV/Caixa flow
  const handleToggleAllPagoSelected = () => {
    showAlert(
      "Ação Bloqueada 🔒",
      "O status 'PAGO' da agenda só pode ser modificado de forma automática quando você finaliza e fatura a venda através do modal do PDV Centralizado (Caixa)."
    );
  };

  // Initialize modal states when it is opened
  React.useEffect(() => {
    if (showAddParentModal && !isEditingWizard) {
      if (isPrefillingRef.current) {
        isPrefillingRef.current = false;
        return;
      }
      setCurrentStep(1);
      setSavedParentId("");
      setDetailData(selectedDate);
      setClientSearchQuery("");
      setSelectedClientId("");
      setObservacao("");
      setPacoteIntervalType("7");
      setCustomIntervalDays("");
      setPacoteIntervalDays(7);
    }
  }, [showAddParentModal, isEditingWizard]);

  // Synchronize Step 2 default options based on selections
  React.useEffect(() => {
    if (showFaturamentoModal) {
      setPagamentoPix("");
      setPagamentoDebito("");
      setPagamentoCredito("");
      setPagamentoDinheiro("");
      setPagamentoFiado("");
    }
  }, [showFaturamentoModal]);

  // Synchronize Step 2 default options based on selections
  React.useEffect(() => {
    if (showAddParentModal && currentStep === 2 && selectedClientId) {
      const clientPets = pets.filter((p) => p.IdCliente === selectedClientId && p.Ativo);
      if (clientPets.length > 0) {
        setDetailPetName(clientPets[0].Nome);
      } else {
        setDetailPetName("Vira-Latas");
      }
      const defaultProd = produtos.find((p) => p.Ativo);
      if (defaultProd) {
        setDetailProdutoId(defaultProd.Id);
        setDetailPrecoUnitario(defaultProd.Preco);
      }
    }
  }, [showAddParentModal, currentStep, selectedClientId, pets, produtos]);

  // Dynamic automatic price selection update in Wizard Step 2
  React.useEffect(() => {
    if (detailProdutoId) {
      const prod = produtos.find((p) => p.Id === detailProdutoId);
      if (prod) {
        setDetailPrecoUnitario(prod.Preco);
      }
    }
  }, [detailProdutoId, produtos]);

  // Local handlers for Step 2 Wizard Datasheet ("Folha de Dados")
  const handleAddWizardRow = () => {
    const clientPets = pets.filter((p) => p.IdCliente === selectedClientId && p.Ativo);
    const defaultPet = clientPets.length > 0 ? clientPets[0].Nome : "Vira-Latas";
    const defaultPetId = clientPets.length > 0 ? clientPets[0].Id : "";
    const defaultProd = produtos.find((p) => p.Ativo);
    const defaultProdId = defaultProd ? defaultProd.Id : "";
    const defaultPrice = defaultProd ? defaultProd.Preco : 0;

    const newRow = {
      Id: `wz-det-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      Data: detailData || selectedDate,
      Hora: "09:00",
      NomePet: defaultPet,
      IdPet: defaultPetId,
      Servico: defaultProdId,
      Quantidade: 1,
      PrecoUnitario: defaultPrice,
      Tipo: "Entrada" as "Entrada" | "Saída",
      TotalDaLinha: defaultPrice,
    };
    setWizardRows((prev) => [...prev, newRow]);
  };

  const handleUpdateWizardRowCell = (id: string, field: string, value: any) => {
    setWizardRows((prev) =>
      prev.map((row) => {
        if (row.Id !== id) return row;

        const updated = { ...row, [field]: value };

        // Auto-fill price if service/product changes
        if (field === "Servico") {
          const prod = produtos.find((p) => p.Id === value);
          if (prod) {
            updated.PrecoUnitario = prod.Preco;
          }
        }

        // Recompute TotalDaLinha if quantity / price / product / Tipo changes
        if (field === "Servico" || field === "Quantidade" || field === "PrecoUnitario" || field === "Tipo") {
          const qty = Number(updated.Quantidade || 0);
          const price = Number(updated.PrecoUnitario || 0);
          const isSaida = updated.Tipo === "Saída";
          updated.TotalDaLinha = isSaida ? -Math.abs(price * qty) : Math.abs(price * qty);
        }

        return updated;
      })
    );
  };

  const handleDeleteWizardRow = (id: string) => {
    if (wizardRows.length <= 1) {
      showAlert("Atenção", "A folha de dados do movimento diário deve conter pelo menos 1 serviço.");
      return;
    }
    setWizardRows((prev) => prev.filter((row) => row.Id !== id));
  };

  // Custom Step 2 manual product change helper
  const handleProdutoIdChangeInWizard = (prodId: string) => {
    setDetailProdutoId(prodId);
    const prod = produtos.find((p) => p.Id === prodId);
    if (prod) {
      setDetailPrecoUnitario(prod.Preco);
    }
  };

  // STEP 1 SUBMIT: Save daily movement to master entity (CadMovDiario)
  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userPermissionLevel === 3) {
      showAlert("Acesso Restrito 🔒", "Nível de permissão 3 (Consulta e Pré-Venda) não autoriza agendamentos ou edições.");
      return;
    }
    if (!selectedClientId) return;

    const selectedClient = clientes.find((c) => c.Id === selectedClientId);
    if (!selectedClient) return;

    if (isEditingWizard) {
      // Just progress to step 2 without changing savedParentId or overwriting wizardRows
      setDetailData(selectedDate);
      setCurrentStep(2);
      return;
    }

    // We always create a brand new parent record for each transaction so that its description/observation
    // is strictly bound to this unique entry/transaction and not shared with the client's past history.
    const parentId = `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newParent: CadMovDiario = {
      Id: parentId,
      Cliente: selectedClientId,
      Telefone: selectedClient.Telefone,
      Endereco: selectedClient.Endereco,
      Observacao: observacao,
      IdUsuarioDono: selectedClient.IdUsuarioDono,
    };
    onUpdateMovimentos([...movimentos, newParent]);

    setSavedParentId(parentId);

    // Initialize wizardRows sheet with one starting default row
    const clientPets = pets.filter((p) => p.IdCliente === selectedClientId && p.Ativo);
    let defaultPet = clientPets.length > 0 ? clientPets[0].Nome : "Vira-Latas";
    let defaultPetId = clientPets.length > 0 ? clientPets[0].Id : "";
    const defaultProd = produtos.find((p) => p.Ativo);
    let defaultProdId = defaultProd ? defaultProd.Id : "";
    let defaultPrice = defaultProd ? defaultProd.Preco : 0;

    if (prefilledRetornoToSchedule && prefilledRetornoToSchedule.IdCliente === selectedClientId) {
      const pObj = pets.find((pt) => pt.Id === prefilledRetornoToSchedule.IdPet);
      if (pObj) {
        defaultPet = pObj.Nome;
        defaultPetId = pObj.Id;
      }
      const prodObj = produtos.find((pr) => pr.Id === prefilledRetornoToSchedule.UltimoServico || pr.Nome === prefilledRetornoToSchedule.UltimoServico);
      if (prodObj) {
        defaultProdId = prodObj.Id;
        defaultPrice = prodObj.Preco;
      }
    }

    setWizardRows([
      {
        Id: `wz-det-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        Data: selectedDate,
        Hora: "09:00",
        NomePet: defaultPet,
        IdPet: defaultPetId,
        Servico: defaultProdId,
        Quantidade: 1,
        PrecoUnitario: defaultPrice,
        Tipo: "Entrada" as "Entrada" | "Saída",
        TotalDaLinha: defaultPrice,
      }
    ]);

    setDetailData(selectedDate);
    setCurrentStep(2); // Go to step 2 instantly 
  };

  // STEP 2 SUBMIT: Bulk Save the wizardRows datasheet to the database bindings
  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!savedParentId) return;
    if (wizardRows.length === 0) {
      showAlert("Atenção", "Insira pelo menos um serviço na folha de dados.");
      return;
    }

    // Map each wizard rows into standard CadDetMovDiario models
    const updatedChildren: CadDetMovDiario[] = wizardRows.map((row, idx) => {
      const basePrice = Number(row.PrecoUnitario || 0);
      const qty = Number(row.Quantidade || 1);
      const isSaida = row.Tipo === "Saída";
      const finalTotal = isSaida ? -Math.abs(basePrice * qty) : Math.abs(basePrice * qty);

      // Resolve IdPet safely if missing in original wizard row
      let resolvedIdPet = row.IdPet;
      if (!resolvedIdPet) {
        const clientPets = pets.filter((p) => p.IdCliente === selectedClientId && p.Ativo);
        const matched = clientPets.find((p) => p.Nome.trim().toLowerCase() === (row.NomePet || "").trim().toLowerCase());
        resolvedIdPet = matched ? matched.Id : (clientPets.find(p => p.Nome.trim().toLowerCase() === "geral")?.Id || "");
      }

      const hasRealId = row.Id && !row.Id.startsWith("wz-det-");

      return {
        Id: hasRealId ? row.Id : `det-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${idx}`,
        IdCadMovDiario: savedParentId,
        IdPet: resolvedIdPet,
        Data: row.Data || detailData || selectedDate,
        Hora: row.Hora || "09:00",
        NomePet: row.NomePet || "Vira-Latas",
        Quantidade: qty,
        Servico: row.Servico || "prod-default",
        PrecoUnitario: basePrice,
        Tipo: row.Tipo || "Entrada",
        TotalDaLinha: finalTotal,
        Realizado: hasRealId ? !!row.Realizado : false,
        Pago: hasRealId ? !!row.Pago : false,
        Ativo: true,
      };
    });

    if (isEditingWizard) {
      // Replace only the children of this specific parent (savedParentId)
      const otherChildren = detalhesMov.filter((d) => d.IdCadMovDiario !== savedParentId);
      onUpdateDetalhesMov([...otherChildren, ...updatedChildren]);

      // Also update the parent movement itself in case the client or observation was changed in Step 1
      const updatedMovimentos = movimentos.map((m) => {
        if (m.Id === savedParentId) {
          return {
            ...m,
            Cliente: selectedClientId,
            Observacao: observacao,
            Telefone: clientes.find((c) => c.Id === selectedClientId)?.Telefone || m.Telefone,
            Endereco: clientes.find((c) => c.Id === selectedClientId)?.Endereco || m.Endereco,
          };
        }
        return m;
      });
      onUpdateMovimentos(updatedMovimentos);
    } else {
      onUpdateDetalhesMov([...detalhesMov, ...updatedChildren]);
    }

    const targetRetorno = activeRetornoToMarkCompleted || prefilledRetornoToSchedule;
    if (targetRetorno && onUpdateControleRetornos) {
      const targetIds = Array.isArray(targetRetorno)
        ? targetRetorno.map((r) => r.Id)
        : [targetRetorno.Id];

      const updatedRetornos = (controleRetornos || []).map((ret) => {
        if (targetIds.includes(ret.Id)) {
          return { ...ret, Status: "Agendado" as "Pendente" | "Agendado" };
        }
        return ret;
      });
      onUpdateControleRetornos(updatedRetornos);
    }
    if (onClearPrefilledRetorno) {
      onClearPrefilledRetorno();
    }
    setActiveRetornoToMarkCompleted(null);
    
    // Reset and close
    setShowAddParentModal(false);
    setCurrentStep(1);
    setIsEditingWizard(false);
    setSavedParentId("");
    setSelectedClientId("");
    setObservacao("");
    setDetailHora("09:00");
    setDetailQuantidade(1);
    setDetailTipo("Entrada");
    setWizardRows([]);
    showAlert("Sucesso ✓", isEditingWizard ? "Movimento Diário atualizado com sucesso!" : "Novo registro adicionado com sucesso!");
  };

  // SAVE AND ADD ANOTHER SUBMIT: Inside datasheet wizard, "+ Um" acts as adding another row immediately to the datasheet for ease of use
  const handleSaveAndAddAnother = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    handleAddWizardRow();
  };

  // Open Wizard in Edit mode starting directly on Step 2 (Detalhes) for direct editing
  const handleOpenWizardEdit = (row: CadDetMovDiario) => {
    if (userPermissionLevel === 3) {
      showAlert("Acesso Restrito 🔒", "Nível de permissão 3 (Consulta e Pré-Venda) não autoriza edições.");
      return;
    }
    const parent = movimentos.find((m) => m.Id === row.IdCadMovDiario);
    if (!parent) {
      showAlert("Erro", "Movimento Pai correspondente não foi encontrado.");
      return;
    }

    // Prepopulate Step 1 Parent Information
    setSelectedClientId(parent.Cliente);
    const clientObj = clientes.find((c) => c.Id === parent.Cliente);
    setClientSearchQuery(clientObj ? clientObj.Nome : parent.Cliente);
    setObservacao(parent.Observacao || "");
    setSavedParentId(parent.Id);

    // Prepopulate Step 2 Child Rows with all details belonging to this parent movement
    const siblingDetails = detalhesMov.filter((d) => d.IdCadMovDiario === parent.Id && d.Ativo);
    setWizardRows(
      siblingDetails.map((d) => ({
        Id: d.Id,
        Data: d.Data,
        Hora: d.Hora,
        NomePet: d.NomePet,
        IdPet: d.IdPet,
        Servico: d.Servico,
        Quantidade: d.Quantidade,
        PrecoUnitario: d.PrecoUnitario,
        Tipo: d.Tipo || "Entrada",
        TotalDaLinha: d.TotalDaLinha,
        Realizado: d.Realizado,
        Pago: d.Pago,
      }))
    );

    setDetailData(row.Data || selectedDate);
    setIsEditingWizard(true);
    setCurrentStep(2); // REDIRECIONAMENTO DIRETO: Open directly on Step 2 as requested
    setShowAddParentModal(true);
  };

  // Row Action / Item Click: Show Edit Screen (Mostrar Tela de Edição) / Edit Record (Editar Registro)
  const handleOpenEditModal = (row: CadDetMovDiario) => {
    setEditRowId(row.Id);
    setEditRowData(row.Data);
    setEditRowHora(row.Hora);
    setEditRowIdPet(row.IdPet || "");
    setEditRowNomePet(row.NomePet || "");
    setEditRowServico(row.Servico);
    setEditRowTipo(row.Tipo || "Entrada");
    setEditRowQuantidade(row.Quantidade);
    setEditRowPrecoUnitario(row.PrecoUnitario);
    setEditRowRealizado(row.Realizado);
    setEditRowIdCadMovDiario(row.IdCadMovDiario);
    setShowEditModal(true);
  };

  const handleSaveEditRow = () => {
    if (userPermissionLevel === 3) {
      showAlert("Acesso Restrito 🔒", "Nível de permissão 3 (Consulta e Pré-Venda) não autoriza edições.");
      return;
    }
    const qty = Number(editRowQuantidade || 0);
    const price = Number(editRowPrecoUnitario || 0);
    const lineTotal = editRowTipo === "Saída" ? -(qty * price) : (qty * price);

    const updated = detalhesMov.map((det) => {
      if (det.Id === editRowId) {
        return {
          ...det,
          Data: editRowData,
          Hora: editRowHora,
          IdPet: editRowIdPet || undefined,
          NomePet: editRowNomePet,
          Servico: editRowServico,
          Tipo: editRowTipo,
          Quantidade: qty,
          PrecoUnitario: price,
          TotalDaLinha: lineTotal,
          Realizado: editRowRealizado,
        };
      }
      return det;
    });

    onUpdateDetalhesMov(updated);
    setShowEditModal(false);
    showAlert("Sucesso ✓", "Agendamento / Registro atualizado com sucesso!");
  };

  // 2. INLINE EDITS FOR CELL CHANGES
  const updateDetailCell = (id: string, field: keyof CadDetMovDiario, value: any) => {
    if (userPermissionLevel === 3) {
      showAlert("Acesso Restrito 🔒", "Nível de permissão 3 (Consulta e Pré-Venda) não autoriza agendamentos ou edições.");
      return;
    }
    if (field === "Pago") {
      showAlert(
        "Ação Bloqueada 🔒",
        "O status 'PAGO' da agenda só pode ser modificado de forma automática quando você finaliza e fatura a venda através do modal do PDV Centralizado (Caixa)."
      );
      return;
    }

    const updatedDetails = detalhesMov.map((det) => {
      if (det.Id !== id) return det;

      const updated = { ...det, [field]: value };

      // Dynamic Auto-fill checks
      if (field === "Servico") {
        // Resolve new price
        const prod = produtos.find((p) => p.Id === value);
        if (prod) {
          updated.PrecoUnitario = prod.Preco;
        }
      }

      // Recompute TotalDaLinha if quantity / price / product / Tipo changes
      if (field === "Servico" || field === "Quantidade" || field === "PrecoUnitario" || field === "Tipo") {
        const qty = Number(updated.Quantidade || 0);
        const price = Number(updated.PrecoUnitario || 0);
        // Apply positive/negative sign business logic rules on cell updates
        const activeType = updated.Tipo || "Entrada";
        const isSaida = activeType === "Saída";
        updated.TotalDaLinha = isSaida ? -Math.abs(price * qty) : Math.abs(price * qty);
      }

      return updated;
    });

    onUpdateDetalhesMov(updatedDetails);
  };

  // Remove scheduler item
  const handleDeleteItem = (id: string) => {
    if (userPermissionLevel === 3) {
      showAlert("Acesso Restrito 🔒", "Nível de permissão 3 (Consulta e Pré-Venda) não autoriza remoções de agendamentos.");
      return;
    }
    showConfirm(
      "Remover Agendamento",
      "Deseja realmente remover este agendamento do fluxo diário?",
      () => {
        const updated = detalhesMov.map((det) =>
          det.Id === id ? { ...det, Ativo: false } : det
        );
        onUpdateDetalhesMov(updated);
      }
    );
  };

  // Helper to add days to a YYYY-MM-DD date securely without local offset issues
  const addDaysToDate = (dateStr: string, days: number): string => {
    try {
      const [year, month, day] = dateStr.split("-").map(Number);
      if (!year || !month || !day) return dateStr;
      const date = new Date(year, month - 1, day);
      date.setDate(date.getDate() + days);
      
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    } catch (e) {
      return dateStr;
    }
  };

  const handleOpenPacoteModal = (row: CadDetMovDiario) => {
    setSelectedPacoteRow(row);
    setPacoteIntervalDays(7); // Default weekly (7 days)
    setPacoteQuantity(4);     // Default of 4 repetitions
    setShowPacoteModal(true);
  };

  const handleOpenWizardPacote = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!savedParentId) return;

    const basePrice = Number(detailPrecoUnitario);
    const qty = Number(detailQuantidade || 1);
    const isSaida = detailTipo === "Saída";
    const finalTotal = isSaida ? -Math.abs(basePrice * qty) : Math.abs(basePrice * qty);

    const clientPets = pets.filter((p) => p.IdCliente === selectedClientId && p.Ativo);
    const matched = clientPets.find((p) => p.Nome.trim().toLowerCase() === (detailPetName || "").trim().toLowerCase());
    const resolvedIdPet = matched ? matched.Id : (clientPets.find(p => p.Nome.trim().toLowerCase() === "geral")?.Id || "");

    const tempRow: CadDetMovDiario = {
      Id: "det-wizard-temp",
      IdCadMovDiario: savedParentId,
      IdPet: resolvedIdPet,
      Data: detailData || selectedDate,
      Hora: detailHora || "09:00",
      NomePet: detailPetName || "Vira-Latas",
      Quantidade: qty,
      Servico: detailProdutoId || "prod-default",
      PrecoUnitario: basePrice,
      Tipo: detailTipo,
      TotalDaLinha: finalTotal,
      Realizado: false,
      Pago: false,
      Ativo: true,
    };

    setSelectedPacoteRow(tempRow);
    setPacoteIntervalDays(7); // Default weekly
    setPacoteQuantity(4);     // Default 4
    setShowPacoteModal(true);
  };

  const handleGeneratePacote = () => {
    if (!selectedPacoteRow) return;

    const qty = parseInt(String(pacoteQuantity)) || 1;
    const interval = parseInt(String(pacoteIntervalDays)) || 7;

    if (qty < 1) {
      showAlert("Quantidade Inválida", "Defina pelo menos 1 repetição.");
      return;
    }
    if (interval < 1) {
      showAlert("Intervalo Inválido", "O intervalo em dias deve ser de pelo menos 1 dia.");
      return;
    }

    const newRecords: CadDetMovDiario[] = [];
    const baseDate = selectedPacoteRow.Data;

    for (let i = 1; i <= qty; i++) {
      const newDate = addDaysToDate(baseDate, interval * i);
      const uniqueId = `det-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-p${i}`;
      
      newRecords.push({
        Id: uniqueId,
        IdCadMovDiario: selectedPacoteRow.IdCadMovDiario,
        IdPet: selectedPacoteRow.IdPet,
        Data: newDate,
        Hora: selectedPacoteRow.Hora,
        NomePet: selectedPacoteRow.NomePet,
        Quantidade: selectedPacoteRow.Quantidade,
        Servico: selectedPacoteRow.Servico,
        PrecoUnitario: 0,
        Tipo: selectedPacoteRow.Tipo || "Entrada",
        TotalDaLinha: 0,
        Realizado: false,
        Pago: false,
        Ativo: true,
      });
    }

    if (selectedPacoteRow.Id === "det-wizard-temp") {
      const realBaseId = `det-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-base`;
      const baseRow: CadDetMovDiario = {
        ...selectedPacoteRow,
        Id: realBaseId,
      };

      // Ensure duplicates match base
      const updatedRepeats = newRecords.map(r => ({ ...r, IdCadMovDiario: baseRow.IdCadMovDiario }));

      onUpdateDetalhesMov([...detalhesMov, baseRow, ...updatedRepeats]);

      // Close and clear wizard state
      setShowAddParentModal(false);
      setCurrentStep(1);
      setSavedParentId("");
      setSelectedClientId("");
      setObservacao("");
      setDetailHora("09:00");
      setDetailQuantidade(1);
      setDetailTipo("Entrada");
    } else {
      onUpdateDetalhesMov([...detalhesMov, ...newRecords]);
    }

    setShowPacoteModal(false);
    setSelectedPacoteRow(null);
    showAlert(
      "Pacote Criado",
      selectedPacoteRow.Id === "det-wizard-temp"
        ? `Registro de origem salvo e ${qty} agendamentos nos dias seguintes adicionados com preço R$ 0,00!`
        : `${qty} novos registros adicionados com base no selecionado, com preço R$ 0,00!`
    );
  };

  const handleGenerateWizardAsPackage = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!savedParentId) return;
    if (wizardRows.length === 0) {
      showAlert("Atenção", "Insira pelo menos um serviço na folha de dados.");
      return;
    }

    const qty = parseInt(String(pacoteQuantity)) || 1;
    const interval = parseInt(String(pacoteIntervalDays)) || 7;

    if (qty < 1) {
      showAlert("Quantidade Inválida", "Defina pelo menos 1 repetição.");
      return;
    }
    if (interval < 1) {
      showAlert("Intervalo Inválido", "O intervalo em dias deve ser de pelo menos 1 dia.");
      return;
    }

    // Generate recurrent records based on each current row in wizardRows
    const recurrentRecords: any[] = [];
    wizardRows.forEach((baseRow, baseIdx) => {
      // Resolve IdPet safely if missing or map correctly
      let resolvedIdPet = baseRow.IdPet;
      let resolvedNomePet = baseRow.NomePet;
      if (!resolvedIdPet) {
        const clientPets = pets.filter((p) => p.IdCliente === selectedClientId && p.Ativo);
        const matched = clientPets.find((p) => p.Nome.trim().toLowerCase() === (baseRow.NomePet || "").trim().toLowerCase());
        resolvedIdPet = matched ? matched.Id : (clientPets.find(p => p.Nome.trim().toLowerCase() === "geral")?.Id || "");
        resolvedNomePet = matched ? matched.Nome : (clientPets.find(p => p.Nome.trim().toLowerCase() === "geral")?.Nome || baseRow.NomePet);
      }

      for (let i = 1; i <= qty; i++) {
        const futureDate = addDaysToDate(baseRow.Data || detailData || selectedDate, interval * i);
        const uniqueId = `wz-det-recur-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${baseIdx}-${i}`;
        
        recurrentRecords.push({
          Id: uniqueId,
          Data: futureDate,
          Hora: baseRow.Hora || "09:00",
          NomePet: resolvedNomePet || "Vira-Latas",
          IdPet: resolvedIdPet,
          Servico: baseRow.Servico || "prod-default",
          Quantidade: baseRow.Quantidade || 1,
          PrecoUnitario: 0,
          Tipo: baseRow.Tipo || "Entrada",
          TotalDaLinha: 0,
          Realizado: false,
          Pago: false,
        });
      }
    });

    showConfirm(
      "Confirmar Criação do Pacote",
      `Deseja gerar os agendamentos recorrentes? Isso adicionará ${recurrentRecords.length} novos registros à tabela de serviços abaixo com preço zerado (R$ 0,00). Eles serão gravados definitivamente quando você clicar no botão SALVAR do formulário.`,
      () => {
        // Appends the recurrent rows straight into the wizardRows editable state
        setWizardRows((prev) => [...prev, ...recurrentRecords]);
        showAlert("Sucesso ✓", `${recurrentRecords.length} agendamentos recorrentes foram inseridos na tabela de serviços! Clique em "SALVAR" ao finalizar.`);
      },
      () => {
        // Cancel: do nothing
      },
      "Confirmar",
      "Cancelar",
      `px-4.5 py-2 font-bold rounded-xl text-white shadow-xs transition cursor-pointer text-xs ${activeTheme.primary}`,
      "px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-150 text-rose-600 font-bold rounded-xl cursor-pointer transition-colors"
    );
  };

  const handleGenerateRecorrente = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!savedParentId) return;
    if (wizardRows.length === 0) {
      showAlert("Atenção", "Insira pelo menos um serviço na folha de dados.");
      return;
    }

    const interval = parseInt(String(pacoteIntervalDays)) || 14;
    if (interval < 1) {
      showAlert("Intervalo Inválido", "O intervalo em dias deve ser de pelo menos 1 dia.");
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const serviceDateStr = detailData || selectedDate || todayStr;
    const returnDateStr = addDaysToDate(serviceDateStr, interval);

    showConfirm(
      "Confirmar Retorno Recorrente",
      `Deseja registrar o agendamento de retorno recorrente? O atendimento será agendado para o dia ${serviceDateStr.split("-").reverse().join("/")} e um alerta de retorno sugerido será criado para o dia ${returnDateStr.split("-").reverse().join("/")} (daqui a ${interval} dias) para os pets/serviços selecionados.`,
      () => {
        if (onUpdateControleRetornos) {
          const newRetornos = [...controleRetornos];
          wizardRows.forEach((row, idx) => {
            let resolvedIdPet = row.IdPet;
            let resolvedNomePet = row.NomePet;
            if (!resolvedIdPet) {
              const clientPets = pets.filter((p) => p.IdCliente === selectedClientId && p.Ativo);
              const matched = clientPets.find((p) => p.Nome.trim().toLowerCase() === (row.NomePet || "").trim().toLowerCase());
              resolvedIdPet = matched ? matched.Id : (clientPets.find(p => p.Nome.trim().toLowerCase() === "geral")?.Id || "");
              resolvedNomePet = matched ? matched.Nome : (clientPets.find(p => p.Nome.trim().toLowerCase() === "geral")?.Nome || row.NomePet);
            }

            const clientObj = clientes.find((c) => c.Id === selectedClientId);
            const prodObj = produtos.find((p) => p.Id === row.Servico);
            const nomeServico = prodObj ? prodObj.Nome : row.Servico;

            newRetornos.push({
              Id: `retorno-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${idx}`,
              IdCliente: selectedClientId,
              NomeCliente: clientObj ? clientObj.Nome : selectedClientId,
              IdPet: resolvedIdPet || "",
              NomePet: resolvedNomePet || "Pet",
              UltimoServico: row.Servico || "prod-default",
              NomeServico: nomeServico || "Serviço",
              DataSugerida: returnDateStr,
              DataRegistro: todayStr,
              Status: "Pendente",
              IdUsuarioDono: currentUserOwnerId,
            });
          });
          onUpdateControleRetornos(newRetornos);
        }

        const mockEvent = { preventDefault: () => {} } as React.FormEvent;
        handleStep2Submit(mockEvent);

        showAlert("Sucesso ✓", `Retorno recorrente agendado para o dia ${returnDateStr.split("-").reverse().join("/")} e atendimento salvo normalmente!`);
      },
      () => {},
      "Confirmar",
      "Cancelar",
      `px-4.5 py-2 font-bold rounded-xl text-white shadow-xs transition cursor-pointer text-xs ${activeTheme.primary}`,
      "px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-150 text-rose-600 font-bold rounded-xl cursor-pointer transition-colors"
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Title & Date Picker Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white p-5 rounded-2xl border border-slate-200 gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-md bg-emerald-50 text-emerald-700">
              <Calendar className="h-4 w-4" />
            </span>
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 font-mono">
              Agenda do Estabelecimento
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-800">
            Movimento Diário (Agenda)
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end gap-3.5">
          
          {/* Bloco de Controle de Datas (Botões sempre diretamente acima dos inputs De/Até) */}
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            {/* Botões de Navegação Rápida para Datas */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl select-none justify-between">
              <button
                type="button"
                onClick={() => handleNavigateDate(-1)}
                className="flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg hover:text-slate-900 transition-all cursor-pointer active:scale-95 shadow-3xs flex items-center justify-center gap-1"
                title="Data Anterior"
              >
                <ChevronLeft className="h-3 w-3 text-slate-500" />
                <span>Anterior</span>
              </button>
              <button
                type="button"
                onClick={() => handleNavigateDate(0)}
                className="flex-1 sm:flex-none px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg hover:text-slate-900 transition-all cursor-pointer active:scale-95 shadow-3xs font-mono text-center"
                title="Voltar para Hoje"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => handleNavigateDate(1)}
                className="flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg hover:text-slate-900 transition-all cursor-pointer active:scale-95 shadow-3xs flex items-center justify-center gap-1"
                title="Próxima Data"
              >
                <span>Próxima</span>
                <ChevronRight className="h-3 w-3 text-slate-500" />
              </button>
            </div>

            {/* Inputs De / Até */}
            <div className="flex items-center justify-between sm:justify-start gap-2.5 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">De</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    const newVal = e.target.value;
                    setSelectedDate(newVal);
                    setSelectedEndDate(newVal);
                  }}
                  className="bg-transparent font-semibold font-mono text-xs text-slate-700 outline-none p-0 cursor-pointer focus:text-slate-900 focus:font-bold"
                />
              </div>
              <span className="h-3.5 w-[1px] bg-slate-300"></span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Até</span>
                <input
                  type="date"
                  value={selectedEndDate}
                  onChange={(e) => {
                    const newVal = e.target.value;
                    if (newVal < selectedDate) {
                      showAlert?.("Data Inválida", "A data final não pode ser menor que a data inicial.");
                      setSelectedEndDate(selectedDate);
                    } else {
                      setSelectedEndDate(newVal);
                    }
                  }}
                  className="bg-transparent font-semibold font-mono text-xs text-slate-700 outline-none p-0 cursor-pointer focus:text-slate-900 focus:font-bold"
                />
              </div>
            </div>
          </div>

          {!isRestricted && (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:self-end">
              <button
                type="button"
                disabled={userPermissionLevel === 3}
                onClick={() => {
                  if (userPermissionLevel === 3) {
                    showAlert?.("Acesso Restrito 🔒", "Nível de permissão 3 (Consulta e Pré-Venda) não autoriza novos agendamentos no movimento diário.");
                    return;
                  }
                  setShowAddParentModal(true);
                }}
                className={`inline-flex items-center justify-center gap-1.5 px-4 h-[38px] rounded-xl text-xs font-semibold ease-in-out transition-all transform active:scale-95 w-full sm:w-auto ${
                  userPermissionLevel === 3
                    ? "bg-slate-300 text-slate-500 opacity-60 cursor-not-allowed border border-slate-400"
                    : `shadow-xs hover:shadow cursor-pointer ${activeTheme.primary}`
                }`}
                title={userPermissionLevel === 3 ? "Acesso Restrito: Nível 3 não pode criar novos agendamentos." : "Novo Agendamento"}
              >
                <Plus className="h-4 w-4" />
                Novo Agendamento
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Summary Widget Panel */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Agendamentos */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-2xs hover:shadow-xs transition duration-300">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-600">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-mono font-medium text-slate-400 uppercase tracking-wide">
              Agendamentos
            </div>
            <div className="text-xl font-bold font-display text-slate-800">
              {stats.totalScheduled}
            </div>
          </div>
        </div>

        {/* Faturamento Estimado */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-2xs hover:shadow-xs transition duration-300">
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-mono font-medium text-slate-400 uppercase tracking-wide">
              Faturamento Previsto
            </div>
            <div className="text-xl font-bold font-display text-slate-800">
              R$ {stats.totalRevenue.toFixed(2)}
            </div>
            {stats.totalExpenses > 0 ? (
              <div className="text-[10px] text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded-md mt-1 w-fit">
                Despesas do Dia: R$ {stats.totalExpenses.toFixed(2)}
              </div>
            ) : (
              <div className="text-[10px] text-slate-400 font-medium mt-1">
                Sem despesas registradas
              </div>
            )}
          </div>
        </div>

        {/* Concluídos */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-2xs hover:shadow-xs transition duration-300">
          <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-100 text-sky-600">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-mono font-medium text-slate-400 uppercase tracking-wide">
              Realizados
            </div>
            <div className="text-xl font-bold font-display text-slate-800">
              {stats.completedCount} <span className="text-xs text-slate-400 font-normal">/ {stats.totalScheduled}</span>
            </div>
          </div>
        </div>

        {/* Pagos */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-2xs hover:shadow-xs transition duration-300">
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100 text-amber-600">
            <Check className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-mono font-medium text-slate-400 uppercase tracking-wide">
              Pagamentos Confirmados
            </div>
            <div className="text-xl font-bold font-display text-slate-800 font-sans">
              {stats.paidCount} <span className="text-xs text-slate-400 font-normal">/ {stats.totalScheduled}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Filter bar search */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 max-w-2xl">
            <div className="relative flex-1 max-w-sm">
              <input
                type="text"
                placeholder="Pesquisar por Cliente, Pet ou Serviço..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-600"
              />
            </div>

            {/* Sorting controls directly in filter bar */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-xl shadow-2xs shrink-0 select-none">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Tipo A-z (Filtro):</span>
              <select
                value={sortField ? `${sortField}-${sortOrder}` : "default"}
                onChange={(e) => {
                  if (e.target.value === "default") {
                    setSortField("");
                  } else {
                    const [field, order] = e.target.value.split("-");
                    setSortField(field as any);
                    setSortOrder(order as any);
                  }
                }}
                className="bg-transparent text-[11px] text-slate-700 font-semibold outline-none py-0.5 cursor-pointer font-mono"
              >
                <option value="default">Ordem Padrão (Sem Classificação)</option>
                <option value="Data-asc">⏱ Data (Tipo A-z - Antigos Primeiro)</option>
                <option value="Data-desc">⏱ Data (Z-a - Novos Primeiro)</option>
                <option value="Hora-asc">⏰ Hora (Tipo A-z - Menor para Maior)</option>
                <option value="Hora-desc">⏰ Hora (Z-a - Maior para Menor)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-mono shrink-0">
            {/* Mark/Unmark toggle option for the selected items - ADMIN ONLY */}
            {currentUser?.Permissoes === "Administrador" && (
              <button
                type="button"
                onClick={handleToggleAllPagoSelected}
                className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 font-bold rounded-xl text-xs shadow-3xs transition cursor-pointer select-none active:scale-95"
                title="Marcar ou Desmarcar pago para todos os itens da seleção atual"
              >
                <CheckSquare className="h-3.5 w-3.5 shrink-0" />
                <span>Marcar/Desmarcar Pago (Selecionados)</span>
              </button>
            )}

            <span className="text-slate-400 text-[11px]">
              {selectedDateDetRows.length} linha(s) encontrada(s)
            </span>
          </div>
        </div>

        {/* Spreadsheet Data Sheet layout */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse table-fixed min-w-[950px]">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-mono text-[9.5px] uppercase font-semibold">
                {/* DATE CELL (SORTABLE) */}
                <th
                  onClick={() => {
                    if (sortField === "Data") {
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    } else {
                      setSortField("Data");
                      setSortOrder("asc");
                    }
                  }}
                  className="w-[90px] px-1 py-1.5 text-center border-r border-slate-200 cursor-pointer hover:bg-slate-200/40 hover:text-slate-900 transition-colors select-none"
                  title="Clique para ordenar por Data A-z"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span>Data</span>
                    {sortField === "Data" ? (
                      <span className="text-emerald-600 font-bold text-[10px] font-sans">
                        {sortOrder === "asc" ? "▲" : "▼"}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-[8px]">⇅</span>
                    )}
                  </div>
                </th>

                {/* HOUR CELL (SORTABLE) */}
                <th
                  onClick={() => {
                    if (sortField === "Hora") {
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    } else {
                      setSortField("Hora");
                      setSortOrder("asc");
                    }
                  }}
                  className="w-[75px] px-1 py-1.5 text-center border-r border-slate-200 cursor-pointer hover:bg-slate-200/40 hover:text-slate-900 transition-colors select-none"
                  title="Clique para ordenar por Hora A-z"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span>Hora</span>
                    {sortField === "Hora" ? (
                      <span className="text-emerald-600 font-bold text-[10px] font-sans">
                        {sortOrder === "asc" ? "▲" : "▼"}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-[8px]">⇅</span>
                    )}
                  </div>
                </th>
                <th className="w-[140px] px-1.5 py-1.5 border-r border-slate-200">Cliente</th>
                <th className="w-[100px] px-1.5 py-1.5 border-r border-slate-200">Pet</th>
                <th className="w-[150px] px-1.5 py-1.5 border-r border-slate-200">Serviço / Produto</th>
                <th className="w-[85px] px-1 py-1.5 border-r border-slate-200">Tipo (E/S)</th>
                <th className="w-[50px] px-0.5 py-1.5 text-center border-r border-slate-200">Quant.</th>
                <th className="w-[80px] px-1 py-1.5 border-r border-slate-200">Preço Unit.</th>
                <th className="w-[85px] px-1.5 py-1.5 text-right border-r border-slate-200">Total</th>
                <th className="w-[45px] px-0.5 py-1.5 text-center border-r border-slate-200">Feito</th>

                {/* PAGO COLUMN WITH DIRECT MARK/UNMARK BUTTON */}
                <th className="w-[60px] px-0.5 py-1 text-center border-r border-slate-200 select-none">
                  <div className="flex flex-col items-center justify-center gap-0.5">
                    <span className="text-[9.5px] uppercase font-bold text-slate-600">Pago</span>
                    <button
                      type="button"
                      onClick={handleToggleAllPagoSelected}
                      className="text-[7.5px] bg-slate-50 hover:bg-amber-50 text-slate-500 hover:text-amber-700 border border-slate-200 hover:border-amber-250 px-1 py-0.2 rounded transition font-mono font-bold block cursor-pointer"
                      title="Marcar/Desmarcar status de pago para todos os itens exibidos"
                    >
                      M/D
                    </button>
                  </div>
                </th>
                <th className="w-[95px] px-1 py-1.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-mono">
              {selectedDateDetRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400 bg-white">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="h-8 w-8 text-slate-300" />
                      <p className="text-xs font-semibold text-slate-500">Nenhum agendamento ativo para este período.</p>
                      <p className="text-[11px] text-slate-400 max-w-sm">Você pode clicar em "Novo Agendamento" acima para cadastrar clientes e pets no movimento diário.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                selectedDateDetRows.map((row, idx) => {
                  // Find parents movement details
                  const parent = userMovimentosMap.get(row.IdCadMovDiario);
                  const clientObj = parent ? userClientsMap.get(parent.Cliente) : undefined;
                  const clientName = clientObj ? clientObj.Nome : (parent ? parent.Cliente : "Cliente Inválido/Excluído");

                  // Filter pets owned by this parent's client
                  const clientPets = parent ? pets.filter((p) => p.IdCliente === parent.Cliente && p.Ativo) : [];

                  return (
                    <tr
                      key={row.Id}
                      className={`hover:bg-slate-50/80 transition-colors group ${
                        idx % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                      }`}
                    >
                      {/* DATE CELL */}
                      <td className="p-0.5 border-r border-slate-100 font-semibold text-center text-slate-600 focus-within:ring-2 focus-within:ring-emerald-500/50">
                        <input
                          type="date"
                          value={row.Data}
                          onChange={(e) => updateDetailCell(row.Id, "Data", e.target.value)}
                          className="w-full text-center bg-transparent border-0 px-0.5 py-1 focus:outline-none text-[11px] text-slate-850 font-semibold"
                        />
                      </td>

                      {/* HOUR CELL */}
                      <td className="p-0.5 border-r border-slate-100 font-semibold text-center text-slate-600 focus-within:ring-2 focus-within:ring-emerald-500/50">
                        <input
                          type="time"
                          value={row.Hora}
                          onChange={(e) => updateDetailCell(row.Id, "Hora", e.target.value)}
                          className="w-full text-center bg-transparent border-0 px-0.5 py-1 focus:outline-none text-[11px] font-semibold text-slate-800"
                        />
                      </td>

                      {/* CLIENT VALUE (READ-ONLY IN LINE FOR THE DET, RESOLVED FROM PARENT) */}
                      <td className="px-1.5 py-1 border-r border-slate-100 truncate text-slate-800" title={`${clientName}${parent?.Telefone ? ` • Tel: ${parent.Telefone}` : ""}`}>
                        <div className="font-semibold text-[11.5px] text-slate-800 truncate leading-tight">{clientName}</div>
                        {parent?.Telefone && (
                          <div className="text-[8.5px] text-slate-400 truncate leading-none mt-0.5" title={parent?.Endereco}>
                            Tel: {parent.Telefone}
                          </div>
                        )}
                      </td>

                      {/* PET SELECTION CELL */}
                      <td className="p-0.5 border-r border-slate-100">
                        <select
                          value={row.IdPet || ""}
                          disabled={isRestricted || row.Pago}
                          onChange={(e) => {
                            const petId = e.target.value;
                            const petObj = clientPets.find((p) => p.Id === petId);
                            if (petObj) {
                              const updatedDetails = detalhesMov.map((det) => {
                                if (det.Id === row.Id) {
                                  return { ...det, IdPet: petId, NomePet: petObj.Nome };
                                }
                                return det;
                              });
                              onUpdateDetalhesMov(updatedDetails);
                            }
                          }}
                          className={`w-full bg-transparent border-0 p-0.5 focus:outline-none text-[11px] text-slate-880 font-mono truncate ${isRestricted || row.Pago ? "opacity-70 cursor-not-allowed" : ""}`}
                          title={row.NomePet}
                        >
                          {clientPets.length === 0 ? (
                            <option value="">{row.NomePet} (Não cad.)</option>
                          ) : (
                            clientPets.map((p) => (
                              <option key={p.Id} value={p.Id}>
                                {p.Nome} ({p.Especie})
                              </option>
                            ))
                          )}
                        </select>
                      </td>

                      {/* SERVICE SELECTION CELL */}
                      <td className="p-0.5 border-r border-slate-100">
                        <div className="flex flex-col min-w-0">
                          <select
                            value={row.Servico}
                            onChange={(e) => updateDetailCell(row.Id, "Servico", e.target.value)}
                            className="w-full bg-transparent border-0 p-0.5 focus:outline-none text-[11px] text-slate-800 font-mono truncate"
                            title={produtos.find((p) => p.Id === row.Servico)?.Nome || row.Servico}
                          >
                            {[...produtos].filter(p => p.Ativo && ["Banho", "Tosa", "Combo", "Estética", "Tratamento", "Outro"].includes(p.Tipo)).sort((a, b) => a.Nome.localeCompare(b.Nome, "pt", { sensitivity: "base" })).map((p) => (
                              <option key={p.Id} value={p.Id}>
                                {p.Nome} [{p.Tipo}]
                              </option>
                            ))}
                          </select>
                          {parent?.Observacao?.trim() && (
                            <div className="text-[9.5px] text-slate-500 italic px-1 font-sans truncate leading-tight mt-0.5" title={parent.Observacao}>
                              {parent.Observacao}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* TIPO (ENTRADA / SAÍDA) CELL */}
                      <td className="p-0.5 border-r border-slate-100">
                        <select
                          value={row.Tipo || "Entrada"}
                          disabled={isRestricted || row.Pago}
                          onChange={(e) => updateDetailCell(row.Id, "Tipo", e.target.value as "Entrada" | "Saída")}
                          className={`w-full bg-transparent border-0 p-0.5 focus:outline-none text-[10.5px] font-mono font-semibold ${isRestricted || row.Pago ? "opacity-70 cursor-not-allowed" : ""} ${
                            (row.Tipo || "Entrada") === "Saída" ? "text-rose-600 bg-rose-50/10" : "text-emerald-600 bg-emerald-50/10"
                          }`}
                        >
                          <option value="Entrada">📥 Entrada</option>
                          <option value="Saída">📤 Saída</option>
                        </select>
                      </td>

                      {/* QUANTITY */}
                      <td className="p-0.5 border-r border-slate-100 text-center">
                        <input
                          type="number"
                          min="1"
                          value={row.Quantidade}
                          onChange={(e) => updateDetailCell(row.Id, "Quantidade", parseInt(e.target.value) || 1)}
                          className="w-full text-center bg-transparent border-0 p-0.5 focus:outline-none text-[11px] text-slate-850 font-bold"
                        />
                      </td>

                      {/* UNIT PRICE CELL */}
                      <td className="p-0.5 border-r border-slate-100">
                        <div className="flex items-center gap-0.5 pl-0.5 bg-transparent">
                          <span className="text-[9px] text-slate-400 font-mono">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={row.PrecoUnitario}
                            onChange={(e) => updateDetailCell(row.Id, "PrecoUnitario", parseFloat(e.target.value) || 0)}
                            className="w-full bg-transparent border-0 p-0.5 focus:outline-none text-[11px] text-slate-850 font-mono"
                          />
                        </div>
                      </td>

                      {/* TOTAL DA LINHA (CALCULATED COGNIZANT OF SIGN) */}
                      <td className={`px-1.5 py-1 border-r border-slate-100 font-semibold text-[11px] font-mono text-right ${
                        row.TotalDaLinha < 0 ? "text-rose-700 bg-rose-50/20" : "text-emerald-700 bg-emerald-50/20"
                      }`}>
                        R$ {row.TotalDaLinha.toFixed(2)}
                      </td>

                      {/* IS REALIZED CHECKBOX */}
                      <td className="p-0.5 border-r border-slate-100 text-center">
                        <button
                          type="button"
                          disabled={isRestricted}
                          onClick={() => updateDetailCell(row.Id, "Realizado", !row.Realizado)}
                          className={`inline-flex items-center justify-center p-1 rounded-md transition ${isRestricted ? "opacity-40 cursor-not-allowed" : "hover:bg-slate-100"}`}
                        >
                          {row.Realizado ? (
                            <CheckSquare className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-350" />
                          )}
                        </button>
                      </td>

                      {/* IS PAID CHECKBOX */}
                      <td className="p-0.5 border-r border-slate-100 text-center">
                        <div
                          className="inline-flex items-center justify-center p-1 rounded-md select-none text-slate-400"
                          title="Status Financeiro: Apenas Leitura. Faturamento deve ser feito pelo PDV Centralizado."
                        >
                          {row.Pago ? (
                            <CheckSquare className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-300" />
                          )}
                        </div>
                      </td>

                      {/* ACTIONS */}
                      <td className="p-0.5 text-center align-middle">
                        <div className="flex items-center justify-center gap-1">
                          {!isRestricted && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenWizardEdit(row)}
                                className="text-slate-400 hover:text-indigo-650 p-1 hover:bg-indigo-50 rounded-md transition cursor-pointer"
                                title="Editar Lançamento (Atalho)"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenRowRecorrenteModal(row, parent, clientName)}
                                className="text-emerald-600 hover:text-emerald-700 p-1 hover:bg-emerald-50 rounded-md transition cursor-pointer"
                                title="Programar Alerta de Retorno Recorrente (Atalho)"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                          {row.Pago ? (
                            <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-150 px-1.5 py-0.5 rounded font-sans font-extrabold whitespace-nowrap">
                              Faturado
                            </span>
                          ) : !isRestricted ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(row.Id)}
                              className="text-slate-400 hover:text-red-500 p-1 hover:bg-red-50 rounded-md transition cursor-pointer"
                              title="Remover Item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <span className="text-[9px] text-slate-400 font-sans italic">Bloqueado</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info banner */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-500 font-mono">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
            Tabela de Movimento Diário. Edição direta liberada para Data, Hora, Serviço/Produto, Quantidade e Preço Unitário.
          </div>
          <div>
            Total diário faturado: <span className="font-bold text-emerald-700">R$ {stats.totalRevenue.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Modal - Faturamento Centralizado (PDV) */}
      {(() => {
        if (true) return null; // Modal de faturamento agora é tela cheia independente no CaixaSheet

        const totalValueItems = pdvCart.reduce((sum, item) => {
          const isSaida = item.tipo === "Saída";
          const val = item.quantity * item.price;
          return sum + (isSaida ? -val : val);
        }, 0);
        const valPix = Number(pagamentoPix) || 0;
        const valDebito = Number(pagamentoDebito) || 0;
        const valCredito = Number(pagamentoCredito) || 0;
        const valDinheiro = Number(pagamentoDinheiro) || 0;
        const valFiado = Number(pagamentoFiado) || 0;

        const somaLancada = valPix + valDebito + valCredito + valDinheiro + valFiado;
        const restante = totalValueItems - somaLancada;
        const isAnonymous = !pdvClientId;

        // scenario calculations
        const targetClient = pdvClientId ? clientes.find(c => c.Id === pdvClientId) : null;
        const limit = targetClient ? (targetClient.LimiteCredito !== undefined ? targetClient.LimiteCredito : 0) : 0;
        const currentDebito = targetClient ? (Number(targetClient.SaldoDevedor) || 0) : 0;

        // Restante para o Fiado launched automatically
        const autoFiadoOffset = (!isAnonymous && restante > 0) ? restante : 0;
        const finalFiadoToLaunch = valFiado + autoFiadoOffset;
        const limitExceeded = !isAnonymous && limit > 0 && (currentDebito + finalFiadoToLaunch > limit);

        // Validation for finalizer button
        let isReadyToPay = false;
        let errorMessage = "";

        if (pdvCart.length === 0) {
          isReadyToPay = false;
          errorMessage = "Adicione itens ao carrinho para faturar.";
        } else if (isAnonymous) {
          if (valFiado > 0) {
            isReadyToPay = false;
            errorMessage = "Venda no Fiado bloqueada para Cliente Consumidor (Sem cadastro).";
          } else if (Math.abs(somaLancada - totalValueItems) >= 0.015) {
            isReadyToPay = false;
            errorMessage = `Para Cliente Consumidor, o valor deve ser pago integralmente. Falta: R$ ${restante.toFixed(2)}`;
          } else {
            isReadyToPay = true;
          }
        } else {
          // Has cadastro client
          if (somaLancada > totalValueItems + 0.015) {
            isReadyToPay = false;
            errorMessage = `Soma lançada excede o total dos itens por R$ ${Math.abs(restante).toFixed(2)}`;
          } else if (limitExceeded) {
            isReadyToPay = false;
            errorMessage = "Limite de Crédito Fiado do cliente excedido!";
          } else {
            isReadyToPay = true;
          }
        }

        return (
          <div id="pdv-faturamento-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all flex flex-col max-h-[80vh] font-sans">
              
              {/* Modal Header */}
              <div className="px-6 py-4 text-white flex items-center justify-between bg-emerald-700 shadow-sm shrink-0">
                <div>
                  <h3 className="font-bold font-display tracking-tight text-base flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-emerald-200" />
                    PDV Centralizado — Faturamento Integrado
                  </h3>
                  <p className="text-[10px] opacity-90 font-mono">
                    Terminal de Caixa Comercial • Vendas rápidas, serviços de agenda e importação móvel
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowFaturamentoModal(false);
                    setSelectedDetId("");
                    setSelectedPreId("");
                    setPdvCart([]);
                    setPdvClientId("");
                    setPdvClientSearch("");
                    setPdvProductSearch("");
                    setPagamentoPix("");
                    setPagamentoDebito("");
                    setPagamentoCredito("");
                    setPagamentoDinheiro("");
                    setPagamentoFiado("");
                  }}
                  className="text-white hover:text-slate-100 text-sm font-semibold p-1 hover:bg-white/10 rounded-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Modal Dynamic Two-column Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-5 overflow-y-auto lg:overflow-hidden flex-1 text-slate-700 text-xs min-h-0 bg-slate-50/30">
                
                {/* LEFT COLUMN: Data integration & Cart (7 cols) */}
                <div className="lg:col-span-7 flex flex-col gap-4 overflow-y-auto lg:overflow-y-auto max-h-[75vh] pr-1.5 custom-scrollbar">
                  
                  {/* Select Customer (Optional for Balcão) */}
                  <div className="bg-white border border-slate-150 p-3.5 rounded-2xl shadow-xs space-y-2">
                    <div className="flex justify-between items-center bg-slate-50 -m-3.5 mb-2 px-3.5 py-1.5 border-b border-slate-100 rounded-t-2xl">
                      <span className="text-[10px] font-black font-mono tracking-wider text-slate-400 uppercase">
                        1. Selecionar Cliente Comprador:
                      </span>
                      {pdvClientId && (
                        <button 
                          type="button" 
                          onClick={() => {
                            setPdvClientId("");
                            setPdvClientSearch("");
                          }}
                          className="text-[10px] text-rose-600 hover:underline font-bold cursor-pointer"
                        >
                          Modificar para Cliente Consumidor Geral ✕
                        </button>
                      )}
                    </div>
                    
                    {pdvClientId ? (
                      (() => {
                        const cl = clientes.find(c => c.Id === pdvClientId);
                        if (!cl) return <p className="text-xs text-rose-500 font-bold">Cliente não localizado em cadastro</p>;
                        const lim = Number(cl.LimiteCredito) || 0;
                        const deb = Number(cl.SaldoDevedor) || 0;
                        return (
                          <div className="bg-indigo-50/50 border border-indigo-150 p-2.5 rounded-xl flex items-center justify-between">
                            <div className="space-y-0.5">
                              <p className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5 text-indigo-600" />
                                {cl.Nome}
                              </p>
                              <p className="text-[10px] text-slate-500 font-mono">
                                CPF/CNPJ: {cl.CpfCnpj || "N/D"} • Fone: {cl.Telefone || "N/D"}
                              </p>
                            </div>
                            <div className="text-right font-mono text-[10px] space-y-0.5">
                              <span className="block text-slate-600">Saldo Devedor: <strong className="text-rose-600">R$ {deb.toFixed(2)}</strong></span>
                              <span className="block text-slate-600">Limite Total: <strong className="text-emerald-700">{lim > 0 ? `R$ ${lim.toFixed(2)}` : "Sem limite de crédito"}</strong></span>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-2 text-slate-400 h-3.5 w-3.5" />
                          <input
                            type="text"
                            placeholder="Pesquisar por Nome do Cliente cadastrado..."
                            value={pdvClientSearch}
                            onChange={(e) => setPdvClientSearch(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 focus:outline-none rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 transition focus:border-emerald-600 focus:bg-white"
                          />
                        </div>
                        {pdvClientSearch && (
                          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-36 overflow-y-auto shadow-md custom-scrollbar">
                            {clientes
                              .filter(c => c.Nome.toLowerCase().includes(pdvClientSearch.toLowerCase()) || (c.CpfCnpj && c.CpfCnpj.includes(pdvClientSearch)))
                              .map(c => (
                                <button
                                  type="button"
                                  key={c.Id}
                                  onClick={() => {
                                    setPdvClientId(c.Id);
                                    setPdvClientSearch("");
                                  }}
                                  className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 transition text-xs flex items-center justify-between cursor-pointer"
                                >
                                  <span className="font-semibold text-slate-700">{c.Nome}</span>
                                  <span className="text-[10px] font-mono text-indigo-600 hover:underline">Selecionar →</span>
                                </button>
                              ))}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 p-2 bg-amber-50/55 border border-amber-100 rounded-xl text-amber-900 text-[10px]">
                          <span>👤</span>
                          <span className="font-semibold font-mono">Modo Venda Rápida sem Cadastro (Cliente Consumidor de Balcão)</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sources of sale (Daily Movement & Pre-Orders & Direct Add Catalog) */}
                  <div className="bg-white border border-slate-150 p-3.5 rounded-2xl shadow-xs space-y-3">
                    <span className="text-[10px] font-black font-mono tracking-wider text-slate-400 block uppercase">
                      2. Importar Itens e Vínculos de Caixa:
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Sub-A: Agenda */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono">🐾 Atendimentos (Agenda):</label>
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2 h-3 w-3 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Buscar agenda..."
                            value={faturamentoServiceSearch}
                            onChange={(e) => setFaturamentoServiceSearch(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 focus:outline-none rounded-lg pl-7 pr-2 py-1 text-[11px] text-slate-800 transition focus:border-emerald-600 focus:bg-white"
                          />
                        </div>
                        {faturamentoServiceSearch && (
                          <div className="absolute z-10 bg-white border border-slate-200 rounded-lg max-h-44 overflow-y-auto shadow-xl divide-y divide-slate-100 w-64 custom-scrollbar">
                            {groupedAtendimentos
                              .filter(g => {
                                const q = faturamentoServiceSearch.toLowerCase();
                                return g.clientName.toLowerCase().includes(q) || g.petNamesList.toLowerCase().includes(q) || g.services.toLowerCase().includes(q);
                              })
                              .map(g => (
                                <button
                                  type="button"
                                  key={g.parentId}
                                  onClick={() => {
                                    loadAppointmentToCart(g);
                                    setFaturamentoServiceSearch("");
                                  }}
                                  className="w-full text-left p-2 hover:bg-slate-50 transition text-[10px] space-y-0.5 block cursor-pointer"
                                >
                                  <p className="font-bold text-slate-800 truncate">{g.clientName} ({g.petNamesList})</p>
                                  <p className="text-slate-500 font-mono truncate">{g.services}</p>
                                  <div className="flex justify-between items-center text-[9px] pt-0.5">
                                    <span className="text-emerald-700 font-bold">R$ {g.totalValue.toFixed(2)}</span>
                                    <span className="text-indigo-600 font-bold font-mono">Iniciar Caixa →</span>
                                  </div>
                                </button>
                              ))}
                            {groupedAtendimentos.filter(g => {
                              const q = faturamentoServiceSearch.toLowerCase();
                              return g.clientName.toLowerCase().includes(q) || g.petNamesList.toLowerCase().includes(q) || g.services.toLowerCase().includes(q);
                            }).length === 0 && (
                              <div className="p-2 text-center text-slate-450 font-mono text-[10px]">Nenhum agendamento pendente.</div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Sub-B: Pre-Orders */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono">📦 Pré-Pedidos de Celular:</label>
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2 h-3 w-3 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Buscar pré-pedido..."
                            value={faturamentoPreSearch}
                            onChange={(e) => setFaturamentoPreSearch(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 focus:outline-none rounded-lg pl-7 pr-2 py-1 text-[11px] text-slate-800 transition focus:border-emerald-600 focus:bg-white"
                          />
                        </div>
                        {faturamentoPreSearch && (
                          <div className="absolute z-10 bg-white border border-slate-200 rounded-lg max-h-44 overflow-y-auto shadow-xl divide-y divide-slate-100 w-64 custom-scrollbar">
                            {prePedidos
                              .filter(pre => !pre.Status || pre.Status.toLowerCase() === "pendente")
                              .filter(pre => {
                                const q = faturamentoPreSearch.toLowerCase();
                                return (pre.NomeCliente?.toLowerCase().includes(q)) || pre.Id.toLowerCase().includes(q);
                              })
                              .map(pre => {
                                const items = prePedidoItens.filter(i => i.IdPrePedido === pre.Id);
                                const total = items.reduce((sum, item) => sum + (Number(item.Quantidade || 1) * Number(item.ValorUnitario || item.PrecoUnitario || 0)), 0);
                                return (
                                  <button
                                    type="button"
                                    key={pre.Id}
                                    onClick={() => {
                                      importPrePedido(pre.Id);
                                      setFaturamentoPreSearch("");
                                    }}
                                    className="w-full text-left p-2 hover:bg-slate-50 transition text-[10px] space-y-0.5 block cursor-pointer"
                                  >
                                    <p className="font-bold text-slate-800 truncate">{pre.NomeCliente || "Consumidor Geral"}</p>
                                    <p className="text-slate-500 font-mono text-[8px]">#{pre.Id.slice(-6).toUpperCase()} • {pre.Data}</p>
                                    <div className="flex justify-between items-center text-[9px] pt-0.5">
                                      <span className="text-emerald-700 font-bold">R$ {total.toFixed(2)}</span>
                                      <span className="text-amber-600 font-bold font-mono">Importar →</span>
                                    </div>
                                  </button>
                                );
                              })}
                            {prePedidos.filter(pre => !pre.Status || pre.Status.toLowerCase() === "pendente").filter(pre => {
                              const q = faturamentoPreSearch.toLowerCase();
                              return (pre.NomeCliente?.toLowerCase().includes(q)) || pre.Id.toLowerCase().includes(q);
                            }).length === 0 && (
                              <div className="p-2 text-center text-slate-450 font-mono text-[10px]">Nenhum pré-pedido pendente.</div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Sub-C: Direct Product */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono">🛍️ Bipar ou Digitar Produto:</label>
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2 h-3 w-3 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Nome ou Código Barras e Enter..."
                            value={pdvProductSearch}
                            onChange={(e) => setPdvProductSearch(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddProductByQueryOrBarcode(pdvProductSearch);
                              }
                            }}
                            className="w-full bg-slate-50 border border-slate-200 focus:outline-none rounded-lg pl-7 pr-2 py-1 text-[11px] text-slate-800 transition focus:border-emerald-600 focus:bg-white font-mono"
                          />
                        </div>
                        {pdvProductSearch && (
                          <div className="absolute z-10 bg-white border border-slate-200 rounded-lg max-h-44 overflow-y-auto shadow-xl divide-y divide-slate-100 w-64 custom-scrollbar">
                            {produtos
                              .filter(p => p.Nome.toLowerCase().includes(pdvProductSearch.toLowerCase()) || (p.CodigoDeBarras && p.CodigoDeBarras.includes(pdvProductSearch)))
                              .slice(0, 5)
                              .map(p => {
                                const pr = Number(p.Preco) || 0;
                                return (
                                  <button
                                    type="button"
                                    key={p.Id}
                                    onClick={() => {
                                      addProductToCart(p);
                                      setPdvProductSearch("");
                                    }}
                                    className="w-full text-left p-2 hover:bg-slate-50 transition text-[10px] space-y-0.5 block cursor-pointer"
                                  >
                                    <p className="font-bold text-slate-800 truncate">{p.Nome}</p>
                                    <p className="text-slate-500 font-mono text-[9px]">Cód: {p.CodigoDeBarras || "N/A"}</p>
                                    <div className="flex justify-between items-center text-[9px] pt-0.5">
                                      <span className="text-emerald-700 font-bold">R$ {pr.toFixed(2)}</span>
                                      <span className="text-indigo-600 font-bold font-mono">Adicionar +</span>
                                    </div>
                                  </button>
                                );
                              })}
                            {produtos.filter(p => p.Nome.toLowerCase().includes(pdvProductSearch.toLowerCase()) || (p.CodigoDeBarras && p.CodigoDeBarras.includes(pdvProductSearch))).length === 0 && (
                              <div className="p-2 hover:bg-slate-50 transition text-[10px] text-slate-500 text-center font-mono">
                                Não cadastrado. Pressione Enter para adicionar avulso.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* THE REAL CARRINHO UNIFICADO GRID */}
                  <div className="bg-white border border-slate-150 p-4 rounded-2xl shadow-xs space-y-2.5 flex-1 flex flex-col min-h-[250px]">
                    <span className="text-[10px] font-black font-mono tracking-wider text-slate-400 block uppercase">
                      3. Grid de Itens do Carrinho Unificado:
                    </span>

                    <div className="flex-1 overflow-y-auto max-h-[300px] border border-slate-100 rounded-xl">
                      <table className="w-full text-left border-collapse font-sans text-xs">
                        <thead>
                          <tr className="bg-slate-55 border-b border-slate-150 text-[10px] font-bold text-slate-505 uppercase tracking-wider font-mono">
                            <th className="px-3 py-2 w-[12%]">Tipo</th>
                            <th className="px-3 py-2">Identificação / Item</th>
                            <th className="px-3 py-2 text-center w-[15%]">Preço Unitário</th>
                            <th className="px-3 py-2 text-center w-[155px]">Quantidade</th>
                            <th className="px-3 py-2 text-right w-[15%]">Subtotal</th>
                            <th className="px-3 py-2 text-center w-[8%]">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {pdvCart.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-3 py-12 text-center text-slate-400 font-semibold font-mono">
                                🛒 Carrinho vazio. Importe um Atendimento, Pré-pedido ou bipe produtos para faturar.
                              </td>
                            </tr>
                          ) : (
                            pdvCart.map((item, idx) => (
                              <tr key={item.id} className="hover:bg-slate-50/50 transition">
                                <td className="px-3 py-2 font-mono text-[9px] font-bold">
                                  {item.type === "service" ? (
                                    <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-md uppercase border border-indigo-100">🐾 Agenda</span>
                                  ) : (
                                    <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-md uppercase border border-amber-100">📦 Prod</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 font-semibold text-slate-800">
                                  {item.name}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <div className="relative inline-flex items-center">
                                    <span className="text-[10px] text-slate-400 font-mono mr-0.5">R$</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={item.price}
                                      onChange={(e) => updateCartItemPrice(item.id, parseFloat(e.target.value) || 0)}
                                      onFocus={(e) => e.target.select()}
                                      className="w-14 px-1.5 py-0.5 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded focus:outline-none text-center font-mono font-semibold text-slate-755 text-[11px]"
                                    />
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => updateCartItemQty(item.id, item.quantity - 1)}
                                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold cursor-pointer transition select-none"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      value={item.quantity}
                                      onChange={(e) => updateCartItemQty(item.id, parseInt(e.target.value) || 0)}
                                      onFocus={(e) => e.target.select()}
                                      className="w-10 px-1 py-0.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-center text-[11px] font-semibold text-slate-800 focus:outline-none"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => updateCartItemQty(item.id, item.quantity + 1)}
                                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold cursor-pointer transition select-none"
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-right font-mono font-bold text-slate-800 text-[11px]">
                                  R$ {(item.price * item.quantity).toFixed(2)}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => removeCartItem(item.id)}
                                    className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer transition"
                                    title="Remover item da venda"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-150 font-mono">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">VALOR TOTAL DOS ITENS DO CARRINHO:</span>
                      <span className="text-lg font-black text-emerald-700">R$ {totalValueItems.toFixed(2)}</span>
                    </div>
                  </div>

                </div>

                {/* RIGHT COLUMN: Payments & Checkout execution (5 cols) */}
                <div className="lg:col-span-12 xl:col-span-5 lg:col-span-5 bg-white border border-slate-250 p-4.5 rounded-2xl flex flex-col justify-between overflow-y-auto max-h-[75vh] shadow-xs custom-scrollbar">
                  
                  <div className="space-y-4">
                    <div className="border-b border-slate-150 pb-2 flex justify-between items-center">
                      <span className="text-xs font-black font-mono tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
                        💳 Split de Caixa (Formas de Pagamento):
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setPagamentoPix("");
                          setPagamentoDebito("");
                          setPagamentoCredito("");
                          setPagamentoDinheiro("");
                          setPagamentoFiado("");
                        }}
                        className="text-[10px] text-indigo-600 hover:underline font-bold cursor-pointer flex items-center gap-1"
                        title="Limpar campos"
                      >
                        🧹 Limpar Teclado
                      </button>
                    </div>

                    <div className="space-y-3 font-mono">
                      
                      {/* Pix */}
                      <div className="flex items-center justify-between gap-3 bg-slate-50/50 p-2 border border-slate-100 rounded-xl hover:bg-slate-50 transition">
                        <div className="flex items-center gap-2 w-32 shrink-0">
                          <span className="text-sm">🟩</span>
                          <span className="text-xs font-bold text-slate-700">Pix:</span>
                        </div>
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs font-semibold">R$</span>
                          <input
                            type="number"
                            value={pagamentoPix}
                            onChange={(e) => setPagamentoPix(e.target.value)}
                            onFocus={(e) => e.target.select()}
                            placeholder="0"
                            className="w-full bg-white border border-slate-200 focus:outline-none rounded-lg pl-8 pr-2 py-1 text-xs text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500/10 font-bold"
                          />
                        </div>
                      </div>

                      {/* Débito */}
                      <div className="flex items-center justify-between gap-3 bg-slate-50/50 p-2 border border-slate-100 rounded-xl hover:bg-slate-50 transition">
                        <div className="flex items-center gap-2 w-32 shrink-0">
                          <span className="text-sm">🟦</span>
                          <span className="text-xs font-bold text-slate-700">Débito:</span>
                        </div>
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs font-semibold">R$</span>
                          <input
                            type="number"
                            value={pagamentoDebito}
                            onChange={(e) => setPagamentoDebito(e.target.value)}
                            onFocus={(e) => e.target.select()}
                            placeholder="0"
                            className="w-full bg-white border border-slate-200 focus:outline-none rounded-lg pl-8 pr-2 py-1 text-xs text-slate-800 focus:border-sky-650 focus:ring-1 focus:ring-sky-500/10 font-bold"
                          />
                        </div>
                      </div>

                      {/* Crédito */}
                      <div className="flex items-center justify-between gap-3 bg-slate-50/50 p-2 border border-slate-100 rounded-xl hover:bg-slate-50 transition">
                        <div className="flex items-center gap-2 w-32 shrink-0">
                          <span className="text-sm">🟪</span>
                          <span className="text-xs font-bold text-slate-700">Crédito:</span>
                        </div>
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs font-semibold">R$</span>
                          <input
                            type="number"
                            value={pagamentoCredito}
                            onChange={(e) => setPagamentoCredito(e.target.value)}
                            onFocus={(e) => e.target.select()}
                            placeholder="0"
                            className="w-full bg-white border border-slate-200 focus:outline-none rounded-lg pl-8 pr-2 py-1 text-xs text-slate-800 focus:border-purple-650 focus:ring-1 focus:ring-purple-500/10 font-bold"
                          />
                        </div>
                      </div>

                      {/* Dinheiro */}
                      <div className="flex items-center justify-between gap-3 bg-slate-50/50 p-2 border border-slate-100 rounded-xl hover:bg-slate-50 transition">
                        <div className="flex items-center gap-2 w-32 shrink-0">
                          <span className="text-sm">💵</span>
                          <span className="text-xs font-bold text-slate-700">Dinheiro:</span>
                        </div>
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs font-semibold">R$</span>
                          <input
                            type="number"
                            value={pagamentoDinheiro}
                            onChange={(e) => setPagamentoDinheiro(e.target.value)}
                            onFocus={(e) => e.target.select()}
                            placeholder="0"
                            className="w-full bg-white border border-slate-200 focus:outline-none rounded-lg pl-8 pr-2 py-1 text-xs text-slate-800 focus:border-amber-650 focus:ring-1 focus:ring-amber-500/10 font-bold"
                          />
                        </div>
                      </div>

                      {/* Fiado (Conta) */}
                      <div className={`flex items-center justify-between gap-3 p-2 border rounded-xl transition ${
                        isAnonymous ? "opacity-50 bg-slate-100 border-slate-200" : "bg-rose-50/30 border-rose-100 hover:bg-rose-50/50"
                      }`}>
                        <div className="flex items-center gap-2 w-32 shrink-0">
                          <span className="text-sm">📝</span>
                          <span className="text-xs font-bold text-slate-700">Fiado:</span>
                        </div>
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs font-semibold">R$</span>
                          <input
                            type="number"
                            disabled={isAnonymous}
                            value={pagamentoFiado}
                            onChange={(e) => setPagamentoFiado(e.target.value)}
                            onFocus={(e) => e.target.select()}
                            placeholder={isAnonymous ? "🔒 Bloqueado" : "0"}
                            className={`w-full bg-white border focus:outline-none rounded-lg pl-8 pr-2 py-1 text-xs focus:border-rose-600 focus:ring-1 focus:ring-rose-500/10 font-bold text-rose-700 ${
                              isAnonymous ? "cursor-not-allowed border-slate-200 placeholder-slate-400 bg-slate-50 text-slate-400" : "border-slate-200"
                            }`}
                          />
                        </div>
                      </div>

                    </div>

                    <div className="h-[1px] bg-dashed border-b border-dashed border-slate-200 my-1"></div>

                    {/* Math verification metrics box */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 font-mono text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Valor Total Itens:</span>
                        <span className="font-bold text-slate-800">R$ {totalValueItems.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Soma Recebida/Digitada:</span>
                        <span className="font-bold text-indigo-750">R$ {somaLancada.toFixed(2)}</span>
                      </div>
                      
                      <div className="border-t border-slate-200 my-1 pb-1"></div>
                      
                      <div className="flex justify-between items-center text-xs font-bold pt-1">
                        <span>SOMA LANÇADA:</span>
                        <span className="bg-indigo-600 text-white px-2 py-0.5 rounded font-black">R$ {somaLancada.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Scenario validations notifications */}
                    <div className="text-[11px]">
                      {isAnonymous ? (
                        Math.abs(somaLancada - totalValueItems) < 0.015 ? (
                          <div className="p-3 bg-emerald-50 border border-emerald-150 text-emerald-800 rounded-xl flex items-center gap-1.5">
                            <span>✓</span>
                            <span><strong>PAGAMENTO INTEGRAL CONSOLIDADO</strong> – Ideal para vendas de balcão!</span>
                          </div>
                        ) : (
                          <div className="p-3 bg-amber-50 border border-amber-150 text-amber-800 rounded-xl space-y-0.5">
                            <p className="font-bold">⚠️ Venda Rápida de Balcão (Anônima):</p>
                            <p className="font-mono text-[9.5px]">A soma dos valores informados deve ser exatamente R$ {totalValueItems.toFixed(2)} para faturar sem cadastro.</p>
                          </div>
                        )
                      ) : (
                        (() => {
                          if (Math.abs(somaLancada - totalValueItems) < 0.015) {
                            return (
                              <div className="p-3 bg-emerald-50 border border-emerald-150 text-emerald-800 rounded-xl flex items-center gap-1.5">
                                <span>✓</span>
                                <span><strong>PAGO TOTAL</strong> – O Caixa será atualizado no total de R$ {totalValueItems.toFixed(2)}.</span>
                              </div>
                            );
                          } else if (restante > 0) {
                            return (
                              <div className="p-3 bg-amber-50 border border-amber-100 text-amber-900 rounded-xl space-y-1">
                                <p className="font-bold flex items-center gap-1">📋 Cenário B — Lançamento Automático no Fiado:</p>
                                <p className="font-mono text-[10px] leading-tight">
                                  Como foi digitado R$ {somaLancada.toFixed(2)}, o restante de <strong className="text-rose-600">R$ {restante.toFixed(2)}</strong> será lançado diretamente no Fiado de {targetClient?.Nome || "Cliente"} ao faturar.
                                </p>
                                {limit > 0 && (
                                  <div className="text-[9px] text-slate-500 flex justify-between font-mono pt-1 border-t border-amber-150-dot">
                                    <span>Débito Pós-Operação: R$ {(currentDebito + finalFiadoToLaunch).toFixed(2)}</span>
                                    <span>Limite do Cliente: R$ {limit.toFixed(2)}</span>
                                  </div>
                                )}
                                {limitExceeded && (
                                  <div className="p-1.5 bg-rose-50 border border-rose-150 text-rose-700 text-[10px] font-bold rounded-lg mt-1 flex items-center gap-1">
                                    <span>⛔</span>
                                    <span>Limite de crédito excedido! Operação bloqueada.</span>
                                  </div>
                                )}
                              </div>
                            );
                          } else {
                            return (
                              <div className="p-3 bg-rose-50 border border-rose-150 text-rose-800 rounded-xl flex items-center gap-1.5 font-bold">
                                <span>⚠️</span>
                                <span>VALORES EXCEDENTES – Reduza a partilha lançada.</span>
                              </div>
                            );
                          }
                        })()
                      )}
                    </div>

                  </div>

                  {/* Final Action Button Panel */}
                  <div className="mt-4 pt-3.5 border-t border-slate-150 flex flex-col gap-2">
                    {errorMessage && (
                      <span className="text-[10px] font-bold text-rose-600 block text-center font-mono uppercase bg-rose-50 py-1 rounded">
                        {errorMessage}
                      </span>
                    )}
                    <button
                      type="button"
                      id="execute-faturamento-confirm-btn"
                      disabled={!isReadyToPay}
                      onClick={handleExecuteFaturamento}
                      className={`flex items-center justify-center gap-2 px-6 py-3 text-white rounded-xl text-xs font-black shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed uppercase transition font-sans ${
                        isReadyToPay ? "bg-emerald-600 hover:bg-emerald-700 active:scale-95" : "bg-slate-400"
                      }`}
                    >
                      <Check className="h-4.5 w-4.5" />
                      Finalizar e Faturar Venda
                    </button>
                  </div>

                </div>

              </div>

            </div>
          </div>
        );
      })()}

      {/* Modal - Pacote de Repetições */}
      {showPacoteModal && selectedPacoteRow && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 select-none">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-in fade-in duration-200 flex flex-col max-h-[80vh]">
            
            {/* Modal Header */}
            <div className={`px-6 py-4.5 text-white flex items-center justify-between shrink-0 ${activeTheme.primary}`}>
              <div>
                <h3 className="font-bold font-display tracking-tight text-base">
                  Criar Pacote de Repetições
                </h3>
                <p className="text-[10px] opacity-90">
                  Agende compromissos futuros com preço R$ 0.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPacoteModal(false);
                  setSelectedPacoteRow(null);
                }}
                className="text-white hover:text-slate-150 text-sm font-semibold p-1 hover:bg-white/10 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              {/* Selected Item Reference (Info box) */}
              <div className="p-4 bg-slate-50 border-b border-slate-150 text-xs text-slate-600 space-y-1.5 font-sans">
                <span className="font-mono text-[9px] bg-slate-250 text-slate-700 px-2 py-0.5 rounded-md uppercase font-bold">
                  Registro Base
                </span>
                <div className="grid grid-cols-2 gap-2 mt-1 bg-white p-2.5 rounded-xl border border-slate-150">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono">Dono / Cliente:</span>
                    <span className="font-semibold text-slate-800">
                      {(() => {
                        const parent = userMovimentosMap.get(selectedPacoteRow.IdCadMovDiario);
                        const clientObj = parent ? userClientsMap.get(parent.Cliente) : undefined;
                        return clientObj ? clientObj.Nome : "Cliente";
                      })()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono">Pet:</span>
                    <span className="font-semibold text-slate-850 font-mono">{selectedPacoteRow.NomePet}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono">Serviço Base:</span>
                    <span className="font-semibold text-slate-850 truncate block">
                      {(() => {
                        const prod = produtos.find(p => p.Id === selectedPacoteRow.Servico);
                        return prod ? prod.Nome : selectedPacoteRow.Servico;
                      })()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono">Data e Hora Base:</span>
                    <span className="font-semibold text-slate-850 font-mono">
                      {selectedPacoteRow.Data} às {selectedPacoteRow.Hora}
                    </span>
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="p-6 space-y-4 text-xs font-sans">
                {/* Intervalo de dias */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                    Intervalo entre Agendamentos (em dias)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      required
                      value={pacoteIntervalDays}
                      onChange={(e) => setPacoteIntervalDays(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                    />
                    <span className="absolute right-3 top-2.5 text-[10px] text-slate-400 font-mono uppercase">
                      dias
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400 font-mono">
                    Ex: 7 para semanal, 15 para quinzenal, 30 para mensal.
                  </p>
                </div>

                {/* Quantidade de repetições */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                    Quantidade de Agendamentos Adicionais
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="50"
                      required
                      value={pacoteQuantity}
                      onChange={(e) => setPacoteQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                    />
                    <span className="absolute right-3 top-2.5 text-[10px] text-slate-400 font-mono uppercase">
                      Agendamento(s)
                    </span>
                  </div>
                </div>

                {/* Dynamic Dates Preview Box */}
                <div className="p-3 bg-emerald-50 border border-emerald-150 rounded-xl text-emerald-950 text-[11px] font-mono space-y-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wide block">
                    Pré-visualização das datas futuras (Preço R$ 0,00):
                  </span>
                  <div className="max-h-24 overflow-y-auto custom-scrollbar space-y-1 text-[10px] text-slate-700 font-semibold">
                    {Array.from({ length: Math.min(20, pacoteQuantity) }).map((_, i) => {
                      const futureDate = addDaysToDate(selectedPacoteRow.Data, pacoteIntervalDays * (i + 1));
                      return (
                        <div key={i} className="flex justify-between border-b border-emerald-100/50 pb-0.5 last:border-0 last:pb-0">
                          <span>#0{i + 1} - Nova Sessão:</span>
                          <span className="text-emerald-700">{futureDate}</span>
                        </div>
                      );
                    })}
                    {pacoteQuantity > 20 && (
                      <div className="text-slate-400 italic text-[9px] text-center pt-1">
                        + {pacoteQuantity - 20} registros ocultos na lista
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPacoteModal(false);
                      setSelectedPacoteRow(null);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleGeneratePacote}
                    className={`px-4.5 py-2 font-bold rounded-xl text-white shadow-xs transition cursor-pointer text-xs ${activeTheme.primary}`}
                  >
                    Gerar Pacote ✓
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal - Cadastrar Novo Agendamento (Novo Mov Diário) - Two-Step Wizard Flow */}
      {showAddParentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 select-none">
          <div className={`w-full bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all duration-300 flex flex-col max-h-[92vh] ${
            currentStep === 2 ? "max-w-[95vw] lg:max-w-6xl" : "max-w-lg"
          }`}>
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-indigo-600 px-6 py-4.5 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold font-display tracking-tight text-base">
                  Movimento Diário
                </h3>
                <p className="text-[10px] text-emerald-100">
                  Fluxo profissional de entrada em duas etapas conforme o SAP Build.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddParentModal(false);
                  setCurrentStep(1);
                  setIsEditingWizard(false);
                  if (onClearPrefilledRetorno) onClearPrefilledRetorno();
                  setActiveRetornoToMarkCompleted(null);
                }}
                className="text-white hover:text-slate-150 text-sm font-semibold p-1 hover:bg-white/10 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Step Wizard Badges Indicator */}
            <div className="bg-slate-50 border-b border-slate-150 px-6 py-3.5 flex items-center justify-between text-xs font-mono shrink-0">
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 flex items-center justify-center rounded-full font-bold text-[10px] ${
                  currentStep === 1 
                    ? "bg-emerald-600 text-white ring-4 ring-emerald-100" 
                    : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                }`}>
                  1
                </span>
                <span className={`font-semibold ${currentStep === 1 ? "text-slate-800" : "text-slate-400"}`}>
                  Cabeçalho (Dono/Obs)
                </span>
              </div>
              <div className="h-0.5 flex-1 bg-slate-200 mx-3"></div>
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 flex items-center justify-center rounded-full font-bold text-[10px] ${
                  currentStep === 2 
                    ? "bg-indigo-600 text-white ring-4 ring-indigo-100" 
                    : "bg-slate-100 text-slate-400 border border-slate-200"
                }`}>
                  2
                </span>
                <span className={`font-semibold ${currentStep === 2 ? "text-slate-800" : "text-slate-400"}`}>
                  Detalhes (Pet/Registros/Serviços)
                </span>
              </div>
            </div>

            {/* Scrollable Form Body Container */}
            <div className="overflow-y-auto flex-1 custom-scrollbar">

              {/* STEP 1: Parent Information Form (CadMovDiario) */}
              {currentStep === 1 && (
              <form onSubmit={handleStep1Submit} className="p-6 space-y-4 text-xs font-sans">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                    Selecionar Cliente Cadastrado (Pai)
                  </label>
                  <div className="relative">
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={clientSearchQuery}
                        onChange={(e) => {
                          const val = e.target.value;
                          setClientSearchQuery(val);
                          const found = clientes.find((c) => c.Id === selectedClientId);
                          if (!found || found.Nome !== val) {
                            setSelectedClientId("");
                          }
                        }}
                        placeholder="Comece a digitar o nome do dono..."
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-slate-100 transition duration-150 pr-8"
                      />
                      {clientSearchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setClientSearchQuery("");
                            setSelectedClientId("");
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Dropdown combo matching list */}
                    {clientSearchQuery.trim().length > 0 && !selectedClientId && (
                      <div className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100">
                        {clientes
                          .filter((c) => (isAdminViewAll || c.IdUsuarioDono === currentUserOwnerId) && c.Ativo)
                          .filter((c) =>
                            c.Nome.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                            (c.Telefone && c.Telefone.includes(clientSearchQuery))
                          )
                          .map((c) => (
                            <button
                              key={c.Id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setSelectedClientId(c.Id);
                                setClientSearchQuery(c.Nome);
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                setSelectedClientId(c.Id);
                                setClientSearchQuery(c.Nome);
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-slate-800 text-sm font-medium transition flex items-center justify-between cursor-pointer"
                            >
                              <div>
                                <div className="font-semibold text-slate-900">{c.Nome}</div>
                                {c.Telefone && <div className="text-[10px] text-slate-500 font-mono">{c.Telefone}</div>}
                              </div>
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-md font-bold uppercase font-mono">
                                Selecionar
                              </span>
                            </button>
                          ))}
                        {clientes
                          .filter((c) => (isAdminViewAll || c.IdUsuarioDono === currentUserOwnerId) && c.Ativo)
                          .filter((c) =>
                            c.Nome.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                            (c.Telefone && c.Telefone.includes(clientSearchQuery))
                          ).length === 0 && (
                          <div className="p-3.5 text-slate-400 text-center text-xs">
                            Nenhum cliente encontrado. Digite outro nome ou cadastre na aba de "Clientes".
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="mt-1.5 text-[10px] text-slate-400">
                    * Comece a digitar o nome para abrir a lista. Não achou o cliente? Cadastre-o primeiro na aba de "Clientes".
                  </p>
                </div>

                {selectedClientId && (
                  <div className="p-3 bg-emerald-50/50 border border-emerald-150 rounded-xl space-y-1.5 text-emerald-950 font-mono text-[11px]">
                    <h4 className="font-bold uppercase tracking-wider text-[10px] text-emerald-800">
                      Contato do Cliente:
                    </h4>
                    <div>
                      <strong>Telefone:</strong> {clientes.find(c => c.Id === selectedClientId)?.Telefone}
                    </div>
                    <div>
                      <strong>Endereço:</strong> {clientes.find(c => c.Id === selectedClientId)?.Endereco || "Não informado"}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                    Observações de Entrada
                  </label>
                  <textarea
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Ex: Alérgico a perfumes fortes, agitar o shampoo neutro."
                    rows={2}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-slate-100 transition duration-150"
                  />
                </div>

                {/* Step 1 Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddParentModal(false);
                      setIsEditingWizard(false);
                      if (onClearPrefilledRetorno) onClearPrefilledRetorno();
                      setActiveRetornoToMarkCompleted(null);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer"
                  >
                    Fechar
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedClientId}
                    className={`px-4.5 py-2 font-semibold rounded-xl text-white shadow-xs transition cursor-pointer flex items-center gap-1 ${
                      selectedClientId
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-emerald-300 cursor-not-allowed"
                    }`}
                  >
                    Continuar para Itens ➔
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Child Information Form (CadDetMovDiario) - TRANSFORMED IN INTERACTIVE DATASHEET GRID */}
            {currentStep === 2 && (
              <form onSubmit={handleStep2Submit} className="p-4 sm:p-5 space-y-3.5 text-xs font-sans">
                
                {/* Visual Header confirmation */}
                <div className="p-2 sm:p-2.5 bg-emerald-50/50 border border-emerald-100 rounded-xl text-[11px] text-slate-650 flex justify-between items-center">
                  <span>
                    ✓ Cabeçalho gravado para o cliente: <strong className="text-emerald-950 font-bold">{clientes.find(c => c.Id === selectedClientId)?.Nome}</strong>
                  </span>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-md font-bold uppercase font-mono">
                    Formulário ID Vinculado
                  </span>
                </div>

                {/* Date Selection applied to all rows in batch */}
                <div className="max-w-xs flex items-center gap-2">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono tracking-wider whitespace-nowrap">
                    Data Geral:
                  </label>
                  <input
                    type="date"
                    required
                    value={detailData}
                    onChange={(e) => setDetailData(e.target.value)}
                    className="w-full max-w-[150px] px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-slate-100 transition duration-155 font-mono"
                  />
                </div>

                {/* Interactive sub-spreadsheet datasheet grid */}
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-100/30">
                  <div className="overflow-x-auto max-h-[450px] custom-scrollbar">
                    <table className="w-full text-left border-collapse table-fixed min-w-[850px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-650 font-mono text-[10px] uppercase font-semibold">
                          <th className="w-28 p-2 text-center border-r border-slate-200">Data</th>
                          <th className="w-20 p-2 text-center border-r border-slate-200">Hora</th>
                          <th className="w-32 p-2 border-r border-slate-200">Pet do Cliente</th>
                          <th className="w-48 p-2 border-r border-slate-200">Serviço / Produto</th>
                          <th className="w-24 p-2 text-center border-r border-slate-200">Tipo</th>
                          <th className="w-16 p-2 text-center border-r border-slate-200">Qtd</th>
                          <th className="w-24 p-2 border-r border-slate-200">Preço Unit</th>
                          <th className="w-24 p-2 border-r border-slate-200">Total (R$)</th>
                          <th className="w-10 p-2 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px] text-slate-705 font-mono bg-white">
                        {wizardRows.map((row) => {
                          const clientPets = pets.filter((p) => p.IdCliente === selectedClientId && p.Ativo);

                          return (
                            <tr key={row.Id} className="hover:bg-slate-50/80 transition duration-100">
                              {/* DATA */}
                              <td className="p-1 border-r border-slate-100 text-center">
                                <input
                                  type="date"
                                  required
                                  value={row.Data || detailData || selectedDate}
                                  onChange={(e) => handleUpdateWizardRowCell(row.Id, "Data", e.target.value)}
                                  className="w-full text-center bg-transparent border-0 p-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-blue-50/40 rounded-sm text-[10px] text-slate-800 font-semibold"
                                />
                              </td>

                              {/* HORA */}
                              <td className="p-1 border-r border-slate-100 text-center">
                                <input
                                  type="time"
                                  required
                                  value={row.Hora}
                                  onChange={(e) => handleUpdateWizardRowCell(row.Id, "Hora", e.target.value)}
                                  className="w-full text-center bg-transparent border-0 p-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-blue-50/40 rounded-sm text-xs text-slate-800 font-semibold"
                                />
                              </td>

                              {/* PET SELECTION */}
                              <td className="p-1 border-r border-slate-100">
                                <select
                                  value={row.IdPet || ""}
                                  onChange={(e) => {
                                    const petId = e.target.value;
                                    const petObj = clientPets.find((p) => p.Id === petId);
                                    if (petObj) {
                                      setWizardRows((prev) =>
                                        prev.map((r) => {
                                          if (r.Id === row.Id) {
                                            return { ...r, IdPet: petId, NomePet: petObj.Nome };
                                          }
                                          return r;
                                        })
                                      );
                                    }
                                  }}
                                  className="w-full bg-transparent border-0 p-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-blue-50/40 rounded-sm text-xs text-slate-800 font-sans cursor-pointer font-medium"
                                >
                                  {clientPets.length === 0 ? (
                                    <option value="">{row.NomePet} (Sem Pet)</option>
                                  ) : (
                                    clientPets.map((p) => (
                                      <option key={p.Id} value={p.Id}>
                                        {p.Nome}
                                      </option>
                                    ))
                                  )}
                                </select>
                              </td>

                              {/* SERVICE SELECTION */}
                              <td className="p-1 border-r border-slate-100">
                                <select
                                  value={row.Servico}
                                  onChange={(e) => handleUpdateWizardRowCell(row.Id, "Servico", e.target.value)}
                                  className="w-full bg-transparent border-0 p-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-blue-50/40 rounded-sm text-xs text-slate-800 font-sans cursor-pointer truncate"
                                >
                                  {[...produtos].filter(p => p.Ativo && ["Banho", "Tosa", "Combo", "Estética", "Tratamento", "Outro"].includes(p.Tipo)).sort((a, b) => a.Nome.localeCompare(b.Nome, "pt", { sensitivity: "base" })).map((p) => (
                                    <option key={p.Id} value={p.Id}>
                                      {p.Nome} - R$ {p.Preco.toFixed(2)}
                                    </option>
                                  ))}
                                </select>
                              </td>

                              {/* TIPO */}
                              <td className="p-1 border-r border-slate-100">
                                <select
                                  value={row.Tipo}
                                  onChange={(e) => handleUpdateWizardRowCell(row.Id, "Tipo", e.target.value)}
                                  className={`w-full bg-transparent border-0 p-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-blue-50/40 rounded-sm text-xs font-semibold cursor-pointer ${
                                    row.Tipo === "Saída" ? "text-rose-600 bg-rose-50/10" : "text-emerald-600 bg-emerald-50/10"
                                  }`}
                                >
                                  <option value="Entrada">📥 Entrada</option>
                                  <option value="Saída">📤 Saída</option>
                                </select>
                              </td>

                              {/* QUANTITY */}
                              <td className="p-1 border-r border-slate-100 text-center">
                                <input
                                  type="number"
                                  min="1"
                                  required
                                  value={row.Quantidade}
                                  onChange={(e) => handleUpdateWizardRowCell(row.Id, "Quantidade", parseInt(e.target.value) || 1)}
                                  className="w-full text-center bg-transparent border-0 p-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-blue-50/40 rounded-sm text-xs text-slate-850"
                                />
                              </td>

                              {/* PREÇO UNITÁRIO */}
                              <td className="p-1 border-r border-slate-100">
                                <div className="flex items-center gap-0.5 pl-0.5">
                                  <span className="text-[10px] text-slate-400">R$</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={row.PrecoUnitario}
                                    onChange={(e) => handleUpdateWizardRowCell(row.Id, "PrecoUnitario", parseFloat(e.target.value) || 0)}
                                    className="w-full bg-transparent border-0 p-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-blue-50/40 rounded-sm text-xs text-slate-800 font-medium"
                                  />
                                </div>
                              </td>

                              {/* TOTAL DA LINHA OVERVIEW */}
                              <td className={`p-1 border-r border-slate-100 font-bold text-right text-xs ${
                                row.TotalDaLinha < 0 ? "text-rose-700 bg-rose-50/30" : "text-emerald-700 bg-emerald-50/30"
                              }`}>
                                R$ {row.TotalDaLinha.toFixed(2)}
                              </td>

                              {/* DELETE BUTTON */}
                              <td className="p-1 text-center font-sans">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteWizardRow(row.Id)}
                                  className="text-slate-400 hover:text-red-500 p-1 hover:bg-rose-50 rounded-lg transition"
                                  title="Remover Serviço"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary aggregate info strip */}
                  <div className="p-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] font-semibold font-mono text-slate-600 bg-slate-50">
                    <div>
                      Contagem de Serviços: <span className="font-bold text-slate-800 bg-slate-200/60 px-2 py-0.5 rounded-md">{wizardRows.length}</span>
                    </div>
                    <div>
                      Subtotal da Folha de Dados:{" "}
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-100">
                        R$ {wizardRows.reduce((sum, r) => sum + r.TotalDaLinha, 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* DESEJA CRIAR UM PACOTE / REPETIR COMPACT CONFIG */}
                <div className="bg-indigo-50/40 border border-indigo-200 rounded-2xl p-3 sm:p-3.5 space-y-2.5 font-sans">
                  {/* Pack Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-indigo-600 animate-pulse" />
                      <span className="font-bold text-indigo-950 uppercase tracking-widest text-[11px] font-mono">
                        DESEJA CRIAR UM PACOTE?
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-500 font-mono">
                      Gera agendamentos recorrentes com valor R$ 0,00 de forma automática.
                    </span>
                  </div>

                  <div className="flex flex-wrap items-end gap-3">
                    {/* Interval in days with quick selections (Weekly, Biweekly/Quinzenal) */}
                    <div className="w-40 sm:w-44 flex flex-col gap-1">
                      <label className="block text-[9px] font-bold text-slate-500 mb-0.5 uppercase font-mono tracking-wider truncate">
                        Intervalo (dias)
                      </label>
                      <select
                        value={pacoteIntervalType}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPacoteIntervalType(val);
                          if (val !== "custom") {
                            setPacoteIntervalDays(parseInt(val) || 7);
                          } else {
                            setCustomIntervalDays("");
                            setPacoteIntervalDays(0);
                          }
                        }}
                        className="px-1.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-800 text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500/15 focus:border-indigo-650 transition w-full font-mono cursor-pointer h-[26px]"
                      >
                        <option value="7">7 dias (Semanal)</option>
                        <option value="15">15 dias (Quinzenal)</option>
                        <option value="30">30 dias (Mensal)</option>
                        <option value="1">1 dia (Diária)</option>
                        <option value="14">14 dias (Quinzena)</option>
                        <option value="custom">Personalizado</option>
                      </select>

                      {pacoteIntervalType === "custom" && (
                        <div className="mt-1">
                          <input
                            type="number"
                            min="1"
                            required
                            placeholder="Digite os dias (ex: 21)"
                            value={customIntervalDays}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomIntervalDays(val);
                              const parsed = parseInt(val) || 0;
                              setPacoteIntervalDays(parsed);
                            }}
                            className="w-full px-2 py-1 bg-white border border-indigo-200 rounded-lg text-slate-800 text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-mono h-[26px]"
                          />
                        </div>
                      )}
                    </div>

                    {/* Quantity of repetitions */}
                    <div className="w-24">
                      <label className="block text-[9px] font-bold text-slate-500 mb-1 uppercase font-mono tracking-wider truncate">
                        Repetições
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max="40"
                          value={pacoteQuantity}
                          onChange={(e) => setPacoteQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-1.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-850 text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500/15 focus:border-indigo-650 transition pr-8"
                        />
                        <span className="absolute right-1.5 top-1.5 text-[8px] text-slate-400 font-mono uppercase">
                          Vezes
                        </span>
                      </div>
                    </div>

                    {/* Submit generator buttons */}
                    <div className="ml-auto shrink-0 flex items-center gap-2">
                      {godModeActive && (
                        <button
                          id="btn-recorrente"
                          type="button"
                          onClick={handleGenerateRecorrente}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 font-bold text-white text-[11px] rounded-lg transition active:scale-95 cursor-pointer shadow-3xs inline-flex items-center justify-center gap-1.5 h-[26px]"
                          title="Programar apenas o lembrete de retorno recorrente sem gerar agendamentos em lote"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Recorrente
                        </button>
                      )}
                      <button
                        id="btn-gerar-pacote"
                        type="button"
                        onClick={handleGenerateWizardAsPackage}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 font-bold text-white text-[11px] rounded-lg transition active:scale-95 cursor-pointer shadow-3xs inline-flex items-center justify-center gap-1.5 h-[26px]"
                      >
                        <Layers className="h-3 w-3" />
                        Gerar como Pacote
                      </button>
                    </div>
                  </div>

                  {/* Future dates preview inlined helper message */}
                  <div className="text-[10px] text-indigo-800 font-mono bg-white border border-indigo-100 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                    <span>
                      ℹ Serão criados <strong className="text-indigo-600">{pacoteQuantity || 0}</strong> adicionais a cada <strong className="text-indigo-600">{pacoteIntervalDays || 0}</strong> dias com valor R$ 0,00 automático.
                    </span>
                    <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider">Lote Completo</span>
                  </div>
                </div>

                {/* Step 2 Actions - Consolidados em linha única com o mesmo formato de 4 colunas estritas */}
                <div className="pt-3 border-t border-slate-100 grid grid-cols-4 gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddParentModal(false);
                      setCurrentStep(1);
                      setIsEditingWizard(false);
                      if (onClearPrefilledRetorno) onClearPrefilledRetorno();
                      setActiveRetornoToMarkCompleted(null);
                    }}
                    className="h-10 px-2 bg-slate-100 hover:bg-slate-200 text-slate-705 font-bold rounded-lg text-xs cursor-pointer transition text-center whitespace-nowrap border border-slate-200 flex items-center justify-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="h-10 px-2 bg-slate-100 hover:bg-slate-200 text-slate-705 font-bold rounded-lg text-xs cursor-pointer transition text-center whitespace-nowrap border border-slate-200 flex items-center justify-center"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleSaveAndAddAnother(e)}
                    className="h-10 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-xs cursor-pointer transition text-center flex items-center justify-center gap-1 border border-emerald-250 font-mono whitespace-nowrap"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar
                  </button>
                  <button
                    type="submit"
                    className="h-10 px-2 font-bold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition cursor-pointer text-xs uppercase tracking-wider text-center flex items-center justify-center whitespace-nowrap"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            )}

            </div>

          </div>
        </div>
      )}

      {/* Show Edit Screen / Edit Record Overlay Modal */}
      {showEditModal && (() => {
        const editParent = userMovimentos.find(m => m.Id === editRowIdCadMovDiario);
        const editClientPets = editParent ? pets.filter((p) => p.IdCliente === editParent.Cliente && p.Ativo) : [];
        const editClientObj = editParent ? clientes.find(c => c.Id === editParent.Cliente) : undefined;
        const editClientName = editClientObj ? editClientObj.Nome : (editParent ? editParent.Cliente : "Consumidor");

        return (
          <div id="edit-record-screen-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all font-sans flex flex-col max-h-[80vh]">
              
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 px-6 py-4.5 text-white flex items-center justify-between shrink-0">
                <div>
                  <h3 className="font-bold font-display tracking-tight text-base text-white">
                    Editar Registro (Edit Record)
                  </h3>
                  <p className="text-[10px] text-indigo-100">
                    Mostrar Tela de Edição (Show Edit Screen) vinculada ao ID {editRowId}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="text-white hover:text-slate-150 text-sm font-semibold p-1 hover:bg-white/10 rounded-lg transition"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                
                {/* Client Info (Read Only) */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-150 flex items-center gap-2.5">
                  <User className="h-5 w-5 text-indigo-500" />
                  <div className="text-left">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Cliente Vinculado</p>
                    <p className="text-xs font-bold text-slate-800">{editClientName}</p>
                    {editParent?.Telefone && (
                      <p className="text-[10px] text-slate-500 font-mono">Tel: {editParent.Telefone}</p>
                    )}
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-2 gap-3.5 text-left">
                  
                  {/* Data */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Data</label>
                    <input
                      type="date"
                      value={editRowData}
                      onChange={(e) => setEditRowData(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition font-semibold"
                    />
                  </div>

                  {/* Hora */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Hora</label>
                    <input
                      type="time"
                      value={editRowHora}
                      onChange={(e) => setEditRowHora(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition font-semibold"
                    />
                  </div>

                </div>

                <div className="text-left">
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Pet do Cliente</label>
                  <select
                    value={editRowIdPet}
                    onChange={(e) => {
                      const petId = e.target.value;
                      setEditRowIdPet(petId);
                      const petObj = editClientPets.find(p => p.Id === petId);
                      if (petObj) {
                        setEditRowNomePet(petObj.Nome);
                      } else {
                        setEditRowNomePet("");
                      }
                    }}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition font-semibold"
                  >
                    <option value="">-- Nenhum / Outro --</option>
                    {editClientPets.map(p => (
                      <option key={p.Id} value={p.Id}>{p.Nome} ({p.Especie})</option>
                    ))}
                  </select>
                </div>

                <div className="text-left">
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Serviço / Produto</label>
                  <select
                    value={editRowServico}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditRowServico(val);
                      const prod = produtos.find(p => p.Id === val);
                      if (prod) {
                        setEditRowPrecoUnitario(prod.Preco);
                      }
                    }}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition font-semibold"
                  >
                    {[...produtos].filter(p => p.Ativo && ["Banho", "Tosa", "Combo", "Estética", "Tratamento", "Outro"].includes(p.Tipo)).sort((a, b) => a.Nome.localeCompare(b.Nome, "pt", { sensitivity: "base" })).map(p => (
                      <option key={p.Id} value={p.Id}>{p.Nome} [{p.Tipo}]</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3 text-left">
                  
                  {/* Tipo */}
                  <div className="col-span-1">
                    <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Tipo</label>
                    <select
                      value={editRowTipo}
                      onChange={(e) => setEditRowTipo(e.target.value as "Entrada" | "Saída")}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition font-semibold"
                    >
                      <option value="Entrada">📥 Entrada</option>
                      <option value="Saída">📤 Saída</option>
                    </select>
                  </div>

                  {/* Quantidade */}
                  <div className="col-span-1">
                    <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Qtd</label>
                    <input
                      type="number"
                      min="1"
                      value={editRowQuantidade}
                      onChange={(e) => setEditRowQuantidade(parseInt(e.target.value) || 1)}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition font-semibold"
                    />
                  </div>

                  {/* Preço Unitário */}
                  <div className="col-span-1">
                    <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Valor Unit.</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-3 text-[9px] text-slate-400 font-bold">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={editRowPrecoUnitario}
                        onChange={(e) => setEditRowPrecoUnitario(parseFloat(e.target.value) || 0)}
                        className="w-full rounded-xl border border-slate-200 pl-7 pr-2.5 py-2.5 text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition font-semibold"
                      />
                    </div>
                  </div>

                </div>

                {/* Sub-total Preview */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 flex items-center justify-between font-mono text-xs">
                  <span className="text-slate-500 font-semibold">Valor Total Calculado:</span>
                  <span className={`font-bold ${editRowTipo === "Saída" ? "text-rose-600" : "text-emerald-600"}`}>
                    {editRowTipo === "Saída" ? "-" : ""}R$ {(Number(editRowQuantidade || 0) * Number(editRowPrecoUnitario || 0)).toFixed(2)}
                  </span>
                </div>

                {/* Checkbox Realizado */}
                <div className="pt-2 flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editRowRealizado}
                      onChange={(e) => setEditRowRealizado(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4.5 w-4.5"
                    />
                    <span className="text-xs font-semibold text-slate-700">Agendamento Realizado (Feito)</span>
                  </label>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditRow}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md hover:shadow-lg active:scale-95 cursor-pointer flex items-center gap-1"
                >
                  <Check className="h-4 w-4" />
                  Salvar Alterações
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Botão Verde Flutuante destacado para o Caixa (PDV) */}
      <div className="fixed bottom-24 md:bottom-6 right-6 z-45">
        <button
          type="button"
          onClick={() => {
            if (userPermissionLevel === 2) {
              showAlert?.("Acesso Restrito 🔒", "O perfil Operacional (Nível 2) não tem acesso às operações de faturamento ou caixa.");
              return;
            }
            if (userPermissionLevel === 3) {
              showAlert?.("Acesso Restrito 🔒", "Nível de permissão 3 (Consulta e Pré-Venda) não autoriza faturamento ou caixa.");
              return;
            }
            onNavigateToCaixa?.();
          }}
          className={`flex items-center gap-2 px-5 py-3.5 rounded-full font-bold shadow-xl transition duration-150 text-xs tracking-tight ${
            userPermissionLevel === 2 || userPermissionLevel === 3
              ? "bg-slate-350 text-slate-500 opacity-60 cursor-not-allowed border border-slate-300"
              : "bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white cursor-pointer hover:shadow-2xl"
          }`}
          title={
            userPermissionLevel === 2
              ? "Acesso Restrito: Nível 2 (Operacional) não tem acesso ao faturamento ou caixa."
              : userPermissionLevel === 3
              ? "Acesso Restrito: Nível 3 (Consulta e Pré-Venda) não tem acesso ao faturamento ou caixa."
              : "Acessar Terminal de Caixa"
          }
        >
          <DollarSign className={`h-5 w-5 ${userPermissionLevel === 2 || userPermissionLevel === 3 ? "text-slate-400" : "text-emerald-205"}`} />
          <span>Faturamento Caixa (PDV)</span>
        </button>
      </div>

      {/* Modal para Definição de Retorno Recorrente da Linha */}
      {rowRecorrenteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <RefreshCw className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Programar Alerta de Retorno</h3>
                  <p className="text-[11px] text-slate-500">
                    Pet: <span className="font-semibold text-slate-700">{rowRecorrenteModal.row.NomePet}</span> • Cliente: <span className="font-semibold text-slate-700">{rowRecorrenteModal.clientName}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRowRecorrenteModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1.5">
                <div className="flex justify-between text-slate-600 font-mono text-[11px]">
                  <span>Data Original do Atendimento:</span>
                  <span className="font-bold text-slate-800">
                    {(rowRecorrenteModal.row.Data || "").split("-").reverse().join("/")}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 font-mono text-[11px]">
                  <span>Serviço Realizado:</span>
                  <span className="font-bold text-slate-800">
                    {produtos.find((p) => p.Id === rowRecorrenteModal.row.Servico)?.Nome || rowRecorrenteModal.row.Servico || "Serviço"}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 font-mono uppercase">
                  Quantidade de Dias para o Retorno:
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={rowRecorrenteDays}
                    onChange={(e) => setRowRecorrenteDays(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 pr-12"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono font-bold">
                    dias
                  </span>
                </div>
              </div>

              {/* Calculation display banner */}
              <div className="p-3 bg-emerald-50/80 border border-emerald-200/60 rounded-xl space-y-1">
                <p className="text-[11px] text-emerald-800 font-semibold flex items-center justify-between">
                  <span>Cálculo da Nova Data:</span>
                  <span className="font-mono font-extrabold text-xs text-emerald-900 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                    {addDaysToDate(rowRecorrenteModal.row.Data || todayStr, Math.max(1, rowRecorrenteDays || 1)).split("-").reverse().join("/")}
                  </span>
                </p>
                <p className="text-[10px] text-emerald-700 font-mono">
                  {(rowRecorrenteModal.row.Data || "").split("-").reverse().join("/")} + {Math.max(1, rowRecorrenteDays || 1)} dias = {addDaysToDate(rowRecorrenteModal.row.Data || todayStr, Math.max(1, rowRecorrenteDays || 1)).split("-").reverse().join("/")}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRowRecorrenteModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveRowRecorrente}
                className={`px-4 py-2 font-bold text-white rounded-xl text-xs transition cursor-pointer shadow-xs ${activeTheme.primary}`}
              >
                Confirmar Alerta
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
