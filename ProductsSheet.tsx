/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from "react";
import { CadProdutos, LotesProdutos, ThemeColor, CadFornecedores } from "../types";
import { Plus, Trash2, Search, CheckSquare, Square, ShoppingBag, Sparkles, X, Layers, Boxes, Calendar, History, Trash, Pencil, Barcode, Users, Compass, Phone, ShieldCheck, ChevronUp, ChevronsUp, ChevronsDown, ChevronDown, Save, RotateCcw } from "lucide-react";

interface ProductsProps {
  produtos: CadProdutos[];
  lotesProdutos: LotesProdutos[];
  fornecedores?: CadFornecedores[];
  onUpdateFornecedores?: (updated: CadFornecedores[]) => void;
  activeTheme: ThemeColor;
  currentUserOwnerId: string;
  isAdminViewAll?: boolean;
  onUpdateProdutos: (updated: CadProdutos[]) => void;
  onUpdateLotesProdutos: (updated: LotesProdutos[]) => void;
  showConfirm: (title: string, msg: string, onConfirm: () => void) => void;
  showAlert: (title: string, msg: string) => void;
  isRestricted?: boolean;
  userPermissionLevel?: number;
}

function SupplierCombobox({
  value,
  onChange,
  fornecedores,
  placeholder = "Selecione ou pesquise o fornecedor...",
  disabled = false,
}: {
  value: string;
  onChange: (id: string) => void;
  fornecedores: CadFornecedores[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedSupplier = React.useMemo(() => {
    return fornecedores.find((f) => f.ID_Fornecedor === value);
  }, [fornecedores, value]);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return fornecedores;
    return fornecedores.filter((f) =>
      f.Nome_Fornecedor.toLowerCase().includes(search.toLowerCase()) ||
      (f.Categoria && f.Categoria.toLowerCase().includes(search.toLowerCase()))
    );
  }, [fornecedores, search]);

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs flex items-center justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${disabled ? "opacity-75 cursor-not-allowed" : ""}`}
      >
        <span className="truncate">
          {selectedSupplier ? `${selectedSupplier.Nome_Fornecedor} (${selectedSupplier.Categoria || "Sem Categoria"})` : (value ? value : placeholder)}
        </span>
        <span className="text-slate-400 text-[10px] ml-1">▼</span>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto custom-scrollbar p-2">
          <input
            type="text"
            placeholder="Pesquisar fornecedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none mb-2"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="space-y-1">
            <div
              onClick={() => {
                onChange("");
                setIsOpen(false);
                setSearch("");
              }}
              className="px-2 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition font-semibold"
            >
              [ Limpar Seleção ]
            </div>
            {filtered.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-slate-400 italic">
                Nenhum fornecedor encontrado.
              </div>
            ) : (
              filtered.map((f) => (
                <div
                  key={f.ID_Fornecedor}
                  onClick={() => {
                    onChange(f.ID_Fornecedor);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className={`px-2 py-1.5 text-xs rounded-lg cursor-pointer transition flex flex-col ${value === f.ID_Fornecedor ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-slate-700 hover:bg-slate-50"}`}
                >
                  <span className="font-medium">{f.Nome_Fornecedor}</span>
                  {f.CNPJ_CPF && <span className="text-[9px] text-slate-400">CNPJ/CPF: {f.CNPJ_CPF}</span>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductsSheet({
  produtos,
  lotesProdutos,
  fornecedores = [],
  onUpdateFornecedores,
  activeTheme,
  currentUserOwnerId,
  isAdminViewAll = false,
  onUpdateProdutos,
  onUpdateLotesProdutos,
  showConfirm,
  showAlert,
  isRestricted = false,
  userPermissionLevel = 1,
}: ProductsProps) {
  const tableCardRef = useRef<HTMLDivElement>(null);

  const scrollToTopProducts = () => {
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

  const scrollToBottomProducts = () => {
    tableCardRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // Suppliers states
  const [showFornecedoresModal, setShowFornecedoresModal] = useState(false);
  const [fornecedorNome, setFornecedorNome] = useState("");
  const [fornecedorCategoria, setFornecedorCategoria] = useState("Acessórios");
  const [fornecedorTelefone, setFornecedorTelefone] = useState("");
  const [fornecedorCnpjCpf, setFornecedorCnpjCpf] = useState("");
  const [fornecedorChavePix, setFornecedorChavePix] = useState("");
  const [fornecedorSearch, setFornecedorSearch] = useState("");

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fornecedorNome.trim()) {
      showAlert("Atenção ⚠️", "Por favor, preencha o Nome do Fornecedor.");
      return;
    }

    const newSupplier: CadFornecedores = {
      ID_Fornecedor: `forn-${Math.random().toString(36).substr(2, 9)}`,
      Nome_Fornecedor: fornecedorNome.trim(),
      Categoria: fornecedorCategoria,
      Telefone: fornecedorTelefone.trim(),
      CNPJ_CPF: fornecedorCnpjCpf.trim(),
      Chave_Pix: fornecedorChavePix.trim(),
    };

    const updatedList = [...fornecedores, newSupplier];
    if (onUpdateFornecedores) {
      onUpdateFornecedores(updatedList);
    }

    // Reset inputs
    setFornecedorNome("");
    setFornecedorTelefone("");
    setFornecedorCnpjCpf("");
    setFornecedorChavePix("");
    showAlert("Sucesso ✓", `Fornecedor "${newSupplier.Nome_Fornecedor}" cadastrado com sucesso!`);
  };

  const handleDeleteSupplier = (id: string) => {
    const supplier = fornecedores.find((f) => f.ID_Fornecedor === id);
    if (!supplier) return;

    showConfirm(
      "Excluir Fornecedor ⚠️",
      `Deseja mesmo remover o fornecedor "${supplier.Nome_Fornecedor}"?`,
      () => {
        const updatedList = fornecedores.filter((f) => f.ID_Fornecedor !== id);
        if (onUpdateFornecedores) {
          onUpdateFornecedores(updatedList);
        }
        showAlert("Removido", "Fornecedor removido com sucesso.");
      }
    );
  };

  // Camera Barcode Scanner states (File scan approach)
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanTargetCallback, setScanTargetCallback] = useState<((val: string) => void) | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const addBarcodeRef = React.useRef<HTMLInputElement | null>(null);
  const editBarcodeRef = React.useRef<HTMLInputElement | null>(null);

  const handleStartScanning = (callback: (val: string) => void) => {
    // Detect mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (window.innerWidth <= 768);

    if (!isMobile) {
      // No PC ou notebook, foca diretamente o campo e orienta o usuário
      if (showAddModal && addBarcodeRef.current) {
        addBarcodeRef.current.focus();
        showAlert("Leitor Físico Ativo 🔌", "O campo Código de Barras foi focado. Você já pode passar o código no seu leitor físico ou digitar manualmente.");
      } else if (showEditModal && editBarcodeRef.current) {
        editBarcodeRef.current.focus();
        showAlert("Leitor Físico Ativo 🔌", "O campo Código de Barras foi focado. Você já pode passar o código no seu leitor físico ou digitar manualmente.");
      } else {
        showAlert("Leitor Ativo", "Clique no campo Código de Barras do produto para digitar ou bipar com o leitor físico.");
      }
      return;
    }

    setScannerError(null);
    setIsProcessing(false);
    setScanTargetCallback(() => callback);
    setIsScanning(true);

    // Abre imediatamente o seletor nativo de câmera/arquivo do dispositivo
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
        fileInputRef.current.click();
      }
    }, 100);
  };

  const handleStopScanning = () => {
    setIsScanning(false);
    setIsProcessing(false);
    setScanTargetCallback(null);
    setScannerError(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      // Se o usuário cancelou a captura, fechamos o overlay
      setIsScanning(false);
      return;
    }

    setScannerError(null);
    setIsProcessing(true);

    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");

      const formatsToSupport = [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.ITF,
        Html5QrcodeSupportedFormats.QR_CODE
      ];

      // Inicializa o leitor apontando para o div oculto
      const html5QrCode = new Html5Qrcode("barcode-reader-hidden", { formatsToSupport, verbose: false });
      
      const decodedText = await html5QrCode.scanFile(file, false);
      
      if (scanTargetCallback) {
        scanTargetCallback(decodedText);
      }
      setIsScanning(false);
      setIsProcessing(false);
      setScanTargetCallback(null);
    } catch (err: any) {
      console.error("Erro ao decodificar imagem de código de barras:", err);
      setIsProcessing(false);
      setScannerError(
        "Não foi possível identificar um código de barras legível nesta foto. Certifique-se de alinhar o código na horizontal, sob boa iluminação e foco nítido, ou digite manualmente."
      );
    }
  };

  // For Lot management modal
  const [activeProductForLots, setActiveProductForLots] = useState<CadProdutos | null>(null);
  const [newLoteNumero, setNewLoteNumero] = useState("");
  const [newLoteQuantidade, setNewLoteQuantidade] = useState("0");
  const [newLoteValidade, setNewLoteValidade] = useState("");
  const [newLoteDataEntrada, setNewLoteDataEntrada] = useState(new Date().toISOString().split("T")[0]);
  
  // States for editing an existing lot
  const [editingLotId, setEditingLotId] = useState<string | null>(null);
  const [editLoteNumero, setEditLoteNumero] = useState("");
  const [editLoteQuantidade, setEditLoteQuantidade] = useState("0");
  const [editLoteValidade, setEditLoteValidade] = useState("");
  const [editLoteDataEntrada, setEditLoteDataEntrada] = useState("");
  const [editLoteAtivo, setEditLoteAtivo] = useState(true);

  // Form inputs
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("Banho");
  const [preco, setPreco] = useState("45.00");
  const [estoqueAtual, setEstoqueAtual] = useState("0");
  const [estoqueMinimo, setEstoqueMinimo] = useState("0");
  const [custo, setCusto] = useState("0.00");
  const [codigoDeBarras, setCodigoDeBarras] = useState("");
  const [unidadeMedida, setUnidadeMedida] = useState("Un");
  const [fornecedor, setFornecedor] = useState("");
  const [dataUltimaCompra, setDataUltimaCompra] = useState("");
  const [ncm, setNcm] = useState("");
  const [cest, setCest] = useState("");
  const [origemProduto, setOrigemProduto] = useState("0");
  const [validade, setValidade] = useState("");

  const activeProductLots = useMemo(() => {
    if (!activeProductForLots) return [];
    return lotesProdutos.filter((l) => l.IdProduto === activeProductForLots.Id);
  }, [lotesProdutos, activeProductForLots]);

  // Edit Product Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editTipo, setEditTipo] = useState("Banho");
  const [editPreco, setEditPreco] = useState("45.00");
  const [editCusto, setEditCusto] = useState("0.00");
  const [editCodigoDeBarras, setEditCodigoDeBarras] = useState("");
  const [editUnidadeMedida, setEditUnidadeMedida] = useState("Un");
  const [editFornecedor, setEditFornecedor] = useState("");
  const [editDataUltimaCompra, setEditDataUltimaCompra] = useState("");
  const [editNcm, setEditNcm] = useState("");
  const [editCest, setEditCest] = useState("");
  const [editOrigemProduto, setEditOrigemProduto] = useState("0");

  const handleStartEditProduct = (prod: CadProdutos) => {
    setEditingProductId(prod.Id);
    setEditNome(prod.Nome || "");
    setEditTipo(prod.Tipo || "Banho");
    setEditPreco(prod.Preco !== undefined ? prod.Preco.toString() : "0.00");
    setEditCusto(prod.Custo !== undefined ? prod.Custo.toString() : "0.00");
    setEditCodigoDeBarras(prod.CodigoDeBarras || "");
    setEditUnidadeMedida(prod.UnidadeMedida || "Un");
    setEditFornecedor(prod.Fornecedor || "");
    setEditDataUltimaCompra(prod.DataUltimaCompra || "");
    setEditNcm(prod.NCM || "");
    setEditCest(prod.CEST || "");
    setEditOrigemProduto(prod.OrigemProduto !== undefined ? prod.OrigemProduto.toString() : "0");
    setShowEditModal(true);
  };

  const handleSaveEditProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (userPermissionLevel === 3) {
      showAlert("Acesso Restrito 🔒", "Nível de permissão 3 (Consulta e Pré-Venda) não autoriza edições ou alterações.");
      return;
    }
    if (!editingProductId) return;
    if (!editNome.trim()) return;

    const parsedPrice = parseFloat(editPreco) || 0;
    const parsedCusto = parseFloat(editCusto) || 0;

    const updated = produtos.map((p) => {
      if (p.Id === editingProductId) {
        return {
          ...p,
          Nome: editNome.trim(),
          Tipo: editTipo,
          Preco: parsedPrice,
          Custo: parsedCusto,
          CodigoDeBarras: editCodigoDeBarras.trim() || undefined,
          UnidadeMedida: editUnidadeMedida.trim() || undefined,
          Fornecedor: editFornecedor.trim() || undefined,
          DataUltimaCompra: editDataUltimaCompra || undefined,
          NCM: editNcm.trim() || undefined,
          CEST: editCest.trim() || undefined,
          OrigemProduto: editOrigemProduto || undefined,
        };
      }
      return p;
    });

    onUpdateProdutos(updated);
    setShowEditModal(false);
    setEditingProductId(null);
    showAlert("Sucesso", "Produto/serviço atualizado com sucesso!");
  };

  const handleCreateLotInModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProductForLots) return;
    if (!newLoteNumero.trim()) {
      showAlert("Atenção", "Indique o número de identificação do lote.");
      return;
    }
    const qty = parseInt(newLoteQuantidade) || 0;
    if (qty <= 0) {
      showAlert("Atenção", "A quantidade do lote deve ser maior que zero.");
      return;
    }
    if (!newLoteValidade) {
      showAlert("Atenção", "Indique a data de validade deste lote.");
      return;
    }

    const newLot: LotesProdutos = {
      IdLote: `lote-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      IdProduto: activeProductForLots.Id,
      NumeroLote: newLoteNumero.trim().toUpperCase(),
      QuantidadeLote: qty,
      ValidadeLote: newLoteValidade,
      DataEntrada: newLoteDataEntrada || new Date().toISOString().split("T")[0]
    };

    onUpdateLotesProdutos([...lotesProdutos, newLot]);
    
    // Reset modal form inputs to intuitive sequential layout
    setNewLoteNumero(`LOT-${String(lotesProdutos.filter(l => l.IdProduto === activeProductForLots.Id).length + 2).padStart(3, "0")}`);
    setNewLoteQuantidade("100");
    setNewLoteValidade(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
    showAlert("Sucesso", "Novo lote de estoque registrado com sucesso!");
  };

  const handleDeleteLotInModal = (idLote: string) => {
    showConfirm(
      "Excluir Lote",
      "Tem certeza que deseja apagar este lote de estoque do sistema? Essa operação reduzirá a quantidade disponível deste produto.",
      () => {
        const updated = lotesProdutos.filter((l) => l.IdLote !== idLote);
        onUpdateLotesProdutos(updated);
        if (editingLotId === idLote) {
          setEditingLotId(null);
        }
      }
    );
  };

  const handleStartEditLot = (lot: LotesProdutos) => {
    setEditingLotId(lot.IdLote);
    setEditLoteNumero(lot.NumeroLote);
    setEditLoteQuantidade(lot.QuantidadeLote.toString());
    setEditLoteDataEntrada(lot.DataEntrada || "");
    setEditLoteValidade(lot.ValidadeLote || "");
    setEditLoteAtivo(lot.Ativo !== false);
  };

  const handleSaveEditLot = (idLote: string) => {
    if (userPermissionLevel === 3) {
      showAlert("Acesso Restrito 🔒", "Nível de permissão 3 não autoriza edições.");
      return;
    }
    if (!editLoteNumero.trim()) {
      showAlert("Atenção", "O número do lote não pode estar vazio.");
      return;
    }
    const qty = parseInt(editLoteQuantidade);
    if (isNaN(qty) || qty < 0) {
      showAlert("Atenção", "A quantidade do lote deve ser um número maior ou igual a zero.");
      return;
    }
    if (!editLoteValidade) {
      showAlert("Atenção", "Indique a data de validade.");
      return;
    }

    const updated = lotesProdutos.map((lot) => {
      if (lot.IdLote === idLote) {
        return {
          ...lot,
          NumeroLote: editLoteNumero.trim().toUpperCase(),
          QuantidadeLote: qty,
          DataEntrada: editLoteDataEntrada || new Date().toISOString().split("T")[0],
          ValidadeLote: editLoteValidade,
          Ativo: editLoteAtivo
        };
      }
      return lot;
    });

    onUpdateLotesProdutos(updated);
    setEditingLotId(null);
    showAlert("Sucesso", "Lote de estoque atualizado com sucesso!");
  };

  // Every user manages their own products. Some initial products don't have owner ID, we treat those as shared/global,
  // but if they are edited or created, we keep them for this owner.
  // To keep isolation perfect, let's allow editing existing products, and tag any new one with owner identifier.
  const myProducts = useMemo(() => {
    if (isAdminViewAll) {
      return produtos;
    }
    // Return products with owner matching current user or global seeded products
    return produtos.filter(
      (p) => {
        const prodAsAny = p as any;
        return !prodAsAny.IdUsuarioDono || prodAsAny.IdUsuarioDono === currentUserOwnerId;
      }
    );
  }, [produtos, currentUserOwnerId, isAdminViewAll]);

  // Apply Search Filters
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return myProducts;
    const query = searchTerm.toLowerCase();
    return myProducts.filter(
      (p) =>
        p.Nome.toLowerCase().includes(query) ||
        p.Tipo.toLowerCase().includes(query) ||
        p.Preco.toString().includes(query) ||
        (p.CodigoDeBarras || "").toLowerCase().includes(query)
    );
  }, [myProducts, searchTerm]);

  // Handle submissions
  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (userPermissionLevel === 3) {
      showAlert("Acesso Restrito 🔒", "Nível de permissão 3 (Consulta e Pré-Venda) não autoriza edições ou alterações.");
      return;
    }
    if (!nome.trim()) return;

    const parsedPrice = parseFloat(preco) || 0;
    const parsedEstoque = parseInt(estoqueAtual) || 0;
    const parsedCusto = parseFloat(custo) || 0;

    const newProd: CadProdutos = {
      Id: `prod-${Date.now()}`,
      Nome: nome.trim(),
      Tipo: tipo,
      Preco: parsedPrice,
      Ativo: true,
      Custo: parsedCusto,
      CodigoDeBarras: codigoDeBarras.trim() || undefined,
      UnidadeMedida: unidadeMedida.trim() || undefined,
      Fornecedor: fornecedor.trim() || undefined,
      DataUltimaCompra: dataUltimaCompra.trim() || undefined,
      NCM: ncm.trim() || undefined,
      CEST: cest.trim() || undefined,
      OrigemProduto: origemProduto.trim() !== "" ? (isNaN(Number(origemProduto)) ? origemProduto.trim() : Number(origemProduto)) : undefined
    };

    // Store with ownership info
    (newProd as any).IdUsuarioDono = currentUserOwnerId;

    onUpdateProdutos([...produtos, newProd]);

    // If starting inventory is specified, register as first lot automatically
    if (parsedEstoque > 0) {
      const initialLot: LotesProdutos = {
        IdLote: `lote-${Date.now()}`,
        IdProduto: newProd.Id,
        NumeroLote: "LOTE-INICIAL",
        QuantidadeLote: parsedEstoque,
        ValidadeLote: validade.trim() || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        DataEntrada: new Date().toISOString().split("T")[0]
      };
      onUpdateLotesProdutos([...lotesProdutos, initialLot]);
    }

    setNome("");
    setTipo("Banho");
    setPreco("45.00");
    setEstoqueAtual("0");
    setEstoqueMinimo("0");
    setCusto("0.00");
    setCodigoDeBarras("");
    setUnidadeMedida("Un");
    setFornecedor("");
    setDataUltimaCompra("");
    setNcm("");
    setCest("");
    setOrigemProduto("0");
    setValidade("");
    setShowAddModal(false);
  };

  const handleCellChange = (id: string, field: keyof CadProdutos, value: any) => {
    if (userPermissionLevel === 3) {
      showAlert("Acesso Restrito 🔒", "Nível de permissão 3 (Consulta e Pré-Venda) não autoriza edições ou alterações.");
      return;
    }
    const updated = produtos.map((p) => {
      if (p.Id === id) {
        // Carry ownership details or assign them on-the-fly
        const updatedProd = { ...p, [field]: value };
        if (!(updatedProd as any).IdUsuarioDono) {
          (updatedProd as any).IdUsuarioDono = currentUserOwnerId;
        }
        return updatedProd;
      }
      return p;
    });
    onUpdateProdutos(updated);
  };

  const handleDeleteProduct = (id: string) => {
    if (userPermissionLevel === 3) {
      showAlert("Acesso Restrito 🔒", "Nível de permissão 3 (Consulta e Pré-Venda) não autoriza edições ou alterações.");
      return;
    }
    showConfirm(
      "Desativar Serviço",
      "Deseja mesmo desativar este serviço do catálogo? Ele não aparecerá em novos agendamentos.",
      () => {
        const updated = produtos.map((p) => {
          if (p.Id === id) {
            return { ...p, Ativo: false };
          }
          return p;
        });
        onUpdateProdutos(updated);
      }
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white p-5 rounded-2xl border border-slate-200 gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-md bg-emerald-50 text-emerald-700">
              <ShoppingBag className="h-4 w-4" />
            </span>
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 font-mono">
              Catálogo de Serviços da Empresa
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-800">
            Serviços e Produtos (CadProdutos)
          </h2>
        </div>

        {!isRestricted && (
          <div className="flex items-center gap-2">
            <button
              disabled={userPermissionLevel === 3}
              onClick={() => {
                if (userPermissionLevel === 3) return;
                setShowAddModal(true);
              }}
              className={`inline-flex items-center gap-1.5 px-4.5 py-2 rounded-xl text-xs font-semibold transition-all transform ${
                userPermissionLevel === 3
                  ? "bg-slate-300 text-slate-500 opacity-60 cursor-not-allowed border border-slate-400"
                  : `shadow-xs hover:shadow active:scale-95 cursor-pointer ${activeTheme.primary}`
              }`}
              title={userPermissionLevel === 3 ? "Acesso Restrito: Nível 3 não pode cadastrar produtos." : "Novo Serviço"}
            >
              <Plus className="h-4 w-4" />
              Novo Serviço
            </button>
          </div>
        )}
      </div>

      {/* Grid Content */}
      <div ref={tableCardRef} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in-down">
        
        {/* Search Input bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Pesquisar por Código, Nome, Tipo de Serviço ou Preço..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-600"
            />
          </div>

          <div className="text-xs text-slate-400 font-mono">
            Mostrando {filteredProducts.length} de {myProducts.length} itens catalogados
          </div>
        </div>

        {/* Dense SpreadSheet Table */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse table-fixed min-w-[1970px]">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-mono text-[10px] uppercase font-semibold">
                <th className="w-44 p-2 border-r border-slate-200">Cód. de Barras</th>
                <th className="w-56 p-2 border-r border-slate-200">Nome do Serviço / Item</th>
                <th className="w-32 p-2 border-r border-slate-200">Tipo de Atividade</th>
                <th className="w-28 p-2 border-r border-slate-200">Preço Venda (R$)</th>
                <th className="w-28 p-2 border-r border-slate-200">Preço Custo (R$)</th>
                <th className="w-26 p-2 text-center border-r border-slate-200">Estoque Total</th>
                <th className="w-52 p-2 text-center border-r border-slate-200">Controle de Lotes</th>
                <th className="w-22 p-2 border-r border-slate-200">Unidade</th>
                <th className="w-36 p-2 border-r border-slate-200">Fornecedor</th>
                <th className="w-32 p-2 border-r border-slate-200">Dta. Últ. Compra</th>
                <th className="w-24 p-2 border-r border-slate-200">NCM (Fiscal)</th>
                <th className="w-24 p-2 border-r border-slate-200">CEST (Fiscal)</th>
                <th className="w-32 p-2 border-r border-slate-200">Origem</th>
                <th className="w-20 p-2 text-center border-r border-slate-200">Ativo</th>
                <th className="w-20 p-2 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-mono">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={16} className="py-12 text-center text-slate-400 bg-white font-sans text-xs">
                    Nenhum produto cadastrado no momento.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p, idx) => {
                  return (
                    <tr
                      key={p.Id}
                      className={`hover:bg-slate-50/80 transition-colors group ${
                        idx % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                      } ${!p.Ativo ? "opacity-60" : ""}`}
                    >
                      {/* CÓDIGO DE BARRAS */}
                      <td className="p-1 border-r border-slate-100 focus-within:ring-2 focus-within:ring-indigo-500/30">
                        <input
                          type="text"
                          disabled={isRestricted}
                          value={p.CodigoDeBarras || ""}
                          onChange={(e) => handleCellChange(p.Id, "CodigoDeBarras", e.target.value)}
                          className={`w-full bg-transparent border-0 p-1 focus:outline-none text-xs text-slate-800 font-mono tracking-tight ${isRestricted ? "opacity-75 cursor-not-allowed" : ""}`}
                          placeholder="Digite ou bipe"
                        />
                      </td>

                      {/* NOME EDIT */}
                      <td className="p-1 border-r border-slate-100 text-slate-800 font-bold focus-within:ring-2 focus-within:ring-emerald-500/30">
                        <input
                          type="text"
                          disabled={isRestricted}
                          value={p.Nome}
                          onChange={(e) => handleCellChange(p.Id, "Nome", e.target.value)}
                          className={`w-full bg-transparent border-0 p-1 focus:outline-none text-xs font-bold text-slate-800 ${isRestricted ? "opacity-75 cursor-not-allowed" : ""}`}
                          placeholder="Nome do serviço"
                        />
                      </td>

                      {/* TIPO STATUS DROPDOWN */}
                      <td className="p-1 border-r border-slate-100">
                        <select
                          value={p.Tipo}
                          disabled={isRestricted}
                          onChange={(e) => handleCellChange(p.Id, "Tipo", e.target.value)}
                          className={`w-full bg-transparent border-0 p-1 focus:outline-none text-xs text-slate-700 font-mono ${isRestricted ? "opacity-75 cursor-not-allowed" : ""}`}
                        >
                          <option value="Banho font-normal">🛁 Banho</option>
                          <option value="Tosa">✂️ Tosa</option>
                          <option value="Combo">📦 Combo</option>
                          <option value="Estética">💅 Estética</option>
                          <option value="Tratamento">💊 Tratamento</option>
                          <option value="Acessório">🧸 Acessório</option>
                          <option value="Produto">📦 Produto</option>
                          <option value="Outro">✨ Outro</option>
                        </select>
                      </td>

                      {/* PREÇO EDIT */}
                      <td className="p-1 border-r border-slate-100 font-semibold focus-within:ring-2 focus-within:ring-emerald-500/30">
                        <div className="flex items-center gap-1 pl-1 font-semibold text-emerald-800">
                          <span className="text-[10px] text-emerald-600">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            disabled={isRestricted}
                            value={p.Preco}
                            onChange={(e) => handleCellChange(p.Id, "Preco", parseFloat(e.target.value) || 0)}
                            className={`w-full bg-transparent border-0 p-1 focus:outline-none text-xs text-emerald-800 font-semibold ${isRestricted ? "opacity-75 cursor-not-allowed" : ""}`}
                          />
                        </div>
                      </td>

                      {/* CUSTO EDIT */}
                      <td className="p-1 border-r border-slate-100 font-semibold focus-within:ring-2 focus-within:ring-amber-500/30">
                        <div className="flex items-center gap-1 pl-1 font-semibold text-slate-755">
                          <span className="text-[10px] text-slate-400">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            disabled={isRestricted}
                            value={p.Custo !== undefined ? p.Custo : 0}
                            onChange={(e) => handleCellChange(p.Id, "Custo", parseFloat(e.target.value) || 0)}
                            className={`w-full bg-transparent border-0 p-1 focus:outline-none text-xs text-slate-650 font-semibold ${isRestricted ? "opacity-75 cursor-not-allowed" : ""}`}
                          />
                        </div>
                      </td>

                      {/* ESTOQUE TOTAL */}
                      <td className="p-2 border-r border-slate-100 text-center font-bold text-slate-800 bg-slate-50/20">
                        {lotesProdutos.filter((l) => l.IdProduto === p.Id).reduce((sum, l) => sum + l.QuantidadeLote, 0)}
                      </td>

                      {/* CONTROLE DE LOTES */}
                      <td className="p-1.5 border-r border-slate-100 text-center">
                        <div className="flex items-center justify-center gap-1.5 align-middle">
                          <span className="text-[11px] font-semibold font-sans px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {lotesProdutos.filter((l) => l.IdProduto === p.Id && l.QuantidadeLote > 0).length} Lotes
                          </span>
                          <button
                            type="button"
                            disabled={userPermissionLevel === 3}
                            onClick={() => {
                              if (userPermissionLevel === 3) return;
                              setActiveProductForLots(p);
                              setNewLoteNumero(`LOT-${String(lotesProdutos.filter((l) => l.IdProduto === p.Id).length + 1).padStart(3, "0")}`);
                              setNewLoteQuantidade("100");
                              setNewLoteValidade(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
                            }}
                            className={`px-2 py-1 text-[10px] font-bold rounded-lg transition border ${
                              userPermissionLevel === 3
                                ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                                : "text-indigo-600 bg-indigo-50 hover:bg-indigo-100 cursor-pointer border border-indigo-200"
                            }`}
                            title={userPermissionLevel === 3 ? "Acesso Restrito: Nível 3 não pode gerenciar lotes." : "Gerenciar Lotes"}
                          >
                            Gerenciar
                          </button>
                        </div>
                      </td>

                      {/* UNIDADE MEDIDA */}
                      <td className="p-1 border-r border-slate-100 focus-within:ring-2 focus-within:ring-slate-500/30">
                        <input
                          type="text"
                          disabled={isRestricted}
                          value={p.UnidadeMedida || ""}
                          onChange={(e) => handleCellChange(p.Id, "UnidadeMedida", e.target.value)}
                          className={`w-full bg-transparent border-0 p-1 focus:outline-none text-xs text-slate-705 font-mono ${isRestricted ? "opacity-75 cursor-not-allowed" : ""}`}
                          placeholder="ex: Un"
                        />
                      </td>

                      {/* FORNECEDOR */}
                      <td className="p-1 border-r border-slate-100 focus-within:ring-2 focus-within:ring-slate-500/30">
                        <select
                          disabled={isRestricted}
                          value={p.Fornecedor || ""}
                          onChange={(e) => handleCellChange(p.Id, "Fornecedor", e.target.value)}
                          className={`w-full bg-transparent border-0 p-1 focus:outline-none text-xs text-slate-705 font-mono ${isRestricted ? "opacity-75 cursor-not-allowed" : ""}`}
                        >
                          <option value="">[Nenhum Fornecedor]</option>
                          {fornecedores.map((f) => (
                            <option key={f.ID_Fornecedor} value={f.ID_Fornecedor}>
                              {f.Nome_Fornecedor}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* DATA ULTIMA COMPRA */}
                      <td className="p-1 border-r border-slate-100 focus-within:ring-2 focus-within:ring-slate-500/30">
                        <input
                          type="date"
                          disabled={isRestricted}
                          value={p.DataUltimaCompra || ""}
                          onChange={(e) => handleCellChange(p.Id, "DataUltimaCompra", e.target.value)}
                          className={`w-full bg-transparent border-0 p-1 focus:outline-none text-xs text-slate-705 font-mono ${isRestricted ? "opacity-75 cursor-not-allowed" : ""}`}
                        />
                      </td>



                      {/* NCM */}
                      <td className="p-1 border-r border-slate-100 focus-within:ring-2 focus-within:ring-slate-500/30">
                        <input
                          type="text"
                          maxLength={8}
                          disabled={isRestricted}
                          value={p.NCM || ""}
                          onChange={(e) => handleCellChange(p.Id, "NCM", e.target.value)}
                          className={`w-full bg-transparent border-0 p-1 focus:outline-none text-xs text-slate-705 font-mono ${isRestricted ? "opacity-75 cursor-not-allowed" : ""}`}
                          placeholder="8 dígitos"
                        />
                      </td>

                      {/* CEST */}
                      <td className="p-1 border-r border-slate-100 focus-within:ring-2 focus-within:ring-slate-500/30">
                        <input
                          type="text"
                          maxLength={7}
                          disabled={isRestricted}
                          value={p.CEST || ""}
                          onChange={(e) => handleCellChange(p.Id, "CEST", e.target.value)}
                          className={`w-full bg-transparent border-0 p-1 focus:outline-none text-xs text-slate-705 font-mono ${isRestricted ? "opacity-75 cursor-not-allowed" : ""}`}
                          placeholder="7 dígitos"
                        />
                      </td>

                      {/* ORIGEM PRODUTO */}
                      <td className="p-1 border-r border-slate-100 focus-within:ring-2 focus-within:ring-slate-500/30">
                        <select
                          value={p.OrigemProduto !== undefined ? p.OrigemProduto : ""}
                          disabled={isRestricted}
                          onChange={(e) => handleCellChange(p.Id, "OrigemProduto", e.target.value)}
                          className={`w-full bg-transparent border-0 p-1 focus:outline-none text-xs text-slate-705 font-mono ${isRestricted ? "opacity-75 cursor-not-allowed" : ""}`}
                        >
                          <option value="">Selecione...</option>
                          <option value="0">0 - Nacional</option>
                          <option value="1">1 - Estrangeira (Importação direta)</option>
                          <option value="2">2 - Estrangeira (Adquirida no mercado interno)</option>
                          <option value="3">3 - Nacional (Conteúdo de importação &gt; 40%)</option>
                          <option value="4">4 - Nacional (Produção conforme processos regulados)</option>
                          <option value="5">5 - Nacional (Conteúdo de importação &lt;= 40%)</option>
                          <option value="6">6 - Estrangeira (Importação direta, sem similar nacional)</option>
                          <option value="7">7 - Estrangeira (Adquirida internamente, sem similar nacional)</option>
                          <option value="8">8 - Nacional (Mercadoria ou bem com conteúdo de importação &gt; 70%)</option>
                        </select>
                      </td>

                      {/* ACTIVE STATUS CHECKBOX */}
                      <td className="p-1 border-r border-slate-100 text-center">
                        <button
                          type="button"
                          disabled={isRestricted}
                          onClick={() => handleCellChange(p.Id, "Ativo", !p.Ativo)}
                          className={`inline-flex items-center justify-center p-1.5 rounded-lg transition ${isRestricted ? "opacity-40 cursor-not-allowed" : "hover:bg-slate-100"}`}
                        >
                          {p.Ativo ? (
                            <CheckSquare className="h-4.5 w-4.5 text-emerald-600" />
                          ) : (
                            <Square className="h-4.5 w-4.5 text-slate-350" />
                          )}
                        </button>
                      </td>

                      {/* ACTIONS */}
                      <td className="p-1 text-center align-middle">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            disabled={userPermissionLevel === 3}
                            onClick={() => {
                              if (userPermissionLevel === 3) return;
                              handleStartEditProduct(p);
                            }}
                            className={`p-1 rounded-lg transition ${
                              userPermissionLevel === 3
                                ? "text-slate-350 cursor-not-allowed opacity-50 bg-slate-50 border border-slate-200"
                                : "text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                            }`}
                            title={userPermissionLevel === 3 ? "Acesso Restrito: Nível 3 não pode editar produtos." : "Editar Serviço"}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {!isRestricted ? (
                            <button
                              type="button"
                              disabled={userPermissionLevel === 3}
                              onClick={() => {
                                if (userPermissionLevel === 3) return;
                                handleDeleteProduct(p.Id);
                              }}
                              className={`p-1 rounded-lg transition font-sans ${
                                userPermissionLevel === 3
                                  ? "text-slate-350 cursor-not-allowed opacity-50 bg-slate-50 border border-slate-200"
                                  : "text-slate-400 hover:text-red-500 hover:bg-red-50 cursor-pointer"
                              }`}
                              title={userPermissionLevel === 3 ? "Acesso Restrito: Nível 3 não pode excluir produtos." : "Desativar Serviço"}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-sans italic">Bloqueado</span>
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

        {/* Footer info message */}
        <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-400 font-mono text-center">
          Cada usuário tem seu catálogo exclusivo de preços de banho e tosa. A reconfiguração de custos será refletida dinamicamente na inserção de novas linhas de agenda.
        </div>
      </div>

      {/* Modal - Cadastrar Serviço */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 select-none">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-scale-up max-h-[90vh] flex flex-col">
            
            <div className="bg-gradient-to-r from-emerald-600 to-indigo-600 px-6 py-4.5 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold font-display tracking-tight text-base">
                  Cadastrar Novo Serviço
                </h3>
                <p className="text-[10px] text-emerald-100 uppercase tracking-wider font-mono">
                  Adição de Custos (CadProdutos)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-white hover:text-slate-150 text-sm font-semibold p-1 hover:bg-white/10 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              
              {/* Product Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                  Nome do Serviço / Produto
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Tosa Tesoura - Porte Médio"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              {/* Tipo Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                  Categoria de Serviço
                </label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none"
                >
                  <option value="Banho">🛁 Banho</option>
                  <option value="Tosa">✂️ Tosa</option>
                  <option value="Combo">📦 Combo (Banho & Tosa)</option>
                  <option value="Estética">💅 Estética (Unhas, dentes, lacinhos)</option>
                  <option value="Tratamento">💊 Tratamento (Carrapatos, hidratação medicamentosa)</option>
                  <option value="Acessório">🧸 Acessório (Coleira, brinquedos, etc)</option>
                  <option value="Produto">📦 Produto</option>
                  <option value="Outro">✨ Outro</option>
                </select>
              </div>

              {/* Preço de Venda and Custo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                    Preço Venda (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 font-mono text-xs">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={preco}
                      onChange={(e) => setPreco(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                    Preço Custo (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 font-mono text-xs">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={custo}
                      onChange={(e) => setCusto(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                    />
                  </div>
                </div>
              </div>

              {/* Estoque Inicial */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                  Quantidade Lote Inicial
                </label>
                <input
                  type="number"
                  step="1"
                  value={estoqueAtual}
                  onChange={(e) => setEstoqueAtual(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Código de Barras */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                  Código de Barras (EAN / Scan)
                </label>
                <div className="flex gap-2">
                  <input
                    ref={addBarcodeRef}
                    type="text"
                    value={codigoDeBarras}
                    onChange={(e) => setCodigoDeBarras(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                      }
                    }}
                    placeholder="Ex: 7891234567890 (Bipe ou digite)"
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => handleStartScanning((val) => setCodigoDeBarras(val))}
                    className="px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 rounded-xl flex items-center justify-center transition active:scale-95 cursor-pointer"
                    title="Escanear Código de Barras"
                  >
                    <Barcode className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Novos Campos de Gestão Comercial */}
              <div className="border-t border-slate-100 pt-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Gestão Comercial</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1 uppercase font-mono tracking-wider">
                      Unidade de Medida
                    </label>
                    <input
                      type="text"
                      value={unidadeMedida}
                      onChange={(e) => setUnidadeMedida(e.target.value)}
                      placeholder="Ex: Un, Kg, Pacote"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1 uppercase font-mono tracking-wider">
                      Fornecedor
                    </label>
                    <SupplierCombobox
                      value={fornecedor}
                      onChange={(id) => setFornecedor(id)}
                      fornecedores={fornecedores}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1 uppercase font-mono tracking-wider">
                      Data da Última Compra
                    </label>
                    <input
                      type="date"
                      value={dataUltimaCompra}
                      onChange={(e) => setDataUltimaCompra(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1 uppercase font-mono tracking-wider">
                      Data de Validade
                    </label>
                    <input
                      type="date"
                      value={validade}
                      onChange={(e) => setValidade(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Novos Campos de Preparação Fiscal */}
              <div className="border-t border-slate-100 pt-3 pb-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Preparação Fiscal</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1 uppercase font-mono tracking-wider">
                      NCM (8 dígitos)
                    </label>
                    <input
                      type="text"
                      maxLength={8}
                      value={ncm}
                      onChange={(e) => setNcm(e.target.value)}
                      placeholder="Ex: 30049099"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none font-mono focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1 uppercase font-mono tracking-wider">
                      CEST (7 dígitos)
                    </label>
                    <input
                      type="text"
                      maxLength={7}
                      value={cest}
                      onChange={(e) => setCest(e.target.value)}
                      placeholder="Ex: 1300500"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none font-mono focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1 uppercase font-mono tracking-wider">
                    Origem do Produto
                  </label>
                  <select
                    value={origemProduto}
                    onChange={(e) => setOrigemProduto(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none"
                  >
                    <option value="0">0 - Nacional</option>
                    <option value="1">1 - Estrangeira (Importação direta)</option>
                    <option value="2">2 - Estrangeira (Adquirida no mercado interno)</option>
                    <option value="3">3 - Nacional (Conteúdo de importação &gt; 40%)</option>
                    <option value="4">4 - Nacional (Produção conforme processos regulados)</option>
                    <option value="5">5 - Nacional (Conteúdo de importação &lt;= 40%)</option>
                    <option value="6">6 - Estrangeira (Importação direta, sem similar nacional)</option>
                    <option value="7">7 - Estrangeira (Adquirida internamente, sem similar nacional)</option>
                    <option value="8">8 - Nacional (Mercadoria ou bem com conteúdo de importação &gt; 70%)</option>
                  </select>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 font-sans text-xs">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-4.5 py-2 font-semibold rounded-xl text-white shadow-xs cursor-pointer ${activeTheme.primary}`}
                >
                  Confirmar Serviço
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* GERENCIAR LOTES MODAL */}
      {activeProductForLots && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 transition-all animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-zoom-in">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">
                  <Layers className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Controle de Lotes (PEPS)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Produto: <span className="text-indigo-600 font-bold font-mono">{activeProductForLots.Nome}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveProductForLots(null)}
                className="p-1.5 rounded-lg hover:bg-slate-150 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Left Side: List and active batches */}
              <div className="md:col-span-7 flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                    Lotes Cadastrados e Ativos
                  </h4>
                  <span className="text-[11px] font-semibold text-slate-400 font-mono">
                    Soma Total: <span className="font-bold text-slate-800">{activeProductLots.reduce((sum, l) => sum + l.QuantidadeLote, 0)} itens</span>
                  </span>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden flex-1 min-h-[250px] bg-slate-50/20">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase">
                        <th className="p-2.5">Nº Lote</th>
                        <th className="p-2.5 text-center">Qtde.</th>
                        <th className="p-2.5">Entrada</th>
                        <th className="p-2.5">Validade</th>
                        <th className="p-2.5 text-center">Status</th>
                        <th className="p-2.5 text-center w-16">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeProductLots.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-16 text-center text-slate-400 font-sans px-4">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Boxes className="h-8 w-8 text-slate-300" />
                              <p className="text-xs font-semibold">Nenhum lote registrado para este produto.</p>
                              <p className="text-[11px] max-w-sm text-slate-400 leading-relaxed">
                                Adicione um lote ao lado à direita para ativar a gestão de estoque e permitir baixas PEPS.
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        activeProductLots.map((lot) => {
                          const isEditing = editingLotId === lot.IdLote;
                          const isExpired = new Date(lot.ValidadeLote) < new Date();
                          const isOutOfStock = lot.QuantidadeLote <= 0;
                          const isExplicitlyInactive = lot.Ativo === false;
                          
                          let statusPill = (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-150">
                              {lot.Ativo !== false ? "Lote Ativo ⭐️" : "Ativo"}
                            </span>
                          );
                          if (isOutOfStock || isExplicitlyInactive) {
                            statusPill = (
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-150 text-slate-500 border border-slate-200">
                                Inativo/Zerado
                              </span>
                            );
                          } else if (isExpired) {
                            statusPill = (
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-150">
                                Vencido
                              </span>
                            );
                          }

                          if (isEditing) {
                            return (
                              <tr key={lot.IdLote} className="bg-amber-50/50 hover:bg-amber-50 transition-colors">
                                <td className="p-1">
                                  <input
                                    type="text"
                                    value={editLoteNumero}
                                    onChange={(e) => setEditLoteNumero(e.target.value)}
                                    className="w-full px-1.5 py-1 text-xs font-bold font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 uppercase"
                                  />
                                </td>
                                <td className="p-1 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    value={editLoteQuantidade}
                                    onChange={(e) => setEditLoteQuantidade(e.target.value)}
                                    className="w-16 px-1.5 py-1 text-xs font-bold font-mono text-center bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500"
                                  />
                                </td>
                                <td className="p-1">
                                  <input
                                    type="date"
                                    value={editLoteDataEntrada}
                                    onChange={(e) => setEditLoteDataEntrada(e.target.value)}
                                    className="w-28 px-1.5 py-1 text-[11px] font-mono bg-white border border-slate-300 rounded-xl focus:outline-none"
                                  />
                                </td>
                                <td className="p-1">
                                  <input
                                    type="date"
                                    value={editLoteValidade}
                                    onChange={(e) => setEditLoteValidade(e.target.value)}
                                    className="w-28 px-1.5 py-1 text-[11px] font-mono bg-white border border-slate-300 rounded-xl focus:outline-none"
                                  />
                                </td>
                                <td className="p-1 text-center">
                                  <select
                                    value={editLoteAtivo ? "true" : "false"}
                                    onChange={(e) => setEditLoteAtivo(e.target.value === "true")}
                                    className="px-1.5 py-1 text-[11px] font-sans font-semibold bg-white border border-slate-300 rounded-xl focus:outline-none"
                                  >
                                    <option value="true">Ativo</option>
                                    <option value="false">Inativo</option>
                                  </select>
                                </td>
                                <td className="p-1 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEditLot(lot.IdLote)}
                                      className="text-emerald-600 hover:text-emerald-700 rounded-lg p-1.5 hover:bg-emerald-50 transition cursor-pointer"
                                      title="Salvar Lote"
                                    >
                                      <Save className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingLotId(null)}
                                      className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 hover:bg-slate-100 transition cursor-pointer"
                                      title="Cancelar"
                                    >
                                      <RotateCcw className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          }

                          return (
                            <tr key={lot.IdLote} className="hover:bg-white transition-colors">
                              <td className="p-2.5 font-bold text-slate-800">{lot.NumeroLote}</td>
                              <td className="p-2.5 text-center font-bold text-indigo-700 bg-indigo-50/20">{lot.QuantidadeLote}</td>
                              <td className="p-2.5 text-slate-600 text-[11px]">{lot.DataEntrada}</td>
                              <td className={`p-2.5 text-[11px] font-semibold ${isExpired && !isOutOfStock ? "text-red-650" : "text-slate-650"}`}>{lot.ValidadeLote}</td>
                              <td className="p-2.5 text-center">{statusPill}</td>
                              <td className="p-2.5 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditLot(lot)}
                                    className="text-slate-400 hover:text-indigo-600 rounded-lg p-1 hover:bg-indigo-50 transition cursor-pointer"
                                    title="Editar Lote"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteLotInModal(lot.IdLote)}
                                    className="text-slate-400 hover:text-red-500 rounded-lg p-1 hover:bg-red-50 transition cursor-pointer"
                                    title="Remover Lote"
                                  >
                                    <Trash className="h-3.5 w-3.5" />
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

              {/* Right Side: Quick Add new batch */}
              <div className="md:col-span-5 bg-slate-50/50 p-5 rounded-2xl border border-slate-150 flex flex-col justify-between">
                <form onSubmit={handleCreateLotInModal} className="space-y-4">
                  <div className="flex items-center gap-1.5 pb-2 border-b border-slate-200/60">
                    <span className="p-1 rounded bg-indigo-50 text-indigo-600">
                      <Plus className="h-4 w-4" />
                    </span>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Registrar Novo Lote
                    </h4>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono mb-1">
                      Identificador / Nº do Lote *
                    </label>
                    <input
                      type="text"
                      required
                      value={newLoteNumero}
                      onChange={(e) => setNewLoteNumero(e.target.value)}
                      placeholder="Ex: LOT-002 ou AB-928"
                      className="w-full px-3 py-1.5 font-mono text-xs bg-white border border-slate-200 rounded-xl text-slate-850 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono mb-1">
                      Quantidade Disponível *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="1"
                      value={newLoteQuantidade}
                      onChange={(e) => setNewLoteQuantidade(e.target.value)}
                      placeholder="Ex: 50"
                      className="w-full px-3 py-1.5 font-mono text-xs bg-white border border-slate-200 rounded-xl text-slate-850 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono mb-1">
                      Data de Entrada
                    </label>
                    <input
                      type="date"
                      value={newLoteDataEntrada}
                      onChange={(e) => setNewLoteDataEntrada(e.target.value)}
                      className="w-full px-3 py-1.5 font-mono text-xs bg-white border border-slate-200 rounded-xl text-slate-850 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono mb-1">
                      Data de Validade *
                    </label>
                    <input
                      type="date"
                      required
                      value={newLoteValidade}
                      onChange={(e) => setNewLoteValidade(e.target.value)}
                      className="w-full px-3 py-1.5 font-mono text-xs bg-white border border-slate-200 rounded-xl text-slate-850 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-xs hover:shadow transition transform active:scale-95 cursor-pointer mt-2"
                  >
                    Adicionar à Grade
                  </button>
                </form>

                <div className="mt-4 p-3 rounded-xl bg-indigo-50/40 border border-indigo-100 text-[10px] text-indigo-755 leading-relaxed font-sans">
                  <p className="font-bold flex items-center gap-1 mb-0.5">
                    <History className="h-3 w-3" /> Regra PEPS (FIFO) Ativa
                  </p>
                  <p>
                    O faturamento de faturamento do banho & tosa dará baixa automaticamente nos lotes ativos com a data de validade mais próxima de expirar.
                  </p>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4.5 border-t border-slate-100 flex items-center justify-end bg-slate-50/30">
              <button
                type="button"
                onClick={() => setActiveProductForLots(null)}
                className="px-5 py-2 hover:bg-slate-150 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer bg-slate-100"
              >
                Fechar Painel
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal - Editar Serviço e Produto */}
      {showEditModal && editingProductId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 select-none">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-scale-up max-h-[90vh] flex flex-col">
            
            <div className="bg-gradient-to-r from-indigo-600 to-emerald-600 px-6 py-4.5 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold font-display tracking-tight text-base">
                  Editar Cadastro de Serviço / Produto
                </h3>
                <p className="text-[10px] text-emerald-100 uppercase tracking-wider font-mono">
                  Identificador: {editingProductId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingProductId(null);
                }}
                className="text-white hover:text-slate-150 text-sm font-semibold p-1 hover:bg-white/10 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditProduct} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              
              {/* Product Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                  Nome do Serviço / Produto
                </label>
                <input
                  type="text"
                  required
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  placeholder="Ex: Tosa Tesoura - Porte Médio"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              {/* Tipo Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                  Categoria de Serviço
                </label>
                <select
                  value={editTipo}
                  onChange={(e) => setEditTipo(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none"
                >
                  <option value="Banho">🛁 Banho</option>
                  <option value="Tosa">✂️ Tosa</option>
                  <option value="Combo">📦 Combo (Banho & Tosa)</option>
                  <option value="Estética">💅 Estética (Unhas, dentes, lacinhos)</option>
                  <option value="Tratamento">💊 Tratamento (Carrapatos, hidratação medicamentosa)</option>
                  <option value="Acessório">🧸 Acessório (Coleira, brinquedos, etc)</option>
                  <option value="Produto">📦 Produto</option>
                  <option value="Outro">✨ Outro</option>
                </select>
              </div>

              {/* Preço de Venda and Custo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                    Preço Venda (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 font-mono text-xs">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editPreco}
                      onChange={(e) => setEditPreco(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                    Preço Custo (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 font-mono text-xs">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={editCusto}
                      onChange={(e) => setEditCusto(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                    />
                  </div>
                </div>
              </div>

              {/* Código de Barras */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                  Código de Barras (EAN / Scan)
                </label>
                <div className="flex gap-2">
                  <input
                    ref={editBarcodeRef}
                    type="text"
                    value={editCodigoDeBarras}
                    onChange={(e) => setEditCodigoDeBarras(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                      }
                    }}
                    placeholder="Ex: 7891234567890 (Bipe ou digite)"
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => handleStartScanning((val) => setEditCodigoDeBarras(val))}
                    className="px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 rounded-xl flex items-center justify-center transition active:scale-95 cursor-pointer"
                    title="Escanear Código de Barras"
                  >
                    <Barcode className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Novos Campos de Gestão Comercial */}
              <div className="border-t border-slate-100 pt-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Gestão Comercial</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1 uppercase font-mono tracking-wider">
                      Unidade de Medida
                    </label>
                    <input
                      type="text"
                      value={editUnidadeMedida}
                      onChange={(e) => setEditUnidadeMedida(e.target.value)}
                      placeholder="Ex: Un, Kg, Pacote"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1 uppercase font-mono tracking-wider">
                      Fornecedor
                    </label>
                    <SupplierCombobox
                      value={editFornecedor}
                      onChange={(id) => setEditFornecedor(id)}
                      fornecedores={fornecedores}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1 uppercase font-mono tracking-wider">
                      Data da Última Compra
                    </label>
                    <input
                      type="date"
                      value={editDataUltimaCompra}
                      onChange={(e) => setEditDataUltimaCompra(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Novos Campos de Preparação Fiscal */}
              <div className="border-t border-slate-100 pt-3 pb-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Preparação Fiscal</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1 uppercase font-mono tracking-wider">
                      NCM (8 dígitos)
                    </label>
                    <input
                      type="text"
                      maxLength={8}
                      value={editNcm}
                      onChange={(e) => setEditNcm(e.target.value)}
                      placeholder="Ex: 30049099"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-850 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1 uppercase font-mono tracking-wider">
                      CEST (7 dígitos)
                    </label>
                    <input
                      type="text"
                      maxLength={7}
                      value={editCest}
                      onChange={(e) => setEditCest(e.target.value)}
                      placeholder="Ex: 1300900"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-855 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1 uppercase font-mono tracking-wider">
                    Origem do Produto (ICMS)
                  </label>
                  <select
                    value={editOrigemProduto}
                    onChange={(e) => setEditOrigemProduto(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">Selecione...</option>
                    <option value="0">0 - Nacional (exceto as indicadas nos códigos 3 a 5 e 8)</option>
                    <option value="1">1 - Estrangeira - Importação direta, com similar nacional</option>
                    <option value="2">2 - Estrangeira - Adquirida no mercado interno, com similar nacional</option>
                    <option value="3">3 - Nacional - Conteúdo de importação maior que 40%</option>
                    <option value="4">4 - Nacional - Produção em conformidade com o PPB</option>
                    <option value="5">5 - Nacional - Conteúdo de importação igual ou menor que 40%</option>
                    <option value="6">6 - Estrangeira - Importação direta, sem similar nacional</option>
                    <option value="7">7 - Estrangeira - Adquirida no mercado interno, sem similar nacional</option>
                    <option value="8">8 - Nacional - Conteúdo de importação superior a 70%</option>
                  </select>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 shrink-0 font-sans text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingProductId(null);
                  }}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2.5 font-bold rounded-xl text-white shadow-sm transition transform active:scale-95 cursor-pointer ${activeTheme.primary}`}
                >
                  Salvar Alterações
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* CAMERA SCANNING OVERLAY MODAL */}
      {isScanning && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center z-[9999] p-4 select-none animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-scale-up flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-emerald-600 px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Barcode className="h-5 w-5 animate-pulse" />
                <div>
                  <h3 className="font-bold text-sm">Leitor de Código de Barras</h3>
                  <p className="text-[10px] text-emerald-150 font-mono font-medium uppercase tracking-wider">Câmera Nativa / Arquivo</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleStopScanning}
                className="text-white hover:text-slate-200 text-xs font-bold p-1 bg-white/10 hover:bg-white/20 rounded-lg cursor-pointer"
              >
                ✕ Fechar
              </button>
            </div>

            {/* Body */}
            <div className="p-6 flex-1 flex flex-col space-y-4 items-center justify-center overflow-y-auto">
              
              {isProcessing ? (
                <div className="w-full flex flex-col items-center justify-center py-8 space-y-4">
                  {/* Pulsing loading effect */}
                  <div className="relative flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-indigo-100 animate-ping opacity-75 h-16 w-16"></div>
                    <div className="relative rounded-full bg-indigo-50 border border-indigo-100 p-4">
                      <Barcode className="h-8 w-8 text-indigo-600 animate-pulse" />
                    </div>
                  </div>
                  <div className="text-center">
                    <h4 className="text-sm font-bold text-slate-800">Processando Imagem...</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs">
                      Analisando a foto tirada em busca de códigos de barras. Por favor, aguarde alguns instantes.
                    </p>
                  </div>
                </div>
              ) : scannerError ? (
                <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold text-center w-full">
                  <p className="font-bold mb-1">Não foi possível ler o código</p>
                  <p className="mb-4 font-normal text-slate-600 text-xs">{scannerError}</p>
                  <div className="flex gap-2 justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        setScannerError(null);
                        fileInputRef.current?.click();
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition active:scale-95 cursor-pointer text-[11px]"
                    >
                      Tirar Outra Foto
                    </button>
                    <button
                      type="button"
                      onClick={handleStopScanning}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition active:scale-95 cursor-pointer text-[11px]"
                    >
                      Digitar Manualmente
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center text-center space-y-4 py-4">
                  <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-6 flex items-center justify-center max-w-xs mx-auto">
                    <Barcode className="h-16 w-16 text-indigo-600" />
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Capturar Código de Barras</h4>
                    <p className="text-xs text-slate-500 mt-2 max-w-xs mx-auto leading-relaxed">
                      Toque no botão abaixo para ativar a câmera nativa do seu celular. Tire uma foto nítida e bem focada do código de barras do produto.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setScannerError(null);
                      fileInputRef.current?.click();
                    }}
                    className="w-full max-w-xs px-5 py-3 bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-700 hover:to-emerald-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    <Barcode className="h-5 w-5" />
                    Abrir Câmera do Celular
                  </button>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50 shrink-0">
              <button
                type="button"
                onClick={handleStopScanning}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Hidden native input and background scanner element */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        style={{ display: "none" }}
      />
      <div id="barcode-reader-hidden" className="hidden" style={{ display: "none" }}></div>

      {/* GESTÃO DE FORNECEDORES MODAL */}
      {showFornecedoresModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center z-[9999] p-4 select-none animate-fade-in">
          <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-scale-up flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="bg-slate-900 px-6 py-4.5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                  <Users className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-bold text-sm">Gestão de Fornecedores</h3>
                  <p className="text-[10px] text-indigo-300 font-mono font-medium uppercase tracking-wider font-sans">
                    Coleção CadFornecedores
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFornecedoresModal(false)}
                className="text-slate-400 hover:text-white transition-colors p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer text-xs"
              >
                ✕ Fechar
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-5 gap-6">
              
              {/* Form - Left Column */}
              <div className="md:col-span-2 space-y-4 border-r border-slate-100 pr-0 md:pr-6">
                <div className="border-b border-slate-100 pb-2">
                  <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                    Novo Fornecedor
                  </h4>
                  <p className="text-[10px] text-slate-400">Cadastre um fornecedor parceiro no banco de dados</p>
                </div>

                <form onSubmit={handleAddSupplier} className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                      Nome do Fornecedor <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Distribuidora Pet Norte"
                      value={fornecedorNome}
                      onChange={(e) => setFornecedorNome(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                      Categoria do Fornecedor
                    </label>
                    <select
                      value={fornecedorCategoria}
                      onChange={(e) => setFornecedorCategoria(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-400"
                    >
                      <option value="Acessórios">Acessórios</option>
                      <option value="Limpeza">Limpeza</option>
                      <option value="Administrativo">Administrativo</option>
                      <option value="Alimentação">Alimentação</option>
                      <option value="Medicamentos">Medicamentos</option>
                      <option value="Estética / Higiene">Estética / Higiene</option>
                      <option value="Serviços Terceirizados">Serviços Terceirizados</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                      Telefone de Contato
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: (11) 99999-9999"
                      value={fornecedorTelefone}
                      onChange={(e) => setFornecedorTelefone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                      CNPJ / CPF
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 00.000.000/0001-00"
                      value={fornecedorCnpjCpf}
                      onChange={(e) => setFornecedorCnpjCpf(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                      Chave Pix
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: cnpj ou email ou celular"
                      value={fornecedorChavePix}
                      onChange={(e) => setFornecedorChavePix(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-400"
                    />
                  </div>

                  <button
                    type="submit"
                    className={`w-full py-2.5 rounded-xl font-bold text-white text-xs shadow-sm transition transform active:scale-95 cursor-pointer ${activeTheme.primary}`}
                  >
                    Cadastrar Fornecedor
                  </button>
                </form>
              </div>

              {/* List - Right Column */}
              <div className="md:col-span-3 flex flex-col h-full space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                      Fornecedores Cadastrados
                    </h4>
                    <p className="text-[10px] text-slate-400">Consulte e filtre seus fornecedores de insumos</p>
                  </div>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold font-mono">
                    Total: {fornecedores.length}
                  </span>
                </div>

                {/* Filter Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Pesquisar por nome ou categoria..."
                    value={fornecedorSearch}
                    onChange={(e) => setFornecedorSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {/* Suppliers Scroller list */}
                <div className="flex-1 overflow-y-auto max-h-[360px] pr-1 space-y-3 custom-scrollbar">
                  {fornecedores.filter(f => {
                    const s = fornecedorSearch.toLowerCase();
                    return f.Nome_Fornecedor.toLowerCase().includes(s) || (f.Categoria && f.Categoria.toLowerCase().includes(s));
                  }).length === 0 ? (
                    <div className="py-12 text-center text-slate-400 italic text-xs">
                      Nenhum fornecedor encontrado para esta pesquisa.
                    </div>
                  ) : (
                    fornecedores.filter(f => {
                      const s = fornecedorSearch.toLowerCase();
                      return f.Nome_Fornecedor.toLowerCase().includes(s) || (f.Categoria && f.Categoria.toLowerCase().includes(s));
                    }).map((f) => (
                      <div
                        key={f.ID_Fornecedor}
                        className="p-4 bg-slate-50 hover:bg-slate-100/75 border border-slate-150 rounded-2xl flex items-start justify-between gap-3 transition"
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-800 text-xs truncate">
                              {f.Nome_Fornecedor}
                            </span>
                            <span className="text-[9px] bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded-full font-medium uppercase font-mono tracking-wider">
                              {f.Categoria || "Outros"}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-mono">
                            {f.Telefone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3.5 w-3.5 text-slate-400" />
                                <span className="truncate">{f.Telefone}</span>
                              </div>
                            )}
                            {f.CNPJ_CPF && (
                              <div className="flex items-center gap-1">
                                <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                                <span className="truncate">{f.CNPJ_CPF}</span>
                              </div>
                            )}
                            {f.Chave_Pix && (
                              <div className="flex items-center gap-1 col-span-2">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-1 rounded">Pix:</span>
                                <span className="truncate text-slate-600">{f.Chave_Pix}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteSupplier(f.ID_Fornecedor)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors shrink-0 cursor-pointer self-center"
                          title="Excluir Fornecedor"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4.5 border-t border-slate-100 flex items-center justify-end bg-slate-50 shrink-0">
              <button
                type="button"
                onClick={() => setShowFornecedoresModal(false)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                Fechar Painel
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
