/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useRef, useEffect } from "react";
import { CadInfoConta, ThemeColor, CadUsuario, DatabaseState } from "../types";
import { THEME_PRESETS } from "../data/themes";
import SqlBackupRestore from "./SqlBackupRestore";
import JsonBackupImporter from "./JsonBackupImporter";
import { 
  Settings, 
  Image, 
  Check, 
  Sparkles, 
  Phone, 
  MapPin, 
  Building, 
  Upload, 
  AlertCircle, 
  Trash2, 
  Mail, 
  Lock, 
  UserPlus, 
  Users,
  Pencil
} from "lucide-react";
import { formatPhone, formatCEP, formatDocument } from "../utils/masks";

interface SettingsProps {
  infoConta: CadInfoConta | undefined;
  activeTheme: ThemeColor;
  currentUserOwnerId: string;
  onSaveInfoConta: (updated: CadInfoConta) => void;
  showConfirm: (title: string, msg: string, onConfirm: () => void) => void;
  showAlert: (title: string, msg: string) => void;
  usuarios?: CadUsuario[];
  onUpdateUsuarios?: (updated: CadUsuario[]) => void;
  db?: DatabaseState;
  currentUser?: CadUsuario | null;
  onUpdateDbState?: (updateFn: (prev: DatabaseState) => DatabaseState) => void;
}

