/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { CadUsuario, ThemeColor } from "../types";
import { Plus, Trash2, ShieldCheck, Lock, User, UserCheck, AlertTriangle, Database, ExternalLink, Server, Layers, Cpu } from "lucide-react";
import firebaseConfig from "../../firebase-applet-config.json";

interface UsersProps {
  usuarios: CadUsuario[];
  activeTheme: ThemeColor;
  currentUser: CadUsuario;
  onUpdateUsuarios: (updated: CadUsuario[]) => void;
  showConfirm: (title: string, msg: string, onConfirm: () => void) => void;
  showAlert: (title: string, msg: string) => void;
}

export default function UsersSheet({
  usuarios,
  activeTheme,
  currentUser,
  onUpdateUsuarios,
  showConfirm,
  showAlert,
}: UsersProps) {
  const [showAddModal, setShowAddModal] = useState(false);

  // Form input states
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [permissao, setPermissao] = useState<"Administrador" | "Usuário">("Usuário");
  const [segmento, setSegmento] = useState<"petshop" | "lavarapido" | "oficina">("petshop");
  const [tipoAssinatura, setTipoAssinatura] = useState<"Mensal" | "Teste" | "Vitalício">("Mensal");
  const [dataInicio, setDataInicio] = useState(() => new Date().toISOString().split("T")[0]);
  const [diasTeste, setDiasTeste] = useState(7);

  // Hierarchy input states
  const [nivelAcesso, setNivelAcesso] = useState<"Master" | "Subuser">("Subuser");
  const [selectedMasterId, setSelectedMasterId] = useState("");

  const [errorMsg, setErrorMsg] = useState("");

  // Reset scroll to 0 when opening add user modal on mobile
  React.useEffect(() => {
    if (showAddModal) {
      const timer = setTimeout(() => {
        const scrollables = document.querySelectorAll(".overflow-y-auto, [class*='overflow-y-auto']");
        scrollables.forEach((el) => {
          el.scrollTop = 0;
        });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [showAddModal]);

  // Block screen completely if user is not Administrator just in case
  const isAuthorized = currentUser && currentUser.Permissoes === "Administrador";

  // Isolate/filter users based on hierarchy
  const visibleUsuarios = useMemo(() => {
    if (currentUser.Nome === "carrera") {
      return usuarios;
    }
    return usuarios.filter(
      (u) => u.Id === currentUser.Id || u.IdUsuarioMaster === currentUser.Id
    );
  }, [usuarios, currentUser]);

  const masterUsersOptions = useMemo(() => {
    return usuarios.filter((u) => u.NivelAcesso === "Master" || !u.IdUsuarioMaster);
  }, [usuarios]);

  if (!isAuthorized) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-2xl flex flex-col items-center justify-center text-center gap-3">
        <AlertTriangle className="h-12 w-12 text-red-600 animate-bounce" />
        <h2 className="text-lg font-bold text-red-950 font-display">Acesso Estritamente Restrito</h2>
        <p className="text-xs text-red-700 max-w-md">
          Apenas usuários com a permissão de <strong>Administrador</strong> (como a conta principal <code className="bg-red-105 px-1 py-0.5 rounded text-red-800">carrera</code>) podem ler, editar ou cadastrar contas e logins no sistema.
        </p>
      </div>
    );
  }

  // Handle submissions
  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const cleanedName = nome.trim().toLowerCase();
    if (!cleanedName || !senha) return;

    // Duplicity check
    const exists = usuarios.some((u) => u.Nome.trim().toLowerCase() === cleanedName);
    if (exists) {
      setErrorMsg(`O login de usuário "${nome}" já se encontra em uso.`);
      return;
    }

    let finalValidade = "";
    let finalAssinatura = tipoAssinatura;

    if (permissao === "Administrador") {
      finalAssinatura = "Vitalício";
      finalValidade = "";
    } else if (tipoAssinatura === "Mensal") {
      const d = new Date(dataInicio + "T12:00:00");
      d.setDate(d.getDate() + 30);
      finalValidade = d.toISOString().split("T")[0];
    } else if (tipoAssinatura === "Teste") {
      const d = new Date(dataInicio + "T12:00:00");
      d.setDate(d.getDate() + Number(diasTeste || 1));
      finalValidade = d.toISOString().split("T")[0];
    }

    // Automatically bind master and subuser configurations
    const userRoleNivel = currentUser.Nome === "carrera" ? nivelAcesso : "Subuser";
    const masterBindingId = currentUser.Nome === "carrera"
      ? (nivelAcesso === "Subuser" ? selectedMasterId : "")
      : currentUser.Id;

    const newUser: CadUsuario = {
      Id: `user-${Date.now()}`,
      Nome: nome.trim(),
      Senha: senha,
      Permissoes: permissao,
      Segmento: segmento || "petshop",
      Tipo_Assinatura: finalAssinatura,
      Data_Inicio: dataInicio,
      Data_Validade: finalValidade,
      NivelAcesso: userRoleNivel,
      IdUsuarioMaster: masterBindingId,
    };

    onUpdateUsuarios([...usuarios, newUser]);

    setNome("");
    setSenha("");
    setPermissao("Usuário");
    setSegmento("petshop");
    setTipoAssinatura("Mensal");
    setDataInicio(new Date().toISOString().split("T")[0]);
    setDiasTeste(7);
    setNivelAcesso("Subuser");
    setSelectedMasterId("");
    setShowAddModal(false);
  };

  const handleCellChange = (id: string, field: keyof CadUsuario, value: any) => {
    const updated = usuarios.map((u) => {
      if (u.Id === id) {
        const updatedUser = { ...u, [field]: value };
        if (!updatedUser.Segmento) {
          updatedUser.Segmento = "petshop";
        }
        if (updatedUser.Permissoes === "Administrador") {
          updatedUser.Tipo_Assinatura = "Vitalício";
          updatedUser.Data_Validade = "";
        }
        return updatedUser;
      }
      return u;
    });
    onUpdateUsuarios(updated);
  };

  const handleDeleteUser = (id: string) => {
    // Prevent deletion of own login
    if (id === currentUser.Id) {
      showAlert("Operação Bloqueada", "Você não pode excluir a sua própria conta ativa em uso.");
      return;
    }

    const userToDelete = usuarios.find((u) => u.Id === id);
    if (userToDelete?.Nome === "carrera") {
      showAlert("Operação Bloqueada", "O administrador master padrão 'carrera' é de configuração protegida.");
      return;
    }

    showConfirm(
      "Confirmar Exclusão",
      "Deseja realmente excluir permanentemente do sistema este login de usuário cadastrado?",
      () => {
        onUpdateUsuarios(usuarios.filter((u) => u.Id !== id));
      }
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white p-5 rounded-2xl border border-slate-200 gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-md bg-indigo-50 text-indigo-700">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 font-mono">
              Consola de Privilégios (Admin única)
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-800">
            Administração de Usuários (CadUsuario)
          </h2>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className={`inline-flex items-center gap-1.5 px-4.5 py-2 rounded-xl text-xs font-semibold shadow-xs hover:shadow transition-all transform active:scale-95 cursor-pointer ${activeTheme.primary}`}
        >
          <Plus className="h-4 w-4" />
          Registrar Novo Usuário
        </button>
      </div>

      {/* Grid Box */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in-down">
        
        {/* Header summary */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs text-slate-505 font-mono flex items-center justify-between">
          <div className="font-semibold text-indigo-900">
            🔒 Logins Autorizados à Empresa
          </div>
          <div className="text-slate-400">
            Total de usuários ativos no escopo: {visibleUsuarios.length}
          </div>
        </div>

        {/* Dense Excel spreadsheet Table */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse table-fixed min-w-[1280px]">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-mono text-[10px] uppercase font-semibold">
                <th className="w-20 p-2 text-center border-r border-slate-200">ID</th>
                <th className="p-2 border-r border-slate-200">Nome de Usuário (Login)</th>
                <th className="w-36 p-2 border-r border-slate-200">Segmento</th>
                <th className="w-40 p-2 border-r border-slate-200">Senha Secreta</th>
                <th className="w-40 p-2 border-r border-slate-200">Nível de Permissão</th>
                {currentUser?.Nome === "carrera" && (
                  <th className="w-40 p-2 border-r border-slate-200">Hierarquia / Vínculo</th>
                )}
                <th className="w-36 p-2 border-r border-slate-200">Assinatura</th>
                <th className="w-36 p-2 border-r border-slate-200">Data Início</th>
                <th className="w-36 p-2 border-r border-slate-200">Validade</th>
                <th className="w-16 p-2 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-705 font-mono">
              {visibleUsuarios.map((row, idx) => (
                <tr
                  key={row.Id}
                  className={`hover:bg-slate-50/80 transition-colors group ${
                    idx % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                  }`}
                >
                  {/* ID COLUMN */}
                  <td className="p-2 border-r border-slate-100 text-center text-[10px] font-bold text-slate-400 bg-slate-50/30">
                    {row.Id.substring(5) || row.Id}
                  </td>

                  {/* USERNAME EDIT */}
                  <td className="p-1 border-r border-slate-100 text-slate-800 font-bold focus-within:ring-2 focus-within:ring-emerald-500/30">
                    <input
                      type="text"
                      disabled={row.Nome === "carrera"}
                      value={row.Nome}
                      onChange={(e) => handleCellChange(row.Id, "Nome", e.target.value)}
                      className={`w-full bg-transparent border-0 p-1 focus:outline-none text-xs font-bold text-slate-800 ${
                        row.Nome === "carrera" ? "cursor-not-allowed opacity-60" : ""
                      }`}
                      placeholder="Nome do usuário"
                    />
                  </td>

                  {/* SEGMENTO EDIT */}
                  <td className="p-1 border-r border-slate-100">
                    <select
                      value={row.Segmento || "petshop"}
                      onChange={(e) => handleCellChange(row.Id, "Segmento", e.target.value)}
                      className={`w-full bg-transparent border-0 p-1 focus:outline-none text-xs font-semibold font-mono rounded cursor-pointer ${
                        (row.Segmento || "petshop") === "lavarapido"
                          ? "text-sky-700 font-bold"
                          : "text-emerald-700 font-bold"
                      }`}
                    >
                      <option value="petshop">🐶 Pet Shop</option>
                      <option value="lavarapido">🚗 Lava Rápido</option>
                    </select>
                  </td>

                  {/* PASSWORD EDIT */}
                  <td className="p-1 border-r border-slate-100 text-slate-700 focus-within:ring-2 focus-within:ring-emerald-500/30">
                    <input
                      type="text"
                      value={row.Senha}
                      onChange={(e) => handleCellChange(row.Id, "Senha", e.target.value)}
                      className="w-full bg-transparent border-0 p-1 focus:outline-none text-xs text-slate-700 font-mono"
                      placeholder="Senha secreta de acesso"
                    />
                  </td>

                  {/* PERMISSIONS EDIT */}
                  <td className="p-1 border-r border-slate-100">
                    <select
                      disabled={row.Nome === "carrera"}
                      value={row.Permissoes}
                      onChange={(e) => handleCellChange(row.Id, "Permissoes", e.target.value)}
                      className={`w-full bg-transparent border-0 p-1 focus:outline-none text-xs text-slate-700 font-semibold font-mono ${
                        row.Nome === "carrera" ? "cursor-not-allowed opacity-60 font-medium" : ""
                      }`}
                    >
                      <option value="Administrador">🔑 Administrador</option>
                      <option value="Usuário">👤 Usuário Comum</option>
                    </select>
                  </td>

                  {/* HIERARCHY / BINDING LINK COL (Only visible if God Mode "carrera" is managing) */}
                  {currentUser?.Nome === "carrera" && (
                    <td className="p-1 border-r border-slate-100 bg-slate-50/20">
                      {row.Nome === "carrera" ? (
                        <span className="p-1 text-[10px] uppercase font-bold text-indigo-700 bg-indigo-100 rounded-md font-sans">
                          God Mode
                        </span>
                      ) : (
                        <div className="space-y-1">
                          <select
                            value={row.NivelAcesso || "Master"}
                            onChange={(e) => {
                              const nextNivel = e.target.value as "Master" | "Subuser";
                              onUpdateUsuarios(
                                usuarios.map((u) =>
                                  u.Id === row.Id
                                    ? {
                                        ...u,
                                        NivelAcesso: nextNivel,
                                        IdUsuarioMaster: nextNivel === "Master" ? "" : u.IdUsuarioMaster,
                                      }
                                    : u
                                )
                              );
                            }}
                            className="bg-transparent border-0 p-0 text-[10px] font-bold text-slate-700 focus:outline-none font-sans"
                          >
                            <option value="Master">👑 Master (Dono)</option>
                            <option value="Subuser">👤 Subusuário</option>
                          </select>

                          {(row.NivelAcesso === "Subuser" || row.IdUsuarioMaster) && (
                            <select
                              value={row.IdUsuarioMaster || ""}
                              onChange={(e) => {
                                const masterIdValue = e.target.value;
                                onUpdateUsuarios(
                                  usuarios.map((u) =>
                                    u.Id === row.Id
                                      ? {
                                          ...u,
                                          IdUsuarioMaster: masterIdValue,
                                          NivelAcesso: "Subuser",
                                        }
                                      : u
                                  )
                                );
                              }}
                              className="bg-transparent border-0 p-0 text-[9px] text-indigo-700 focus:outline-none font-bold"
                            >
                              <option value="">-- Escolher Master --</option>
                              {masterUsersOptions
                                .filter((mo) => mo.Id !== row.Id)
                                .map((mo) => (
                                  <option key={mo.Id} value={mo.Id}>
                                    Dono: {mo.Nome}
                                  </option>
                                ))}
                            </select>
                          )}
                        </div>
                      )}
                    </td>
                  )}

                  {/* TIPO ASSINATURA EDIT */}
                  <td className="p-1 border-r border-slate-100">
                    <select
                      disabled={row.Nome === "carrera" || row.Permissoes === "Administrador"}
                      value={row.Tipo_Assinatura || "Mensal"}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        const start = row.Data_Inicio || new Date().toISOString().split("T")[0];
                        let end = row.Data_Validade || "";
                        if (val === "Mensal") {
                          const d = new Date(start + "T12:00:00");
                          d.setDate(d.getDate() + 30);
                          end = d.toISOString().split("T")[0];
                        } else if (val === "Vitalício") {
                          end = "";
                        }
                        const updated = usuarios.map(u => {
                          if (u.Id === row.Id) {
                            return { ...u, Tipo_Assinatura: val, Data_Inicio: start, Data_Validade: end };
                          }
                          return u;
                        });
                        onUpdateUsuarios(updated);
                      }}
                      className={`w-full bg-transparent border-0 p-1 focus:outline-none text-xs text-slate-700 font-semibold font-mono ${
                        row.Nome === "carrera" ? "cursor-not-allowed opacity-60" : ""
                      }`}
                    >
                      <option value="Mensal">Mensal</option>
                      <option value="Teste">Teste</option>
                      <option value="Vitalício">Vitalício</option>
                    </select>
                  </td>

                  {/* DATA INICIO EDIT */}
                  <td className="p-1 border-r border-slate-100">
                    <input
                      type="date"
                      disabled={row.Nome === "carrera"}
                      value={row.Data_Inicio || ""}
                      onChange={(e) => {
                        const start = e.target.value;
                        let end = row.Data_Validade || "";
                        if (row.Tipo_Assinatura === "Mensal") {
                          const d = new Date(start + "T12:00:00");
                          d.setDate(d.getDate() + 30);
                          end = d.toISOString().split("T")[0];
                        }
                        const updated = usuarios.map(u => {
                          if (u.Id === row.Id) {
                            return { ...u, Data_Inicio: start, Data_Validade: end };
                          }
                          return u;
                        });
                        onUpdateUsuarios(updated);
                      }}
                      className={`w-full bg-transparent border-0 p-1 focus:outline-none text-xs text-slate-705 font-mono ${
                        row.Nome === "carrera" ? "cursor-not-allowed opacity-60" : ""
                      }`}
                    />
                  </td>

                  {/* DATA VALIDADE EDIT */}
                  <td className="p-1 border-r border-slate-100">
                    <input
                      type="date"
                      disabled={row.Nome === "carrera" || row.Tipo_Assinatura === "Vitalício" || row.Tipo_Assinatura === "Mensal"}
                      value={row.Data_Validade || ""}
                      onChange={(e) => handleCellChange(row.Id, "Data_Validade", e.target.value)}
                      className={`w-full bg-transparent border-0 p-1 focus:outline-none text-xs text-slate-705 font-mono ${
                        row.Nome === "carrera" || row.Tipo_Assinatura === "Vitalício" || row.Tipo_Assinatura === "Mensal"
                          ? "opacity-40 cursor-not-allowed text-slate-400"
                          : "font-semibold text-indigo-700"
                      }`}
                      placeholder={row.Tipo_Assinatura === "Vitalício" ? "Sem limite" : "Data de validade"}
                    />
                  </td>

                  {/* ACTIONS */}
                  <td className="p-1 text-center align-middle">
                    <button
                      type="button"
                      disabled={row.Id === currentUser.Id || row.Nome === "carrera"}
                      onClick={() => handleDeleteUser(row.Id)}
                      className={`p-1 rounded-lg transition font-sans ${
                        row.Id === currentUser.Id || row.Nome === "carrera"
                          ? "text-slate-200 cursor-not-allowed"
                          : "text-slate-400 hover:text-red-500 hover:bg-red-50 cursor-pointer"
                      }`}
                      title={row.Id === currentUser.Id ? "Você mesmo" : "Excluir Usuário"}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer help */}
        <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-400 font-mono text-center">
          * Apenas o login "carrera" (Tesla-Administrador) pode acessar este painel. Cada novo Usuário cadastrado terá seu próprio banco de Pets, Relatórios e Agenda isolados automaticamente!
        </div>
      </div>

      {/* Visualizer card for Firebase Firestore Console configuration and database path */}
      <div className="bg-slate-900 text-slate-100 rounded-3xl border border-slate-800 shadow-xl overflow-hidden animate-fade-in-down">
        {/* Card Header */}
        <div className="p-6 bg-slate-955 border-b border-slate-80/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Database className="h-5 w-5 animate-pulse" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black tracking-tight text-white uppercase">
                  Console e Conexão Firestore
                </h3>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 uppercase font-mono tracking-wider">
                  conectado
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                Caminho focado no console do Cloud Firestore da conta do cliente
              </p>
            </div>
          </div>

          <a
            href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId || "(default)"}/data`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold text-xs shadow-md transition-all self-start sm:self-auto cursor-pointer"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir no Firebase Console
          </a>
        </div>

        {/* Card Content & Diagnostics Grid */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Project ID Card */}
            <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/80 flex items-start gap-3">
              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg shrink-0">
                <Server className="h-4 w-4" />
              </div>
              <div className="space-y-1 overflow-hidden">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                  ID do Projeto (Project ID)
                </span>
                <span className="block text-xs font-mono font-bold text-slate-200 truncate select-all" title={firebaseConfig.projectId}>
                  {firebaseConfig.projectId}
                </span>
              </div>
            </div>

            {/* Database Name Card */}
            <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/80 flex items-start gap-3">
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg shrink-0">
                <Database className="h-4 w-4" />
              </div>
              <div className="space-y-1 overflow-hidden">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                  ID do Banco de Dados (Database ID)
                </span>
                <span className="block text-xs font-mono font-bold text-amber-400 truncate select-all" title={firebaseConfig.firestoreDatabaseId || "(default)"}>
                  {firebaseConfig.firestoreDatabaseId || "(default)"}
                </span>
              </div>
            </div>

            {/* Logical Resource Name Arc */}
            <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/80 flex items-start gap-3">
              <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg shrink-0">
                <Cpu className="h-4 w-4" />
              </div>
              <div className="space-y-1 overflow-hidden w-full">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                  Caminho do Recurso no Google Cloud
                </span>
                <span className="block text-[10.5px] font-mono text-sky-300 truncate select-all font-semibold" title={`projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId || "(default)"}`}>
                  projects/{firebaseConfig.projectId}/databases/{firebaseConfig.firestoreDatabaseId || "(default)"}
                </span>
              </div>
            </div>

          </div>

          {/* Deep Path and Schematic Section */}
          <div className="bg-slate-950 rounded-2xl border border-slate-850 p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-900 text-xs">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-slate-400" />
                <span className="font-bold text-slate-200 font-sans">Mapeamento de Coleções do Banco</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">Regras de Segurança: Ativas</span>
            </div>

            <div className="space-y-3 font-mono text-[11px] leading-relaxed">
              
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-slate-300 font-bold text-xs">
                  <span className="text-amber-400 text-xs font-bold font-mono">/configs/{"{userId}"}</span>
                  <span className="text-[9px] bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded">Metadata</span>
                </div>
                <p className="text-slate-400 text-[10.5px] font-sans">
                  Armazena as configurações e personalizações estéticas e corporativas de logotipo e cabeçalhos (CadInfoConta) por usuário dono.
                </p>
                <div className="text-[9px] text-slate-500 mt-1 select-all">
                  Localização: configs &gt; user_uuid
                </div>
              </div>

              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-slate-300 font-bold text-xs">
                  <span className="text-amber-400 text-xs font-bold font-mono">/backups/{"{userId}"}</span>
                  <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded">Database payload</span>
                </div>
                <p className="text-slate-400 text-[10.5px] font-sans">
                  Salva o backup consolidado com criptografia ou compactação contendo todo o estado relacional local de clientes, pets, serviços e agendamentos.
                </p>
                <div className="text-[9px] text-slate-500 mt-1 select-all">
                  Localização: backups &gt; user_uuid
                </div>
              </div>

            </div>

            {/* Direct Copyable Console link and instruction box */}
            <div className="p-3.5 bg-slate-900/40 border border-dashed border-slate-800 rounded-xl">
              <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1 font-mono">
                Caminho / URL de Visualização de dados no Firebase console:
              </span>
              <div className="flex items-center justify-between bg-slate-950 p-2 rounded-lg border border-slate-800 gap-4 text-[10px] font-mono leading-none">
                <span className="text-slate-300 truncate select-all">{`https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId || "(default)"}/data`}</span>
                <a
                  href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId || "(default)"}/data`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-500 hover:text-amber-400 font-bold shrink-0 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Ir
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Modal - Adicionar Usuário */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 select-none">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-scale-up flex flex-col max-h-[80vh]">
            
            <div className="bg-gradient-to-r from-emerald-600 to-indigo-600 px-6 py-4.5 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold font-display tracking-tight text-base">
                  Registrar Novo Usuário
                </h3>
                <p className="text-[10px] text-emerald-100 uppercase tracking-wider font-mono">
                  Sessões Multi-Usuários (CadUsuario)
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

            <form onSubmit={handleAddUser} className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-[11px] font-medium font-sans">
                  ⚠️ {errorMsg}
                </div>
              )}

              {/* Login Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                  Login de Usuário
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: joao_tosador"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                  Senha Secreta
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Defina uma senha"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none"
                  />
                </div>
              </div>

              {/* Permissão Class */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                  Privilégio de Acesso
                </label>
                <select
                  value={permissao}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setPermissao(val);
                    if (val === "Administrador") {
                      setTipoAssinatura("Vitalício");
                    }
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none"
                >
                  <option value="Usuário">👤 Usuário Comum (Vê apenas seus próprios registros)</option>
                  <option value="Administrador">🔑 Administrador Geral (Vê tudo e gerencia usuários)</option>
                </select>
              </div>

              {/* Segmento / Tipo de Negócio */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                  Segmento (Tipo de Negócio) <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={segmento}
                  onChange={(e) => setSegmento(e.target.value as "petshop" | "lavarapido")}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-semibold"
                >
                  <option value="petshop">🐶 Pet Shop</option>
                  <option value="lavarapido">🚗 Lava Rápido</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1 font-sans">
                  Define o nicho operacional de atuação da conta (padrão: Pet Shop).
                </p>
              </div>

              {/* HIERARCHY SETUP (Only visible if God Mode "carrera" is registering a user) */}
              {currentUser?.Nome === "carrera" && (
                <div className="space-y-4 p-3 bg-indigo-50/40 rounded-2xl border border-indigo-100">
                  <div>
                    <label className="block text-[10.5px] font-bold text-indigo-950 mb-1.5 uppercase font-mono tracking-wider">
                      Hierarquia da Conta
                    </label>
                    <select
                      value={nivelAcesso}
                      onChange={(e) => {
                        const val = e.target.value as "Master" | "Subuser";
                        setNivelAcesso(val);
                        if (val === "Subuser" && masterUsersOptions.length > 0 && !selectedMasterId) {
                          setSelectedMasterId(masterUsersOptions[0].Id);
                        }
                      }}
                      className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-indigo-900 text-xs font-bold focus:outline-none"
                    >
                      <option value="Master">👑 Master (Dono de Pet Shop/Franquia)</option>
                      <option value="Subuser">👤 Subusuário (Funcionário/Equipe auxiliadora)</option>
                    </select>
                  </div>

                  {nivelAcesso === "Subuser" && (
                    <div>
                      <label className="block text-[10px] font-bold text-indigo-750 mb-1 uppercase font-mono tracking-wider">
                        Vincular ao Master / Dono
                      </label>
                      <select
                        required
                        value={selectedMasterId}
                        onChange={(e) => setSelectedMasterId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-indigo-900 text-xs focus:outline-none font-semibold"
                      >
                        <option value="">-- Escolher Master --</option>
                        {masterUsersOptions.map((mo) => (
                          <option key={mo.Id} value={mo.Id}>
                            Dono: {mo.Nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Tipo de Assinatura */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                  Tipo de Assinatura
                </label>
                <select
                  value={tipoAssinatura}
                  disabled={permissao === "Administrador"}
                  onChange={(e) => setTipoAssinatura(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="Mensal">Mensal (30 Dias)</option>
                  <option value="Teste">Teste (Dias especificáveis)</option>
                  <option value="Vitalício">Vitalício (Sem validade)</option>
                </select>
              </div>

              {/* Data de Início */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                  Data de Início
                </label>
                <input
                  type="date"
                  required
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none"
                />
              </div>

              {/* Dias de Teste (Visible only if Teste chosen) */}
              {tipoAssinatura === "Teste" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase font-mono tracking-wider">
                    Quantidade de Dias de Teste
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    required
                    value={diasTeste}
                    onChange={(e) => setDiasTeste(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none"
                  />
                </div>
              )}

              {/* Submit Buttons */}
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
                  Registrar Login
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
