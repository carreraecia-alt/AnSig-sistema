import React, { useState, useMemo } from "react";
import { DatabaseState } from "../types";
import { jsPDF } from "jspdf";
import {
  Database,
  Key,
  Hash,
  Type,
  Calendar,
  DollarSign,
  ToggleLeft,
  Link2,
  Search,
  TableProperties,
  Clock,
  User,
  Layers,
  Sparkles,
  Bookmark,
  Building,
  Activity,
  FileSpreadsheet,
  FileText
} from "lucide-react";

interface SchemaSheetProps {
  db: DatabaseState;
  activeTheme: {
    primary: string;
    text: string;
    accent: string;
    border: string;
  };
}

interface FieldSchema {
  name: string;
  type: string;
  category: "pk" | "fk" | "text" | "number" | "boolean" | "select";
  description: string;
  sampleValue?: string;
}

interface TableSchema {
  tableName: string;
  displayName: string;
  description: string;
  icon: React.ComponentType<any>;
  recordCount: number;
  fields: FieldSchema[];
  relations?: { fromField: string; toTable: string; toField: string }[];
}

export default function SchemaSheet({ db, activeTheme }: SchemaSheetProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [isProcessingForAI, setIsProcessingForAI] = useState(false);

  // Define database schema structures dynamically matching types.ts
  const schemas: TableSchema[] = useMemo(() => {
    return [
      {
        tableName: "CadUsuario",
        displayName: "Usuários (CadUsuario)",
        description: "Cadastro de operadores do sistema, controlando credenciais de acesso e permissões decorrentes.",
        icon: User,
        recordCount: db.usuarios?.length || 0,
        fields: [
          { name: "Id", type: "Texto", category: "pk", description: "Chave Primária Geral do Operador", sampleValue: "usr-928" },
          { name: "Nome", type: "Texto", category: "text", description: "Nome de usuário / operador para login", sampleValue: "carrera" },
          { name: "Senha", type: "Texto", category: "text", description: "Senha criptografada ou texto simples para controle de acesso", sampleValue: "123456" },
          { name: "Permissoes", type: "Opções ('Administrador' | 'Usuário')", category: "select", description: "Nível de controle de permissões no app", sampleValue: "Administrador" }
        ],
        relations: []
      },
      {
        tableName: "CadCliente",
        displayName: "Clientes (CadCliente)",
        description: "Cadastro de proprietários e clientes gerais do pet shop vinculados aos seus respectivos operadores.",
        icon: User,
        recordCount: db.clientes?.length || 0,
        fields: [
          { name: "Id", type: "Texto", category: "pk", description: "Chave Primária Geral do Cliente", sampleValue: "cli-374" },
          { name: "Nome", type: "Texto", category: "text", description: "Nome completo do proprietário", sampleValue: "Maria Silva" },
          { name: "Telefone", type: "Texto", category: "text", description: "Número de contato/WhatsApp formatado", sampleValue: "(11) 99999-8888" },
          { name: "Endereco", type: "Texto", category: "text", description: "Endereço residencial para serviços / entregas (concatenado ou livre)", sampleValue: "Rua das Flores, 123" },
          { name: "Ativo", type: "Booleano (Verdadeiro/Falso)", category: "boolean", description: "Status de ativação do cliente no sistema", sampleValue: "true" },
          { name: "IdUsuarioDono", type: "Texto", category: "fk", description: "Chave Estrangeira ligada ao criador do registro (CadUsuario.Id)", sampleValue: "usr-1" },
          { name: "CpfCnpj", type: "Texto (Opcional)", category: "text", description: "Documento CPF ou CNPJ do Cliente", sampleValue: "123.456.789-00" },
          { name: "RgIe", type: "Texto (Opcional)", category: "text", description: "RG ou Inscrição Estadual (IE) do Cliente", sampleValue: "12.345.678-9" },
          { name: "Email", type: "Texto (Opcional)", category: "text", description: "Endereço de e-mail para envio de notas fiscais", sampleValue: "cliente@email.com" },
          { name: "Cep", type: "Texto (Opcional)", category: "text", description: "Código de Endereçamento Postal", sampleValue: "01311-200" },
          { name: "Numero", type: "Texto (Opcional)", category: "text", description: "Número do imóvel residencial", sampleValue: "1500" },
          { name: "Complemento", type: "Texto (Opcional)", category: "text", description: "Apartamento, bloco, conjunto ou ponto de referência", sampleValue: "Apto 42" },
          { name: "Bairro", type: "Texto (Opcional)", category: "text", description: "Bairro do local de entrega", sampleValue: "Bela Vista" },
          { name: "Cidade", type: "Texto (Opcional)", category: "text", description: "Cidade de residência", sampleValue: "São Paulo" },
          { name: "Estado", type: "Texto (Opcional)", category: "text", description: "Sigla do estado (UF)", sampleValue: "SP" },
          { name: "DataNascimento", type: "Texto (YYYY-MM-DD) (Opcional)", category: "calendar", description: "Data de nascimento do cliente para controle de aniversariantes", sampleValue: "1994-10-12" },
          { name: "DataCadastro", type: "Texto (YYYY-MM-DD) (Opcional)", category: "calendar", description: "Data em que o cliente foi cadastrado no sistema", sampleValue: "2026-06-17" },
          { name: "LimiteCredito", type: "Número Decimal (Opcional)", category: "currency", description: "Limite de faturamento pendente autorizado (Cobrança em Conta/Fiado)", sampleValue: "500.00" }
        ],
        relations: [
          { fromField: "IdUsuarioDono", toTable: "CadUsuario", toField: "Id" }
        ]
      },
      {
        tableName: "CadPets",
        displayName: "Pets (CadPets)",
        description: "Banco de animais registrados no sistema, com características individuais e associação com proprietários.",
        icon: Sparkles,
        recordCount: db.pets?.length || 0,
        fields: [
          { name: "Id", type: "Texto", category: "pk", description: "Chave Primária Geral do Pet", sampleValue: "pet-251" },
          { name: "Nome", type: "Texto", category: "text", description: "Nome pelo qual o pet é chamado", sampleValue: "Mel" },
          { name: "Especie", type: "Texto", category: "text", description: "Espécie do animal (ex: Cão, Gato, Pássaro)", sampleValue: "Cão" },
          { name: "Raca", type: "Texto (Opcional)", category: "text", description: "Nome da raça cadastrada livre ou vinculada", sampleValue: "Shih Tzu" },
          { name: "Porte", type: "Texto", category: "text", description: "Porte físico de tamanho do pet (Pequeno, Médio, Grande)", sampleValue: "Pequeno" },
          { name: "Sexo", type: "Texto", category: "text", description: "Identificação biológica de sexo (Macho ou Fêmea)", sampleValue: "Fêmea" },
          { name: "IdCliente", type: "Texto", category: "fk", description: "Chave Estrangeira ligada ao Proprietário (CadCliente.Id)", sampleValue: "cli-374" },
          { name: "Ativo", type: "Booleano (Verdadeiro/Falso)", category: "boolean", description: "Habilita ou oculta o pet nas buscas tradicionais", sampleValue: "true" }
        ],
        relations: [
          { fromField: "IdCliente", toTable: "CadCliente", toField: "Id" }
        ]
      },
      {
        tableName: "CadProdutos",
        displayName: "Serviços e Produtos (CadProdutos)",
        description: "Catálogo de procedimentos (ex: banho, tosa) e bens materiais oferecidos comercialmente no estabelecimento.",
        icon: Layers,
        recordCount: db.produtos?.length || 0,
        fields: [
          { name: "Id", type: "Texto", category: "pk", description: "Chave Primária Geral do Serviço / Produto", sampleValue: "prod-483" },
          { name: "Nome", type: "Texto", category: "text", description: "Título do item ou serviço de tosa", sampleValue: "Banho Higiênico" },
          { name: "Tipo", type: "Texto", category: "text", description: "Classificação sistemática de categoria", sampleValue: "Serviço" },
          { name: "Preco", type: "Número Decimal", category: "number", description: "Preço monetário base de cobrança pública", sampleValue: "55.00" },
          { name: "Ativo", type: "Booleano (Verdadeiro/Falso)", category: "boolean", description: "Disponibilidade de venda do item no caixa", sampleValue: "true" },
          { name: "EstoqueAtual", type: "Número Inteiro", category: "number", description: "Quantidade de produtos físicos em estoque real", sampleValue: "20" },
          { name: "EstoqueMinimo", type: "Número Inteiro", category: "number", description: "Quantidade mínima do produto em estoque (alerta de reposição)", sampleValue: "5" },
          { name: "Custo", type: "Número Decimal", category: "number", description: "Preço de custo / compra do produto para calcular o lucro", sampleValue: "18.50" },
          { name: "CodigoDeBarras", type: "Texto", category: "text", description: "Código de barras único do produto para busca no Caixa Rápido", sampleValue: "7891234567890" },
          { name: "UnidadeMedida", type: "Texto", category: "text", description: "Unidade de medida de comercialização (ex: Un, Kg, Pacote)", sampleValue: "Un" },
          { name: "Fornecedor", type: "Texto", category: "text", description: "Nome ou ID do fornecedor do produto", sampleValue: "Distribuidora PetLife LTDA" },
          { name: "DataUltimaCompra", type: "Data", category: "text", description: "Data do último reabastecimento de estoque", sampleValue: "2026-06-15" },
          { name: "NCM", type: "Texto", category: "text", description: "Código de 8 dígitos para a Nomenclatura Comum do Mercosul", sampleValue: "3004.90.99" },
          { name: "CEST", type: "Texto", category: "text", description: "Código de 7 dígitos para a Substituição Tributária (fiscal)", sampleValue: "1300500" },
          { name: "OrigemProduto", type: "Texto ou Inteiro", category: "text", description: "Indicação de origem (0 - Nacional, 1 - Importado, etc.)", sampleValue: "0" },
          { name: "Validade", type: "Data", category: "text", description: "Data de vencimento / validade do produto", sampleValue: "2027-12-31" }
        ],
        relations: []
      },
      {
        tableName: "CadRaca",
        displayName: "Biblioteca de Raças (CadRaça)",
        description: "Tabela de apoio taxonômico contendo raças de animais pré-mapeadas cruzadas com suas respectivas espécies.",
        icon: Bookmark,
        recordCount: db.racas?.length || 0,
        fields: [
          { name: "Id", type: "Texto", category: "pk", description: "Chave Primária da Raça", sampleValue: "rac-10" },
          { name: "Raca", type: "Texto", category: "text", description: "Nome oficial ou popularizado da raça", sampleValue: "Golden Retriever" },
          { name: "Especie", type: "Texto", category: "text", description: "Espécie de correlação direta", sampleValue: "Cão" }
        ],
        relations: []
      },
      {
        tableName: "CadMovDiario",
        displayName: "Cabeçalho Movimento Diário (CadMovDiario)",
        description: "Registro agregador (Parent) que centraliza os atendimentos agrupados por cliente em uma determinada data de atendimento.",
        icon: Activity,
        recordCount: db.movimentos?.length || 0,
        fields: [
          { name: "Id", type: "Texto", category: "pk", description: "Chave Primária Geral do Agrupador Diário", sampleValue: "mov-8291" },
          { name: "Cliente", type: "Texto (ID correspondente)", category: "fk", description: "ID de Ligação com Proprietário CadCliente ou nome literal", sampleValue: "cli-374" },
          { name: "Telefone", type: "Texto (Copiado)", category: "text", description: "Número de telefone espelhado do cliente", sampleValue: "(11) 99999-8888" },
          { name: "Endereco", type: "Texto (Copiado)", category: "text", description: "Endereço de atendimento espelhado do cliente", sampleValue: "Rua de Entrada, 45" },
          { name: "Observacao", type: "Texto", category: "text", description: "Observações, avisos ou restrições de comportamento", sampleValue: "Pet arisco, cuidado ao tosar" },
          { name: "IdUsuarioDono", type: "Texto", category: "fk", description: "Chave Estrangeira do Operador Criador (CadUsuario.Id)", sampleValue: "usr-1" }
        ],
        relations: [
          { fromField: "Cliente", toTable: "CadCliente", toField: "Id" },
          { fromField: "IdUsuarioDono", toTable: "CadUsuario", toField: "Id" }
        ]
      },
      {
        tableName: "CadDetMovDiario",
        displayName: "Serviços do Movimento Diário (CadDetMovDiario)",
        description: "Tabela granular de transações e procedimentos agendados ou concluídos, contendo preços, datas, status e vinculações diretas.",
        icon: FileSpreadsheet,
        recordCount: db.detalhesMov?.length || 0,
        fields: [
          { name: "Id", type: "Texto", category: "pk", description: "Chave Primária Geral do Registro de Linha", sampleValue: "det-410" },
          { name: "IdCadMovDiario", type: "Texto", category: "fk", description: "Vínculo de cabeçalho herdeiro direto (CadMovDiario.Id)", sampleValue: "mov-8291" },
          { name: "IdPet", type: "Texto", category: "fk", description: "Vínculo físico ao animal de estimação atendido (CadPets.Id)", sampleValue: "pet-251" },
          { name: "Data", type: "Texto (YYYY-MM-DD)", category: "calendar", description: "Data oficial que o serviço está programado ou realizado", sampleValue: "2026-06-04" },
          { name: "Hora", type: "Texto (HH:MM)", category: "clock", description: "Hora de início ou encaixe programado", sampleValue: "09:30" },
          { name: "NomePet", type: "Texto", category: "text", description: "Nome do animal de estimação atendido", sampleValue: "Mel" },
          { name: "Quantidade", type: "Número Inteiro", category: "number", description: "Multiplicador financeiro de itens transacionados", sampleValue: "1" },
          { name: "Servico", type: "Texto (ID correspondente)", category: "fk", description: "ID do serviço/produto cadastrado associado (CadProdutos.Id)", sampleValue: "prod-483" },
          { name: "PrecoUnitario", type: "Número Decimal", category: "number", description: "Preço unitário no dia do fechamento", sampleValue: "55.00" },
          { name: "Tipo", type: "Opções ('Entrada' | 'Saída')", category: "select", description: "Direção do fluxo (Entrada para faturamento, Saída para despesas)", sampleValue: "Entrada" },
          { name: "TotalDaLinha", type: "Número Decimal", category: "number", description: "Valor financeiro líquido total calculado da linha (Preço * Qtd)", sampleValue: "55.00" },
          { name: "Realizado", type: "Booleano (Verdadeiro/Falso)", category: "boolean", description: "Indica se o serviço de banho/tosa já foi finalizado", sampleValue: "false" },
          { name: "Pago", type: "Booleano (Verdadeiro/Falso)", category: "boolean", description: "Registra se a cobrança do serviço foi quitada pelo cliente", sampleValue: "true" },
          { name: "Ativo", type: "Booleano (Verdadeiro/Falso)", category: "boolean", description: "Controle lógico de exclusão de registros de serviço", sampleValue: "true" }
        ],
        relations: [
          { fromField: "IdCadMovDiario", toTable: "CadMovDiario", toField: "Id" },
          { fromField: "IdPet", toTable: "CadPets", toField: "Id" },
          { fromField: "Servico", toTable: "CadProdutos", toField: "Id" }
        ]
      },
      {
        tableName: "CadInfoConta",
        displayName: "Branding e Identidade Visual (CadInfoConta)",
        description: "Configurações de customização da conta de operador, contendo detalhes de visual da loja, marca e logotipo.",
        icon: Building,
        recordCount: db.infoContas?.length || 0,
        fields: [
          { name: "Id", type: "Texto", category: "pk", description: "Chave Primária Geral do Branding", sampleValue: "conf-77" },
          { name: "NomeEmpresa", type: "Texto", category: "text", description: "Nome de fantasia corporativo da empresa", sampleValue: "Pet Elegance" },
          { name: "Logo", type: "Texto (Base64)", category: "text", description: "String comprimida de dados de imagem do logotipo", sampleValue: "data:image/png;base64,iVBOR..." },
          { name: "Endereco", type: "Texto", category: "text", description: "Endereço físico institucional impresso nos relatórios", sampleValue: "Av. Principal, 500" },
          { name: "Fone", type: "Texto", category: "text", description: "Telefone de contato corporativo oficial", sampleValue: "(11) 4002-8922" },
          { name: "CorFundo", type: "Texto", category: "text", description: "Classe Tailwind ou CSS hexadecimal de cor de fundo", sampleValue: "#f8fafc" },
          { name: "IdUsuarioDono", type: "Texto", category: "fk", description: "Vínculo do operador que customizou a viewport (CadUsuario.Id)", sampleValue: "usr-1" },
          { name: "Razao_Social", type: "Texto", category: "text", description: "Razão Social ou Nome Completo do Proprietário", sampleValue: "Pet Shop Ltda" },
          { name: "Documento_Identificacao", type: "Texto", category: "text", description: "Documento de Identificação (CNPJ ou CPF)", sampleValue: "12.345.678/0001-90" },
          { name: "CEP_Estabelecimento", type: "Texto", category: "text", description: "CEP do estabelecimento", sampleValue: "13400-000" }
        ],
        relations: [
          { fromField: "IdUsuarioDono", toTable: "CadUsuario", toField: "Id" }
        ]
      }
    ];
  }, [db]);

  // Handle Search Filtering
  const filteredSchemas = useMemo(() => {
    if (!searchTerm.trim()) return schemas;
    const term = searchTerm.toLowerCase();
    return schemas.filter(
      (s) =>
        s.tableName.toLowerCase().includes(term) ||
        s.displayName.toLowerCase().includes(term) ||
        s.description.toLowerCase().includes(term) ||
        s.fields.some(
          (f) =>
            f.name.toLowerCase().includes(term) ||
            f.description.toLowerCase().includes(term) ||
            f.type.toLowerCase().includes(term)
        )
    );
  }, [schemas, searchTerm]);

  // Helper render for Field Icon based on category
  const getFieldIcon = (category: string) => {
    switch (category) {
      case "pk":
        return <Key className="h-3 w-3 text-amber-500 shrink-0" />;
      case "fk":
        return <Link2 className="h-3 w-3 text-sky-500 shrink-0 select-none animate-pulse" />;
      case "number":
        return <DollarSign className="h-3 w-3 text-emerald-500 shrink-0" />;
      case "boolean":
        return <ToggleLeft className="h-3 w-3 text-purple-500 shrink-0" />;
      case "calendar":
        return <Calendar className="h-3 w-3 text-rose-500 shrink-0" />;
      case "clock":
        return <Clock className="h-3 w-3 text-indigo-500 shrink-0" />;
      default:
        return <Type className="h-3 w-3 text-slate-400 shrink-0" />;
    }
  };

  // Helper to escape values for CSV compatible with Google Sheets
  const escapeCSVValue = (val: any) => {
    if (val === undefined || val === null) return "";
    let str = String(val);
    str = str.replace(/"/g, '""');
    if (str.includes(",") || str.includes("\n") || str.includes('"') || str.includes(";") || str.includes("\r")) {
      return `"${str}"`;
    }
    return str;
  };

  // Main Export function for Google Sheets structure or full dataset
  const handleExportGoogleSheets = (includeData: boolean) => {
    let content = "";
    
    if (!includeData) {
      content += "========================================================\n";
      content += "ESTRUTURA DE TABELAS DO PET SHOP (PARA GOOGLE SHEETS)\n";
      content += "========================================================\n\n";
      content += "INSTRUÇÕES:\n";
      content += "1. Crie uma nova aba para cada tabela listada abaixo em sua planilha do Google Sheets.\n";
      content += "2. Copie a linha de campos e cole na primeira linha (A1) da aba respectiva.\n\n";
    } else {
      content += "========================================================\n";
      content += "DADOS COMPLETOS DO BANCO DE DADOS (PARA GOOGLE SHEETS)\n";
      content += "========================================================\n\n";
      content += "INSTRUÇÕES:\n";
      content += "1. Este arquivo contém todos os dados cadastrados em formato de bloco CSV separado por vírgulas.\n";
      content += "2. Cada seção abaixo possui os cabeçalhos seguidos pelos registros reais salvos.\n";
      content += "3. Copie o bloco de cada tabela individualmente e selecione 'Dados' -> 'Dividir texto em colunas' se necessário no Google Sheets.\n\n";
    }

    schemas.forEach((schema) => {
      content += `=== TABELA: ${schema.tableName} ===\n`;
      
      const headers = schema.fields.map(f => f.name);
      content += headers.join(",") + "\n";
      
      if (includeData) {
        let records: any[] = [];
        if (schema.tableName === "CadUsuario") records = db.usuarios || [];
        else if (schema.tableName === "CadCliente") records = db.clientes || [];
        else if (schema.tableName === "CadPets") records = db.pets || [];
        else if (schema.tableName === "CadProdutos") records = db.produtos || [];
        else if (schema.tableName === "CadRaca") records = db.racas || [];
        else if (schema.tableName === "CadMovDiario") records = db.movimentos || [];
        else if (schema.tableName === "CadDetMovDiario") records = db.detalhesMov || [];
        else if (schema.tableName === "CadInfoConta") records = db.infoContas || [];
        
        records.forEach((row) => {
          const rowValues = schema.fields.map((field) => {
            const rawVal = row[field.name];
            return escapeCSVValue(rawVal);
          });
          content += rowValues.join(",") + "\n";
        });
      }
      content += "\n";
    });

    const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateStr = new Date().toISOString().split("T")[0];
    const fileName = includeData 
      ? `banco_dados_petshop_dados_${dateStr}.txt`
      : `banco_dados_petshop_estrutura_vazia_${dateStr}.txt`;
    
    link.download = fileName;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export individual Table Schema as PDF with automated Tree Diagram
  const handleGeneratePDF = (table: TableSchema) => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      // 1. Title Header Banner
      doc.setFillColor(30, 27, 75); // Dark Indigo (indigo-950)
      doc.rect(0, 0, 210, 35, "F");

      // Header white title text
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("ESTRUTURA DE MODELO DE DADOS - PET SHOP", 5, 13);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(199, 210, 254); // Indigo-200
      doc.text("Dicionário de Banco de Dados Detalhado & Diagrama de Árvore", 15, 19);

      const dateStr = new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
      doc.setFontSize(7.5);
      doc.text(`Gerado em: ${dateStr}`, 15, 26);

      const companyName = db.infoContas?.[0]?.NomeEmpresa || "Pet Shop Premium";
      doc.text(`Estabelecimento: ${companyName}`, 145, 26);

      // 2. Table Info Card
      let y = 44;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 27, 75);
      doc.text(`TABELA SELECIONADA: ${table.tableName}`, 15, y);

      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.4);
      doc.line(15, y + 2, 195, y + 2);

      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text(`Nome Amigável: ${table.displayName}`, 15, y);
      y += 4.5;
      doc.text(`Total de Linhas / Registros Correntes: ${table.recordCount} registros salvos`, 15, y);
      y += 5.5;

      // Wrap table description
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      const descLines = doc.splitTextToSize(table.description, 175);
      doc.text(descLines, 15, y);
      y += (descLines.length * 4) + 6;

      // 3. Render Fields Columns Headers
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(15, y, 180, 6.5, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85); // slate-700
      doc.text("PROP / CAMPO", 18, y + 4.5);
      doc.text("TIPO LÓGICO", 65, y + 4.5);
      doc.text("DESCRIÇÃO ESTRUTURAL DO ATRIBUTO", 100, y + 4.5);

      y += 6.5;
      doc.setLineWidth(0.15);
      doc.setDrawColor(203, 213, 225); // slate-300

      // Render Each Field
      table.fields.forEach((field) => {
        // Page breaking support
        if (y > 270) {
          doc.addPage();
          y = 20;

          // Header line repeat on new page
          doc.setFillColor(241, 245, 249);
          doc.rect(15, y, 180, 6.5, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(51, 65, 85);
          doc.text("PROP / CAMPO", 18, y + 4.5);
          doc.text("TIPO LÓGICO", 65, y + 4.5);
          doc.text("DESCRIÇÃO ESTRUTURAL DO ATRIBUTO", 100, y + 4.5);
          y += 6.5;
        }

        doc.line(15, y, 195, y);

        // Highlight PK/FK
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42); // slate-900
        let fieldNameStr = field.name;
        if (field.category === "pk") fieldNameStr += " [PK]";
        if (field.category === "fk") fieldNameStr += " [FK]";
        doc.text(fieldNameStr, 18, y + 4);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(71, 85, 105);
        doc.text(field.type, 65, y + 4);

        const details = field.description + (field.sampleValue ? ` (Ex: "${field.sampleValue}")` : "");
        const docLines = doc.splitTextToSize(details, 92);
        doc.text(docLines, 100, y + 4);

        y += Math.max(5.5, docLines.length * 3.6) + 1.2;
      });
      doc.line(15, y, 195, y); // Draw final bottom border
      y += 8;

      // 4. Render Visual Tree Diagram
      // We force diagram on a fresh page to guarantee premium canvas visual space
      doc.addPage();
      y = 20;

      // Subtitle
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(30, 27, 75);
      doc.text("DIAGRAMA EM ÁRVORE E INTERCONEXÃO DE TABELAS (MODELO FÍSICO)", 15, y);
      y += 3.5;

      doc.setDrawColor(99, 102, 241); // Indigo border
      doc.setLineWidth(0.5);
      doc.line(15, y, 195, y);
      
      const treeStartY = y + 10;
      const numFields = table.fields.length;
      const lineHeight = 11; // Spacious row heights
      const getFieldY = (index: number) => treeStartY + (index * lineHeight);
      const firstFieldY = getFieldY(0);
      const lastFieldY = getFieldY(numFields - 1);
      const centerY = numFields > 0 ? (firstFieldY + lastFieldY) / 2 : treeStartY;

      // Draw Main Table Root Card Node (Left Centered)
      const rectX = 15;
      const rectY = centerY - 7.5;
      const rectW = 46;
      const rectH = 15;

      doc.setFillColor(79, 70, 229); // Indigo-600 Background
      doc.setDrawColor(67, 56, 202); // Indigo-700 Border
      doc.setLineWidth(0.4);
      doc.roundedRect(rectX, rectY, rectW, rectH, 2, 2, "FD");

      // Root label texts
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(table.tableName, rectX + 23, rectY + 6, { align: "center" });

      doc.setFontSize(6.5);
      doc.setTextColor(199, 210, 254); // Indigo-200
      doc.text("(Tabela Raiz)", rectX + 23, rectY + 11, { align: "center" });

      // Draw horizontal main stem branch from the Root node right margin (X=61, Y=centerY) to the spine at X=72
      doc.setDrawColor(99, 102, 241);
      doc.setLineWidth(0.45);
      doc.line(61, centerY, 72, centerY);

      // Draw Vertical spinal line at X=72 running from first field Y to last field Y
      doc.line(72, firstFieldY + 4, 72, lastFieldY + 4);

      // Connect each field as a branch to the right
      table.fields.forEach((field, idx) => {
        const currentFieldY = getFieldY(idx) + 4;

        // Draw individual horizontal branch from spine (X=72) to the tree node point at X=77
        doc.setDrawColor(99, 102, 241);
        doc.setLineWidth(0.35);
        doc.line(72, currentFieldY, 77, currentFieldY);

        // Draw small structural circle node at X=77
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(99, 102, 241);
        doc.circle(77, currentFieldY, 0.8, "FD");

        // Write Field attributes text at X=80
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42); // slate-900

        let attributeLabel = field.name;
        if (field.category === "pk") attributeLabel += " [PK]";
        if (field.category === "fk") attributeLabel += " [FK]";
        doc.text(attributeLabel, 80, currentFieldY + 1.2);

        // If it's FK, connect with custom line to target table box on the right
        if (field.category === "fk" && table.relations) {
          const relation = table.relations.find(r => r.fromField === field.name);
          if (relation) {
            // Arrow Line starting from X=118 up to X=142
            doc.setDrawColor(14, 165, 233); // sky-500
            doc.setLineWidth(0.3);
            doc.line(120, currentFieldY, 140, currentFieldY);

            // Print subtle elegant arrow head
            doc.line(138, currentFieldY - 0.7, 140, currentFieldY);
            doc.line(138, currentFieldY + 0.7, 140, currentFieldY);

            // Referenced Table Node Box
            const boxW = 42;
            const boxH = 6.5;
            doc.setFillColor(240, 249, 255); // sky-50 background
            doc.setDrawColor(56, 189, 248); // sky-400 border
            doc.roundedRect(142, currentFieldY - 3.2, boxW, boxH, 1, 1, "FD");

            // Text inside referenced box
            doc.setFont("helvetica", "bold");
            doc.setFontSize(6.5);
            doc.setTextColor(3, 105, 161); // sky-700
            doc.text(`Ref: ${relation.toTable}`, 142 + (boxW / 2), currentFieldY + 1.1, { align: "center" });
          }
        } else {
          // Normal field: draw simple type visual label to keep visual balance
          doc.setFont("helvetica", "normal");
          doc.setFontSize(6.5);
          doc.setTextColor(100, 116, 139); // slate-500
          doc.text(`(${field.type})`, 120, currentFieldY + 1);
        }
      });

      // 5. Draw Legend under the Tree Diagram representation
      const legendY = lastFieldY + 18;
      // Draw a clean box for the legend
      doc.setFillColor(248, 250, 252); // slate-50 background
      doc.setDrawColor(226, 232, 240); // slate-200 border
      doc.setLineWidth(0.2);
      doc.roundedRect(15, legendY - 4, 180, 15, 1.5, 1.5, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("Legenda Logística:", 18, legendY + 1.5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.8);
      doc.setTextColor(71, 85, 105);
      doc.text("[PK] Chave Primária Geral do registro", 18, legendY + 6.5);
      doc.text("[FK] Chave Estrangeira ligada à tabela apontada", 80, legendY + 6.5);
      doc.text("Ref: [Tabela_Alvo] Vínculo externo físico correlacionado", 145, legendY + 6.5);

      // Save PDF
      doc.save(`estrutura_tabela_${table.tableName.toLowerCase()}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Desculpe, ocorreu um erro ao inicializar e gerar o arquivo PDF. Tente novamente.");
    }
  };

  const handleGenerateAISchemaFile = async () => {
    // 1. Assim que for clicado, mude o estado dele para desativado (disabled = true) imediatamente.
    setIsProcessingForAI(true);

    try {
      // 2. Feedback visual de carregamento "Processando..." simulado representando o processamento/resposta
      // dos dados estruturais pelo compilador/conversor inteligente Gemini
      await new Promise((resolve) => setTimeout(resolve, 1800));

      let txt = "========================================================================\n";
      txt += "   ESTRUTURA DO BANCO DE DADOS - PET SHOP BANHO & TOSA (CARRERA & CIA)   \n";
      txt += "   Mapeamento de Tabelas, Campos e Relacionamentos para Assistência de IA \n";
      txt += "========================================================================\n\n";
      txt += `Gerado em: ${new Date().toLocaleString("pt-BR")}\n`;
      txt += `Total de Coleções Mapeadas: ${schemas.length}\n\n`;

      txt += "------------------------------------------------------------------------\n";
      txt += "1. RESUMO DAS TABELAS REGISTRADAS NO SISTEMA\n";
      txt += "------------------------------------------------------------------------\n";
      schemas.forEach((s) => {
        txt += `- [Tabela: ${s.tableName}] - ${s.displayName}\n`;
        txt += `  Registros salvos em sessão: ${s.recordCount}\n`;
        txt += `  Descrição: ${s.description}\n\n`;
      });

      txt += "\n------------------------------------------------------------------------\n";
      txt += "2. DICIONÁRIO DE DADOS E ESPECIFICAÇÃO DE PROPRIEDADES DOS CAMPOS\n";
      txt += "------------------------------------------------------------------------\n\n";

      schemas.forEach((s) => {
        txt += `=== TABELA: ${s.tableName} (${s.displayName}) ===\n`;
        txt += `Descrição de arquitetura: ${s.description}\n`;
        txt += "Campos mapeados:\n";
        
        s.fields.forEach((f) => {
          let pkFk = "";
          if (f.category === "pk") pkFk = " (Chave Primária)";
          if (f.category === "fk") pkFk = " (Chave Estrangeira/FK)";
          txt += `  * Campo: ${f.name}${pkFk}\n`;
          txt += `    - Tipo de Dado Lógico: ${f.type}\n`;
          txt += `    - Descrição: ${f.description}\n`;
          if (f.sampleValue) {
            txt += `    - Exemplo formatado: "${f.sampleValue}"\n`;
          }
          txt += "\n";
        });

        if (s.relations && s.relations.length > 0) {
          txt += "Relacionamentos / Ligações externas:\n";
          s.relations.forEach((rel) => {
            txt += `  - O campo [${rel.fromField}] aponta diretamente para [${rel.toTable}] campo [${rel.toField}]\n`;
          });
        }
        txt += "------------------------------------------------------------------------\n\n";
      });

      txt += "========================================================================\n";
      txt += "FIM DO ARQUIVO DE ESPECIFICAÇÃO E ESTRUTURA DO BANCO DE DADOS.\n";
      txt += "Envie este documento para sua IA/Gemini para que ela guie suas novas funções.\n";
      txt += "========================================================================\n";

      // Download txt file wrapper
      const element = document.createElement("a");
      const file = new Blob([txt], { type: "text/plain;charset=utf-8" });
      element.href = URL.createObjectURL(file);
      element.download = "estrutura_banco_dados.txt";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

    } catch (error) {
      console.error("Erro ao compilar informações para IA:", error);
      alert("Erro ao extrair dados de esquema.");
    } finally {
      // 3. Só reative o botão (disabled = false) após a resposta da API ser totalmente concluída ou em caso de erro.
      setIsProcessingForAI(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in scroll-smooth">
      {/* Title Header with info context */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-xs">
              <Database className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 font-sans tracking-tight">
              Dicionário do Banco de Dados
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium font-sans">
            Mapeamento lógico das tabelas locais persistidas, chaves primárias, estrangeiras e tipos de campos disponíveis.
          </p>
        </div>

        {/* Action button panel for Google Sheets Export & count metadata */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Export Blank Structure button */}
          <button
            type="button"
            onClick={() => handleExportGoogleSheets(false)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium border border-slate-200 rounded-xl text-xs shadow-2xs transition active:scale-95 cursor-pointer"
            title="Exportar apenas colunas e formato de cabeçalho para criar abas no Google Sheets"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-slate-500" />
            <span>Exportar Formato Vazio (Google Sheets)</span>
          </button>

          {/* Export with all database records button */}
          <button
            type="button"
            onClick={() => handleExportGoogleSheets(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs shadow-xs transition active:scale-95 cursor-pointer border-b-2 border-emerald-800"
            title="Exportar cabeçalhos juntamente com todos os registros cadastrados em formato CSV"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-100" />
            <span>Exportar com Dados Salvos</span>
          </button>

          {/* New AI / Gemini DB Structure generator button with throttle/blindagem */}
          <button
            type="button"
            id="btn-gerar-estrutura-ia"
            disabled={isProcessingForAI}
            onClick={handleGenerateAISchemaFile}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-xs shadow-xs transition active:scale-95 cursor-pointer border-b-2 border-violet-800"
            title="Copiar/Gerar arquivo contendo a estrutura atual do banco de dados para auxiliar programações com IA"
          >
            <Sparkles className={`h-3.5 w-3.5 text-violet-100 ${isProcessingForAI ? "animate-spin" : ""}`} />
            <span>{isProcessingForAI ? "Processando..." : "Gerar Estrutura para IA"}</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-150 rounded-xl border border-slate-200 shadow-3xs shrink-0 select-none">
            <TableProperties className="h-4 w-4 text-slate-500" />
            <span className="text-[11px] font-bold text-slate-700 font-mono">
              {schemas.length} Coleções Mapeadas
            </span>
          </div>
        </div>
      </div>

      {/* Database Relationships Quick Map Alert */}
      <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex flex-col md:flex-row md:items-center gap-4">
        <div className="p-2 bg-white rounded-lg border border-indigo-100 shadow-3xs shrink-0 self-start md:self-center">
          <Link2 className="h-4.5 w-4.5 text-indigo-600" />
        </div>
        <div className="space-y-1">
          <h4 className="text-[12px] font-bold text-indigo-950 uppercase tracking-wider font-mono">
            Arquitetura de Relacionamentos Relacionalmente Simulada
          </h4>
          <p className="text-xs text-indigo-900 leading-relaxed max-w-4xl">
            Tabelas como <strong className="font-semibold text-indigo-950">CadPets</strong> vinculam proprietários via <code className="bg-white px-1 py-0.2 rounded text-[10px] border font-mono">IdCliente</code>. 
            Do mesmo modo, os atendimentos de <strong className="font-semibold text-indigo-950">CadDetMovDiario</strong> apontam ao cabeçalho <strong className="font-semibold text-indigo-950">CadMovDiario</strong>, 
            preservando referências estruturadas de banco de dados no módulo offline/sincronizado do Firebase.
          </p>
        </div>
      </div>

      {/* Filter and Table Select Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* Left Side: Filter search and list table buttons */}
        <div className="md:col-span-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar tabela ou campo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/15 focus:border-indigo-600 shadow-3xs font-medium"
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-2.5 shadow-2xs space-y-1">
            <p className="text-[9px] font-bold text-slate-400 px-3 py-1 bg-slate-50 uppercase tracking-widest rounded-lg mb-2 font-mono">
              Selecione uma Tabela
            </p>
            <button
              onClick={() => setSelectedTable(null)}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                selectedTable === null
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span>Ver Todas</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${selectedTable === null ? "bg-slate-800" : "bg-slate-100"}`}>
                {filteredSchemas.length}
              </span>
            </button>
            {filteredSchemas.map((s) => {
              const Icon = s.icon;
              const isSelected = selectedTable === s.tableName;
              return (
                <button
                  key={s.tableName}
                  onClick={() => setSelectedTable(s.tableName)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-3xs"
                      : "text-slate-650 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-white" : "text-slate-400"}`} />
                  <span className="truncate flex-1">{s.tableName}</span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full ${isSelected ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-600"}`}>
                    {s.recordCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Render tables schemas */}
        <div className="md:col-span-3 space-y-6">
          {filteredSchemas
            .filter((s) => selectedTable === null || s.tableName === selectedTable)
            .map((table) => {
              const TableIcon = table.icon;
              return (
                <div key={table.tableName} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xs">
                  {/* Table Title and Metadata Header */}
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <TableIcon className="h-4.5 w-4.5 text-slate-500 shrink-0" />
                        <h2 className="text-sm font-bold text-slate-800 font-mono tracking-tight">
                          {table.tableName}
                        </h2>
                        <span className="text-[10px] font-semibold text-slate-400 font-sans">
                          ({table.displayName})
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {table.description}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-right shrink-0">
                      <button
                        type="button"
                        onClick={() => handleGeneratePDF(table)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-3xs transition active:scale-95 cursor-pointer border-b-2 border-indigo-800"
                        title="Gerar e baixar PDF com estrutura e diagrama em árvore desta tabela"
                      >
                        <FileText className="h-3.5 w-3.5 text-indigo-100" />
                        <span>Gerar Estrutura PDF</span>
                      </button>

                      <span className="text-[10px] font-bold text-slate-500 font-mono border border-slate-200 bg-white px-2.5 py-1 rounded-xl shadow-3xs inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                        {table.recordCount} registros salvos
                      </span>
                    </div>
                  </div>

                  {/* Schema fields table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse table-fixed min-w-[650px]">
                      <thead>
                        <tr className="bg-slate-100/60 border-b border-slate-200 text-slate-500 font-mono text-[9px] uppercase tracking-wider font-semibold">
                          <th className="w-20 p-3 pl-5">Ícone</th>
                          <th className="w-40 p-3">Campo / Propriedade</th>
                          <th className="w-48 p-3">Tipo Lógico</th>
                          <th className="p-3">Descrição Estrutural</th>
                          <th className="w-40 p-3 pr-5">Exemplo Real</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px] text-slate-700 font-sans bg-white">
                        {table.fields.map((field) => (
                          <tr key={field.name} className="hover:bg-slate-50/50 transition">
                            {/* Icon metadata category */}
                            <td className="p-3 pl-5 text-center">
                              <span className="inline-flex items-center justify-center p-1.5 bg-slate-50 rounded-lg border border-slate-100 max-w-[28px]">
                                {getFieldIcon(field.category)}
                              </span>
                            </td>

                            {/* Name formatted mono */}
                            <td className="p-3 font-mono text-[11.5px] font-bold text-slate-800">
                              {field.name}
                              {field.category === "pk" && (
                                <span className="ml-1 text-[8px] bg-amber-50 text-amber-600 font-bold px-1.5 py-0.5 rounded border border-amber-200 font-sans uppercase">
                                  PK
                                </span>
                              )}
                              {field.category === "fk" && (
                                <span className="ml-1 text-[8px] bg-sky-50 text-sky-700 font-bold px-1.5 py-0.5 rounded border border-sky-200 font-sans uppercase">
                                  FK
                                </span>
                              )}
                            </td>

                            {/* Logical data Type */}
                            <td className="p-3 font-mono text-[10px] font-semibold text-slate-500">
                              <span className="bg-slate-100 rounded-md px-1.5 py-0.8 border border-slate-200 text-slate-650">
                                {field.type}
                              </span>
                            </td>

                            {/* Description textual */}
                            <td className="p-3 text-slate-550 pr-4 leading-medium text-[11px] font-medium">
                              {field.description}
                            </td>

                            {/* Simulated or dynamic data preview */}
                            <td className="p-3 pr-5 text-slate-600 font-mono text-[10px] break-all truncate max-w-[150px]" title={field.sampleValue}>
                              {field.sampleValue ? (
                                <span className="bg-slate-50/80 px-1 py-0.5 rounded italic text-slate-500 border border-slate-150">
                                  "{field.sampleValue}"
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Schema Relationships Footer details block */}
                  {table.relations && table.relations.length > 0 && (
                    <div className="p-3 pr-5 pl-5 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-[10px] text-slate-500 font-mono font-medium">
                      <span className="font-sans font-bold text-slate-400 uppercase tracking-widest text-[8px]">
                        LIGAÇÕES (FK):
                      </span>
                      {table.relations.map((rel, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <Link2 className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                          <span className="font-bold text-slate-700">{rel.fromField}</span>
                          <span className="text-slate-400">&rarr;</span>
                          <span className="text-indigo-600 font-bold">{rel.toTable}</span>
                          <span className="text-slate-400 font-normal">({rel.toField})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

          {filteredSchemas.length === 0 && (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl space-y-3">
              <Database className="h-10 w-10 text-slate-350 mx-auto animate-pulse" />
              <p className="text-sm font-semibold text-slate-700">
                Nenhuma tabela ou campo correspondente foi encontrado
              </p>
              <p className="text-xs text-slate-450 max-w-sm mx-auto">
                Tente buscar com termos diferentes como "Ativo", "Id" ou selecione uma tabela específica no menu lateral.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
