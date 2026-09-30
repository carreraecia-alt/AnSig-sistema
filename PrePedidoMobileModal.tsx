/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from "react";
import { DatabaseState, CadProdutos, PrePedido, PrePedidoItens, ThemeColor } from "../types";
import { Plus, Trash2, X, ShoppingBag, ClipboardList, Check, Search, ChevronDown } from "lucide-react";

interface PrePedidoMobileModalProps {
  isOpen: boolean;
  onClose: () => void;
  produtos: CadProdutos[];
  activeTheme: ThemeColor;
  onSavePrePedido: (prePedido: PrePedido, itens: PrePedidoItens[]) => void;
  showAlert: (title: string, description: string) => void;
}

export default function PrePedidoMobileModal({
  isOpen,
  onClose,
  produtos,
  activeTheme,
  onSavePrePedido,
  showAlert,
}: PrePedidoMobileModalProps) {
  const [nomeCliente, setNomeCliente] = useState("");
  const [status, setStatus] = useState("Pendente");
  const [cart, setCart] = useState<{ idProduto: string; quantidade: number; precoUnitario: number }[]>([]);
  const [productSearch, setProductSearch] = useState("");

  // Form states
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [customPrice, setCustomPrice] = useState<number | "">("");

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const productDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reset scroll to top upon modal open/mount
    const timer = setTimeout(() => {
      const scrollables = document.querySelectorAll(".overflow-y-auto, [class*='overflow-y-auto']");
      scrollables.forEach((el) => {
        el.scrollTop = 0;
      });
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isDropdownOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Reset dropdown when modal closes/opens
  useEffect(() => {
    if (!isOpen) {
      setIsDropdownOpen(false);
      setProductSearch("");
    }
  }, [isOpen]);

  const filteredProdOptions = useMemo(() => {
    return produtos.filter(p => 
      p.Ativo && 
      p.Tipo === "Produto" &&
      p.Nome.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [produtos, productSearch]);

  if (!isOpen) return null;

  // Selected product lookup
  const selectedProduct = produtos.find((p) => p.Id === selectedProductId);

  const handleAddProduct = () => {
    if (!selectedProductId) {
      showAlert("Aviso", "Selecione um produto válido.");
      return;
    }
    const prod = produtos.find((p) => p.Id === selectedProductId);
    if (!prod) return;

    const finalPrice = customPrice !== "" ? Number(customPrice) : prod.Preco;

    // Add to cart
    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.idProduto === selectedProductId && item.precoUnitario === finalPrice);
      if (existingIdx > -1) {
        const copy = [...prev];
        copy[existingIdx].quantidade += quantity;
        return copy;
      } else {
        return [...prev, { idProduto: selectedProductId, quantidade: quantity, precoUnitario: finalPrice }];
      }
    });

    // Reset picker
    setSelectedProductId("");
    setQuantity(1);
    setCustomPrice("");
  };

  const handleRemoveItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const totalCartValue = cart.reduce((acc, item) => acc + item.quantidade * item.precoUnitario, 0);

  const handleSave = () => {
    if (!nomeCliente.trim()) {
      showAlert("Campo Obrigatório", "Por favor, digite o nome do cliente.");
      return;
    }
    if (cart.length === 0) {
      showAlert("Carrinho Vazio", "Por favor, adicione pelo menos um item para lançar o pré-pedido.");
      return;
    }

    const today = new Date();
    const dataStr = today.toISOString().split("T")[0];
    const horaStr = today.toTimeString().split(" ")[0].substring(0, 5);

    const prePedidoId = `pre-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const newPrePedido: PrePedido = {
      Id: prePedidoId,
      NomeCliente: nomeCliente.trim(),
      Data: dataStr,
      Hora: horaStr,
      Status: status,
    };

    const newItens: PrePedidoItens[] = cart.map((item, idx) => ({
      Id: `item-${prePedidoId}-${idx}-${Math.random().toString(36).substring(2, 4)}`,
      IdPrePedido: prePedidoId,
      IdProdutoServico: item.idProduto,
      Quantidade: item.quantidade,
      ValorUnitario: item.precoUnitario,
    }));

    onSavePrePedido(newPrePedido, newItens);
    showAlert("Sucesso!", `Pré-Pedido para "${nomeCliente}" de R$ ${totalCartValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} lançado com sucesso!`);
    
    // Clean form
    setNomeCliente("");
    setCart([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-end sm:items-center justify-center z-[9999] p-0 sm:p-4 select-none animate-fade-in font-sans">
      <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-slate-100 flex flex-col max-h-[80vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl text-white shadow-xs ${activeTheme.primary}`}>
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">
                Novo Pré-Pedido (Linha de Frente)
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Lançamento rápido via celular / equipe externa
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content (Scrollable) */}
        <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1">
          
          {/* Cliente Info */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Nome do Cliente *
            </label>
            <input
              type="text"
              placeholder="Digite o nome completo do cliente..."
              value={nomeCliente}
              onChange={(e) => setNomeCliente(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 transition focus:outline-hidden"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Status Inicial
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden"
            >
              <option value="Pendente">Pendente (Enviar p/ Caixa)</option>
              <option value="Aprovado">Aprovado / Realizado</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>

          <hr className="border-slate-100" />

          {/* Item Picker */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
            <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
              <ClipboardList className="h-4 w-4 text-slate-500" />
              Adicionar Produto (Mercadorias)
            </h4>

            <div className="space-y-3">
              <div className="relative" ref={productDropdownRef}>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Selecione o Item (Apenas Produtos)
                </label>
                <div className="relative">
                  <span className="absolute left-3 shadow-3xs top-1/2 -translate-y-1/2 flex items-center z-10 pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </span>
                  <input
                    type="text"
                    value={isDropdownOpen ? productSearch : (selectedProduct ? selectedProduct.Nome : "")}
                    onChange={(e) => {
                      if (!isDropdownOpen) setIsDropdownOpen(true);
                      setProductSearch(e.target.value);
                    }}
                    onFocus={() => {
                      setIsDropdownOpen(true);
                      setProductSearch("");
                    }}
                    placeholder={selectedProduct ? selectedProduct.Nome : "Digite para filtrar e selecionar produto..."}
                    className="w-full pl-9 pr-14 py-2.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:outline-hidden rounded-xl text-xs font-semibold text-slate-800 transition shadow-xs text-left cursor-text placeholder-slate-400"
                  />
                  
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
                    {selectedProductId && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProductId("");
                          setCustomPrice("");
                          setProductSearch("");
                        }}
                        className="text-slate-400 hover:text-slate-600 p-0.5 text-[9px] bg-slate-100 hover:bg-slate-200 rounded-full transition cursor-pointer font-sans font-bold"
                      >
                        ✕
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="text-slate-400 hover:text-slate-600 p-0.5 transition cursor-pointer"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 z-50 mt-1 max-h-52 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100 custom-scrollbar">
                    {filteredProdOptions.length > 0 ? (
                      filteredProdOptions.map((p) => (
                        <button
                          key={p.Id}
                          type="button"
                          onMouseDown={() => {
                            setSelectedProductId(p.Id);
                            setCustomPrice(p.Preco);
                            setIsDropdownOpen(false);
                            setProductSearch("");
                          }}
                          className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 text-slate-800 text-xs font-medium transition flex items-center justify-between cursor-pointer ${
                            selectedProductId === p.Id ? "bg-emerald-50/70 text-emerald-800 font-bold" : ""
                          }`}
                        >
                          <div className="pr-2">
                            <div className="text-slate-900 font-bold">{p.Nome}</div>
                            <div className="text-[10px] text-slate-500 font-mono font-medium flex items-center gap-2 mt-0.5">
                              <span>💰 Preço: R$ {p.Preco.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                              {p.UnidadeMedida && <span className="bg-slate-100 px-1 py-0.2 rounded text-[9px]">{p.UnidadeMedida}</span>}
                            </div>
                          </div>
                          {selectedProductId === p.Id ? (
                            <span className="text-emerald-600 font-bold text-sm bg-emerald-100/60 p-1 rounded-full">✓</span>
                          ) : (
                            <span className="text-[9px] bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 border border-slate-200 px-2 py-1 rounded-md font-bold uppercase font-mono shadow-3xs transition">
                              Selecionar
                            </span>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-slate-400 text-center text-xs font-sans">
                        Nenhum produto de revenda ativo encontrado para "{productSearch}".
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Quantidade
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-850"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Valor Unitário (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={selectedProduct ? selectedProduct.Preco.toFixed(2) : "0.00"}
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-850"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddProduct}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition shadow-xs"
              >
                <Plus className="h-4 w-4" />
                Inserir no Pré-Pedido
              </button>
            </div>
          </div>

          {/* Cart List */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              Itens do Pré-Pedido ({cart.length})
            </h4>

            {cart.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl text-slate-400 font-medium text-xs">
                Nenhum item adicionado ao carrinho ainda.
              </div>
            ) : (
              <div className="border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-100">
                {cart.map((item, idx) => {
                  const prodObj = produtos.find((p) => p.Id === item.idProduto);
                  return (
                    <div key={idx} className="p-3 bg-white flex items-center justify-between text-xs font-medium">
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-800">
                          {prodObj?.Nome || "Item Desconhecido"}
                        </div>
                        <div className="text-slate-400 font-mono text-[11px]">
                          {item.quantidade}x R$ {item.precoUnitario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-slate-900 font-mono text-[11px]">
                          R$ {(item.quantidade * item.precoUnitario).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
          <div className="font-sans">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Lançado
            </span>
            <span className="text-base font-extrabold text-slate-900 font-mono leading-none">
              R$ {totalCartValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSave}
            title="Salvar Pré-Pedido"
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition shadow-md hover:shadow-lg"
          >
            <Check className="h-4 w-4" />
            Salvar Pré-Pedido
          </button>
        </div>

      </div>
    </div>
  );
}
