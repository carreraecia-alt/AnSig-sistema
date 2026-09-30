/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { CadUsuario } from "../types";
import { ShieldCheck, Lock, User, Scissors, Sparkles } from "lucide-react";

interface LoginProps {
  usuarios: CadUsuario[];
  onLoginSuccess: (user: CadUsuario) => void;
}

export default function Login({ usuarios, onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const foundUser = usuarios.find(
      (u) =>
        u.Nome.toLowerCase().trim() === username.toLowerCase().trim() &&
        u.Senha === password
    );

    if (foundUser) {
      if (foundUser.Permissoes !== "Administrador" && foundUser.Tipo_Assinatura !== "Vitalício" && foundUser.Data_Validade) {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const todayTime = new Date(todayStr).getTime();
        const valTime = new Date(foundUser.Data_Validade).getTime();
        const diffMs = todayTime - valTime;
        const daysDiff = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (daysDiff > 5) {
          alert("Ocorreu um pequeno problema técnico entre em contato com o Administrador");
          setError("Ocorreu um pequeno problema técnico entre em contato com o Administrador");
          return;
        }
      }
      onLoginSuccess({
        ...foundUser,
        Segmento: foundUser.Segmento || "petshop",
      });
    } else {
      setError("Usuário ou senha inválidos. Tente novamente.");
    }
  };

  const isDevOrPreview =
    (import.meta as any).env?.DEV ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname.includes("-dev-") ||
    window.location.hostname.includes("-pre-");

  const fillCredentials = (user: string, pass: string) => {
    if (!isDevOrPreview) return;
    setUsername(user);
    setPassword(pass);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-radial from-slate-100 to-slate-200 px-4 py-12 select-none">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden transition-all duration-300 hover:shadow-2xl">
        
        {/* Banner Deco */}
        <div className="bg-gradient-to-r from-emerald-600 to-indigo-600 p-8 text-center text-white relative">
          <div className="absolute top-3 right-3 bg-white/20 text-xs font-mono py-1 px-2.5 rounded-full backdrop-blur-md">
            PWA v1.0
          </div>
          <div className="inline-flex p-1 bg-white/20 rounded-full mb-3 backdrop-blur-sm shadow-md">
            <img
              src="/icon-192.png"
              alt="My Buddy Banho e Tosa"
              referrerPolicy="no-referrer"
              className="h-16 w-16 object-contain drop-shadow-md"
            />
          </div>
          <h1 className="text-2xl font-bold font-display tracking-tight leading-none mb-1">
            Banho e Tosa Empresa
          </h1>
          <p className="text-emerald-100 text-xs">
            Gestão Integrada de Agenda, Clientes e Fluxo Diário
          </p>
        </div>

        {/* Content Form */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-medium animate-bounce">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Usuário / Login
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <User className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition"
                  placeholder="Seu usuário cadastrado"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Senha de Acesso
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-xl transition-all shadow-md active:scale-[0.98]"
            >
              Entrar no Sistema
            </button>
          </form>

          {/* Assistant Help Pre-fills */}
          {isDevOrPreview && (
            <div className="mt-8 pt-6 border-t border-slate-100">
              <h3 className="text-xs font-semibold text-slate-500 mb-3 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Acesso Rápido Disponibilizado:
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!isDevOrPreview}
                  onClick={() => fillCredentials("carrera", "tesla21")}
                  className="p-2.5 bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition text-slate-700 group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="text-[11px] font-bold text-slate-900 group-hover:text-emerald-700">carrera (Admin)</div>
                  <div className="text-[10px] text-slate-500 font-mono">Senha: tesla21</div>
                </button>
                <button
                  type="button"
                  disabled={!isDevOrPreview}
                  onClick={() => fillCredentials("petshop_pro", "pet123")}
                  className="p-2.5 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-300 rounded-xl text-left transition text-slate-700 group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="text-[11px] font-bold text-slate-900 group-hover:text-indigo-700">petshop_pro (Usuário)</div>
                  <div className="text-[10px] text-slate-500 font-mono">Senha: pet123</div>
                </button>
              </div>
              <p className="mt-3 text-[10px] text-slate-400 text-center">
                * O cadastro de novos usuários é restrito ao Administrador.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
