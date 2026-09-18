'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ShoppingBag,
  Sparkles,
  BookOpen,
  MapPin,
  Phone,
  Mail,
  CheckCircle2,
  Share2,
  Check,
  ChevronRight,
  ShieldCheck,
  Users,
  Compass,
  ArrowUpRight,
  Bot,
  Wand2,
  Zap,
} from 'lucide-react';

// Galeria 1: Qualidade e Variedade
const GALLERY_QUALITY = [
  '/bio/bio_3_175995880800093786.jpg',
  '/bio/bio_4_175995882400054565.jpg',
  '/bio/bio_5_175995891600034899.jpg',
  '/bio/bio_6_175995893600018576.jpg',
  '/bio/bio_7_175995896400037545.jpg',
  '/bio/bio_8_175995895000083761.jpg',
  '/bio/bio_9_175995906900028036.jpg',
  '/bio/bio_10_175995912800085302.jpg',
  '/bio/bio_11_175995919600057201.jpg',
  '/bio/bio_12_175995952500012764.jpg',
];

// Galeria 2: Durabilidade e Sofisticação
const GALLERY_SOPHISTICATION = [
  '/bio/bio_14_175995962700087797.jpg',
  '/bio/bio_15_175995963900037635.jpg',
  '/bio/bio_16_175995964900080618.jpg',
  '/bio/bio_17_175995968000094753.jpg',
  '/bio/bio_18_175995969500039739.jpg',
  '/bio/bio_19_175995970300028810.jpg',
  '/bio/bio_20_175995972000078775.jpg',
  '/bio/bio_21_175995973300075939.jpg',
];

// Galeria 3: Atendimento & Showroom
const GALLERY_STORE = [
  '/bio/bio_22_175996123000041633.jpg',
  '/bio/bio_23_175996119600016405.jpg',
  '/bio/bio_24_175996123800082021.jpg',
  '/bio/bio_25_175996125800081381.jpg',
  '/bio/bio_26_175996127700071503.jpg',
  '/bio/bio_27_175996128800028798.jpg',
];

// Ícones Customizados
function WhatsAppIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
  );
}

function InstagramIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function TikTokIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 2.89 3.5 2.76 1.52-.02 2.85-1.05 3.21-2.52.12-.52.17-1.05.16-1.58.02-4.43.01-8.86.01-13.29z" />
    </svg>
  );
}

function FacebookIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

