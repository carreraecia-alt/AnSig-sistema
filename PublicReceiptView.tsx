import React from "react";
import { ThemeColor, DatabaseState, CadInfoConta } from "../types";
import { BoxCartItem, isDiscountItem } from "./CaixaSheet";
import { FileText, Calendar, User, CreditCard, ShieldCheck, Scissors, AlertCircle } from "lucide-react";

interface PublicReceiptViewProps {
  idVenda: string;
  db: DatabaseState;
}

export default function PublicReceiptView({ idVenda, db }: PublicReceiptViewProps) {
  // Try to find the sale in transactions
  const transaction = db.caixaMovimentacao?.find((m) => m.IdVenda === idVenda);
  
  // Try to find current active branding / infoConta
  const currentInfoConta: CadInfoConta | undefined = db.infoContas?.[0];

  const activeTheme: ThemeColor = {
    name: "Emerald Green",
    primary: "bg-emerald-600",
    bgLightHex: "#f0fdf4",
    accent: "text-emerald-600",
    text: "text-slate-800",
    border: "border-emerald-200",
  };

  // Safe parse items
  let items: BoxCartItem[] = [];
  if (transaction && transaction.Itens) {
    try {
      items = JSON.parse(transaction.Itens);
    } catch (e) {
      console.error("Erro ao analisar itens da transação:", e);
    }
  }

  const getItemNameParts = (item: BoxCartItem) => {
    const isAgendamento = item.type === "service" || item.id?.startsWith("service-");
    const isDiscount = isDiscountItem(item);
    let mainName = item.name.toUpperCase();
    let subName = "";
    
    const parenIndex = mainName.indexOf("(");
    if (parenIndex !== -1) {
      subName = mainName.substring(parenIndex);
      mainName = mainName.substring(0, parenIndex).trim();
    }
    
    if (isAgendamento && item.petName) {
      mainName += ` (Animal: ${item.petName.toUpperCase()})`;
    }

    if (isDiscount && !mainName.includes("DESCONTO") && !mainName.includes("ABATIMENTO")) {
      mainName = `[DESCONTO] ${mainName}`;
    }
    
    return { mainName, subName };
  };

  // Fallback in case the sale is not found
  if (!transaction) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 font-sans text-slate-100">
        <div className="w-full max-w-md bg-slate-850 p-8 rounded-3xl border border-slate-800 text-center space-y-6 shadow-2xl animate-fade-in">
          <div className="mx-auto w-16 h-16 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center border border-amber-500/20">
            <AlertCircle className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight">Comprovante Não Encontrado</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              O cupom com o ID <span className="font-mono text-amber-400 font-semibold">{idVenda}</span> não foi localizado ou ainda está em processo de sincronização com a nuvem.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-xs transition cursor-pointer shadow-md shadow-emerald-950/20"
            >
              Tentar Novamente / Sincronizar
            </button>
          </div>
        </div>
      </div>
    );
  }

  let computedSubtotal = 0;
  let computedDiscounts = 0;

  items.forEach((item) => {
    const isDiscount = isDiscountItem(item);
    const qty = item.quantity || 1;
    const absPrice = Math.abs(item.price);
    const origPrice = typeof item.originalPrice === "number" ? Math.abs(item.originalPrice) : absPrice;

    if (isDiscount) {
      computedDiscounts += absPrice * qty;
    } else {
      computedSubtotal += origPrice * qty;
      if (origPrice > absPrice) {
        computedDiscounts += (origPrice - absPrice) * qty;
      }
    }
  });

  const subtotalValue = computedSubtotal > 0
    ? computedSubtotal
    : (transaction.ValorOriginal || transaction.ValorTotalVenda || transaction.Valor || 0);

  const totalValue = transaction.ValorCobrado ?? transaction.ValorTotalVenda ?? transaction.Valor ?? Math.max(0, subtotalValue - computedDiscounts);
  const discountValue = computedDiscounts > 0
    ? computedDiscounts
    : Math.max(0, subtotalValue - totalValue);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-start p-4 md:p-8 font-sans text-slate-100 selection:bg-emerald-500/20">
      
      {/* Decorative branding elements */}
      <div className="w-full max-w-lg mb-6 flex flex-col items-center text-center">
        <div className="flex items-center gap-2 mb-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
          <Scissors className="h-4 w-4 text-emerald-400" />
          <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest font-mono">
            Comprovante Digital Oficial
          </span>
        </div>
        <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
          {currentInfoConta?.NomeEmpresa || "MY BUDDY"}
        </h1>
        {currentInfoConta?.Endereco && (
          <p className="text-[10px] text-slate-400 max-w-xs leading-normal mt-1">
            {currentInfoConta.Endereco}
          </p>
        )}
      </div>

      {/* Main Container: Elegant Paper Ticket Mockup */}
      <div className="w-full max-w-lg bg-white rounded-3xl text-slate-900 shadow-2xl border border-slate-200 overflow-hidden animate-fade-in flex flex-col">
        
        {/* Banner header inside ticket */}
        <div className="bg-slate-900 p-6 text-white flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-8 -mt-8" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-500/10 rounded-full blur-xl -ml-8 -mb-8" />
          
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/20 mb-3">
            <ShieldCheck className="h-6 w-6" />
          </div>
          
          <h2 className="font-extrabold text-sm tracking-widest uppercase text-emerald-400">
            Faturado com Sucesso
          </h2>
          <p className="text-[10px] text-slate-400 mt-1 font-mono tracking-wider">
            ID DA VENDA: {transaction.IdVenda || idVenda}
          </p>
        </div>

        {/* Ticket Details Body */}
        <div className="p-6 md:p-8 space-y-6">
          
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
                Data / Hora
              </span>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>{transaction.DataHora || new Date().toLocaleString("pt-BR")}</span>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
                Cliente
              </span>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{transaction.NomeCliente?.toUpperCase() || "CONSUMIDOR FINAL"}</span>
              </div>
            </div>
          </div>

          {/* Ticket Border divider */}
          <div className="border-t border-dashed border-slate-200" />

          {/* Items Section */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              Itens Adquiridos
            </h3>
            
            {items.length === 0 ? (
              <div className="text-xs text-slate-400 italic">Nenhum detalhe de item disponível.</div>
            ) : (
              <div className="space-y-3 font-mono">
                {items.map((item, idx) => {
                  const { mainName, subName } = getItemNameParts(item);
                  const isDiscount = isDiscountItem(item);
                  const absPrice = Math.abs(item.price);
                  const lineTotal = Math.abs(item.price * item.quantity);

                  return (
                    <div
                      key={idx}
                      className={`flex justify-between items-start text-xs leading-snug p-2 rounded-xl transition ${
                        isDiscount ? "bg-rose-50 border border-rose-200/70 text-rose-900" : ""
                      }`}
                    >
                      <div className="max-w-[70%]">
                        <div className={`font-bold flex items-center gap-1.5 ${isDiscount ? "text-rose-700" : "text-slate-800"}`}>
                          <span>{idx + 1}. {mainName}</span>
                          {isDiscount && (
                            <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold bg-rose-600 text-white tracking-wider uppercase font-mono leading-none">
                              Desconto
                            </span>
                          )}
                        </div>
                        {subName && (
                          <div className={`text-[10px] mt-0.5 ${isDiscount ? "text-rose-600/80" : "text-slate-500"}`}>
                            {subName}
                          </div>
                        )}
                        <div className={`text-[10px] mt-0.5 font-mono ${isDiscount ? "text-rose-600" : "text-slate-400"}`}>
                          Qtd: {item.quantity} x {isDiscount ? `- R$ ${absPrice.toFixed(2)}` : `R$ ${absPrice.toFixed(2)}`}
                        </div>
                      </div>
                      <div className={`text-right font-bold shrink-0 font-mono ${isDiscount ? "text-rose-700 font-extrabold" : "text-slate-800"}`}>
                        {isDiscount ? `- R$ ${lineTotal.toFixed(2)}` : `R$ ${lineTotal.toFixed(2)}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Ticket Border divider */}
          <div className="border-t border-dashed border-slate-200" />

          {/* Payment and Totals Section */}
          <div className="space-y-4">
            
            {/* Breakdown */}
            <div className="space-y-1.5 text-xs font-mono text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>R$ {subtotalValue.toFixed(2)}</span>
              </div>
              
              {discountValue > 0 && (
                <div className="flex justify-between text-rose-600 font-semibold">
                  <span>Desconto Aplicado</span>
                  <span>- R$ {discountValue.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Total Highlight */}
            <div className="bg-emerald-50 p-4.5 rounded-2xl border border-emerald-100 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block font-mono leading-none">
                  Total Pago
                </span>
                <span className="text-xs text-emerald-600 font-medium font-mono leading-none">
                  Via {transaction.FormaPagamento || "Dinheiro"}
                </span>
              </div>
              <div className="text-xl font-black text-emerald-800 tracking-tight font-mono">
                R$ {totalValue.toFixed(2)}
              </div>
            </div>

          </div>

          {/* Ticket Border divider */}
          <div className="border-t border-dashed border-slate-200" />

          {/* Establishment Footer Details */}
          <div className="text-center space-y-1">
            <p className="text-[10px] text-slate-400">
              Obrigado pela preferência e confiança!
            </p>
            {currentInfoConta?.Fone && (
              <p className="text-[9px] text-slate-400 font-mono">
                Contato: {currentInfoConta.Fone}
              </p>
            )}
            <p className="text-[8px] text-slate-300 font-sans italic pt-1">
              Cupom Não Fiscal • Gerado Eletronicamente via My Buddy App
            </p>
          </div>

        </div>

      </div>

      {/* Page copyright/footer */}
      <div className="mt-8 text-center text-[10px] text-slate-500 font-mono">
        My Buddy App © {new Date().getFullYear()} • Todos os direitos reservados.
      </div>

    </div>
  );
}
