"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Crown, Sparkles, User, Shirt, Calendar, LogOut, ArrowRight, ShieldCheck, Star } from 'lucide-react';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUserData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          window.location.href = '/login';
          return;
        }

        setUser(user);

        // Fetch user profile from Supabase
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (data) {
          setProfile(data);
        } else {
          setProfile({
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
            role: 'client',
            preferred_skin_tone: 'Morena Dourada',
          });
        }
      } catch (err) {
        console.error('Error fetching dashboard user:', err);
      } finally {
        setLoading(false);
      }
    }

    loadUserData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0C10] flex items-center justify-center text-amber-400">
        <div className="flex flex-col items-center gap-3">
          <Crown className="w-8 h-8 animate-bounce text-[#D4AF37]" />
          <span className="text-xs uppercase tracking-widest font-bold">Carregando Painel VIP Titi's...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0C10] text-slate-100 flex flex-col justify-between">
      <div>
        <Header onStartConsultation={() => window.location.href = '/#consultoria'} />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
          
          {/* User Profile Card Banner */}
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="flex items-center gap-5 relative z-10">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gold-gradient p-1 shadow-xl shrink-0">
                <div className="w-full h-full rounded-xl bg-slate-900 flex items-center justify-center text-amber-400">
                  <User className="w-8 h-8 sm:w-10 sm:h-10 text-[#D4AF37]" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                    Membro VIP Titi's
                  </span>
                  <span className="text-xs text-slate-400">ID: {user?.id.slice(0, 8)}</span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-[family-name:var(--font-serif)]">
                  {profile?.full_name || 'Cliente VIP'}
                </h1>

                <p className="text-xs text-slate-400">
                  {user?.email} • Membro desde {new Date().getFullYear()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 relative z-10">
              <a
                href="/#consultoria"
                className="px-6 py-3 rounded-xl bg-gold-gradient text-[#0B0C10] font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 hover:scale-105 transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-[#0B0C10]" />
                <span>Nova Consultoria</span>
              </a>

              <button
                onClick={handleLogout}
                className="px-4 py-3 rounded-xl glass-card border border-slate-700 text-slate-300 hover:text-red-400 hover:bg-slate-800 text-xs font-semibold flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair</span>
              </button>
            </div>
          </div>

          {/* Grid of Profile Stats & Saved Consultations */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Col: Chromatic Profile Summary */}
            <div className="lg:col-span-4 space-y-6">
              
              <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-widest">
                  <Crown className="w-4 h-4 text-[#D4AF37]" />
                  <span>Sua Análise Cromática Ativa</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="text-xs text-slate-400">Tom de Pele Mapeado:</div>
                  <div className="text-lg font-bold text-white">Morena Dourada</div>
                  <div className="text-xs text-slate-400">Subtons quentes e aquecidos</div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Cores Recomendadas:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { name: 'Terracota', hex: '#A0522D' },
                      { name: 'Beige Champagne', hex: '#E6D7C3' },
                      { name: 'Verde Oliva', hex: '#4A5568' },
                      { name: 'Champagne Gold', hex: '#D4AF37' },
                    ].map((c, i) => (
                      <div key={i} className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
                        <div className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: c.hex }} />
                        <span className="text-xs text-slate-200 font-medium">{c.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* VIP Benefits Box */}
              <div className="glass-card p-6 rounded-2xl border border-amber-500/20 bg-slate-900/60 space-y-3">
                <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Benefícios da Conta VIP Titi's</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">✓ Histórico ilimitado de lookbooks salvos</li>
                  <li className="flex items-center gap-2">✓ Atendimento preferencial via assistente IA</li>
                  <li className="flex items-center gap-2">✓ Acesso antecipado à Coleção Signature 2026</li>
                </ul>
              </div>

            </div>

            {/* Right Col: Saved Lookbooks */}
            <div className="lg:col-span-8 space-y-6">
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white font-[family-name:var(--font-serif)]">
                    Seus Lookbooks Salvos
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Histórico de combinações geradas para os seus compromissos.
                  </p>
                </div>

                <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                  3 Looks no Histórico
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Lookbook Item 1 */}
                <div className="glass-card p-5 rounded-2xl border border-amber-500/30 space-y-3 relative group hover:border-amber-400 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 text-[10px] font-bold uppercase">
                      Jantar de Gala
                    </span>
                    <span className="text-[11px] text-slate-400">Salvo há 2 dias</span>
                  </div>

                  <h4 className="text-lg font-bold text-white font-[family-name:var(--font-serif)]">
                    Executivo Noir Gold
                  </h4>
                  <p className="text-xs text-slate-400">
                    Alfaiataria slim em lã fria azul marinho com camisa pima e sapato polido preto.
                  </p>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Presença: 96%</span>
                    <a href="/#consultoria" className="text-amber-400 font-bold flex items-center gap-1 hover:underline">
                      <span>Ver Detalhes</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Lookbook Item 2 */}
                <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3 relative group hover:border-slate-700 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold uppercase">
                      Casual Chic
                    </span>
                    <span className="text-[11px] text-slate-400">Salvo há 5 dias</span>
                  </div>

                  <h4 className="text-lg font-bold text-white font-[family-name:var(--font-serif)]">
                    Casual Luxury Terracota
                  </h4>
                  <p className="text-xs text-slate-400">
                    Tricô cashmere terracota com calça chino areia e sneaker nappa branco.
                  </p>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Presença: 89%</span>
                    <a href="/#consultoria" className="text-amber-400 font-bold flex items-center gap-1 hover:underline">
                      <span>Ver Detalhes</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

              </div>

            </div>

          </div>

        </main>

        <Footer />
      </div>
    </div>
  );
}
