/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// BLINDAGEM DE CUSTOS & PROCESSAMENTO ESTÁTICO DE SUBTABELAS:
// Fica expressamente estabelecido e amparado que a tabela taxonômica CadRaca (229 registros) é armazenada, indexada,
// filtrada, pesquisada e autocompletada inteiramente de forma local estática no dispositivo do usuário (in-cache/in-memory).
// É absolutamente proibido que qualquer chamada de inteligência artificial ou requisição remota ao Gemini interaja,
// indexes, ou faça buscas nesse conjunto de dados fechado de 229 raças de animais.

import React, { useState, useMemo, useRef, useEffect } from "react";
import { CadCliente, CadPets, ThemeColor, CadRaca } from "../types";
import { Plus, Trash2, Search, CheckSquare, Square, Heart, Bone, ChevronDown, Edit3, ClipboardList, ArrowRight, Copy, Check, Loader2, Car, Wrench } from "lucide-react";
import { getTermos, MONTADORAS_AUTOMOTIVAS, MARCAS_AUTOMOTIVAS_PADRAO } from "../data/dicionarioTermos";

interface RacaCellSelectProps {
  pet: CadPets;
  racas: CadRaca[];
  onSelectRaca: (racaName: string) => void;
  disabled?: boolean;
  isAutomotivo?: boolean;
  marcasList?: string[];
}

// Helper to remove accents and normalize text for fast, fluent searching
const normalizeText = (str: string) => {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_]/g, " ")
    .trim();
};