export default function SettingsSheet({
  infoConta,
  activeTheme,
  currentUserOwnerId,
  onSaveInfoConta,
  showConfirm,
  showAlert,
  usuarios = [],
  onUpdateUsuarios,
  db,
  currentUser,
  onUpdateDbState,
}: SettingsProps) {
  // Temporary states
  const [nomeEmpresa, setNomeEmpresa] = useState(infoConta?.NomeEmpresa || "");
  const [endereco, setEndereco] = useState(infoConta?.Endereco || "");
  const [fone, setFone] = useState(infoConta?.Fone || "");
  const [corFundo, setCorFundo] = useState(infoConta?.CorFundo || "emerald");
  const [logoBase64, setLogoBase64] = useState(infoConta?.Logo || "");
  const [razaoSocial, setRazaoSocial] = useState(infoConta?.Razao_Social || "");
  const [documentoIdentificacao, setDocumentoIdentificacao] = useState(infoConta?.Documento_Identificacao || "");
  const [cepEstabelecimento, setCepEstabelecimento] = useState(infoConta?.CEP_Estabelecimento || "");

  // Sub-user management states (Gerenciar Equipe)
  const [newEmpNome, setNewEmpNome] = useState("");
  const [newEmpSenha, setNewEmpSenha] = useState("");
  const [newEmpFone, setNewEmpFone] = useState("");
  const [newEmpEndereco, setNewEmpEndereco] = useState("");
  const [newEmpObservacoes, setNewEmpObservacoes] = useState("");
  const [newEmpPermissionLevel, setNewEmpPermissionLevel] = useState<number>(1);

  // States for Editing Collaborator
  const [editingEmployee, setEditingEmployee] = useState<CadUsuario | null>(null);
  const [editEmpNome, setEditEmpNome] = useState("");
  const [editEmpSenha, setEditEmpSenha] = useState("");
  const [editEmpFone, setEditEmpFone] = useState("");
  const [editEmpEndereco, setEditEmpEndereco] = useState("");
  const [editEmpObservacoes, setEditEmpObservacoes] = useState("");
  const [editEmpPermissionLevel, setEditEmpPermissionLevel] = useState<number>(1);

  // Reset scroll to 0 when opening collaborator modal on mobile
  useEffect(() => {
    if (editingEmployee) {
      const timer = setTimeout(() => {
        const scrollables = document.querySelectorAll(".overflow-y-auto, [class*='overflow-y-auto']");
        scrollables.forEach((el) => {
          el.scrollTop = 0;
        });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [editingEmployee]);

  // Sub-tab selection state inside cadinfoconta screen
  const [activeSubTab, setActiveSubTab] = useState<"dados" | "equipe">("dados");

  useEffect(() => {
    if (infoConta) {
      setNomeEmpresa(infoConta.NomeEmpresa || "");
      setEndereco(infoConta.Endereco || "");
      setFone(infoConta.Fone || "");
      setCorFundo(infoConta.CorFundo || "emerald");
      setLogoBase64(infoConta.Logo || "");
      setRazaoSocial(infoConta.Razao_Social || "");
      setDocumentoIdentificacao(infoConta.Documento_Identificacao || "");
      setCepEstabelecimento(infoConta.CEP_Estabelecimento || "");
    }
  }, [infoConta]);

  const [savingMessage, setSavingMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File picker handler & Base64 conversion
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showAlert("Arquivo excedido", "A imagem selecionada é muito grande! Escolha um arquivo de no máximo 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setLogoBase64(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedInfo: CadInfoConta = {
      Id: infoConta?.Id || `info-${Date.now()}`,
      NomeEmpresa: nomeEmpresa.trim(),
      Logo: logoBase64,
      Endereco: endereco.trim(),
      Fone: fone.trim(),
      CorFundo: corFundo,
      IdUsuarioDono: currentUserOwnerId,
      Razao_Social: razaoSocial.trim(),
      Documento_Identificacao: documentoIdentificacao.trim(),
      CEP_Estabelecimento: cepEstabelecimento.trim(),
    };

    onSaveInfoConta(parsedInfo);
    setSavingMessage("Configuração gravada com sucesso!");
    setTimeout(() => setSavingMessage(""), 3500);
  };

  const handleClearLogo = () => {
    setLogoBase64("");
  };

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    const nomeLimpo = newEmpNome.trim();
    const senhaLimpa = newEmpSenha.trim();

    if (!nomeLimpo || !senhaLimpa) {
      showAlert("Campos Obrigatórios", "Por favor, preencha o Nome e a Senha do colaborador.");
      return;
    }

    const existeUsuario = (usuarios || []).some(
      (u) => u.Nome.trim().toLowerCase() === nomeLimpo.toLowerCase()
    );

    if (existeUsuario) {
      showAlert("Erro de Duplicidade", `O login "${nomeLimpo}" já está em uso por outro usuário.`);
      return;
    }

    const novoFuncionario: CadUsuario = {
      Id: `user-team-${Date.now()}`,
      Nome: nomeLimpo,
      Senha: senhaLimpa,
      Permissoes: "Usuário",
      NivelAcesso: "Subusuário", // Auto-save NivelAcesso exactly as requested
      permission_level: newEmpPermissionLevel,
      IdUsuarioMaster: currentUserOwnerId, // Link automatically with Master lojista logado
      Tipo_Assinatura: "Vitalício",
      Data_Inicio: new Date().toISOString().split("T")[0],
      Fone: newEmpFone.trim() || undefined,
      Endereco: newEmpEndereco.trim() || undefined,
      Observacoes: newEmpObservacoes.trim() || undefined,
    };

    if (onUpdateUsuarios) {
      onUpdateUsuarios([...usuarios, novoFuncionario]);
      showAlert("Sucesso!", `Funcionário "${nomeLimpo}" cadastrado e vinculado à sua equipe de forma automática!`);
      setNewEmpNome("");
      setNewEmpSenha("");
      setNewEmpFone("");
      setNewEmpEndereco("");
      setNewEmpObservacoes("");
      setNewEmpPermissionLevel(1);
    }
  };

  const handleDeleteEmployee = (id: string, name: string) => {
    showConfirm(
      "Remover Colaborador",
      `Deseja realmente excluir permanentemente o acesso do colaborador "${name}" da sua equipe?`,
      () => {
        if (onUpdateUsuarios) {
          onUpdateUsuarios(usuarios.filter((u) => u.Id !== id));
          showAlert("Sucesso!", "Colaborador removido com sucesso.");
        }
      }
    );
  };

  const handleStartEditEmployee = (worker: CadUsuario) => {
    setEditingEmployee(worker);
    setEditEmpNome(worker.Nome || "");
    setEditEmpSenha(worker.Senha || "");
    setEditEmpFone(worker.Fone || "");
    setEditEmpEndereco(worker.Endereco || "");
    setEditEmpObservacoes(worker.Observacoes || "");
    setEditEmpPermissionLevel(worker.permission_level || 1);
  };

  const handleSaveEditEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    const nomeLimpo = editEmpNome.trim();
    const senhaLimpa = editEmpSenha.trim();

    if (!nomeLimpo || !senhaLimpa) {
      showAlert("Campos Obrigatórios", "Por favor, preencha o Nome e a Senha do colaborador.");
      return;
    }

    const existeUsuario = (usuarios || []).some(
      (u) => u.Id !== editingEmployee.Id && u.Nome.trim().toLowerCase() === nomeLimpo.toLowerCase()
    );

    if (existeUsuario) {
      showAlert("Erro de Duplicidade", `O login "${nomeLimpo}" já está em uso por outro usuário.`);
      return;
    }

    const updatedEmployee: CadUsuario = {
      ...editingEmployee,
      Nome: nomeLimpo,
      Senha: senhaLimpa,
      permission_level: editEmpPermissionLevel,
      Fone: editEmpFone.trim() || undefined,
      Endereco: editEmpEndereco.trim() || undefined,
      Observacoes: editEmpObservacoes.trim() || undefined,
    };

    if (onUpdateUsuarios) {
      onUpdateUsuarios(
        usuarios.map((u) => (u.Id === editingEmployee.Id ? updatedEmployee : u))
      );
      showAlert("Sucesso!", `Cadastro do funcionário "${nomeLimpo}" atualizado com sucesso!`);
      setEditingEmployee(null);
    }
  };

  // Filter team members of this master user
  const colaboradores = (usuarios || []).filter(
    (u) => u.IdUsuarioMaster === currentUserOwnerId && (u.NivelAcesso === "Subusuário" || u.NivelAcesso === "Subuser")
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white p-5 rounded-2xl border border-slate-200 gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-md bg-emerald-50 text-emerald-700">
              <Settings className="h-4 w-4 text-emerald-600" />
            </span>
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 font-mono">
              Configurações ERP do Usuário
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-800 animate-slide-in">
            Customização da Empresa (CadInfoConta)
          </h2>
        </div>
      </div>

      {/* Visual Subtabs for clean mobile/uniform design inside CadInfoConta */}
      <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 select-none w-full border border-slate-200">
        <button
          type="button"
          onClick={() => setActiveSubTab("dados")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === "dados"
              ? `bg-white text-slate-900 shadow-sm font-black`
              : "text-slate-500 hover:text-slate-850 hover:bg-white/40"
          }`}
        >
          <Building className="h-3.5 w-3.5 text-slate-550" />
          <span>Meus Dados</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("equipe")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === "equipe"
              ? `bg-white text-slate-900 shadow-sm font-black`
              : "text-slate-500 hover:text-slate-850 hover:bg-white/40"
          }`}
        >
          <Users className="h-3.5 w-3.5 text-slate-550" />
          <span>Gerenciar Equipe</span>
          {colaboradores.length > 0 && (
            <span className="text-[10px] bg-slate-250 text-slate-700 px-1.5 py-0.2 rounded-full font-mono font-bold">
              {colaboradores.length}
            </span>
          )}
        </button>
      </div>

      {activeSubTab === "dados" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
          
          {/* Left Form Panel */}
          <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <form onSubmit={handleSave} className="space-y-5 text-xs font-sans">
              
              {savingMessage && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold rounded-xl animate-pulse">
                  ✨ {savingMessage}
                </div>
              )}

              {/* Business name */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                  Nome de Fantasia do Estabelecimento
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Building className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    value={nomeEmpresa}
                    onChange={(e) => setNomeEmpresa(e.target.value)}
                    placeholder="Nome que será exibido no topo da Agenda/Relatórios"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Razão Social & Documento Identificação */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                    Razão Social / Nome Completo Proprietário
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 font-bold text-[10px] font-mono">
                      CNPJ/CPF
                    </span>
                    <input
                      type="text"
                      value={razaoSocial}
                      onChange={(e) => setRazaoSocial(e.target.value)}
                      placeholder="Nome Empresarial Oficial ou Proprietário"
                      className="w-full pl-16 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                    Documento de Identificação (CNPJ / CPF)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 font-bold text-[10px] font-mono">
                      DOC
                    </span>
                    <input
                      type="text"
                      value={documentoIdentificacao}
                      onChange={(e) => setDocumentoIdentificacao(formatDocument(e.target.value))}
                      placeholder="CNPJ ou CPF formatado"
                      className="w-full pl-12 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* Telephone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                    Telefone de Contato Público
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <Phone className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      value={fone}
                      onChange={(e) => setFone(formatPhone(e.target.value))}
                      placeholder="Ex: (11) 4002-8922"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* Theme Selector (Paleta de Cores) */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase font-mono tracking-wider">
                  Cor de Destaque (Tema Visual)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {THEME_PRESETS.map((t) => {
                    let colorCircleClass = "bg-emerald-500";
                    if (t.name === "indigo") colorCircleClass = "bg-indigo-600";
                    else if (t.name === "sky") colorCircleClass = "bg-sky-500";
                    else if (t.name === "amber") colorCircleClass = "bg-amber-500";
                    else if (t.name === "rose") colorCircleClass = "bg-rose-500";
                    else if (t.name === "slate") colorCircleClass = "bg-slate-700";
                    else if (t.name === "purple") colorCircleClass = "bg-purple-600";

                    const isSelected = corFundo === t.name;

                    return (
                      <button
                        key={t.name}
                        type="button"
                        onClick={() => setCorFundo(t.name)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all duration-150 ${
                          isSelected
                            ? "border-slate-800 bg-slate-50 text-slate-900 ring-2 ring-slate-800/10 shadow-3xs"
                            : "border-slate-200 hover:border-slate-350 bg-white text-slate-600"
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full ${colorCircleClass} flex items-center justify-center flex-shrink-0 relative`}>
                          {isSelected && <Check className="h-2 w-2 text-white stroke-[3.5px]" />}
                        </span>
                        <span className="capitalize truncate text-[11px]">{t.name === "sky" ? "sky" : t.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Address & CEP */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                    Endereço Físico do PetShop
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      value={endereco}
                      onChange={(e) => setEndereco(e.target.value)}
                      placeholder="Avenida Paulista, 1500 - Bela Vista"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                    CEP do Estabelecimento
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 font-bold text-[10px] font-mono">
                      CEP
                    </span>
                    <input
                      type="text"
                      value={cepEstabelecimento}
                      onChange={(e) => setCepEstabelecimento(formatCEP(e.target.value))}
                      placeholder="Ex: 13400-000"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* Logo upload field */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                  Logotipo Comercial da Empresa
                </label>
                
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4.5 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                  {logoBase64 ? (
                    <div className="relative flex-none">
                      <img
                        src={logoBase64}
                        alt="Logo Upload"
                        referrerPolicy="no-referrer"
                        className="w-20 h-20 rounded-xl object-cover border border-slate-200 p-1 bg-white shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={handleClearLogo}
                        className="absolute -top-1.5 -right-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-full p-1.5 text-[8px] font-bold shadow-3xs"
                        title="Apagar imagem"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-xl border border-slate-200 bg-white flex flex-col items-center justify-center text-slate-350">
                      <Image className="h-8 w-8" />
                    </div>
                  )}

                  <div className="text-center sm:text-left flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700">Personalize seu Logotipo</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Selecione arquivos PNG ou JPG com tamanho máximo suportado de 2MB.</p>
                    
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-[11px] text-slate-600 font-semibold rounded-lg transition"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Fazer Upload Imagem
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleLogoUpload}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Action */}
              <div className="flex items-center justify-end pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  className={`px-6 py-2.5 font-semibold text-xs rounded-xl text-white shadow-xs cursor-pointer ${activeTheme.primary}`}
                >
                  Salvar Customização da Conta
                </button>
              </div>

            </form>
          </div>

          {/* Right Preview Panel */}
          <div className="space-y-4 font-sans text-xs">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-1">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Resultado em Tempo Real
              </h3>

              <div className="p-4 border border-slate-150 rounded-xl space-y-3.5 select-none bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  {logoBase64 ? (
                    <img
                      src={logoBase64}
                      alt="Logo Preview"
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-lg object-cover ring-2 ring-emerald-50"
                    />
                  ) : (
                    <div className={`p-2 rounded-lg text-white font-bold leading-none ${activeTheme.primary}`}>
                      ✂️
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold text-slate-900 truncate max-w-[160px]">
                      {nomeEmpresa.trim() || "Banho e Tosa Empresa"}
                    </div>
                    <div className="text-[9px] font-mono text-slate-400">
                      {fone.trim() || "(11) 4002-8922"}
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-150 pt-2 text-[10px] text-slate-400 font-mono truncate">
                  📍 {endereco.trim() || "Sem Endereço Configurado"}
                </div>
              </div>
              
              <p className="mt-3 text-[10px] text-slate-400 leading-normal">
                * O Nome da Empresa e o Telefone cadastrados serão carregados automaticamente no cabeçalho de todas as tabelas em substituição ao modelo padrão do sistema.
              </p>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-[10px] text-emerald-800 leading-normal font-medium flex gap-2">
              <AlertCircle className="h-5 w-5 text-emerald-600 flex-none" />
              <div>
                <strong className="block text-emerald-900 mb-1">Ambiente Isolado por ID</strong>
                Estes parâmetros de configuração estão gravados em segurança sob o ID do seu usuário dono, sem visibilidade cruzada para outros usuários em sessões simultâneas.
              </div>
            </div>

            {/* RESTAURAÇÃO DE BACKUP (.SQL / .TXT / .JSON) */}
            {db && onUpdateDbState && (
              <div className="space-y-4 pt-2">
                <SqlBackupRestore
                  currentUser={currentUser}
                  currentDb={db}
                  onUpdateDbState={onUpdateDbState}
                />
                <JsonBackupImporter
                  currentDb={db}
                  onUpdateDbState={onUpdateDbState}
                />
              </div>
            )}
          </div>

        </div>
      )}

      {activeSubTab === "equipe" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6 animate-fade-in text-xs font-sans">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <Users className="h-5 w-5 text-emerald-600" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Gerenciar Equipe / Colaboradores
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Cadastre e gerencie os acessos dos funcionários (Subusuários) vinculados à sua loja master.
              </p>
            </div>
          </div>

          <form onSubmit={handleAddEmployee} className="bg-slate-50 p-5 rounded-2xl border border-slate-150/70 space-y-4">
            <h4 className="text-[11px] font-extrabold uppercase font-mono text-emerald-850 flex items-center gap-1.5 border-b border-slate-200 pb-2">
              📝 Cadastro de Novo Colaborador
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
                  Nome do Colaborador (Usuário) *
                </label>
                <input
                  type="text"
                  required
                  value={newEmpNome}
                  onChange={(e) => setNewEmpNome(e.target.value)}
                  placeholder="Ex: joaosilva"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
                  Senha de Acesso *
                </label>
                <input
                  type="text"
                  required
                  value={newEmpSenha}
                  onChange={(e) => setNewEmpSenha(e.target.value)}
                  placeholder="Senha para login"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
                  Fone (Opcional)
                </label>
                <input
                  type="text"
                  value={newEmpFone}
                  onChange={(e) => setNewEmpFone(e.target.value)}
                  placeholder="Ex: (11) 98765-4321"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="sm:col-span-1 md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
                  Endereço (Opcional)
                </label>
                <input
                  type="text"
                  value={newEmpEndereco}
                  onChange={(e) => setNewEmpEndereco(e.target.value)}
                  placeholder="Ex: Rua das Flores, 123"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
                  Observações (Opcional)
                </label>
                <input
                  type="text"
                  value={newEmpObservacoes}
                  onChange={(e) => setNewEmpObservacoes(e.target.value)}
                  placeholder="Ex: Horário da tarde, folguista"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
                  Nível de Permissão *
                </label>
                <select
                  required
                  value={newEmpPermissionLevel}
                  onChange={(e) => setNewEmpPermissionLevel(Number(e.target.value))}
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value={1}>Nível 1 - Acesso Completo</option>
                  <option value={2}>Nível 2 - Operacional (Sem Financeiro/Caixa)</option>
                  <option value={3}>Nível 3 - Consulta e Pré-Venda</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className={`py-2 px-5 rounded-xl text-xs font-bold text-white shadow-xs flex items-center justify-center gap-1.5 cursor-pointer h-9 transition hover:opacity-95 ${activeTheme.primary}`}
              >
                <UserPlus className="h-4 w-4" />
                <span>Cadastrar Funcionário</span>
              </button>
            </div>
          </form>

          {/* Collaborators List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-2">
              🛡️ Lista da Equipe ({colaboradores.length})
            </h4>

            {colaboradores.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl text-slate-400 font-medium text-xs">
                Nenhum colaborador cadastrado ainda para esta conta master. Use o formulário acima para registrar novos funcionários!
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white text-xs">
                {colaboradores.map((worker) => {
                  const labelPermissao = worker.permission_level === 2
                    ? "Nível 2 - Operacional (Sem Financeiro/Caixa)"
                    : worker.permission_level === 3
                    ? "Nível 3 - Consulta e Pré-Venda"
                    : "Nível 1 - Acesso Completo";

                  const badgeColor = worker.permission_level === 2
                    ? "bg-indigo-50 border-indigo-150 text-indigo-800"
                    : worker.permission_level === 3
                    ? "bg-amber-50 border-amber-150 text-amber-800"
                    : "bg-emerald-50 border-emerald-150 text-emerald-800";

                  return (
                    <div key={worker.Id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold select-none border border-slate-200 font-sans">
                          👤
                        </div>
                        <div>
                          <div className="text-[11px] sm:text-xs font-bold text-slate-800 flex flex-wrap items-center gap-2">
                            <span>{worker.Nome}</span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 text-[9px] font-mono tracking-wider">
                              Subusuário
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wide border ${badgeColor}`}>
                              🔑 Permissão: {labelPermissao}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                            <span className="flex items-center gap-1"><Lock className="h-3 w-3 text-slate-350" /> Senha: <strong className="text-slate-600">{worker.Senha}</strong></span>
                            {worker.Fone && (
                              <span className="flex items-center gap-1"><Phone className="h-3 w-3 text-slate-350" /> Fone: <strong className="text-slate-600">{worker.Fone}</strong></span>
                            )}
                            {worker.Endereco && (
                              <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-slate-350" /> Endereço: <strong className="text-slate-600">{worker.Endereco}</strong></span>
                            )}
                            {worker.Observacoes && (
                              <span className="flex items-center gap-1 text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded text-[9px]">Obs: {worker.Observacoes}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleStartEditEmployee(worker)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50/80 border border-transparent hover:border-emerald-150 transition-all text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                          title="Editar Colaborador"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span>Editar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteEmployee(worker.Id, worker.Nome)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50/80 border border-transparent hover:border-red-150 transition-all text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                          title="Excluir Colaborador"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Excluir</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal - Editar Colaborador (Pop-up) */}
      {editingEmployee && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 select-none font-sans">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-scale-up flex flex-col max-h-[80vh]">
            
            <div className="bg-gradient-to-r from-emerald-600 to-indigo-600 px-6 py-4.5 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold tracking-tight text-sm">
                  Editar Cadastro do Colaborador
                </h3>
                <p className="text-[10px] text-emerald-100 uppercase tracking-wider font-mono">
                  Gerenciar dados de {editingEmployee.Nome}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingEmployee(null)}
                className="text-white hover:text-slate-150 text-sm font-semibold p-1 hover:bg-white/10 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditEmployee} className="flex flex-col flex-1 min-h-0">
              <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar text-xs flex-1">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
                    Nome do Colaborador (Usuário) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editEmpNome}
                    onChange={(e) => setEditEmpNome(e.target.value)}
                    placeholder="Ex: joaosilva"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
                    Senha de Acesso *
                  </label>
                  <input
                    type="text"
                    required
                    value={editEmpSenha}
                    onChange={(e) => setEditEmpSenha(e.target.value)}
                    placeholder="Senha para login"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
                    Fone (Opcional)
                  </label>
                  <input
                    type="text"
                    value={editEmpFone}
                    onChange={(e) => setEditEmpFone(e.target.value)}
                    placeholder="Ex: (11) 98765-4321"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
                    Endereço (Opcional)
                  </label>
                  <input
                    type="text"
                    value={editEmpEndereco}
                    onChange={(e) => setEditEmpEndereco(e.target.value)}
                    placeholder="Ex: Rua das Flores, 123"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
                    Observações (Opcional)
                  </label>
                  <input
                    type="text"
                    value={editEmpObservacoes}
                    onChange={(e) => setEditEmpObservacoes(e.target.value)}
                    placeholder="Ex: Horário da tarde, folguista"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
                    Nível de Permissão *
                  </label>
                  <select
                    required
                    value={editEmpPermissionLevel}
                    onChange={(e) => setEditEmpPermissionLevel(Number(e.target.value))}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white font-sans text-xs"
                  >
                    <option value={1}>Nível 1 - Acesso Completo</option>
                    <option value={2}>Nível 2 - Operacional (Sem Financeiro/Caixa)</option>
                    <option value={3}>Nível 3 - Consulta e Pré-Venda</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-2 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="px-4 py-2 text-[10px] font-bold rounded-xl text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
                >
                  Voltar / Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-[10px] font-bold rounded-xl text-white transition cursor-pointer ${activeTheme.primary}`}
                >
                  Salvar Cadastro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
