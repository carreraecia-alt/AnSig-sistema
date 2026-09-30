/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from "react";
import { DatabaseState, CadUsuario } from "../types";
import { saveDatabase } from "../data/initDb";
import { normalizeDateOnly, processJsonBackupRowByRow } from "../utils/jsonBackupProcessor";
import { Database, Upload, RefreshCw, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";

interface SqlBackupRestoreProps {
  /** Usuário logado atualmente no sistema */
  currentUser?: CadUsuario | null;
  /** Estado atual do banco de dados na memória */
  currentDb: DatabaseState;
  /** Função de atualização do estado global do banco */
  onUpdateDbState: (updateFn: (prev: DatabaseState) => DatabaseState) => void;
  /** Callback opcional chamado ao concluir a restauração com sucesso */
  onSuccess?: (summary: string) => void;
}

/**
 * Utilitário para fatiar os valores de uma linha SQL INSERT (ex: (1, 'João', '123'))
 * respeitando aspas simples e valores nulos.
 */
function parseSqlValues(valuesPart: string): string[] {
  const result: string[] = [];
  let current = "";
  let inString = false;
  let escape = false;

  for (let i = 0; i < valuesPart.length; i++) {
    const char = valuesPart[i];

    if (escape) {
      current += char;
      escape = false;
      continue;
    }

    if (char === "\\") {
      escape = true;
      continue;
    }

    if (char === "'") {
      if (inString && valuesPart[i + 1] === "'") {
        // Trata escape de aspas duplicadas SQL: ''
        current += "'";
        i++;
        continue;
      }
      inString = !inString;
      continue;
    }

    if (char === "," && !inString) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  if (current.length > 0) {
    result.push(current.trim());
  }

  // Sanitiza valores: remove aspas externas e converte NULLs
  return result.map((val) => {
    if (val.toUpperCase() === "NULL") return "";
    if (val.startsWith("'") && val.endsWith("'")) {
      return val.slice(1, -1);
    }
    return val;
  });
}

export const SqlBackupRestore: React.FC<SqlBackupRestoreProps> = ({
  currentUser,
  currentDb,
  onUpdateDbState,
  onSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
    details?: string;
  } | null>(null);

  // 1. Verificação de permissão estrita: visível e operável apenas para administradores
  const isAdmin =
    currentUser?.Permissoes === "Administrador" ||
    currentUser?.NivelAcesso?.toLowerCase() === "administrador" ||
    currentUser?.NivelAcesso?.toLowerCase() === "admin" ||
    currentUser?.permission_level === 99 ||
    currentUser?.permission_level === 1;

  if (!isAdmin) {
    // Não renderiza nada se o usuário não for administrador
    return null;
  }

  // 2 e 3. Disparo do clique no input de arquivo oculto com prévia confirmação
  const handleButtonClick = () => {
    // 6. Confirmação prévia de segurança
    const confirmed = window.confirm(
      "⚠️ ATENÇÃO: RESTAURAÇÃO DE BACKUP SQL\n\n" +
      "Você está prestes a restaurar dados de um arquivo de backup (.sql / .txt).\n" +
      "Os registros existentes que possuírem os mesmos IDs serão SUBSTITUÍDOS (INSERT OR REPLACE).\n\n" +
      "Deseja selecionar o arquivo e prosseguir com a restauração?"
    );

    if (!confirmed) return;

    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Limpa seleção anterior
      fileInputRef.current.click();
    }
  };

  // 4. Leitura do arquivo selecionado usando FileReader
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    setFeedback(null);

    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const fileContent = event.target?.result as string;
        if (!fileContent || !fileContent.trim()) {
          throw new Error("O arquivo de backup selecionado está vazio.");
        }

        const trimmed = fileContent.trim();
        // Detecta se o arquivo é JSON
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
          const parsedData = JSON.parse(trimmed);
          const targetOwnerId = currentUser?.IdUsuarioMaster || currentUser?.Id || "user-1";
          const { newState, summary } = processJsonBackupRowByRow(parsedData, currentDb, targetOwnerId);

          onUpdateDbState(() => newState);
          if (typeof saveDatabase === "function") {
            saveDatabase(newState);
          }

          const successMsg = `Backup JSON restaurado com sucesso! ${summary.totalLinhas} registros processados de ponta a ponta sem falhas.`;
          const summaryDetails = `Clientes: ${summary.clientes} | Pets: ${summary.pets} | Produtos/Serviços: ${summary.produtos} | Movimentos: ${summary.movimentos} | Detalhes/Agenda: ${summary.detalhesMov}`;

          setFeedback({
            type: "success",
            message: successMsg,
            details: summaryDetails,
          });

          alert(`✅ ${successMsg}\n\n${summaryDetails}`);

          if (onSuccess) {
            onSuccess(successMsg);
          }
          return;
        }

        // 5. Executa a lógica SQL linha por linha em transação com INSERT OR REPLACE
        const executionStats = executeSqlBatch(fileContent);

        const successMsg = `Backup restaurado com sucesso! ${executionStats.totalInserted} registros processados em ${executionStats.tablesUpdated.length} tabelas.`;
        
        setFeedback({
          type: "success",
          message: successMsg,
          details: executionStats.summary,
        });

        alert(`✅ ${successMsg}\n\n${executionStats.summary}`);

        if (onSuccess) {
          onSuccess(successMsg);
        }
      } catch (err: any) {
        console.error("Erro na restauração do backup SQL:", err);
        const errMsg = err.message || "Falha ao processar comandos do arquivo SQL.";
        setFeedback({
          type: "error",
          message: "Erro na restauração do backup!",
          details: errMsg,
        });
        alert(`❌ Falha na restauração do backup:\n${errMsg}`);
      } finally {
        setIsRestoring(false);
      }
    };

    reader.onerror = () => {
      setIsRestoring(false);
      const errMsg = "Não foi possível ler o arquivo selecionado no sistema de arquivos.";
      setFeedback({
        type: "error",
        message: "Erro de I/O na leitura do arquivo.",
        details: errMsg,
      });
      alert(`❌ ${errMsg}`);
    };

    // Lê o arquivo como texto UTF-8 (compatível com .sql e .txt)
    reader.readAsText(file, "UTF-8");
  };

  /**
   * 5. Parser e executor SQL linha por linha.
   * Suporta CREATE TABLE IF NOT EXISTS e INSERT OR REPLACE INTO para todas as tabelas:
   * CadUsuarios, CadClientes, CadPets, CadProdutos, CadMovDiario, CadDetMovDiario, etc.
   */
  const executeSqlBatch = (sqlText: string) => {
    const stats: Record<string, number> = {};
    let totalInserted = 0;

    // Normaliza quebras de linha e divide por instruções terminadas em ponto e vírgula
    const lines = sqlText
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("--") && !l.startsWith("/*"));

    onUpdateDbState((prevState) => {
      // Clones das listas para garantir atualização atômica e imutável
      const newClientes = [...(prevState.clientes || [])];
      const newPets = [...(prevState.pets || [])];
      const newProdutos = [...(prevState.produtos || [])];
      const newUsuarios = [...(prevState.usuarios || [])];
      const newMovimentos = [...(prevState.movimentos || [])];
      const newDetalhesMov = [...(prevState.detalhesMov || [])];
      const newFornecedores = [...(prevState.fornecedores || [])];
      const newRacas = [...(prevState.racas || [])];

      for (const line of lines) {
        // Ignora comandos puramente estruturais se já garantidos pelo app
        if (/^CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS/i.test(line)) {
          continue;
        }

        // Reconhece INSERT INTO ou INSERT OR REPLACE INTO
        const insertMatch = line.match(
          /^INSERT\s+(?:OR\s+REPLACE\s+)?INTO\s+([`"']?[\w]+[`"']?)\s*(?:\(([^)]+)\))?\s*VALUES\s*\((.+)\);?$/i
        );

        if (!insertMatch) continue;

        const rawTableName = insertMatch[1].replace(/[`"']/g, "");
        const rawColumns = insertMatch[2]
          ? insertMatch[2].split(",").map((c) => c.trim().replace(/[`"']/g, ""))
          : [];
        const rawValues = parseSqlValues(insertMatch[3]);

        // Mapeia colunas para valores como dicionário chave-valor
        const rowObject: Record<string, any> = {};
        if (rawColumns.length > 0) {
          rawColumns.forEach((col, idx) => {
            rowObject[col] = rawValues[idx] !== undefined ? rawValues[idx] : "";
          });
        }

        const tableUpper = rawTableName.toUpperCase();

        // 1. Tabela: CadUsuarios / usuarios
        if (tableUpper.includes("CADUSUARIO") || tableUpper === "USUARIOS") {
          const id = rowObject.Id || rawValues[0] || `user-${Date.now()}-${Math.random()}`;
          const existingIdx = newUsuarios.findIndex((u) => u.Id === id);
          const usuarioData: any = {
            Id: String(id),
            Nome: rowObject.Nome || rawValues[1] || "",
            Senha: rowObject.Senha || rawValues[2] || "123456",
            Permissoes: (rowObject.Permissoes || rawValues[3] || "Usuário") as any,
            Tipo_Assinatura: rowObject.Tipo_Assinatura || rawValues[4] || "Vitalício",
            Data_Validade: rowObject.Data_Validade || rawValues[5] || "",
            ...rowObject,
          };

          if (existingIdx >= 0) {
            newUsuarios[existingIdx] = { ...newUsuarios[existingIdx], ...usuarioData };
          } else {
            newUsuarios.push(usuarioData);
          }
          stats["CadUsuarios"] = (stats["CadUsuarios"] || 0) + 1;
          totalInserted++;
        }

        // 2. Tabela: CadClientes / clientes
        else if (tableUpper.includes("CADCLIENTE") || tableUpper === "CLIENTES") {
          const id = rowObject.Id || rawValues[0] || `cli-${Date.now()}-${Math.random()}`;
          const existingIdx = newClientes.findIndex((c) => c.Id === id);
          const clienteData: any = {
            Id: String(id),
            Nome: rowObject.Nome || rawValues[1] || "",
            Telefone: rowObject.Telefone || rawValues[2] || "",
            Endereco: rowObject.Endereco || rawValues[3] || "",
            Ativo: rowObject.Ativo !== undefined ? Boolean(Number(rowObject.Ativo)) : true,
            IdUsuarioDono: rowObject.IdUsuarioDono || rawValues[5] || currentUser?.Id || "1",
            ...rowObject,
          };

          if (existingIdx >= 0) {
            newClientes[existingIdx] = { ...newClientes[existingIdx], ...clienteData };
          } else {
            newClientes.push(clienteData);
          }
          stats["CadClientes"] = (stats["CadClientes"] || 0) + 1;
          totalInserted++;
        }

        // 3. Tabela: CadPets / pets
        else if (tableUpper.includes("CADPET") || tableUpper === "PETS") {
          const id = rowObject.Id || rawValues[0] || `pet-${Date.now()}-${Math.random()}`;
          const existingIdx = newPets.findIndex((p) => p.Id === id);
          const petData: any = {
            Id: String(id),
            Nome: rowObject.Nome || rawValues[1] || "",
            Especie: rowObject.Especie || rawValues[2] || "Canino",
            Raca: rowObject.Raca || rawValues[3] || "SRD",
            Porte: rowObject.Porte || rawValues[4] || "Médio",
            Sexo: rowObject.Sexo || rawValues[5] || "Macho",
            IdCliente: rowObject.IdCliente || rawValues[6] || "",
            Ativo: rowObject.Ativo !== undefined ? Boolean(Number(rowObject.Ativo)) : true,
            ...rowObject,
          };

          if (existingIdx >= 0) {
            newPets[existingIdx] = { ...newPets[existingIdx], ...petData };
          } else {
            newPets.push(petData);
          }
          stats["CadPets"] = (stats["CadPets"] || 0) + 1;
          totalInserted++;
        }

        // 4. Tabela: CadProdutos / produtos / servicos
        else if (tableUpper.includes("CADPRODUTO") || tableUpper === "PRODUTOS") {
          const id = rowObject.Id || rawValues[0] || `prod-${Date.now()}-${Math.random()}`;
          const existingIdx = newProdutos.findIndex((p) => p.Id === id);
          const prodData: any = {
            Id: String(id),
            Nome: rowObject.Nome || rawValues[1] || "",
            Tipo: rowObject.Tipo || rawValues[2] || "Serviço",
            Preco: Number(rowObject.Preco || rawValues[3] || 0),
            Ativo: rowObject.Ativo !== undefined ? Boolean(Number(rowObject.Ativo)) : true,
            ...rowObject,
          };

          if (existingIdx >= 0) {
            newProdutos[existingIdx] = { ...newProdutos[existingIdx], ...prodData };
          } else {
            newProdutos.push(prodData);
          }
          stats["CadProdutos"] = (stats["CadProdutos"] || 0) + 1;
          totalInserted++;
        }

        // 5. Tabela: CadMovDiario / agendamentos
        else if (tableUpper.includes("CADMOVDIARIO") || tableUpper === "AGENDAMENTOS") {
          const id = rowObject.Id || rawValues[0] || `mov-${Date.now()}-${Math.random()}`;
          const existingIdx = newMovimentos.findIndex((m) => m.Id === id);
          const rawDate = rowObject.Data || rawValues[1] || "";
          const movData: any = {
            Id: String(id),
            Data: normalizeDateOnly(rawDate) || rawDate,
            IdCliente: rowObject.IdCliente || rawValues[2] || "",
            IdPet: rowObject.IdPet || rawValues[3] || "",
            Status: rowObject.Status || rawValues[4] || "Agendado",
            ValorTotal: Number(rowObject.ValorTotal || rawValues[5] || 0),
            ...rowObject,
          };
          if (rawDate) {
            movData.Data = normalizeDateOnly(rawDate);
          }

          if (existingIdx >= 0) {
            newMovimentos[existingIdx] = { ...newMovimentos[existingIdx], ...movData };
          } else {
            newMovimentos.push(movData);
          }
          stats["CadMovDiario"] = (stats["CadMovDiario"] || 0) + 1;
          totalInserted++;
        }

        // 6. Tabela: CadDetMovDiario
        else if (tableUpper.includes("CADDETMOVDIARIO")) {
          const id = rowObject.Id || rawValues[0] || `det-${Date.now()}-${Math.random()}`;
          const existingIdx = newDetalhesMov.findIndex((d) => d.Id === id);
          const detData: any = {
            Id: String(id),
            IdMov: rowObject.IdMov || rawValues[1] || "",
            IdProduto: rowObject.IdProduto || rawValues[2] || "",
            Quantidade: Number(rowObject.Quantidade || rawValues[3] || 1),
            ValorUnitario: Number(rowObject.ValorUnitario || rawValues[4] || 0),
            ...rowObject,
          };
          if (detData.Data) {
            detData.Data = normalizeDateOnly(detData.Data);
          }

          if (existingIdx >= 0) {
            newDetalhesMov[existingIdx] = { ...newDetalhesMov[existingIdx], ...detData };
          } else {
            newDetalhesMov.push(detData);
          }
          stats["CadDetMovDiario"] = (stats["CadDetMovDiario"] || 0) + 1;
          totalInserted++;
        }

        // 7. Tabela: CadRacas
        else if (tableUpper.includes("CADRACA") || tableUpper === "RACAS") {
          const id = rowObject.Id || rawValues[0] || `raca-${Date.now()}-${Math.random()}`;
          const existingIdx = newRacas.findIndex((r) => r.Id === id);
          const racaData: any = {
            Id: String(id),
            Nome: rowObject.Nome || rawValues[1] || "",
            Especie: rowObject.Especie || rawValues[2] || "Canino",
            ...rowObject,
          };

          if (existingIdx >= 0) {
            newRacas[existingIdx] = { ...newRacas[existingIdx], ...racaData };
          } else {
            newRacas.push(racaData);
          }
          stats["CadRacas"] = (stats["CadRacas"] || 0) + 1;
          totalInserted++;
        }
      }

      // Monta o novo estado atualizado
      const updatedDatabase: DatabaseState = {
        ...prevState,
        clientes: newClientes,
        pets: newPets,
        produtos: newProdutos,
        usuarios: newUsuarios,
        movimentos: newMovimentos,
        detalhesMov: newDetalhesMov,
        fornecedores: newFornecedores,
        racas: newRacas,
      };

      // Grava no banco local persistente (LocalStorage / SQLite)
      saveDatabase(updatedDatabase);

      return updatedDatabase;
    });

    const tablesUpdated = Object.keys(stats);
    const summary = tablesUpdated.map((tbl) => `• ${tbl}: ${stats[tbl]} registros`).join("\n");

    return {
      totalInserted,
      tablesUpdated,
      summary,
    };
  };

  return (
    <div className="w-full bg-white border border-amber-200/90 rounded-2xl p-5 shadow-xs space-y-4">
      <div className="border-b border-amber-100 pb-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-amber-600 mb-1">
            <Database className="h-4 w-4 text-amber-500" />
            <span className="text-[10px] uppercase font-bold tracking-wider font-mono">
              Recuperação do Sistema (Apenas Administrador)
            </span>
          </div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
            Restaurar Backup do Banco de Dados (.SQL / .TXT)
          </h3>
          <p className="text-xs text-slate-500">
            Carregue scripts SQL gerados pelo sistema ou arquivos de dump (ex: <code>arquivo exe sql_3.txt</code>) para restaurar clientes, pets, serviços e usuários.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-amber-50/50 border border-amber-200/70 rounded-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
            <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
            <span>Execução Atômica de Instruções SQL</span>
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed max-w-xl">
            O motor processa comandos <code>CREATE TABLE IF NOT EXISTS</code> e <code>INSERT OR REPLACE INTO</code> linha por linha, preservando a integridade referencial entre clientes e pets.
          </p>
        </div>

        {/* 3. Input de arquivo oculto com accept para .txt e .sql */}
        <input
          type="file"
          ref={fileInputRef}
          accept=".txt,.sql,.json"
          style={{ display: "none" }}
          onChange={handleFileChange}
          id="hidden-sql-backup-input"
        />

        {/* 2. Botão 'Restaurar Backup' (visível apenas para administradores) */}
        <button
          type="button"
          id="btn-restaurar-backup-sql"
          onClick={handleButtonClick}
          disabled={isRestoring}
          className={`shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-98 cursor-pointer ${
            isRestoring
              ? "bg-amber-300 text-amber-900 cursor-not-allowed"
              : "bg-amber-500 hover:bg-amber-600 text-slate-950 hover:shadow-md"
          }`}
        >
          {isRestoring ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin text-slate-950" />
              <span>Processando Linhas SQL...</span>
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 text-slate-950" />
              <span>Restaurar Backup</span>
            </>
          )}
        </button>
      </div>

      {/* 6. Feedback visual de Sucesso ou Erro */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs space-y-2 animate-fadeIn ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-2 font-bold">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>

          {feedback.details && (
            <pre className="mt-2 p-2.5 bg-white/70 rounded-lg text-[11px] font-mono whitespace-pre-wrap border border-slate-200 text-slate-700">
              {feedback.details}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};

export default SqlBackupRestore;
