import React, { useState, useEffect } from "react";
import { db } from "../utils/firebase";
import {
  getLocalAtendimentos,
  upsertLocalAtendimento,
  getLocalFormQuestions
} from "../utils/whatsappStorage";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query
} from "firebase/firestore";
import {
  PawPrint,
  CheckCircle,
  AlertTriangle,
  Send,
  Loader2,
  Heart,
  FileText,
  User,
  PlusCircle,
  Trash2,
  Phone,
  MapPin,
  Sparkles
} from "lucide-react";
import { Question, LinkRecord } from "./WhatsAppFormPanel";

interface WhatsAppClientFormProps {
  idAtendimento: string;
}

export interface PetRequest {
  nome: string;
  raca: string;
  idade: string;
  pelo: string;
  temperamento: string;
  cuidado: string;
  alergico: string;
  servico: string;
}

export default function WhatsAppClientForm({ idAtendimento }: WhatsAppClientFormProps) {
  const [record, setRecord] = useState<LinkRecord | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [respostas, setRespostas] = useState<{ [qId: string]: string }>({});
  
  // Seção Pai (Dados Fixos do Tutor) States
  const [fixedTutor, setFixedTutor] = useState("");
  const [tutorTelefone, setTutorTelefone] = useState("");
  const [fixedEndereco, setFixedEndereco] = useState("");
  const [fixedLevaTraz, setFixedLevaTraz] = useState("Não");

  // Seção Filho (Dados Dinâmicos de Pets) State
  const [pets, setPets] = useState<PetRequest[]>([
    {
      nome: "",
      raca: "",
      idade: "",
      pelo: "Curto",
      temperamento: "Manso",
      cuidado: "",
      alergico: "",
      servico: "Banho"
    }
  ]);

  // App States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Firestore Collection paths
  const QUE_COLL = "form_questions";
  const AT_COLL = "atendimentos_form";

  // Check if an additional question is covered by our physical fixed fields from parent/child
  const isFixedQuestion = (text: string) => {
    const norm = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    return (
      norm === "tutor" ||
      norm === "pet" ||
      norm === "raca" ||
      norm === "idade" ||
      norm === "pelo" ||
      norm === "temperamento" ||
      norm.includes("cuidado") ||
      norm.includes("alergico") ||
      norm.includes("alergia") ||
      norm.includes("leva e traz") ||
      norm.includes("endereco") ||
      norm.includes("servico")
    );
  };

  // Load record and questions on mount
  useEffect(() => {
    async function loadData() {
      try {
        let rec: LinkRecord | null = null;
        let data: any = null;

        // 1. Procura primeiro no armazenamento local estruturado
        const localList = getLocalAtendimentos();
        const foundLocal = localList.find((r) => r.Id === idAtendimento);

        if (foundLocal) {
          rec = foundLocal;
          data = foundLocal;
        } else {
          // Fallback no Firestore
          try {
            const docRef = doc(db, AT_COLL, idAtendimento);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const d = docSnap.data();
              rec = {
                Id: docSnap.id,
                TutorNome: d.TutorNome || "",
                TutorTelefone: d.TutorTelefone || "",
                Status: d.Status || "Pendente",
                CreatedAt: d.CreatedAt || "",
                CompletedAt: d.CompletedAt || "",
                Respostas: d.Respostas || {},
                Pets: d.Pets || []
              };
              data = d;
            }
          } catch (fbErr) {
            console.warn("Aviso ao buscar formulário no Firestore:", fbErr);
          }
        }

        if (!rec) {
          setErrorMsg("Link inválido ou não encontrado. Verifique se o link está correto ou solicite um novo.");
          setLoading(false);
          return;
        }

        setRecord(rec);

        // Prepopulate Seção Pai (Dados do Tutor)
        setFixedTutor(data.TutorNome || data.Respostas?.Tutor || "");
        setTutorTelefone(data.TutorTelefone || data.Respostas?.Telefone || "");
        setFixedEndereco(data.TutorEndereco || data.Respostas?.Endereco || data.Respostas?.Endereço || "");
        setFixedLevaTraz(data.TutorLevaTraz || data.Respostas?.LevaTraz || data.Respostas?.["Precisa leva e traz"] || "Não");

        // Prepopulate Seção Filho (Pets)
        if (data.Pets && Array.isArray(data.Pets) && data.Pets.length > 0) {
          setPets(data.Pets);
        } else {
          setPets([
            {
              nome: data.Respostas?.Pet || "",
              raca: data.Respostas?.Raca || "",
              idade: data.Respostas?.Idade || "",
              pelo: data.Respostas?.Pelo || "Curto",
              temperamento: data.Respostas?.Temperamento || "Manso",
              cuidado: data.Respostas?.Cuidado || data.Respostas?.["Algum cuidado especial"] || "",
              alergico: data.Respostas?.Alergico || data.Respostas?.Alérgico || "",
              servico: data.Respostas?.Servico || "Banho"
            }
          ]);
        }

        // Prepopulate responses map
        setRespostas(data.Respostas || {});

        // 2. Load custom dynamic questions: local first, then Firestore
        let qList: Question[] = getLocalFormQuestions();
        try {
          const qSnap = await getDocs(query(collection(db, QUE_COLL)));
          if (!qSnap.empty) {
            const fetchedQ: Question[] = [];
            qSnap.forEach((docSnap) => {
              const qData = docSnap.data();
              fetchedQ.push({
                Id: docSnap.id,
                Texto: qData.Texto || "",
                Tipo: qData.Tipo || "Texto",
                Opcoes: qData.Opcoes || "",
                Ordem: qData.Ordem || 0
              });
            });
            fetchedQ.sort((a, b) => a.Ordem - b.Ordem);
            if (fetchedQ.length > 0) {
              qList = fetchedQ;
            }
          }
        } catch (qErr) {
          console.warn("Utilizando perguntas locais do formulário:", qErr);
        }

        setQuestions(qList);

        // Fill initial dynamic respuestas values
        const initialAnswers: { [qId: string]: string } = { ...data.Respostas };
        qList.forEach(q => {
          if (initialAnswers[q.Id] === undefined) {
            if (q.Tipo === "Sim/Não") {
              initialAnswers[q.Id] = "true";
            } else if (q.Tipo === "Opções" && q.Opcoes) {
              const opts = q.Opcoes.split(",").map(o => o.trim());
              if (opts.length > 0) {
                initialAnswers[q.Id] = opts[0];
              }
            } else {
              initialAnswers[q.Id] = "";
            }
          }
        });
        setRespostas(initialAnswers);
        setLoading(false);
      } catch (err: any) {
        console.error("Error loading client form details:", err);
        setErrorMsg(`Houve uma falha ao carregar o formulário. (Erro: ${err?.message || err})`);
        setLoading(false);
      }
    }

    if (idAtendimento) {
      loadData();
    } else {
      setErrorMsg("ID de Atendimento ausente nos parâmetros da URL.");
      setLoading(false);
    }
  }, [idAtendimento]);

  // Handle addition of a new empty pet card
  const handleAddPet = () => {
    setPets((prev) => [
      ...prev,
      {
        nome: "",
        raca: "",
        idade: "",
        pelo: "Curto",
        temperamento: "Manso",
        cuidado: "",
        alergico: "",
        servico: "Banho"
      }
    ]);
  };

  // Remove duplicate pet card
  const handleRemovePet = (index: number) => {
    if (pets.length <= 1) return;
    setPets((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Update pet inputs locally
  const handlePetFieldChange = (index: number, field: keyof PetRequest, value: string) => {
    setPets((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: value
      };
      return copy;
    });
  };

  // Update additional dynamic individual questions
  const handleAnswerChange = (qId: string, val: string) => {
    setRespostas((prev) => ({
      ...prev,
      [qId]: val
    }));
  };

  // Complete submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record || record.Status === "Concluído") return;

    if (!fixedTutor.trim()) {
      alert("Por favor, preencha o Nome do Tutor.");
      return;
    }

    // Validate if pets have name and race filled in
    for (let i = 0; i < pets.length; i++) {
      if (!pets[i].nome.trim()) {
        alert(`Por favor, preencha o Nome do Pet #${i + 1}.`);
        return;
      }
      if (!pets[i].raca.trim()) {
        alert(`Por favor, preencha a Raça do Pet #${i + 1} (${pets[i].nome || "Sem Nome"}).`);
        return;
      }
    }

    setSubmitting(true);

    try {
      const docRef = doc(db, AT_COLL, idAtendimento);
      const nowStr = new Date().toISOString();

      // Setup legacy fallback respostas fields so older modules do not crash
      const answersToUpload: { [key: string]: string } = {};
      answersToUpload["Tutor"] = fixedTutor;
      answersToUpload["Telefone"] = tutorTelefone;
      answersToUpload["Address"] = fixedEndereco;
      answersToUpload["LevaTraz"] = fixedLevaTraz;
      answersToUpload["Endereco"] = fixedEndereco;

      // Map details of the first pet into standard responses for compatibility
      if (pets.length > 0) {
        answersToUpload["Pet"] = pets[0].nome;
        answersToUpload["Raca"] = pets[0].raca;
        answersToUpload["Idade"] = pets[0].idade;
        answersToUpload["Pelo"] = pets[0].pelo;
        answersToUpload["Temperamento"] = pets[0].temperamento;
        answersToUpload["Cuidado"] = pets[0].cuidado;
        answersToUpload["Alergico"] = pets[0].alergico;
        answersToUpload["Servico"] = pets[0].servico;
      }

      // Sync custom additional questions
      questions.forEach((q) => {
        const textNorm = q.Texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        if (textNorm === "tutor") {
          answersToUpload[q.Id] = fixedTutor;
        } else if (textNorm === "pet") {
          answersToUpload[q.Id] = pets[0]?.nome || "";
        } else if (textNorm === "raca") {
          answersToUpload[q.Id] = pets[0]?.raca || "";
        } else if (textNorm === "idade") {
          answersToUpload[q.Id] = pets[0]?.idade || "";
        } else if (textNorm === "pelo") {
          answersToUpload[q.Id] = pets[0]?.pelo || "Curto";
        } else if (textNorm === "temperamento") {
          answersToUpload[q.Id] = pets[0]?.temperamento || "Manso";
        } else if (textNorm.includes("cuidado")) {
          answersToUpload[q.Id] = pets[0]?.cuidado || "";
        } else if (textNorm.includes("alergico") || textNorm.includes("alergia")) {
          answersToUpload[q.Id] = pets[0]?.alergico || "";
        } else if (textNorm.includes("leva e traz")) {
          answersToUpload[q.Id] = fixedLevaTraz;
        } else if (textNorm.includes("endereco")) {
          answersToUpload[q.Id] = fixedEndereco;
        } else {
          answersToUpload[q.Id] = respostas[q.Id] !== undefined ? respostas[q.Id] : "";
        }
      });

      // Salva a resposta no armazenamento local estruturado imediatamente
      const updatedLocalRecord: LinkRecord = {
        Id: idAtendimento,
        TutorNome: fixedTutor,
        TutorTelefone: tutorTelefone,
        TutorEndereco: fixedEndereco,
        TutorLevaTraz: fixedLevaTraz,
        Pets: pets,
        Status: "Concluído",
        CompletedAt: nowStr,
        Respostas: answersToUpload,
        CreatedAt: record.CreatedAt || nowStr,
      };
      upsertLocalAtendimento(updatedLocalRecord);

      // Opcional: tenta atualizar Firestore se online
      try {
        await updateDoc(docRef, {
          TutorNome: fixedTutor,
          TutorTelefone: tutorTelefone,
          TutorEndereco: fixedEndereco,
          TutorLevaTraz: fixedLevaTraz,
          Pets: pets,
          Status: "Concluído",
          CompletedAt: nowStr,
          Respostas: answersToUpload
        });
      } catch (fbErr) {
        console.warn("Aviso: respostas salvas no banco local (Firestore offline):", fbErr);
      }

      // Update local state instantly to lock screen and invalidate token
      setRecord((prev) => prev ? { 
        ...prev, 
        Status: "Concluído", 
        TutorNome: fixedTutor, 
        TutorTelefone: tutorTelefone,
        Pets: pets 
      } : null);
    } catch (err) {
      console.error("Error saving budget request responses:", err);
      alert("Falha ao salvar respostas. Certifique-se de preencher todos os campos obrigatórios.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="space-y-4">
          <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-700">Aguarde... Carregando ficha de orçamento</p>
          <p className="text-[11px] text-slate-400 font-medium">Buscando formulário exclusivo...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md max-w-sm w-full space-y-4">
          <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto animate-bounce" />
          <h2 className="text-base font-bold text-slate-800 leading-tight">Link Expirado ou Inválido</h2>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            {errorMsg}
          </p>
          <p className="text-[10px] text-slate-400 font-mono">Token: {idAtendimento || "Nulo"}</p>
        </div>
      </div>
    );
  }

  // Double submission block if quote already completed
  const isConcluido = record?.Status === "Concluído";

  if (isConcluido) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans animate-fade-in">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center shadow-lg w-full max-w-md space-y-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full mx-auto">
            <PawPrint className="h-4 w-4 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Ficha Enviada</span>
          </div>

          <div className="space-y-2">
            <CheckCircle className="h-14 w-14 text-emerald-600 mx-auto" />
            <h1 className="text-lg font-extrabold text-slate-800 leading-snug">
              Orçamento Recebido!
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto font-medium">
              Muito obrigado! Seus dados de tutor e os pets cadastrados foram salvos. Já fomos notificados no petshop.
            </p>
          </div>

          <div className="border-t border-slate-100 pt-4 text-center">
            <p className="text-[10.5px] text-slate-400 font-medium">
              Este link único de captação de orçamento já foi invalidado por motivos de segurança.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start p-4 py-8 font-sans">
      <div className="w-full max-w-xl space-y-6">
        
        {/* Banner de Identificação Comercial */}
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-md space-y-3 relative overflow-hidden">
          <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 opacity-10">
            <PawPrint className="w-48 h-48" />
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1 px-2.5 bg-indigo-500/30 border border-indigo-400/20 rounded-lg text-[9px] font-bold uppercase tracking-widest font-mono">
              Solicitação de Orçamento
            </div>
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          </div>

          <h1 className="text-lg font-black tracking-tight">Ficha de Captação Externa</h1>
          <p className="text-xs text-indigo-200 font-medium leading-relaxed">
            Olá, <strong className="font-bold text-white">{fixedTutor || record?.TutorNome || "Cliente"}</strong>! Informe seus dados de contato e do(s) seu(s) pet(s) abaixo. Você pode adicionar mais de um mascote no mesmo orçamento!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* SEÇÃO PAI: DADOS FIXOS DO TUTOR */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <User className="h-4 w-4 text-indigo-600 font-bold" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">Dados do Tutor / Responsável</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tutor nome */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  Nome do Tutor / Responsável <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Seu nome completo"
                  value={fixedTutor}
                  onChange={(e) => setFixedTutor(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-250 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition shadow-3xs"
                />
              </div>

              {/* Telefone */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  WhatsApp / Telefone <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">📞</span>
                  <input
                    type="tel"
                    required
                    placeholder="Ex: (19) 99885-0635"
                    value={tutorTelefone}
                    onChange={(e) => setTutorTelefone(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-250 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition shadow-3xs font-mono"
                  />
                </div>
              </div>

              {/* Endereço */}
              <div className="space-y-1 md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700">
                  Endereço Residencial Completo <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400">📍</span>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Rua Guaxupé, 155 - Piracicaba - SP"
                    value={fixedEndereco}
                    onChange={(e) => setFixedEndereco(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-250 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition shadow-3xs"
                  />
                </div>
              </div>

              {/* Leva e Traz */}
              <div className="space-y-1 md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700">
                  Deseja solicitar serviço de Leva e Traz (Táxi Dog)? <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setFixedLevaTraz("Sim")}
                    className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition border cursor-pointer ${
                      fixedLevaTraz === "Sim"
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-3xs"
                        : "bg-white border-slate-250 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Sim, preciso de Leva e Traz
                  </button>
                  <button
                    type="button"
                    onClick={() => setFixedLevaTraz("Não")}
                    className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition border cursor-pointer ${
                      fixedLevaTraz === "Não"
                        ? "bg-slate-600 border-slate-600 text-white shadow-3xs"
                        : "bg-white border-slate-250 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Não, vou levar ao estabelecimento
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO FILHO: DADOS DINÂMICOS DO PET (REPETÍVEL) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <PawPrint className="h-4 w-4 text-indigo-600" />
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">Dados do(s) Animal(is)</h2>
              </div>
              <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold font-mono">
                {pets.length} {pets.length === 1 ? "Pet" : "Pets"}
              </span>
            </div>

            {pets.map((pet, idx) => (
              <div 
                key={idx} 
                className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4 relative animate-fade-in"
              >
                {/* Pet Header with deletion control */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                      {idx + 1}
                    </div>
                    <span className="text-xs font-extrabold text-slate-800 font-sans uppercase">
                      Ficha Cadastral do Pet
                    </span>
                  </div>
                  {pets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePet(idx)}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 hover:text-white border border-red-200 hover:bg-red-500 rounded-lg px-2.5 py-1.5 transition cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Remover</span>
                    </button>
                  )}
                </div>

                {/* Form fields for this specific pet */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Pet Name */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Nome do Pet / Animal <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Charlotte, Belinha, Floquinho"
                      value={pet.nome}
                      onChange={(e) => handlePetFieldChange(idx, "nome", e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-250 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition shadow-3xs"
                    />
                  </div>

                  {/* Raça */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Raça <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Lhasa Apso, Golden Retriever, Vira-lata"
                      value={pet.raca}
                      onChange={(e) => handlePetFieldChange(idx, "raca", e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-250 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition shadow-3xs"
                    />
                  </div>

                  {/* Idade */}
                  <div className="space-y-1 col-span-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Idade Aproximada <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 8 anos, 6 meses"
                      value={pet.idade}
                      onChange={(e) => handlePetFieldChange(idx, "idade", e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-250 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition shadow-3xs"
                    />
                  </div>

                  {/* Dropdowns for Pelo and Temperamento */}
                  <div className="grid grid-cols-2 gap-2 col-span-1">
                    {/* Pelo */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700">
                        Tipo de Pelagem <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={pet.pelo}
                        onChange={(e) => handlePetFieldChange(idx, "pelo", e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-250 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition shadow-3xs cursor-pointer"
                      >
                        <option value="Curto">Curto</option>
                        <option value="Médio">Médio</option>
                        <option value="Longo">Longo</option>
                      </select>
                    </div>

                    {/* Temperamento */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700">
                        Temperamento <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={pet.temperamento}
                        onChange={(e) => handlePetFieldChange(idx, "temperamento", e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-250 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition shadow-3xs cursor-pointer"
                      >
                        <option value="Manso">Manso</option>
                        <option value="Bravo">Bravo</option>
                        <option value="Agitado">Agitado</option>
                        <option value="Medroso">Medroso</option>
                        <option value="Idoso/Delicado">Idoso/Delicado</option>
                      </select>
                    </div>
                  </div>

                  {/* Cuidado especial */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Algum cuidado especial? (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Cuidado com ouvido direito inflamado, tem medo do soprador"
                      value={pet.cuidado}
                      onChange={(e) => handlePetFieldChange(idx, "cuidado", e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-250 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition shadow-3xs"
                    />
                  </div>

                  {/* Alérgico */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Possui alergia a algum produto / problema de pele? (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Sim, xampu de coco / dermatite nas patas"
                      value={pet.alergico}
                      onChange={(e) => handlePetFieldChange(idx, "alergico", e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-250 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition shadow-3xs"
                    />
                  </div>

                  {/* CARD DE SERVIÇO (Dentro do conteiner do animal) */}
                  <div className="md:col-span-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 shadow-3xs mt-2 space-y-1.5">
                    <span className="block text-[10px] font-extrabold text-indigo-700 tracking-wider uppercase font-mono">
                      Serviço Desejado
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { label: "💦 Banho", val: "Banho" },
                        { label: "✂️ Tosa", val: "Tosa" },
                        { label: "🛁 Banho & Tosa", val: "Banho e Tosa" },
                        { label: "🌟 Outros", val: "Outros" }
                      ].map((srv) => (
                        <button
                          key={srv.val}
                          type="button"
                          onClick={() => handlePetFieldChange(idx, "servico", srv.val)}
                          className={`py-2 px-1 text-center rounded-xl font-bold text-[10px] sm:text-xs border transition cursor-pointer ${
                            pet.servico === srv.val
                              ? "bg-indigo-600 border-indigo-600 text-white shadow-3xs"
                              : "bg-white border-slate-250 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {srv.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* BOTÃO ADICIONAR OUTRO PET (Alinhado logo abaixo do contêiner) */}
            <div className="pt-2 flex justify-start">
              <button
                type="button"
                onClick={handleAddPet}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 text-indigo-600 border-2 border-dashed border-indigo-300 hover:border-indigo-500 rounded-2xl font-bold text-xs shadow-3xs transition cursor-pointer"
              >
                <PlusCircle className="h-4.5 w-4.5" />
                <span>+ Adicionar Outro Pet para Orçamento</span>
              </button>
            </div>
          </div>

          {/* PERGUNTAS DINÂMICAS ADICIONAIS GERAIS */}
          {questions.filter((q) => !isFixedQuestion(q.Texto)).length > 0 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <FileText className="h-4 w-4 text-slate-500" />
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">Respostas Adicionais</h2>
              </div>

              <div className="space-y-4">
                {questions
                  .filter((q) => !isFixedQuestion(q.Texto))
                  .map((q) => {
                    const currentVal = respostas[q.Id] || "";

                    return (
                      <div key={q.Id} className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700">
                          {q.Texto} <span className="text-red-500">*</span>
                        </label>

                        {/* Text input */}
                        {q.Tipo === "Texto" && (
                          <input
                            type="text"
                            required
                            placeholder="Sua resposta..."
                            value={currentVal}
                            onChange={(e) => handleAnswerChange(q.Id, e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/15 transition shadow-3xs"
                          />
                        )}

                        {/* Yes / No buttons */}
                        {q.Tipo === "Sim/Não" && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleAnswerChange(q.Id, "true")}
                              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition border cursor-pointer ${
                                currentVal === "true" || currentVal === true
                                  ? "bg-indigo-600 border-indigo-600 text-white shadow-3xs"
                                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                              }`}
                            >
                              Sim
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAnswerChange(q.Id, "false")}
                              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition border cursor-pointer ${
                                currentVal === "false" || currentVal === false
                                  ? "bg-rose-650 border-rose-650 text-white shadow-3xs"
                                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                              }`}
                            >
                              Não
                            </button>
                          </div>
                        )}

                        {/* Dynamic Choice options */}
                        {q.Tipo === "Opções" && q.Opcoes && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {q.Opcoes.split(",").map((o) => {
                              const optionText = o.trim();
                              const isSelected = currentVal === optionText;

                              return (
                                <button
                                  key={optionText}
                                  type="button"
                                  onClick={() => handleAnswerChange(q.Id, optionText)}
                                  className={`py-1.5 px-2 rounded-xl text-[10px] sm:text-xs font-bold text-center border truncate transition cursor-pointer ${
                                    isSelected
                                      ? "bg-indigo-600 border-indigo-600 text-white shadow-3xs"
                                      : "bg-slate-50 border-slate-210 text-slate-650 hover:bg-slate-100"
                                  }`}
                                >
                                  {optionText}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* SUBMIT ACTION BUTTONS */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs flex items-center justify-between">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed font-sans font-black text-white text-xs sm:text-sm rounded-2xl transition shadow-sm flex items-center justify-center gap-2 uppercase tracking-widest cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  <span>Enviando orçamento...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Enviar Orçamento Final ({pets.length} {pets.length === 1 ? "Pet" : "Pets"})</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer info lock disclaimer */}
        <div className="text-center space-y-1">
          <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
            🔒 Ficha encriptada protegida por link único temporário de uso único. Suas respostas serão enviadas com segurança para os profissionais do petshop avaliarem seu orçamento.
          </p>
        </div>

      </div>
    </div>
  );
}
