import React, { useState, useEffect, useRef, useMemo } from "react";
import { toPng } from "html-to-image";
import { 
  ShoppingBag, 
  Trash2, 
  Edit2, 
  Search, 
  Plus, 
  Check, 
  DollarSign, 
  User, 
  CreditCard, 
  BadgeCheck, 
  Coins, 
  ScanLine, 
  Store,
  FileText,
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
  UserCheck,
  ChevronDown,
  Printer,
  Eye,
  Share2,
  PawPrint
} from "lucide-react";
import { 
  ThemeColor, 
  CadCliente, 
  CadProdutos, 
  PrePedido, 
  PrePedidoItens, 
  CaixaDiario, 
  CaixaMovimentacao, 
  CaixaSaldosForma, 
  CadDetMovDiario, 
  CadMovDiario,
  LotesProdutos,
  CadInfoConta,
  CadUsuario
} from "../types";

export interface BoxCartItem {
  id: string; // unique cart item id (e.g. `prod-Id` or `service-Id` or `custom-id`)
  type: "product" | "service" | "pre-pedido";
  originalId: string; // SKU or original ID
  productId?: string; // product ID for pre-pedido items
  barcode?: string;
  name: string;
  quantity: number;
  price: number;
  originalPrice?: number;
  petName?: string;
  tipo?: "Entrada" | "Saída";
  checked?: boolean;
  dataAgendamento?: string;
}

export interface CaixaSheetProps {
  clientes: CadCliente[];
  produtos: CadProdutos[];
  prePedidos: PrePedido[];
  prePedidoItens: PrePedidoItens[];
  caixaDiario: CaixaDiario[];
  caixaMovimentacao: CaixaMovimentacao[];
  caixaSaldosForma: CaixaSaldosForma[];
  detalhesMov: CadDetMovDiario[];
  movimentos: CadMovDiario[];
  lotesProdutos?: LotesProdutos[];
  activeTheme: ThemeColor;
  currentUser: any;
  currentUserOwnerId: string;
  infoContas?: CadInfoConta[];
  usuarios?: CadUsuario[];
  isAdminViewAll?: boolean;
  onUpdateCaixa: (
    newCaixa: CaixaDiario[], 
    newMov: CaixaMovimentacao[], 
    newSaldos: CaixaSaldosForma[]
  ) => void;
  onUpdateDetalhesMov: (newDetails: CadDetMovDiario[]) => void;
  onUpdatePrePedidos: (newPre: PrePedido[]) => void;
  onUpdateClientes: (newClients: CadCliente[]) => void;
  onUpdateLotes?: (newLotes: LotesProdutos[]) => void;
  showConfirm: (title: string, msg: string, onConfirm: () => void) => void;
  showAlert: (title: string, msg: string) => void;
  userPermissionLevel?: number;
  onBackToSchedule?: () => void;
}

export const isDiscountItem = (item?: {
  tipo?: string;
  name?: string;
  price?: number;
  type?: string;
  TotalDaLinha?: number;
  PrecoUnitario?: number;
}): boolean => {
  if (!item) return false;
  if (item.tipo === "Saída" || (item as any).type === "Saída") return true;
  if (typeof item.price === "number" && item.price < 0) return true;
  if (typeof item.TotalDaLinha === "number" && item.TotalDaLinha < 0) return true;
  if (typeof item.PrecoUnitario === "number" && item.PrecoUnitario < 0) return true;
  
  const lowerName = (item.name || "").toLowerCase().trim();
  if (
    lowerName.includes("desconto") ||
    lowerName.includes("abatimento") ||
    lowerName.startsWith("desc.") ||
    lowerName.startsWith("desc ") ||
    lowerName.includes("cupom") ||
    lowerName.includes("voucher") ||
    lowerName.includes("cortesia") ||
    lowerName.startsWith("saída") ||
    lowerName.startsWith("saida")
  ) {
    return true;
  }
  return false;
};

