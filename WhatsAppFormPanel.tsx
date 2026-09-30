import React, { useState, useEffect } from "react";
import { db } from "../utils/firebase";
import {
  getLocalFormQuestions,
  saveLocalFormQuestions,
  getLocalAtendimentos,
  saveLocalAtendimentos,
  upsertLocalAtendimento,
  deleteLocalAtendimento
} from "../utils/whatsappStorage";
import { DEFAULT_FORM_QUESTIONS } from "../data/initDb";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  query,
  orderBy
} from "firebase/firestore";
import {
  MessageSquare,
  Plus,
  Trash2,
  Edit2,
  Share2,
  CheckCircle2,
  Clock,
  Eye,
  X,
  Copy,
  PlusCircle,
  HelpCircle,
  Smartphone,
  Check,
  User,
  Heart
} from "lucide-react";

interface WhatsAppFormPanelProps {
  dbBackup: any; // Local store or states
  activeTheme: {
    primary: string;
    text: string;
    accent: string;
    border: string;
  };
  showConfirm?: (
    title: string,
    description: string,
    onConfirm: () => void,
    onCancel?: () => void,
    confirmText?: string,
    cancelText?: string,
    confirmClass?: string,
    cancelClass?: string
  ) => void;
  showAlert?: (title: string, description: string) => void;
  userPermissionLevel?: number;
}

export interface Question {
  Id: string;
  Texto: string;
  Tipo: "Texto" | "Sim/Não" | "Opções";
  Opcoes?: string; // Comma-separated list like "Curto, Longo"
  Ordem: number;
}

export interface PetResponse {
  nome: string;
  raca: string;
  idade: string;
  pelo: string;
  temperamento: string;
  cuidado: string;
  alergico: string;
  servico: string;
}

export interface LinkRecord {
  Id: string;
  TutorNome: string;
  TutorTelefone: string;
  Status: "Pendente" | "Concluído";
  CreatedAt: string;
  CompletedAt?: string;
  Respostas?: { [questionId: string]: string };
  Pets?: PetResponse[];
  TutorEndereco?: string;
  TutorLevaTraz?: string;
}

