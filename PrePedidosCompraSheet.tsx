/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from "react";
import { PrePedidoCompra, PrePedidoCompraItem, CadFornecedores, CadProdutos, ThemeColor, LotesProdutos } from "../types";
import { Search, Plus, Trash2, FileText, Calendar, Clock, ShoppingBag, ListPlus, Eye, CheckCircle2, ChevronRight, User, ChevronUp, ChevronsUp, ChevronsDown, ChevronDown } from "lucide-react";

interface PrePedidosCompraProps {
  prePedidosCompra: PrePedidoCompra[];
  fornecedores: CadFornecedores[];
  produtos: CadProdutos[];
  activeTheme: ThemeColor;
  currentUserOwnerId?: string;
  isAdminViewAll?: boolean;
  onUpdatePrePedidosCompra: (updated: PrePedidoCompra[]) => void;
  showConfirm: (title: string, msg: string, onConfirm: () => void) => void;
  showAlert: (title: string, msg: string) => void;
  userPermissionLevel?: number;
  lotesProdutos?: LotesProdutos[];
  onUpdateLotesProdutos?: (updated: LotesProdutos[]) => void;
}

export default function PrePedidosCompraSheet({
  prePedidosCompra,
  fornecedores,
  produtos,
  activeTheme,
  currentUserOwnerId,
  isAdminViewAll = false,
  onUpdatePrePedidosCompra,
  showConfirm,
  showAlert,
  userPermissionLevel = 1,
  lotesProdutos,
  onUpdateLotesProdutos,
}: PrePedidosCompraProps) {
  const tableCardRef = useRef<HTMLDivElement>(null);

  const scrollToTopPrePedidos = () => {
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

  const scrollToBottomPrePedidos = () => {
    tableCardRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  // Filters & List state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("TODOS");

  // New Pre-Pedido form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [custoAtual, setCustoAtual] = useState<number>(0);
  const [unidadeMedida, setUnidadeMedida] = useState("");
  const [quantidade, setQuantidade] = useState<number>(1);
  const [activeCart, setActiveCart] = useState<PrePedidoCompraItem[]>([]);
  const [orderStatus, setOrderStatus] = useState<"Pendente" | "Enviado" | "Recebido">("Pendente");

  // View detail modal state
  const [selectedOrder, setSelectedOrder] = useState<PrePedidoCompra | null>(null);

  // Receive confirmation states
  const [receivingOrder, setReceivingOrder] = useState<PrePedidoCompra | null>(null);
  const [lotInputs, setLotInputs] = useState<Record<string, string>>({});
  const [expiryInputs, setExpiryInputs] = useState<Record<string, string>>({});

  // Reset form helper
  const handleResetForm = () => {
    setSelectedSupplierId("");
    setSelectedProductId("");
    setCustoAtual(0);
    setUnidadeMedida("");
    setQuantidade(1);
    setActiveCart([]);
    setOrderStatus("Pendente");
    setShowAddForm(false);
  };

  // Filter products for the chosen supplier
  const filteredProductsBySupplier = useMemo(() => {
    if (!selectedSupplierId) return [];
    return produtos.filter(
      (p) => p.Fornecedor === selectedSupplierId && p.Ativo
    );
  }, [produtos, selectedSupplierId]);

  // Handle supplier change in form
  const handleSupplierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedSupplierId(id);
    setSelectedProductId("");
    setCustoAtual(0);
    setUnidadeMedida("");
    setActiveCart([]); // Clear cart as supplier changed
  };

  // Handle product change in form
  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const prodId = e.target.value;
    setSelectedProductId(prodId);
    if (!prodId) {
      setCustoAtual(0);
      setUnidadeMedida("");
      return;
    }
    const product = produtos.find((p) => p.Id === prodId);
    if (product) {
      setCustoAtual(product.Custo || 0);
      setUnidadeMedida(product.UnidadeMedida || "Un");
    }
  };

  // Add item to temporary order cart
  const handleAddItemToCart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      showAlert("Atenção ⚠️", "Por favor, selecione primeiro um fornecedor.");
      return;
    }
    if (!selectedProductId) {
      showAlert("Atenção ⚠️", "Por favor, selecione um produto.");
      return;
    }
    if (quantidade <= 0) {
      showAlert("Atenção ⚠️", "A quantidade deve ser maior do que zero.");
      return;
    }

    // Check if product is already in the cart
    const existsIndex = activeCart.findIndex((item) => item.ID_Produto === selectedProductId);
    if (existsIndex > -1) {
      // Update quantity
      const updatedCart = [...activeCart];
      updatedCart[existsIndex].Quantidade_Pedida += quantidade;
      setActiveCart(updatedCart);
    } else {
      // Add new item
      const newItem: PrePedidoCompraItem = {
        ID_Produto: selectedProductId,
        Quantidade_Pedida: quantidade,
        Preco_Custo_Atual: custoAtual,
      };
      setActiveCart([...activeCart, newItem]);
    }

    // Reset product selection inputs for next item
    setSelectedProductId("");
    setCustoAtual(0);
    setUnidadeMedida("");
    setQuantidade(1);
  };

  // Remove item from active cart
  const handleRemoveItemFromCart = (index: number) => {
    setActiveCart(activeCart.filter((_, i) => i !== index));
  };

  // Save the complete purchase pre-order
  const handleSaveOrder = () => {
    if (!selectedSupplierId) {
      showAlert("Atenção ⚠️", "Selecione um Fornecedor.");
      return;
    }
    if (activeCart.length === 0) {
      showAlert("Atenção ⚠️", "Adicione pelo menos um item ao pedido.");
      return;
    }

    const newOrder: PrePedidoCompra = {
      ID_Pedido: `ped-${Math.random().toString(36).substr(2, 9)}`,
      ID_Fornecedor: selectedSupplierId,
      Data_Pedido: new Date().toISOString(),
      Status: orderStatus,
      Itens: activeCart,
    };

    if (orderStatus === "Recebido") {
      handleTriggerReceiveConfirmation(newOrder);
    } else {
      const updatedList = [newOrder, ...prePedidosCompra];
      onUpdatePrePedidosCompra(updatedList);
      handleResetForm();
      showAlert("Sucesso ✓", `Pré-Pedido registrado com sucesso!`);
    }
  };

  // Delete pre-order
  const handleDeleteOrder = (orderId: string) => {
    if (userPermissionLevel === 3) {
      showAlert("Acesso Restrito 🔒", "Nível de permissão 3 (Consulta e Pré-Venda) não autoriza remoções de pedidos.");
      return;
    }
    showConfirm(
      "Excluir Pré-Pedido ⚠️",
      "Tem certeza que deseja remover este pré-pedido de compra do sistema?",
      () => {
        const updated = prePedidosCompra.filter((o) => o.ID_Pedido !== orderId);
        onUpdatePrePedidosCompra(updated);
        setSelectedOrder(null);
        showAlert("Removido", "Pré-Pedido removido com sucesso.");
      }
    );
  };

  // Trigger receipt modal
  const handleTriggerReceiveConfirmation = (order: PrePedidoCompra) => {
    if (order.Status === "Recebido" && prePedidosCompra.some(o => o.ID_Pedido === order.ID_Pedido)) {
      showAlert("Aviso", "Este pré-pedido já foi recebido anteriormente.");
      return;
    }
    setReceivingOrder(order);
    
    // Initialize lot inputs and expiry date inputs
    const initialLots: Record<string, string> = {};
    const initialExpiries: Record<string, string> = {};
    
    order.Itens.forEach((item) => {
      initialLots[item.ID_Produto] = "";
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      initialExpiries[item.ID_Produto] = oneYearFromNow.toISOString().split("T")[0];
    });
    
    setLotInputs(initialLots);
    setExpiryInputs(initialExpiries);
  };

  // Confirm receipt and save lots in stock
  const handleConfirmReceive = () => {
    if (!receivingOrder) return;
    
    const updatedLotes = lotesProdutos ? [...lotesProdutos] : [];
    
    receivingOrder.Itens.forEach((item) => {
      const typedLot = lotInputs[item.ID_Produto]?.trim();
      // Generate a unique batch number if left blank, e.g. "LOT-UNIQUEID"
      const finalLotNumber = typedLot !== "" && typedLot !== undefined
        ? typedLot.toUpperCase()
        : `LOT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        
      const expiry = expiryInputs[item.ID_Produto] || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      
      const newLot: LotesProdutos = {
        IdLote: `lote-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        IdProduto: item.ID_Produto,
        NumeroLote: finalLotNumber,
        QuantidadeLote: item.Quantidade_Pedida,
        ValidadeLote: expiry,
        DataEntrada: new Date().toISOString().split("T")[0],
        Ativo: true,
      };
      
      updatedLotes.push(newLot);
    });
    
    // Dispatch lot update to parent
    onUpdateLotesProdutos?.(updatedLotes);
    
    // Check if it's a new order (created directly as "Recebido") or existing one
    const isNewOrder = !prePedidosCompra.some((o) => o.ID_Pedido === receivingOrder.ID_Pedido);
    
    let updatedPreOrders: PrePedidoCompra[];
    if (isNewOrder) {
      updatedPreOrders = [receivingOrder, ...prePedidosCompra];
    } else {
      updatedPreOrders = prePedidosCompra.map((o) => {
        if (o.ID_Pedido === receivingOrder.ID_Pedido) {
          return { ...o, Status: "Recebido" as const };
        }
        return o;
      });
    }
    
    onUpdatePrePedidosCompra(updatedPreOrders);
    
    if (isNewOrder) {
      handleResetForm();
    } else {
      // Sync detailed selected order view
      const currentObj = updatedPreOrders.find((o) => o.ID_Pedido === receivingOrder.ID_Pedido);
      if (currentObj) {
        setSelectedOrder(currentObj);
      }
    }
    
    setReceivingOrder(null);
    showAlert("Sucesso ✓", "Mercadorias recebidas e novos lotes registrados com sucesso!");
  };

  // Update status from details modal
  const handleUpdateOrderStatus = (orderId: string, newStatus: "Pendente" | "Enviado" | "Recebido") => {
    if (newStatus === "Recebido") {
      const order = prePedidosCompra.find((o) => o.ID_Pedido === orderId);
      if (order) {
        handleTriggerReceiveConfirmation(order);
        return;
      }
    }

    const updated = prePedidosCompra.map((o) => {
      if (o.ID_Pedido === orderId) {
        return { ...o, Status: newStatus };
      }
      return o;
    });
    onUpdatePrePedidosCompra(updated);
    // Sync current modal state
    const currentObj = updated.find((o) => o.ID_Pedido === orderId);
    if (currentObj) {
      setSelectedOrder(currentObj);
    }
    showAlert("Atualizado ✓", `Status do pedido atualizado para "${newStatus}".`);
  };

  // Filter & Search the list of pre-orders
  const filteredOrders = useMemo(() => {
    return prePedidosCompra.filter((order) => {
      // User Isolation: Administrador Geral (isAdminViewAll) ignora o filtro e traz todos os pedidos de todas as contas
      if (!isAdminViewAll && order.IdUsuarioDono && currentUserOwnerId && order.IdUsuarioDono !== currentUserOwnerId) {
        return false;
      }

      // Status Filter
      if (statusFilter !== "TODOS" && order.Status !== statusFilter) {
        return false;
      }

      // Search Filter
      const query = searchTerm.toLowerCase().trim();
      if (!query) return true;

      const supplier = fornecedores.find((f) => f.ID_Fornecedor === order.ID_Fornecedor);
      const supplierName = supplier ? supplier.Nome_Fornecedor.toLowerCase() : "";
      const orderIdMatch = order.ID_Pedido.toLowerCase().includes(query);

      // Check product names inside order items
      const hasMatchingProduct = order.Itens.some((item) => {
        const prod = produtos.find((p) => p.Id === item.ID_Produto);
        return prod && prod.Nome.toLowerCase().includes(query);
      });

      return orderIdMatch || supplierName.includes(query) || hasMatchingProduct;
    });
  }, [prePedidosCompra, fornecedores, produtos, searchTerm, statusFilter]);

  // Helper to format Date-time
  const formatDateTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      const hour = String(d.getHours()).padStart(2, "0");
      const min = String(d.getMinutes()).padStart(2, "0");
      return `${day}/${month}/${year} ${hour}:${min}`;
    } catch {
      return isoString;
    }
  };

  // Helper to calculate total value of an order
  const calculateOrderTotal = (order: PrePedidoCompra) => {
    return order.Itens.reduce((total, item) => {
      return total + item.Quantidade_Pedida * item.Preco_Custo_Atual;
    }, 0);
  };

  // Supplier Lookup Map
  const supplierMap = useMemo(() => {
    const map: Record<string, string> = {};
    fornecedores.forEach((f) => {
      map[f.ID_Fornecedor] = f.Nome_Fornecedor;
    });
    return map;
  }, [fornecedores]);

  // Product Lookup Map
  const productMap = useMemo(() => {
    const map: Record<string, { Nome: string; UnidadeMedida?: string }> = {};
    produtos.forEach((p) => {
      map[p.Id] = { Nome: p.Nome, UnidadeMedida: p.UnidadeMedida };
    });
    return map;
  }, [produtos]);

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white p-5 rounded-2xl border border-slate-200 gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-md bg-emerald-50 text-emerald-700">
              <ShoppingBag className="h-4 w-4" />
            </span>
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 font-mono">
              Gestão de Estoque e Compras
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-800">
            Pré-Pedidos de Compras (PrePedidos)
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className={`inline-flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all transform active:scale-95 cursor-pointer shadow-xs hover:shadow ${activeTheme.primary}`}
        >
          <Plus className="h-4 w-4" />
          Novo Pré-Pedido
        </button>
      </div>

      {/* Filter and Table Grid Container */}
      <div ref={tableCardRef} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Filters Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-xs">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Buscar por Fornecedor, Produto ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-400 transition"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto self-start sm:self-center">
            {["TODOS", "Pendente", "Enviado", "Recebido"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition ${
                  statusFilter === st
                    ? "bg-slate-800 text-white shadow-sm font-bold"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/60 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-150">
                <th className="p-4 pl-6">ID Pedido</th>
                <th className="p-4">Fornecedor</th>
                <th className="p-4">Data Lançamento</th>
                <th className="p-4 text-center">Itens</th>
                <th className="p-4 text-right">Valor Total</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right pr-6">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-400">
                    <FileText className="h-10 w-10 mx-auto text-slate-200 mb-3" />
                    <p className="font-medium text-xs">Nenhum pré-pedido encontrado.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Crie um novo pedido no botão acima.</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const sName = supplierMap[order.ID_Fornecedor] || "Fornecedor Removido";
                  const totalVal = calculateOrderTotal(order);
                  return (
                    <tr key={order.ID_Pedido} className="hover:bg-slate-50/50 transition">
                      <td className="p-4 pl-6 font-mono text-slate-500 font-medium">
                        {order.ID_Pedido}
                      </td>
                      <td className="p-4 font-semibold text-slate-800">
                        {sName}
                      </td>
                      <td className="p-4 text-slate-500">
                        {formatDateTime(order.Data_Pedido)}
                      </td>
                      <td className="p-4 text-center font-bold text-slate-600">
                        {order.Itens.reduce((acc, curr) => acc + curr.Quantidade_Pedida, 0)}
                      </td>
                      <td className="p-4 text-right font-extrabold text-slate-900 font-mono">
                        R$ {totalVal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            order.Status === "Recebido"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : order.Status === "Enviado"
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {order.Status}
                        </span>
                      </td>
                      <td className="p-4 text-right pr-6">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors cursor-pointer"
                            title="Visualizar Detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteOrder(order.ID_Pedido)}
                            className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
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
      </div>

      {/* NEW PRE-PEDIDO MODAL / FULLOVERLAY */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-fade-in">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-scale-up max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-indigo-600 px-6 py-4.5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-white" />
                <div>
                  <h3 className="font-bold text-sm">Novo Pré-Pedido de Compra</h3>
                  <p className="text-[10px] text-emerald-100">Solicite novos produtos aos seus fornecedores cadastrados</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleResetForm}
                className="text-white hover:text-slate-200 text-sm font-semibold p-1.5 hover:bg-white/10 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* SUPPLIER AND STATUS SELECTION */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Fornecedor <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedSupplierId}
                    onChange={handleSupplierChange}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-400"
                  >
                    <option value="">-- Selecione o Fornecedor --</option>
                    {fornecedores.map((f) => (
                      <option key={f.ID_Fornecedor} value={f.ID_Fornecedor}>
                        {f.Nome_Fornecedor} ({f.Categoria || "Sem Categoria"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Status do Lançamento
                  </label>
                  <select
                    value={orderStatus}
                    onChange={(e) => setOrderStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-400"
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Enviado">Enviado</option>
                    <option value="Recebido">Recebido</option>
                  </select>
                </div>
              </div>

              {/* ITEM INSERTION BLOCK */}
              <div className="bg-slate-50/50 p-4.5 rounded-2xl border border-slate-150">
                <h4 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <ListPlus className="h-4 w-4 text-indigo-600" />
                  Inserir Produto no Pedido
                </h4>

                {!selectedSupplierId ? (
                  <div className="bg-slate-100 p-4 text-center rounded-xl text-[11px] text-slate-500">
                    ⚠️ Selecione um fornecedor acima para liberar a busca de produtos associados.
                  </div>
                ) : (
                  <form onSubmit={handleAddItemToCart} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                      {/* Product select */}
                      <div className="md:col-span-6">
                        <label className="block text-[9px] font-bold text-slate-500 mb-1 uppercase">
                          Produto / Insumo <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={selectedProductId}
                          onChange={handleProductChange}
                          required
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-500/10"
                        >
                          <option value="">-- Selecione o Produto --</option>
                          {filteredProductsBySupplier.length === 0 ? (
                            <option disabled value="">
                              [Nenhum produto associado a este fornecedor]
                            </option>
                          ) : (
                            filteredProductsBySupplier.map((p) => (
                              <option key={p.Id} value={p.Id}>
                                {p.Nome}
                              </option>
                            ))
                          )}
                        </select>
                        {filteredProductsBySupplier.length === 0 && (
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            💡 Adicione fornecedores aos produtos no menu "Serviços e Produtos".
                          </span>
                        )}
                      </div>

                      {/* Auto cost display */}
                      <div className="md:col-span-2">
                        <label className="block text-[9px] font-bold text-slate-500 mb-1 uppercase">
                          Custo Unitário (R$)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={custoAtual}
                          onChange={(e) => setCustoAtual(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-800 text-xs font-mono focus:outline-none"
                          title="Valor sugerido. Você pode ajustar manualmente se houver variação."
                        />
                      </div>

                      {/* Unit scale */}
                      <div className="md:col-span-2">
                        <label className="block text-[9px] font-bold text-slate-500 mb-1 uppercase">
                          Unidade
                        </label>
                        <input
                          type="text"
                          disabled
                          value={unidadeMedida || "-"}
                          className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 text-xs text-center"
                        />
                      </div>

                      {/* Quantity input */}
                      <div className="md:col-span-2">
                        <label className="block text-[9px] font-bold text-slate-500 mb-1 uppercase">
                          Quantidade
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={quantidade}
                          onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs text-center font-bold focus:outline-none focus:ring-2 focus:ring-slate-500/10"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={!selectedProductId}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Inserir na Lista
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* CURRENT CART SUMMARY TABLE */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                  Itens Inseridos no Pedido ({activeCart.length})
                </h4>

                <div className="border border-slate-150 rounded-2xl overflow-hidden bg-white">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-[9px] uppercase font-bold tracking-wider border-b border-slate-150">
                        <th className="p-3 pl-4">Produto</th>
                        <th className="p-3 text-center">Unidade</th>
                        <th className="p-3 text-right">Preço de Custo</th>
                        <th className="p-3 text-center">Qtd Solicitada</th>
                        <th className="p-3 text-right">Subtotal</th>
                        <th className="p-3 text-center pr-4">Excluir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {activeCart.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-400 text-xs">
                            Sua lista de pedido está vazia. Adicione produtos acima.
                          </td>
                        </tr>
                      ) : (
                        activeCart.map((item, i) => {
                          const pInfo = productMap[item.ID_Produto] || { Nome: "Produto Desconhecido", UnidadeMedida: "-" };
                          const subtotal = item.Quantidade_Pedida * item.Preco_Custo_Atual;
                          return (
                            <tr key={i} className="hover:bg-slate-50/40">
                              <td className="p-3 pl-4 font-semibold text-slate-800">{pInfo.Nome}</td>
                              <td className="p-3 text-center font-medium text-slate-500">{pInfo.UnidadeMedida || "Un"}</td>
                              <td className="p-3 text-right font-mono text-slate-600">
                                R$ {item.Preco_Custo_Atual.toFixed(2)}
                              </td>
                              <td className="p-3 text-center font-bold text-slate-700">{item.Quantidade_Pedida}</td>
                              <td className="p-3 text-right font-extrabold font-mono text-slate-900">
                                R$ {subtotal.toFixed(2)}
                              </td>
                              <td className="p-3 text-center pr-4">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItemFromCart(i)}
                                  className="p-1 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>

                  {/* Summary Footer bar */}
                  {activeCart.length > 0 && (
                    <div className="bg-slate-900 text-white p-4 flex items-center justify-between font-mono text-xs">
                      <span className="font-bold uppercase tracking-wider text-slate-400">Total do Pedido:</span>
                      <span className="text-sm font-extrabold text-emerald-400">
                        R$ {activeCart.reduce((acc, curr) => acc + curr.Quantidade_Pedida * curr.Preco_Custo_Atual, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="bg-slate-50 border-t border-slate-150 p-5 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={handleResetForm}
                className="px-5 py-2.5 text-slate-600 hover:text-slate-800 text-xs font-semibold cursor-pointer rounded-xl hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveOrder}
                disabled={activeCart.length === 0}
                className={`px-6 py-2.5 text-xs font-bold shadow-md rounded-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${activeTheme.primary}`}
              >
                Salvar Pré-Pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW ORDER DETAILS MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-fade-in">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-scale-up max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-indigo-600 px-6 py-4.5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-white" />
                <div>
                  <h3 className="font-bold text-sm">Resumo do Pré-Pedido</h3>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-slate-100/80">ID: {selectedOrder.ID_Pedido}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="text-white hover:text-slate-200 text-sm font-semibold p-1.5 hover:bg-white/10 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Scrollable details */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
              {/* Order Meta Cards */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4.5 rounded-2xl border border-slate-150">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fornecedor</span>
                  <span className="font-bold text-slate-800 block text-xs truncate">
                    {supplierMap[selectedOrder.ID_Fornecedor] || "Fornecedor Removido"}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Data Registro</span>
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>{formatDateTime(selectedOrder.Data_Pedido)}</span>
                  </div>
                </div>

                <div className="space-y-1 col-span-2 border-t border-slate-150 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Status Atual</span>
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                        selectedOrder.Status === "Recebido"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : selectedOrder.Status === "Enviado"
                          ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {selectedOrder.Status}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400 font-bold block sm:inline-block sm:mr-1">Alterar para:</span>
                    <div className="flex items-center gap-1">
                      {["Pendente", "Enviado", "Recebido"].map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleUpdateOrderStatus(selectedOrder.ID_Pedido, st as any)}
                          className={`px-2 py-1 rounded-lg text-[9px] font-extrabold cursor-pointer transition border ${
                            selectedOrder.Status === st
                              ? "bg-slate-800 text-white border-slate-800"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Items List Table */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Produtos no Pedido</span>
                <div className="border border-slate-150 rounded-2xl overflow-hidden bg-white">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-[9px] uppercase font-bold tracking-wider border-b border-slate-150">
                        <th className="p-3 pl-4">Produto</th>
                        <th className="p-3 text-center">Unidade</th>
                        <th className="p-3 text-right">Custo na Compra</th>
                        <th className="p-3 text-center">Qtd</th>
                        <th className="p-3 text-right pr-4">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {selectedOrder.Itens.map((item, i) => {
                        const pInfo = productMap[item.ID_Produto] || { Nome: "Produto Desconhecido", UnidadeMedida: "-" };
                        const sub = item.Quantidade_Pedida * item.Preco_Custo_Atual;
                        return (
                          <tr key={i} className="text-slate-700 hover:bg-slate-50/30">
                            <td className="p-3 pl-4 font-semibold">{pInfo.Nome}</td>
                            <td className="p-3 text-center font-medium text-slate-500">{pInfo.UnidadeMedida || "Un"}</td>
                            <td className="p-3 text-right font-mono">R$ {item.Preco_Custo_Atual.toFixed(2)}</td>
                            <td className="p-3 text-center font-bold text-slate-800">{item.Quantidade_Pedida}</td>
                            <td className="p-3 text-right font-mono font-extrabold text-slate-900 pr-4">R$ {sub.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="bg-slate-900 text-white p-4 flex items-center justify-between font-mono text-xs">
                    <span className="font-bold uppercase tracking-wider text-slate-400">Total do Pedido:</span>
                    <span className="text-sm font-extrabold text-emerald-400">
                      R$ {calculateOrderTotal(selectedOrder).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-150 p-5 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => handleDeleteOrder(selectedOrder.ID_Pedido)}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                Excluir Pedido
              </button>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM RECEIVE GOODS & REGISTER LOTS MODAL */}
      {receivingOrder && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[99999] p-4 animate-fade-in">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-scale-up max-h-[85vh] flex flex-col animate-scale-up">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-indigo-600 px-6 py-4.5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-white" />
                <div>
                  <h3 className="font-bold text-sm">Confirmar Recebimento de Mercadoria</h3>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-slate-100/80">
                    Definição de Lotes • ID: {receivingOrder.ID_Pedido}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReceivingOrder(null)}
                className="text-white hover:text-slate-200 text-sm font-semibold p-1.5 hover:bg-white/10 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              <div className="bg-amber-50 border border-amber-100 text-amber-800 p-4 rounded-2xl flex flex-col gap-1 shadow-sm">
                <span className="font-bold text-xs flex items-center gap-1.5">
                  <ShoppingBag className="h-4 w-4" /> Registrar Lotes no Estoque (PEPS/FIFO)
                </span>
                <p className="text-[11px] leading-relaxed text-amber-700">
                  Os produtos deste pedido serão inseridos no estoque como novos lotes ativos. Você pode especificar o número do lote físico do fabricante impresso na embalagem de cada item, ou deixar em branco para que o sistema gere um código único automaticamente.
                </p>
              </div>

              <div className="space-y-3.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-sans">Produtos no Pedido para Entrada</span>
                
                <div className="space-y-3">
                  {receivingOrder.Itens.map((item) => {
                    const pInfo = productMap[item.ID_Produto] || { Nome: "Produto Desconhecido", UnidadeMedida: "Un" };
                    return (
                      <div key={item.ID_Produto} className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 text-xs truncate max-w-[70%]">
                            {pInfo.Nome}
                          </span>
                          <span className="bg-indigo-50 text-indigo-700 border border-indigo-150 font-bold px-2 py-0.5 rounded-full text-[10px]">
                            {item.Quantidade_Pedida} {pInfo.UnidadeMedida || "Un"}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1.5 border-t border-slate-200/60">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                              Número do Lote do Fabricante
                            </label>
                            <input
                              type="text"
                              value={lotInputs[item.ID_Produto] || ""}
                              onChange={(e) => setLotInputs({ ...lotInputs, [item.ID_Produto]: e.target.value })}
                              placeholder="Automático (ex: LOT-8A3F...)"
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-400"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                              Data de Validade
                            </label>
                            <input
                              type="date"
                              value={expiryInputs[item.ID_Produto] || ""}
                              onChange={(e) => setExpiryInputs({ ...expiryInputs, [item.ID_Produto]: e.target.value })}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-400"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4.5 border-t border-slate-150 flex items-center justify-end gap-3 shrink-0 rounded-b-3xl">
              <button
                type="button"
                onClick={() => setReceivingOrder(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 transition text-xs cursor-pointer shadow-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReceive}
                className="px-4.5 py-2.5 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:opacity-95 text-white font-bold rounded-xl shadow-md transition text-xs cursor-pointer flex items-center gap-1.5 font-sans"
              >
                <CheckCircle2 className="h-4 w-4" /> Confirmar e Receber Estoque
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
