/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { CadFornecedores, ThemeColor } from "../types";
import { Search, Sparkles, Plus, Trash2, Pencil, Users, Phone, ShieldCheck, Mail, CreditCard } from "lucide-react";

interface SuppliersProps {
  fornecedores: CadFornecedores[];
  activeTheme: ThemeColor;
  onUpdateFornecedores: (updated: CadFornecedores[]) => void;
  showConfirm: (title: string, msg: string, onConfirm: () => void) => void;
  showAlert: (title: string, msg: string) => void;
  isRestricted?: boolean;
  userPermissionLevel?: number;
}

export default function SuppliersSheet({
  fornecedores,
  activeTheme,
  onUpdateFornecedores,
  showConfirm,
  showAlert,
  isRestricted = false,
  userPermissionLevel = 1,
}: SuppliersProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("TODOS");

  // Custom Supplier Addition Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("Acessórios");
  const [telefone, setTelefone] = useState("");
  const [cnpjCpf, setCnpjCpf] = useState("");
  const [chavePix, setChavePix] = useState("");

  // Custom Supplier Edit Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editCategoria, setEditCategoria] = useState("Acessórios");
  const [editTelefone, setEditTelefone] = useState("");
  const [editCnpjCpf, setEditCnpjCpf] = useState("");
  const [editChavePix, setEditChavePix] = useState("");

  const handleStartEdit = (supplier: CadFornecedores) => {
    setEditingSupplierId(supplier.ID_Fornecedor);
    setEditNome(supplier.Nome_Fornecedor);
    setEditCategoria(supplier.Categoria || "Acessórios");
    setEditTelefone(supplier.Telefone || "");
    setEditCnpjCpf(supplier.CNPJ_CPF || "");
    setEditChavePix(supplier.Chave_Pix || "");
    setShowEditModal(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userPermissionLevel === 3) {
      showAlert("Acesso Restrito 🔒", "Nível de permissão 3 (Consulta e Pré-Venda) não autoriza edições ou alterações.");
      return;
    }
    if (!editingSupplierId || !editNome.trim()) {
      showAlert("Atenção ⚠️", "Por favor, preencha o Nome do Fornecedor.");
      return;
    }

    const updated = fornecedores.map((f) => {
      if (f.ID_Fornecedor === editingSupplierId) {
        return {
          ...f,
          Nome_Fornecedor: editNome.trim(),
          Categoria: editCategoria,
          Telefone: editTelefone.trim(),
          CNPJ_CPF: editCnpjCpf.trim(),
          Chave_Pix: editChavePix.trim(),
        };
      }
      return f;
    });

    onUpdateFornecedores(updated);
    setShowEditModal(false);
    setEditingSupplierId(null);
    showAlert("Sucesso ✓", "Fornecedor atualizado com sucesso!");
  };

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (userPermissionLevel === 3) {
      showAlert("Acesso Restrito 🔒", "Nível de permissão 3 (Consulta e Pré-Venda) não autoriza edições ou alterações.");
      return;
    }
    if (!nome.trim()) {
      showAlert("Atenção ⚠️", "Por favor, preencha o Nome do Fornecedor.");
      return;
    }

    const newSupplier: CadFornecedores = {
      ID_Fornecedor: `forn-${Math.random().toString(36).substr(2, 9)}`,
      Nome_Fornecedor: nome.trim(),
      Categoria: categoria,
      Telefone: telefone.trim(),
      CNPJ_CPF: cnpjCpf.trim(),
      Chave_Pix: chavePix.trim(),
    };

    onUpdateFornecedores([newSupplier, ...fornecedores]);
    
    // Reset Form
    setNome("");
    setTelefone("");
    setCnpjCpf("");
    setChavePix("");
    setShowAddModal(false);
    showAlert("Sucesso ✓", `Fornecedor "${newSupplier.Nome_Fornecedor}" cadastrado com sucesso!`);
  };

  const handleDeleteSupplier = (id: string) => {
    if (userPermissionLevel === 3) {
      showAlert("Acesso Restrito 🔒", "Nível de permissão 3 (Consulta e Pré-Venda) não autoriza edições ou alterações.");
      return;
    }
    const supplier = fornecedores.find((f) => f.ID_Fornecedor === id);
    if (!supplier) return;

    showConfirm(
      "Excluir Fornecedor ⚠️",
      `Deseja mesmo remover o fornecedor "${supplier.Nome_Fornecedor}"?`,
      () => {
        onUpdateFornecedores(fornecedores.filter((f) => f.ID_Fornecedor !== id));
        showAlert("Removido", "Fornecedor removido com sucesso.");
      }
    );
  };

  const filteredFornecedores = useMemo(() => {
    return fornecedores.filter((f) => {
      const categoryMatch =
        selectedCategory === "TODOS" || f.Categoria === selectedCategory;

      const query = searchTerm.toLowerCase();
      const searchMatch =
        !searchTerm.trim() ||
        f.Nome_Fornecedor.toLowerCase().includes(query) ||
        (f.Categoria && f.Categoria.toLowerCase().includes(query)) ||
        (f.CNPJ_CPF && f.CNPJ_CPF.toLowerCase().includes(query)) ||
        (f.Chave_Pix && f.Chave_Pix.toLowerCase().includes(query));

      return categoryMatch && searchMatch;
    });
  }, [fornecedores, selectedCategory, searchTerm]);

  // Aggregate categories
  const categoriesList = useMemo(() => {
    const list = new Set<string>();
    fornecedores.forEach((f) => {
      if (f.Categoria) list.add(f.Categoria);
    });
    return ["TODOS", ...Array.from(list)];
  }, [fornecedores]);

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Fornecedores (CadFronecedores)</h2>
            <p className="text-xs text-slate-500">
              Gerencie fornecedores de insumos, acessórios, limpeza, estética e soluções comerciais.
            </p>
          </div>
        </div>

        {!isRestricted && (
          <button
            disabled={userPermissionLevel === 3}
            onClick={() => {
              if (userPermissionLevel === 3) return;
              setShowAddModal(true);
            }}
            className={`inline-flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all transform active:scale-95 cursor-pointer ${
              userPermissionLevel === 3
                ? "bg-slate-300 text-slate-500 opacity-60 cursor-not-allowed border border-slate-400"
                : `shadow-xs hover:shadow ${activeTheme.primary}`
            }`}
          >
            <Plus className="h-4 w-4" />
            Novo Fornecedor
          </button>
        )}
      </div>

      {/* Stats Counter Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total de Fornecedores</span>
          <span className="text-2xl font-black text-slate-800 mt-1">{fornecedores.length}</span>
        </div>
        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Filtro Ativo</span>
          <span className="text-xs font-bold text-indigo-600 truncate mt-1">
            {selectedCategory === "TODOS" ? "Todas as Categorias" : selectedCategory}
          </span>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar fornecedores por nome, CPF/CNPJ, chave Pix ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-400 transition"
            />
          </div>

          {/* Category Filter Select */}
          <div className="w-full md:w-64">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-400 cursor-pointer"
            >
              <option value="TODOS">Todas Categorias ({fornecedores.length})</option>
              {categoriesList.filter(c => c !== "TODOS").map((c) => (
                <option key={c} value={c}>
                  {c} ({fornecedores.filter(f => f.Categoria === c).length})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto border border-slate-100 rounded-2xl">
          <table className="w-full border-collapse text-left text-xs text-slate-700">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-600 uppercase font-mono tracking-wider">
                <th className="p-3.5 text-center w-12">Nº</th>
                <th className="p-3.5 w-64">Nome do Fornecedor</th>
                <th className="p-3.5 w-44">Categoria</th>
                <th className="p-3.5 w-44">Telefone</th>
                <th className="p-3.5 w-48">CNPJ / CPF</th>
                <th className="p-3.5 w-52">Chave Pix</th>
                <th className="p-3.5 text-center w-28">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFornecedores.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400 italic">
                    Nenhum fornecedor cadastrado correspondente aos filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredFornecedores.map((f, idx) => (
                  <tr key={f.ID_Fornecedor} className="hover:bg-slate-50/50 transition">
                    <td className="p-3.5 text-center font-mono font-medium text-slate-400">{idx + 1}</td>
                    <td className="p-3.5 font-bold text-slate-800">{f.Nome_Fornecedor}</td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold font-mono uppercase bg-indigo-50 text-indigo-700">
                        {f.Categoria || "Outros"}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-600">{f.Telefone || "—"}</td>
                    <td className="p-3.5 font-mono text-slate-600">{f.CNPJ_CPF || "—"}</td>
                    <td className="p-3.5 font-mono text-slate-600">
                      {f.Chave_Pix ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                          {f.Chave_Pix}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(f)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Editar Fornecedor"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSupplier(f.ID_Fornecedor)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Excluir Fornecedor"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Grid Card View */}
        <div className="lg:hidden space-y-3">
          {filteredFornecedores.length === 0 ? (
            <div className="py-12 text-center text-slate-400 italic">
              Nenhum fornecedor cadastrado correspondente aos filtros aplicados.
            </div>
          ) : (
            filteredFornecedores.map((f) => (
              <div
                key={f.ID_Fornecedor}
                className="p-4 bg-slate-50 hover:bg-slate-100/50 border border-slate-100 rounded-2xl space-y-3.5 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-800 text-xs">{f.Nome_Fornecedor}</h4>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold font-mono bg-indigo-50 text-indigo-700 uppercase">
                      {f.Categoria || "Outros"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(f)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSupplier(f.ID_Fornecedor)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] text-slate-600 font-mono">
                  {f.Telefone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span>{f.Telefone}</span>
                    </div>
                  )}
                  {f.CNPJ_CPF && (
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                      <span>{f.CNPJ_CPF}</span>
                    </div>
                  )}
                  {f.Chave_Pix && (
                    <div className="flex items-center gap-1.5 col-span-full">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-1 rounded">Pix:</span>
                      <span className="truncate text-slate-700">{f.Chave_Pix}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ADD SUPPLIER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-scale-up">
            <div className="bg-gradient-to-r from-emerald-600 to-indigo-600 px-6 py-4.5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-white" />
                <h3 className="font-bold text-sm">Cadastrar Novo Fornecedor</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-white hover:text-slate-150 text-sm font-semibold p-1 hover:bg-white/10 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSupplier} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  Nome do Fornecedor <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Distribuidora Pet Norte"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  Categoria
                </label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-400"
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
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  CNPJ / CPF
                </label>
                <input
                  type="text"
                  placeholder="Ex: 00.000.000/0001-00"
                  value={cnpjCpf}
                  onChange={(e) => setCnpjCpf(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  Chave Pix
                </label>
                <input
                  type="text"
                  placeholder="Ex: cnpj ou email ou celular"
                  value={chavePix}
                  onChange={(e) => setChavePix(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-400"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2.5 rounded-xl font-bold text-white text-xs shadow-xs transition transform active:scale-95 cursor-pointer ${activeTheme.primary}`}
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SUPPLIER MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-scale-up">
            <div className="bg-gradient-to-r from-emerald-600 to-indigo-600 px-6 py-4.5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-white" />
                <h3 className="font-bold text-sm">Editar Fornecedor</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-white hover:text-slate-150 text-sm font-semibold p-1 hover:bg-white/10 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  Nome do Fornecedor <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Distribuidora Pet Norte"
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  Categoria
                </label>
                <select
                  value={editCategoria}
                  onChange={(e) => setEditCategoria(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-400"
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
                  value={editTelefone}
                  onChange={(e) => setEditTelefone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  CNPJ / CPF
                </label>
                <input
                  type="text"
                  placeholder="Ex: 00.000.000/0001-00"
                  value={editCnpjCpf}
                  onChange={(e) => setEditCnpjCpf(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  Chave Pix
                </label>
                <input
                  type="text"
                  placeholder="Ex: cnpj ou email ou celular"
                  value={editChavePix}
                  onChange={(e) => setEditChavePix(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-400"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2.5 rounded-xl font-bold text-white text-xs shadow-xs transition transform active:scale-95 cursor-pointer ${activeTheme.primary}`}
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
