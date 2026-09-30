/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { DatabaseState, CadUsuario, ThemeColor } from "../types";
import { uploadDatabaseBackup, downloadDatabaseBackup, downloadAllAccountsDatabaseBackups, getCloudBackupMetadata } from "../utils/firebase";
import {
  runFirebaseMigrationToLocal,
  getStoredMigrationReport,
  MigrationReport
} from "../utils/firebaseMigration";
import {
  exportDatabaseToJson,
  downloadSqliteDump,
  importDatabaseFromJson,
  getLocalDatabaseStats
} from "../data/initDb";
import {
  Cloud,
  CloudUpload,
  CloudDownload,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
  RefreshCw,
  Database,
  FileCode,
  Download,
  Upload,
  HardDrive,
  Check
} from "lucide-react";

interface FirebaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  localDb: DatabaseState;
  onApplySyncState: (newDb: DatabaseState) => void;
  currentUser: CadUsuario;
  activeTheme: ThemeColor;
}

export default function FirebaseSyncModal({
  isOpen,
  onClose,
  localDb,
  onApplySyncState,
  currentUser,
  activeTheme,
}: FirebaseSyncModalProps) {
  const [cloudBackupInfo, setCloudBackupInfo] = useState<{
    lastSynced: string;
    syncedBy: string;
  } | null>(null);

  const [loadingInfo, setLoadingInfo] = useState(false);
  const [syncActionLoading, setSyncActionLoading] = useState<"upload" | "download" | "migrate" | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [migrationReport, setMigrationReport] = useState<MigrationReport | null>(null);

  const isAdmin = currentUser?.Permissoes === "Administrador";
  const stats = getLocalDatabaseStats(localDb);

  // Carrega status da migração e metadados
  const refreshStatus = async () => {
    setLoadingInfo(true);
    setErrorMessage(null);
    try {
      // 1. Relatório de migração local
      const rep = getStoredMigrationReport();
      setMigrationReport(rep);

      // 2. Metadados do Firebase
      const meta = await getCloudBackupMetadata(currentUser.Id);
      if (meta && meta.lastSynced) {
        setCloudBackupInfo({
          lastSynced: new Date(meta.lastSynced).toLocaleString("pt-BR"),
          syncedBy: meta.syncedBy || currentUser.Nome,
        });
      } else {
        setCloudBackupInfo(null);
      }
    } catch (err) {
      console.warn("Aviso ao ler metadados:", err);
    } finally {
      setLoadingInfo(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshStatus();
      setSuccessMessage(null);
      setErrorMessage(null);
      setConfirmRestore(false);
    }
  }, [isOpen]);

  // Executa rotina de migração/resgate completa do Firebase para o banco local
  const handleRunMigration = async () => {
    setSyncActionLoading("migrate");
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const rep = await runFirebaseMigrationToLocal(true);
      setMigrationReport(rep);
      setSuccessMessage(rep.message);
      // Se importou dados, recarrega o estado em tela
      if (rep.status === "success" || rep.status === "empty") {
        const { getInitialDatabase } = await import("../data/initDb");
        const refreshedDb = getInitialDatabase();
        onApplySyncState(refreshedDb);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Erro ao executar rotina de migração do Firebase.");
    } finally {
      setSyncActionLoading(null);
    }
  };

  // Upload opcional para a nuvem
  const handleBackupUpload = async () => {
    setSyncActionLoading("upload");
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await uploadDatabaseBackup(currentUser.Id, currentUser.Nome, localDb);
      setSuccessMessage("Backup instantâneo enviado para o Firebase com sucesso!");
      setCloudBackupInfo({
        lastSynced: new Date().toLocaleString("pt-BR"),
        syncedBy: currentUser.Nome,
      });
    } catch (err: any) {
      setErrorMessage(
        err?.message || "Erro ao conectar com o Firestore. Verifique as configurações das regras do Firebase."
      );
    } finally {
      setSyncActionLoading(null);
    }
  };

  // Download da nuvem
  const handleBackupRestore = async () => {
    setSyncActionLoading("download");
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      let downloadedState: DatabaseState | null = null;
      if (isAdmin) {
        const allUserIds = Array.from(new Set([
          currentUser.Id,
          ...(localDb.usuarios || []).map(u => u.Id)
        ]));
        downloadedState = await downloadAllAccountsDatabaseBackups(allUserIds);
      } else {
        downloadedState = await downloadDatabaseBackup(currentUser.Id);
      }

      if (downloadedState) {
        onApplySyncState(downloadedState);
        setSuccessMessage(
          isAdmin
            ? "Todos os registros de todas as contas foram baixados do Firebase e gravados no banco local!"
            : "Seus dados foram baixados do Firebase e gravados localmente com sucesso!"
        );
        setConfirmRestore(false);
      } else {
        setErrorMessage("Nenhum backup correspondente foi encontrado na nuvem.");
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message || "Erro ao obter o backup da nuvem do Firestore."
      );
    } finally {
      setSyncActionLoading(null);
    }
  };

  // Importar arquivo JSON do disco
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const imported = importDatabaseFromJson(content);
        onApplySyncState(imported);
        setSuccessMessage(`Arquivo '${file.name}' importado com sucesso para o banco local!`);
      } catch (err: any) {
        setErrorMessage(err.message || "Falha ao processar o arquivo de backup.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in select-none">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header bar */}
        <div className={`p-5 text-white flex items-center justify-between ${activeTheme.primary} shrink-0`}>
          <div className="flex items-center gap-2.5">
            <Database className="h-6 w-6 text-white" />
            <div>
              <h2 className="font-bold font-display text-base sm:text-lg leading-tight">
                Central do Banco de Dados & Sincronização em Tempo Real
              </h2>
              <p className="text-[11px] text-white/90 font-medium mt-0.5 flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Google Firestore em Tempo Real (Notebook, Celular & Netlify)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {successMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-start gap-2.5">
              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block">Sucesso!</strong>
                {successMessage}
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-start gap-2.5">
              <AlertTriangle className="h-4.5 w-4.5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block">Aviso</strong>
                {errorMessage}
              </div>
            </div>
          )}

          {/* Seção 1: Status da Migração Firebase -> Local */}
          <div className="bg-gradient-to-br from-indigo-50/70 to-slate-50 border border-indigo-100 p-4 rounded-xl space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4.5 w-4.5 text-indigo-600" />
                <strong className="font-semibold text-slate-800 text-sm">Status da Migração da Nuvem</strong>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                migrationReport?.status === "success" || migrationReport?.status === "already_migrated"
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : "bg-amber-100 text-amber-800 border border-amber-300"
              }`}>
                {migrationReport?.status === "success" || migrationReport?.status === "already_migrated"
                  ? "Migrado para Local"
                  : "Migração Pendente"}
              </span>
            </div>

            <p className="text-slate-600 text-[11.5px] leading-relaxed">
              O sistema "Banho e Tosa EXE" opera de forma 100% local e autônoma utilizando a estrutura definida em <code className="bg-white px-1.5 py-0.5 rounded border text-indigo-700 font-mono">initDb.ts</code>. Nenhum dado de clientes, pets ou histórico é dependente de conexão contínua com a internet.
            </p>

            {migrationReport && (
              <div className="bg-white/80 p-3 rounded-lg border border-indigo-100 text-[11px] space-y-1.5">
                <div className="flex justify-between text-slate-500">
                  <span>Última verificação:</span>
                  <strong className="text-slate-700 font-mono">{new Date(migrationReport.timestamp).toLocaleString("pt-BR")}</strong>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Clientes importados da nuvem:</span>
                  <strong className="text-slate-800 font-mono">{migrationReport.importedTotals.clientes}</strong>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Pets importados:</span>
                  <strong className="text-slate-800 font-mono">{migrationReport.importedTotals.pets}</strong>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Agendamentos importados:</span>
                  <strong className="text-slate-800 font-mono">{migrationReport.importedTotals.movimentos} ({migrationReport.importedTotals.detalhesMov} itens)</strong>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Atendimentos / WhatsApp importados:</span>
                  <strong className="text-slate-800 font-mono">{migrationReport.importedTotals.atendimentosForm}</strong>
                </div>
              </div>
            )}

            <button
              onClick={handleRunMigration}
              disabled={syncActionLoading !== null}
              className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {syncActionLoading === "migrate" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Executar Resgate / Reimportar Todas as Coleções do Firebase
            </button>
          </div>

          {/* Seção 2: Diagnóstico e Métricas do Banco Local */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between font-medium text-slate-700">
              <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                <Database className="h-4 w-4 text-slate-500" />
                Métricas do Banco Local Estruturado (initDb.ts)
              </span>
              <span className="text-slate-600 font-mono font-bold">{stats.tamanhoKb} KB</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2.5 pt-2 text-[11px] text-slate-600 font-mono border-t border-slate-200">
              <div className="bg-white p-2 rounded border border-slate-100">
                <span className="block font-sans text-[10px] text-slate-400 font-semibold uppercase">Clientes</span>
                <span className="font-bold text-slate-800 text-sm">{stats.totalClientes}</span>
              </div>
              <div className="bg-white p-2 rounded border border-slate-100">
                <span className="block font-sans text-[10px] text-slate-400 font-semibold uppercase">Pets</span>
                <span className="font-bold text-slate-800 text-sm">{stats.totalPets}</span>
              </div>
              <div className="bg-white p-2 rounded border border-slate-100">
                <span className="block font-sans text-[10px] text-slate-400 font-semibold uppercase">Agendamentos</span>
                <span className="font-bold text-slate-800 text-sm">{stats.totalAgendamentos}</span>
              </div>
              <div className="bg-white p-2 rounded border border-slate-100">
                <span className="block font-sans text-[10px] text-slate-400 font-semibold uppercase">Produtos/Serv.</span>
                <span className="font-bold text-slate-800 text-sm">{stats.totalProdutos}</span>
              </div>
              <div className="bg-white p-2 rounded border border-slate-100">
                <span className="block font-sans text-[10px] text-slate-400 font-semibold uppercase">Fornecedores</span>
                <span className="font-bold text-slate-800 text-sm">{stats.totalFornecedores}</span>
              </div>
              <div className="bg-white p-2 rounded border border-slate-100">
                <span className="block font-sans text-[10px] text-slate-400 font-semibold uppercase">Caixa Diário</span>
                <span className="font-bold text-slate-800 text-sm">{stats.totalMovimentacoesCaixa}</span>
              </div>
            </div>
          </div>

          {/* Seção 3: Exportação e Backups Locais */}
          <div className="border border-slate-200 p-4 rounded-xl space-y-3">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800">
              <Download className="h-4 w-4 text-emerald-600" />
              Exportação & Backups Locais (Desktop / SQLite)
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => exportDatabaseToJson(localDb)}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-200"
                title="Exporta todos os dados locais em formato JSON estruturado"
              >
                <Download className="h-4 w-4 text-slate-600" />
                Exportar JSON (.json)
              </button>

              <button
                onClick={() => downloadSqliteDump(localDb)}
                className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border border-emerald-200"
                title="Gera e baixa um script SQL completo compatível com SQLite"
              >
                <FileCode className="h-4 w-4 text-emerald-700" />
                Script SQLite (.sql)
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border border-dashed border-slate-300">
                <Upload className="h-4 w-4 text-slate-500" />
                Restaurar Backup Local a partir de Arquivo JSON
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileImport}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Seção 4: Sincronização Opcional com a Nuvem (Firebase) */}
          <div className="border border-slate-100 p-4 rounded-xl space-y-3 bg-slate-50/50">
            <div className="flex items-center justify-between font-medium text-xs text-slate-700">
              <span className="flex items-center gap-1.5 text-slate-800 font-semibold">
                <Cloud className="h-4 w-4 text-sky-500" />
                Cópia de Segurança na Nuvem (Opcional)
              </span>
              {loadingInfo ? (
                <span className="flex items-center gap-1 font-mono text-slate-400 text-[11px]">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Verificando...
                </span>
              ) : (
                <button
                  onClick={refreshStatus}
                  className="p-1 hover:bg-slate-200/60 rounded-lg text-slate-500 hover:text-slate-800 transition cursor-pointer"
                  title="Atualizar status online"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-600">
              {cloudBackupInfo ? (
                <div className="space-y-0.5">
                  <div className="font-mono text-[11px] text-slate-700">
                    Último backup na nuvem: <strong className="text-slate-900">{cloudBackupInfo.lastSynced}</strong>
                  </div>
                  <div className="font-mono text-[10.5px] text-slate-500">
                    Operador: <strong className="text-slate-700 uppercase">{cloudBackupInfo.syncedBy}</strong>
                  </div>
                </div>
              ) : (
                <div className="text-center py-1 text-slate-500 text-[11px] italic">
                  Nenhum backup recente registrado na nuvem para este usuário.
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={handleBackupUpload}
                disabled={syncActionLoading !== null}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              >
                {syncActionLoading === "upload" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CloudUpload className="h-3.5 w-3.5" />
                )}
                Enviar Cópia para Nuvem
              </button>

              <button
                onClick={() => setConfirmRestore(true)}
                disabled={syncActionLoading !== null}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer border border-slate-200"
              >
                {syncActionLoading === "download" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CloudDownload className="h-3.5 w-3.5 text-slate-600" />
                )}
                Restaurar da Nuvem
              </button>
            </div>

            {confirmRestore && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs space-y-2 animate-fade-in">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block">Confirmar restauração da nuvem?</strong>
                    Os dados locais serão atualizados com o snapshot do Firestore.
                  </div>
                </div>
                <div className="flex justify-end gap-2 text-[11px]">
                  <button
                    onClick={() => setConfirmRestore(false)}
                    className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 rounded font-medium text-slate-600 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleBackupRestore}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold cursor-pointer"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