export default function LinksPage() {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : 'https://www.titisstore.com.br/links';
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'TITIS STORE | Links Oficiais',
          text: 'Referência em estilo masculino · Roupas masculinas com consultoria de imagem para qualquer ocasião.',
          url: url,
        });
        return;
      } catch {
        // cancelado pelo usuário
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore
    }
  };

  return (
    <main className="relative min-h-screen bg-[#090A0C] text-ivory selection:bg-gold selection:text-obsidian pb-16 font-sans">
      
      {/* Luz ambiente de fundo (Glow Dourado Alta Costura) */}
      <div
        aria-hidden
        className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 h-[600px] w-full max-w-lg -z-0 opacity-25"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(200, 155, 60, 0.4) 0%, rgba(10, 10, 12, 0) 75%)',
        }}
      />

      {/* Container Central Mobile-First */}
      <div className="relative z-10 mx-auto max-w-[460px] px-4 pt-8 sm:px-6">
        
        {/* Botão de Compartilhar no Topo */}
        <div className="flex justify-end mb-2">
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 rounded-full border border-line-gold/30 bg-surface/80 px-3.5 py-1.5 text-xs text-smoke backdrop-blur-md transition-all hover:border-gold hover:text-gold active:scale-95"
            title="Compartilhar página"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-gold" />
                <span className="text-gold font-bold">Link Copiado!</span>
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5" />
                <span>Compartilhar</span>
              </>
            )}
          </button>
        </div>

        {/* 1. PERFIL / HEADER */}
        <header className="flex flex-col items-center text-center">
          {/* Logo Circular com Anel Dourado Metálico */}
          <div className="relative group">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-gold/50 via-gold-light/60 to-gold/50 opacity-70 blur-md transition duration-500 group-hover:opacity-100" />
            <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-line-gold bg-obsidian p-1 shadow-2xl">
              <Image
                src="/bio/bio_1_175995817900077876.jpg"
                alt="TITIS STORE Logo"
                fill
                priority
                className="rounded-full object-cover"
              />
            </div>
          </div>

          {/* Badge Oficial Verificado */}
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-line-gold/40 bg-obsidian/90 px-3 py-0.5 backdrop-blur-md shadow-sm">
            <CheckCircle2 className="h-3 w-3 text-gold" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gold-light">
              Canal Oficial Verificado
            </span>
          </div>

          {/* Título da Marca */}
          <h1 className="mt-2.5 font-display text-2xl font-black tracking-widest text-ivory sm:text-3xl uppercase">
            TITIS STORE
          </h1>

          {/* Linha Divisória de Luxo */}
          <div className="mt-2 flex items-center justify-center gap-2 w-36">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold to-transparent" />
            <Sparkles className="h-2.5 w-2.5 text-gold shrink-0" />
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold to-transparent" />
          </div>

          {/* Descrição & Missão */}
          <p className="mt-3 text-xs leading-relaxed text-parchment/90 max-w-sm px-2">
            Referência em estilo masculino! Roupas masculinas com consultoria de imagem para qualquer ocasião.
          </p>

          {/* Micro Pills com Diferenciais */}
          <div className="mt-4 flex flex-wrap justify-center gap-1.5 text-[10px] font-medium text-smoke">
            <span className="rounded-full border border-line/70 bg-surface/60 px-2.5 py-1 backdrop-blur-sm">
              📍 Betim - MG
            </span>
            <span className="rounded-full border border-line/70 bg-surface/60 px-2.5 py-1 backdrop-blur-sm">
              ⭐ Há +6 anos no mercado
            </span>
            <span className="rounded-full border border-line/70 bg-surface/60 px-2.5 py-1 backdrop-blur-sm">
              🚚 Envio para todo o Brasil
            </span>
          </div>
        </header>

        {/* 2. DESTAQUES PRINCIPAIS (CONSULTOR DE IA, LOJA & WHATSAPP) */}
        <section className="mt-8 space-y-4" aria-label="Destaques Principais">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gold">
              Destaques Oficiais
            </span>
            <span className="text-[10px] text-mist font-medium">
              Escolha como deseja ser atendido
            </span>
          </div>

          {/* DESTAQUE 1: PAINEL DO CONSULTOR DE IA (consultor.titisstore.com.br) */}
          <motion.div whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}>
            <a
              href="https://consultor.titisstore.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative block overflow-hidden rounded-3xl border-2 border-line-gold bg-gradient-to-b from-[#181a20] via-surface to-obsidian p-5 shadow-2xl shadow-gold/15 transition-all duration-300 hover:border-gold hover:shadow-gold/25"
            >
              {/* Efeito Glow / Shimmer Dourado */}
              <div
                aria-hidden
                className="pointer-events-none absolute -top-12 -right-12 h-36 w-36 rounded-full bg-gold/15 blur-2xl transition-opacity group-hover:opacity-100"
              />

              {/* Tag Superior Exclusiva */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-line-gold/60 bg-obsidian/80 px-2.5 py-1 backdrop-blur-md">
                  <Sparkles className="h-3 w-3 text-gold" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-gold-light">
                    Tecnologia Exclusiva · IA
                  </span>
                </div>
                <span className="text-[10px] font-bold text-gold flex items-center gap-0.5">
                  consultor.titisstore.com.br
                  <ArrowUpRight className="h-3 w-3" />
                </span>
              </div>

              {/* Corpo do Card */}
              <div className="flex items-start gap-3.5">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-line-gold bg-obsidian text-gold shadow-md group-hover:scale-105 transition-transform">
                  <Bot className="h-6 w-6 text-gold" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <h2 className="text-base font-black tracking-wide text-ivory group-hover:text-gold-light transition-colors">
                    Consultor de Imagem com IA
                  </h2>
                  <p className="mt-1 text-xs text-parchment leading-relaxed">
                    Diagnóstico de estilo gratuito, análise de biotipo e recomendações de looks sob medida geradas por Inteligência Artificial.
                  </p>
                </div>
              </div>

              {/* Pílulas de Benefícios */}
              <div className="mt-3.5 flex flex-wrap gap-1.5 text-[9px] font-semibold text-parchment">
                <span className="rounded-md border border-line-gold/30 bg-surface/80 px-2 py-0.5">
                  ✦ Diagnóstico Gratuito
                </span>
                <span className="rounded-md border border-line-gold/30 bg-surface/80 px-2 py-0.5">
                  ✦ Looks Personalizados
                </span>
                <span className="rounded-md border border-line-gold/30 bg-surface/80 px-2 py-0.5">
                  ✦ Provador Virtual
                </span>
              </div>

              {/* Botão de Ação Dentro do Card */}
              <div className="mt-4 flex items-center justify-between rounded-xl border border-line-gold/40 bg-gold/10 px-3.5 py-2 text-xs font-bold text-gold-light transition-colors group-hover:bg-gold group-hover:text-obsidian">
                <span>Acessar Painel do Consultor de IA</span>
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </a>
          </motion.div>

          {/* DESTAQUE 2: LOJA OFICIAL ONLINE (www.titisstore.com.br) */}
          <motion.div whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}>
            <Link
              href="/store"
              className="group relative block overflow-hidden rounded-3xl bg-gold-gradient p-5 text-obsidian shadow-2xl shadow-gold/20 transition-all duration-300 hover:shadow-gold/35"
            >
              {/* Tag Superior */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-obsidian/15 px-2.5 py-1">
                  <ShoppingBag className="h-3 w-3 text-obsidian" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-obsidian">
                    E-commerce Oficial
                  </span>
                </div>
                <span className="text-[10px] font-bold text-obsidian flex items-center gap-0.5">
                  www.titisstore.com.br
                  <ChevronRight className="h-3 w-3" />
                </span>
              </div>

              {/* Conteúdo */}
              <div className="flex items-start gap-3.5">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-obsidian text-gold shadow-lg group-hover:scale-105 transition-transform">
                  <ShoppingBag className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <h2 className="text-base font-black tracking-wide text-obsidian">
                    Compre Aqui na Loja Oficial
                  </h2>
                  <p className="mt-1 text-xs font-medium text-obsidian/85 leading-relaxed">
                    Catálogo completo de alta alfaiataria masculina, calças com regulador, polos em tricô e camisas de linho.
                  </p>
                </div>
              </div>

              {/* Pílulas de Benefícios */}
              <div className="mt-3.5 flex flex-wrap gap-1.5 text-[9px] font-bold text-obsidian">
                <span className="rounded-md bg-obsidian/10 px-2 py-0.5">
                  ✓ Envio para todo o Brasil
                </span>
                <span className="rounded-md bg-obsidian/10 px-2 py-0.5">
                  ✓ Até 12x no Cartão
                </span>
                <span className="rounded-md bg-obsidian/10 px-2 py-0.5">
                  ✓ 1ª Troca Grátis
                </span>
              </div>

              {/* Botão de Ação */}
              <div className="mt-4 flex items-center justify-between rounded-xl bg-obsidian px-3.5 py-2 text-xs font-bold text-gold transition-colors group-hover:bg-obsidian/90">
                <span>Ver Coleção Completa & Comprar</span>
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          </motion.div>

          {/* DESTAQUE 3: COMPRE AQUI PELO WHATSAPP */}
          <motion.div whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}>
            <a
              href="https://api.whatsapp.com/send?phone=5531996000213&text=Ol%C3%A1%2C%20vim%20pelo%20link%20da%20bio%20e%20gostaria%20de%20fazer%20um%20pedido%21"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative block overflow-hidden rounded-3xl border border-emerald-500/50 bg-surface/90 p-5 backdrop-blur-md transition-all duration-300 hover:border-emerald-400 hover:shadow-xl hover:shadow-emerald-500/10"
            >
              {/* Tag Superior */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1">
                  <WhatsAppIcon className="h-3 w-3 text-emerald-400" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">
                    Atendimento Humanizado
                  </span>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5">
                  (31) 99600-0213
                  <ArrowUpRight className="h-3 w-3" />
                </span>
              </div>

              {/* Conteúdo */}
              <div className="flex items-start gap-3.5">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-emerald-500/40 bg-emerald-500/15 text-emerald-400 shadow-md group-hover:scale-105 transition-transform">
                  <WhatsAppIcon className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <h2 className="text-base font-black tracking-wide text-ivory group-hover:text-emerald-300 transition-colors">
                    Compre pelo WhatsApp VIP
                  </h2>
                  <p className="mt-1 text-xs text-parchment leading-relaxed">
                    Atendimento direto com nossos especialistas e com o consultor Fernando para tirar dúvidas de medidas e fechar pedidos.
                  </p>
                </div>
              </div>

              {/* Pílulas de Benefícios */}
              <div className="mt-3.5 flex flex-wrap gap-1.5 text-[9px] font-semibold text-parchment">
                <span className="rounded-md border border-line bg-surface px-2 py-0.5">
                  ✓ Resposta Rápida
                </span>
                <span className="rounded-md border border-line bg-surface px-2 py-0.5">
                  ✓ Suporte de Tamanho
                </span>
                <span className="rounded-md border border-line bg-surface px-2 py-0.5">
                  ✓ Pronta Entrega
                </span>
              </div>

              {/* Botão de Ação */}
              <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2 text-xs font-bold text-emerald-300 transition-colors group-hover:bg-emerald-500 group-hover:text-obsidian">
                <span>Iniciar Conversa no WhatsApp</span>
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </a>
          </motion.div>

          {/* ACESSOS COMPLEMENTARES */}
          <div className="pt-2 space-y-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-mist px-1">
              Mais Acessos
            </div>

            {/* CATÁLOGO DE PEÇAS */}
            <Link
              href="/store/colecao"
              className="group flex items-center justify-between rounded-2xl border border-line bg-surface/70 p-3.5 backdrop-blur-md transition-all duration-300 hover:border-line-gold hover:bg-surface"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-obsidian/70 text-gold">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-ivory block group-hover:text-gold-light transition-colors">
                    Catálogo Completo de Peças
                  </span>
                  <p className="text-[10px] text-smoke">
                    Alfaiataria, linho, polos e bermudas
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-mist transition-all group-hover:text-gold group-hover:translate-x-0.5" />
            </Link>

            {/* GUIA PRÁTICO DE ESTILO */}
            <a
              href="https://pay.kiwify.com.br/aX2SlBh"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between rounded-2xl border border-line bg-surface/70 p-3.5 backdrop-blur-md transition-all duration-300 hover:border-line-gold hover:bg-surface"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-obsidian/70 text-gold">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-ivory block group-hover:text-gold-light transition-colors">
                      Guia Prático de Estilo Masculino
                    </span>
                    <span className="rounded bg-gold/15 px-1.5 py-0.2 text-[8px] font-bold text-gold-light">
                      E-book
                    </span>
                  </div>
                  <p className="text-[10px] text-smoke">
                    Manual prático para montar looks elegantes
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-mist transition-all group-hover:text-gold group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </div>
        </section>

        {/* 3. SEÇÃO: QUALIDADE E VARIEDADE (CARROSSEL COM FOTOS ORIGINAIS) */}
        <section className="mt-12 rounded-3xl border border-line bg-surface/40 p-5 backdrop-blur-md">
          <div className="text-center">
            <p className="font-display text-xs font-bold uppercase tracking-[0.25em] text-gold">
              “Qualidade e Variedade”
            </p>
            <p className="mt-1 text-[11px] text-smoke flex items-center justify-center gap-1">
              <span>Arraste para o lado para explorar</span>
              <ChevronRight className="h-3 w-3 text-gold" />
            </p>
          </div>

          {/* Carrossel Horizontal com Snap Touch */}
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
            {GALLERY_QUALITY.map((src, idx) => (
              <div
                key={idx}
                className="relative h-64 w-44 shrink-0 snap-center overflow-hidden rounded-2xl border border-line bg-obsidian shadow-md transition-transform duration-300 hover:scale-[1.02]"
              >
                <Image
                  src={src}
                  alt={`Peça Titis Store ${idx + 1}`}
                  fill
                  className="object-cover object-top"
                  sizes="176px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-obsidian/60 via-transparent to-transparent" />
              </div>
            ))}
          </div>
        </section>

        {/* 4. SEÇÃO: ESTAMOS SITUADOS NA CIDADE DE BETIM - MINAS GERAIS */}
        <section className="mt-8 rounded-3xl border border-line-gold/40 bg-surface/50 p-6 text-center backdrop-blur-md relative overflow-hidden">
          <div className="relative z-10">
            <span className="font-display text-xs font-black uppercase tracking-[0.2em] text-gold block">
              “Estamos Situados na Cidade de Betim - Minas Gerais”
            </span>
            <p className="mt-3 text-xs leading-relaxed text-parchment">
              • Há mais de seis anos vestindo estilo, confiança e atitude. Moda masculina casual e formal para todas as ocasiões!
            </p>

            {/* Foto Destaque de Dobras e Acabamento de Alta Alfaiataria */}
            <div className="relative mt-5 aspect-[16/10] w-full overflow-hidden rounded-2xl border border-line bg-obsidian shadow-xl">
              <Image
                src="/bio/bio_13_175995966200078902.jpg"
                alt="Alta qualidade de confecção e acabamento em Betim/MG"
                fill
                className="object-cover"
                sizes="(max-width: 460px) 100vw, 460px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-obsidian/70 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] text-ivory">
                <span className="font-semibold text-gold-light">Padrão Titis Store</span>
                <span className="text-[10px] text-mist">Pronta entrega & Envio</span>
              </div>
            </div>
          </div>
        </section>

        {/* 5. SEÇÃO: DURABILIDADE E SOFISTICAÇÃO */}
        <section className="mt-8 rounded-3xl border border-line bg-surface/40 p-5 backdrop-blur-md">
          <div className="text-center">
            <p className="font-display text-xs font-bold uppercase tracking-[0.25em] text-gold">
              “Durabilidade e Sofisticação”
            </p>
            <div className="mt-3 space-y-2 text-left text-xs text-parchment/90 px-1">
              <p className="flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                <span><strong>Produtos de alta qualidade:</strong> Peças exclusivas com diversas opções à pronta entrega.</span>
              </p>
              <p className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                <span>Roupas e acessórios para todos os estilos: t-shirts básicas, camisas de linho, calças de alfaiataria, shorts e bermudas, blazers, calçados e relógios.</span>
              </p>
            </div>
            <p className="mt-4 text-[11px] text-smoke flex items-center justify-center gap-1">
              <span>Arraste para o lado</span>
              <ChevronRight className="h-3 w-3 text-gold" />
            </p>
          </div>

          {/* Galeria Sofisticação */}
          <div className="mt-3 flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
            {GALLERY_SOPHISTICATION.map((src, idx) => (
              <div
                key={idx}
                className="relative h-64 w-44 shrink-0 snap-center overflow-hidden rounded-2xl border border-line bg-obsidian shadow-md transition-transform duration-300 hover:scale-[1.02]"
              >
                <Image
                  src={src}
                  alt={`Look Titis Store ${idx + 1}`}
                  fill
                  className="object-cover object-top"
                  sizes="176px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-obsidian/60 via-transparent to-transparent" />
              </div>
            ))}
          </div>
        </section>

        {/* 6. SEÇÃO: ATENDIMENTO FÍSICO E ONLINE */}
        <section className="mt-8 rounded-3xl border border-line bg-surface/40 p-5 backdrop-blur-md">
          <div className="text-center">
            <p className="font-display text-xs font-bold uppercase tracking-[0.25em] text-gold">
              “Atendimento Físico e Online”
            </p>
            <p className="mt-2 text-xs text-parchment leading-relaxed">
              • Envios rápidos e seguros para todo o Brasil | Ponto físico disponível para visitas e consultoria.
            </p>
            <p className="mt-3 text-[11px] text-smoke flex items-center justify-center gap-1">
              <span>Nosso showroom e ambiente</span>
              <ChevronRight className="h-3 w-3 text-gold" />
            </p>
          </div>

          {/* Galeria Loja Física */}
          <div className="mt-3 flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
            {GALLERY_STORE.map((src, idx) => (
              <div
                key={idx}
                className="relative h-64 w-44 shrink-0 snap-center overflow-hidden rounded-2xl border border-line bg-obsidian shadow-md transition-transform duration-300 hover:scale-[1.02]"
              >
                <Image
                  src={src}
                  alt={`Showroom Titis Store ${idx + 1}`}
                  fill
                  className="object-cover object-center"
                  sizes="176px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-obsidian/60 via-transparent to-transparent" />
              </div>
            ))}
          </div>
        </section>

        {/* 7. FALE CONOSCO & REDES SOCIAIS (LINKS SECUNDÁRIOS) */}
        <section className="mt-10" aria-label="Redes e Contato">
          <div className="text-center mb-4">
            <p className="font-display text-xs font-bold uppercase tracking-[0.25em] text-gold">
              “Fale Conosco”
            </p>
            <p className="mt-1 text-[11px] text-smoke">
              Atendimento online 24h · Loja física: Seg a Sáb, das 10h às 18h (sob agendamento)
            </p>
          </div>

          <div className="space-y-2.5">
            
            {/* GRUPO VIP */}
            <a
              href="https://chat.whatsapp.com/Fh7SjnLxsZE9MHdDLQfq3M?mode=wwc"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border border-line bg-surface/70 px-4 py-3 text-xs font-semibold text-ivory transition-all hover:border-line-gold hover:text-gold-light"
            >
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-gold" />
                <span>Grupo VIP no WhatsApp</span>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-smoke" />
            </a>

            {/* LOCALIZAÇÃO */}
            <a
              href="https://maps.app.goo.gl/dmgVRkgFHVMJCe5Q6?g_st=ipc"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border border-line bg-surface/70 px-4 py-3 text-xs font-semibold text-ivory transition-all hover:border-line-gold hover:text-gold-light"
            >
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-gold" />
                <span>Localização no Google Maps (Betim/MG)</span>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-smoke" />
            </a>

            {/* INSTAGRAM */}
            <a
              href="https://www.instagram.com/titis.store?igsh=MXZuYm9zdXVtNzBzZw=="
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border border-line bg-surface/70 px-4 py-3 text-xs font-semibold text-ivory transition-all hover:border-line-gold hover:text-gold-light"
            >
              <div className="flex items-center gap-3">
                <InstagramIcon className="h-4 w-4 text-gold" />
                <span>Instagram Oficial (@titis.store)</span>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-smoke" />
            </a>

            {/* FACEBOOK */}
            <a
              href="https://www.facebook.com/share/1Z3qYNhTN1/?mibextid=wwXIfr"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border border-line bg-surface/70 px-4 py-3 text-xs font-semibold text-ivory transition-all hover:border-line-gold hover:text-gold-light"
            >
              <div className="flex items-center gap-3">
                <FacebookIcon className="h-4 w-4 text-gold" />
                <span>Facebook</span>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-smoke" />
            </a>

            {/* TIKTOK */}
            <a
              href="https://www.tiktok.com/@lojadotiti?_t=ZM-90NlOP43pzU&_r=1"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border border-line bg-surface/70 px-4 py-3 text-xs font-semibold text-ivory transition-all hover:border-line-gold hover:text-gold-light"
            >
              <div className="flex items-center gap-3">
                <TikTokIcon className="h-4 w-4 text-gold" />
                <span>TikTok (@lojadotiti)</span>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-smoke" />
            </a>

            {/* LIGAR AGORA */}
            <a
              href="https://api.whatsapp.com/send?phone=5531996000213"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border border-line bg-surface/70 px-4 py-3 text-xs font-semibold text-ivory transition-all hover:border-line-gold hover:text-gold-light"
            >
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-gold" />
                <span>Ligar Agora / Telefone de Contato</span>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-smoke" />
            </a>

            {/* E-MAIL SUPORTE */}
            <a
              href="mailto:contato@titisstore.com.br"
              className="flex items-center justify-between rounded-xl border border-line bg-surface/70 px-4 py-3 text-xs font-semibold text-ivory transition-all hover:border-line-gold hover:text-gold-light"
            >
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gold" />
                <span>E-mail & Suporte</span>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-smoke" />
            </a>

          </div>
        </section>

        {/* 8. RODAPÉ DE LUXO */}
        <footer className="mt-14 border-t border-line/50 pt-8 pb-4 text-center">
          <div className="inline-block relative h-10 w-10 overflow-hidden rounded-full border border-line-gold/40">
            <Image
              src="/bio/bio_1_175995817900077876.jpg"
              alt="TITIS STORE"
              fill
              className="object-cover"
            />
          </div>
          
          <p className="mt-3 font-display text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
            “Mais informações em nosso site ou via WhatsApp”
          </p>

          <p className="mt-2 text-[10px] text-mist">
            © {new Date().getFullYear()} TITIS STORE · Betim / Minas Gerais<br />
            Todos os direitos reservados.
          </p>
        </footer>

      </div>
    </main>
  );
}