export default function CaixaSheet({
  clientes,
  produtos,
  prePedidos,
  prePedidoItens,
  caixaDiario,
  caixaMovimentacao,
  caixaSaldosForma,
  detalhesMov,
  movimentos,
  lotesProdutos = [],
  activeTheme,
  currentUser,
  currentUserOwnerId,
  infoContas = [],
  usuarios = [],
  isAdminViewAll = false,
  onUpdateCaixa,
  onUpdateDetalhesMov,
  onUpdatePrePedidos,
  onUpdateClientes,
  onUpdateLotes,
  showConfirm,
  showAlert,
  userPermissionLevel = 1,
  onBackToSchedule,
}: CaixaSheetProps) {
  
  // Para Administrador Geral (isAdminViewAll), ignora o filtro e traz todos os registros
  // Para usuários comuns, isola estritamente os seus próprios dados
  const scopedClientes = useMemo(() => {
    if (isAdminViewAll) return clientes;
    return clientes.filter((c) => c.IdUsuarioDono === currentUserOwnerId);
  }, [clientes, currentUserOwnerId, isAdminViewAll]);

  const scopedMovimentos = useMemo(() => {
    if (isAdminViewAll) return movimentos;
    return movimentos.filter((m) => m.IdUsuarioDono === currentUserOwnerId);
  }, [movimentos, currentUserOwnerId, isAdminViewAll]);

  const scopedPrePedidos = useMemo(() => {
    if (isAdminViewAll) return prePedidos;
    return prePedidos.filter((p) => !p.IdUsuarioDono || p.IdUsuarioDono === currentUserOwnerId);
  }, [prePedidos, currentUserOwnerId, isAdminViewAll]);

  const currentInfoConta = infoContas?.find(info => info.IdUsuarioDono === currentUserOwnerId);
  const masterUser = usuarios?.find(u => u.Id === currentUserOwnerId) || currentUser;

  const addressString = [
    currentInfoConta?.Endereco,
    currentInfoConta?.CEP_Estabelecimento ? `CEP: ${currentInfoConta.CEP_Estabelecimento}` : ""
  ].filter(Boolean).join(" - ");

  const masterContactString = [
    masterUser?.Nome ? `Resp: ${masterUser.Nome}` : "",
    masterUser?.Fone ? `Tel: ${masterUser.Fone}` : "",
    masterUser?.Email ? `E-mail: ${masterUser.Email}` : ""
  ].filter(Boolean).join(" | ");

  const getItemNameParts = (item: BoxCartItem) => {
    const isAgendamento = item.type === "service" || item.id?.startsWith("service-");
    const isDiscount = isDiscountItem(item);
    let mainName = item.name.toUpperCase();
    let subName = "";
    
    const parenIndex = mainName.indexOf("(");
    if (parenIndex !== -1) {
      subName = mainName.substring(parenIndex);
      mainName = mainName.substring(0, parenIndex).trim();
    }
    
    if (isAgendamento && item.petName) {
      mainName += ` (Animal: ${item.petName.toUpperCase()})`;
    }

    if (isDiscount && !mainName.includes("DESCONTO") && !mainName.includes("ABATIMENTO")) {
      mainName = `[DESCONTO] ${mainName}`;
    }
    
    return { mainName, subName };
  };

  // Outer inputs
  const [selectedClienteId, setSelectedClienteId] = useState<string>("");
  const [selectedMovId, setSelectedMovId] = useState<string>("");
  const [vendaRapidaNome, setVendaRapidaNome] = useState<string>("");
  const [cpfCnpj, setCpfCnpj] = useState<string>("");
  const [selectedPreVendaId, setSelectedPreVendaId] = useState<string>("");

  // Receipt / Cupom Não Fiscal states
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [showFullReceiptPdf, setShowFullReceiptPdf] = useState<boolean>(false);
  const [receiptData, setReceiptData] = useState<{
    idVenda: string;
    dataHora: string;
    cliente: string;
    pet: string;
    itens: BoxCartItem[];
    subtotal: number;
    desconto: number;
    total: number;
    formaPagamento: string;
    troco: number;
    whatsappPhone?: string;
  } | null>(null);

  // Card Picker / Dropdown replacement states
  const [isClienteDropdownOpen, setIsClienteDropdownOpen] = useState(false);
  const [clienteSearch, setClienteSearch] = useState("");
  const clienteDropdownRef = useRef<HTMLDivElement>(null);

  const [isMovDropdownOpen, setIsMovDropdownOpen] = useState(false);
  const [movSearch, setMovSearch] = useState("");
  const movDropdownRef = useRef<HTMLDivElement>(null);

  const [isPreVendaDropdownOpen, setIsPreVendaDropdownOpen] = useState(false);
  const [preVendaSearch, setPreVendaSearch] = useState("");
  const preVendaDropdownRef = useRef<HTMLDivElement>(null);

  const thermalReceiptRef = useRef<HTMLDivElement>(null);
  const fullReceiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (clienteDropdownRef.current && !clienteDropdownRef.current.contains(event.target as Node)) {
        setIsClienteDropdownOpen(false);
      }
      if (movDropdownRef.current && !movDropdownRef.current.contains(event.target as Node)) {
        setIsMovDropdownOpen(false);
      }
      if (preVendaDropdownRef.current && !preVendaDropdownRef.current.contains(event.target as Node)) {
        setIsPreVendaDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Cart Grid
  const [cartItems, setCartItems] = useState<BoxCartItem[]>([]);
  
  // Product Search Input
  const [itemQuery, setItemQuery] = useState<string>("");
  const [filteredProducts, setFilteredProducts] = useState<CadProdutos[]>([]);
  const [showProductDropdown, setShowProductDropdown] = useState<boolean>(false);

  // Payments Inputs
  const [valPix, setValPix] = useState<string>("");
  const [valDebito, setValDebito] = useState<string>("");
  const [valCredito, setValCredito] = useState<string>("");
  const [valDinheiro, setValDinheiro] = useState<string>("");
  const [isDinheiroChecked, setIsDinheiroChecked] = useState<boolean>(false);
  const [manualDinheiroOverride, setManualDinheiroOverride] = useState<boolean>(false);
  const [isFaturamentoProcessing, setIsFaturamentoProcessing] = useState<boolean>(false);

  // Cart item editing modal/popover states
  const [editingCartItemId, setEditingCartItemId] = useState<string | null>(null);
  const [editingQty, setEditingQty] = useState<number>(1);
  const [editingVal, setEditingVal] = useState<number>(0);

  // Refs for focusing jumps
  const cpfInputRef = useRef<HTMLInputElement>(null);
  const itemInputRef = useRef<HTMLInputElement>(null);

  // Filter available active items from product list
  useEffect(() => {
    if (itemQuery.trim() === "") {
      setFilteredProducts([]);
    } else {
      const query = itemQuery.toLowerCase();
      const filtered = produtos.filter(
        (p) => 
          p.Ativo && 
          (p.Nome.toLowerCase().includes(query) || 
           (p.CodigoDeBarras && p.CodigoDeBarras.includes(query)))
      );
      setFilteredProducts(filtered);
    }
  }, [itemQuery, produtos]);

  // Regra de Venda Rápida Foco:
  // Se o campo VENDA RÁPIDA for em branco, assume "Cliente Geral".
  // Se for preenchido, o foco passa para CPF/CNPJ. Se não, o cursor nem pula.
  const handleVendaRapidaBlur = () => {
    if (vendaRapidaNome.trim() !== "") {
      cpfInputRef.current?.focus();
    }
  };

  const handleVendaRapidaKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (vendaRapidaNome.trim() !== "") {
        cpfInputRef.current?.focus();
      }
    }
  };

  // Calculate total price of cart, subtracting Saída types
  const totalCartValue = cartItems.reduce((sum, item) => {
    if (item.checked === false) return sum;
    const isSaida = item.tipo === "Saída";
    const val = item.quantity * item.price;
    return sum + (isSaida ? -val : val);
  }, 0);

  // --- AUTOMATIONS OF PAYMENTS ---
  // If cart is non-empty and has not been manually touched,
  // we default to checking [X] DINHEIRO and setting its value to the remainder/total of the cart
  useEffect(() => {
    if (cartItems.length === 0) {
      if (!manualDinheiroOverride) {
        setValDinheiro("");
        setIsDinheiroChecked(false);
      }
      return;
    }

    const valPixNum = Math.abs(parseFloat(valPix) || 0);
    const valDebitoNum = Math.abs(parseFloat(valDebito) || 0);
    const valCreditoNum = Math.abs(parseFloat(valCredito) || 0);
    
    // Subtração Dinâmica:
    // valDinheiro = TotalCarrinho - PIX - DÉBITO - CRÉDITO
    const otherSum = valPixNum + valDebitoNum + valCreditoNum;
    const targetAbsTotal = Math.abs(totalCartValue);
    const remaining = targetAbsTotal - otherSum;

    if (!manualDinheiroOverride) {
      if (remaining > 0) {
        setValDinheiro(remaining.toFixed(2));
        setIsDinheiroChecked(true);
      } else {
        setValDinheiro("");
        setIsDinheiroChecked(false);
      }
    }
  }, [cartItems, valPix, valDebito, valCredito, totalCartValue, manualDinheiroOverride]);

  // Whenever CLIENTE dropdown changes, reset/clear scheduling dropdown if needed
  const handleClienteSelect = (clientId: string) => {
    setSelectedClienteId(clientId);
    setSelectedMovId(""); // reset sub-dropdown
    
    // Auto-fill venda rapida with selected client or clean it
    if (clientId) {
      const clientObj = clientes.find(c => c.Id === clientId);
      if (clientObj) {
        setVendaRapidaNome("");
        setCpfCnpj(clientObj.CpfCnpj || "");
      }
    }
  };

  // Pull non-paid items of scheduling ("BUSCA MOVIMENTO DIÁRIO") into the cart
  const handleMovSelect = (movId: string) => {
    setSelectedMovId(movId);
    if (!movId) return;

    // Find all matching non-paid details from detailed diary
    const matchedDets = detalhesMov.filter(
      (d) => d.IdCadMovDiario === movId && !d.Pago && d.Ativo
    );

    if (matchedDets.length === 0) {
      showAlert("Sem agendamentos pendentes", "Este movimento diário não possui serviços pendentes de pagamento.");
      return;
    }

    // Add these scheduling records to the cart
    const itemsToAdd: BoxCartItem[] = matchedDets.map((d) => {
      // Find product name if matched
      const matchedProd = produtos.find((p) => p.Id === d.Servico);
      const prodName = matchedProd?.Nome || d.Servico;
      const scheduleDateStr = d.Data ? (d.Hora ? `${d.Data}T${d.Hora}:00` : `${d.Data}T00:00:00`) : undefined;
      const parentMov = movimentos.find((m) => m.Id === d.IdCadMovDiario);
      const clientObj = parentMov?.Cliente ? clientes.find(c => c.Id === parentMov.Cliente) : null;
      const resolvedClientName = clientObj ? clientObj.Nome : (parentMov?.Cliente || "");
      const isDespesa = resolvedClientName.toUpperCase() === "MINHAS DESPESAS" || d.Tipo === "Saída" || d.TotalDaLinha < 0 || prodName === "Despesa do Dia";

      return {
        id: `service-${d.Id}`,
        type: "service",
        originalId: d.Id,
        name: `Serviço: ${prodName}`,
        quantity: d.Quantidade,
        price: d.PrecoUnitario,
        originalPrice: d.PrecoUnitario,
        petName: d.NomePet || undefined,
        tipo: isDespesa ? "Saída" : (d.Tipo || "Entrada"),
        checked: true,
        dataAgendamento: scheduleDateStr,
      };
    });

    // Merge/overwrite into cart items
    setCartItems((prev) => {
      const filtered = prev.filter((item) => !item.id.startsWith("service-"));
      return [...filtered, ...itemsToAdd];
    });

    showAlert(
      "Agendamento Importado 📅",
      `Foram importados ${matchedDets.length} item(ns) do agendamento selecionado diretamente para o carrinho.`
    );
  };

  // Pull pre-sale items ("BUSCA PRÉ-VENDA") into the cart
  const handlePreVendaSelect = (preId: string) => {
    setSelectedPreVendaId(preId);
    if (!preId) return;

    // Load matching Pre-Pedido items
    const matchedItens = prePedidoItens.filter((item) => item.IdPrePedido === preId);
    if (matchedItens.length === 0) {
      showAlert("Alerta", "Esta pré-venda selecionada não possui itens cadastrados.");
      return;
    }

    const itemsToAdd: BoxCartItem[] = matchedItens.map((item) => {
      const prod = produtos.find((p) => p.Id === item.IdProdutoServico);
      const name = item.NomeProduto || prod?.Nome || "Produto / Serviço";
      const sku = prod?.CodigoDeBarras || item.IdProdutoServico || "";
      return {
        id: `preped-${item.Id}`,
        type: "pre-pedido",
        originalId: item.IdPrePedido,
        productId: item.IdProdutoServico,
        barcode: sku,
        name: name,
        quantity: item.Quantidade,
        price: item.ValorUnitario,
        originalPrice: prod?.Preco ?? item.ValorUnitario,
        checked: true,
      };
    });

    // Auto-fill client if pre-sale belongs to a client
    const preObj = prePedidos.find(p => p.Id === preId);
    if (preObj && preObj.Cliente) {
      const clientObj = clientes.find(c => c.Id === preObj.Cliente || c.Nome === preObj.Cliente);
      if (clientObj) {
        setSelectedClienteId(clientObj.Id);
      } else {
        setVendaRapidaNome(preObj.NomeCliente || "");
      }
    } else if (preObj) {
      setVendaRapidaNome(preObj.NomeCliente || "");
    }

    setCartItems((prev) => {
      const filtered = prev.filter((item) => item.type !== "pre-pedido");
      return [...filtered, ...itemsToAdd];
    });

    showAlert(
      "Pré-Venda Importada 📦",
      `Foram importados ${matchedItens.length} itens da pré-venda de celular para o caixa.`
    );
  };

  // Search input typing / scanning barcode handler
  const handleQueryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const code = itemQuery.trim();
      if (code === "") return;

      // 1. Try search by barcode precisely
      const matchBarcode = produtos.find(
        (p) => p.Ativo && p.CodigoDeBarras?.trim() === code
      );

      if (matchBarcode) {
        addGenericProductToCart(matchBarcode);
        setItemQuery("");
        setShowProductDropdown(false);
        return;
      }

      // 2. If single item filtered, select it
      if (filteredProducts.length === 1) {
        addGenericProductToCart(filteredProducts[0]);
        setItemQuery("");
        setShowProductDropdown(false);
      } else if (filteredProducts.length > 1) {
        // Encourage selecting
        setShowProductDropdown(true);
      } else {
        showAlert("Não localizado ⚠️", `Código de barras ou produto "${code}" não cadastrado no catálogo.`);
      }
    }
  };

  // Add a standard product object to cart
  const addGenericProductToCart = (prod: CadProdutos) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.type === "product" && item.originalId === prod.Id);
      if (existing) {
        return prev.map((item) => 
          item.type === "product" && item.originalId === prod.Id
            ? { ...item, quantity: item.quantity + 1, checked: true }
            : item
        );
      } else {
        const newItem: BoxCartItem = {
          id: `prod-${prod.Id}-${Date.now()}`,
          type: "product",
          originalId: prod.Id,
          barcode: prod.CodigoDeBarras,
          name: prod.Nome,
          quantity: 1,
          price: prod.Preco,
          originalPrice: prod.Preco,
          checked: true,
        };
        return [...prev, newItem];
      }
    });

    setItemQuery("");
    setShowProductDropdown(false);
    itemInputRef.current?.focus();
  };

  // Edit unit Qty / Val
  const initiateEditCartItem = (item: BoxCartItem) => {
    setEditingCartItemId(item.id);
    setEditingQty(item.quantity);
    setEditingVal(item.price);
  };

  const saveEditCartItem = () => {
    if (!editingCartItemId) return;
    setCartItems((prev) => 
      prev.map((item) => 
        item.id === editingCartItemId 
          ? { ...item, quantity: Math.max(1, editingQty), price: Math.max(0, editingVal) }
          : item
      )
    );
    setEditingCartItemId(null);
  };

  const removeCartItem = (itemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  // Reset checkout fields
  const handleResetCaixaState = () => {
    setCartItems([]);
    setSelectedClienteId("");
    setSelectedMovId("");
    setVendaRapidaNome("");
    setCpfCnpj("");
    setSelectedPreVendaId("");
    setValPix("");
    setValDebito("");
    setValCredito("");
    setValDinheiro("");
    setIsDinheiroChecked(false);
    setManualDinheiroOverride(false);
  };

  // Printing & Sharing Helpers for Cupom Não Fiscal
  const handlePrintReceipt = () => {
    if (!receiptData) return;
    
    // Create an invisible iframe to print clean receipts targeting thermal sizing
    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) return;
    
    const itemsHtml = receiptData.itens
      .map(
        (item) => {
          const isAgendamento = item.type === "service" || item.id?.startsWith("service-");
          const isDiscount = isDiscountItem(item);
          let itemName = item.name.toUpperCase();
          if (isAgendamento && item.petName) {
            itemName += ` - PET: ${item.petName.toUpperCase()}`;
          }
          if (isDiscount && !itemName.includes("DESCONTO") && !itemName.includes("ABATIMENTO")) {
            itemName = `[DESCONTO] ${itemName}`;
          }
          const absPrice = Math.abs(item.price);
          const lineVal = Math.abs(item.price * item.quantity);
          const priceDisplay = isDiscount ? `- R$ ${lineVal.toFixed(2)}` : `R$ ${lineVal.toFixed(2)}`;

          return `
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; ${isDiscount ? 'color: #b91c1c; font-style: italic;' : ''}">
            <span style="flex: 1; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 8px;">
              ${itemName}
            </span>
            <span style="width: 50px; text-align: right;">${item.quantity}x</span>
            <span style="width: 80px; text-align: right; font-weight: bold;">${priceDisplay}</span>
          </div>
          `;
        }
      )
      .join("");
      
    const receiptHtml = `
      <html>
        <head>
          <title>Cupom Não Fiscal</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              width: 72mm;
              margin: 0;
              padding: 4mm;
              font-size: 11px;
              line-height: 1.4;
              color: #000;
              background-color: #fff;
            }
            .center {
              text-align: center;
            }
            .bold {
              font-weight: bold;
            }
            .dashed-line {
              border-top: 1px dashed #000;
              margin: 8px 0;
            }
            .footer {
              text-align: center;
              margin-top: 15px;
              font-size: 10px;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 3px;
            }
          </style>
        </head>
        <body>
          ${currentInfoConta?.Logo ? `
            <div style="text-align: center; margin-bottom: 6px;">
              <img src="${currentInfoConta.Logo}" style="max-height: 48px; max-width: 150px; filter: grayscale(100%) contrast(150%);" referrerPolicy="no-referrer" />
            </div>
          ` : `
            <div style="text-align: center; margin-bottom: 6px;">
              <svg width="48" height="36" viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin: 0 auto;">
                <path d="M12 6C12 6 22 5 26 8C30 11 31 16 30 20C29 25 24 28 18 28H18L18 42C18 43 17 44 16 44H13C12 44 11 43 11 42V10C11 8 11.5 6.5 12 6Z" fill="black" />
                <circle cx="20" cy="16" r="6" fill="white" />
                <circle cx="17.5" cy="13.5" r="1.5" fill="black" />
                <circle cx="20" cy="12" r="1.5" fill="black" />
                <circle cx="22.5" cy="13.5" r="1.5" fill="black" />
                <path d="M20 14.5C18.5 14.5 18 16 20 17C22 16 21.5 14.5 20 14.5Z" fill="black" />
                <path d="M37 28C37 25 40 24 43 24C46 24 49 25 49 28C49 31 46 32 43 33C40 34 37 35 37 38C37 41 40 43 44 43C48 43 50 41 50 38" stroke="black" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none" />
              </svg>
            </div>
          `}
          <div class="center bold" style="font-size: 13px; margin-bottom: 2px;">
            ${currentInfoConta?.NomeEmpresa?.toUpperCase() || "MY BUDDY"}
          </div>
          ${currentInfoConta?.Razao_Social ? `<div class="center" style="font-size: 9px; font-weight: bold; margin-bottom: 2px;">${currentInfoConta.Razao_Social.toUpperCase()}</div>` : ''}
          ${currentInfoConta?.Documento_Identificacao ? `<div class="center font-mono" style="font-size: 9px; margin-bottom: 2px;">CNPJ: ${currentInfoConta.Documento_Identificacao}</div>` : ''}
          ${currentInfoConta?.Fone ? `<div class="center" style="font-size: 9px; margin-bottom: 2px;">FONE: ${currentInfoConta.Fone}</div>` : ''}
          <div class="center bold" style="font-size: 11px; letter-spacing: 1px; margin-top: 4px;">CUPOM NÃO FISCAL</div>
          <div class="dashed-line"></div>
          
          <div style="font-size: 10px; margin-bottom: 4px;">
            <b>ID Venda:</b> ${receiptData.idVenda}<br/>
            <b>Data/Hora:</b> ${receiptData.dataHora}<br/>
            <b>Cliente:</b> ${receiptData.cliente}<br/>
            ${receiptData.pet ? `<b>Pet:</b> ${receiptData.pet}<br/>` : ""}
          </div>
          
          <div class="dashed-line"></div>
          
          <div style="font-weight: bold; display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="flex: 1; text-align: left;">Item</span>
            <span style="width: 50px; text-align: right;">Qtd</span>
            <span style="width: 80px; text-align: right;">Total</span>
          </div>
          
          ${itemsHtml}
          
          <div class="dashed-line"></div>
          
          <div class="summary-row">
            <span>Subtotal:</span>
            <span>R$ ${receiptData.subtotal.toFixed(2)}</span>
          </div>
          ${
            receiptData.desconto > 0
              ? `
          <div class="summary-row">
            <span>Desconto:</span>
            <span>- R$ ${receiptData.desconto.toFixed(2)}</span>
          </div>
          `
              : ""
          }
          <div class="summary-row" style="font-weight: bold; font-size: 12px;">
            <span>Total Geral:</span>
            <span>R$ ${receiptData.total.toFixed(2)}</span>
          </div>
          
          <div class="dashed-line"></div>
          
          <div class="summary-row">
            <span>Forma Pagto:</span>
            <span style="text-align: right; max-width: 60%;">${receiptData.formaPagamento}</span>
          </div>
          ${
            receiptData.troco > 0
              ? `
          <div class="summary-row">
            <span>Valor do Troco:</span>
            <span>R$ ${receiptData.troco.toFixed(2)}</span>
          </div>
          `
              : ""
          }
          
          <div class="dashed-line"></div>
          
          <div class="footer">
            <div style="font-weight: bold; margin-bottom: 4px;">OBRIGADO PELA PREFERÊNCIA!</div>
            ${addressString ? `<div style="font-size: 9px; border-top: 1px dashed #000; padding-top: 4px; margin-top: 4px;">${addressString}</div>` : ''}
            ${masterContactString ? `<div style="font-size: 8.5px; margin-top: 2px; color: #555;">${masterContactString}</div>` : ''}
            <div style="font-size: 8px; margin-top: 4px; color: #888;">Gerado via My Buddy App</div>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() {
                window.parent.document.body.removeChild(window.frameElement);
              }, 100);
            };
          </script>
        </body>
      </html>
    `;
    
    doc.open();
    doc.write(receiptHtml);
    doc.close();
  };

  const buildWhatsAppReceiptText = (
    rData: NonNullable<typeof receiptData>,
    empresaNome: string,
    link: string
  ) => {
    let msg = `🧾 *COMPROVANTE DE PAGAMENTO*\n`;
    msg += `🏢 *${empresaNome.toUpperCase()}*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📋 *Pedido:* ${rData.idVenda.toUpperCase().startsWith("PS_") ? rData.idVenda.toUpperCase() : `PS_${rData.idVenda.toUpperCase()}`}\n`;
    msg += `👤 *Cliente:* ${rData.cliente.toUpperCase()}\n`;
    if (rData.pet) {
      msg += `🐾 *Pet:* ${rData.pet.toUpperCase()}\n`;
    }
    msg += `📅 *Data/Hora:* ${rData.dataHora}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `*ITENS / SERVIÇOS:*\n`;

    rData.itens.forEach((item, idx) => {
      const isDiscount = isDiscountItem(item);
      const { mainName, subName } = getItemNameParts(item);
      const absPrice = Math.abs(item.price);
      const lineTotal = Math.abs(item.price * item.quantity);
      
      if (isDiscount) {
        msg += `${idx + 1}. 🏷️ *${mainName}* ${subName ? `(${subName})` : ""}\n`;
        msg += `   └ ${item.quantity}x (- R$ ${absPrice.toFixed(2)}) = *- R$ ${lineTotal.toFixed(2)}*\n`;
      } else {
        msg += `${idx + 1}. 🔹 *${mainName}* ${subName ? `(${subName})` : ""}\n`;
        msg += `   └ ${item.quantity}x R$ ${absPrice.toFixed(2)} = *R$ ${lineTotal.toFixed(2)}*\n`;
      }
    });

    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💵 *Subtotal:* R$ ${rData.subtotal.toFixed(2)}\n`;
    if (rData.desconto > 0) {
      msg += `🏷️ *Desconto / Abatimento:* - R$ ${rData.desconto.toFixed(2)}\n`;
    }
    msg += `💰 *TOTAL A PAGAR:* R$ ${rData.total.toFixed(2)}\n`;
    msg += `💳 *Forma de Pagto:* ${rData.formaPagamento}\n`;
    if (rData.troco > 0) {
      msg += `🪙 *Troco:* R$ ${rData.troco.toFixed(2)}\n`;
    }
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📄 *Cupom Digital Oficial:*\n${link}\n\n`;
    msg += `_Obrigado pela preferência e confiança!_ ✨`;
    return msg;
  };

  const handleSendWhatsApp = async () => {
    if (!receiptData) return;
    
    const container = thermalReceiptRef.current || fullReceiptRef.current;
    if (!container) {
      alert("Comprovante visual não encontrado para compartilhamento.");
      return;
    }

    try {
      // 1. Generate image of the coupon element using html-to-image
      const imageOptions = {
        backgroundColor: "#ffffff", // Solid white for realistic thermal paper style
        pixelRatio: 2, // Retains clarity on high DPI displays
        skipFonts: true,
        cacheBust: true,
      };

      const dataUrl = await toPng(container, imageOptions);
      const mimeType = "image/png";
      const fileName = `comprovante_${receiptData.idVenda}.png`;

      // Helper to convert base64 dataUrl directly to Blob
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

      const blob = getBlobFromDataUrl(dataUrl);
      const fileToShare = new File([blob], fileName, { type: mimeType });

      // Dynamic link for online visual receipt
      const linkVisualizacao = `${window.location.origin}/?idVenda=${receiptData.idVenda}`;
      const detailedText = buildWhatsAppReceiptText(
        receiptData,
        currentInfoConta?.NomeEmpresa || "My Buddy",
        linkVisualizacao
      );

      // 2. Try browser native Web Share API
      const canUseNativeShare = !!(navigator.share && navigator.canShare);
      if (canUseNativeShare && navigator.canShare({ files: [fileToShare] })) {
        await navigator.share({
          files: [fileToShare],
          title: `Comprovante - ${currentInfoConta?.NomeEmpresa || "My Buddy"}`,
          text: detailedText
        });
      } else {
        // Fallback to text link if navigator.share is not supported or refuses files
        console.warn("Dispositivo ou navegador não suporta compartilhamento de arquivos nativo. Usando fallback de texto via WhatsApp.");
        
        let phone = receiptData.whatsappPhone || "";
        phone = phone.replace(/\D/g, "");
        const targetPhone = window.prompt("Digite o número do WhatsApp com DDD (apenas números) para enviar:", phone);
        if (targetPhone === null) return;
        const finalPhone = targetPhone.replace(/\D/g, "");

        const encodedText = encodeURIComponent(detailedText);
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${finalPhone}&text=${encodedText}`;
        window.open(whatsappUrl, "_blank");
      }
    } catch (error: any) {
      console.error("Erro na captura ou compartilhamento nativo do cupom:", error);
      alert("Não foi possível gerar a imagem ou compartilhar. Tentando enviar como link de texto.");
      
      let phone = receiptData.whatsappPhone || "";
      phone = phone.replace(/\D/g, "");
      const finalPhone = phone;

      const linkVisualizacao = `${window.location.origin}/?idVenda=${receiptData.idVenda}`;
      const detailedText = buildWhatsAppReceiptText(
        receiptData,
        currentInfoConta?.NomeEmpresa || "My Buddy",
        linkVisualizacao
      );

      const encodedText = encodeURIComponent(detailedText);
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${finalPhone}&text=${encodedText}`;
      window.open(whatsappUrl, "_blank");
    }
  };

  const isAnonymous = !selectedClienteId;
  const clientNameRepresentation = isAnonymous 
    ? (vendaRapidaNome.trim() || "Cliente Geral") 
    : (clientes.find((c) => c.Id === selectedClienteId)?.Nome || "Cliente Cadastrado");

  // --- CALC SOMA, TROCO AND CHECKS ---
  const isSaida = totalCartValue < 0 || cartItems.some((item) => item.checked !== false && item.tipo === "Saída") || clientNameRepresentation.toUpperCase() === "MINHAS DESPESAS";
  const targetAbsTotal = Math.abs(totalCartValue);

  const moneyValuePix = Math.abs(parseFloat(valPix) || 0);
  const moneyValueDebito = Math.abs(parseFloat(valDebito) || 0);
  const moneyValueCredito = Math.abs(parseFloat(valCredito) || 0);
  const moneyValueDinheiro = isDinheiroChecked ? Math.abs(parseFloat(valDinheiro) || 0) : 0;

  // Default moneyValueDinheiro to targetAbsTotal for Saída if no payments entered yet
  const effectiveDinheiro = (isSaida && (moneyValuePix + moneyValueDebito + moneyValueCredito + moneyValueDinheiro === 0)) ? targetAbsTotal : moneyValueDinheiro;

  const totalPaymentsSum = moneyValuePix + moneyValueDebito + moneyValueCredito + effectiveDinheiro;
  
  const checkedItemsCount = cartItems.filter((item) => item.checked !== false).length;

  // Regra Troco: Se pagamentos > total do carrinho, e tem participação de Dinheiro, calculate troco
  const changeValue = (!isSaida && totalPaymentsSum > totalCartValue)
    ? (totalPaymentsSum - totalCartValue)
    : (isSaida && totalPaymentsSum > targetAbsTotal)
    ? (totalPaymentsSum - targetAbsTotal)
    : 0;

  // Visual paid indicator
  // Fica verde com o ícone "✓" assim que o valor do carrinho estiver integralmente coberto (ou com o troco correto)
  const isFullyPaid = checkedItemsCount > 0 && (
    isSaida ? (totalPaymentsSum >= targetAbsTotal - 0.015) : (totalPaymentsSum >= totalCartValue - 0.015)
  );


  // --- MAIN RESOLVE FORM BUTTON SUBMISSION ---
  const handleExecutePayment = () => {
    if (userPermissionLevel === 2) {
      showAlert("Acesso Restrito 🔒", "O perfil Operacional (Nível 2) não tem acesso às operações de faturamento ou caixa.");
      return;
    }
    if (userPermissionLevel === 3) {
      showAlert("Acesso Restrito 🔒", "Nível de permissão 3 (Consulta e Pré-Venda) não autoriza faturamento no Caixa.");
      return;
    }

    const checkedItemsCount = cartItems.filter((item) => item.checked !== false).length;
    if (cartItems.length === 0) {
      showAlert("Carrinho Vazio ⚠️", "Por favor, insira produtos ou agendamentos no carrinho antes de faturar.");
      return;
    }
    if (checkedItemsCount === 0) {
      showAlert("Nenhum Item Selecionado ⚠️", "Por favor, marque pelo menos um item no carrinho para faturar.");
      return;
    }

    // --- SMART FIFO STOCK VALIDATION ---
    const productQuantities: { [productId: string]: { name: string; qty: number } } = {};
    const checkedCartItems = cartItems.filter((item) => item.checked !== false);

    for (const item of checkedCartItems) {
      let productId = item.originalId;

      if (item.type === "pre-pedido") {
        productId = item.productId || item.originalId;
      } else if (item.type === "service") {
        const detRecord = detalhesMov?.find((d) => d.Id === item.originalId);
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

    // Validar limites e faturamento
    if (!isSaida && totalPaymentsSum < totalCartValue - 0.01) {
      const restValueForFiado = totalCartValue - totalPaymentsSum;

      // Fiado / Sobra:
      // Se o Cliente for Cadastrado (selectedClienteId preenchido), lança no limite de crédito
      if (!isAnonymous) {
        const clientObj = clientes.find((c) => c.Id === selectedClienteId)!;
        const currentDebito = clientObj.SaldoDevedor || 0;
        const creditLimit = clientObj.LimiteCredito || 0;

        if (creditLimit > 0 && (currentDebito + restValueForFiado > creditLimit)) {
          showAlert(
            "Limite de Crédito Excedido ⛔",
            `O cliente ${clientObj.Nome} tem R$ ${currentDebito.toFixed(2)} acumulado. Adicionar mais R$ ${restValueForFiado.toFixed(2)} de saldo excederá o limite de fiado de R$ ${creditLimit.toFixed(2)}.`
          );
          return;
        }

        // Se passar ou não possuir restrição
        showConfirm(
          "Faturar com Saldo Pendente (Fiado)",
          `Deseja faturar esta venda para ${clientNameRepresentation} lançando R$ ${restValueForFiado.toFixed(2)} como saldo devedor/fiado?`,
          () => applyFaturamentoToDatabase(restValueForFiado)
        );
      } else {
        // Se for Cliente Geral ou Balcão, bloqueia!
        showAlert(
          "Bloqueio de Faturamento ⛔",
          `Vendas rápidas ou com Cliente Geral sem cadastro não autorizam fiado/faturamento com saldo em aberto. Por favor, adicione as formas de pagamento até cobrir o total de R$ ${totalCartValue.toFixed(2)}.`
        );
      }
    } else if (isSaida && totalPaymentsSum < targetAbsTotal - 0.01) {
      const restValueForFiado = targetAbsTotal - totalPaymentsSum;

      if (!isAnonymous) {
        const clientObj = clientes.find((c) => c.Id === selectedClienteId)!;
        const currentDebito = clientObj.SaldoDevedor || 0;
        const creditLimit = clientObj.LimiteCredito || 0;

        if (creditLimit > 0 && (currentDebito + restValueForFiado > creditLimit)) {
          showAlert(
            "Limite de Crédito Excedido ⛔",
            `O cliente ${clientObj.Nome} tem R$ ${currentDebito.toFixed(2)} acumulado. Adicionar mais R$ ${restValueForFiado.toFixed(2)} de saldo excederá o limite de fiado de R$ ${creditLimit.toFixed(2)}.`
          );
          return;
        }

        showConfirm(
          "Faturar Despesa com Saldo Pendente (Fiado)",
          `Deseja faturar esta saída/despesa para ${clientNameRepresentation} lançando R$ ${restValueForFiado.toFixed(2)} como saldo devedor/fiado?`,
          () => applyFaturamentoToDatabase(restValueForFiado)
        );
      } else {
        showAlert(
          "Bloqueio de Faturamento ⛔",
          `Para finalizar esta despesa/saída, o valor pago deve ser de pelo menos R$ ${targetAbsTotal.toFixed(2)}.`
        );
      }
    } else {
      // Venda ou Despesa paga integralmente ou com troco
      showConfirm(
        isSaida ? "Confirmar Lançamento de Despesa/Saída" : "Confirmar Fechamento de Venda",
        isSaida
          ? `Deseja registrar esta despesa/saída no valor de R$ ${targetAbsTotal.toFixed(2)} de forma imediata?`
          : `Deseja finalizar esta venda no valor total de R$ ${totalCartValue.toFixed(2)} de forma imediata?`,
        () => applyFaturamentoToDatabase(0)
      );
    }
  };

  const applyFaturamentoToDatabase = (fiadoToLaunch: number) => {
    if (isFaturamentoProcessing) return;
    setIsFaturamentoProcessing(true);
    try {
      const userMasterId = currentUser?.IdUsuarioMaster || currentUser?.Id || currentUserOwnerId;
      
      // Update clients list if saving to credit
      let updatedClientList = [...clientes];
      if (fiadoToLaunch > 0 && selectedClienteId) {
        updatedClientList = clientes.map((c) => {
          if (c.Id === selectedClienteId) {
            const currentDebito = Number(c.SaldoDevedor) || 0;
            return { ...c, SaldoDevedor: currentDebito + fiadoToLaunch };
          }
          return c;
        });
      }

      // Check for current open register or open one
      let currentRegister = caixaDiario.find(
        (c) => c.IdUsuarioMaster === userMasterId && c.Status === "Aberto"
      );
      const updatedRegisterList = [...caixaDiario];

      if (!currentRegister) {
        currentRegister = {
          Id: `caixa-${Date.now()}`,
          IdUsuarioMaster: userMasterId,
          DataAbertura: new Date().toISOString().split("T")[0],
          SaldoInicial: 0,
          Status: "Aberto",
          IdUsuarioDono: currentUserOwnerId,
        };
        updatedRegisterList.push(currentRegister);
      }

      // Generate unique sale ID and stringified items for history tracking
      const finalSaleId = `sale-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const checkedCartItems = cartItems
        .filter((item) => item.checked !== false)
        .map((item) => ({
          ...item,
          originalPrice: item.originalPrice ?? item.price
        }));
      const stringifiedItems = JSON.stringify(checkedCartItems);

      let transactionPositiveSubtotal = 0;
      let transactionTotalDiscounts = 0;
      let transactionValorCobrado = 0;

      checkedCartItems.forEach((item) => {
        const isDiscount = isDiscountItem(item);
        const qty = item.quantity || 1;
        const absPrice = Math.abs(item.price);
        const origPrice = typeof item.originalPrice === "number" ? Math.abs(item.originalPrice) : absPrice;

        if (isDiscount) {
          transactionTotalDiscounts += absPrice * qty;
        } else {
          transactionPositiveSubtotal += origPrice * qty;
          if (origPrice > absPrice) {
            transactionTotalDiscounts += (origPrice - absPrice) * qty;
          }
          transactionValorCobrado += absPrice * qty;
        }
      });

      const transactionValorOriginal = transactionPositiveSubtotal > 0 ? transactionPositiveSubtotal : Math.abs(totalCartValue);
      const calculatedDiscount = transactionTotalDiscounts > 0 
        ? transactionTotalDiscounts 
        : Math.max(0, transactionValorOriginal - transactionValorCobrado);

      // Decrement stock levels for products in the cart from lotesProdutos
      let updatedLotes = lotesProdutos.map((lot) => ({ ...lot }));
      checkedCartItems.forEach((item) => {
        let productId = item.originalId;

        if (item.type === "pre-pedido") {
          productId = item.productId || item.originalId;
        } else if (item.type === "service") {
          // Find the scheduler item to get the associated product
          const detRecord = detalhesMov?.find((d) => d.Id === item.originalId);
          if (detRecord) {
            productId = detRecord.Servico;
          }
        }

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
      });

      // Save transactions
      const updatedMovList = [...caixaMovimentacao];
      let updatedSaldos = [...caixaSaldosForma];

      const nowIso = new Date().toISOString();

      // Determine actual appointment/service date (DataAgendamento)
      let saleDataAgendamento: string | undefined;
      for (const item of cartItems) {
        if (item.dataAgendamento) {
          saleDataAgendamento = item.dataAgendamento;
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

      const isTransactionSaida =
        clientNameRepresentation.toUpperCase() === "MINHAS DESPESAS" ||
        (selectedClienteId && clientes.find(c => c.Id === selectedClienteId)?.Nome?.toUpperCase() === "MINHAS DESPESAS") ||
        checkedCartItems.some(item => item.tipo === "Saída") ||
        totalCartValue < 0;

      const targetAbsTotal = Math.abs(totalCartValue);

      let effectivePix = Math.abs(moneyValuePix);
      let effectiveDebito = Math.abs(moneyValueDebito);
      let effectiveCredito = Math.abs(moneyValueCredito);
      let effectiveDinheiro = isDinheiroChecked ? Math.abs(moneyValueDinheiro) : 0;

      if (isTransactionSaida && (effectivePix + effectiveDebito + effectiveCredito + effectiveDinheiro === 0)) {
        effectiveDinheiro = targetAbsTotal;
      }

      const effectivePaymentsSum = effectivePix + effectiveDebito + effectiveCredito + effectiveDinheiro;
      const netDinheiro = effectiveDinheiro - ((!isTransactionSaida && totalPaymentsSum > totalCartValue) ? changeValue : (isTransactionSaida && effectivePaymentsSum > targetAbsTotal) ? changeValue : 0);

      // Define standard payment mapping
      const validPaymentsToRecord = [
        { key: "Pix", val: effectivePix },
        { key: "Cartão de Débito", val: effectiveDebito },
        { key: "Cartão de Crédito", val: effectiveCredito },
        { key: "Dinheiro", val: netDinheiro },
        { key: "Fiado", val: fiadoToLaunch }
      ].filter((p) => Math.abs(p.val) > 0.001);

      const transactionType: "Entrada" | "Saída" = isTransactionSaida ? "Saída" : "Entrada";

      let expenseObs = "";
      if (selectedMovId) {
        const movObj = movimentos.find(m => m.Id === selectedMovId);
        if (movObj?.Observacao) {
          expenseObs = movObj.Observacao;
        }
      }
      if (!expenseObs && checkedCartItems.length > 0) {
        expenseObs = checkedCartItems.map(i => i.name).filter(Boolean).join(", ");
      }

      validPaymentsToRecord.forEach((pay, index) => {
        const transId = `mov-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 5)}`;
        const registerMov: CaixaMovimentacao = {
          Id: transId,
          IdCaixaDiario: currentRegister!.Id,
          Tipo: transactionType,
          Origem: "Venda",
          Valor: Math.abs(pay.val),
          FormaPagamento: pay.key,
          DataHora: nowIso,
          // Extended values for history & audits
          IdVenda: finalSaleId,
          NomeCliente: clientNameRepresentation,
          ClienteId: selectedClienteId || undefined,
          DocumentoCliente: cpfCnpj.trim() || undefined,
          Itens: stringifiedItems,
          StatusVenda: "Ativo",
          ValorTotalVenda: totalCartValue,
          ValorOriginal: transactionValorOriginal,
          ValorCobrado: transactionValorCobrado,
          DataAgendamento: saleDataAgendamento,
          Observacao: expenseObs,
          IdUsuarioDono: currentUserOwnerId,
        };
        updatedMovList.push(registerMov);

        // Update consolidated ledger
        let isUpdated = false;
        updatedSaldos = updatedSaldos.map((sf) => {
          if (sf.IdUsuarioMaster === userMasterId && sf.FormaPagamento.toLowerCase() === pay.key.toLowerCase()) {
            isUpdated = true;
            const currentVal = Number(sf.SaldoAcumulado) || 0;
            const newVal = isTransactionSaida ? currentVal - Math.abs(pay.val) : currentVal + Math.abs(pay.val);
            return { ...sf, SaldoAcumulado: newVal };
          }
          return sf;
        });

        if (!isUpdated) {
          updatedSaldos.push({
            Id: `saldo-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 5)}`,
            IdUsuarioMaster: userMasterId,
            FormaPagamento: pay.key,
            SaldoAcumulado: isTransactionSaida ? -Math.abs(pay.val) : Math.abs(pay.val),
          });
        }
      });

      // If scheduler appointments were pulled, set them to Pago = true (only if they are checked) and inject payment timestamp
      const paymentTimestamp = new Date().toISOString();
      const importedSchedulerDetsList = checkedCartItems
        .filter((item) => item.id.startsWith("service-"))
        .map((item) => item.originalId);

      const nextAppointmentsDetailsList = detalhesMov.map((det) => {
        if (importedSchedulerDetsList.includes(det.Id)) {
          return { ...det, Pago: true, PagoEm: paymentTimestamp };
        }
        return det;
      });

      // If pre-sales (Celular Mobile orders) were pulled, set status to Faturado (only if they are checked and no items of that pre-pedido are unchecked)
      const prePedidoIdsPaid = Array.from(new Set(
        checkedCartItems
          .filter((item) => item.type === "pre-pedido")
          .map((item) => item.originalId)
      ));

      const updatedPrePedidos = prePedidos.map((pre) => {
        const hasUncheckedItemsOfThisPre = cartItems.some(
          (item) => item.type === "pre-pedido" && item.originalId === pre.Id && item.checked === false
        );
        if ((prePedidoIdsPaid.includes(pre.Id) || (selectedPreVendaId && pre.Id === selectedPreVendaId)) && !hasUncheckedItemsOfThisPre) {
          return { ...pre, Status: "Faturado" };
        }
        return pre;
      });

      // Dispatch triggers back to main controller
      onUpdateDetalhesMov(nextAppointmentsDetailsList);
      onUpdatePrePedidos(updatedPrePedidos);
      onUpdateCaixa(updatedRegisterList, updatedMovList, updatedSaldos);
      onUpdateLotes?.(updatedLotes);
      if (fiadoToLaunch > 0) {
        onUpdateClientes(updatedClientList);
      }

      // Prepare receipt details for Cupom Não Fiscal
      const matchedClient = selectedClienteId ? clientes.find((c) => c.Id === selectedClienteId) : null;
      const petNameFromCart = checkedCartItems.find((item) => item.petName)?.petName || "";
      
      const paymentMethodsUsed: string[] = [];
      if (effectivePix > 0) paymentMethodsUsed.push(`Pix: R$ ${effectivePix.toFixed(2)}`);
      if (effectiveDebito > 0) paymentMethodsUsed.push(`Débito: R$ ${effectiveDebito.toFixed(2)}`);
      if (effectiveCredito > 0) paymentMethodsUsed.push(`Crédito: R$ ${effectiveCredito.toFixed(2)}`);
      if (netDinheiro > 0) paymentMethodsUsed.push(`Dinheiro: R$ ${netDinheiro.toFixed(2)}`);
      if (fiadoToLaunch > 0) paymentMethodsUsed.push(`Fiado: R$ ${fiadoToLaunch.toFixed(2)}`);
      const paymentMethodString = paymentMethodsUsed.join(", ") || "Dinheiro";

      setReceiptData({
        idVenda: finalSaleId,
        dataHora: new Date().toLocaleString("pt-BR"),
        cliente: clientNameRepresentation,
        pet: petNameFromCart,
        itens: checkedCartItems,
        subtotal: transactionValorOriginal,
        desconto: calculatedDiscount,
        total: totalCartValue,
        formaPagamento: paymentMethodString,
        troco: changeValue,
        whatsappPhone: matchedClient?.Telefone || "",
      });
      setShowReceiptModal(true);

      // Clean Caixa container state
      handleResetCaixaState();
      setIsFaturamentoProcessing(false);
    } catch (err: any) {
      setIsFaturamentoProcessing(false);
      showAlert("Falha no faturamento Exception", `Ocorreu um erro no faturamento: ${err?.message || err}`);
    }
  };

  // Helper inputs for dropdown matching
  const hasClientSelected = selectedClienteId !== "";
  const clientMatchingMovs = hasClientSelected 
    ? scopedMovimentos.filter((m) => {
        // O ID do Cliente seja igual ao Cliente Selecionado
        const isClientMatch = m.Cliente === selectedClienteId || m.Cliente === clientes.find(c => c.Id === selectedClienteId)?.Nome;
        if (!isClientMatch) return false;

        // Find details of this movement to verify:
        // - Payment Status is "Pendente" (or not paid: !d.Pago)
        // - Total Value of the service is greater than 0
        const detailsForMov = detalhesMov.filter((d) => d.IdCadMovDiario === m.Id && d.Ativo);
        const hasPendingUnpaidWithValue = detailsForMov.some(
          (d) => !d.Pago && (d.TotalDaLinha > 0 || (d.PrecoUnitario * d.Quantidade) > 0)
        );

        return hasPendingUnpaidWithValue;
      })
    : [];

  // Filter pending pre-sales
  const pendingPreSales = scopedPrePedidos.filter((p) => p.Status !== "Faturado");

  return (
    <div id="caixa-pdv-sheet-view" className="w-full max-w-7xl mx-auto px-4 py-6 font-sans">
      
      {/* Title Header with Store info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-slate-800 flex items-center gap-2">
            <Store className="h-6 w-6 text-emerald-600" />
            Terminal de Caixa Centralizado PDV
          </h1>
          <p className="text-xs text-slate-500">
            Realize vendas rápidas de balcão de produtos/serviços, importe agendamentos diários ou fature pré-vendas recebidas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Operacional Online
          </span>
          <button 
            type="button"
            onClick={handleResetCaixaState}
            className="px-3 py-1.5 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
          >
            Limpar Caixa
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* COLUNA ESQUERDA: CAMPOs DE IDENTIFICAÇÃO E GRID DE VENDAS */}
        <div className="lg:col-span-7 flex flex-col gap-6">

          {/* Form Identification Cards */}
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 flex flex-col gap-4">
            <h3 className="font-bold text-xs tracking-wider text-slate-400 uppercase mb-1 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              Identificação do Cliente / Venda
            </h3>

            {/* LINHA 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 z-20">
              <div className="relative" ref={clienteDropdownRef}>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">CLIENTE CADASTRADO</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center z-10 pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </span>
                  <input
                    type="text"
                    value={isClienteDropdownOpen ? clienteSearch : (selectedClienteId ? (clientes.find(c => c.Id === selectedClienteId)?.Nome || "") : "")}
                    onChange={(e) => {
                      if (!isClienteDropdownOpen) setIsClienteDropdownOpen(true);
                      setClienteSearch(e.target.value);
                    }}
                    onFocus={() => {
                      setIsClienteDropdownOpen(true);
                      setClienteSearch("");
                    }}
                    placeholder="Consumidor de Balcão (Sem cadastro) - Pesquisar..."
                    className="w-full pl-9 pr-14 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-emerald-500 focus:bg-white focus:outline-none rounded-xl text-xs font-semibold text-slate-800 transition"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
                    {selectedClienteId && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClienteSelect("");
                          setClienteSearch("");
                        }}
                        className="text-slate-400 hover:text-slate-600 p-0.5 text-[9px] bg-slate-200 hover:bg-slate-300 rounded-full transition cursor-pointer font-sans font-bold"
                      >
                        ✕
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsClienteDropdownOpen(!isClienteDropdownOpen)}
                      className="text-slate-400 hover:text-slate-600 p-0.5 transition cursor-pointer"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {isClienteDropdownOpen && (
                  <div className="absolute left-0 right-0 z-50 mt-1 max-h-52 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100 custom-scrollbar">
                    <button
                      type="button"
                      onMouseDown={() => {
                        handleClienteSelect("");
                        setIsClienteDropdownOpen(false);
                        setClienteSearch("");
                      }}
                      className={`w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-500 text-xs font-medium transition italic ${
                        !selectedClienteId ? "bg-emerald-50/70 text-emerald-800 font-bold" : ""
                      }`}
                    >
                      -- Consumidor de Balcão (Sem cadastro) --
                    </button>
                    {scopedClientes
                      .filter((c) => c.Ativo && c.Nome.toLowerCase().includes(clienteSearch.toLowerCase()))
                      .map((c) => (
                        <button
                          key={c.Id}
                          type="button"
                          onMouseDown={() => {
                            handleClienteSelect(c.Id);
                            setIsClienteDropdownOpen(false);
                            setClienteSearch("");
                          }}
                          className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 text-slate-800 text-xs font-medium transition flex items-center justify-between cursor-pointer ${
                            selectedClienteId === c.Id ? "bg-emerald-50/70 text-emerald-800 font-bold" : ""
                          }`}
                        >
                          <div>
                            <div className="text-slate-900 font-bold">{c.Nome}</div>
                            {c.Telefone && (
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                📞 Telefone: {c.Telefone}
                              </div>
                            )}
                          </div>
                          {selectedClienteId === c.Id ? (
                            <span className="text-emerald-600 font-bold text-sm bg-emerald-100/60 p-1 rounded-full">✓</span>
                          ) : (
                            <span className="text-[9px] bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 border border-slate-200 px-2 py-1 rounded-md font-bold uppercase font-mono shadow-3xs transition">
                              Selecionar
                            </span>
                          )}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              <div className="relative" ref={movDropdownRef}>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  BUSCA MOVIMENTO DIÁRIO{!hasClientSelected && " (Selecione Cliente Primeiro)"}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center z-10 pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </span>
                  <input
                    disabled={!hasClientSelected}
                    type="text"
                    value={isMovDropdownOpen ? movSearch : (selectedMovId ? `Movimento ID - ${selectedMovId.substring(4, 9)}` : "")}
                    onChange={(e) => {
                      if (!isMovDropdownOpen) setIsMovDropdownOpen(true);
                      setMovSearch(e.target.value);
                    }}
                    onFocus={() => {
                      setIsMovDropdownOpen(true);
                      setMovSearch("");
                    }}
                    placeholder={hasClientSelected ? "Escolha Agendamento do Cliente..." : "Primeiro selecione o cliente acima"}
                    className={`w-full pl-9 pr-14 py-2 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 transition ${
                      hasClientSelected 
                        ? "border-slate-300 bg-emerald-50/50 text-slate-800 cursor-text"
                        : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                    }`}
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
                    {selectedMovId && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMovSelect("");
                          setMovSearch("");
                        }}
                        className="text-slate-400 hover:text-slate-600 p-0.5 text-[9px] bg-slate-200 hover:bg-slate-300 rounded-full transition cursor-pointer font-sans font-bold"
                      >
                        ✕
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={!hasClientSelected}
                      onClick={() => setIsMovDropdownOpen(!isMovDropdownOpen)}
                      className="text-slate-400 hover:text-slate-600 p-0.5 transition cursor-pointer disabled:opacity-50"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {isMovDropdownOpen && hasClientSelected && (
                  <div className="absolute left-0 right-0 z-50 mt-1 max-h-52 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100 custom-scrollbar">
                    <button
                      type="button"
                      onMouseDown={() => {
                        handleMovSelect("");
                        setIsMovDropdownOpen(false);
                        setMovSearch("");
                      }}
                      className={`w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-500 text-xs font-medium transition italic ${
                        !selectedMovId ? "bg-emerald-50/70 text-emerald-800 font-bold" : ""
                      }`}
                    >
                      -- Sem agendamento selecionado --
                    </button>
                    {clientMatchingMovs
                      .filter((m) => {
                        const label = `Movimento ID - ${m.Id.substring(4, 9)} ${m.Observacao || ""}`;
                        return label.toLowerCase().includes(movSearch.toLowerCase());
                      })
                      .map((m) => (
                        <button
                          key={m.Id}
                          type="button"
                          onMouseDown={() => {
                            handleMovSelect(m.Id);
                            setIsMovDropdownOpen(false);
                            setMovSearch("");
                          }}
                          className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 text-slate-805 text-xs font-medium transition flex items-center justify-between cursor-pointer ${
                            selectedMovId === m.Id ? "bg-emerald-50/70 text-emerald-800 font-bold" : ""
                          }`}
                        >
                          <div>
                            <div className="text-slate-900 font-bold">Movimento: ID {m.Id.substring(4, 9)}</div>
                            {m.Observacao && (
                              <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                                📝 obs: {m.Observacao}
                              </div>
                            )}
                          </div>
                          {selectedMovId === m.Id ? (
                            <span className="text-emerald-600 font-bold text-sm bg-emerald-100/60 p-1 rounded-full">✓</span>
                          ) : (
                            <span className="text-[9px] bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 border border-slate-200 px-2 py-1 rounded-md font-bold uppercase font-mono shadow-3xs transition">
                              Selecionar
                            </span>
                          )}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* LINHA 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">VENDA RÁPIDA (Nome do Cliente)</label>
                <input
                  type="text"
                  placeholder="Ex: André (Assume Cliente Geral se vazio)"
                  value={vendaRapidaNome}
                  onChange={(e) => setVendaRapidaNome(e.target.value)}
                  onBlur={handleVendaRapidaBlur}
                  onKeyDown={handleVendaRapidaKeyDown}
                  className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">CPF/CNPJ (Para Nota Balcão)</label>
                <input
                  ref={cpfInputRef}
                  type="text"
                  placeholder="Opcional - Ex: 123.456.789-00"
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* LINHA 3 */}
            <div className="relative" ref={preVendaDropdownRef}>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">BUSCA PRÉ-VENDA (Importar Celular)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center z-10 pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </span>
                <input
                  type="text"
                  value={isPreVendaDropdownOpen ? preVendaSearch : (selectedPreVendaId ? (pendingPreSales.find(p => p.Id === selectedPreVendaId)?.NomeCliente || "Pré-Venda Importada") : "")}
                  onChange={(e) => {
                    if (!isPreVendaDropdownOpen) setIsPreVendaDropdownOpen(true);
                    setPreVendaSearch(e.target.value);
                  }}
                  onFocus={() => {
                    setIsPreVendaDropdownOpen(true);
                    setPreVendaSearch("");
                  }}
                  placeholder="Selecione ou busque uma Pré-Venda Pendente..."
                  className="w-full pl-9 pr-14 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-emerald-500 focus:bg-white focus:outline-none rounded-xl text-xs font-semibold text-slate-800 transition"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
                  {selectedPreVendaId && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreVendaSelect("");
                        setPreVendaSearch("");
                      }}
                      className="text-slate-400 hover:text-slate-600 p-0.5 text-[9px] bg-slate-200 hover:bg-slate-300 rounded-full transition cursor-pointer font-sans font-bold"
                    >
                      ✕
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsPreVendaDropdownOpen(!isPreVendaDropdownOpen)}
                    className="text-slate-400 hover:text-slate-600 p-0.5 transition cursor-pointer"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {isPreVendaDropdownOpen && (
                <div className="absolute left-0 right-0 z-50 mt-1 max-h-52 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100 custom-scrollbar">
                  <button
                    type="button"
                    onMouseDown={() => {
                      handlePreVendaSelect("");
                      setIsPreVendaDropdownOpen(false);
                      setPreVendaSearch("");
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-500 text-xs font-medium transition italic ${
                      !selectedPreVendaId ? "bg-emerald-50/70 text-emerald-800 font-bold" : ""
                    }`}
                  >
                    -- Sem pré-venda selecionada --
                  </button>
                  {pendingPreSales
                    .filter((p) => {
                      const desc = `${p.NomeCliente} ${p.Data} ${p.Hora} (ID: ${p.Id.substring(0, 6)})`;
                      return desc.toLowerCase().includes(preVendaSearch.toLowerCase());
                    })
                    .map((p) => (
                      <button
                        key={p.Id}
                        type="button"
                        onMouseDown={() => {
                          handlePreVendaSelect(p.Id);
                          setIsPreVendaDropdownOpen(false);
                          setPreVendaSearch("");
                        }}
                        className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 text-slate-800 text-xs font-medium transition flex items-center justify-between cursor-pointer ${
                          selectedPreVendaId === p.Id ? "bg-emerald-50/70 text-emerald-800 font-bold" : ""
                        }`}
                      >
                        <div>
                          <div className="text-slate-900 font-bold">{p.NomeCliente}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-2">
                            <span>📅 Data/Hora: {p.Data} {p.Hora}</span>
                            <span className="bg-slate-100 px-1 rounded text-[9px]">ID: {p.Id.substring(0,6)}</span>
                          </div>
                        </div>
                        {selectedPreVendaId === p.Id ? (
                          <span className="text-emerald-600 font-bold text-sm bg-emerald-100/60 p-1 rounded-full">✓</span>
                        ) : (
                          <span className="text-[9px] bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 border border-slate-200 px-2 py-1 rounded-md font-bold uppercase font-mono shadow-3xs transition">
                            Selecionar
                          </span>
                        )}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Carrinho Items Grid Area */}
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 flex flex-col gap-4">
            
            {/* Input Adder horizontal alignment */}
            <div className="relative">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                [+] ADICIONAR ITEM (Código de Barras ou Digitação)
              </label>
              <div className="relative">
                <input
                  ref={itemInputRef}
                  type="text"
                  placeholder="Bipe com o Leitor ou digite o nome do produto..."
                  value={itemQuery}
                  onChange={(e) => {
                    setItemQuery(e.target.value);
                    setShowProductDropdown(true);
                  }}
                  onKeyDown={handleQueryKeyDown}
                  className="w-full text-xs rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <ScanLine className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>

              {/* Product list filtered popup drop lists */}
              {showProductDropdown && filteredProducts.length > 0 && (
                <div className="absolute left-0 right-0 mt-1.5 max-h-56 overflow-y-auto bg-white rounded-xl shadow-lg border border-slate-100 z-10 custom-scrollbar">
                  {filteredProducts.map((p) => (
                    <button
                      key={p.Id}
                      type="button"
                      onClick={() => addGenericProductToCart(p)}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-xs border-b border-slate-100 flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <p className="font-semibold text-slate-800">{p.Nome}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {p.CodigoDeBarras ? `Código: ${p.CodigoDeBarras}` : "Sem código"} • {p.Tipo}
                        </p>
                      </div>
                      <span className="font-bold text-emerald-600">R$ {p.Preco.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Carrinho Items Table Grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase bg-slate-50">
                    <th className="py-2.5 px-3 text-center w-12">
                      <input
                        type="checkbox"
                        checked={cartItems.length > 0 && cartItems.every((item) => item.checked !== false)}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          setCartItems((prev) => prev.map((item) => ({ ...item, checked: isChecked })));
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                        title="Selecionar todos os itens"
                      />
                    </th>
                    <th className="py-2.5 px-2">Código</th>
                    <th className="py-2.5 px-2">Descrição</th>
                    <th className="py-2.5 px-2 text-center">Tipo (E/S)</th>
                    <th className="py-2.5 px-2 text-center">Qtd</th>
                    <th className="py-2.5 px-2 text-right">Valor Unit.</th>
                    <th className="py-2.5 px-2 text-right">Sub-total</th>
                    <th className="py-2.5 px-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cartItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-xs text-slate-400 font-mono">
                        Nenhum item adicionado ao carrinho.
                      </td>
                    </tr>
                  ) : (
                    cartItems.map((item, idx) => (
                      <tr key={item.id} className="text-xs text-slate-700 hover:bg-slate-50/50">
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={item.checked !== false}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              setCartItems((prev) =>
                                prev.map((it) => (it.id === item.id ? { ...it, checked: isChecked } : it))
                              );
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-2 font-mono text-slate-500 text-[10px]">
                          {item.barcode || "N/A"}
                        </td>
                        <td className="py-3 px-2 max-w-[160px] truncate">
                          <p className="font-bold text-slate-800">{item.name}</p>
                          {item.petName && (
                            <span className="text-[10px] bg-sky-50 text-sky-800 px-1 rounded">
                              Pet: {item.petName}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center font-mono">
                          {isDiscountItem(item) ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                              Desconto / Saída
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Entrada (E)
                            </span>
                          )}
                        </td>
                        
                        {/* Interactive cell change or normal */}
                        <td className="py-3 px-2 text-center font-mono">
                          {editingCartItemId === item.id ? (
                            <input
                              type="number"
                              min="1"
                              className="w-12 text-center border rounded py-0.5"
                              value={editingQty}
                              onChange={(e) => setEditingQty(parseInt(e.target.value) || 1)}
                            />
                          ) : (
                            item.quantity
                          )}
                        </td>
                        <td className="py-3 px-2 text-right font-mono">
                          {editingCartItemId === item.id ? (
                            <input
                              type="number"
                              step="0.01"
                              className="w-16 text-right border rounded py-0.5"
                              value={editingVal}
                              onChange={(e) => setEditingVal(parseFloat(e.target.value) || 0)}
                            />
                          ) : (
                            isDiscountItem(item) ? `- R$ ${Math.abs(item.price).toFixed(2)}` : `R$ ${Math.abs(item.price).toFixed(2)}`
                          )}
                        </td>
                        <td className={`py-3 px-2 text-right font-mono font-semibold ${isDiscountItem(item) ? "text-rose-600 font-bold" : "text-slate-900"}`}>
                          {isDiscountItem(item) ? `- R$ ${(item.quantity * Math.abs(item.price)).toFixed(2)}` : `R$ ${(item.quantity * Math.abs(item.price)).toFixed(2)}`}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {editingCartItemId === item.id ? (
                              <button
                                type="button"
                                onClick={saveEditCartItem}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                title="Salvar"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => initiateEditCartItem(item)}
                                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                                title="Editar item"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => removeCartItem(item.id)}
                              className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                              title="Remover item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Rota de Fuga: Botão Cancelar Venda */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <p className="text-[10px] text-slate-400 font-mono italic">
                * Cancela a negociação atual, limpa o caixa e retorna à agenda.
              </p>
              <button
                type="button"
                onClick={() => {
                  showConfirm(
                    "Cancelar e Limpar Venda?",
                    "Deseja realmente cancelar esta negociação? Todos os dados digitados e itens inseridos no carrinho serão limpos imediatamente.",
                    () => {
                      handleResetCaixaState();
                      onBackToSchedule?.();
                    }
                  );
                }}
                className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 hover:border-rose-300 active:scale-95 transition-all outline-none rounded-xl text-xs font-bold shadow-xs border border-rose-200 cursor-pointer font-sans"
              >
                <span>🔴 Cancelar Venda</span>
              </button>
            </div>

          </div>

        </div>


        {/* COLUNA DIREITA: REGRAS DE PAGAMENTO */}
        <div className="lg:col-span-5 flex flex-col gap-6">

          {/* Payment Card Block */}
          <div className="bg-slate-900 text-slate-100 p-5 rounded-3xl shadow-sm border border-slate-800 flex flex-col gap-5">
            
            {/* Header Formas Pagamento aligned side-by-side with add item */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm font-display tracking-tight text-white flex items-center gap-2">
                <CreditCard className="h-4.5 w-4.5 text-emerald-400" />
                FORMAS DE PAGAMENTO
              </h3>
              <span className="text-[10px] text-slate-450 font-mono">PDV Ativo</span>
            </div>

            {/* Payment Fields Rows */}
            <div className="flex flex-col gap-4">
              
              {/* PIX */}
              <div className="bg-slate-800/65 p-3 rounded-2xl border border-slate-700/50 flex flex-col gap-1.5 focus-within:border-emerald-500 transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">⚡ PIX</span>
                  <span className="text-[9px] text-slate-500 font-mono">Instantâneo</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="R$ 0,00"
                    value={valPix}
                    onFocus={() => setValPix("")}
                    onBlur={() => {}}
                    onChange={(e) => setValPix(e.target.value)}
                    className="w-full text-right font-mono text-base font-bold text-white bg-transparent outline-none pr-1 focus:ring-0"
                  />
                  <span className="absolute left-1 top-0 text-slate-500 font-mono text-sm">R$</span>
                </div>
              </div>

              {/* CARTÃO DÉBITO */}
              <div className="bg-slate-800/65 p-3 rounded-2xl border border-slate-700/50 flex flex-col gap-1.5 focus-within:border-emerald-500 transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">💳 CARD DÉBITO</span>
                  <span className="text-[9px] text-slate-500 font-mono">Maquininha</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="R$ 0,00"
                    value={valDebito}
                    onFocus={() => setValDebito("")}
                    onBlur={() => {}}
                    onChange={(e) => setValDebito(e.target.value)}
                    className="w-full text-right font-mono text-base font-bold text-white bg-transparent outline-none pr-1 focus:ring-0"
                  />
                  <span className="absolute left-1 top-0 text-slate-500 font-mono text-sm">R$</span>
                </div>
              </div>

              {/* CARTÃO CRÉDITO */}
              <div className="bg-slate-800/65 p-3 rounded-2xl border border-slate-700/50 flex flex-col gap-1.5 focus-within:border-emerald-500 transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">🛒 CARD CRÉDITO</span>
                  <span className="text-[9px] text-slate-500 font-mono">Maquininha</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="R$ 0,00"
                    value={valCredito}
                    onFocus={() => setValCredito("")}
                    onBlur={() => {}}
                    onChange={(e) => setValCredito(e.target.value)}
                    className="w-full text-right font-mono text-base font-bold text-white bg-transparent outline-none pr-1 focus:ring-0"
                  />
                  <span className="absolute left-1 top-0 text-slate-500 font-mono text-sm">R$</span>
                </div>
              </div>

              {/* AUTOMATION DINHEIRO ROW */}
              <div className="bg-slate-800/65 p-3 rounded-2xl border border-slate-700/50 flex flex-col gap-2 focus-within:border-emerald-500 transition">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isDinheiroChecked}
                      onChange={(e) => {
                        setIsDinheiroChecked(e.target.checked);
                        if (!e.target.checked) {
                          setValDinheiro("");
                        }
                        setManualDinheiroOverride(true);
                      }}
                      className="rounded text-emerald-500 focus:ring-0 bg-slate-900 border-slate-700"
                    />
                    <span className="text-xs font-bold text-slate-300">💵 DINHEIRO</span>
                  </label>
                  <span className="text-[9px] text-emerald-400 font-mono animate-pulse">Preenchimento Automático [X]</span>
                </div>
                <div className="relative">
                  <input
                    disabled={!isDinheiroChecked}
                    type="number"
                    step="0.01"
                    placeholder="R$ 0,00"
                    value={valDinheiro}
                    onFocus={() => { 
                      setValDinheiro(""); 
                      setManualDinheiroOverride(true);
                    }}
                    onBlur={() => {}}
                    onChange={(e) => {
                      setValDinheiro(e.target.value);
                      setManualDinheiroOverride(true);
                    }}
                    className={`w-full text-right font-mono text-base font-bold bg-transparent outline-none pr-1 focus:ring-0 ${
                      isDinheiroChecked ? "text-white" : "text-slate-550 placeholder-slate-650 cursor-not-allowed"
                    }`}
                  />
                  <span className="absolute left-1 top-0 text-slate-500 font-mono text-sm">R$</span>
                </div>
              </div>

            </div>

            {/* Validation and computation info rows footer */}
            <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800 flex flex-col gap-2 text-xs text-slate-300 font-mono shrink-0">
              
              <div className="flex items-center justify-between">
                <span className="text-slate-400">TOTAL DO CARRINHO:</span>
                <span className="font-bold text-white text-sm">
                  R$ {totalCartValue.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800/60 pt-2 text-[11px]">
                <span className="text-slate-400">SOMA DOS PAGAMENTOS:</span>
                <span className="font-bold text-slate-200">
                  R$ {totalPaymentsSum.toFixed(2)}
                </span>
              </div>

              {/* Automatic Change Calculation Display */}
              {changeValue > 0 && (
                <div className="flex items-center justify-between bg-violet-950/40 p-2 rounded-xl text-violet-300 text-xs mt-1 border border-violet-800/40 animate-bounce">
                  <span>💸 TROCO AUTOMÁTICO:</span>
                  <span className="font-extrabold text-sm text-violet-200">
                    R$ {changeValue.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Fully Paid visual Indicator Badge */}
              {isFullyPaid ? (
                <div className="flex items-center justify-center gap-1.5 py-1 px-3 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-xl text-[10px] font-bold mt-1 text-center select-none font-sans">
                  <BadgeCheck className="h-4 w-4" />
                  <span>TOTAL PAGO ✓ COBERTO INTEGRALMENTE</span>
                </div>
              ) : checkedItemsCount > 0 ? (
                <div className="flex items-center justify-center gap-1 py-1 px-3 bg-amber-950/40 text-amber-500 border border-amber-800/40 rounded-xl text-[10px] font-bold mt-1 text-center select-none font-sans">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>SALDO RESTANTE: R$ {(totalCartValue - totalPaymentsSum).toFixed(2)}</span>
                </div>
              ) : null}

            </div>

            {/* Submit Action Button trigger */}
            <button
              onClick={handleExecutePayment}
              disabled={checkedItemsCount === 0 || isFaturamentoProcessing}
              className={`w-full py-4 px-4 rounded-2xl text-xs font-bold text-center tracking-wider text-white transition-all transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${
                (checkedItemsCount === 0 || isFaturamentoProcessing) 
                  ? "bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed"
                  : isFullyPaid 
                    ? "bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/30 font-extrabold"
                    : selectedClienteId
                      ? "bg-amber-600 hover:bg-amber-500 font-extrabold shadow-lg"
                      : "bg-rose-600 hover:bg-rose-500 font-extrabold"
              }`}
            >
              <Coins className="h-4.5 w-4.5" />
              {isFaturamentoProcessing
                ? "PROCESSANDO FATURAMENTO..."
                : checkedItemsCount === 0 
                  ? "Selecione Itens do Carrinho" 
                  : isFullyPaid 
                    ? "FINALIZAR E MOVIMENTAR CART" 
                    : selectedClienteId
                      ? "FATURAR E COBRAR FIADO (LIMITE)"
                    : "PAGAMENTO PENDENTE (BLOQUEADO)"
              }
            </button>

          </div>

          {/* Credit Limit Detail information panel */}
          {selectedClienteId && (
            (() => {
              const client = clientes.find((c) => c.Id === selectedClienteId);
              if (!client) return null;
              const limit = client.LimiteCredito || 0;
              const debit = client.SaldoDevedor || 0;
              const avaiable = Math.max(0, limit - debit);

              return (
                <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 text-xs text-slate-700 flex flex-col gap-1.5">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4 text-emerald-600" />
                    Situação de Crédito de {client.Nome}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center mt-1 font-mono text-[11px]">
                    <div className="p-1.5 bg-slate-50 border border-slate-100 rounded-lg">
                      <p className="text-[9px] text-slate-400">Limite Total</p>
                      <p className="font-bold text-slate-800">R$ {limit.toFixed(2)}</p>
                    </div>
                    <div className="p-1.5 bg-rose-50 border border-rose-100 rounded-lg">
                      <p className="text-[9px] text-red-400">Saldo Devedor</p>
                      <p className="font-bold text-red-700">R$ {debit.toFixed(2)}</p>
                    </div>
                    <div className="p-1.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                      <p className="text-[9px] text-emerald-400">Disponível</p>
                      <p className="font-bold text-emerald-700">R$ {avaiable.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              );
            })()
          )}

        </div>

      </div>

      {/* CONFIRMATION DIALOG WITH REALISTIC THERMAL CUPOM MOCKUP */}
      {showReceiptModal && receiptData && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 overflow-y-auto animate-fade-in">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 overflow-hidden max-h-[90vh]">
            
            {/* Left Column: Receipt Preview (realistic thermal ticket mockup) */}
            <div className="md:col-span-7 bg-slate-950 p-6 flex flex-col items-center justify-start border-b md:border-b-0 md:border-r border-slate-800/80 overflow-hidden">
              <span className="text-[10px] uppercase tracking-widest font-extrabold text-slate-500 mb-4 block font-sans shrink-0">
                PRÉ-VISUALIZAÇÃO DO COMPROVANTE (80MM)
              </span>
              
              {/* Scrollable Container for the Cupom */}
              <div className="w-full overflow-y-auto max-h-[480px] flex flex-col items-center pb-4 pr-1 scrollbar-thin">
                {/* Thermal Paper roll mockup with serrated edges styled with standard CSS */}
                <div 
                  ref={thermalReceiptRef} 
                  style={{ fontFamily: "'Courier New', Courier, monospace" }}
                  className="bg-white text-black text-[11px] p-6 shadow-2xl w-full max-w-[320px] rounded-sm border border-slate-200 leading-relaxed relative selection:bg-slate-200 select-all my-2"
                >
                {/* CABEÇALHO COM LOGO E EMOJIS */}
                <div className="text-center mb-2">
                  {currentInfoConta?.Logo ? (
                    <img 
                      src={currentInfoConta.Logo} 
                      className="mx-auto mb-1 max-h-12 object-contain filter grayscale contrast-125"
                      referrerPolicy="no-referrer"
                      alt="Logo"
                    />
                  ) : (
                    <svg width="64" height="48" viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-1 text-black">
                      {/* The P */}
                      <path d="M12 6C12 6 22 5 26 8C30 11 31 16 30 20C29 25 24 28 18 28H18L18 42C18 43 17 44 16 44H13C12 44 11 43 11 42V10C11 8 11.5 6.5 12 6Z" fill="black" />
                      {/* The P inner cutout (white circular base for paw print) */}
                      <circle cx="20" cy="16" r="6" fill="white" />
                      
                      {/* The P inner paw print (black) */}
                      <circle cx="17.5" cy="13.5" r="1.5" fill="black" />
                      <circle cx="20" cy="12" r="1.5" fill="black" />
                      <circle cx="22.5" cy="13.5" r="1.5" fill="black" />
                      <path d="M20 14.5C18.5 14.5 18 16 20 17C22 16 21.5 14.5 20 14.5Z" fill="black" />
                      
                      {/* The small S */}
                      <path d="M37 28C37 25 40 24 43 24C46 24 49 25 49 28C49 31 46 32 43 33C40 34 37 35 37 38C37 41 40 43 44 43C48 43 50 41 50 38" stroke="black" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      
                      {/* Top-right paw print (between P and S top) */}
                      <g transform="translate(35, 3) scale(0.6)">
                        <circle cx="10" cy="10" r="4" fill="black" />
                        <circle cx="5" cy="4" r="1.5" fill="black" />
                        <circle cx="10" cy="2" r="1.5" fill="black" />
                        <circle cx="15" cy="4" r="1.5" fill="black" />
                      </g>
                      
                      {/* Bottom-left paw print (below S/P) */}
                      <g transform="translate(26, 29) scale(0.6)">
                        <circle cx="10" cy="10" r="4" fill="black" />
                        <circle cx="5" cy="4" r="1.5" fill="black" />
                        <circle cx="10" cy="2" r="1.5" fill="black" />
                        <circle cx="15" cy="4" r="1.5" fill="black" />
                      </g>
                    </svg>
                  )}
                  <div className="font-extrabold text-[15px] tracking-tight text-center text-black uppercase font-sans">
                    {currentInfoConta?.NomeEmpresa?.toUpperCase() || "MY BUDDY"}
                  </div>
                  {currentInfoConta?.Razao_Social && (
                    <div className="text-[9px] text-center text-black font-sans leading-none pb-1 font-bold">
                      {currentInfoConta.Razao_Social.toUpperCase()}
                    </div>
                  )}
                  {currentInfoConta?.Documento_Identificacao && (
                    <div className="text-[8.5px] text-center text-black font-mono leading-none pb-0.5">
                      CNPJ: {currentInfoConta.Documento_Identificacao}
                    </div>
                  )}
                  {currentInfoConta?.Fone && (
                    <div className="text-[8.5px] text-center text-black font-sans leading-none pb-0.5">
                      FONE: {currentInfoConta.Fone}
                    </div>
                  )}
                  
                  <div className="bg-black text-white font-extrabold text-[11px] tracking-widest text-center py-1 uppercase leading-none my-1.5 select-none">
                    CUPOM NÃO FISCAL
                  </div>
                </div>
                
                <div className="space-y-0.5 text-[10px] text-black leading-snug">
                  <div className="font-bold text-[11px]">PEDIDO: {receiptData.idVenda.toUpperCase().startsWith("PS_") ? receiptData.idVenda.toUpperCase() : `PS_${receiptData.idVenda.toUpperCase()}`}</div>
                  <div><span className="font-bold">CLIENTE:</span> {receiptData.cliente.toUpperCase()}</div>
                  <div><span className="font-bold">Phone:</span> {receiptData.whatsappPhone || "19 99885-0635"}</div>
                  <div><span className="font-bold">DATA/HORA:</span> {receiptData.dataHora}</div>
                  <div><span className="font-bold">CAIXA:</span> PDV-02</div>
                </div>
                
                <div className="border-t border-dashed border-black my-2" />
                
                {/* Items table */}
                <div className="space-y-1 text-[10px] text-black font-mono">
                  <div className="grid grid-cols-12 gap-0.5 font-bold leading-tight border-b border-black pb-1">
                    <div className="col-span-2 text-left">ITEM<br/>(QUANT.)</div>
                    <div className="col-span-4 text-left">| DESCRIÇÃO</div>
                    <div className="col-span-1 text-center">UNID</div>
                    <div className="col-span-2 text-right">| V. UNIT.</div>
                    <div className="col-span-3 text-right">| V. TOTAL</div>
                  </div>
                  {receiptData.itens.map((item, idx) => {
                    const itemNum = String(idx + 1).padStart(2, "0");
                    const isDiscount = isDiscountItem(item);
                    const { mainName, subName } = getItemNameParts(item);
                    const absPrice = Math.abs(item.price);
                    const lineTotal = Math.abs(item.price * item.quantity);
                    
                    return (
                      <div key={idx} className={`grid grid-cols-12 gap-0.5 pt-1.5 text-[9.5px] leading-tight align-top ${isDiscount ? "bg-neutral-100 font-semibold" : ""}`}>
                        <span className="col-span-2 text-left align-top">{itemNum} ({item.quantity})</span>
                        <span className="col-span-4 text-left align-top break-words">
                          <div className="font-bold flex items-center gap-1">
                            {isDiscount && (
                              <span className="bg-black text-white text-[7.5px] px-1 py-0.2 rounded-xs font-mono font-bold leading-none">
                                DESC
                              </span>
                            )}
                            <span>{mainName}</span>
                          </div>
                          {subName && <div className="text-[8.5px] text-neutral-700">{subName}</div>}
                        </span>
                        <span className="col-span-1 text-center align-top">UN</span>
                        <span className={`col-span-2 text-right align-top ${isDiscount ? "font-bold" : ""}`}>
                          {isDiscount ? `- R$ ${absPrice.toFixed(2)}` : `R$ ${absPrice.toFixed(2)}`}
                        </span>
                        <span className={`col-span-3 text-right align-top font-bold ${isDiscount ? "text-black" : ""}`}>
                          {isDiscount ? `- R$ ${lineTotal.toFixed(2)}` : `R$ ${lineTotal.toFixed(2)}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
                
                <div className="border-t border-black my-2" />
                
                {/* Totals */}
                <div className="space-y-0.5 text-right text-black font-mono">
                  <div className="text-[11px]"><span className="font-bold">VALOR TOTAL: R$ {receiptData.subtotal.toFixed(2)}</span></div>
                  {receiptData.desconto > 0 && (
                    <div className="text-[11px]">
                      <span className="font-bold">
                        DESCONTO ({receiptData.subtotal > 0 ? Math.round((receiptData.desconto / receiptData.subtotal) * 100) : 0}%): - R$ {receiptData.desconto.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="text-[14px] font-black tracking-tight"><span className="font-extrabold">TOTAL A PAGAR: R$ {receiptData.total.toFixed(2)}</span></div>
                  <div className="text-[10px]"><span className="font-bold">PAGAMENTO: {receiptData.formaPagamento.toUpperCase()} (Aprovado)</span></div>
                </div>
                
                <div className="border-t border-black my-2" />

                {/* Stock info simulation */}
                {receiptData.itens.some(item => !(item.type === "service" || item.id?.startsWith("service-"))) && (
                  <>
                    <div className="space-y-0.5 text-left text-black font-mono py-1">
                      <div className="text-[9px] font-bold uppercase">ESTOQUE TOTAL ATUALIZADO (My Buddy)</div>
                      {receiptData.itens
                        .filter(item => !(item.type === "service" || item.id?.startsWith("service-")))
                        .map((item, idx) => {
                          const mockLot = `LOT-00${(idx + 1) * 2}`;
                          const mockStock = Math.floor(Math.random() * 100) + 45;
                          return (
                            <div key={idx} className="text-[9px] leading-tight">
                              <span className="font-bold">{mockLot}:</span> {item.name.toUpperCase()} (Sal: {mockStock} UN, Venc: 15/07/2027)
                            </div>
                          );
                        })
                      }
                    </div>
                    <div className="border-t border-dashed border-black my-2" />
                  </>
                )}
                
                {/* Footer */}
                <div className="text-center text-[10px] font-bold text-black uppercase space-y-1 pt-1 font-mono">
                  <div className="flex items-center justify-center gap-1">
                    <span>🐾</span> OBRIGADO PELA PREFERÊNCIA! <span>🐾</span>
                  </div>
                  {addressString && (
                    <div className="text-[8.5px] font-normal normal-case text-neutral-800 border-t border-dashed border-neutral-300 pt-1 mt-1">
                      {addressString}
                    </div>
                  )}
                  {masterContactString && (
                    <div className="text-[8px] font-normal normal-case text-neutral-600">
                      {masterContactString}
                    </div>
                  )}
                  <div className="text-[8.5px] font-normal lowercase tracking-wide mt-1 text-neutral-800">
                    Siga-nos: @{currentInfoConta?.NomeEmpresa ? currentInfoConta.NomeEmpresa.toLowerCase().replace(/\s+/g, "") : "mybuddy"}
                  </div>
                  <div className="text-[8px] font-normal normal-case text-neutral-500">
                    Recibo gerado via My Buddy App
                  </div>
                </div>
              </div>
              </div>
            </div>
            
            {/* Right Column: Controls and Actions */}
            <div className="md:col-span-5 p-6 md:p-8 flex flex-col justify-start bg-slate-900 text-white gap-6 overflow-y-auto">
              <div className="space-y-5">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider mb-2 font-sans">
                    ✓ Faturado com Sucesso
                  </span>
                  <h3 className="text-lg md:text-xl font-black text-white font-display tracking-tight">
                    Cupom Disponível para Envio
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed mt-2 font-sans">
                    Como deseja despachar o cupom para o cliente? Selecione abaixo para imprimir na via térmica, visualizar em tamanho grande ou compartilhar.
                  </p>
                </div>
                
                <div className="space-y-3 pt-2">
                  {/* Imprimir button */}
                  <button
                    type="button"
                    onClick={handlePrintReceipt}
                    className="w-full flex items-center justify-between p-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl transition-all cursor-pointer font-sans font-bold text-xs shadow-md shadow-emerald-950/20 active:scale-98"
                  >
                    <span className="flex items-center gap-3">
                      <Printer className="h-4.5 w-4.5" /> Imprimir Cupom Térmico
                    </span>
                    <span className="text-[9px] bg-emerald-700/80 px-2 py-0.5 rounded-full uppercase font-mono tracking-wider">Via Impressora</span>
                  </button>
                  
                  {/* Visualizar PDF button */}
                  <button
                    type="button"
                    onClick={() => setShowFullReceiptPdf(true)}
                    className="w-full flex items-center justify-between p-4 bg-slate-850 hover:bg-slate-800 text-slate-100 rounded-2xl transition-all cursor-pointer font-sans font-bold text-xs shadow-sm border border-slate-850/80 active:scale-98"
                  >
                    <span className="flex items-center gap-3">
                      <Eye className="h-4.5 w-4.5 text-indigo-400" /> Visualizar PDF na Tela
                    </span>
                    <span className="text-[9px] bg-slate-800 px-2 py-0.5 rounded-full uppercase font-mono tracking-wider">Tela Cheia</span>
                  </button>
                  
                  {/* WhatsApp button */}
                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    className="w-full flex items-center justify-between p-4 bg-slate-850 hover:bg-slate-800 text-slate-100 rounded-2xl transition-all cursor-pointer font-sans font-bold text-xs shadow-sm border border-slate-850/80 active:scale-98"
                  >
                    <span className="flex items-center gap-3">
                      <Share2 className="h-4.5 w-4.5 text-teal-400" /> Enviar por WhatsApp
                    </span>
                    <span className="text-[9px] bg-slate-800 px-2 py-0.5 rounded-full uppercase font-mono tracking-wider">Web Share API</span>
                  </button>

                  {/* Concluir Operação button */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowReceiptModal(false);
                      setReceiptData(null);
                    }}
                    className="w-full flex items-center justify-between p-4 bg-indigo-650 hover:bg-indigo-600 text-white rounded-2xl transition-all cursor-pointer font-sans font-bold text-xs shadow-md shadow-indigo-950/20 active:scale-98 border border-indigo-600/50"
                  >
                    <span className="flex items-center gap-3">
                      <Check className="h-4.5 w-4.5 text-indigo-200" /> Concluir Operação
                    </span>
                    <span className="text-[9px] bg-indigo-800 px-2 py-0.5 rounded-full uppercase font-mono tracking-wider">Pronto</span>
                  </button>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      )}

      {/* FULL SCREEN INTERACTIVE CUPOM PDF PREVIEW */}
      {showFullReceiptPdf && receiptData && (
        <div className="fixed inset-0 bg-slate-950 flex flex-col z-[99999] animate-fade-in">
          {/* Header */}
          <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between text-white shrink-0 shadow-md">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-indigo-400" />
              <div>
                <h3 className="font-bold text-sm font-sans">Comprovante Digital (Cupom Não Fiscal)</h3>
                <p className="text-[10px] text-slate-400 font-mono">ID Venda: {receiptData.idVenda}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 font-sans">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm active:scale-95"
              >
                <Printer className="h-4 w-4" /> Imprimir Cupom
              </button>
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm border border-slate-700 active:scale-95"
              >
                <Share2 className="h-4 w-4" /> Enviar WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setShowFullReceiptPdf(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer ml-1"
                title="Fechar Visualização"
              >
                ✕
              </button>
            </div>
          </div>
          
          {/* PDF/Canvas Simulation */}
          <div className="flex-1 bg-slate-950 p-6 md:p-10 overflow-y-auto flex justify-center items-start">
            <div 
              ref={fullReceiptRef} 
              style={{ fontFamily: "'Courier New', Courier, monospace" }}
              className="bg-white text-black text-[11px] p-6 shadow-2xl w-full max-w-[320px] rounded-sm border border-slate-200 leading-relaxed selection:bg-slate-200 select-all my-4 relative"
            >
              {/* CABEÇALHO COM LOGO E EMOJIS */}
              <div className="text-center mb-2">
                {currentInfoConta?.Logo ? (
                  <img 
                    src={currentInfoConta.Logo} 
                    className="mx-auto mb-1 max-h-12 object-contain filter grayscale contrast-125"
                    referrerPolicy="no-referrer"
                    alt="Logo"
                  />
                ) : (
                  <svg width="64" height="48" viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-1 text-black">
                    {/* The P */}
                    <path d="M12 6C12 6 22 5 26 8C30 11 31 16 30 20C29 25 24 28 18 28H18L18 42C18 43 17 44 16 44H13C12 44 11 43 11 42V10C11 8 11.5 6.5 12 6Z" fill="black" />
                    {/* The P inner cutout (white circular base for paw print) */}
                    <circle cx="20" cy="16" r="6" fill="white" />
                    
                    {/* The P inner paw print (black) */}
                    <circle cx="17.5" cy="13.5" r="1.5" fill="black" />
                    <circle cx="20" cy="12" r="1.5" fill="black" />
                    <circle cx="22.5" cy="13.5" r="1.5" fill="black" />
                    <path d="M20 14.5C18.5 14.5 18 16 20 17C22 16 21.5 14.5 20 14.5Z" fill="black" />
                    
                    {/* The small S */}
                    <path d="M37 28C37 25 40 24 43 24C46 24 49 25 49 28C49 31 46 32 43 33C40 34 37 35 37 38C37 41 40 43 44 43C48 43 50 41 50 38" stroke="black" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    
                    {/* Top-right paw print (between P and S top) */}
                    <g transform="translate(35, 3) scale(0.6)">
                      <circle cx="10" cy="10" r="4" fill="black" />
                      <circle cx="5" cy="4" r="1.5" fill="black" />
                      <circle cx="10" cy="2" r="1.5" fill="black" />
                      <circle cx="15" cy="4" r="1.5" fill="black" />
                    </g>
                    
                    {/* Bottom-left paw print (below S/P) */}
                    <g transform="translate(26, 29) scale(0.6)">
                      <circle cx="10" cy="10" r="4" fill="black" />
                      <circle cx="5" cy="4" r="1.5" fill="black" />
                      <circle cx="10" cy="2" r="1.5" fill="black" />
                      <circle cx="15" cy="4" r="1.5" fill="black" />
                    </g>
                  </svg>
                )}
                <div className="font-extrabold text-[15px] tracking-tight text-center text-black uppercase font-sans">
                  {currentInfoConta?.NomeEmpresa?.toUpperCase() || "MY BUDDY"}
                </div>
                {currentInfoConta?.Razao_Social && (
                  <div className="text-[9px] text-center text-black font-sans leading-none pb-1 font-bold">
                    {currentInfoConta.Razao_Social.toUpperCase()}
                  </div>
                )}
                {currentInfoConta?.Documento_Identificacao && (
                  <div className="text-[8.5px] text-center text-black font-mono leading-none pb-0.5">
                    CNPJ: {currentInfoConta.Documento_Identificacao}
                  </div>
                )}
                {currentInfoConta?.Fone && (
                  <div className="text-[8.5px] text-center text-black font-sans leading-none pb-0.5">
                    FONE: {currentInfoConta.Fone}
                  </div>
                )}
                
                <div className="bg-black text-white font-extrabold text-[11px] tracking-widest text-center py-1 uppercase leading-none my-1.5 select-none">
                  CUPOM NÃO FISCAL
                </div>
              </div>
              
              <div className="space-y-0.5 text-[10px] text-black leading-snug">
                <div className="font-bold text-[11px]">PEDIDO: {receiptData.idVenda.toUpperCase().startsWith("PS_") ? receiptData.idVenda.toUpperCase() : `PS_${receiptData.idVenda.toUpperCase()}`}</div>
                <div><span className="font-bold">CLIENTE:</span> {receiptData.cliente.toUpperCase()}</div>
                <div><span className="font-bold">Phone:</span> {receiptData.whatsappPhone || "19 99885-0635"}</div>
                <div><span className="font-bold">DATA/HORA:</span> {receiptData.dataHora}</div>
                <div><span className="font-bold">CAIXA:</span> PDV-02</div>
              </div>
              
              <div className="border-t border-dashed border-black my-2" />
              
              {/* Items table */}
              <div className="space-y-1 text-[10px] text-black font-mono">
                <div className="grid grid-cols-12 gap-0.5 font-bold leading-tight border-b border-black pb-1">
                  <div className="col-span-2 text-left">ITEM<br/>(QUANT.)</div>
                  <div className="col-span-4 text-left">| DESCRIÇÃO</div>
                  <div className="col-span-1 text-center">UNID</div>
                  <div className="col-span-2 text-right">| V. UNIT.</div>
                  <div className="col-span-3 text-right">| V. TOTAL</div>
                </div>
                {receiptData.itens.map((item, idx) => {
                  const itemNum = String(idx + 1).padStart(2, "0");
                  const isDiscount = isDiscountItem(item);
                  const { mainName, subName } = getItemNameParts(item);
                  const absPrice = Math.abs(item.price);
                  const lineTotal = Math.abs(item.price * item.quantity);
                  
                  return (
                    <div key={idx} className={`grid grid-cols-12 gap-0.5 pt-1.5 text-[9.5px] leading-tight align-top ${isDiscount ? "bg-neutral-100 font-semibold" : ""}`}>
                      <span className="col-span-2 text-left align-top">{itemNum} ({item.quantity})</span>
                      <span className="col-span-4 text-left align-top break-words">
                        <div className="font-bold flex items-center gap-1">
                          {isDiscount && (
                            <span className="bg-black text-white text-[7.5px] px-1 py-0.2 rounded-xs font-mono font-bold leading-none">
                              DESC
                            </span>
                          )}
                          <span>{mainName}</span>
                        </div>
                        {subName && <div className="text-[8.5px] text-neutral-700">{subName}</div>}
                      </span>
                      <span className="col-span-1 text-center align-top">UN</span>
                      <span className={`col-span-2 text-right align-top ${isDiscount ? "font-bold" : ""}`}>
                        {isDiscount ? `- R$ ${absPrice.toFixed(2)}` : `R$ ${absPrice.toFixed(2)}`}
                      </span>
                      <span className={`col-span-3 text-right align-top font-bold ${isDiscount ? "text-black" : ""}`}>
                        {isDiscount ? `- R$ ${lineTotal.toFixed(2)}` : `R$ ${lineTotal.toFixed(2)}`}
                      </span>
                    </div>
                  );
                })}
              </div>
              
              <div className="border-t border-black my-2" />
              
              {/* Totals */}
              <div className="space-y-0.5 text-right text-black font-mono">
                <div className="text-[11px]"><span className="font-bold">VALOR TOTAL: R$ {receiptData.subtotal.toFixed(2)}</span></div>
                {receiptData.desconto > 0 && (
                  <div className="text-[11px]">
                    <span className="font-bold">
                      DESCONTO ({receiptData.subtotal > 0 ? Math.round((receiptData.desconto / receiptData.subtotal) * 100) : 0}%): - R$ {receiptData.desconto.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="text-[14px] font-black tracking-tight"><span className="font-extrabold">TOTAL A PAGAR: R$ {receiptData.total.toFixed(2)}</span></div>
                <div className="text-[10px]"><span className="font-bold">PAGAMENTO: {receiptData.formaPagamento.toUpperCase()} (Aprovado)</span></div>
              </div>
              
              <div className="border-t border-black my-2" />

              {/* Stock info simulation */}
              {receiptData.itens.some(item => !(item.type === "service" || item.id?.startsWith("service-"))) && (
                <>
                  <div className="space-y-0.5 text-left text-black font-mono py-1">
                    <div className="text-[9px] font-bold uppercase">ESTOQUE TOTAL ATUALIZADO (My Buddy)</div>
                    {receiptData.itens
                      .filter(item => !(item.type === "service" || item.id?.startsWith("service-")))
                      .map((item, idx) => {
                        const mockLot = `LOT-00${(idx + 1) * 2}`;
                        const mockStock = Math.floor(Math.random() * 100) + 45;
                        return (
                          <div key={idx} className="text-[9px] leading-tight">
                            <span className="font-bold">{mockLot}:</span> {item.name.toUpperCase()} (Sal: {mockStock} UN, Venc: 15/07/2027)
                          </div>
                        );
                      })
                    }
                  </div>
                  <div className="border-t border-dashed border-black my-2" />
                </>
              )}
              
              {/* Footer */}
              <div className="text-center text-[10px] font-bold text-black uppercase space-y-1 pt-1 font-mono">
                <div className="flex items-center justify-center gap-1">
                  <span>🐾</span> OBRIGADO PELA PREFERÊNCIA! <span>🐾</span>
                </div>
                {addressString && (
                  <div className="text-[8.5px] font-normal normal-case text-neutral-800 border-t border-dashed border-neutral-300 pt-1 mt-1">
                    {addressString}
                  </div>
                )}
                {masterContactString && (
                  <div className="text-[8px] font-normal normal-case text-neutral-600">
                    {masterContactString}
                  </div>
                )}
                <div className="text-[8.5px] font-normal lowercase tracking-wide mt-1 text-neutral-800">
                  Siga-nos: @{currentInfoConta?.NomeEmpresa ? currentInfoConta.NomeEmpresa.toLowerCase().replace(/\s+/g, "") : "mybuddy"}
                </div>
                <div className="text-[8px] font-normal normal-case text-neutral-500">
                  Recibo gerado via My Buddy App
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
