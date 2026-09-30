/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { CadCliente, ThemeColor, CadPets } from "../types";
import { Plus, UserPlus, Trash2, Search, CheckSquare, Square, Filter, Users, MessageSquare, Clipboard, User, FileText, MapPin, CreditCard, Calendar, DollarSign, Pencil, Bone, Car, Wrench } from "lucide-react";
import { formatPhone } from "../utils/masks";
import { getTermos } from "../data/dicionarioTermos";

interface ClientsProps {
  clientes: CadCliente[];
  pets: CadPets[];
  activeTheme: ThemeColor;
  currentUserOwnerId: string;
  isAdminViewAll?: boolean;
  segmento?: string;
  onUpdateClientes: (updated: CadCliente[]) => void;
  showConfirm: (title: string, msg: string, onConfirm: () => void) => void;
  showAlert: (title: string, msg: string) => void;
  isRestricted?: boolean;
  userPermissionLevel?: number;
  onAddPetForClient?: (clientId: string) => void;
}

export default function ClientsSheet({
  clientes,
  pets = [],
  activeTheme,
  currentUserOwnerId,
  isAdminViewAll = false,
  segmento = "petshop",
  onUpdateClientes,
  showConfirm,
  showAlert,
  isRestricted = false,
  userPermissionLevel = 1,
  onAddPetForClient,
}: ClientsProps) {
  const termos = useMemo(() => getTermos(segmento), [segmento]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // New Client Form temporary state
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [dadosBrutos, setDadosBrutos] = useState("");

  // NOVAS ABAS DE NAVEGAÇÃO E CAMPOS DO FORMULÁRIO (ABA 2, 3, 4)
  const [activeTab, setActiveTab] = useState<"principal" | "fiscal" | "endereco" | "historico">("principal");
  
  // Aba 2: Dados Fiscais
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [rgIe, setRgIe] = useState("");
  const [email, setEmail] = useState("");

  // Aba 3: Endereço Detalhado
  const [rua, setRua] = useState("");
  const [cep, setCep] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");

  // Aba 4: Histórico e Crédito
  const [dataNascimento, setDataNascimento] = useState("");
  const [dataCadastro, setDataCadastro] = useState(() => new Date().toISOString().split("T")[0]);
  const [limiteCredito, setLimiteCredito] = useState("");
  const [saldoDevedor, setSaldoDevedor] = useState("");

  // Edit Client Form State
  const [editingClient, setEditingClient] = useState<CadCliente | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editTelefone, setEditTelefone] = useState("");
  const [editActiveTab, setEditActiveTab] = useState<"principal" | "fiscal" | "endereco" | "historico">("principal");
  
  // Aba 2: Dados Fiscais (Edit)
  const [editCpfCnpj, setEditCpfCnpj] = useState("");
  const [editRgIe, setEditRgIe] = useState("");
  const [editEmail, setEditEmail] = useState("");

  // Aba 3: Endereço Detalhado (Edit)
  const [editRua, setEditRua] = useState("");
  const [editCep, setEditCep] = useState("");
  const [editNumero, setEditNumero] = useState("");
  const [editComplemento, setEditComplemento] = useState("");
  const [editBairro, setEditBairro] = useState("");
  const [editCidade, setEditCidade] = useState("");
  const [editEstado, setEditEstado] = useState("");

  // Aba 4: Histórico e Crédito (Edit)
  const [editDataNascimento, setEditDataNascimento] = useState("");
  const [editDataCadastro, setEditDataCadastro] = useState("");
  const [editLimiteCredito, setEditLimiteCredito] = useState("");
  const [editSaldoDevedor, setEditSaldoDevedor] = useState("");

  const handleStartEdit = (client: CadCliente) => {
    setEditingClient(client);
    setEditNome(client.Nome || "");
    setEditTelefone(client.Telefone || "");
    setEditActiveTab("principal");
    setEditCpfCnpj(client.CpfCnpj || "");
    setEditRgIe(client.RgIe || "");
    setEditEmail(client.Email || "");

    const legacyFreeform = !client.Cep && !client.Numero && !client.Bairro && !client.Cidade && client.Endereco && client.Endereco !== "Sem Endereço cadastrado";
    
    if (legacyFreeform) {
      setEditRua(client.Endereco);
      setEditCep("");
      setEditNumero("");
      setEditComplemento("");
      setEditBairro("");
      setEditCidade("");
      setEditEstado("");
    } else {
      // Load structured address fields
      let streetName = "";
      if (client.Endereco && client.Endereco !== "Sem Endereço cadastrado") {
        const parts = client.Endereco.split(",");
        if (parts.length > 0) {
          streetName = parts[0].trim();
        }
      }
      setEditRua(streetName);
      setEditCep(client.Cep || "");
      setEditNumero(client.Numero || "");
      setEditComplemento(client.Complemento || "");
      setEditBairro(client.Bairro || "");
      setEditCidade(client.Cidade || "");
      setEditEstado(client.Estado || "");
    }

    setEditDataNascimento(client.DataNascimento || "");
    setEditDataCadastro(client.DataCadastro || new Date().toISOString().split("T")[0]);
    setEditLimiteCredito(client.LimiteCredito !== undefined ? client.LimiteCredito.toString() : "");
    setEditSaldoDevedor(client.SaldoDevedor !== undefined ? client.SaldoDevedor.toString() : "");
  };

  const handleSaveEditClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (userPermissionLevel === 3) {
      showAlert("Acesso Restrito 🔒", "Nível de permissão 3 (Consulta e Pré-Venda) não autoriza agendamentos ou edições.");
      return;
    }
    if (!editingClient) return;
    if (!editNome.trim()) return;

    // Geração do Endereço Completo de forma inteligente para preservar retrocompatibilidade
    let endCalculado = "";
    if (editRua.trim() || editCep.trim() || editBairro.trim() || editCidade.trim()) {
      const parts = [];
      if (editRua.trim()) parts.push(editRua.trim());
      if (editNumero.trim()) parts.push(`Nº ${editNumero.trim()}`);
      if (editComplemento.trim()) parts.push(editComplemento.trim());
      if (editBairro.trim()) parts.push(`Bairro ${editBairro.trim()}`);
      if (editCidade.trim()) {
        if (editEstado.trim()) {
          parts.push(`${editCidade.trim()}/${editEstado.trim().toUpperCase()}`);
        } else {
          parts.push(editCidade.trim());
        }
      } else if (editEstado.trim()) {
        parts.push(editEstado.trim().toUpperCase());
      }
      if (editCep.trim()) parts.push(`CEP ${editCep.trim()}`);
      endCalculado = parts.join(", ");
    } else {
      endCalculado = "Sem Endereço cadastrado";
    }

    const updatedClient: CadCliente = {
      ...editingClient,
      Nome: editNome.trim(),
      Telefone: editTelefone.trim() || "(00) 00000-0000",
      Endereco: endCalculado,
      CpfCnpj: editCpfCnpj.trim() || undefined,
      RgIe: editRgIe.trim() || undefined,
      Email: editEmail.trim() || undefined,
      Cep: editCep.trim() || undefined,
      Numero: editNumero.trim() || undefined,
      Complemento: editComplemento.trim() || undefined,
      Bairro: editBairro.trim() || undefined,
      Cidade: editCidade.trim() || undefined,
      Estado: editEstado.trim() || undefined,
      DataNascimento: editDataNascimento.trim() || undefined,
      DataCadastro: editDataCadastro.trim() || undefined,
      LimiteCredito: editLimiteCredito ? parseFloat(editLimiteCredito) : undefined,
      SaldoDevedor: editSaldoDevedor ? parseFloat(editSaldoDevedor) : undefined,
    };

    const updated = clientes.map((c) =>
      c.Id === editingClient.Id ? updatedClient : c
    );

    onUpdateClientes(updated);
    
    const isOffline = !window.navigator.onLine;
    if (isOffline) {
      showAlert(
        "Alteração Salva",
        `O cliente "${editNome.trim()}" foi atualizado localmente com sucesso!`
      );
    } else {
      showAlert(
        "Alteração Salva",
        `O cliente "${editNome.trim()}" foi atualizado e sincronizado com total segurança!`
      );
    }

    setEditingClient(null);
  };

  const handleExtractWhatsApp = (rawVal: string) => {
    setDadosBrutos(rawVal);
    if (!rawVal.trim()) return;

    // Simulate SAP Build Apps Fórmulas:
    // Nome: TRIM(REPLACE_REGS(pageVars.dadosBrutos, "([0-9:\\-+()（）\n\r]).*", ""))
    const nameMatch = rawVal.replace(/([0-9:\-+()（）\n\r]).*/s, "").trim();

    // Telefone: IF(STARTS_WITH(REPLACE_REGS(pageVars.dadosBrutos, "[^0-9]", ""), "55"), SUBSTRING(REPLACE_REGS(pageVars.dadosBrutos, "[^0-9]", ""), 2), REPLACE_REGS(pageVars.dadosBrutos, "[^0-9]", ""))
    const digits = rawVal.replace(/[^0-9]/g, "");
    const cleanedPhone = digits.startsWith("55") ? digits.substring(2) : digits;

    if (nameMatch) {
      setNome(nameMatch);
    }
    if (cleanedPhone) {
      setTelefone(formatPhone(cleanedPhone));
    }
  };

  // Simulated Custom Contact Inputs
  const [simNameInput, setSimNameInput] = useState("");
  const [simTelInput, setSimTelInput] = useState("");
  const [showContactPickerSim, setShowContactPickerSim] = useState(false);

  // Configured precisely according to the formulas:
  const applyContactFormulas = (displayName: string, phoneNumber: string) => {
    // 1st Rule: outputs["Pick contact"].contact.displayName
    const nomeCompletoPageVar = displayName || "";

    // 2nd Rule Formula for cleaning and removing +55:
    // IF(STARTS_WITH(REPLACE_REGS(phoneNumber, "[^0-9]", ""), "55"), SUBSTRING(REPLACE_REGS(phoneNumber, "[^0-9]", ""), 2), REPLACE_REGS(phoneNumber, "[^0-9]", ""))
    const rawDigits = (phoneNumber || "").replace(/[^0-9]/g, "");
    const telefoneContatoPageVar = rawDigits.startsWith("55")
      ? rawDigits.substring(2)
      : rawDigits;

    setNome(nomeCompletoPageVar);
    // Apply default mask format automatically
    setTelefone(formatPhone(telefoneContatoPageVar));
  };

  const handlePickContact = async () => {
    // Bypass native API if called on a computer / PC to immediately trigger simulation modal
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile && "contacts" in navigator && (navigator as any).contacts?.select) {
      try {
        const contacts = await (navigator as any).contacts.select(["name", "tel"], { multiple: false });
        if (contacts && contacts[0]) {
          const contact = contacts[0];
          const displayName = contact.name?.[0] || "";
          const phoneNumber = contact.tel?.[0] || "";
          applyContactFormulas(displayName, phoneNumber);
          return;
        }
      } catch (err) {
        console.warn("Native contact selection failed or denied, opening simulation modal.", err);
      }
    }
    // Open picker simulation modal
    setShowContactPickerSim(true);
  };

  // Isolated Clients list representing only the logged-in user's records (or all if admin view is active)
  const userClients = useMemo(() => {
    if (isAdminViewAll) {
      return clientes;
    }
    return clientes.filter((c) => c.IdUsuarioDono === currentUserOwnerId);
  }, [clientes, currentUserOwnerId, isAdminViewAll]);

  // Apply Search Filtering
  const filteredClients = useMemo(() => {
    if (!searchTerm.trim()) return userClients;
    const query = searchTerm.toLowerCase();
    return userClients.filter(
      (c) =>
        c.Nome.toLowerCase().includes(query) ||
        c.Telefone.toLowerCase().includes(query) ||
        c.Endereco.toLowerCase().includes(query)
    );
  }, [userClients, searchTerm]);

  // Submit client creation
  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (userPermissionLevel === 3) {
      showAlert("Acesso Restrito 🔒", "Nível de permissão 3 (Consulta e Pré-Venda) não autoriza agendamentos ou edições.");
      return;
    }
    if (!nome.trim()) return;

    // Geração do Endereço Completo de forma inteligente para preservar retrocompatibilidade
    let endCalculado = "";
    if (rua.trim() || cep.trim() || bairro.trim() || cidade.trim()) {
      const parts = [];
      if (rua.trim()) parts.push(rua.trim());
      if (numero.trim()) parts.push(`Nº ${numero.trim()}`);
      if (complemento.trim()) parts.push(complemento.trim());
      if (bairro.trim()) parts.push(`Bairro ${bairro.trim()}`);
      if (cidade.trim()) {
        if (estado.trim()) {
          parts.push(`${cidade.trim()}/${estado.trim().toUpperCase()}`);
        } else {
          parts.push(cidade.trim());
        }
      } else if (estado.trim()) {
        parts.push(estado.trim().toUpperCase());
      }
      if (cep.trim()) parts.push(`CEP ${cep.trim()}`);
      endCalculado = parts.join(", ");
    } else {
      endCalculado = "Sem Endereço cadastrado";
    }

    const newClient: CadCliente = {
      Id: `cli-${Date.now()}`,
      Nome: nome.trim(),
      Telefone: telefone.trim() || "(00) 00000-0000",
      Endereco: endCalculado,
      CpfCnpj: cpfCnpj.trim() || undefined,
      RgIe: rgIe.trim() || undefined,
      Email: email.trim() || undefined,
      Cep: cep.trim() || undefined,
      Numero: numero.trim() || undefined,
      Complemento: complemento.trim() || undefined,
      Bairro: bairro.trim() || undefined,
      Cidade: cidade.trim() || undefined,
      Estado: estado.trim() || undefined,
      DataNascimento: dataNascimento.trim() || undefined,
      DataCadastro: dataCadastro.trim() || undefined,
      LimiteCredito: limiteCredito ? parseFloat(limiteCredito) : undefined,
      SaldoDevedor: saldoDevedor ? parseFloat(saldoDevedor) : undefined,
      Ativo: true,
      IdUsuarioDono: currentUserOwnerId,
    };

    onUpdateClientes([...clientes, newClient]);

    const isOffline = !window.navigator.onLine;
    if (isOffline) {
      showAlert(
        "Cadastro Concluído (Offline)",
        `O cliente "${nome.trim()}" foi salvo localmente no dispositivo. Você pode continuar trabalhando de forma 100% livre e offline!`
      );
    } else {
      showAlert(
        "Cadastro Realizado",
        `O cliente "${nome.trim()}" foi registrado e sincronizado online com sucesso!`
      );
    }

    handleCloseAndResetModal();
  };

  const handleCloseAndResetModal = () => {
    setNome("");
    setTelefone("");
    setDadosBrutos("");

    // reset tab dynamic states
    setActiveTab("principal");
    setCpfCnpj("");
    setRgIe("");
    setEmail("");
    setRua("");
    setCep("");
    setNumero("");
    setComplemento("");
    setBairro("");
    setCidade("");
    setEstado("");
    setDataNascimento("");
    setDataCadastro(new Date().toISOString().split("T")[0]);
    setLimiteCredito("");
    setSaldoDevedor("");

    setShowAddModal(false);
  };

  // Perform surgical cell/field updates for inline spreadsheet editing
  const handleCellChange = (id: string, field: keyof CadCliente, value: any) => {
    if (userPermissionLevel === 3) {
      showAlert("Acesso Restrito 🔒", "Nível de permissão 3 (Consulta e Pré-Venda) não autoriza agendamentos ou edições.");
      return;
    }
    const updated = clientes.map((c) => {
      if (c.Id === id) {
        return { ...c, [field]: value };
      }
      return c;
    });
    onUpdateClientes(updated);
  };

  // Delete client helper
  const handleDeleteClient = (id: string) => {
    if (userPermissionLevel === 3) {
      showAlert("Acesso Restrito 🔒", "Nível de permissão 3 (Consulta e Pré-Venda) não autoriza agendamentos ou edições.");
      return;
    }
    showConfirm(
      "Confirmar Desativar",
      "Ao desativar o cliente, seus pets ficarão inativos no sistema. Deseja mesmo desativar este cliente?",
      () => {
        // Set active to false or remove
        const updated = clientes.map((c) =>
          c.Id === id ? { ...c, Ativo: false } : c
        );
        onUpdateClientes(updated);
      }
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white p-5 rounded-2xl border border-slate-200 gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-md bg-emerald-50 text-emerald-700">
              <Users className="h-4 w-4" />
            </span>
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 font-mono">
              Registros no Sistema
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-800">
            Cadastro de Clientes (CadCliente)
          </h2>
        </div>

        {!isRestricted && (
          <button
            type="button"
            disabled={userPermissionLevel === 3}
            onClick={() => {
              if (userPermissionLevel === 3) {
                showAlert("Acesso Restrito 🔒", "Nível de permissão 3 (Consulta e Pré-Venda) não autoriza cadastrar clientes.");
                return;
              }
              setShowAddModal(true);
            }}
            className={`inline-flex items-center gap-1.5 px-4.5 py-2 rounded-xl text-xs font-semibold transition-all transform ${
              userPermissionLevel === 3
                ? "bg-slate-300 text-slate-500 opacity-60 cursor-not-allowed border border-slate-400"
                : `shadow-xs hover:shadow active:scale-95 cursor-pointer ${activeTheme.primary}`
            }`}
            title={userPermissionLevel === 3 ? "Acesso Restrito: Nível 3 não pode cadastrar clientes." : "Cadastrar Cliente"}
          >
            <UserPlus className="h-4 w-4" />
            Cadastrar Cliente
          </button>
        )}
      </div>

      {/* Main Grid View */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in-down">
        
        {/* Search header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Pesquisar por Código, Nome, Telefone ou Endereço..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-600"
            />
          </div>

          <div className="text-xs text-slate-400 font-mono">
            Mostrando {filteredClients.length} de {userClients.length} clientes ativos
          </div>
        </div>

        {/* SpreadSheet Dense Table */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-mono text-[10px] uppercase font-semibold">
                <th className="w-52 p-2 border-r border-slate-200">Nome Completo do Cliente</th>
                <th className="w-32 p-2 border-r border-slate-200">Telefone Contato</th>
                <th className="w-64 p-2 border-r border-slate-200">Endereço de Entrega/Busca</th>
                <th className="w-36 p-2 text-center border-r border-slate-200">Débito / Limite Fiado</th>
                <th className="w-16 p-2 text-center border-r border-slate-200">Ativo</th>
                <th className="w-20 p-2 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-mono">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 bg-white font-sans text-xs">
                    Nenhum cliente cadastrado correspondente aos filtros.
                  </td>
                </tr>
              ) : (
                filteredClients.map((row, idx) => (
                  <tr
                    key={row.Id}
                    className={`hover:bg-slate-50/80 transition-colors group ${
                      idx % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                    } ${!row.Ativo ? "opacity-60" : ""}`}
                  >
                    {/* NOME EDIT */}
                    <td className="p-1 border-r border-slate-100 text-slate-800 focus-within:ring-2 focus-within:ring-emerald-500/30">
                      <input
                        type="text"
                        disabled={isRestricted}
                        value={row.Nome}
                        onChange={(e) => handleCellChange(row.Id, "Nome", e.target.value)}
                        className={`w-full bg-transparent border-0 p-1 focus:outline-none text-xs font-semibold text-slate-800 ${isRestricted ? "opacity-70 cursor-not-allowed" : ""}`}
                        placeholder="Nome do cliente"
                      />
                    </td>

                    {/* TELEFONE EDIT */}
                    <td className="p-1 border-r border-slate-100 text-slate-700 focus-within:ring-2 focus-within:ring-emerald-500/30">
                      <input
                        type="text"
                        disabled={isRestricted}
                        value={row.Telefone}
                        onChange={(e) => handleCellChange(row.Id, "Telefone", formatPhone(e.target.value))}
                        className={`w-full bg-transparent border-0 p-1 focus:outline-none text-xs font-mono text-slate-700 ${isRestricted ? "opacity-70 cursor-not-allowed" : ""}`}
                        placeholder="Ex: (11) 98888-7777"
                      />
                    </td>

                    {/* ENDEREÇO EDIT */}
                    <td className="p-1 border-r border-slate-100 text-slate-700 focus-within:ring-2 focus-within:ring-emerald-500/30">
                      <input
                        type="text"
                        disabled={isRestricted}
                        value={row.Endereco}
                        onChange={(e) => handleCellChange(row.Id, "Endereco", e.target.value)}
                        className={`w-full bg-transparent border-0 p-1 focus:outline-none text-xs text-slate-700 ${isRestricted ? "opacity-70 cursor-not-allowed" : ""}`}
                        placeholder="Endereço completo"
                      />
                    </td>

                    {/* DÉBITO / LIMITE FIADO */}
                    <td className="p-1 border-r border-slate-100 text-center font-mono text-xs">
                      {row.SaldoDevedor && row.SaldoDevedor > 0 ? (
                        <span className="text-rose-600 font-bold block">
                          R$ {row.SaldoDevedor.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-400 block">R$ 0.00</span>
                      )}
                      {row.LimiteCredito !== undefined ? (
                        <span className="text-[9px] text-slate-500 block">
                          Lím: R$ {row.LimiteCredito.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-400 block italic">Sem Limite</span>
                      )}
                    </td>

                    {/* ATIVO CHECKBOX CELL */}
                    <td className="p-1 border-r border-slate-100 text-center">
                      <button
                        type="button"
                        disabled={isRestricted}
                        onClick={() => handleCellChange(row.Id, "Ativo", !row.Ativo)}
                        className={`inline-flex items-center justify-center p-1.5 rounded-lg transition ${isRestricted ? "opacity-40 cursor-not-allowed" : "hover:bg-slate-100"}`}
                      >
                        {row.Ativo ? (
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
                          onClick={() => {
                            if (userPermissionLevel === 3) return;
                            handleStartEdit(row);
                          }}
                          disabled={userPermissionLevel === 3}
                          className={
                            userPermissionLevel === 3
                              ? "text-slate-300 cursor-not-allowed opacity-50 p-1 rounded-lg font-sans"
                              : "text-slate-400 hover:text-indigo-600 p-1 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer font-sans"
                          }
                          title={userPermissionLevel === 3 ? "Acesso Restrito: Nível 3 não pode editar clientes." : "Editar/Gerenciar Cliente"}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>

                        {userPermissionLevel !== 3 && !isRestricted ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteClient(row.Id)}
                            className="text-slate-400 hover:text-red-500 p-1 hover:bg-red-50 rounded-lg transition-all cursor-pointer font-sans"
                            title="Desativar Cliente"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-sans italic" title="Apenas leitura">🔒</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info message */}
        <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-400 font-mono text-center">
          Dica Airtable: Clique diretamente em qualquer célula de Nome, Contato ou Endereço na grade para efetuar alterações automáticas.
        </div>
      </div>

      {/* Modal - Adicionar Novo Cliente */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 select-none">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-scale-up">
            
            <div className="bg-gradient-to-r from-emerald-600 to-indigo-600 px-6 py-4.5 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold font-display tracking-tight text-base">
                  Cadastrar Novo Cliente
                </h3>
                <p className="text-[10px] text-emerald-100 uppercase tracking-wider font-mono">
                  Formulário de Cadastro com Abas (CadCliente)
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseAndResetModal}
                className="text-white hover:text-slate-150 text-sm font-semibold p-1 hover:bg-white/10 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* TAB SELECTOR HEADER */}
            <div className="flex border-b border-slate-200 bg-slate-50/50 text-[11px] font-semibold font-mono text-slate-500">
              <button
                type="button"
                onClick={() => setActiveTab("principal")}
                className={`flex-1 py-3 text-center border-b-2 flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  activeTab === "principal"
                    ? "border-emerald-600 text-emerald-600 bg-white"
                    : "border-transparent hover:bg-slate-100/60 hover:text-slate-700"
                }`}
              >
                <User className="h-3.5 w-3.5" />
                <span>Principal</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("fiscal")}
                className={`flex-1 py-3 text-center border-b-2 flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  activeTab === "fiscal"
                    ? "border-emerald-600 text-emerald-600 bg-white"
                    : "border-transparent hover:bg-slate-100/60 hover:text-slate-700"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Fiscal</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("endereco")}
                className={`flex-1 py-3 text-center border-b-2 flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  activeTab === "endereco"
                    ? "border-emerald-600 text-emerald-600 bg-white"
                    : "border-transparent hover:bg-slate-100/60 hover:text-slate-700"
                }`}
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>Endereço</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("historico")}
                className={`flex-1 py-3 text-center border-b-2 flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  activeTab === "historico"
                    ? "border-emerald-600 text-emerald-600 bg-white"
                    : "border-transparent hover:bg-slate-100/60 hover:text-slate-700"
                }`}
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>Crédito</span>
              </button>
            </div>

            <form onSubmit={handleAddClient}>
              <div className="p-6 space-y-4 max-h-[380px] overflow-y-auto custom-scrollbar">
                
                {/* TAB 1: PRINCIPAL */}
                {activeTab === "principal" && (
                  <div className="space-y-4 animate-fade-in-down">
                    {/* WhatsApp Copy & Paste Input integration */}
                    <div className="bg-emerald-50/70 rounded-2xl p-3 border border-emerald-200 space-y-2 shadow-2xs">
                      <div className="flex items-center gap-1.5 text-emerald-800">
                        <MessageSquare className="h-3.5 w-3.5 shrink-0 text-emerald-600 animate-pulse" />
                        <span className="text-[10.5px] font-bold uppercase font-mono tracking-wide">
                          Dados do WhatsApp (Copiar & Colar)
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-500 font-sans leading-relaxed">
                        Copie o contato ou a mensagem do WhatsApp Web/App e cole abaixo. O sistema extrairá o nome e o telefone automaticamente!
                      </p>
                      <div className="relative">
                        <textarea
                          rows={2}
                          value={dadosBrutos}
                          onChange={(e) => handleExtractWhatsApp(e.target.value)}
                          placeholder='Cole aqui: "Maria Silva +55 11 98765-4321"'
                          className="w-full px-2.5 py-1.5 bg-white border border-emerald-150 rounded-xl text-slate-800 placeholder-slate-400 font-mono text-[10.5px] leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none min-h-[50px]"
                        />
                        {dadosBrutos && (
                          <button
                            type="button"
                            onClick={() => handleExtractWhatsApp("")}
                            className="absolute right-2.5 bottom-2 text-[9px] font-bold text-slate-400 hover:text-red-500 transition cursor-pointer"
                          >
                            Limpar
                          </button>
                        )}
                      </div>
                      <div className="flex gap-2 justify-between items-center bg-white/50 backdrop-blur-xs p-1 rounded-lg">
                        <div className="text-[9px] text-slate-500 font-medium">
                          💻 Funciona no Notebook e Celular!
                        </div>
                        <button
                          type="button"
                          onClick={handlePickContact}
                          className="text-[9px] text-indigo-600 hover:text-indigo-800 font-bold underline transition cursor-pointer font-sans"
                        >
                          Usar Agenda do Celular
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                        Nome Completo <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        placeholder="Ex: Mariana de Sousa"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                        Telefone de Contato <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={telefone}
                        onChange={(e) => setTelefone(formatPhone(e.target.value))}
                        placeholder="Ex: (11) 98765-4321"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 2: DADOS FISCAIS */}
                {activeTab === "fiscal" && (
                  <div className="space-y-4 animate-fade-in-down">
                    <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
                      <p className="text-[10px] text-indigo-900 font-sans leading-relaxed">
                        <strong>Campos Fiscais (Todos Opcionais)</strong>: Insira as informações fiscais e de contato tributário do cliente para faturamento integrado. Caso prefira, pode deixar os campos em branco.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                        CPF / CNPJ
                      </label>
                      <input
                        type="text"
                        value={cpfCnpj}
                        onChange={(e) => setCpfCnpj(e.target.value)}
                        placeholder="Ex: 000.000.000-00 ou 00.000.000/0001-00"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                        RG / Inscrição Estadual
                      </label>
                      <input
                        type="text"
                        value={rgIe}
                        onChange={(e) => setRgIe(e.target.value)}
                        placeholder="Ex: 00.000.000-0 ou ISENTO"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                        E-mail de Faturamento
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Ex: cliente@provedor.com"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 3: ENDEREÇO DETALHADO */}
                {activeTab === "endereco" && (
                  <div className="space-y-4 animate-fade-in-down">
                    <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
                      <p className="text-[10px] text-indigo-900 font-sans leading-relaxed">
                        <strong>Endereço Detalhado (Todos Opcionais)</strong>: Preencha os campos abaixo para que as buscas e ordens de serviço herdem o endereço mapeado adequadamente.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                        Rua / Logradouro
                      </label>
                      <input
                        type="text"
                        value={rua}
                        onChange={(e) => setRua(e.target.value)}
                        placeholder="Ex: Rua das Flores"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                          CEP
                        </label>
                        <input
                          type="text"
                          value={cep}
                          onChange={(e) => setCep(e.target.value)}
                          placeholder="Ex: 00000-000"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                          Número
                        </label>
                        <input
                          type="text"
                          value={numero}
                          onChange={(e) => setNumero(e.target.value)}
                          placeholder="Ex: 123"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                        Complemento
                      </label>
                      <input
                        type="text"
                        value={complemento}
                        onChange={(e) => setComplemento(e.target.value)}
                        placeholder="Ex: Apto 102 Bloco B"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                        Bairro
                      </label>
                      <input
                        type="text"
                        value={bairro}
                        onChange={(e) => setBairro(e.target.value)}
                        placeholder="Ex: Centro"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                          Cidade
                        </label>
                        <input
                          type="text"
                          value={cidade}
                          onChange={(e) => setCidade(e.target.value)}
                          placeholder="Ex: São Paulo"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                          Estado
                        </label>
                        <input
                          type="text"
                          value={estado}
                          onChange={(e) => setEstado(e.target.value)}
                          placeholder="SP"
                          maxLength={2}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white text-center font-mono placeholder:font-sans placeholder:text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: HISTÓRICO E CRÉDITO */}
                {activeTab === "historico" && (
                  <div className="space-y-4 animate-fade-in-down">
                    <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
                      <p className="text-[10px] text-indigo-900 font-sans leading-relaxed">
                        <strong>Histórico e Crédito (Todos Opcionais)</strong>: Insira datas para monitoramento de aniversários (módulo aniversariantes/fidelização) e o saldo máximo para faturar pedidos em conta corrente.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                          Data de Nascimento
                        </label>
                        <input
                          type="date"
                          value={dataNascimento}
                          onChange={(e) => setDataNascimento(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                          Data de Cadastro
                        </label>
                        <input
                          type="date"
                          value={dataCadastro}
                          onChange={(e) => setDataCadastro(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                          Limite de Crédito autorizado (R$)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-xs">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={limiteCredito}
                            onChange={(e) => setLimiteCredito(e.target.value)}
                            placeholder="0.00"
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white font-mono"
                          />
                        </div>
                        <p className="text-[9px] text-slate-500 mt-1 font-sans">Nivel máximo permitido para vendas "Fiadas". Deixe em branco se for ilimitado ou não se aplicar.</p>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                          Saldo Devedor Inicial (R$)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-xs">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={saldoDevedor}
                            onChange={(e) => setSaldoDevedor(e.target.value)}
                            placeholder="0.00"
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white font-mono"
                          />
                        </div>
                        <p className="text-[9px] text-slate-500 mt-1 font-sans">Dívida prévia que o cliente possua no momento.</p>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* MODAL FOOTER */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100 font-sans text-xs bg-slate-50/50">
                <button
                  type="button"
                  onClick={handleCloseAndResetModal}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                {userPermissionLevel !== 3 && (
                  <button
                    type="submit"
                    className={`px-5 py-2 font-semibold rounded-xl text-white shadow-md transition transform active:scale-95 cursor-pointer ${activeTheme.primary}`}
                  >
                    Confirmar Cadastro
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Editar Cliente Atual */}
      {editingClient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 select-none">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-scale-up">
            
            <div className="bg-gradient-to-r from-emerald-600 to-indigo-600 px-6 py-4.5 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold font-display tracking-tight text-base">
                  Editar Cadastro do Cliente
                </h3>
                <p className="text-[10px] text-emerald-100 uppercase tracking-wider font-mono">
                  Gerenciar dados de {editingClient.Nome}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingClient(null)}
                className="text-white hover:text-slate-150 text-sm font-semibold p-1 hover:bg-white/10 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* TAB SELECTOR HEADER FOR EDIT */}
            <div className="flex border-b border-slate-200 bg-slate-50/50 text-[11px] font-semibold font-mono text-slate-500">
              <button
                type="button"
                onClick={() => setEditActiveTab("principal")}
                className={`flex-1 py-3 text-center border-b-2 flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  editActiveTab === "principal"
                    ? "border-emerald-600 text-emerald-600 bg-white"
                    : "border-transparent hover:bg-slate-100/60 hover:text-slate-700"
                }`}
              >
                <User className="h-3.5 w-3.5" />
                <span>Principal</span>
              </button>
              <button
                type="button"
                onClick={() => setEditActiveTab("fiscal")}
                className={`flex-1 py-3 text-center border-b-2 flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  editActiveTab === "fiscal"
                    ? "border-emerald-600 text-emerald-600 bg-white"
                    : "border-transparent hover:bg-slate-100/60 hover:text-slate-700"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Fiscal</span>
              </button>
              <button
                type="button"
                onClick={() => setEditActiveTab("endereco")}
                className={`flex-1 py-3 text-center border-b-2 flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  editActiveTab === "endereco"
                    ? "border-emerald-600 text-emerald-600 bg-white"
                    : "border-transparent hover:bg-slate-100/60 hover:text-slate-700"
                }`}
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>Endereço</span>
              </button>
              <button
                type="button"
                onClick={() => setEditActiveTab("historico")}
                className={`flex-1 py-3 text-center border-b-2 flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  editActiveTab === "historico"
                    ? "border-emerald-600 text-emerald-600 bg-white"
                    : "border-transparent hover:bg-slate-100/60 hover:text-slate-700"
                }`}
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>Crédito</span>
              </button>
            </div>

            <form onSubmit={handleSaveEditClient}>
              <div className="p-6 space-y-4 max-h-[380px] overflow-y-auto custom-scrollbar">
                
                {/* EDIT TAB 1: PRINCIPAL */}
                {editActiveTab === "principal" && (
                  <div className="space-y-4 animate-fade-in-down">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                        Nome Completo do Cliente <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        disabled={isRestricted}
                        value={editNome}
                        onChange={(e) => setEditNome(e.target.value)}
                        placeholder="Ex: Mariana de Sousa"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                        Telefone de Contato <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        disabled={isRestricted}
                        value={editTelefone}
                        onChange={(e) => setEditTelefone(formatPhone(e.target.value))}
                        placeholder="Ex: (11) 98765-4321"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white font-mono disabled:opacity-60"
                      />
                    </div>

                    {/* Integrated Tabela/Grid for client's pets */}
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 text-slate-705">
                          <Bone className="h-4 w-4 text-emerald-600" />
                          <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Pets Vinculados</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (onAddPetForClient && editingClient) {
                              onAddPetForClient(editingClient.Id);
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 hover:shadow shadow-2xs cursor-pointer transition-all"
                        >
                          <Plus className="h-3 w-3" />
                          Adicionar Novo Pet
                        </button>
                      </div>

                      {(() => {
                        const clientPets = pets.filter(p => p.IdCliente === editingClient.Id && p.Ativo);
                        if (clientPets.length === 0) {
                          return (
                            <div className="p-4 bg-slate-50 text-center text-[10px] text-slate-400 rounded-xl border border-dashed border-slate-204 font-sans leading-relaxed">
                              Nenhum pet ativo cadastrado neste tutor ainda. Clique no botão acima para adicionar.
                            </div>
                          );
                        }
                        return (
                          <div className="overflow-hidden border border-slate-200 rounded-xl bg-white max-h-[160px] overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left text-[11px] font-sans">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-220 text-slate-500 font-mono text-[9px] uppercase font-bold sticky top-0 z-[5]">
                                  <th className="p-2 w-1/3">Nome</th>
                                  <th className="p-2 w-1/4">Espécie</th>
                                  <th className="p-2 w-1/3">Raça</th>
                                  <th className="p-2">Sexo</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-slate-700">
                                {clientPets.map(pet => (
                                  <tr key={pet.Id} className="hover:bg-slate-50/50">
                                    <td className="p-2 font-bold">{pet.Nome}</td>
                                    <td className="p-2">{pet.Especie}</td>
                                    <td className="p-2 truncate" title={pet.Raca}>{pet.Raca || <span className="text-slate-400 italic">S.R.D.</span>}</td>
                                    <td className="p-2 font-mono text-[10px]">{pet.Sexo}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* EDIT TAB 2: DADOS FISCAIS */}
                {editActiveTab === "fiscal" && (
                  <div className="space-y-4 animate-fade-in-down">
                    <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
                      <p className="text-[10px] text-indigo-900 font-sans leading-relaxed">
                        <strong>Campos Fiscais (Todos Opcionais)</strong>: Insira as informações fiscais e de contato tributário do cliente para faturamento integrado.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                        CPF / CNPJ
                      </label>
                      <input
                        type="text"
                        disabled={isRestricted}
                        value={editCpfCnpj}
                        onChange={(e) => setEditCpfCnpj(e.target.value)}
                        placeholder="Ex: 000.000.000-00 ou 00.000.000/0001-00"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white font-mono disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                        RG / Inscrição Estadual
                      </label>
                      <input
                        type="text"
                        disabled={isRestricted}
                        value={editRgIe}
                        onChange={(e) => setEditRgIe(e.target.value)}
                        placeholder="Ex: 00.000.000-0 ou ISENTO"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white font-mono disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                        E-mail de Faturamento
                      </label>
                      <input
                        type="email"
                        disabled={isRestricted}
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="Ex: cliente@provedor.com"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white disabled:opacity-60"
                      />
                    </div>
                  </div>
                )}

                {/* EDIT TAB 3: ENDEREÇO DETALHADO */}
                {editActiveTab === "endereco" && (
                  <div className="space-y-4 animate-fade-in-down">
                    <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
                      <p className="text-[10px] text-indigo-900 font-sans leading-relaxed">
                        <strong>Endereço Detalhado (Todos Opcionais)</strong>: Preencha os campos abaixo para atualizar o endereço estruturado.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                        Rua / Logradouro
                      </label>
                      <input
                        type="text"
                        disabled={isRestricted}
                        value={editRua}
                        onChange={(e) => setEditRua(e.target.value)}
                        placeholder="Ex: Rua das Flores"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white disabled:opacity-60"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                          CEP
                        </label>
                        <input
                           type="text"
                           disabled={isRestricted}
                           value={editCep}
                           onChange={(e) => setEditCep(e.target.value)}
                           placeholder="Ex: 00000-000"
                           className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white font-mono disabled:opacity-60"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                          Número
                        </label>
                        <input
                          type="text"
                          disabled={isRestricted}
                          value={editNumero}
                          onChange={(e) => setEditNumero(e.target.value)}
                          placeholder="Ex: 123"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white font-mono disabled:opacity-60"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                        Complemento
                      </label>
                      <input
                        type="text"
                        disabled={isRestricted}
                        value={editComplemento}
                        onChange={(e) => setEditComplemento(e.target.value)}
                        placeholder="Ex: Apto 102 Bloco B"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                        Bairro
                      </label>
                      <input
                        type="text"
                        disabled={isRestricted}
                        value={editBairro}
                        onChange={(e) => setEditBairro(e.target.value)}
                        placeholder="Ex: Centro"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white disabled:opacity-60"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                          Cidade
                        </label>
                        <input
                          type="text"
                          disabled={isRestricted}
                          value={editCidade}
                          onChange={(e) => setEditCidade(e.target.value)}
                          placeholder="Ex: São Paulo"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white disabled:opacity-60"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                          Estado
                        </label>
                        <input
                          type="text"
                          disabled={isRestricted}
                          value={editEstado}
                          onChange={(e) => setEditEstado(e.target.value)}
                          placeholder="SP"
                          maxLength={2}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white text-center font-mono placeholder:font-sans placeholder:text-xs disabled:opacity-60"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* EDIT TAB 4: HISTÓRICO E CRÉDITO */}
                {editActiveTab === "historico" && (
                  <div className="space-y-4 animate-fade-in-down">
                    <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
                      <p className="text-[10px] text-indigo-900 font-sans leading-relaxed">
                        <strong>Histórico e Crédito (Todos Opcionais)</strong>: Monitore datas importantes e configure o teto de fiado do cliente.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                          Data de Nascimento
                        </label>
                        <input
                          type="date"
                          disabled={isRestricted}
                          value={editDataNascimento}
                          onChange={(e) => setEditDataNascimento(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white font-mono disabled:opacity-60"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                          Data de Cadastro
                        </label>
                        <input
                          type="date"
                          disabled={isRestricted}
                          value={editDataCadastro}
                          onChange={(e) => setEditDataCadastro(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono disabled:opacity-60"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                          Limite de Crédito autorizado (R$)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-xs">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            disabled={isRestricted}
                            value={editLimiteCredito}
                            onChange={(e) => setEditLimiteCredito(e.target.value)}
                            placeholder="0.00"
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white font-mono disabled:opacity-60"
                          />
                        </div>
                        <p className="text-[9px] text-slate-500 mt-1 font-sans">Nível máximo permitido para faturamento fiado.</p>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                          Saldo Devedor / Fiado Acumulado (R$)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-xs">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            disabled={isRestricted}
                            value={editSaldoDevedor}
                            onChange={(e) => setEditSaldoDevedor(e.target.value)}
                            placeholder="0.00"
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white font-mono disabled:opacity-60"
                          />
                        </div>
                        <p className="text-[9px] text-slate-500 mt-1 font-sans">Dívida acumulada de faturamento pendente.</p>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* EDIT MODAL FOOTER */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100 font-sans text-xs bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                {userPermissionLevel !== 3 && !isRestricted && (
                  <button
                    type="submit"
                    className={`px-5 py-2 font-semibold rounded-xl text-white shadow-md transition transform active:scale-95 cursor-pointer ${activeTheme.primary}`}
                  >
                    Salvar Alterações
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mock Contact Picker Simulation Modal */}
      {showContactPickerSim && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 select-none animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-scale-up">
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 px-5 py-4 text-white flex items-center justify-between">
              <div>
                <h4 className="font-bold font-display text-sm">Selecione um Contato</h4>
                <p className="text-[9px] text-indigo-100 uppercase tracking-wider font-mono">
                  Simulação da Flow Function "Pick contact"
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowContactPickerSim(false)}
                className="text-white hover:text-indigo-200 text-sm font-semibold p-1.5 hover:bg-white/10 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-[11px] text-slate-500 leading-normal">
                Para simular o funcionamento nativo no navegador ou PWA, escolha um contato abaixo para executar as <strong>Fórmulas de Set page variable</strong>.
              </p>

              {/* List of simulated contacts */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {[
                  { displayName: "Ana Silva", phoneNumber: "+55 (11) 98765-4321" },
                  { displayName: "Carlos Souza", phoneNumber: "+55 (21) 91234-5678" },
                  { displayName: "Beatriz Santos", phoneNumber: "(19) 98765-4321" },
                  { displayName: "Pedro Lucas", phoneNumber: "5531977778888" },
                  { displayName: "Juliana Mendes", phoneNumber: "+55 11 95555-4444" },
                  { displayName: "Antônio Pires", phoneNumber: "11966663333" }
                ].map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      applyContactFormulas(c.displayName, c.phoneNumber);
                      setShowContactPickerSim(false);
                    }}
                    className="w-full text-left p-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-150 hover:border-indigo-300 rounded-xl transition flex justify-between items-center cursor-pointer group"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-950 font-sans">{c.displayName}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{c.phoneNumber}</p>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition">Selecionar →</span>
                  </button>
                ))}
              </div>

              {/* Custom Input Simulation */}
              <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-2xl space-y-2">
                <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest font-mono">Testar com número personalizado:</p>
                <div className="space-y-1.5 text-xs">
                  <input
                    type="text"
                    value={simNameInput}
                    onChange={(e) => setSimNameInput(e.target.value)}
                    placeholder="Nome de Teste"
                    className="w-full px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg text-slate-800 text-xs focus:outline-none"
                  />
                  <input
                    type="text"
                    value={simTelInput}
                    onChange={(e) => setSimTelInput(e.target.value)}
                    placeholder="Telefone de Teste (+55...)"
                    className="w-full px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg text-slate-800 font-mono text-xs focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      applyContactFormulas(simNameInput || "Nome de Teste", simTelInput);
                      setShowContactPickerSim(false);
                      setSimNameInput("");
                      setSimTelInput("");
                    }}
                    className="w-full py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition cursor-pointer"
                  >
                    Aplicar Fórmulas no Customizado
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
