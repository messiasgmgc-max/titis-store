import { SITE } from './site';

/** Junta classes condicionais sem dependências externas. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Formata centavos em BRL. `null` vira "Sob consulta". */
export function formatBRL(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return 'Sob consulta';
  return brl.format(cents / 100);
}

/** Link wa.me para o WhatsApp oficial da loja com texto pré-preenchido. */
export function whatsappLink(text?: string): string {
  const base = `https://wa.me/${SITE.whatsapp}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Identificador curto e único o suficiente para chaves de UI. */
export function uid(prefix = 'id'): string {
  const rnd = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${rnd}`;
}

/** Máscara simples de telefone brasileiro: (31) 99600-0213 */
export function formatPhoneBR(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function formatCPF(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/**
 * Validação oficial do algoritmo de CPF (módulo 11 dos dígitos verificadores).
 * Rejeita CPFs com números repetidos (111.111.111-11, 000.000.000-00, etc.) ou dígitos incorretos.
 */
export function isValidCPF(cpf: string | null | undefined): boolean {
  if (!cpf) return false;
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return false;

  // Rejeita sequências com todos os dígitos iguais
  if (/^(\d)\1{10}$/.test(clean)) return false;

  // Primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i), 10) * (10 - i);
  }
  let rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(clean.charAt(9), 10)) return false;

  // Segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i), 10) * (11 - i);
  }
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(clean.charAt(10), 10)) return false;

  return true;
}

/** Validação de CNPJ caso a compra seja efetuada por pessoa jurídica */
export function isValidCNPJ(cnpj: string | null | undefined): boolean {
  if (!cnpj) return false;
  const clean = cnpj.replace(/\D/g, '');
  if (clean.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(clean)) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(clean.charAt(i), 10) * weights1[i];
  }
  let rest = sum % 11;
  const d1 = rest < 2 ? 0 : 11 - rest;
  if (d1 !== parseInt(clean.charAt(12), 10)) return false;

  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(clean.charAt(i), 10) * weights2[i];
  }
  rest = sum % 11;
  const d2 = rest < 2 ? 0 : 11 - rest;
  if (d2 !== parseInt(clean.charAt(13), 10)) return false;

  return true;
}

export function isValidDocument(doc: string | null | undefined): boolean {
  if (!doc) return false;
  const clean = doc.replace(/\D/g, '');
  if (clean.length === 11) return isValidCPF(clean);
  if (clean.length === 14) return isValidCNPJ(clean);
  return false;
}

export function formatCEP(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export function formatDateBR(iso: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Contraste de texto sobre uma cor hex (para rótulos em amostras). */
export function readableOn(hex: string): '#0b0c10' | '#f5f1ea' {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0');
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#0b0c10' : '#f5f1ea';
}