export default function WhatsAppFormPanel({ dbBackup, activeTheme, showConfirm, showAlert, userPermissionLevel = 1 }: WhatsAppFormPanelProps) {
  // Questions states
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionType, setNewQuestionType] = useState<"Texto" | "Sim/Não" | "Opções">("Texto");
  const [newQuestionOptions, setNewQuestionOptions] = useState("");
  const [loadingQuestions, setLoadingQuestions] = useState(true);

  // Atendimentos links states
  const [links, setLinks] = useState<LinkRecord[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(true);
  
  // Link generation states
  const [tutorNome, setTutorNome] = useState("");
  const [tutorTelefone, setTutorTelefone] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  
  // Modal view states
  const [selectedLinkRecord, setSelectedLinkRecord] = useState<LinkRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCreatingQuestion, setIsCreatingQuestion] = useState(false);
  const [lastGeneratedLink, setLastGeneratedLink] = useState<string | null>(null);

  // Reset scroll to 0 when opening form responses modal on mobile
  useEffect(() => {
    if (selectedLinkRecord) {
      const timer = setTimeout(() => {
        const scrollables = document.querySelectorAll(".overflow-y-auto, [class*='overflow-y-auto']");
        scrollables.forEach((el) => {
          el.scrollTop = 0;
        });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [selectedLinkRecord]);

  // Firestore collections paths
  const QUE_COLL = "form_questions";
  const AT_COLL = "atendimentos_form";

  // Load questions and set up real-time subscription for link status tracking
  useEffect(() => {
    // 1. Carrega imediatamente do armazenamento local estruturado (offline-first)
    const localQ = getLocalFormQuestions();
    setQuestions(localQ);
    setLoadingQuestions(false);

    const localL = getLocalAtendimentos();
    setLinks(localL);
    setLoadingLinks(false);

    // 2. Sincronização secundária com Firestore se disponível
    try {
      const qQuery = query(collection(db, QUE_COLL));
      const unsubscribeQuestions = onSnapshot(qQuery, async (snapshot) => {
        if (!snapshot.empty) {
          const qList: Question[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            qList.push({
              Id: docSnap.id,
              Texto: data.Texto || "",
              Tipo: data.Tipo || "Texto",
              Opcoes: data.Opcoes || "",
              Ordem: data.Ordem || 0
            });
          });
          qList.sort((a, b) => a.Ordem - b.Ordem);
          setQuestions(qList);
          saveLocalFormQuestions(qList);
        }
      }, (error) => {
        console.warn("Aviso: operando com perguntas em modo local offline:", error);
      });

      const lQuery = query(collection(db, AT_COLL));
      const unsubscribeLinks = onSnapshot(lQuery, (snapshot) => {
        if (!snapshot.empty) {
          const lList: LinkRecord[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            lList.push({
              Id: docSnap.id,
              TutorNome: data.TutorNome || "",
              TutorTelefone: data.TutorTelefone || "",
              Status: data.Status || "Pendente",
              CreatedAt: data.CreatedAt || "",
              CompletedAt: data.CompletedAt || "",
              Respostas: data.Respostas || {},
              Pets: data.Pets || [],
              TutorEndereco: data.TutorEndereco || "",
              TutorLevaTraz: data.TutorLevaTraz || ""
            });
          });
          lList.sort((a, b) => b.CreatedAt.localeCompare(a.CreatedAt));
          setLinks(lList);
          saveLocalAtendimentos(lList);
        }
      }, (error) => {
        console.warn("Aviso: operando com links em modo local offline:", error);
      });

      return () => {
        unsubscribeQuestions();
        unsubscribeLinks();
      };
    } catch (e) {
      console.warn("Firestore offline: operando 100% via armazenamento local.");
    }
  }, []);

  // Sync client select changes
  const handleClientSelectChange = (clientId: string) => {
    setSelectedClient(clientId);
    if (clientId) {
      const found = dbBackup.clientes.find((c: any) => c.Id === clientId);
      if (found) {
        setTutorNome(found.Nome);
        setTutorTelefone(found.Telefone || "");
      }
    } else {
      setTutorNome("");
      setTutorTelefone("");
    }
  };

  // Reset all questions dynamically to standard requested default (fixed questions)
  const handleResetToDefaultQuestions = async () => {
    if (userPermissionLevel === 3) {
      if (showAlert) showAlert("Acesso Restrito 🔒", "Nível de permissão 3 (Consulta e Pré-Venda) não autoriza edições de templates.");
      return;
    }
    const action = async () => {
      try {
        setLoadingQuestions(true);
        // Define as 8 perguntas padrão no armazenamento local
        const defaults: Question[] = DEFAULT_FORM_QUESTIONS.map((q, idx) => ({
          Id: `q-${idx + 1}`,
          Texto: q.Texto,
          Tipo: q.Tipo,
          Opcoes: q.Opcoes,
          Ordem: q.Ordem,
        }));

        setQuestions(defaults);
        saveLocalFormQuestions(defaults);

        // Opcional: tenta atualizar Firestore se online
        try {
          const qSnap = await getDocs(query(collection(db, QUE_COLL)));
          for (const d of qSnap.docs) {
            await deleteDoc(doc(db, QUE_COLL, d.id));
          }
          for (const item of defaults) {
            await setDoc(doc(db, QUE_COLL, item.Id), item);
          }
        } catch (fbErr) {
          console.warn("Aviso: Firestore offline, perguntas redefinidas localmente:", fbErr);
        }
      } catch (err) {
        console.error("Erro ao redefinir perguntas:", err);
      } finally {
        setLoadingQuestions(false);
      }
    };

    if (showConfirm) {
      showConfirm(
        "Redefinir Campos do Formulário?",
        "Deseja redefinir os campos do formulário para os 8 campos fixos padrão solicitado? Isso substituirá todas as perguntas cadastradas atualmente.",
        action
      );
    } else {
      if (confirm("Deseja redefinir os campos do formulário para os 8 campos fixos padrão solicitado? Isso substituirá as perguntas cadastradas atualmente.")) {
        action();
      }
    }
  };

  // Generate Unique WhatsApp Pre-Registration Atendimento Link
  const handleGenerateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tutorNome.trim()) return;

    // Create unique ID (UUID style representation)
    const uniqueId = `form-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const nowStr = new Date().toISOString();

    const newRecord: LinkRecord = {
      Id: uniqueId,
      TutorNome: tutorNome,
      TutorTelefone: tutorTelefone,
      Status: "Pendente",
      CreatedAt: nowStr
    };

    // 1. Salva imediatamente no banco local estruturado (offline-first)
    upsertLocalAtendimento(newRecord);
    setLinks((prev) => [newRecord, ...prev.filter((l) => l.Id !== uniqueId)]);

    // 2. Opcional: persiste no Firestore se online
    try {
      setDoc(doc(db, AT_COLL, uniqueId), newRecord).catch((err) => {
        console.warn("Aviso: link salvo no banco local (Firestore offline):", err);
      });
    } catch (fbErr) {
      console.warn("Aviso ao sincronizar link com Firestore:", fbErr);
    }

    // Construct dynamic full access URL
    const fullLink = `${window.location.origin}${window.location.pathname}?idAtendimento=${uniqueId}`;
    setLastGeneratedLink(fullLink);

    // Copy automatically to clipboard
    try {
      await navigator.clipboard.writeText(fullLink);
    } catch (clipboardErr) {
      console.warn("Could not write to clipboard automatically:", clipboardErr);
    }

    // Open WhatsApp text composer
    const wppMessage = `Olá, ${tutorNome}! 🐾 Por favor, preencha a ficha cadastral rápida do seu Pet clicando neste link único antes da consulta: ${fullLink}`;
    
    // Filter phone string to contain only digits
    const cleanPhone = tutorTelefone.replace(/\D/g, "");
    const wppUrl = cleanPhone 
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(wppMessage)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(wppMessage)}`;

    // Reset fields
    setTutorNome("");
    setTutorTelefone("");
    setSelectedClient("");

    // Open message in new tab
    window.open(wppUrl, "_blank", "noopener,noreferrer");
  };

  // Add or Update Question
  const handleUpsertQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userPermissionLevel === 3) {
      if (showAlert) showAlert("Acesso Restrito 🔒", "Nível de permissão 3 (Consulta e Pré-Venda) não autoriza edições de templates.");
      return;
    }
    if (!newQuestionText.trim()) return;

    try {
      if (editingQuestion) {
        // Edit existing
        const updated: Question = {
          ...editingQuestion,
          Texto: newQuestionText,
          Tipo: newQuestionType,
          Opcoes: newQuestionType === "Opções" ? newQuestionOptions : ""
        };
        const updatedList = questions.map((q) => (q.Id === editingQuestion.Id ? updated : q));
        setQuestions(updatedList);
        saveLocalFormQuestions(updatedList);
        setEditingQuestion(null);

        try {
          setDoc(doc(db, QUE_COLL, editingQuestion.Id), updated).catch(() => {});
        } catch {}
      } else {
        // Create new
        const newId = `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const order = questions.length > 0 ? Math.max(...questions.map(q => q.Ordem)) + 1 : 1;
        const fresh: Question = {
          Id: newId,
          Texto: newQuestionText,
          Tipo: newQuestionType,
          Opcoes: newQuestionType === "Opções" ? newQuestionOptions : "",
          Ordem: order
        };
        const updatedList = [...questions, fresh].sort((a, b) => a.Ordem - b.Ordem);
        setQuestions(updatedList);
        saveLocalFormQuestions(updatedList);

        try {
          setDoc(doc(db, QUE_COLL, newId), fresh).catch(() => {});
        } catch {}
      }

      // Reset
      setNewQuestionText("");
      setNewQuestionType("Texto");
      setNewQuestionOptions("");
      setIsCreatingQuestion(false);
    } catch (err) {
      console.error("Error upserting question:", err);
    }
  };

  // Delete Question
  const handleDeleteQuestion = async (id: string) => {
    if (userPermissionLevel === 3) {
      if (showAlert) showAlert("Acesso Restrito 🔒", "Nível de permissão 3 (Consulta e Pré-Venda) não autoriza edições de templates.");
      return;
    }
    const action = async () => {
      try {
        const filtered = questions.filter((q) => q.Id !== id);
        setQuestions(filtered);
        saveLocalFormQuestions(filtered);

        try {
          deleteDoc(doc(db, QUE_COLL, id)).catch(() => {});
        } catch {}
      } catch (err) {
        console.error("Error deleting question:", err);
      }
    };

    if (showConfirm) {
      showConfirm(
        "Remover Pergunta",
        "Deseja realmente remover esta pergunta do formulário?",
        action
      );
    } else {
      if (confirm("Deseja realmente remover esta pergunta do formulário?")) {
        action();
      }
    }
  };

  // Copy Link directly to clipboard
  const handleCopyLinkToClipboard = (id: string) => {
    const fullLink = `${window.location.origin}${window.location.pathname}?idAtendimento=${id}`;
    navigator.clipboard.writeText(fullLink);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Clean form responses tracking log
  const handleDeleteLinkRecord = async (id: string) => {
    if (userPermissionLevel === 3) {
      if (showAlert) showAlert("Acesso Restrito 🔒", "Nível de permissão 3 (Consulta e Pré-Venda) não autoriza remoções.");
      return;
    }
    const action = async () => {
      try {
        deleteLocalAtendimento(id);
        setLinks((prev) => prev.filter((l) => l.Id !== id));

        try {
          deleteDoc(doc(db, AT_COLL, id)).catch(() => {});
        } catch {}
      } catch (err) {
        console.error("Error deleting link record:", err);
      }
    };

    if (showConfirm) {
      showConfirm(
        "Excluir Link",
        "Remover o registro de envio deste link? Isso apagará também as respostas de forma definitiva.",
        action
      );
    } else {
      if (confirm("Remover o registro de envio deste link? Isso apagará também as respostas.")) {
        action();
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Header section with instructions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-emerald-600 rounded-xl text-white shadow-xs">
              <MessageSquare className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              Fichas Técnicas Integradas (WhatsApp Link)
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Envie links únicos de formulários dinâmicos via WhatsApp para pré-cadastro de pets. As respostas salvam diretamente no Firebase.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Question Builder & Link Generator (6 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* LINK GENERATION CARD */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
              <Smartphone className="h-4.5 w-4.5 text-indigo-600" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                Gerar Ficha e Link WhatsApp
              </h2>
            </div>

            <form onSubmit={handleGenerateLink} className="space-y-3">
              {/* Typed tutor name */}
              <div>
                <label className="block text-[9px] font-bold text-slate-500 mb-1 uppercase font-mono tracking-wider">
                  Nome do Tutor / Responsável *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome completo do cliente"
                  value={tutorNome}
                  onChange={(e) => setTutorNome(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-250 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/15 focus:border-indigo-600 transition"
                />
              </div>

              {/* Tutor Telegram/WhatsApp Phone */}
              <div>
                <label className="block text-[9px] font-bold text-slate-500 mb-1 uppercase font-mono tracking-wider">
                  WhatsApp com DDD (Ex: 11999998888)
                </label>
                <input
                  type="tel"
                  placeholder="Apenas números se desejar disparo direto"
                  value={tutorTelefone}
                  onChange={(e) => setTutorTelefone(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-250 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/15 focus:border-indigo-600 transition font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 font-bold text-white text-[11px] rounded-xl transition active:scale-95 cursor-pointer shadow-3xs flex items-center justify-center gap-2 uppercase tracking-wider"
              >
                <Share2 className="h-3.5 w-3.5" />
                Gerar e Enviar via WhatsApp
              </button>
            </form>

            {/* Link generation feedback alert */}
            {lastGeneratedLink && (
              <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2 text-xs text-indigo-900 animate-slide-in">
                <div className="flex items-start justify-between">
                  <div className="flex gap-2">
                    <CheckCircle2 className="h-4.5 w-4.5 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Link gerado com sucesso!</p>
                      <p className="text-[10px] text-indigo-600">Além de abrir o WhatsApp, o link único foi copiado automaticamente para sua área de transferência.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setLastGeneratedLink(null)}
                    className="text-indigo-400 hover:text-indigo-600 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-1 bg-white p-1.5 rounded-lg border border-indigo-100">
                  <input
                    type="text"
                    readOnly
                    value={lastGeneratedLink}
                    className="w-full text-[9px] font-mono text-slate-700 bg-transparent border-none outline-none"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(lastGeneratedLink);
                      if (showAlert) {
                        showAlert("Link Copiado", "Link copiado de forma manual para a área de transferência!");
                      } else {
                        alert("Link copiado de forma manual!");
                      }
                    }}
                    className="p-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[9px] font-bold font-mono px-1.5 shrink-0"
                  >
                    Copiar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* DYNAMIC QUESTIONS MANAGER */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4.5 w-4.5 text-amber-600" />
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                  Perguntas do Formulário
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetToDefaultQuestions}
                  className="text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer transition font-mono border border-rose-200 bg-rose-50/40 px-1.5 py-0.5 rounded"
                  title="Restaurar as perguntas para os campos fixos padrão do sistema"
                >
                  Carregar Padrão Fixos
                </button>
                {!isCreatingQuestion && !editingQuestion && (
                  <button
                    type="button"
                    onClick={() => setIsCreatingQuestion(true)}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer transition font-mono border border-indigo-200 bg-indigo-50/40 px-1.5 py-0.5 rounded"
                  >
                    <PlusCircle className="h-3.5 w-3.5" /> Adicionar
                  </button>
                )}
              </div>
            </div>

            {/* In-Line Editing or Addition mode */}
            {(isCreatingQuestion || editingQuestion) && (
              <form onSubmit={handleUpsertQuestion} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider">
                    {editingQuestion ? "Editar Pergunta" : "Nova Pergunta"}
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingQuestion(false);
                      setEditingQuestion(null);
                      setNewQuestionText("");
                      setNewQuestionType("Texto");
                      setNewQuestionOptions("");
                    }}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div>
                  <label className="block text-[8px] font-bold text-slate-500 mb-0.5 uppercase font-mono tracking-wider">
                    Texto da Pergunta *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Qual o temperamento do animal?"
                    value={newQuestionText}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-slate-250 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/15 focus:border-indigo-600 transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[8px] font-bold text-slate-500 mb-0.5 uppercase font-mono tracking-wider">
                      Tipo de Campo
                    </label>
                    <select
                      value={newQuestionType}
                      onChange={(e) => setNewQuestionType(e.target.value as any)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-250 rounded-lg text-xs text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="Texto">Texto Livre</option>
                      <option value="Sim/Não">Sim / Não (Toggle)</option>
                      <option value="Opções">Múltiplas Opções (Seleção)</option>
                    </select>
                  </div>

                  {newQuestionType === "Opções" && (
                    <div>
                      <label className="block text-[8px] font-bold text-slate-500 mb-0.5 uppercase font-mono tracking-wider">
                        Opções (separe com vírgula)
                      </label>
                      <input
                        type="text"
                        placeholder="Curto, Longo, Médio"
                        value={newQuestionOptions}
                        onChange={(e) => setNewQuestionOptions(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-250 rounded-lg text-xs text-slate-800 focus:outline-none font-mono text-[10px]"
                      />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 font-bold text-white text-[10px] rounded-lg transition"
                >
                  {editingQuestion ? "Salvar Alteração" : "Inserir no Questionário"}
                </button>
              </form>
            )}

            {/* Render questions list */}
            {loadingQuestions ? (
              <p className="text-[10px] text-slate-400 font-mono italic animate-pulse">Carregando perguntas...</p>
            ) : (
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto custom-scrollbar">
                {questions.map((q) => (
                  <div key={q.Id} className="flex items-center justify-between p-2 hover:bg-slate-50 border border-slate-100 rounded-xl transition">
                    <div className="space-y-0.5 max-w-[75%]">
                      <span className="text-xs font-bold text-slate-800 leading-tight block truncate">
                        {q.Texto}
                      </span>
                      <span className="text-[9px] font-mono font-semibold text-slate-400 uppercase tracking-widest bg-slate-100 px-1 py-0.2 rounded-md">
                        {q.Tipo === "Opções" ? `Opções: ${q.Opcoes}` : q.Tipo}
                      </span>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditingQuestion(q);
                          setNewQuestionText(q.Texto);
                          setNewQuestionType(q.Tipo);
                          setNewQuestionOptions(q.Opcoes || "");
                          setIsCreatingQuestion(false);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                        title="Editar pergunta"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(q.Id)}
                        className="p-1 text-slate-400 hover:text-red-650 rounded transition cursor-pointer"
                        title="Remover pergunta"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: SENT LINKS MONITORING GRID (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Eye className="h-4.5 w-4.5 text-emerald-600" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                Links Enviados e Monitoramento de Respostas
              </h2>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {links.length} Envios
            </span>
          </div>

          {loadingLinks ? (
            <div className="p-8 text-center text-slate-400 animate-pulse font-mono text-xs">
              Carregando status em tempo real do Firebase...
            </div>
          ) : links.length === 0 ? (
            <div className="p-10 text-center border border-dashed border-slate-200 rounded-xl space-y-2">
              <Clock className="h-8 w-8 text-slate-350 mx-auto" />
              <h4 className="text-xs font-semibold text-slate-600">Nenhum formulário gerado ainda</h4>
              <p className="text-[10.5px] text-slate-400 max-w-xs mx-auto">
                Use o painel ao lado esquerdo para preencher o tutor e gerar links customizados para envio pelo WhatsApp.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[460px] overflow-y-auto custom-scrollbar">
              {links.map((link) => {
                const isPendente = link.Status === "Pendente";
                const dateRaw = new Date(link.CreatedAt);
                const isToday = new Date().toDateString() === dateRaw.toDateString();
                const timeStr = dateRaw.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                const dateStr = dateRaw.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
                const phoneDigits = link.TutorTelefone.replace(/\D/g, "");

                return (
                  <div
                    key={link.Id}
                    className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition min-w-0 ${
                      isPendente 
                        ? "border-red-100 bg-red-50/20 hover:bg-red-50/45" 
                        : "border-emerald-100 bg-emerald-50/10 hover:bg-emerald-50/30"
                    }`}
                  >
                    {/* User & Date Identification Block */}
                    <div className="space-y-1 block min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isPendente ? (
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping shrink-0" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        )}
                        <h3 className="text-xs font-bold text-slate-800 truncate" title={link.TutorNome}>
                          {link.TutorNome}
                        </h3>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9.5px] font-mono text-slate-450 font-medium">
                        <span className="bg-slate-100 px-1 rounded">
                          {isToday ? `Hoje às ${timeStr}` : `${dateStr} às ${timeStr}`}
                        </span>
                        {link.TutorTelefone && (
                          <span className="bg-slate-100 px-1 rounded truncate max-w-28 text-slate-500">
                            {link.TutorTelefone}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status Pill and Actions Block */}
                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                      {/* RED ENVIADO / GREEN RECEBIDO INDICATOR */}
                      <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isPendente 
                          ? "bg-red-100 text-red-750" 
                          : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {isPendente ? "Enviado" : "Recebido"}
                      </span>

                      {/* COPY LINK TOOL */}
                      <button
                        onClick={() => handleCopyLinkToClipboard(link.Id)}
                        className="p-1 px-1.5 bg-white border border-slate-200 text-slate-500 hover:text-slate-800 rounded-lg transition hover:shadow-3xs flex items-center gap-1 font-mono text-[10px] cursor-pointer"
                        title="Copiar link dinâmico curto público"
                      >
                        {copiedId === link.Id ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-600" />
                            <span className="text-emerald-700 text-[8.5px] font-bold">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>

                      {/* REDIRECT WA DISPATCH IF PENDING */}
                      {isPendente && (
                        <button
                          onClick={() => {
                            const fullLink = `${window.location.origin}${window.location.pathname}?idAtendimento=${link.Id}`;
                            const wppMessage = `Olá, ${link.TutorNome}! 🐾 Por favor, nos envie as informações do seu Pet clicando logo abaixo: ${fullLink}`;
                            const wppUrl = phoneDigits 
                              ? `https://api.whatsapp.com/send?phone=${phoneDigits}&text=${encodeURIComponent(wppMessage)}`
                              : `https://api.whatsapp.com/send?text=${encodeURIComponent(wppMessage)}`;
                            window.open(wppUrl, "_blank", "noopener,noreferrer");
                          }}
                          className="p-1 text-slate-400 hover:text-emerald-650 bg-white border border-slate-200 rounded-lg cursor-pointer transition hover:shadow-3xs"
                          title="Enviar re-lembrete no WhatsApp"
                        >
                          <Smartphone className="h-3.5 w-3.5 text-emerald-600" />
                        </button>
                      )}

                      {/* RECONSTRUCTION DETAILED RESPONSES MODAL OPEN */}
                      <button
                        onClick={() => setSelectedLinkRecord(link)}
                        className={`p-1 px-1.5 font-semibold text-white text-[10px] rounded-lg transition shadow-3xs flex items-center gap-1 cursor-pointer shrink-0 ${
                          isPendente ? "bg-slate-550 hover:bg-slate-700" : "bg-indigo-600 hover:bg-indigo-700"
                        }`}
                        title={isPendente ? "Visualizar Ficha Cadastral (Pendente)" : "Ver Respostas Completas"}
                      >
                        <Eye className="h-3 w-3" />
                        <span>Respostas</span>
                      </button>

                      {/* DELETE RECORD TRACKER LOG */}
                      <button
                        onClick={() => handleDeleteLinkRecord(link.Id)}
                        className="p-1.5 text-slate-400 hover:text-red-650 transition cursor-pointer"
                        title="Excluir link"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL DISPLAY VIEWER: CUSTOMER FORM RESPONSES */}
      {selectedLinkRecord && (() => {
        // Prepare list of pets to render (supports both single legacy and new mult-pet structures)
        const petsToRender: PetResponse[] = selectedLinkRecord.Pets && selectedLinkRecord.Pets.length > 0
          ? selectedLinkRecord.Pets
          : [
              {
                nome: selectedLinkRecord.Respostas?.Pet || "",
                raca: selectedLinkRecord.Respostas?.Raca || "",
                idade: selectedLinkRecord.Respostas?.Idade || "",
                pelo: selectedLinkRecord.Respostas?.pelo || selectedLinkRecord.Respostas?.Pelo || "Curto",
                temperamento: selectedLinkRecord.Respostas?.Temperamento || "Manso",
                cuidado: selectedLinkRecord.Respostas?.Cuidado || selectedLinkRecord.Respostas?.["Algum cuidado especial"] || "",
                alergico: selectedLinkRecord.Respostas?.Alergico || selectedLinkRecord.Respostas?.Alérgico || "",
                servico: selectedLinkRecord.Respostas?.Servico || "Banho"
              }
            ];

        const tutorAddress = selectedLinkRecord.TutorEndereco || selectedLinkRecord.Respostas?.Endereco || selectedLinkRecord.Respostas?.Endereço || "";
        const tutorLevaTraz = selectedLinkRecord.TutorLevaTraz || selectedLinkRecord.Respostas?.LevaTraz || selectedLinkRecord.Respostas?.["Precisa leva e traz"] || "Não";

        return (
          <div className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[80vh] animate-zoom-in">
              {/* Modal Header */}
              <div className="p-4 bg-indigo-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 text-amber-400 fill-amber-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider font-mono">
                    Visualização da Ficha do Pet
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedLinkRecord(null)}
                  className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-lg transition cursor-pointer"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Modal Content Body */}
              <div className="p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                {/* Tutor Profile Block */}
                <div className="flex items-center gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-150">
                  <div className="p-2.5 bg-white border border-slate-200 rounded-xl shrink-0">
                    <User className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Tutor / Cliente</p>
                    <h4 className="text-sm font-bold text-slate-800 leading-tight truncate">{selectedLinkRecord.TutorNome}</h4>
                    {selectedLinkRecord.TutorTelefone && (
                      <p className="text-[10px] font-mono text-slate-550 font-bold leading-normal">{selectedLinkRecord.TutorTelefone}</p>
                    )}
                  </div>
                </div>

                {/* Questionnaire fields with values */}
                <div className="space-y-4">
                  {/* SEÇÃO PAI: CAMPOS CADASTRAIS FIXOS DO TUTOR */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-150 space-y-2.5">
                    <h4 className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest font-mono pb-1 border-b border-indigo-100">
                      Dados Fixos do Tutor
                    </h4>

                    <div className="flex justify-between items-start text-xs border-b border-slate-100 pb-1.5">
                      <span className="font-semibold text-slate-500 font-mono text-[10.5px] shrink-0 leading-normal">Tutor / Responsável:</span>
                      <span className="font-extrabold text-slate-800 text-right leading-normal pl-2 break-all">
                        {selectedLinkRecord.TutorNome}
                      </span>
                    </div>

                    <div className="flex justify-between items-start text-xs border-b border-slate-100 pb-1.5">
                      <span className="font-semibold text-slate-500 font-mono text-[10.5px] shrink-0 leading-normal">Leva e Traz:</span>
                      <span className="font-extrabold text-slate-800 text-right leading-normal pl-2 break-all">
                        {tutorLevaTraz}
                      </span>
                    </div>

                    <div className="flex justify-between items-start text-xs last:border-0 pb-0">
                      <span className="font-semibold text-slate-500 font-mono text-[10.5px] shrink-0 leading-normal">Endereço:</span>
                      <span className="font-extrabold text-slate-800 text-right leading-normal pl-2 break-all">
                        {tutorAddress || <em className="text-slate-400 font-normal italic">Não informado</em>}
                      </span>
                    </div>
                  </div>

                  {/* SEÇÃO FILHO: CAMPOS DINÂMICOS DE CADA PET */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-indigo-900 uppercase tracking-widest font-mono">
                      Pets Cadastrados no Orçamento ({petsToRender.length})
                    </h4>

                    {petsToRender.map((pet, index) => (
                      <div key={index} className="bg-slate-50 p-3.5 rounded-2xl border border-indigo-100 space-y-2.5 animate-fade-in">
                        <div className="flex items-center gap-1.5 pb-2 border-b border-indigo-100/50">
                          <span className="text-[10px] bg-indigo-600 text-white font-mono h-4.5 w-4.5 inline-flex items-center justify-center rounded-full font-bold">
                            {index + 1}
                          </span>
                          <span className="text-xs font-bold text-indigo-950 font-mono uppercase tracking-wider">
                            Ficha do Animal: {pet.nome || "Novo Pet"}
                          </span>
                        </div>

                        {[
                          { label: "Pet / Animal", val: pet.nome },
                          { label: "Raça", val: pet.raca },
                          { label: "Idade", val: pet.idade },
                          { label: "Pelo", val: pet.pelo },
                          { label: "Temperamento", val: pet.temperamento },
                          { label: "Cuidado especial", val: pet.cuidado },
                          { label: "Alérgico", val: pet.alergico }
                        ].map((field, fIdx) => (
                          <div key={fIdx} className="flex justify-between items-start text-xs border-b border-slate-100/60 pb-1.5 last:border-0 last:pb-0">
                            <span className="font-medium text-slate-500 font-mono text-[10.5px] shrink-0 leading-normal">{field.label}:</span>
                            <span className="font-bold text-slate-800 text-right leading-normal pl-2 break-all">
                              {field.val || <em className="text-slate-400 font-normal italic">Não informado</em>}
                            </span>
                          </div>
                        ))}

                        {/* Card do Serviço Solicitado */}
                        <div className="mt-2.5 p-2 bg-indigo-50/50 border border-indigo-100/60 rounded-xl space-y-0.5">
                          <span className="text-[8.5px] font-extrabold text-indigo-700 uppercase tracking-widest font-mono">Serviço Solicitado</span>
                          <p className="text-xs text-indigo-950 font-black font-sans leading-tight">
                            {pet.servico || "Banho"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 3. SEÇÃO DE PERGUNTAS DINÂMICAS ADICIONAIS GERAIS */}
                  {questions.filter((q) => {
                    const norm = q.Texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                    return (
                      norm !== "tutor" &&
                      norm !== "pet" &&
                      norm !== "raca" &&
                      norm !== "idade" &&
                      norm !== "pelo" &&
                      norm !== "temperamento" &&
                      !norm.includes("cuidado") &&
                      !norm.includes("alergico") &&
                      !norm.includes("alergia") &&
                      !norm.includes("leva e traz") &&
                      !norm.includes("endereco") &&
                      !norm.includes("servico")
                    );
                  }).length > 0 && (
                    <div className="space-y-2.5 mt-3">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono pb-1 border-b border-slate-150">
                        Respostas Dinâmicas Adicionais Gerais
                      </h4>
                      
                      {questions
                        .filter((q) => {
                          const norm = q.Texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                          return (
                            norm !== "tutor" &&
                            norm !== "pet" &&
                            norm !== "raca" &&
                            norm !== "idade" &&
                            norm !== "pelo" &&
                            norm !== "temperamento" &&
                            !norm.includes("cuidado") &&
                            !norm.includes("alergico") &&
                            !norm.includes("alergia") &&
                            !norm.includes("leva e traz") &&
                            !norm.includes("endereco") &&
                            !norm.includes("servico")
                          );
                        })
                        .map((q) => {
                          const ans = selectedLinkRecord.Respostas?.[q.Id];
                          return (
                            <div key={q.Id} className="p-2.5 bg-slate-100/40 border border-slate-150 rounded-xl space-y-1">
                              <span className="text-[10px] font-bold text-slate-500 font-mono block leading-tight">
                                {q.Texto}
                              </span>
                              <p className="text-xs text-slate-800 font-bold leading-relaxed whitespace-pre-wrap">
                                {ans !== undefined ? (
                                  ans === "true" || ans === true ? (
                                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">Sim</span>
                                  ) : ans === "false" || ans === false ? (
                                    <span className="text-red-750 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">Não</span>
                                  ) : (
                                    ans
                                  )
                                ) : (
                                  <span className="text-slate-400 italic font-mono text-[10.5px]">Não preenchido</span>
                                )}
                              </p>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Actions Footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => setSelectedLinkRecord(null)}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 font-bold text-white text-[11px] rounded-lg cursor-pointer transition"
                >
                  Fechar Ficha
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
