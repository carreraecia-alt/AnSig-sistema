/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from "react";
import {
  DatabaseState,
  CadCliente,
  CadPets,
  CadProdutos,
  CadMovDiario,
  CadDetMovDiario,
  CadUsuario,
  CadFornecedores,
  CadRaca,
  CadInfoConta,
  CaixaMovimentacao,
  CaixaDiario,
  LotesProdutos
} from "../types";
import { saveDatabase } from "../data/initDb";
import { processJsonBackupRowByRow, ImportSummary } from "../utils/jsonBackupProcessor";
import { Upload, FileJson, CheckCircle2, AlertTriangle, Loader2, Database } from "lucide-react";

interface JsonBackupImporterProps {
  currentDb: DatabaseState;
  currentUser?: CadUsuario | null;
  onUpdateDbState: (updateFn: (prev: DatabaseState) => DatabaseState) => void;
  onSuccess?: (summary: string) => void;
}

export type { ImportSummary };

export const JsonBackupImporter: React.FC<JsonBackupImporterProps> = ({
  currentDb,
  currentUser,
  onUpdateDbState,
  onSuccess
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    type: "success" | "error";
    message: string;
    summary?: ImportSummary;
  } | null>(null);

  // 1. Aciona o input de arquivo escondido ao clicar no botão
  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Limpa a seleção anterior
      fileInputRef.current.click();
    }
  };

  // 2. Leitura assíncrona do arquivo com FileReader
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".json")) {
      setImportStatus({
        type: "error",
        message: "Por favor, selecione um arquivo de backup válido com extensão .JSON."
      });
      return;
    }

    setIsProcessing(true);
    setImportStatus(null);

    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const rawContent = event.target?.result as string;
        if (!rawContent || !rawContent.trim()) {
          throw new Error("O arquivo selecionado está vazio.");
        }

        const parsedData = JSON.parse(rawContent);

        // 3. Inserção linha por linha no banco de dados local
        const summary = insertRecordsRowByRow(parsedData);

        setImportStatus({
          type: "success",
          message: `Backup processado com sucesso! ${summary.totalLinhas} registros foram inseridos/atualizados.`,
          summary
        });

        if (onSuccess) {
          onSuccess(`Importação concluída: ${summary.totalLinhas} registros processados.`);
        }
      } catch (err: any) {
        console.error("Erro na importação do backup:", err);
        setImportStatus({
          type: "error",
          message: err.message || "Erro desconhecido ao processar e importar o arquivo JSON."
        });
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setIsProcessing(false);
      setImportStatus({
        type: "error",
        message: "Erro de I/O ao ler o arquivo selecionado no navegador."
      });
    };

    // Inicia a leitura do arquivo como texto UTF-8
    reader.readAsText(file, "UTF-8");
  };

  /**
   * 3. Percorre os dados lidos do arquivo JSON e realiza a inserção
   * linha por linha (upsert: INSERT OR REPLACE) nas tabelas do banco local.
   * Totalmente protegido contra undefined, funções indefinidas (TypeError) e variações de chaves.
   */
  const insertRecordsRowByRow = (backupData: any): ImportSummary => {
    if (!backupData || typeof backupData !== "object") {
      throw new Error("O arquivo JSON fornecido não contém um objeto ou dados válidos.");
    }

    let finalSummary: ImportSummary = {
      clientes: 0,
      pets: 0,
      produtos: 0,
      movimentos: 0,
      detalhesMov: 0,
      usuarios: 0,
      fornecedores: 0,
      racas: 0,
      outros: 0,
      totalLinhas: 0
    };

    const targetOwnerId = currentUser?.IdUsuarioMaster || currentUser?.Id || "user-1";

    // Validação de segurança: garantir que onUpdateDbState seja de fato uma função
    if (typeof onUpdateDbState !== "function") {
      console.warn("onUpdateDbState não é uma função. Processando e gravando diretamente no storage local.");
      const { newState, summary } = processJsonBackupRowByRow(backupData, currentDb, targetOwnerId);
      if (typeof saveDatabase === "function") {
        saveDatabase(newState);
      }
      return summary;
    }

    onUpdateDbState((prevState) => {
      const baseState = prevState || currentDb || ({} as DatabaseState);
      const { newState, summary } = processJsonBackupRowByRow(backupData, baseState, targetOwnerId);
      finalSummary = summary;

      // Persiste no banco de dados local estruturado (storage)
      if (typeof saveDatabase === "function") {
        saveDatabase(newState);
      }

      return newState;
    });

    return finalSummary;
  };

  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
      <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-amber-600 mb-1">
            <Database className="h-4 w-4 text-amber-500" />
            <span className="text-[10px] uppercase font-bold tracking-wider font-mono">
              Restauração de Dados Local (Gold Mode)
            </span>
          </div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
            Importar Backup JSON para o Banco Local
          </h3>
          <p className="text-xs text-slate-500">
            Selecione um arquivo de backup <code>.JSON</code> para inserir ou atualizar os registros linha por linha no SQLite/LocalStorage do navegador.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
            <FileJson className="h-4 w-4 text-amber-600 shrink-0" />
            <span>Inserção Linha por Linha com Garantia Atômica</span>
          </div>
          <p className="text-[11px] text-amber-800/80 leading-relaxed max-w-xl">
            O leitor assíncrono varre cada coleção do backup (clientes, pets, produtos, agendamentos e movimentações), aplicando operação <em>INSERT OR REPLACE</em> para preservar os dados sem duplicações indevidas.
          </p>
        </div>

        {/* Input escondido do tipo file que aceita apenas .json */}
        <input
          type="file"
          ref={fileInputRef}
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
          id="hidden-backup-file-input"
        />

        {/* Botão estilizado que dispara o clique no input escondido */}
        <button
          type="button"
          id="btn-importar-backup-json"
          onClick={handleButtonClick}
          disabled={isProcessing}
          className={`shrink-0 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold text-slate-950 transition-all shadow-sm active:scale-98 cursor-pointer ${
            isProcessing
              ? "bg-amber-300 text-amber-900 cursor-not-allowed"
              : "bg-amber-500 hover:bg-amber-600 hover:shadow-md"
          }`}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
              <span>Lendo e Inserindo...</span>
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 text-slate-950" />
              <span>Importar Backup (.JSON)</span>
            </>
          )}
        </button>
      </div>

      {/* Feedback de Status da Importação */}
      {importStatus && (
        <div
          className={`p-4 rounded-xl border text-xs space-y-2 animate-fadeIn ${
            importStatus.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-2 font-bold">
            {importStatus.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{importStatus.message}</span>
          </div>

          {importStatus.summary && (
            <div className="pt-2 border-t border-emerald-200/60 grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] text-emerald-800">
              <div className="bg-white/70 p-2 rounded-lg border border-emerald-100">
                <span className="block text-[10px] uppercase font-sans text-emerald-600 font-semibold">Clientes</span>
                <span className="font-bold text-sm text-emerald-900">+{importStatus.summary.clientes}</span>
              </div>
              <div className="bg-white/70 p-2 rounded-lg border border-emerald-100">
                <span className="block text-[10px] uppercase font-sans text-emerald-600 font-semibold">Pets</span>
                <span className="font-bold text-sm text-emerald-900">+{importStatus.summary.pets}</span>
              </div>
              <div className="bg-white/70 p-2 rounded-lg border border-emerald-100">
                <span className="block text-[10px] uppercase font-sans text-emerald-600 font-semibold">Agendamentos</span>
                <span className="font-bold text-sm text-emerald-900">+{importStatus.summary.movimentos}</span>
              </div>
              <div className="bg-white/70 p-2 rounded-lg border border-emerald-100">
                <span className="block text-[10px] uppercase font-sans text-emerald-600 font-semibold">Serviços/Produtos</span>
                <span className="font-bold text-sm text-emerald-900">+{importStatus.summary.produtos}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default JsonBackupImporter;
