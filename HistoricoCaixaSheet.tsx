import React, { useState, useMemo, useRef } from "react";
import { 
  Calendar, 
  Search, 
  Trash2, 
  CornerUpLeft, 
  Info, 
  Eye, 
  X, 
  Check, 
  DollarSign, 
  Users, 
  CreditCard, 
  Coins, 
  Activity,
  ChevronDown,
  ChevronUp,
  ChevronsUp,
  ChevronsDown,
  AlertCircle
} from "lucide-react";
import { 
  ThemeColor, 
  CadCliente, 
  CadProdutos, 
  CaixaDiario, 
  CaixaMovimentacao, 
  CaixaSaldosForma, 
  LotesProdutos,
  CadDetMovDiario,
  CadMovDiario,
  PrePedido
} from "../types";

export interface HistoricoCaixaSheetProps {
  clientes: CadCliente[];
  produtos: CadProdutos[];
  lotesProdutos: LotesProdutos[];
  caixaDiario: CaixaDiario[];
  caixaMovimentacao: CaixaMovimentacao[];
  caixaSaldosForma: CaixaSaldosForma[];
  movimentos: CadMovDiario[];
  detalhesMov?: CadDetMovDiario[];
  onUpdateDetalhesMov?: (updatedDetMov: CadDetMovDiario[]) => void;
  prePedidos?: PrePedido[];
  onUpdatePrePedidos?: (updatedPrePedidos: PrePedido[]) => void;
  activeTheme: ThemeColor;
  currentUser: any;
  currentUserOwnerId: string;
  isAdminViewAll?: boolean;
  onUpdateCaixa: (
    newCaixa: CaixaDiario[], 
    newMov: CaixaMovimentacao[], 
    newSaldos: CaixaSaldosForma[]
  ) => void;
  onUpdateLotes?: (newLotes: LotesProdutos[]) => void;
  onUpdateClientes?: (newClients: CadCliente[]) => void;
  showConfirm: (title: string, msg: string, onConfirm: () => void) => void;
  showAlert: (title: string, msg: string) => void;
  onBackToCaixa?: () => void;
}