function RacaCellSelect({ pet, racas, onSelectRaca, disabled = false, isAutomotivo = false, marcasList = [] }: RacaCellSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Reset search when opening
  useEffect(() => {
    if (isOpen) {
      setSearch("");
    }
  }, [isOpen]);

  // Filter list of breeds or brands based on search query
  const filtered = useMemo(() => {
    const q = normalizeText(search);

    if (isAutomotivo) {
      const allBrands = Array.from(new Set([
        ...MARCAS_AUTOMOTIVAS_PADRAO,
        ...marcasList,
        ...racas
          .filter(r => r.Raca && (r.Especie === "Carro" || r.Especie === "Moto" || r.Especie === "Veículo" || r.Especie === "Montadora"))
          .map(r => r.Raca)
      ]));

      const top10 = [
        "Fiat", "Chevrolet", "Volkswagen", "Ford", "Toyota",
        "Honda", "Hyundai", "Renault", "Jeep", "Nissan"
      ];

      const matches = allBrands.filter(b => !q || normalizeText(b).includes(q));
      const mainMatches = matches.filter(b => top10.includes(b));
      const otherMatches = matches.filter(b => !top10.includes(b));

      return {
        isAuto: true,
        mainBrands: mainMatches,
        otherBrands: otherMatches,
        allBrandsCount: matches.length,
        same: [],
        others: []
      };
    }
    
    const sameSpeciesBreeds = racas
      .filter((r) => r.Especie.toLowerCase() === pet.Especie.toLowerCase())
      .sort((a, b) => a.Raca.localeCompare(b.Raca));
      
    const otherSpeciesBreeds = racas
      .filter((r) => r.Especie.toLowerCase() !== pet.Especie.toLowerCase())
      .sort((a, b) => a.Raca.localeCompare(b.Raca));

    if (!q) {
      return {
        isAuto: false,
        mainBrands: [],
        otherBrands: [],
        allBrandsCount: 0,
        same: sameSpeciesBreeds,
        others: otherSpeciesBreeds,
      };
    }

    return {
      isAuto: false,
      mainBrands: [],
      otherBrands: [],
      allBrandsCount: 0,
      same: sameSpeciesBreeds.filter((r) => normalizeText(r.Raca).includes(q)),
      others: otherSpeciesBreeds.filter((r) => normalizeText(r.Raca).includes(q) || normalizeText(r.Especie).includes(q)),
    };
  }, [search, racas, pet.Especie, isAutomotivo, marcasList]);

  const handleSelect = (racaName: string) => {
    onSelectRaca(racaName);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* Trigger Button that looks like spreadsheet cell with interactive hover */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left p-1 text-xs text-slate-700 font-mono focus:outline-none rounded flex items-center justify-between gap-1 transition-colors min-h-[24px] ${
          disabled ? "bg-slate-50/50 cursor-not-allowed opacity-80" : "focus:bg-slate-100/85 hover:bg-slate-100 cursor-pointer"
        }`}
      >
        <span className="truncate flex-1 font-mono font-medium text-slate-800">
          {pet.Raca ? (isAutomotivo ? `🚗 ${pet.Raca}` : `🏷️ ${pet.Raca}`) : (isAutomotivo ? "❔ Sem Marca" : "❔ Sem Raça")}
        </span>
        {!disabled && <span className="text-[9px] text-slate-400">▼</span>}
      </button>

      {isOpen && (
        <div className="absolute z-50 left-0 mt-1 min-w-[240px] max-w-[320px] bg-white border border-slate-200 shadow-2xl rounded-xl p-2 font-sans flex flex-col">
          {/* Instant Search Bar */}
          <div className="relative mb-1.5">
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isAutomotivo ? "Pesquisar Marca/Montadora..." : "Pesquisar raça..."}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-sans text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-500 focus:bg-white"
            />
          </div>

          {/* List of Breeds or Brands */}
          <div className="max-h-56 overflow-y-auto custom-scrollbar divide-y divide-slate-100">
            {/* option for Sem Raça / Sem Marca */}
            <button
              type="button"
              onClick={() => handleSelect("")}
              className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-sans transition-colors duration-100 flex items-center justify-between ${
                !pet.Raca ? "bg-emerald-50 text-emerald-800 font-semibold" : "text-rose-600 hover:bg-rose-50"
              }`}
            >
              <span>❌ {isAutomotivo ? "-- Sem Marca Definida --" : "-- Sem Raça / Sem Raça Definida --"}</span>
            </button>

            {isAutomotivo ? (
              <>
                {/* Main Brands (Top 10) */}
                {filtered.mainBrands.length > 0 && (
                  <div className="py-1">
                    <div className="px-2 py-0.5 text-[9px] font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50/70 rounded font-mono">
                      ⭐ Principais Montadoras
                    </div>
                    {filtered.mainBrands.map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => handleSelect(b)}
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-sans transition-colors duration-100 flex items-center justify-between ${
                          pet.Raca === b
                            ? "bg-emerald-50 text-emerald-800 font-semibold"
                            : "text-slate-700 hover:bg-slate-100 cursor-pointer"
                        }`}
                      >
                        <span className="font-medium">{b}</span>
                        {pet.Raca === b && <span className="text-emerald-600 font-bold">✓</span>}
                      </button>
                    ))}
                  </div>
                )}

                {/* Other Brands */}
                {filtered.otherBrands.length > 0 && (
                  <div className="py-1">
                    <div className="px-2 py-0.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 rounded font-mono">
                      Outras Marcas ({filtered.otherBrands.length})
                    </div>
                    {filtered.otherBrands.map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => handleSelect(b)}
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-sans transition-colors duration-100 flex items-center justify-between ${
                          pet.Raca === b
                            ? "bg-emerald-50 text-emerald-800 font-semibold"
                            : "text-slate-700 hover:bg-slate-100 cursor-pointer"
                        }`}
                      >
                        <span>{b}</span>
                        {pet.Raca === b && <span className="text-emerald-600 font-bold">✓</span>}
                      </button>
                    ))}
                  </div>
                )}

                {/* Custom search option if brand not found */}
                {search.trim() && !filtered.mainBrands.includes(search.trim()) && !filtered.otherBrands.includes(search.trim()) && (
                  <div className="p-1">
                    <button
                      type="button"
                      onClick={() => handleSelect(search.trim())}
                      className="w-full text-left px-2 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition flex items-center justify-between"
                    >
                      <span>Usar "{search.trim()}" como marca</span>
                      <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-mono">Usar</span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Same Species Section */}
                {filtered.same.length > 0 && (
                  <div className="py-1">
                    <div className="px-2 py-0.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 rounded font-mono">
                      Raças de {pet.Especie} ({filtered.same.length})
                    </div>
                    {filtered.same.map((r, idx) => (
                      <button
                        key={`${r.Id || r.Raca}-${idx}`}
                        type="button"
                        onClick={() => handleSelect(r.Raca)}
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-sans transition-colors duration-100 flex items-center justify-between ${
                          pet.Raca === r.Raca
                            ? "bg-emerald-50 text-emerald-800 font-semibold"
                            : "text-slate-700 hover:bg-slate-100 cursor-pointer"
                        }`}
                      >
                        <span>{r.Raca}</span>
                        {pet.Raca === r.Raca && <span className="text-emerald-600 font-bold">✓</span>}
                      </button>
                    ))}
                  </div>
                )}

                {/* Other Species Section */}
                {filtered.others.length > 0 && (
                  <div className="py-1">
                    <div className="px-2 py-0.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 rounded font-mono">
                      Outras Espécies ({filtered.others.length})
                    </div>
                    {filtered.others.map((r, idx) => (
                      <button
                        key={`${r.Id || r.Raca}-${idx}`}
                        type="button"
                        onClick={() => handleSelect(r.Raca)}
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-sans transition-colors duration-100 flex items-center justify-between ${
                          pet.Raca === r.Raca
                            ? "bg-emerald-50 text-emerald-800 font-semibold"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <span className="truncate">{r.Raca}</span>
                        <span className="text-[9px] px-1.5 py-0.2 bg-slate-100 text-slate-500 rounded font-mono shrink-0">
                          {r.Especie}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {filtered.same.length === 0 && filtered.others.length === 0 && (
                  <div className="p-3 text-center text-slate-400 text-xs font-sans">
                    Nenhuma raça encontrada.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface ComboboxItem {
  id: string;
  label: string;
  sublabel?: string;
  category?: string;
}

interface InteractiveComboboxProps {
  items: ComboboxItem[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  required?: boolean;
  dropUp?: boolean;
}

function InteractiveCombobox({ items, value, onChange, placeholder, required, dropUp }: InteractiveComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const checkPosition = () => {
      if (dropUp) {
        setOpenUpward(true);
        return;
      }
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < 220 && spaceAbove > spaceBelow) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    };

    checkPosition();
    window.addEventListener("scroll", checkPosition, true);
    window.addEventListener("resize", checkPosition);
    return () => {
      window.removeEventListener("scroll", checkPosition, true);
      window.removeEventListener("resize", checkPosition);
    };
  }, [isOpen, dropUp]);

  const selectedItem = useMemo(() => {
    if (!value) return undefined;
    const normVal = normalizeText(value);
    return items.find((item) => normalizeText(item.id) === normVal || normalizeText(item.label) === normVal);
  }, [items, value]);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // If user entered search query without explicitly selecting, try matching or set as custom term
        if (search.trim()) {
          const normQuery = normalizeText(search);
          const match = items.find((i) => normalizeText(i.label) === normQuery || normalizeText(i.id) === normQuery);
          if (match) {
            onChange(match.id);
          } else {
            onChange(search.trim());
          }
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, search, items, onChange]);

  const filteredItems = useMemo(() => {
    const q = normalizeText(search);
    if (!q) return items;
    
    return items.filter((item) => {
      const normLabel = normalizeText(item.label);
      const normId = normalizeText(item.id);
      const normSub = item.sublabel ? normalizeText(item.sublabel) : "";

      // Strictly match label, id, or sublabel — DO NOT match category headers
      return normLabel.includes(q) || normId.includes(q) || normSub.includes(q);
    });
  }, [search, items]);

  const hasCategories = useMemo(() => items.some((item) => !!item.category), [items]);

  const groupedItems = useMemo<Record<string, ComboboxItem[]>>(() => {
    if (!hasCategories) return { "": filteredItems };
    const groups: { [key: string]: ComboboxItem[] } = {};
    filteredItems.forEach((item) => {
      const cat = item.category || "Geral";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [filteredItems, hasCategories]);

  const displayValue = isOpen ? search : (selectedItem ? selectedItem.label : value || "");

  const handleSelectOption = (item: ComboboxItem) => {
    onChange(item.id);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div ref={containerRef} className="relative w-full font-sans select-none text-left">
      <div className="relative">
        <input
          type="text"
          required={required}
          value={displayValue}
          onChange={(e) => {
            const val = e.target.value;
            setSearch(val);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setSearch(selectedItem ? selectedItem.label : (value || ""));
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (filteredItems.length > 0) {
                handleSelectOption(filteredItems[0]);
              } else if (search.trim()) {
                onChange(search.trim());
                setIsOpen(false);
                setSearch("");
              }
            } else if (e.key === "Escape") {
              setIsOpen(false);
            }
          }}
          placeholder={placeholder}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition duration-150 pr-14 text-left cursor-text placeholder-slate-400 font-medium"
        />
        
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
          {(value || search) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setSearch("");
              }}
              className="text-slate-400 hover:text-slate-600 p-0.5 text-[9px] bg-slate-100 hover:bg-slate-200 rounded-full transition cursor-pointer font-sans font-bold"
            >
              ✕
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (isOpen) {
                setIsOpen(false);
              } else {
                setIsOpen(true);
                setSearch(selectedItem ? selectedItem.label : (value || ""));
              }
            }}
            className="text-slate-400 hover:text-slate-600 p-0.5 transition cursor-pointer"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {isOpen && (
        <div
          className={`absolute left-0 right-0 z-50 max-h-52 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100 custom-scrollbar ${
            openUpward ? "bottom-full mb-1.5" : "top-full mt-1.5"
          }`}
        >
          {(Object.entries(groupedItems) as [string, ComboboxItem[]][]).map(([category, itemsList]) => {
            if (!itemsList || itemsList.length === 0) return null;
            return (
              <div key={category} className="py-1">
                {category && (
                  <div className="px-3 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 font-mono">
                    {category}
                  </div>
                )}
                {itemsList.map((item, idx) => {
                  const isSelected = value === item.id || (selectedItem && selectedItem.id === item.id);
                  return (
                    <button
                      key={`${item.id}-${category}-${idx}`}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectOption(item);
                      }}
                      className={`w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-800 text-xs font-semibold transition flex items-center justify-between cursor-pointer ${
                        isSelected ? "bg-emerald-50/70 text-emerald-800 font-bold" : ""
                      }`}
                    >
                      <div>
                        <div className="text-slate-900">{item.label}</div>
                        {item.sublabel && <div className="text-[10px] text-slate-500 font-mono font-medium">{item.sublabel}</div>}
                      </div>
                      {isSelected ? (
                        <span className="text-emerald-600 font-bold text-sm">✓</span>
                      ) : (
                        <span className="text-[9px] bg-slate-50 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded-md font-bold uppercase font-mono">
                          Selecionar
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}

          {search.trim() && !filteredItems.some((i) => normalizeText(i.label) === normalizeText(search) || normalizeText(i.id) === normalizeText(search)) && (
            <div className="p-1 text-center bg-slate-50/50 border-t border-slate-100">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(search.trim());
                  setIsOpen(false);
                  setSearch("");
                }}
                className="w-full text-center px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-between"
              >
                <span>Usar "{search}" como termo customizado</span>
                <span className="text-[9px] bg-emerald-600 text-white px-2 py-0.5 rounded-md uppercase font-mono shadow-3xs">
                  Usar
                </span>
              </button>
            </div>
          )}

          {filteredItems.length === 0 && !search.trim() && (
            <div className="p-3 text-center text-slate-400 text-xs">
              Nenhuma raça disponível.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface PetsProps {
  pets: CadPets[];
  clientes: CadCliente[];
  racas: CadRaca[];
  activeTheme: ThemeColor;
  currentUserOwnerId: string;
  currentUser?: any;
  segmento?: string;
  isAdminViewAll?: boolean;
  isAdmin?: boolean;
  onUpdatePets: (updated: CadPets[]) => void;
  showConfirm: (title: string, msg: string, onConfirm: () => void) => void;
  showAlert: (title: string, msg: string) => void;
  isRestricted?: boolean;
  userPermissionLevel?: number;
  prefilledClientIdForNewPet?: string | null;
  onClearPrefilledClientId?: () => void;
}

export default function PetsSheet({
  pets,
  clientes,
  racas = [],
  activeTheme,
  currentUserOwnerId,
  currentUser,
  segmento,
  isAdminViewAll = false,
  isAdmin = false,
  onUpdatePets,
  showConfirm,
  showAlert,
  isRestricted = false,
  userPermissionLevel = 1,
  prefilledClientIdForNewPet = null,
  onClearPrefilledClientId,
}: PetsProps) {
  const rawSegmento = (segmento || currentUser?.Segmento || "petshop").toString().toLowerCase().trim();
  const termos = useMemo(() => getTermos(rawSegmento), [rawSegmento]);
  const isLavaRapido = termos.segmento === "lavarapido";
  const isAutomotivo = termos.usaMontadorasAutomotivas;

  const [searchTerm, setSearchTerm] = useState("");
  const isMasterAdmin = currentUser?.Id === "user-1" || currentUser?.Id === "usr-1";
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states (Aba 1 - Dados Básicos)
  const [nome, setNome] = useState("");
  const [especie, setEspecie] = useState(termos.defaultEspecie);
  const [raca, setRaca] = useState("");
  const [porte, setPorte] = useState(termos.defaultPorte);
  const [sexo, setSexo] = useState(termos.defaultSexo);
  const [idCliente, setIdCliente] = useState("");
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [racaSearchQuery, setRacaSearchQuery] = useState("");
  const [showRacaDropdown, setShowRacaDropdown] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // Estado para suporte a marca customizada e lista enxuta
  const [isCustomBrand, setIsCustomBrand] = useState(false);
  const [editIsCustomBrand, setEditIsCustomBrand] = useState(false);

  const customBrandsFromDb = useMemo(() => {
    const defaults = MARCAS_AUTOMOTIVAS_PADRAO;
    const custom = racas
      .filter((r) => r.Raca && !defaults.some(d => d.toLowerCase() === r.Raca.toLowerCase()) && (r.Especie === "Carro" || r.Especie === "Moto" || r.Especie === "Veículo" || r.Especie === "Montadora"))
      .map((r) => r.Raca);
    return Array.from(new Set(custom));
  }, [racas]);

  useEffect(() => {
    if (isAutomotivo && (especie === "Cão" || !especie)) {
      setEspecie(termos.defaultEspecie);
      setPorte(termos.defaultPorte);
      setSexo(termos.defaultSexo);
    } else if (!isAutomotivo && (especie === "Carro" || !especie)) {
      setEspecie(termos.defaultEspecie);
      setPorte(termos.defaultPorte);
      setSexo(termos.defaultSexo);
    }
  }, [isAutomotivo, termos]);

  // Form states (Aba 2 - Ficha Técnica)
  const [addActiveTab, setAddActiveTab] = useState<"basics" | "clinical">("basics");
  const [alergias, setAlergias] = useState("");
  const [condicaoSaude, setCondicaoSaude] = useState("");
  const [medicamentoUso, setMedicamentoUso] = useState("");
  const [dataVacinaRaiva, setDataVacinaRaiva] = useState("");
  const [nivelAgressiveness, setNivelAgressiveness] = useState<"Dócil" | "Arisco" | "Bravo">("Dócil");
  const [medosTraumas, setMedosTraumas] = useState("");
  const [obsManejo, setObsManejo] = useState("");
  const [tipoPelo, setTipoPelo] = useState<"Curto" | "Longo" | "Duro" | "Primitivo">("Curto");
  const [estStyleTosa, setEstStyleTosa] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [fotoPet, setFotoPet] = useState("");

  // Edit Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editActiveTab, setEditActiveTab] = useState<"basics" | "clinical">("basics");
  const [editingPetId, setEditingPetId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editEspecie, setEditEspecie] = useState("Cão");
  const [editRaca, setEditRaca] = useState("");
  const [editPorte, setEditPorte] = useState("Pequeno");
  const [editSexo, setEditSexo] = useState("Macho");
  const [editIdCliente, setEditIdCliente] = useState("");
  
  const [editAlergias, setEditAlergias] = useState("");
  const [editCondicaoSaude, setEditCondicaoSaude] = useState("");
  const [editMedicamentoUso, setEditMedicamentoUso] = useState("");
  const [editDataVacinaRaiva, setEditDataVacinaRaiva] = useState("");
  const [editNivelAgressiveness, setEditNivelAgressiveness] = useState<"Dócil" | "Arisco" | "Bravo">("Dócil");
  const [editMedosTraumas, setEditMedosTraumas] = useState("");
  const [editObsManejo, setEditObsManejo] = useState("");
  const [editTipoPelo, setEditTipoPelo] = useState<"Curto" | "Longo" | "Duro" | "Primitivo">("Curto");
  const [editEstStyleTosa, setEditEstStyleTosa] = useState("");
  const [editDataNascimento, setEditDataNascimento] = useState("");
  const [editFotoPet, setEditFotoPet] = useState("");

  // States for the custom internal green arrow popup modal
  const [showPhotoPopup, setShowPhotoPopup] = useState(false);
  const [popupPhotoUrl, setPopupPhotoUrl] = useState("");
  const [copyStatus, setCopyStatus] = useState<"idle" | "loading" | "success" | "error" | "cors_fallback">("idle");

  const handleCopyImageToClipboard = async (url: string) => {
    if (!url) return;
    setCopyStatus("loading");

    try {
      // 1. First attempt: Direct fetch to convert blob to png (works if CORS allows)
      const response = await fetch(url);
      const blob = await response.blob();
      
      let finalBlob = blob;
      if (blob.type !== "image/png") {
        finalBlob = await convertToPngBlob(url);
      }

      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": finalBlob
        })
      ]);
      setCopyStatus("success");
      setTimeout(() => setCopyStatus("idle"), 2500);
    } catch (err) {
      console.warn("Direct fetch image copy failed (possibly CORS). Attempting fallback canvas rendering...", err);
      try {
        // 2. Second attempt: Draw image on canvas using crossOrigin="anonymous" (might still trigger CORS but worth trying as a solid fallback)
        const canvasBlob = await convertToPngBlob(url);
        await navigator.clipboard.write([
          new ClipboardItem({
            "image/png": canvasBlob
          })
        ]);
        setCopyStatus("success");
        setTimeout(() => setCopyStatus("idle"), 2500);
      } catch (fallbackErr) {
        console.error("Canvas conversion and copying failed:", fallbackErr);
        // 3. Ultimate safe fallback: Copy the link to clipboard so the user isn't left empty-handed!
        try {
          await navigator.clipboard.writeText(url);
          setCopyStatus("cors_fallback");
          setTimeout(() => setCopyStatus("idle"), 6000);
        } catch (linkErr) {
          console.error("Even text copy failed:", linkErr);
          setCopyStatus("error");
          setTimeout(() => setCopyStatus("idle"), 3000);
        }
      }
    }
  };

  const convertToPngBlob = (imageUrl: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not acquire 2D canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to convert canvas to blob"));
          }
        }, "image/png");
      };
      img.onerror = () => reject(new Error("Error loading image for canvas conversion"));
      img.src = imageUrl;
    });
  };

  React.useEffect(() => {
    if (showAddModal) {
      if (prefilledClientIdForNewPet) {
        setIdCliente(prefilledClientIdForNewPet);
        const prefilledClient = clientes.find((c) => c.Id === prefilledClientIdForNewPet);
        setClientSearchQuery(prefilledClient ? prefilledClient.Nome : "");
      } else {
        setClientSearchQuery("");
        setIdCliente("");
      }
      setRaca("");
      setRacaSearchQuery("");
      setIsCustomBrand(false);
      setShowRacaDropdown(false);
      setShowClientDropdown(false);
      setAddActiveTab("basics");
      
      // Reset clinical fields
      setAlergias("");
      setCondicaoSaude("");
      setMedicamentoUso("");
      setDataVacinaRaiva("");
      setNivelAgressiveness("Dócil");
      setMedosTraumas("");
      setObsManejo("");
      setTipoPelo("Curto");
      setEstStyleTosa("");
      setDataNascimento("");
      setFotoPet("");
    }
  }, [showAddModal, prefilledClientIdForNewPet, clientes]);

  useEffect(() => {
    if (prefilledClientIdForNewPet) {
      setShowAddModal(true);
    }
  }, [prefilledClientIdForNewPet]);

  // Step 1: Filter users clients first (clients belonging to this logged-in account, or all if admin view is active)
  const myClientsMap = useMemo(() => {
    const map = new Map<string, CadCliente>();
    clientes.forEach((c) => {
      if (isAdminViewAll || c.IdUsuarioDono === currentUserOwnerId) {
        map.set(c.Id, c);
      }
    });
    return map;
  }, [clientes, currentUserOwnerId, isAdminViewAll]);

  const sortedMyClientsList = useMemo<CadCliente[]>(() => {
    return (Array.from(myClientsMap.values()) as CadCliente[]).sort((a, b) => a.Nome.localeCompare(b.Nome));
  }, [myClientsMap]);

  const clientComboboxItems = useMemo<ComboboxItem[]>(() => {
    return sortedMyClientsList.map((c) => ({
      id: c.Id,
      label: c.Nome,
      sublabel: c.Telefone || undefined,
    }));
  }, [sortedMyClientsList]);

  const especieComboboxItems = useMemo<ComboboxItem[]>(() => termos.especieItems, [termos]);

  const sexoComboboxItems = useMemo<ComboboxItem[]>(() => termos.sexoItems, [termos]);

  const montadorasComboboxItems = useMemo<ComboboxItem[]>(() => MONTADORAS_AUTOMOTIVAS, []);

  const racaComboboxItems = useMemo<ComboboxItem[]>(() => {
    if (termos.usaMontadorasAutomotivas) {
      return montadorasComboboxItems;
    }
    const srd = { id: "S.R.D.", label: "Sem Raça Definida (S.R.D.) / Misto", category: "Padrão" };
    const list = [srd];
    
    const uniqueRacas = Array.from(
      new Map(
        racas.map((r) => [`${(r.Raca || "").trim().toUpperCase()}-${(r.Especie || "").trim().toUpperCase()}`, r])
      ).values()
    );

    const same = uniqueRacas
      .filter(r => r.Raca && r.Especie.toLowerCase() === especie.toLowerCase())
      .sort((a, b) => a.Raca.localeCompare(b.Raca))
      .map(r => ({ id: r.Raca, label: r.Raca, category: `Raças de ${especie}` }));
      
    const others = uniqueRacas
      .filter(r => r.Raca && r.Especie.toLowerCase() !== especie.toLowerCase())
      .sort((a, b) => a.Raca.localeCompare(b.Raca))
      .map(r => ({ id: r.Raca, label: r.Raca, category: `Outras Espécies (${r.Especie})` }));

    return [...list, ...same, ...others];
  }, [racas, especie, termos.usaMontadorasAutomotivas, montadorasComboboxItems]);

  const editRacaComboboxItems = useMemo<ComboboxItem[]>(() => {
    if (termos.usaMontadorasAutomotivas) {
      return montadorasComboboxItems;
    }
    const srd = { id: "S.R.D.", label: "Sem Raça Definida (S.R.D.) / Misto", category: "Padrão" };
    const list = [srd];
    
    const uniqueRacas = Array.from(
      new Map(
        racas.map((r) => [`${(r.Raca || "").trim().toUpperCase()}-${(r.Especie || "").trim().toUpperCase()}`, r])
      ).values()
    );

    const same = uniqueRacas
      .filter(r => r.Raca && r.Especie.toLowerCase() === editEspecie.toLowerCase())
      .sort((a, b) => a.Raca.localeCompare(b.Raca))
      .map(r => ({ id: r.Raca, label: r.Raca, category: `Raças de ${editEspecie}` }));
      
    const others = uniqueRacas
      .filter(r => r.Raca && r.Especie.toLowerCase() !== editEspecie.toLowerCase())
      .sort((a, b) => a.Raca.localeCompare(b.Raca))
      .map(r => ({ id: r.Raca, label: r.Raca, category: `Outras Espécies (${r.Especie})` }));

    return [...list, ...same, ...others];
  }, [racas, editEspecie, termos.usaMontadorasAutomotivas, montadorasComboboxItems]);

  const porteComboboxItems = useMemo<ComboboxItem[]>(() => termos.porteItems, [termos]);

  // Step 2: Filter pets that are owned by those clients
  const myPets = useMemo(() => {
    return pets.filter((p) => {
      // Hide pet of name "GERAL" in user mode (accessible only to admin mode)
      const isGeral = p.Nome?.trim().toLowerCase() === "geral";
      if (isGeral && !isAdmin) {
        return false;
      }
      return myClientsMap.has(p.IdCliente);
    });
  }, [pets, myClientsMap, isAdmin]);

  // Apply Search Filters (Pet Name, Client Owner Name, Species, Breed, Size)
  const filteredPets = useMemo(() => {
    if (!searchTerm.trim()) return myPets;
    const query = searchTerm.toLowerCase();
    return myPets.filter((p) => {
      const owner = myClientsMap.get(p.IdCliente);
      const ownerName = owner ? owner.Nome : "";

      return (
        p.Nome.toLowerCase().includes(query) ||
        p.Especie.toLowerCase().includes(query) ||
        (p.Raca && p.Raca.toLowerCase().includes(query)) ||
        p.Porte.toLowerCase().includes(query) ||
        p.Sexo.toLowerCase().includes(query) ||
        ownerName.toLowerCase().includes(query)
      );
    });
  }, [myPets, searchTerm, myClientsMap]);

  const filteredRacas = useMemo(() => {
    const q = racaSearchQuery.toLowerCase().trim();
    
    const sameSpecies = racas
      .filter((r) => r.Especie.toLowerCase() === especie.toLowerCase())
      .sort((a, b) => a.Raca.localeCompare(b.Raca));
      
    const otherSpecies = racas
      .filter((r) => r.Especie.toLowerCase() !== especie.toLowerCase())
      .sort((a, b) => a.Raca.localeCompare(b.Raca));

    if (!q) {
      return {
        same: sameSpecies,
        others: otherSpecies,
      };
    }

    return {
      same: sameSpecies.filter((r) => r.Raca.toLowerCase().includes(q)),
      others: otherSpecies.filter((r) => r.Raca.toLowerCase().includes(q) || r.Especie.toLowerCase().includes(q)),
    };
  }, [racaSearchQuery, racas, especie]);

  // Create pet action
  const handleAddPet = (e: React.FormEvent) => {
    e.preventDefault();
    if (userPermissionLevel === 3) {
      showAlert("Acesso Restrito 🔒", "Nível de permissão 3 (Consulta e Pré-Venda) não autoriza agendamentos ou edições.");
      return;
    }
    if (!nome.trim() || !idCliente) return;

    const newPet: CadPets = {
      Id: `pet-${Date.now()}`,
      Nome: nome.trim(),
      Especie: especie,
      Raca: raca || "",
      Porte: porte,
      Sexo: sexo,
      IdCliente: idCliente,
      Ativo: true,
      
      // Novos campos clínicos / manejo
      Alergias_Restricoes: alergias.trim() || undefined,
      Condicao_Saude: condicaoSaude.trim() || undefined,
      Medicamento_Uso: medicamentoUso.trim() || undefined,
      Data_Vacina_Raiva: dataVacinaRaiva || undefined,
      Nivel_Agressiveness: nivelAgressiveness,
      Medos_Traumas: medosTraumas.trim() || undefined,
      Obs_Manejo: obsManejo.trim() || undefined,
      Tipo_Pelo: tipoPelo,
      EstStyle_Tosa_Preferido: estStyleTosa.trim() || undefined,
      Data_Nascimento: dataNascimento || undefined,
      Foto_Pet: fotoPet.trim() || undefined,
    };

    onUpdatePets([...pets, newPet]);

    const isOffline = !window.navigator.onLine;
    if (isOffline) {
      showAlert(
        "Cadastro Concluído (Offline)",
        termos.alertCadastroSucessoOffline(nome.trim())
      );
    } else {
      showAlert(
        "Cadastro Concluído",
        termos.alertCadastroSucessoOnline(nome.trim())
      );
    }

    // clean up form
    setNome("");
    setEspecie(termos.defaultEspecie);
    setRaca("");
    setRacaSearchQuery("");
    setPorte(termos.defaultPorte);
    setSexo(termos.defaultSexo);
    setIdCliente("");
    
    // clean up clinical states
    setAlergias("");
    setCondicaoSaude("");
    setMedicamentoUso("");
    setDataVacinaRaiva("");
    setNivelAgressiveness("Dócil");
    setMedosTraumas("");
    setObsManejo("");
    setTipoPelo("Curto");
    setEstStyleTosa("");
    setDataNascimento("");
    setFotoPet("");
    setAddActiveTab("basics");
    
    setShowAddModal(false);
    if (onClearPrefilledClientId) {
      onClearPrefilledClientId();
    }
  };

  const handleOpenEditModal = (p: CadPets) => {
    setEditingPetId(p.Id);
    setEditNome(p.Nome);
    setEditEspecie(p.Especie || termos.defaultEspecie);
    setEditRaca(p.Raca || "");
    const isKnown = MARCAS_AUTOMOTIVAS_PADRAO.includes(p.Raca || "") || customBrandsFromDb.includes(p.Raca || "");
    if (isAutomotivo && p.Raca && !isKnown) {
      setEditIsCustomBrand(true);
    } else {
      setEditIsCustomBrand(false);
    }
    setEditPorte(p.Porte || termos.defaultPorte);
    setEditSexo(p.Sexo || termos.defaultSexo);
    setEditIdCliente(p.IdCliente);
    
    setEditAlergias(p.Alergias_Restricoes || "");
    setEditCondicaoSaude(p.Condicao_Saude || "");
    setEditMedicamentoUso(p.Medicamento_Uso || "");
    setEditDataVacinaRaiva(p.Data_Vacina_Raiva || "");
    setEditNivelAgressiveness(p.Nivel_Agressiveness || "Dócil");
    setEditMedosTraumas(p.Medos_Traumas || "");
    setEditObsManejo(p.Obs_Manejo || "");
    setEditTipoPelo(p.Tipo_Pelo || "Curto");
    setEditEstStyleTosa(p.EstStyle_Tosa_Preferido || "");
    setEditDataNascimento(p.Data_Nascimento || "");
    setEditFotoPet(p.Foto_Pet || "");
    
    setEditActiveTab("basics");
    setShowEditModal(true);
  };

  const handleSaveEditPet = (e: React.FormEvent) => {
    e.preventDefault();
    if (userPermissionLevel === 3) {
      showAlert("Acesso Restrito 🔒", "Nível de permissão 3 (Consulta e Pré-Venda) não autoriza agendamentos ou edições.");
      return;
    }
    if (!editingPetId || !editNome.trim() || !editIdCliente) return;

    const originalPet = pets.find((p) => p.Id === editingPetId);
    if (originalPet && originalPet.Nome && originalPet.Nome.trim().toLowerCase() === "geral") {
      if (!isAdmin) {
        showAlert("Ação Não Permitida", `O registro 'Geral' é protegido e só pode ser alterado por um Administrador.`);
        return;
      }
    }

    const updated = pets.map((p) => {
      if (p.Id === editingPetId) {
        return {
          ...p,
          Nome: editNome.trim(),
          Especie: editEspecie,
          Raca: editRaca,
          Porte: editPorte,
          Sexo: editSexo,
          IdCliente: editIdCliente,
          
          Alergias_Restricoes: editAlergias.trim() || undefined,
          Condicao_Saude: editCondicaoSaude.trim() || undefined,
          Medicamento_Uso: editMedicamentoUso.trim() || undefined,
          Data_Vacina_Raiva: editDataVacinaRaiva || undefined,
          Nivel_Agressiveness: editNivelAgressiveness,
          Medos_Traumas: editMedosTraumas.trim() || undefined,
          Obs_Manejo: editObsManejo.trim() || undefined,
          Tipo_Pelo: editTipoPelo,
          EstStyle_Tosa_Preferido: editEstStyleTosa.trim() || undefined,
          Data_Nascimento: editDataNascimento || undefined,
          Foto_Pet: editFotoPet.trim() || undefined,
        };
      }
      return p;
    });

    onUpdatePets(updated);
    showAlert(
      termos.segmento === "petshop" ? "Pet Atualizado" : "Veículo Atualizado",
      termos.alertAtualizacaoSucesso(editNome.trim())
    );
    setShowEditModal(false);
    setEditingPetId(null);
  };

  // Inline changes
  const handleCellChange = (id: string, field: keyof CadPets, value: any) => {
    if (userPermissionLevel === 3) {
      showAlert("Acesso Restrito 🔒", "Nível de permissão 3 (Consulta e Pré-Venda) não autoriza agendamentos ou edições.");
      return;
    }
    const originalPet = pets.find((p) => p.Id === id);
    if (originalPet && originalPet.Nome && originalPet.Nome.trim().toLowerCase() === "geral") {
      if (!isAdmin) {
        showAlert("Ação Não Permitida", `O registro 'Geral' é protegido e só pode ser alterado por um Administrador.`);
        return;
      }
    }
    if (field === "Nome" && value && value.trim().toLowerCase() === "geral") {
      if (!isAdmin) {
        showAlert("Ação Não Permitida", "Você não pode definir o nome como 'Geral'.");
        return;
      }
    }

    const updated = pets.map((p) => {
      if (p.Id === id) {
        return { ...p, [field]: value };
      }
      return p;
    });
    onUpdatePets(updated);
  };

  const handleDeletePet = (id: string) => {
    if (userPermissionLevel === 3) {
      showAlert("Acesso Restrito 🔒", "Nível de permissão 3 (Consulta e Pré-Venda) não autoriza agendamentos ou edições.");
      return;
    }
    const originalPet = pets.find((p) => p.Id === id);
    if (originalPet && originalPet.Nome && originalPet.Nome.trim().toLowerCase() === "geral") {
      if (!isAdmin) {
        showAlert("Ação Não Permitida", `O registro 'Geral' é protegido e só pode ser arquivado/excluído por um Administrador.`);
        return;
      }
    }

    showConfirm(
      termos.confirmacaoArquivarTitulo,
      termos.confirmacaoArquivarMsg,
      () => {
        const updated = pets.map((p) =>
          p.Id === id ? { ...p, Ativo: false } : p
        );
        onUpdatePets(updated);
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
              {termos.iconeTipo === "car" ? (
                <Car className="h-4 w-4 text-emerald-600" />
              ) : termos.iconeTipo === "wrench" ? (
                <Wrench className="h-4 w-4 text-emerald-600" />
              ) : (
                <Bone className="h-4 w-4 text-emerald-600 animate-bounce" />
              )}
            </span>
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 font-mono">
              {termos.subtituloHeader}
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-800">
            {termos.tituloModulo}
          </h2>
        </div>

        {!isRestricted && (
          <button
            disabled={userPermissionLevel === 3}
            onClick={() => {
              if (userPermissionLevel === 3) return;
              if (sortedMyClientsList.length > 0) {
                setIdCliente(sortedMyClientsList[0].Id);
              }
              setShowAddModal(true);
            }}
            className={`inline-flex items-center gap-1.5 px-4.5 py-2 rounded-xl text-xs font-semibold transition-all transform ${
              userPermissionLevel === 3
                ? "bg-slate-300 text-slate-500 opacity-60 cursor-not-allowed border border-slate-400"
                : `shadow-xs hover:shadow active:scale-95 cursor-pointer ${activeTheme.primary}`
            }`}
            title={userPermissionLevel === 3 ? "Acesso Restrito: Nível 3 não pode cadastrar." : termos.botaoNovo}
          >
            <Plus className="h-4 w-4" />
            {termos.botaoNovo}
          </button>
        )}
      </div>

      {/* Grid Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in-down">
        
        {/* Search Input bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder={termos.placeholderBusca}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-600"
            />
          </div>

          <div className="text-xs text-slate-400 font-mono">
            Filtrados {filteredPets.length} de {myPets.length} {termos.contagemRegistros}
          </div>
        </div>

        {/* SpreadSheet Dense Table */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse table-fixed min-w-[950px]">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-mono text-[10px] uppercase font-semibold">
                <th className="w-44 p-2 border-r border-slate-200">{termos.colunaNome}</th>
                <th className="w-48 p-2 border-r border-slate-200">{termos.colunaDono}</th>
                <th className="w-32 p-2 border-r border-slate-200">{termos.colunaEspecie}</th>
                <th className="w-44 p-2 border-r border-slate-200">{termos.colunaRaca}</th>
                <th className="w-32 p-2 border-r border-slate-200">{termos.colunaPorte}</th>
                <th className="w-32 p-2 border-r border-slate-200">{termos.colunaSexo}</th>
                <th className="w-20 p-2 text-center border-r border-slate-200">{termos.colunaAtivo}</th>
                <th className="w-24 p-2 text-center">{termos.colunaAcoes}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-mono">
              {filteredPets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 bg-white font-sans text-xs">
                    {termos.tabelaVazia}
                  </td>
                </tr>
              ) : (
                filteredPets.map((p, idx) => {
                  const ownerObj = myClientsMap.get(p.IdCliente);
                  const ownerName = ownerObj ? ownerObj.Nome : "Desconhecido/Arquivado";

                  return (
                    <tr
                      key={p.Id}
                      className={`hover:bg-slate-50/80 transition-colors group ${
                        idx % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                      } ${!p.Ativo ? "opacity-60" : ""}`}
                    >
                      {(() => {
                        const isGeral = p.Nome?.trim().toLowerCase() === "geral";
                        const hasNoAdminEdit = isGeral && !isAdmin;
                        const isRowDisabled = hasNoAdminEdit || isRestricted;

                        return (
                          <>
                            {/* NOME EDIT */}
                            <td className="p-1 border-r border-slate-100 text-slate-400 bg-slate-50">
                              <div className="flex items-center gap-1.5 px-1.5">
                                <span className="text-amber-500 font-sans" title={termos.msgBloqueioNomeGeral}>🔒</span>
                                <input
                                  type="text"
                                  value={p.Nome}
                                  disabled={true}
                                  className="w-full bg-transparent border-0 py-1 focus:outline-none text-xs font-bold text-slate-400 cursor-not-allowed"
                                />
                              </div>
                            </td>

                            {/* CLIENT OWNER SELECT */}
                            <td className={`p-1 border-r border-slate-100 text-slate-700 font-medium ${isRowDisabled ? "bg-slate-50 text-slate-400 cursor-not-allowed" : ""}`}>
                              <select
                                value={p.IdCliente}
                                disabled={isRowDisabled}
                                onChange={(e) => handleCellChange(p.Id, "IdCliente", e.target.value)}
                                className="w-full bg-transparent border-0 p-1 focus:outline-none text-xs text-slate-700 font-mono disabled:opacity-75"
                              >
                                {sortedMyClientsList.map((cli) => (
                                  <option key={cli.Id} value={cli.Id}>
                                    {cli.Nome}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* ESPECIE SELECT */}
                            <td className={`p-1 border-r border-slate-100 text-slate-755 ${isRowDisabled ? "bg-slate-50 text-slate-400 cursor-not-allowed" : ""}`}>
                              <select
                                value={p.Especie}
                                disabled={isRowDisabled}
                                onChange={(e) => handleCellChange(p.Id, "Especie", e.target.value)}
                                className="w-full bg-transparent border-0 p-1 focus:outline-none text-xs text-slate-700 font-mono disabled:opacity-75 cursor-pointer"
                              >
                                {p.Especie === "_" && <option value="_">_</option>}
                                {isAutomotivo ? (
                                  <>
                                    <option value="Carro">🚗 Carro</option>
                                    <option value="Moto">🏍️ Moto</option>
                                    <option value="SUV">🚙 SUV</option>
                                    <option value="Caminhonete">🛻 Caminhonete</option>
                                    <option value="Van">🚐 Van</option>
                                    <option value="Outro">✨ Outro</option>
                                  </>
                                ) : (
                                  <>
                                    <option value="Cão">🐶 Cão</option>
                                    <option value="Gato">🐱 Gato</option>
                                    <option value="Ave">🦜 Ave</option>
                                    <option value="Roedor">🐹 Roedor</option>
                                    <option value="Outro">✨ Outro</option>
                                  </>
                                )}
                              </select>
                            </td>

                            {/* RAÇA / MARCA SELECT (SEARCHABLE POPUP) */}
                            <td className={`p-1 border-r border-slate-100 text-slate-755 ${isRowDisabled ? "bg-slate-50" : ""}`}>
                              {isRowDisabled ? (
                                <div className="p-1.5 text-xs text-slate-400 font-mono select-none">
                                  {isAutomotivo ? `🚗 ${p.Raca || "_"}` : `🏷️ ${p.Raca || "_"}`}
                                </div>
                              ) : (
                                <RacaCellSelect
                                  pet={p}
                                  racas={racas}
                                  disabled={isRowDisabled}
                                  isAutomotivo={isAutomotivo}
                                  marcasList={customBrandsFromDb}
                                  onSelectRaca={(racaName) => handleCellChange(p.Id, "Raca", racaName)}
                                />
                              )}
                            </td>

                            {/* PORTE SELECT */}
                            <td className={`p-1 border-r border-slate-100 text-slate-755 ${isRowDisabled ? "bg-slate-50 text-slate-400 cursor-not-allowed" : ""}`}>
                              <select
                                value={p.Porte}
                                disabled={isRowDisabled}
                                onChange={(e) => handleCellChange(p.Id, "Porte", e.target.value)}
                                className="w-full bg-transparent border-0 p-1 focus:outline-none text-xs text-slate-700 font-mono disabled:opacity-75 cursor-pointer"
                              >
                                {p.Porte === "_" && <option value="_">_</option>}
                                {isAutomotivo ? (
                                  <>
                                    <option value="Pequeno">Pequeno (Hatch / Moto)</option>
                                    <option value="Médio">Médio (Sedan)</option>
                                    <option value="Grande">Grande (SUV / Picape)</option>
                                    <option value="Gigante">Especial (Van / Utilitário)</option>
                                  </>
                                ) : (
                                  <>
                                    <option value="Mini">Mini (Micro)</option>
                                    <option value="Pequeno">Pequeno</option>
                                    <option value="Médio">Médio</option>
                                    <option value="Grande">Grande</option>
                                    <option value="Gigante">Gigante</option>
                                  </>
                                )}
                              </select>
                            </td>

                            {/* SEXO SELECT */}
                            <td className={`p-1 border-r border-slate-100 text-slate-755 ${isRowDisabled ? "bg-slate-50 text-slate-400 cursor-not-allowed" : ""}`}>
                              <select
                                value={p.Sexo}
                                disabled={isRowDisabled}
                                onChange={(e) => handleCellChange(p.Id, "Sexo", e.target.value)}
                                className="w-full bg-transparent border-0 p-1 focus:outline-none text-xs text-slate-700 font-mono disabled:opacity-75 cursor-pointer"
                              >
                                {p.Sexo === "_" && <option value="_">_</option>}
                                {isAutomotivo ? (
                                  <>
                                    <option value="Flex">⛽ Flex</option>
                                    <option value="Gasolina">⛽ Gasolina</option>
                                    <option value="Etanol">🌱 Etanol</option>
                                    <option value="Diesel">🚛 Diesel</option>
                                    <option value="Híbrido">🔋 Híbrido</option>
                                    <option value="Elétrico">⚡ Elétrico</option>
                                  </>
                                ) : (
                                  <>
                                    <option value="Macho">💙 Macho</option>
                                    <option value="Fêmea">💖 Fêmea</option>
                                  </>
                                )}
                              </select>
                            </td>

                            {/* ACTIVE CHECKBOX */}
                            <td className={`p-1 border-r border-slate-100 text-center ${isRowDisabled ? "bg-slate-50" : ""}`}>
                              <button
                                type="button"
                                disabled={isRowDisabled}
                                onClick={() => handleCellChange(p.Id, "Ativo", !p.Ativo)}
                                className={`inline-flex items-center justify-center p-1.5 rounded-lg transition ${isRowDisabled ? "cursor-not-allowed opacity-60" : "hover:bg-slate-100"}`}
                              >
                                {p.Ativo ? (
                                  <CheckSquare className="h-4.5 w-4.5 text-emerald-600" />
                                ) : (
                                  <Square className="h-4.5 w-4.5 text-slate-350" />
                                )}
                              </button>
                            </td>

                            {/* DELETE & EDIT CLINICAL ACTION */}
                            <td className={`p-1 text-center align-middle ${isRowDisabled ? "bg-slate-50" : ""}`}>
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (userPermissionLevel === 3) return;
                                    handleOpenEditModal(p);
                                  }}
                                  disabled={userPermissionLevel === 3}
                                  className={`p-1 rounded-lg transition ${
                                    userPermissionLevel === 3
                                      ? "text-slate-300 cursor-not-allowed opacity-50"
                                      : "text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 cursor-pointer"
                                  }`}
                                  title={userPermissionLevel === 3 ? "Acesso Restrito: Nível 3 não pode editar." : termos.tooltipEdit}
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>

                                {!isRestricted ? (
                                  <button
                                    type="button"
                                    disabled={isRowDisabled || userPermissionLevel === 3}
                                    onClick={() => {
                                      if (userPermissionLevel === 3) return;
                                      handleDeletePet(p.Id);
                                    }}
                                    className={`p-1 rounded-lg transition font-sans ${
                                      userPermissionLevel === 3
                                        ? "text-slate-350 cursor-not-allowed opacity-50 bg-slate-50 border border-slate-200"
                                        : isRowDisabled
                                        ? "text-slate-300 cursor-not-allowed"
                                        : "text-slate-400 hover:text-red-500 hover:bg-red-50 cursor-pointer"
                                    }`}
                                    title={
                                      userPermissionLevel === 3
                                        ? "Acesso Restrito: Nível 3 não pode desativar."
                                        : hasNoAdminEdit
                                        ? "Registro protegido (necessário ser administrador)"
                                        : termos.tooltipDelete
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-sans italic">Bloqueado</span>
                                )}
                              </div>
                            </td>
                          </>
                        );
                      })()}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info message */}
        <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-400 font-mono text-center">
          Cada alteração feita nas seleções acima (Porte, Espécie, Sexo, Dono) atualiza o banco local e sincroniza imediatamente com os subformulários da agenda.
        </div>
      </div>

      {/* Modal - Cadastrar Pet / Veículo */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 select-none">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-scale-up">
            
            <div className="bg-gradient-to-r from-emerald-600 to-indigo-600 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold font-display tracking-tight text-base flex items-center gap-2">
                  {termos.iconeTipo === "car" ? (
                    <Car className="h-4.5 w-4.5 text-emerald-100 animate-pulse" />
                  ) : termos.iconeTipo === "wrench" ? (
                    <Wrench className="h-4.5 w-4.5 text-emerald-100 animate-pulse" />
                  ) : (
                    <Bone className="h-4.5 w-4.5 text-emerald-100 animate-pulse" />
                  )}
                  {termos.tituloModalNovo}
                </h3>
                <p className="text-[10px] text-emerald-100 uppercase tracking-wider font-mono">
                  {termos.subtituloModalNovo}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-white hover:text-slate-150 text-sm font-semibold p-1 hover:bg-white/10 rounded-lg cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Segment Tab Controls */}
            <div className="px-6 pt-4">
              <div className="flex border border-slate-200/60 bg-slate-50 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAddActiveTab("basics")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    addActiveTab === "basics"
                      ? "bg-white text-emerald-800 shadow-xs border border-slate-200/40"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {termos.tabDadosBasicos}
                </button>
                <button
                  type="button"
                  onClick={() => setAddActiveTab("clinical")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    addActiveTab === "clinical"
                      ? "bg-white text-indigo-805 shadow-xs border border-slate-200/40"
                      : "text-slate-500 hover:text-indigo-605"
                  }`}
                >
                  {termos.tabFichaTecnica}
                </button>
              </div>
            </div>

            <form onSubmit={handleAddPet} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              
              {addActiveTab === "basics" && (
                <div className="space-y-4 animate-fade-in-down">
                  {/* Owner Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase font-mono tracking-wider">
                      {termos.labelDono}
                    </label>
                    {prefilledClientIdForNewPet ? (
                      <input
                        type="text"
                        disabled
                        value={clientes.find((c) => c.Id === idCliente)?.Nome || ""}
                        className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 text-sm font-semibold cursor-not-allowed"
                      />
                    ) : sortedMyClientsList.length === 0 ? (
                      <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl font-medium">
                        Nenhum cliente cadastrado ainda nesta conta comum! Cadastre um cliente na aba anterior antes.
                      </div>
                    ) : (
                      <InteractiveCombobox
                        items={clientComboboxItems}
                        value={idCliente}
                        onChange={(id) => {
                          setIdCliente(id);
                          const found = sortedMyClientsList.find((c) => c.Id === id);
                          if (found) {
                            setClientSearchQuery(found.Nome);
                          } else {
                            setClientSearchQuery("");
                          }
                        }}
                        placeholder={termos.placeholderDono}
                        required
                      />
                    )}
                  </div>

                  {/* Nome do Pet / Modelo do Veículo */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700 uppercase font-mono tracking-wider">
                        {termos.labelNome}
                      </label>
                      {isAutomotivo && (
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono font-medium">
                          Campo Livre (Agilidade)
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder={termos.placeholderNome}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-sans font-medium transition"
                    />
                    {isAutomotivo && (
                      <p className="mt-1 text-[11px] text-slate-400">
                        Digite o modelo exato do veículo (ex: Uno, Corolla, Onix, Civic, Renegade, Gol).
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    {/* Espécie */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase font-mono tracking-wider">
                        {termos.labelEspecie}
                      </label>
                      <InteractiveCombobox
                        items={especieComboboxItems}
                        value={especie}
                        onChange={(val) => {
                          setEspecie(val);
                          setRaca("");
                          setRacaSearchQuery("");
                        }}
                        placeholder={termos.placeholderEspecie}
                        required
                      />
                    </div>

                    {/* Sexo */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase font-mono tracking-wider">
                        {termos.labelSexo}
                      </label>
                      <InteractiveCombobox
                        items={sexoComboboxItems}
                        value={sexo}
                        onChange={(val) => setSexo(val)}
                        placeholder={termos.placeholderSexo}
                        required
                      />
                    </div>
                  </div>

                  {/* Raça / Marca e Montadora */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700 uppercase font-mono tracking-wider">
                        {termos.labelRaca}
                      </label>
                      {isAutomotivo && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          Seletor de Marcas Principais
                        </span>
                      )}
                    </div>

                    {isAutomotivo ? (
                      <div className="space-y-2">
                        <select
                          value={isCustomBrand ? "__custom__" : raca}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "__custom__") {
                              setIsCustomBrand(true);
                              setRaca("");
                            } else {
                              setIsCustomBrand(false);
                              setRaca(val);
                            }
                          }}
                          required={!isCustomBrand}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition cursor-pointer"
                        >
                          <option value="" disabled>-- Selecione a Marca / Montadora --</option>
                          <optgroup label="⭐ Principais Montadoras">
                            <option value="Fiat">Fiat</option>
                            <option value="Chevrolet">Chevrolet (GM)</option>
                            <option value="Volkswagen">Volkswagen (VW)</option>
                            <option value="Ford">Ford</option>
                            <option value="Toyota">Toyota</option>
                            <option value="Honda">Honda</option>
                            <option value="Hyundai">Hyundai</option>
                            <option value="Renault">Renault</option>
                            <option value="Jeep">Jeep</option>
                            <option value="Nissan">Nissan</option>
                          </optgroup>
                          <optgroup label="🚗 Outras Marcas Populares & Elétricas">
                            <option value="BYD">BYD</option>
                            <option value="Caoa Chery">Caoa Chery</option>
                            <option value="Peugeot">Peugeot</option>
                            <option value="Citroën">Citroën</option>
                            <option value="Mitsubishi">Mitsubishi</option>
                          </optgroup>
                          <optgroup label="👑 Marcas Premium">
                            <option value="BMW">BMW</option>
                            <option value="Mercedes-Benz">Mercedes-Benz</option>
                            <option value="Audi">Audi</option>
                            <option value="Volvo">Volvo</option>
                            <option value="Land Rover">Land Rover</option>
                            <option value="Porsche">Porsche</option>
                          </optgroup>
                          <optgroup label="🏍️ Motos">
                            <option value="Honda Motos">Honda Motos</option>
                            <option value="Yamaha">Yamaha</option>
                            <option value="BMW Motorrad">BMW Motorrad</option>
                          </optgroup>
                          {customBrandsFromDb.length > 0 && (
                            <optgroup label="🏷️ Marcas Personalizadas Cadastradas">
                              {customBrandsFromDb.map((b) => (
                                <option key={b} value={b}>{b}</option>
                              ))}
                            </optgroup>
                          )}
                          <option value="__custom__">➕ Outra Marca (Digitar livremente)...</option>
                        </select>

                        {isCustomBrand && (
                          <div className="flex items-center gap-2 p-2 bg-emerald-50/60 border border-emerald-200 rounded-xl animate-fade-in-down">
                            <input
                              type="text"
                              autoFocus
                              required
                              value={raca}
                              onChange={(e) => setRaca(e.target.value)}
                              placeholder="Digite o nome da montadora ou marca..."
                              className="flex-1 px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setIsCustomBrand(false);
                                setRaca("Fiat");
                              }}
                              className="px-2.5 py-1.5 bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-medium cursor-pointer"
                            >
                              Voltar à lista
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <InteractiveCombobox
                        items={racaComboboxItems}
                        value={raca}
                        onChange={(val) => {
                          setRaca(val);
                          setRacaSearchQuery(val);
                        }}
                        placeholder={termos.placeholderRaca}
                        required
                      />
                    )}
                  </div>

                  {/* Porte */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase font-mono tracking-wider">
                      {termos.labelPorte}
                    </label>
                    <InteractiveCombobox
                      items={porteComboboxItems}
                      value={porte}
                      onChange={(val) => setPorte(val)}
                      placeholder={termos.placeholderPorte}
                      dropUp
                      required
                    />
                  </div>
                </div>
              )}

              {addActiveTab === "clinical" && (
                <div className="animate-fade-in-down text-slate-700">
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl mb-4 flex items-start gap-2.5">
                    <span className="text-xl">
                      {termos.iconeTipo === "car" ? "🚗" : termos.iconeTipo === "wrench" ? "🔧" : "🩺"}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-indigo-900">
                        {termos.headerFicha}
                      </h4>
                      <p className="text-[10px] text-indigo-750">
                        {termos.headerFichaDesc}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Coluna 1 */}
                    <div className="space-y-3.5">
                      {/* Foto do Pet */}
                      {isMasterAdmin && (
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">
                            {termos.labelFoto}
                          </label>
                          <div className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={fotoPet}
                              onChange={(e) => setFotoPet(e.target.value)}
                              placeholder={termos.placeholderFoto}
                              className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (fotoPet.trim()) {
                                  setPopupPhotoUrl(fotoPet.trim());
                                  setShowPhotoPopup(true);
                                }
                              }}
                              disabled={!fotoPet.trim()}
                              title="Visualizar e copiar foto"
                              className={`p-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer h-8 w-8 shrink-0 ${
                                fotoPet.trim()
                                  ? "bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600 active:scale-95 hover:shadow-xs"
                                  : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-50"
                              }`}
                            >
                              <ArrowRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Datas */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">
                            {termos.labelDataNasc}
                          </label>
                          <input
                            type={termos.tipoInputDataNasc}
                            value={dataNascimento}
                            onChange={(e) => setDataNascimento(e.target.value)}
                            placeholder={termos.placeholderDataNasc}
                            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">
                            {termos.labelUltimaManutencao}
                          </label>
                          <input
                            type="date"
                            value={dataVacinaRaiva}
                            onChange={(e) => setDataVacinaRaiva(e.target.value)}
                            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
                          />
                        </div>
                      </div>

                      {/* Agressiveness and Tipo Pelo */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">
                            {termos.labelNivelSujeiraCuidado}
                          </label>
                          <select
                            value={nivelAgressiveness}
                            onChange={(e) => setNivelAgressiveness(e.target.value as any)}
                            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
                          >
                            {termos.opcoesNivel.map((op) => (
                              <option key={op.value} value={op.value}>
                                {op.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">
                            {termos.labelTipoPinturaPelo}
                          </label>
                          <select
                            value={tipoPelo}
                            onChange={(e) => setTipoPelo(e.target.value as any)}
                            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
                          >
                            {termos.opcoesTipoPinturaPelo.map((op) => (
                              <option key={op.value} value={op.value}>
                                {op.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Estilo/Tosa Preferido */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">
                          {termos.labelServicoPreferencia}
                        </label>
                        <input
                          type="text"
                          value={estStyleTosa}
                          onChange={(e) => setEstStyleTosa(e.target.value)}
                          placeholder={termos.placeholderServicoPreferencia}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
                        />
                      </div>
                    </div>

                    {/* Coluna 2 */}
                    <div className="space-y-3.5">
                      {/* Condicao Saude */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 font-mono">
                          {termos.labelAvariasLataria}
                        </label>
                        <textarea
                          rows={2}
                          value={condicaoSaude}
                          onChange={(e) => setCondicaoSaude(e.target.value)}
                          placeholder={termos.placeholderAvariasLataria}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/15 font-sans"
                        />
                      </div>

                      {/* Medicamento Uso */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 font-mono">
                          {termos.labelObjetosInterior}
                        </label>
                        <textarea
                          rows={2}
                          value={medicamentoUso}
                          onChange={(e) => setMedicamentoUso(e.target.value)}
                          placeholder={termos.placeholderObjetosInterior}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/15 font-sans"
                        />
                      </div>

                      {/* Alergias */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 font-mono">
                          {termos.labelRestricoesQuimicas}
                        </label>
                        <textarea
                          rows={2}
                          value={alergias}
                          onChange={(e) => setAlergias(e.target.value)}
                          placeholder={termos.placeholderRestricoesQuimicas}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/15 font-sans"
                        />
                      </div>

                      {/* Medos e Traumas */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 font-mono">
                          {termos.labelPontosAtencao}
                        </label>
                        <textarea
                          rows={1}
                          value={medosTraumas}
                          onChange={(e) => setMedosTraumas(e.target.value)}
                          placeholder={termos.placeholderPontosAtencao}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/15 font-sans"
                        />
                      </div>

                      {/* Observações de Manejo */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 font-mono">
                          {termos.labelObsVeiculo}
                        </label>
                        <textarea
                          rows={1}
                          value={obsManejo}
                          onChange={(e) => setObsManejo(e.target.value)}
                          placeholder={termos.placeholderObsVeiculo}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/15 font-sans"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 font-sans text-xs">
                <div>
                  {addActiveTab === "basics" ? (
                    <button
                      type="button"
                      onClick={() => setAddActiveTab("clinical")}
                      className="px-4 py-2 hover:bg-slate-50 text-indigo-650 font-bold rounded-xl border border-indigo-200/50 cursor-pointer"
                    >
                      {termos.botaoIrFichaTecnica}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAddActiveTab("basics")}
                      className="px-4 py-2 hover:bg-slate-50 text-slate-600 font-semibold rounded-xl border border-slate-200/50 cursor-pointer"
                    >
                      {termos.botaoVoltarBasicos}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={sortedMyClientsList.length === 0}
                    className={`px-4.5 py-2 font-semibold rounded-xl text-white shadow-xs ${
                      sortedMyClientsList.length > 0
                        ? "bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
                        : "bg-emerald-300 cursor-not-allowed"
                    }`}
                  >
                    {termos.botaoCadastrar}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal - Editar / Ficha de Pet ou Veículo */}
      {showEditModal && editingPetId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 select-none">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-scale-up">
            
            <div className="bg-gradient-to-r from-emerald-600 to-indigo-600 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold font-display tracking-tight text-base flex items-center gap-2">
                  <ClipboardList className="h-4.5 w-4.5 text-emerald-100 animate-pulse" />
                  {termos.tituloModalEditar(editNome)}
                </h3>
                <p className="text-[10px] text-emerald-100 uppercase tracking-wider font-mono">
                  {termos.subtituloModalEditar}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingPetId(null);
                }}
                className="text-white hover:text-slate-150 text-sm font-semibold p-1 hover:bg-white/10 rounded-lg cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Segment Tab Controls */}
            <div className="px-6 pt-4">
              <div className="flex border border-slate-200/60 bg-slate-50 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setEditActiveTab("basics")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    editActiveTab === "basics"
                      ? "bg-white text-emerald-800 shadow-xs border border-slate-200/40"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {termos.tabDadosBasicos}
                </button>
                <button
                  type="button"
                  onClick={() => setEditActiveTab("clinical")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    editActiveTab === "clinical"
                      ? "bg-white text-indigo-805 shadow-xs border border-slate-200/40"
                      : "text-slate-500 hover:text-indigo-605"
                  }`}
                >
                  {termos.tabFichaTecnica}
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveEditPet} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              
              {editActiveTab === "basics" && (
                <div className="space-y-4 animate-fade-in-down">
                  {/* Owner Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase font-mono tracking-wider">
                      {termos.labelDono}
                    </label>
                    <InteractiveCombobox
                      items={clientComboboxItems}
                      value={editIdCliente}
                      onChange={(id) => setEditIdCliente(id)}
                      placeholder={termos.placeholderDono}
                      required
                    />
                  </div>

                  {/* Nome do Pet / Modelo do Veículo */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700 uppercase font-mono tracking-wider">
                        {termos.labelNome}
                      </label>
                      {isAutomotivo && (
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono font-medium">
                          Campo Livre (Agilidade)
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      value={editNome}
                      onChange={(e) => setEditNome(e.target.value)}
                      placeholder={termos.placeholderNome}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-sans font-medium transition"
                    />
                    {isAutomotivo && (
                      <p className="mt-1 text-[11px] text-slate-400">
                        Digite o modelo exato do veículo (ex: Uno, Corolla, Onix, Civic, Renegade, Gol).
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    {/* Espécie */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase font-mono tracking-wider">
                        {termos.labelEspecie}
                      </label>
                      <InteractiveCombobox
                        items={especieComboboxItems}
                        value={editEspecie}
                        onChange={(val) => {
                          setEditEspecie(val);
                          setEditRaca("");
                        }}
                        placeholder={termos.placeholderEspecie}
                        required
                      />
                    </div>

                    {/* Sexo */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase font-mono tracking-wider">
                        {termos.labelSexo}
                      </label>
                      <InteractiveCombobox
                        items={sexoComboboxItems}
                        value={editSexo}
                        onChange={(val) => setEditSexo(val)}
                        placeholder={termos.placeholderSexo}
                        required
                      />
                    </div>
                  </div>

                  {/* Raça / Marca e Montadora */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700 uppercase font-mono tracking-wider">
                        {termos.labelRaca}
                      </label>
                      {isAutomotivo && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          Seletor de Marcas Principais
                        </span>
                      )}
                    </div>

                    {isAutomotivo ? (
                      <div className="space-y-2">
                        <select
                          value={editIsCustomBrand ? "__custom__" : editRaca}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "__custom__") {
                              setEditIsCustomBrand(true);
                              setEditRaca("");
                            } else {
                              setEditIsCustomBrand(false);
                              setEditRaca(val);
                            }
                          }}
                          required={!editIsCustomBrand}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition cursor-pointer"
                        >
                          <option value="" disabled>-- Selecione a Marca / Montadora --</option>
                          <optgroup label="⭐ Principais Montadoras">
                            <option value="Fiat">Fiat</option>
                            <option value="Chevrolet">Chevrolet (GM)</option>
                            <option value="Volkswagen">Volkswagen (VW)</option>
                            <option value="Ford">Ford</option>
                            <option value="Toyota">Toyota</option>
                            <option value="Honda">Honda</option>
                            <option value="Hyundai">Hyundai</option>
                            <option value="Renault">Renault</option>
                            <option value="Jeep">Jeep</option>
                            <option value="Nissan">Nissan</option>
                          </optgroup>
                          <optgroup label="🚗 Outras Marcas Populares & Elétricas">
                            <option value="BYD">BYD</option>
                            <option value="Caoa Chery">Caoa Chery</option>
                            <option value="Peugeot">Peugeot</option>
                            <option value="Citroën">Citroën</option>
                            <option value="Mitsubishi">Mitsubishi</option>
                          </optgroup>
                          <optgroup label="👑 Marcas Premium">
                            <option value="BMW">BMW</option>
                            <option value="Mercedes-Benz">Mercedes-Benz</option>
                            <option value="Audi">Audi</option>
                            <option value="Volvo">Volvo</option>
                            <option value="Land Rover">Land Rover</option>
                            <option value="Porsche">Porsche</option>
                          </optgroup>
                          <optgroup label="🏍️ Motos">
                            <option value="Honda Motos">Honda Motos</option>
                            <option value="Yamaha">Yamaha</option>
                            <option value="BMW Motorrad">BMW Motorrad</option>
                          </optgroup>
                          {customBrandsFromDb.length > 0 && (
                            <optgroup label="🏷️ Marcas Personalizadas Cadastradas">
                              {customBrandsFromDb.map((b) => (
                                <option key={b} value={b}>{b}</option>
                              ))}
                            </optgroup>
                          )}
                          <option value="__custom__">➕ Outra Marca (Digitar livremente)...</option>
                        </select>

                        {editIsCustomBrand && (
                          <div className="flex items-center gap-2 p-2 bg-emerald-50/60 border border-emerald-200 rounded-xl animate-fade-in-down">
                            <input
                              type="text"
                              autoFocus
                              required
                              value={editRaca}
                              onChange={(e) => setEditRaca(e.target.value)}
                              placeholder="Digite o nome da montadora ou marca..."
                              className="flex-1 px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setEditIsCustomBrand(false);
                                setEditRaca("Fiat");
                              }}
                              className="px-2.5 py-1.5 bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-medium cursor-pointer"
                            >
                              Voltar à lista
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <InteractiveCombobox
                        items={editRacaComboboxItems}
                        value={editRaca}
                        onChange={(val) => setEditRaca(val)}
                        placeholder={termos.placeholderRaca}
                        required
                      />
                    )}
                  </div>

                  {/* Porte */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase font-mono tracking-wider">
                      {termos.labelPorte}
                    </label>
                    <InteractiveCombobox
                      items={porteComboboxItems}
                      value={editPorte}
                      onChange={(val) => setEditPorte(val)}
                      placeholder={termos.placeholderPorte}
                      dropUp
                      required
                    />
                  </div>
                </div>
              )}

              {editActiveTab === "clinical" && (
                <div className="animate-fade-in-down text-slate-700">
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl mb-4 flex items-start gap-2.5">
                    <span className="text-xl">
                      {termos.iconeTipo === "car" ? "🚗" : termos.iconeTipo === "wrench" ? "🔧" : "🩺"}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-indigo-900">
                        {termos.headerFicha}
                      </h4>
                      <p className="text-[10px] text-indigo-750">
                        {termos.headerFichaDesc}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Coluna 1 */}
                    <div className="space-y-3.5">
                      {/* Foto do Pet */}
                      {isMasterAdmin && (
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">
                            {termos.labelFoto}
                          </label>
                          <div className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={editFotoPet}
                              onChange={(e) => setEditFotoPet(e.target.value)}
                              placeholder={termos.placeholderFoto}
                              className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (editFotoPet.trim()) {
                                  setPopupPhotoUrl(editFotoPet.trim());
                                  setShowPhotoPopup(true);
                                }
                              }}
                              disabled={!editFotoPet.trim()}
                              title="Visualizar e copiar foto"
                              className={`p-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer h-8 w-8 shrink-0 ${
                                editFotoPet.trim()
                                  ? "bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600 active:scale-95 hover:shadow-xs"
                                  : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-50"
                              }`}
                            >
                              <ArrowRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Datas */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">
                            {termos.labelDataNasc}
                          </label>
                          <input
                            type={termos.tipoInputDataNasc}
                            value={editDataNascimento}
                            onChange={(e) => setEditDataNascimento(e.target.value)}
                            placeholder={termos.placeholderDataNasc}
                            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">
                            {termos.labelUltimaManutencao}
                          </label>
                          <input
                            type="date"
                            value={editDataVacinaRaiva}
                            onChange={(e) => setEditDataVacinaRaiva(e.target.value)}
                            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
                          />
                        </div>
                      </div>

                      {/* Agressiveness and Tipo Pelo */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">
                            {termos.labelNivelSujeiraCuidado}
                          </label>
                          <select
                            value={editNivelAgressiveness}
                            onChange={(e) => setEditNivelAgressiveness(e.target.value as any)}
                            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
                          >
                            {termos.opcoesNivel.map((op) => (
                              <option key={op.value} value={op.value}>
                                {op.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">
                            {termos.labelTipoPinturaPelo}
                          </label>
                          <select
                            value={editTipoPelo}
                            onChange={(e) => setEditTipoPelo(e.target.value as any)}
                            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
                          >
                            {termos.opcoesTipoPinturaPelo.map((op) => (
                              <option key={op.value} value={op.value}>
                                {op.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Estilo/Tosa Preferido */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">
                          {termos.labelServicoPreferencia}
                        </label>
                        <input
                          type="text"
                          value={editEstStyleTosa}
                          onChange={(e) => setEditEstStyleTosa(e.target.value)}
                          placeholder={termos.placeholderServicoPreferencia}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
                        />
                      </div>
                    </div>

                    {/* Coluna 2 */}
                    <div className="space-y-3.5">
                      {/* Condicao Saude */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 font-mono">
                          {termos.labelAvariasLataria}
                        </label>
                        <textarea
                          rows={2}
                          value={editCondicaoSaude}
                          onChange={(e) => setEditCondicaoSaude(e.target.value)}
                          placeholder={termos.placeholderAvariasLataria}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/15 font-sans"
                        />
                      </div>

                      {/* Medicamento Uso */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 font-mono">
                          {termos.labelObjetosInterior}
                        </label>
                        <textarea
                          rows={2}
                          value={editMedicamentoUso}
                          onChange={(e) => setEditMedicamentoUso(e.target.value)}
                          placeholder={termos.placeholderObjetosInterior}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
                        />
                      </div>

                      {/* Alergias */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 font-mono">
                          {termos.labelRestricoesQuimicas}
                        </label>
                        <textarea
                          rows={2}
                          value={editAlergias}
                          onChange={(e) => setEditAlergias(e.target.value)}
                          placeholder={termos.placeholderRestricoesQuimicas}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
                        />
                      </div>

                      {/* Medos e Traumas */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 font-mono">
                          {termos.labelPontosAtencao}
                        </label>
                        <textarea
                          rows={1}
                          value={editMedosTraumas}
                          onChange={(e) => setEditMedosTraumas(e.target.value)}
                          placeholder={termos.placeholderPontosAtencao}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/15 font-sans"
                        />
                      </div>

                      {/* Observações de Manejo */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 font-mono">
                          {termos.labelObsVeiculo}
                        </label>
                        <textarea
                          rows={1}
                          value={editObsManejo}
                          onChange={(e) => setEditObsManejo(e.target.value)}
                          placeholder={termos.placeholderObsVeiculo}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/15 font-sans"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 font-sans text-xs">
                <div>
                  {editActiveTab === "basics" ? (
                    <button
                      type="button"
                      onClick={() => setEditActiveTab("clinical")}
                      className="px-4 py-2 hover:bg-slate-50 text-indigo-650 font-bold rounded-xl border border-indigo-200/50 cursor-pointer"
                    >
                      {termos.botaoIrFichaTecnica}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditActiveTab("basics")}
                      className="px-4 py-2 hover:bg-slate-50 text-slate-600 font-semibold rounded-xl border border-slate-200/50 cursor-pointer"
                    >
                      {termos.botaoVoltarBasicos}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingPetId(null);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4.5 py-2 font-semibold rounded-xl text-white shadow-xs bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
                  >
                    {termos.botaoSalvar}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Pop-up Interno - Visualizar e Copiar Foto */}
      {showPhotoPopup && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 select-none animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-scale-up p-5 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 font-sans">
                <span className="text-emerald-500">📸</span> {termos.modalFotoTitulo}
              </h4>
              <button
                type="button"
                onClick={() => {
                  setShowPhotoPopup(false);
                  setCopyStatus("idle");
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl overflow-hidden border border-slate-150 flex items-center justify-center max-h-72 min-h-40 relative">
              <img
                src={popupPhotoUrl}
                alt="Foto do Pet"
                referrerPolicy="no-referrer"
                className="max-h-72 max-w-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=200&auto=format&fit=crop"; // elegant dog placeholder
                }}
              />
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleCopyImageToClipboard(popupPhotoUrl)}
                className={`w-full py-2 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  copyStatus === "loading"
                    ? "bg-slate-100 text-slate-500 cursor-not-allowed"
                    : copyStatus === "success"
                    ? "bg-emerald-500 text-white shadow-xs"
                    : copyStatus === "cors_fallback"
                    ? "bg-amber-500 text-white shadow-xs"
                    : copyStatus === "error"
                    ? "bg-rose-500 text-white shadow-xs"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-[1.02] active:scale-[0.98] shadow-xs"
                }`}
              >
                {copyStatus === "loading" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Copiando imagem...
                  </>
                ) : copyStatus === "success" ? (
                  <>
                    <Check className="h-4 w-4" />
                    Imagem copiada!
                  </>
                ) : copyStatus === "cors_fallback" ? (
                  <>
                    <Check className="h-4 w-4" />
                    Link copiado (CORS)!
                  </>
                ) : copyStatus === "error" ? (
                  <>
                    Erro ao copiar
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar Imagem
                  </>
                )}
              </button>

              {copyStatus === "cors_fallback" && (
                <p className="text-[10px] text-amber-700 text-center leading-relaxed mt-1 animate-fade-in font-medium px-1">
                  ⚠️ O site de origem da imagem impede a cópia do arquivo de imagem direto devido às diretrizes de segurança do seu navegador (CORS). Mas não se preocupe! Copiamos o <strong>link direto</strong> para você usar.
                </p>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowPhotoPopup(false);
                  setCopyStatus("idle");
                }}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer text-center"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
