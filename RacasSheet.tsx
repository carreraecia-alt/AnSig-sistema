/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { CadRaca, ThemeColor, CadUsuario } from "../types";
import { Search, Sparkles, Award, Plus, Trash2, Pencil, Lock, Car } from "lucide-react";
import { getTermos, MARCAS_AUTOMOTIVAS_PADRAO } from "../data/dicionarioTermos";

interface RacasProps {
  racas: CadRaca[];
  activeTheme: ThemeColor;
  onUpdateRacas: (updated: CadRaca[]) => void;
  showConfirm: (title: string, msg: string, onConfirm: () => void) => void;
  showAlert: (title: string, msg: string) => void;
  isRestricted?: boolean;
  userPermissionLevel?: number;
  currentUserOwnerId?: string;
  currentUser?: CadUsuario;
  godModeActive?: boolean;
  segmento?: string;
}

export default function RacasSheet({
  racas,
  activeTheme,
  onUpdateRacas,
  showConfirm,
  showAlert,
  isRestricted = false,
  userPermissionLevel = 1,
  currentUserOwnerId,
  currentUser,
  godModeActive = false,
  segmento,
}: RacasProps) {
  const rawSegmento = (segmento || currentUser?.Segmento || "petshop").toString().toLowerCase().trim();
  const termos = useMemo(() => getTermos(rawSegmento), [rawSegmento]);
  const isAutomotivo = termos.usaMontadorasAutomotivas;

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpecies, setSelectedSpecies] = useState("TODOS");

  // Layout configuration: allows switching between 'List' (standard text list with modal editing) and 'Inline List' (spreadsheet-style direct inline editing)
  const [layoutStyle, setLayoutStyle] = useState<"list" | "inline-list">("list");

  // Custom Breed Addition Form
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRaca, setNewRaca] = useState("");
  const [newEspecie, setNewEspecie] = useState(isAutomotivo ? "Carro" : "Cão");

  // Custom Breed Edit Form
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBreedId, setEditingBreedId] = useState<string | null>(null);
  const [editRaca, setEditRaca] = useState("");
  const [editEspecie, setEditEspecie] = useState(isAutomotivo ? "Carro" : "Cão");

  // Effective list of items (breeds or brands)
  const effectiveRacas = useMemo<CadRaca[]>(() => {
    if (!isAutomotivo) {
      return racas;
    }
    const automotiveInRacas = racas.filter(
      (r) => r.Especie === "Carro" || r.Especie === "Moto" || r.Especie === "Veículo" || r.Especie === "Montadora"
    );
    if (automotiveInRacas.length > 0) {
      // Ensure all standard brands exist
      const merged = [...automotiveInRacas];
      MARCAS_AUTOMOTIVAS_PADRAO.forEach((marca, idx) => {
        if (!merged.some(m => m.Raca.toLowerCase() === marca.toLowerCase())) {
          merged.push({
            Id: `marca-padrao-${idx + 1}`,
            Raca: marca,
            Especie: marca.toLowerCase().includes("moto") || marca === "Yamaha" || marca === "BMW Motorrad" ? "Moto" : "Carro",
            status_registro: "padrão",
          });
        }
      });
      return merged;
    }
    // Provide base default brands
    return MARCAS_AUTOMOTIVAS_PADRAO.map((marca, idx) => ({
      Id: `marca-padrao-${idx + 1}`,
      Raca: marca,
      Especie: marca.toLowerCase().includes("moto") || marca === "Yamaha" || marca === "BMW Motorrad" ? "Moto" : "Carro",
      status_registro: "padrão",
    }));
  }, [racas, isAutomotivo]);

  const handleStartEditBreed = (breed: CadRaca) => {
    const isBase = !breed.Id.startsWith("raca-custom-") || breed.status_registro === "padrão";
    const isOwnCustomBreed = breed.Id.startsWith("raca-custom-") && breed.IdUsuarioDono === currentUserOwnerId && breed.status_registro !== "padrão";
    const canModify = isBase ? godModeActive : (isOwnCustomBreed || godModeActive);

    if (!canModify) {
      showAlert(
        "ERRO: Operação Negada",
        isAutomotivo
          ? "Ação restrita ao Administrador God Mode. Marcas da lista padrão não podem ser alteradas."
          : "Ação restrita ao Administrador God Mode. Registros de raças da base padrão ou de outros usuários não podem ser alterados."
      );
      return;
    }
    setEditingBreedId(breed.Id);
    setEditRaca(breed.Raca);
    setEditEspecie(breed.Especie);
    setShowEditModal(true);
  };

  const handleSaveEditBreed = (e: React.FormEvent) => {
    e.preventDefault();
    if (userPermissionLevel === 3) {
      showAlert("Acesso Restrito 🔒", "Nível de permissão 3 (Consulta e Pré-Venda) não autoriza edições ou alterações.");
      return;
    }
    if (!editingBreedId || !editRaca.trim()) return;

    const breedObj = effectiveRacas.find((r) => r.Id === editingBreedId);
    if (!breedObj) return;

    const isBase = !editingBreedId.startsWith("raca-custom-") || breedObj.status_registro === "padrão";
    const isOwnCustomBreed = editingBreedId.startsWith("raca-custom-") && breedObj.IdUsuarioDono === currentUserOwnerId && breedObj.status_registro !== "padrão";
    const canModify = isBase ? godModeActive : (isOwnCustomBreed || godModeActive);

    if (!canModify) {
      showAlert(
        "ERRO: Operação Negada",
        isAutomotivo
          ? "Ação restrita ao Administrador God Mode. Marcas da lista padrão não podem ser alteradas."
          : "Ação restrita ao Administrador God Mode. Registros de raças da base padrão ou de outros usuários não podem ser alterados."
      );
      return;
    }

    const exists = effectiveRacas.some(
      (r) => r.Id !== editingBreedId && r.Raca.toLowerCase() === editRaca.toLowerCase().trim()
    );
    if (exists) {
      showAlert(isAutomotivo ? "Marca Duplicada" : "Raça Duplicada", isAutomotivo ? "Esta marca já consta no cadastro." : "Esta raça já consta no sistema de cadastro.");
      return;
    }

    const updated = racas.map((r) => {
      if (r.Id === editingBreedId) {
        return {
          ...r,
          Raca: editRaca.trim(),
          Especie: editEspecie,
        };
      }
      return r;
    });

    onUpdateRacas(updated);
    setShowEditModal(false);
    setEditingBreedId(null);
  };

  // Filter list
  const filteredRacas = useMemo(() => {
    return effectiveRacas.filter((r) => {
      // Species match
      const speciesMatch =
        selectedSpecies === "TODOS" ||
        r.Especie.toUpperCase() === selectedSpecies.toUpperCase() ||
        (selectedSpecies === "CARRO" && (r.Especie === "Carro" || r.Especie === "Veículo" || r.Especie === "Montadora"));

      // Search match
      const query = searchTerm.toLowerCase();
      const searchMatch =
        !searchTerm.trim() ||
        r.Raca.toLowerCase().includes(query) ||
        r.Id.toLowerCase().includes(query);

      return speciesMatch && searchMatch;
    });
  }, [effectiveRacas, selectedSpecies, searchTerm]);

  // Aggregate stats
  const stats = useMemo(() => {
    if (isAutomotivo) {
      const cars = effectiveRacas.filter((r) => r.Especie === "Carro" || r.Especie === "Veículo" || r.Especie === "Montadora").length;
      const motos = effectiveRacas.filter((r) => r.Especie === "Moto").length;
      return { total: effectiveRacas.length, item1: cars, item2: motos };
    }
    const dogs = effectiveRacas.filter((r) => r.Especie === "Cão").length;
    const cats = effectiveRacas.filter((r) => r.Especie === "Gato").length;
    return { total: effectiveRacas.length, item1: dogs, item2: cats };
  }, [effectiveRacas, isAutomotivo]);

  // Add custom breed
  const handleAddBreed = (e: React.FormEvent) => {
    e.preventDefault();
    if (userPermissionLevel === 3) {
      showAlert("Acesso Restrito 🔒", "Nível de permissão 3 (Consulta e Pré-Venda) não autoriza edições ou alterações.");
      return;
    }
    if (!newRaca.trim()) return;

    const exists = effectiveRacas.some((r) => r.Raca.toLowerCase() === newRaca.toLowerCase().trim());
    if (exists) {
      showAlert(isAutomotivo ? "Marca Duplicada" : "Raça Duplicada", isAutomotivo ? "Esta marca já consta no cadastro de montadoras." : "Esta raça já consta no sistema de cadastro.");
      return;
    }

    const newItem: CadRaca = {
      Id: `raca-custom-${Date.now()}`,
      Raca: newRaca.trim(),
      Especie: newEspecie,
      IdUsuarioDono: currentUserOwnerId,
    };

    onUpdateRacas([newItem, ...racas]);
    setNewRaca("");
    setShowAddModal(false);
  };

  const handleDeleteBreed = (id: string) => {
    if (userPermissionLevel === 3) {
      showAlert("Acesso Restrito 🔒", "Nível de permissão 3 (Consulta e Pré-Venda) não autoriza edições ou alterações.");
      return;
    }
    const breedObj = effectiveRacas.find((r) => r.Id === id);
    if (!breedObj) return;

    const isBase = !id.startsWith("raca-custom-") || breedObj.status_registro === "padrão";
    const isOwnCustomBreed = id.startsWith("raca-custom-") && breedObj.IdUsuarioDono === currentUserOwnerId && breedObj.status_registro !== "padrão";
    const canModify = isBase ? godModeActive : (isOwnCustomBreed || godModeActive);

    if (!canModify) {
      showAlert(
        "ERRO: Operação Negada",
        isAutomotivo
          ? "Ação restrita ao Administrador God Mode. Marcas da lista padrão não podem ser removidas."
          : "Ação restrita ao Administrador God Mode. Registros de raças da base padrão ou de outros usuários não podem ser removidos."
      );
      return;
    }

    showConfirm(
      isAutomotivo ? "Remover Marca" : "Remover Raça",
      isAutomotivo ? `Deseja realmente remover a marca "${breedObj.Raca}" do cadastro?` : "Deseja realmente remover esta raça do banco?",
      () => {
        onUpdateRacas(racas.filter((r) => r.Id !== id));
      }
    );
  };

  const handleCellChange = (id: string, field: keyof CadRaca, value: any) => {
    if (userPermissionLevel === 3) {
      showAlert("Acesso Restrito 🔒", "Nível de permissão 3 (Consulta e Pré-Venda) não autoriza edições ou alterações.");
      return;
    }

    const breedObj = effectiveRacas.find((r) => r.Id === id);
    if (!breedObj) return;

    const isBase = !id.startsWith("raca-custom-") || breedObj.status_registro === "padrão";
    const isOwnCustomBreed = id.startsWith("raca-custom-") && breedObj.IdUsuarioDono === currentUserOwnerId && breedObj.status_registro !== "padrão";
    const canModify = isBase ? godModeActive : (isOwnCustomBreed || godModeActive);

    if (!canModify) {
      showAlert(
        "ERRO: Operação Negada",
        isAutomotivo
          ? "Ação restrita ao Administrador God Mode. Marcas da lista padrão não podem ser alteradas."
          : "Ação restrita ao Administrador God Mode. Registros de raças da base padrão ou de outros usuários não podem ser alterados."
      );
      return;
    }

    if (field === "Raca") {
      const exists = effectiveRacas.some(
        (r) => r.Id !== id && r.Raca.toLowerCase() === value.toLowerCase().trim()
      );
      if (exists) {
        showAlert(isAutomotivo ? "Marca Duplicada" : "Raça Duplicada", isAutomotivo ? "Esta marca já consta no cadastro." : "Esta raça já consta no sistema de cadastro.");
        return;
      }
    }

    const updated = racas.map((r) => {
      if (r.Id === id) {
        const val = field === "Raca" ? value.trim() : value;
        return {
          ...r,
          [field]: val,
        };
      }
      return r;
    });

    onUpdateRacas(updated);
  };

  return (
    <div className="space-y-6">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white p-5 rounded-2xl border border-slate-200 gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-md bg-emerald-50 text-emerald-700">
              {isAutomotivo ? <Car className="h-4 w-4" /> : <Award className="h-4 w-4" />}
            </span>
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 font-mono">
              {termos.subtituloMarcasRacas}
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-800 animate-slide-in">
            {termos.tituloModuloMarcasRacas}
          </h2>
        </div>

        {(!isRestricted || godModeActive) && (
          <button
            disabled={userPermissionLevel === 3}
            onClick={() => {
              if (userPermissionLevel === 3) return;
              setNewRaca("");
              setNewEspecie(isAutomotivo ? "Carro" : "Cão");
              setShowAddModal(true);
            }}
            className={`inline-flex items-center gap-1.5 px-4.5 py-2 rounded-xl text-xs font-semibold transition-all transform ${
              userPermissionLevel === 3
                ? "bg-slate-300 text-slate-500 opacity-60 cursor-not-allowed border border-slate-400"
                : `shadow-xs hover:shadow active:scale-95 cursor-pointer ${activeTheme.primary}`
            }`}
            title={userPermissionLevel === 3 ? "Acesso Restrito: Nível 3 não pode adicionar registros." : termos.botaoNovaMarcaRaca}
          >
            <Plus className="h-4 w-4" />
            {termos.botaoNovaMarcaRaca}
          </button>
        )}
      </div>

      {/* Aggregate stats bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-2xs">
          <div>
            <div className="text-[10px] uppercase font-mono font-bold text-slate-400">
              {isAutomotivo ? "Total de Marcas" : "Total Bibliotecado"}
            </div>
            <div className="text-lg font-extrabold text-slate-800">{stats.total}</div>
          </div>
          <span className="text-2xl">{isAutomotivo ? "🚗" : "🧬"}</span>
        </div>
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-2xs">
          <div>
            <div className="text-[10px] uppercase font-mono font-bold text-slate-400">
              {isAutomotivo ? "Carros / Principais (🚗)" : "Raças Caninas (🐶)"}
            </div>
            <div className="text-lg font-extrabold text-emerald-700">{stats.item1}</div>
          </div>
          <span className="text-2xl">{isAutomotivo ? "🚘" : "🐕"}</span>
        </div>
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-2xs">
          <div>
            <div className="text-[10px] uppercase font-mono font-bold text-slate-400">
              {isAutomotivo ? "Motos & Especiais (🏍️)" : "Raças Felinas (🐱)"}
            </div>
            <div className="text-lg font-extrabold text-indigo-700">{stats.item2}</div>
          </div>
          <span className="text-2xl">{isAutomotivo ? "🏍️" : "🐈"}</span>
        </div>
      </div>

      {/* Grid Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in-down">
        
        {/* Search header with Filters */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder={isAutomotivo ? "Pesquisar por Código ou Nome da Marca (ex: Fiat, Toyota)..." : "Pesquisar por Código ou Nome da Raça..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex bg-slate-100 p-1 rounded-xl gap-1 text-[11px] font-mono font-semibold">
              <button
                type="button"
                onClick={() => setSelectedSpecies("TODOS")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedSpecies === "TODOS"
                    ? "bg-white text-slate-800 shadow-3xs"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {isAutomotivo ? "Todas as Marcas" : "Todos"}
              </button>
              <button
                type="button"
                onClick={() => setSelectedSpecies(isAutomotivo ? "CARRO" : "CÃO")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedSpecies === (isAutomotivo ? "CARRO" : "CÃO")
                    ? "bg-white text-emerald-700 shadow-3xs"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {isAutomotivo ? "Carros (🚗)" : "Cães (🐶)"}
              </button>
              <button
                type="button"
                onClick={() => setSelectedSpecies(isAutomotivo ? "MOTO" : "GATO")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedSpecies === (isAutomotivo ? "MOTO" : "GATO")
                    ? "bg-white text-indigo-700 shadow-3xs"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {isAutomotivo ? "Motos (🏍️)" : "Gatos (🐱)"}
              </button>
            </div>

            {/* Layout Configuration: Standard List vs Inline Spreadsheet List */}
            <div className="inline-flex bg-slate-100 p-1 rounded-xl gap-1 text-[11px] font-mono font-semibold">
              <button
                type="button"
                onClick={() => setLayoutStyle("list")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  layoutStyle === "list"
                    ? "bg-white text-slate-800 shadow-3xs"
                    : "text-slate-400 hover:text-slate-600"
                }`}
                title="Exibição em Lista clássica"
              >
                Lista (List)
              </button>
              <button
                type="button"
                onClick={() => setLayoutStyle("inline-list")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  layoutStyle === "inline-list"
                    ? "bg-white text-emerald-700 shadow-3xs"
                    : "text-slate-400 hover:text-slate-600"
                }`}
                title="Exibição em Lista Inline (Edição direta na planilha)"
              >
                Lista Inline (Inline List)
              </button>
            </div>

            <div className="text-xs text-slate-400 font-mono">
              Mostrando {filteredRacas.length} de {effectiveRacas.length} {isAutomotivo ? "marcas cadastradas" : "raças catalogadas"}
            </div>
          </div>
        </div>

        {/* Dense Sheet Layout Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-mono text-[10px] uppercase font-semibold sticky top-0 z-10">
                <th className="w-36 p-2.5 border-r border-slate-200 text-center bg-slate-100/90">Código (ID)</th>
                <th className="p-2.5 border-r border-slate-200 bg-slate-100/90">
                  {isAutomotivo ? "Nome da Marca / Montadora" : "Nome da Raça Cadastrada"}
                </th>
                <th className="w-56 p-2.5 border-r border-slate-200 bg-slate-100/90">
                  {isAutomotivo ? "Tipo / Categoria" : "Espécie Classificada"}
                </th>
                <th className="w-32 p-2.5 text-center bg-slate-100/90">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-mono">
              {filteredRacas.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400 bg-white font-sans text-xs">
                    {isAutomotivo ? "Nenhuma marca encontrada para os filtros aplicados." : "Nenhuma raça encontrada para os filtros aplicados."}
                  </td>
                </tr>
              ) : (
                filteredRacas.map((r, idx) => {
                  const isBase = !r.Id.startsWith("raca-custom-") || r.status_registro === "padrão";
                  const isOwnCustomBreed = r.Id.startsWith("raca-custom-") && r.IdUsuarioDono === currentUserOwnerId && r.status_registro !== "padrão";
                  const showActionButtons = isBase ? godModeActive : (isOwnCustomBreed || godModeActive);
                  const isEditable = showActionButtons;

                  return (
                    <tr
                      key={r.Id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        idx % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                      }`}
                    >
                      {/* ID */}
                      <td className="p-2 border-r border-slate-100 text-center text-[10px] font-bold text-slate-400 bg-slate-50/30">
                        {r.Id}
                      </td>

                      {/* BREED / BRAND NAME */}
                      <td className="p-1 border-r border-slate-100 focus-within:ring-2 focus-within:ring-emerald-500/30">
                        {layoutStyle === "inline-list" ? (
                          <input
                            type="text"
                            disabled={!isEditable || isRestricted}
                            value={r.Raca}
                            onChange={(e) => handleCellChange(r.Id, "Raca", e.target.value)}
                            className={`w-full bg-transparent border-0 p-1 focus:outline-none text-xs font-semibold text-slate-800 ${(!isEditable || isRestricted) ? "cursor-not-allowed opacity-75" : ""}`}
                            placeholder={isAutomotivo ? "Nome da marca" : "Nome da raça"}
                          />
                        ) : (
                          <span className="px-2.5 py-1.5 text-xs font-semibold text-slate-800 block select-all">
                            {r.Raca || <span className="text-slate-350 italic">Sem Nome</span>}
                          </span>
                        )}
                      </td>

                      {/* SPECIES / CATEGORY DROPDOWN */}
                      <td className="p-1 border-r border-slate-100 focus-within:ring-2 focus-within:ring-indigo-500/30">
                        {layoutStyle === "inline-list" ? (
                          <select
                            value={r.Especie}
                            disabled={!isEditable || isRestricted}
                            onChange={(e) => handleCellChange(r.Id, "Especie", e.target.value)}
                            className={`w-full bg-transparent border-0 p-1 focus:outline-none text-xs text-slate-705 font-mono ${(!isEditable || isRestricted) ? "cursor-not-allowed opacity-75" : ""}`}
                          >
                            {isAutomotivo ? (
                              <>
                                <option value="Carro">🚗 Carro / Utilitário</option>
                                <option value="Moto">🏍️ Moto</option>
                              </>
                            ) : (
                              <>
                                <option value="Cão">🐶 Cão</option>
                                <option value="Gato">🐱 Gato</option>
                              </>
                            )}
                          </select>
                        ) : (
                          <span className="px-2.5 py-1.5 text-xs text-slate-600 font-sans font-medium flex items-center gap-1.5">
                            {isAutomotivo ? (
                              r.Especie === "Moto" ? "🏍️ Moto" : "🚗 Carro / Utilitário"
                            ) : (
                              r.Especie === "Gato" ? "🐱 Gato" : "🐶 Cão"
                            )}
                          </span>
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td className="p-1 text-center align-middle">
                        <div className="flex items-center justify-center gap-1.5">
                          {showActionButtons ? (
                            <>
                              <button
                                type="button"
                                disabled={userPermissionLevel === 3}
                                onClick={() => {
                                  if (userPermissionLevel === 3) return;
                                  handleStartEditBreed(r);
                                }}
                                className={`p-1 rounded-lg transition ${
                                  userPermissionLevel === 3
                                    ? "text-slate-350 cursor-not-allowed opacity-50 bg-slate-50 border border-slate-205"
                                    : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                                }`}
                                title={userPermissionLevel === 3 ? "Acesso Restrito: Nível 3 não pode editar." : (isAutomotivo ? "Editar Marca" : "Editar Raça")}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={userPermissionLevel === 3}
                                onClick={() => {
                                  if (userPermissionLevel === 3) return;
                                  handleDeleteBreed(r.Id);
                                }}
                                className={`p-1 rounded-lg transition font-sans ${
                                  userPermissionLevel === 3
                                    ? "text-slate-350 cursor-not-allowed opacity-50 bg-slate-50 border border-slate-205"
                                    : "text-slate-400 hover:text-red-500 hover:bg-red-50 cursor-pointer"
                                }`}
                                title={userPermissionLevel === 3 ? "Acesso Restrito: Nível 3 não pode excluir." : (isAutomotivo ? "Remover Marca" : "Remover Raça")}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-sans italic bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                              <Lock className="h-3 w-3 text-slate-400" />
                              Leitura
                            </span>
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

        {/* Dense Table Info footer message */}
        <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-400 font-mono text-center flex items-center justify-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-slate-400" />
          {isAutomotivo
            ? "Lista enxuta e editável de marcas e montadoras para seleção rápida no cadastro de veículos. O atendente seleciona a marca e digita livremente o modelo do carro (ex: Uno, Corolla, Onix)."
            : "A catalogação prévia de raças serve de auxílio visual e consulta para preencher a espécie exata no cadastro de pets (CadPets)."}
        </div>
      </div>

      {/* Modal - Adicionar Marca / Raça */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 select-none">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-scale-up">
            
            <div className="bg-gradient-to-r from-emerald-600 to-indigo-600 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold font-display tracking-tight text-base">
                  {isAutomotivo ? "Adicionar Nova Marca / Montadora" : "Adicionar Raça Personalizada"}
                </h3>
                <p className="text-[10px] text-emerald-100 uppercase tracking-wider font-mono">
                  {isAutomotivo ? "Base de Marcas (CadMarcas)" : "Base de dados (CadRaça)"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-white hover:text-slate-150 text-sm font-semibold p-1 hover:bg-white/10 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddBreed} className="p-6 space-y-4">
              
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                  {isAutomotivo ? "Nome da Marca / Montadora" : "Nome da Raça"}
                </label>
                <input
                  type="text"
                  required
                  value={newRaca}
                  onChange={(e) => setNewRaca(e.target.value)}
                  placeholder={isAutomotivo ? "Ex: Fiat, Chevrolet, BYD, Chery, GWM, Ram" : "Ex: Maltês, Persa, Yorkshire"}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-sans font-medium"
                />
              </div>

              {/* Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                  {isAutomotivo ? "Tipo / Categoria" : "Espécie Predominante"}
                </label>
                <div className="flex gap-4">
                  <label className="flex-1 flex items-center justify-center gap-1.5 p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer text-xs font-semibold font-mono text-slate-800">
                    <input
                      type="radio"
                      name="newBreedSpecies"
                      checked={newEspecie === (isAutomotivo ? "Carro" : "Cão")}
                      onChange={() => setNewEspecie(isAutomotivo ? "Carro" : "Cão")}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    {isAutomotivo ? "🚗 Carro" : "🐶 Cão"}
                  </label>
                  <label className="flex-1 flex items-center justify-center gap-1.5 p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer text-xs font-semibold font-mono text-slate-800">
                    <input
                      type="radio"
                      name="newBreedSpecies"
                      checked={newEspecie === (isAutomotivo ? "Moto" : "Gato")}
                      onChange={() => setNewEspecie(isAutomotivo ? "Moto" : "Gato")}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    {isAutomotivo ? "🏍️ Moto" : "🐱 Gato"}
                  </label>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 font-sans text-xs">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-4.5 py-2 font-semibold rounded-xl text-white shadow-xs cursor-pointer ${activeTheme.primary}`}
                >
                  {isAutomotivo ? "Adicionar Marca" : "Adicionar Raça"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal - Editar Marca / Raça */}
      {showEditModal && editingBreedId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 select-none">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-scale-up">
            
            <div className="bg-gradient-to-r from-emerald-600 to-indigo-600 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold font-display tracking-tight text-base">
                  {isAutomotivo ? "Editar Marca / Montadora" : "Editar Raça (Correção)"}
                </h3>
                <p className="text-[10px] text-emerald-100 uppercase tracking-wider font-mono">
                  ID: {editingBreedId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingBreedId(null);
                }}
                className="text-white hover:text-slate-150 text-sm font-semibold p-1 hover:bg-white/10 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditBreed} className="p-6 space-y-4">
              
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                  {isAutomotivo ? "Nome da Marca / Montadora" : "Nome da Raça"}
                </label>
                <input
                  type="text"
                  required
                  value={editRaca}
                  onChange={(e) => setEditRaca(e.target.value)}
                  placeholder={isAutomotivo ? "Ex: Fiat, Chevrolet, BYD" : "Ex: Maltês, Persa, Yorkshire"}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-sans font-medium"
                />
              </div>

              {/* Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                  {isAutomotivo ? "Tipo / Categoria" : "Espécie Predominante"}
                </label>
                <div className="flex gap-4">
                  <label className="flex-1 flex items-center justify-center gap-1.5 p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer text-xs font-semibold font-mono text-slate-800">
                    <input
                      type="radio"
                      name="editBreedSpecies"
                      checked={editEspecie === (isAutomotivo ? "Carro" : "Cão")}
                      onChange={() => setEditEspecie(isAutomotivo ? "Carro" : "Cão")}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    {isAutomotivo ? "🚗 Carro" : "🐶 Cão"}
                  </label>
                  <label className="flex-1 flex items-center justify-center gap-1.5 p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer text-xs font-semibold font-mono text-slate-800">
                    <input
                      type="radio"
                      name="editBreedSpecies"
                      checked={editEspecie === (isAutomotivo ? "Moto" : "Gato")}
                      onChange={() => setEditEspecie(isAutomotivo ? "Moto" : "Gato")}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    {isAutomotivo ? "🏍️ Moto" : "🐱 Gato"}
                  </label>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 font-sans text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingBreedId(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-4.5 py-2 font-semibold rounded-xl text-white shadow-xs cursor-pointer ${activeTheme.primary}`}
                >
                  Salvar Alteração
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