export default function HistoricoCaixaSheet({
  clientes,
  produtos,
  lotesProdutos = [],
  caixaDiario,
  caixaMovimentacao,
  caixaSaldosForma,
  movimentos = [],
  detalhesMov = [],
  onUpdateDetalhesMov,
  prePedidos = [],
  onUpdatePrePedidos,
  activeTheme,
  currentUser,
  currentUserOwnerId,
  isAdminViewAll = false,
  onUpdateCaixa,
  onUpdateLotes,
  onUpdateClientes,
  showConfirm,
  showAlert,
  onBackToCaixa,
}: HistoricoCaixaSheetProps) {
  // Check if current user is administrative (Role Gold or Master)
  const isGoldOrMaster = currentUser && (
    currentUser.NivelAcesso === "Gold" || 
    currentUser.NivelAcesso === "Master" || 
    currentUser.Permissoes === "Administrador" || 
    !currentUser.IdUsuarioMaster
  );

  // Filtro de isolamento de dados:
  // Administrador Geral (isAdminViewAll) ignora o filtro e traz todos os registros
  // Usuário comum visualiza apenas seus próprios dados
  const scopedCaixaMovimentacao = useMemo(() => {
    if (isAdminViewAll) return caixaMovimentacao;
    return caixaMovimentacao.filter((mov) => {
      if (mov.IdUsuarioDono) {
        return mov.IdUsuarioDono === currentUserOwnerId;
      }
      const client = clientes.find((c) => c.Id === mov.ClienteId || (mov.NomeCliente && c.Nome === mov.NomeCliente));
      if (client && client.IdUsuarioDono) {
        return client.IdUsuarioDono === currentUserOwnerId;
      }
      return true;
    });
  }, [caixaMovimentacao, clientes, currentUserOwnerId, isAdminViewAll]);

  // Filters
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [periodo, setPeriodo] = useState<"hoje" | "ontem" | "7dias" | "personalizado">("7dias");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(todayStr);
  const [selectedClienteId, setSelectedClienteId] = useState<string>("");
  const [formaPagamentoFilter, setFormaPagamentoFilter] = useState<string>("");

  // UI state
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [detailedSale, setDetailedSale] = useState<any | null>(null);
  const [selectedSales, setSelectedSales] = useState<string[]>([]);

  // Floating quick navigation ref and functions
  const salesTableCardRef = useRef<HTMLDivElement>(null);

  const scrollToTopSales = () => {
    salesTableCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollPageUpSales = () => {
    const container = salesTableCardRef.current;
    if (container) {
      const scrollAmount = Math.min(window.innerHeight, container.clientHeight) - 80;
      window.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
    } else {
      window.scrollBy({ top: -(window.innerHeight - 80), behavior: 'smooth' });
    }
  };

  const scrollPageDownSales = () => {
    const container = salesTableCardRef.current;
    if (container) {
      const scrollAmount = Math.min(window.innerHeight, container.clientHeight) - 80;
      window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
    } else {
      window.scrollBy({ top: window.innerHeight - 80, behavior: 'smooth' });
    }
  };

  const scrollToBottomSales = () => {
    salesTableCardRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  // Group and list sales from caixaMovimentacao where Origem === "Venda"
  const salesGrouped = useMemo(() => {
    const list: any[] = [];
    const salesMap = new Map<string, CaixaMovimentacao[]>();

    scopedCaixaMovimentacao.forEach((mov) => {
      if (mov.Origem !== "Venda") return;
      const saleId = mov.IdVenda || mov.Id;
      if (!salesMap.has(saleId)) {
        salesMap.set(saleId, []);
      }
      salesMap.get(saleId)!.push(mov);
    });

    const clientsMap = new Map<string, any>();
    clientes.forEach((c) => {
      clientsMap.set(c.Id, c);
    });

    salesMap.forEach((movs, saleId) => {
      const firstMov = movs[0];
      const pagoEm = firstMov.DataHora || new Date().toISOString();
      const dataAgendamento = firstMov.DataAgendamento || pagoEm;
      const statusVenda = firstMov.StatusVenda || "Ativo";
      const movTipo = firstMov.Tipo || "Entrada";

      const totalPaymentsSum = movs.reduce((sum, m) => sum + m.Valor, 0);
      const valorTotal = firstMov.ValorTotalVenda !== undefined ? firstMov.ValorTotalVenda : totalPaymentsSum;
      const valorOriginal = firstMov.ValorOriginal !== undefined ? firstMov.ValorOriginal : valorTotal;
      const valorCobrado = firstMov.ValorCobrado !== undefined ? firstMov.ValorCobrado : valorTotal;

      let parsedItems: any[] = [];
      if (firstMov.Itens) {
        try {
          parsedItems = JSON.parse(firstMov.Itens);
        } catch (e) {
          console.error("Error parsing items JSON:", e);
        }
      }

      if (parsedItems.length === 0) {
        parsedItems = [
          {
            id: `item-fallback-${saleId}`,
            originalId: saleId,
            name: "Venda no PDV",
            price: valorTotal,
            quantity: 1,
            type: "product",
          }
        ];
      }

      const payments = movs.map((m) => ({
        Id: m.Id,
        FormaPagamento: m.FormaPagamento,
        Valor: m.Valor,
      }));

      let resolvedClientName = firstMov.NomeCliente || "Cliente Geral";
      let resolvedClientId = firstMov.ClienteId || "";
      let resolvedClientDoc = firstMov.DocumentoCliente || "";

      if (resolvedClientId) {
        const clientObj = clientsMap.get(resolvedClientId);
        if (clientObj) {
          resolvedClientName = clientObj.Nome;
          resolvedClientDoc = clientObj.CpfCnpj || "";
        }
      }

      list.push({
        IdVenda: saleId,
        DataHora: dataAgendamento,
        PagoEm: pagoEm,
        NomeCliente: resolvedClientName,
        ClienteId: resolvedClientId,
        DocumentoCliente: resolvedClientDoc,
        ValorTotal: valorTotal,
        ValorOriginal: valorOriginal,
        ValorCobrado: valorCobrado,
        StatusVenda: statusVenda,
        Tipo: movTipo,
        Itens: parsedItems,
        Payments: payments,
        Observacao: firstMov.Observacao || "",
      });
    });

    return list.sort((a, b) => b.PagoEm.localeCompare(a.PagoEm));
  }, [caixaMovimentacao, clientes, produtos]);

  // Apply filters to sales grouped list
  const filteredSales = useMemo(() => {
    return salesGrouped.filter((sale) => {
      // 1. Date Filter based on PagoEm (and no longer the original schedule date)
      const saleDate = sale.PagoEm.split("T")[0];
      if (periodo === "hoje") {
        if (saleDate !== todayStr) return false;
      } else if (periodo === "ontem") {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];
        if (saleDate !== yesterdayStr) return false;
      } else if (periodo === "7dias") {
        const past7 = new Date();
        past7.setDate(past7.getDate() - 7);
        const past7Str = past7.toISOString().split("T")[0];
        if (saleDate < past7Str || saleDate > todayStr) return false;
      } else if (periodo === "personalizado") {
        if (startDate && saleDate < startDate) return false;
        if (endDate && saleDate > endDate) return false;
      }

      // 2. Client Filter
      if (selectedClienteId) {
        if (sale.ClienteId !== selectedClienteId && sale.NomeCliente?.toLowerCase() !== clientes.find(c => c.Id === selectedClienteId)?.Nome.toLowerCase()) {
          return false;
        }
      }

      // 3. Payment Filter
      if (formaPagamentoFilter) {
        const hasPayment = sale.Payments.some(
          (p: any) => p.FormaPagamento.toLowerCase() === formaPagamentoFilter.toLowerCase()
        );
        if (!hasPayment) return false;
      }

      return true;
    });
  }, [salesGrouped, periodo, startDate, endDate, todayStr, selectedClienteId, formaPagamentoFilter, clientes]);

  // Calculate KPIs (only consider ATIVO sales)
  const kpis = useMemo(() => {
    let faturamentoTotal = 0;
    let totalPix = 0;
    let totalDebito = 0;
    let totalCredito = 0;
    let totalDinheiro = 0;
    let totalFiado = 0;

    filteredSales.forEach((sale) => {
      if (sale.StatusVenda !== "Ativo") return;

      const isDespesa = sale.Tipo === "Saída" || sale.NomeCliente?.toUpperCase() === "MINHAS DESPESAS" || (sale.Itens && sale.Itens.some((it: any) => it.tipo === "Saída" || it.tipo === "Saida"));

      // Add payments
      sale.Payments.forEach((p: any) => {
        const key = p.FormaPagamento.toLowerCase();
        if (key.includes("pix")) {
          totalPix += isDespesa ? -p.Valor : p.Valor;
        } else if (key.includes("débito") || key.includes("debito")) {
          totalDebito += isDespesa ? -p.Valor : p.Valor;
        } else if (key.includes("crédito") || key.includes("credito")) {
          totalCredito += isDespesa ? -p.Valor : p.Valor;
        } else if (key.includes("dinheiro")) {
          totalDinheiro += isDespesa ? -p.Valor : p.Valor;
        } else if (key.includes("fiado") || key.includes("limite")) {
          totalFiado += isDespesa ? -p.Valor : p.Valor;
        }
      });

      if (!isDespesa) {
        faturamentoTotal += sale.ValorTotal;
      }
    });

    return {
      faturamentoTotal,
      totalPix,
      totalDebito,
      totalCredito,
      totalDinheiro,
      totalFiado,
    };
  }, [filteredSales]);

  // Handle Cancellation / Refund (Estorno)
  const handleCancelSale = (sale: any) => {
    showConfirm(
      "Confirmar Estorno / Cancelamento? 🔄",
      `Tem certeza que deseja cancelar esta venda realizada para ${sale.NomeCliente} no valor de R$ ${sale.ValorTotal.toFixed(2)}?\n\nOs pagamentos e faturamentos correspondentes sairão do caixa e os respectivos produtos físicos retornarão ao estoque!`,
      () => {
        try {
          const userMasterId = currentUser?.IdUsuarioMaster || currentUser?.Id || currentUserOwnerId;

          const matchingMovIds = sale.Payments.map((p: any) => p.Id);

          // 1. Mark matching CaixaMovimentacao entries as Cancelado
          const nextMovimentacao = caixaMovimentacao.map((mov) => {
            const matchesMovId = matchingMovIds.includes(mov.Id);
            let matchesByItem = false;
            if (mov.Itens) {
              try {
                const items = JSON.parse(mov.Itens);
                matchesByItem = items.some((it: any) => it.originalId === sale.IdVenda);
              } catch (e) {}
            }

            if (matchesMovId || matchesByItem) {
              return { ...mov, StatusVenda: "Cancelado" as const };
            }
            return mov;
          });

          // 2. Reduce the accumulators in CaixaSaldosForma correspondently
          let nextSaldos = [...caixaSaldosForma];
          sale.Payments.forEach((p: any) => {
            nextSaldos = nextSaldos.map((sf) => {
              if (
                sf.IdUsuarioMaster === userMasterId &&
                sf.FormaPagamento.toLowerCase() === p.FormaPagamento.toLowerCase()
              ) {
                return { ...sf, SaldoAcumulado: Math.max(0, Number(sf.SaldoAcumulado) - p.Valor) };
              }
              return sf;
            });
          });

          // 3. Return products to stock (lotesProdutos)
          let nextLotes = lotesProdutos.map((lot) => ({ ...lot }));
          let returnedCount = 0;
          sale.Itens.forEach((item: any) => {
            let productId = item.productId || item.originalId;

            if (item.type === "service") {
              // Find the CadDetMovDiario record to get the Servico (productId)
              const detRecord = detalhesMov.find((d) => d.Id === item.originalId);
              if (detRecord) {
                productId = detRecord.Servico;
              }
            }

            // Extremely robust fallback: check if productId is actually in the products catalog,
            // otherwise try to find it by name or barcode
            let assocProduct = produtos.find((p) => p.Id === productId);
            if (!assocProduct) {
              assocProduct = produtos.find(
                (p) => p.Nome === item.name || (item.barcode && p.CodigoDeBarras === item.barcode)
              );
              if (assocProduct) {
                productId = assocProduct.Id;
              }
            }

            // Find the lot of this product
            const productLots = nextLotes.filter((lot) => lot.IdProduto === productId);
            if (productLots.length > 0) {
              // Return to the first available lot
              productLots[0].QuantidadeLote += item.quantity;
              returnedCount += item.quantity;
            } else {
              // Check if it's a physical product in catalog
              const associatedProd = produtos.find((p) => p.Id === productId);
              if (associatedProd?.Tipo === "Produto") {
                // If no lot exists, we create a new entry for this product as back-in-stock
                const newLotId = `lot-estorno-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
                nextLotes.push({
                  IdLote: newLotId,
                  IdProduto: productId,
                  NumeroLote: "ESTORNO",
                  QuantidadeLote: item.quantity,
                  ValidadeLote: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                  DataEntrada: new Date().toISOString().split("T")[0],
                });
                returnedCount += item.quantity;
              }
            }
          });

          // 4. Set matching scheduler appointments (CadDetMovDiario) Pago to false to liberate them immediately for PDV refaturamento
          if (onUpdateDetalhesMov) {
            const serviceItemIds = (sale.Itens || [])
              .filter((it: any) => it.type === "service" || it.id?.startsWith("service-"))
              .map((it: any) => it.originalId);

            const nextAppointmentsDetailsList = detalhesMov.map((det) => {
              if (serviceItemIds.includes(det.Id) || det.Id === sale.IdVenda) {
                return { ...det, Pago: false, PagoEm: undefined };
              }
              return det;
            });
            onUpdateDetalhesMov(nextAppointmentsDetailsList);
          }

          // Also set pre-sales (pre-pedidos / pré-vendas) back to Pendente
          if (onUpdatePrePedidos && prePedidos.length > 0) {
            const prePedidoIdsToCancel: string[] = [];
            (sale.Itens || []).forEach((it: any) => {
              if (it.type === "pre-pedido" || it.id?.startsWith("pre-")) {
                prePedidoIdsToCancel.push(it.originalId);
              }
            });
            if (prePedidoIdsToCancel.length > 0) {
              const nextPrePedidos = prePedidos.map((pre) => {
                if (prePedidoIdsToCancel.includes(pre.Id)) {
                  return { ...pre, Status: "Pendente" as const };
                }
                return pre;
              });
              onUpdatePrePedidos(nextPrePedidos);
            }
          }

          // 5. If the sale was launched to credit (Fiado), subtract from the client devedor balance
          let nextClientes = [...clientes];
          const fiadoPayment = sale.Payments.find((p: any) => p.FormaPagamento.toLowerCase() === "fiado");
          if (fiadoPayment && sale.ClienteId) {
            nextClientes = clientes.map((c) => {
              if (c.Id === sale.ClienteId) {
                return { ...c, SaldoDevedor: Math.max(0, (c.SaldoDevedor || 0) - fiadoPayment.Valor) };
              }
              return c;
            });
            onUpdateClientes?.(nextClientes);
          }

          // Trigger state propagates
          onUpdateCaixa(caixaDiario, nextMovimentacao, nextSaldos);
          onUpdateLotes?.(nextLotes);

          showAlert(
            "Estorno Processado! 🔄",
            `A venda foi cancelada com sucesso! ${returnedCount > 0 ? `${returnedCount} itens de produto retornaram ao estoque.` : ""} Os faturamentos do Caixa foram ajustados.`
          );
        } catch (e: any) {
          showAlert("Erro no estorno", e?.message || "Não foi possível estornar a venda.");
        }
      }
    );
  };

  // Handle Permanent Delete of Sale Record (for Gold/Master users)
  const handleDeleteSale = (sale: any) => {
    showConfirm(
      "Confirmar Exclusão Definitiva? 🗑️",
      `Tem certeza que deseja EXCLUIR permanentemente os registros desta venda para ${sale.NomeCliente} no valor de R$ ${sale.ValorTotal.toFixed(2)}?\n\nEsta ação removerá permanentemente os registros de movimentação de caixa correspondentes. Esta ação é irreversível!`,
      () => {
        try {
          const userMasterId = currentUser?.IdUsuarioMaster || currentUser?.Id || currentUserOwnerId;
          const matchingMovIds = sale.Payments.map((p: any) => p.Id);

          // 1. Remove the matching CaixaMovimentacao entries completely
          const nextMovimentacao = caixaMovimentacao.filter((mov) => {
            const matchesMovId = matchingMovIds.includes(mov.Id);
            let matchesByItem = false;
            if (mov.Itens) {
              try {
                const items = JSON.parse(mov.Itens);
                matchesByItem = items.some((it: any) => it.originalId === sale.IdVenda);
              } catch (e) {}
            }
            return !matchesMovId && !matchesByItem;
          });

          // 2. Adjust the accumulators in CaixaSaldosForma
          let nextSaldos = [...caixaSaldosForma];
          sale.Payments.forEach((p: any) => {
            nextSaldos = nextSaldos.map((sf) => {
              if (
                sf.IdUsuarioMaster === userMasterId &&
                sf.FormaPagamento.toLowerCase() === p.FormaPagamento.toLowerCase()
              ) {
                return { ...sf, SaldoAcumulado: Math.max(0, Number(sf.SaldoAcumulado) - p.Valor) };
              }
              return sf;
            });
          });

          // 3. Optional: Restore products back to stock
          let nextLotes = [...lotesProdutos];
          let returnedCount = 0;
          if (lotesProdutos.length > 0) {
            sale.Payments.forEach((mov: any) => {
              const fullMov = caixaMovimentacao.find(m => m.Id === mov.Id);
              if (fullMov && fullMov.Itens) {
                try {
                  const items = JSON.parse(fullMov.Itens);
                  items.forEach((it: any) => {
                    if (it.type === "product" || it.id?.startsWith("prod-")) {
                      const lotId = it.selectedLoteId;
                      if (lotId) {
                        nextLotes = nextLotes.map((lot) => {
                          if (lot.IdLote === lotId) {
                            returnedCount += it.quantity;
                            return { ...lot, QuantidadeLote: Number(lot.QuantidadeLote) + Number(it.quantity) };
                          }
                          return lot;
                        });
                      }
                    }
                  });
                } catch (e) {}
              }
            });
          }

          // 4. If the sale had a Fiado payment, subtract from client's devedor balance
          let nextClientes = [...clientes];
          const fiadoPayment = sale.Payments.find((p: any) => p.FormaPagamento.toLowerCase() === "fiado");
          if (fiadoPayment && sale.ClienteId) {
            nextClientes = clientes.map((c) => {
              if (c.Id === sale.ClienteId) {
                return { ...c, SaldoDevedor: Math.max(0, (c.SaldoDevedor || 0) - fiadoPayment.Valor) };
              }
              return c;
            });
            onUpdateClientes?.(nextClientes);
          }

          // Trigger state propagates
          onUpdateCaixa(caixaDiario, nextMovimentacao, nextSaldos);
          if (returnedCount > 0) {
            onUpdateLotes?.(nextLotes);
          }

          // Clean up selected sales state
          setSelectedSales((prev) => prev.filter((id) => id !== sale.IdVenda));

          showAlert(
            "Registro Excluído! 🗑️",
            `A venda foi excluída permanentemente! ${returnedCount > 0 ? `${returnedCount} itens de produto retornaram ao estoque.` : ""} Os registros do Caixa foram removidos.`
          );
        } catch (e: any) {
          showAlert("Erro na exclusão", e?.message || "Não foi possível excluir o registro.");
        }
      }
    );
  };

  // Bulk Cancel selected sales
  const handleCancelSelectedSales = () => {
    const salesToCancel = filteredSales.filter(
      (s) => selectedSales.includes(s.IdVenda) && s.StatusVenda !== "Cancelado"
    );

    if (salesToCancel.length === 0) {
      showAlert("Nenhuma venda elegível ⚠️", "Nenhuma das vendas selecionadas pode ser estornada (talvez já estejam canceladas).");
      return;
    }

    const totalCanceledValue = salesToCancel.reduce((sum, s) => sum + s.ValorTotal, 0);

    showConfirm(
      "Confirmar Estorno em Lote? 🔄",
      `Tem certeza que deseja estornar as ${salesToCancel.length} vendas selecionadas, totalizando R$ ${totalCanceledValue.toFixed(2)}?\n\nTodos os pagamentos correspondentes sairão do caixa, os respectivos produtos retornarão ao estoque e os agendamentos serão liberados!`,
      () => {
        try {
          const userMasterId = currentUser?.IdUsuarioMaster || currentUser?.Id || currentUserOwnerId;

          // Collect all payment IDs to match
          const allMatchingMovIds: string[] = [];
          salesToCancel.forEach((sale) => {
            sale.Payments.forEach((p: any) => {
              if (p.Id) allMatchingMovIds.push(p.Id);
            });
          });

          // 1. Mark matching CaixaMovimentacao entries as Cancelado
          const nextMovimentacao = caixaMovimentacao.map((mov) => {
            const matchesMovId = allMatchingMovIds.includes(mov.Id);
            let matchesByItem = false;
            if (mov.Itens) {
              try {
                const items = JSON.parse(mov.Itens);
                matchesByItem = items.some((it: any) =>
                  salesToCancel.some((s) => s.IdVenda === it.originalId)
                );
              } catch (e) {}
            }

            if (matchesMovId || matchesByItem) {
              return { ...mov, StatusVenda: "Cancelado" as const };
            }
            return mov;
          });

          // 2. Reduce the accumulators in CaixaSaldosForma correspondently
          let nextSaldos = [...caixaSaldosForma];
          salesToCancel.forEach((sale) => {
            sale.Payments.forEach((p: any) => {
              nextSaldos = nextSaldos.map((sf) => {
                if (
                  sf.IdUsuarioMaster === userMasterId &&
                  sf.FormaPagamento.toLowerCase() === p.FormaPagamento.toLowerCase()
                ) {
                  return { ...sf, SaldoAcumulado: Math.max(0, Number(sf.SaldoAcumulado) - p.Valor) };
                }
                return sf;
              });
            });
          });

          // 3. Return products to stock (lotesProdutos)
          let nextLotes = lotesProdutos.map((lot) => ({ ...lot }));
          let returnedCount = 0;
          salesToCancel.forEach((sale) => {
            sale.Itens.forEach((item: any) => {
              let productId = item.productId || item.originalId;

              if (item.type === "service") {
                const detRecord = detalhesMov.find((d) => d.Id === item.originalId);
                if (detRecord) {
                  productId = detRecord.Servico;
                }
              }

              // Extremely robust fallback: check if productId is actually in the products catalog,
              // otherwise try to find it by name or barcode
              let assocProduct = produtos.find((p) => p.Id === productId);
              if (!assocProduct) {
                assocProduct = produtos.find(
                  (p) => p.Nome === item.name || (item.barcode && p.CodigoDeBarras === item.barcode)
                );
                if (assocProduct) {
                  productId = assocProduct.Id;
                }
              }

              const productLots = nextLotes.filter((lot) => lot.IdProduto === productId);
              if (productLots.length > 0) {
                productLots[0].QuantidadeLote += item.quantity;
                returnedCount += item.quantity;
              } else {
                const associatedProd = produtos.find((p) => p.Id === productId);
                if (associatedProd?.Tipo === "Produto") {
                  const newLotId = `lot-estorno-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
                  nextLotes.push({
                    IdLote: newLotId,
                    IdProduto: productId,
                    NumeroLote: "ESTORNO",
                    QuantidadeLote: item.quantity,
                    ValidadeLote: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                    DataEntrada: new Date().toISOString().split("T")[0],
                  });
                  returnedCount += item.quantity;
                }
              }
            });
          });

          // 4. Set matching scheduler appointments (CadDetMovDiario) Pago to false
          if (onUpdateDetalhesMov) {
            const saleIdsToCancel = salesToCancel.map((s) => s.IdVenda);
            
            // Collect all service item IDs from all canceled sales
            const allServiceItemIds: string[] = [];
            salesToCancel.forEach((sale) => {
              (sale.Itens || []).forEach((it: any) => {
                if (it.type === "service" || it.id?.startsWith("service-")) {
                  allServiceItemIds.push(it.originalId);
                }
              });
            });

            const nextAppointmentsDetailsList = detalhesMov.map((det) => {
              if (allServiceItemIds.includes(det.Id) || saleIdsToCancel.includes(det.Id)) {
                return { ...det, Pago: false, PagoEm: undefined };
              }
              return det;
            });
            onUpdateDetalhesMov(nextAppointmentsDetailsList);
          }

          // Also set pre-sales (pre-pedidos / pré-vendas) back to Pendente in bulk
          if (onUpdatePrePedidos && prePedidos.length > 0) {
            const allPrePedidoIdsToCancel: string[] = [];
            salesToCancel.forEach((sale) => {
              (sale.Itens || []).forEach((it: any) => {
                if (it.type === "pre-pedido" || it.id?.startsWith("pre-")) {
                  allPrePedidoIdsToCancel.push(it.originalId);
                }
              });
            });
            if (allPrePedidoIdsToCancel.length > 0) {
              const nextPrePedidos = prePedidos.map((pre) => {
                if (allPrePedidoIdsToCancel.includes(pre.Id)) {
                  return { ...pre, Status: "Pendente" as const };
                }
                return pre;
              });
              onUpdatePrePedidos(nextPrePedidos);
            }
          }

          // 5. Subtract from client devedor balance for credit (Fiado) payments
          let nextClientes = [...clientes];
          let clientBalanceUpdates = false;
          salesToCancel.forEach((sale) => {
            const fiadoPayment = sale.Payments.find((p: any) => p.FormaPagamento.toLowerCase() === "fiado");
            if (fiadoPayment && sale.ClienteId) {
              clientBalanceUpdates = true;
              nextClientes = nextClientes.map((c) => {
                if (c.Id === sale.ClienteId) {
                  return { ...c, SaldoDevedor: Math.max(0, (c.SaldoDevedor || 0) - fiadoPayment.Valor) };
                }
                return c;
              });
            }
          });
          if (clientBalanceUpdates && onUpdateClientes) {
            onUpdateClientes(nextClientes);
          }

          // Trigger state propagates
          onUpdateCaixa(caixaDiario, nextMovimentacao, nextSaldos);
          onUpdateLotes?.(nextLotes);

          // Clear selection
          setSelectedSales([]);

          showAlert(
            "Estorno em Lote Processado! 🔄",
            `Estorno realizado com sucesso para ${salesToCancel.length} vendas! ${returnedCount > 0 ? `${returnedCount} itens de produto retornaram ao estoque.` : ""} Os faturamentos do Caixa foram ajustados.`
          );
        } catch (e: any) {
          showAlert("Erro no estorno em lote", e?.message || "Não foi possível estornar as vendas selecionadas.");
        }
      }
    );
  };

  const formatBRL = (cents: number) => {
    return cents.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const formatDateLabel = (dateStr: string) => {
    const parts = dateStr.split("T")[0].split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const formatTimeLabel = (dateStr: string) => {
    if (dateStr.includes("T")) {
      const timePart = dateStr.split("T")[1];
      return timePart.substring(0, 5);
    }
    return "";
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 font-sans space-y-6">
      
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2 uppercase">
            <span className="p-1 px-2 bg-indigo-100 rounded-lg text-indigo-700 font-mono text-sm">Caixa v3.2</span>
            Histórico de Vendas & Caixa
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Consulte as negociações processadas pelo PDV, audite pagamentos mistos, analise lucros e realize estornos rápidos de mercadoria.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center">
          {onBackToCaixa && (
            <button
              onClick={onBackToCaixa}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl active:scale-95 transition duration-100 cursor-pointer shadow-xs"
            >
              ← Voltar ao Caixa
            </button>
          )}
        </div>
      </div>

      {/* 1. BLOCO SUPERIOR: FILTROS DE BUSCA */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Activity className="h-4 w-4 text-slate-400" />
          <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
            Filtros Avançados de Auditoria
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Período */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Data de Pagamento (Pago Em)
            </label>
            <select
              value={periodo}
              onChange={(e: any) => {
                const val = e.target.value;
                setPeriodo(val);
                if (val === "hoje") {
                  setStartDate(todayStr);
                  setEndDate(todayStr);
                } else if (val === "ontem") {
                  const y = new Date();
                  y.setDate(y.getDate() - 1);
                  const yStr = y.toISOString().split("T")[0];
                  setStartDate(yStr);
                  setEndDate(yStr);
                } else if (val === "7dias") {
                  const p7 = new Date();
                  p7.setDate(p7.getDate() - 7);
                  setStartDate(p7.toISOString().split("T")[0]);
                  setEndDate(todayStr);
                }
              }}
              className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/10 cursor-pointer"
            >
              <option value="hoje">Hoje ({formatDateLabel(todayStr)})</option>
              <option value="ontem">Ontem</option>
              <option value="7dias">Últimos 7 dias</option>
              <option value="personalizado">Período Personalizado</option>
            </select>
          </div>

          {/* Calendario Customizado */}
          {periodo === "personalizado" && (
            <div className="md:col-span-1 grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  De (Início)
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none cursor-pointer"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Até (Fim)
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Cliente Cadastrado dropdown */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Cliente
            </label>
            <select
              value={selectedClienteId}
              onChange={(e) => setSelectedClienteId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="">Todos os Clientes</option>
              {clientes.map((c) => (
                <option key={c.Id} value={c.Id}>
                  {c.Nome}
                </option>
              ))}
            </select>
          </div>

          {/* Forma de Pagamento */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Forma de pagamento
            </label>
            <select
              value={formaPagamentoFilter}
              onChange={(e) => setFormaPagamentoFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="">Qualquer Forma</option>
              <option value="pix">PIX</option>
              <option value="cartão de débito">Cartão de Débito</option>
              <option value="cartão de crédito">Cartão de Crédito</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="fiado">Limite de Crédito (Fiado)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. BLOCO CENTRAL: CARDIZADORES DE RESUMO (KPIs) */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
        {/* Total Faturado */}
        <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm border border-slate-800 space-y-1 flex flex-col justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Faturamento Total</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-xl font-extrabold text-emerald-400">{formatBRL(kpis.faturamentoTotal)}</span>
          </div>
          <div className="h-1 bg-emerald-500 rounded-full w-full mt-2"></div>
        </div>

        {/* Total Pix */}
        <div className="bg-white rounded-2xl p-4 shadow-3xs border border-slate-200 space-y-1 flex flex-col justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Total PIX</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-lg font-bold text-slate-800">{formatBRL(kpis.totalPix)}</span>
          </div>
          <p className="text-[9px] text-teal-600 font-bold bg-teal-50 px-1.5 py-0.5 rounded-md w-fit mt-1">Sincronizado</p>
        </div>

        {/* Total Débito */}
        <div className="bg-white rounded-2xl p-4 shadow-3xs border border-slate-200 space-y-1 flex flex-col justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Total Débito</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-lg font-bold text-slate-800">{formatBRL(kpis.totalDebito)}</span>
          </div>
          <p className="text-[9px] text-slate-500 font-semibold bg-slate-100 px-1.5 py-0.5 rounded-md w-fit mt-1">Bandeira</p>
        </div>

        {/* Total Crédito */}
        <div className="bg-white rounded-2xl p-4 shadow-3xs border border-slate-200 space-y-1 flex flex-col justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Total Crédito</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-lg font-bold text-slate-800">{formatBRL(kpis.totalCredito)}</span>
          </div>
          <p className="text-[9px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded-md w-fit mt-1">1x a 12x</p>
        </div>

        {/* Total Dinheiro */}
        <div className="bg-white rounded-2xl p-4 shadow-3xs border border-slate-200 space-y-1 flex flex-col justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Total Dinheiro</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-lg font-bold text-slate-800">{formatBRL(kpis.totalDinheiro)}</span>
          </div>
          <p className="text-[9px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded-md w-fit mt-1">Líquido (Exlc. Troco)</p>
        </div>

        {/* Total Fiado */}
        <div className="bg-white rounded-2xl p-4 shadow-3xs border border-slate-200 space-y-1 flex flex-col justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Fiado (Crédito-Loja)</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-lg font-bold text-rose-700">{formatBRL(kpis.totalFiado)}</span>
          </div>
          <p className="text-[9px] text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded-md w-fit mt-1">Saldo em Aberto</p>
        </div>
      </div>

      {/* 3. ÁREA PRINCIPAL: GRID DETALHADO DE VENDAS */}
      <div ref={salesTableCardRef} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-col sm:flex-row sm:items-start sm:items-center gap-2">
            <h3 className="text-xs font-extrabold text-slate-700 tracking-wider uppercase font-mono">
              Relatório Operacional de Negociações ({filteredSales.length})
            </h3>
            {selectedSales.length > 0 && (
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono">
                <span>{selectedSales.length} selecionado(s)</span>
                <button 
                  type="button" 
                  onClick={() => setSelectedSales([])} 
                  className="text-emerald-900 hover:text-emerald-950 font-black underline ml-1 cursor-pointer"
                >
                  Limpar
                </button>
              </div>
            )}
          </div>
          <p className="text-[10px] text-slate-400 font-bold">
            Audite itens, verifique faturamentos mistos e processe estornos seguros
          </p>
        </div>

        {filteredSales.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Info className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-slate-600">Nenhuma venda encontrada para o período selecionado.</p>
            <p className="text-xs text-slate-400">Tente alterar os filtros ou realizar uma venda no Terminal de Caixa.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/70 text-slate-500 font-bold border-b border-slate-200">
                  <th className="p-3 text-center w-12 select-none">
                    <input
                      type="checkbox"
                      checked={filteredSales.length > 0 && selectedSales.length === filteredSales.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSales(filteredSales.map((s) => s.IdVenda));
                        } else {
                          setSelectedSales([]);
                        }
                      }}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20 h-4 w-4 cursor-pointer"
                      title="Selecionar todos"
                    />
                  </th>
                  <th className="p-3 text-center w-14">#</th>
                  <th className="p-3"># Data Agendamento</th>
                  <th className="p-3">Pago Em</th>
                  <th className="p-3">Nome do Cliente</th>
                  <th className="p-3 text-right">Valor Original</th>
                  <th className="p-3 text-right">Valor Cobrado</th>
                  <th className="p-3">Formas de Recebimento</th>
                  <th className="p-3 text-center w-28">Status</th>
                  <th className="p-3 text-center w-44">
                    {selectedSales.length >= 2 ? (
                      <button
                        type="button"
                        onClick={handleCancelSelectedSales}
                        className="w-full bg-amber-400 hover:bg-amber-500 active:scale-95 text-slate-900 font-bold px-2 py-1.5 rounded-lg text-[10px] uppercase transition cursor-pointer flex items-center justify-center gap-1 shadow-xs border border-amber-300 animate-pulse"
                        title="Estornar todas as vendas selecionadas"
                      >
                        <CornerUpLeft className="h-3 w-3 text-slate-800" />
                        <span>Estornar Selecionados</span>
                      </button>
                    ) : (
                      <span>Ações</span>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredSales.map((sale, index) => {
                  const isExpanded = expandedSaleId === sale.IdVenda;
                  const isCancelled = sale.StatusVenda === "Cancelado";
                  const hasModifiedPrice = !isCancelled && (Math.abs((sale.ValorOriginal ?? sale.ValorTotal) - (sale.ValorCobrado ?? sale.ValorTotal)) > 0.01);
                  const isDespesa = sale.Tipo === "Saída" || sale.NomeCliente?.toUpperCase() === "MINHAS DESPESAS" || (sale.Itens && sale.Itens.some((it: any) => it.tipo === "Saída" || it.tipo === "Saida"));
                  const rowBgClass = isCancelled
                    ? "bg-rose-50/20 text-slate-400"
                    : hasModifiedPrice
                    ? "bg-orange-50/80 hover:bg-orange-100/60 transition-colors text-amber-900"
                    : "hover:bg-slate-50/50 transition-colors";

                  return (
                    <React.Fragment key={sale.IdVenda}>
                      <tr className={`${rowBgClass} ${selectedSales.includes(sale.IdVenda) ? "bg-emerald-50/30" : ""}`}>
                        {/* Selector Checkbox */}
                        <td className="p-3 text-center select-none">
                          <input
                            type="checkbox"
                            checked={selectedSales.includes(sale.IdVenda)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSales((prev) => [...prev, sale.IdVenda]);
                              } else {
                                setSelectedSales((prev) => prev.filter((id) => id !== sale.IdVenda));
                              }
                            }}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20 h-4 w-4 cursor-pointer"
                          />
                        </td>
                        {/* Index */}
                        <td className="p-3 text-center font-mono text-slate-400 font-bold">{filteredSales.length - index}</td>
                        
                        {/* Data / Hora Agendada */}
                        <td className="p-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-700 font-mono">
                            {formatDateLabel(sale.DataHora)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {formatTimeLabel(sale.DataHora)} h
                          </div>
                        </td>

                        {/* Pago Em (Payment Date/Time) */}
                        <td className="p-3 whitespace-nowrap">
                          <div className="font-bold text-emerald-600 font-mono">
                            {formatDateLabel(sale.PagoEm)}
                          </div>
                          <div className="text-[10px] text-emerald-500 font-mono">
                            {formatTimeLabel(sale.PagoEm)} h
                          </div>
                        </td>

                        {/* Cliente */}
                        <td className="p-3">
                          <div className="font-bold text-slate-800">{sale.NomeCliente}</div>
                          {isDespesa && (sale.Observacao || sale.Itens?.[0]?.name) && (
                            <div className="text-[11px] text-red-600/95 font-medium mt-0.5 italic">
                              {sale.Observacao || sale.Itens?.[0]?.name}
                            </div>
                          )}
                          {sale.DocumentoCliente && !isDespesa && (
                            <div className="text-[10px] text-slate-400 font-mono">Documento: {sale.DocumentoCliente}</div>
                          )}
                        </td>

                        {/* Valor Original */}
                        <td className="p-3 text-right whitespace-nowrap">
                          {isDespesa ? (
                            <div className={`font-mono text-xs text-red-600 font-bold ${isCancelled ? "line-through" : ""}`}>
                              -{formatBRL(sale.ValorOriginal ?? sale.ValorTotal)}
                            </div>
                          ) : (
                            <div className={`font-mono text-xs ${isCancelled ? "line-through text-slate-400" : "text-slate-500 font-semibold"}`}>
                              {formatBRL(sale.ValorOriginal ?? sale.ValorTotal)}
                            </div>
                          )}
                        </td>

                        {/* Valor Cobrado */}
                        <td className="p-3 text-right whitespace-nowrap">
                          {isDespesa ? (
                            <div className={`font-extrabold font-mono text-sm text-red-600 ${isCancelled ? "line-through" : ""}`}>
                              -{formatBRL(sale.ValorCobrado ?? sale.ValorTotal)}
                            </div>
                          ) : (
                            <div className={`font-extrabold font-mono text-sm ${isCancelled ? "line-through text-slate-400" : hasModifiedPrice ? "text-amber-800" : "text-slate-800"}`}>
                              {formatBRL(sale.ValorCobrado ?? sale.ValorTotal)}
                            </div>
                          )}
                        </td>

                        {/* Formas de Recebimento */}
                        <td className="p-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {sale.Payments.map((p: any) => (
                              <span 
                                key={p.Id} 
                                className="inline-flex items-center gap-0.5 text-[10px] font-bold font-mono px-2 py-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg select-none"
                              >
                                {p.FormaPagamento}: <span className="text-slate-800 font-extrabold">{formatBRL(p.Valor)}</span>
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="p-3 text-center">
                          {isCancelled ? (
                            <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-rose-700 bg-rose-50 border border-rose-200/60 px-2 py-1 rounded-full">
                              ✕ Estornado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2 py-1 rounded-full">
                              ✓ Finalizado
                            </span>
                          )}
                        </td>

                        {/* Ações */}
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setExpandedSaleId(isExpanded ? null : sale.IdVenda);
                              }}
                              className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold transition duration-75 cursor-pointer active:scale-95 text-nowrap"
                              title="Visualizar produtos"
                            >
                              <Eye className="h-3.5 w-3.5 text-slate-500" />
                              <span>{isExpanded ? "Ocultar" : "Itens"}</span>
                            </button>

                            {!isCancelled && (
                              <button
                                type="button"
                                onClick={() => handleCancelSale(sale)}
                                className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 hover:text-rose-800 border border-rose-200/60 text-rose-700 rounded-lg text-xs font-bold transition duration-75 cursor-pointer active:scale-95 text-nowrap"
                                title="Estornar e retornar estoque"
                              >
                                <CornerUpLeft className="h-3.5 w-3.5 text-rose-600" />
                                <span>Estornar</span>
                              </button>
                            )}

                            {isGoldOrMaster && (
                              <button
                                type="button"
                                disabled={!selectedSales.includes(sale.IdVenda)}
                                onClick={() => handleDeleteSale(sale)}
                                className={`inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition duration-75 active:scale-95 text-nowrap shadow-sm ${
                                  selectedSales.includes(sale.IdVenda)
                                    ? "bg-red-600 hover:bg-red-500 text-white shadow-red-900/10 cursor-pointer"
                                    : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                                }`}
                                title={selectedSales.includes(sale.IdVenda) ? "Excluir venda permanentemente" : "Marque a caixa de seleção da linha para habilitar a exclusão"}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Excluir</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded View detailing the purchased products */}
                      {isExpanded && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={10} className="p-4 border-l-4 border-slate-400">
                            <div className="space-y-3">
                              <h4 className="text-xs font-extrabold text-slate-600 uppercase tracking-wider font-mono">
                                Itens inclusos na Venda (Carrinho)
                              </h4>
                              
                              {sale.Itens.length === 0 ? (
                                <p className="text-[11px] text-slate-400 italic">Nenhum produto gravado no carrinho para esta venda.</p>
                              ) : (
                                <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white max-w-2xl shadow-3xs">
                                  <table className="w-full text-left text-[11px] border-collapse">
                                    <thead>
                                      <tr className="bg-slate-100/80 text-slate-400 font-bold font-mono">
                                        <th className="p-2 border-r border-slate-200/60">Descrição / Nome</th>
                                        <th className="p-2 text-center border-r border-slate-200/60 w-16">Tipo</th>
                                        <th className="p-2 text-center border-r border-slate-200/60 w-16">Qtd</th>
                                        <th className="p-2 text-right border-r border-slate-200/60 w-24">Unitário</th>
                                        <th className="p-2 text-right w-24">Subtotal</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {sale.Itens.map((it: any, iIndex: number) => {
                                        const unitValue = Number(it.price) || 0;
                                        const subTotalValue = (Number(it.quantity) || 0) * unitValue;
                                        return (
                                          <tr key={`${sale.IdVenda}-item-${iIndex}`} className="hover:bg-slate-50/20">
                                            <td className="p-2 font-bold text-slate-700">
                                              {it.name} {it.petName && `(Pet: ${it.petName})`}
                                            </td>
                                            <td className="p-2 text-center whitespace-nowrap">
                                              <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase font-mono ${
                                                it.tipo === "Saída" || it.tipo === "Saida"
                                                  ? "bg-rose-50 text-rose-600 border border-rose-200/60"
                                                  : it.type === "product"
                                                  ? "bg-blue-50 text-blue-600"
                                                  : "bg-purple-50 text-purple-600"
                                              }`}>
                                                {it.tipo === "Saída" || it.tipo === "Saida" ? "Despesa" : it.type === "product" ? "Produto" : "Serviço"}
                                              </span>
                                            </td>
                                            <td className="p-2 text-center font-bold font-mono text-slate-600">{it.quantity}</td>
                                            <td className="p-2 text-right font-mono text-slate-500">{formatBRL(unitValue)}</td>
                                            <td className="p-2 text-right font-bold font-mono text-slate-750">{formatBRL(subTotalValue)}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {/* Details audit trail */}
                              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] text-slate-400 font-mono">
                                <div><span className="font-bold uppercase text-slate-500">ID da Transação:</span> {sale.IdVenda}</div>
                                {sale.ClienteId && (
                                  <div><span className="font-bold uppercase text-slate-500">Filiação de Cadastro:</span> {sale.ClienteId}</div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
