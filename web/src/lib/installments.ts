import { formatBRL } from './format';

/**
 * Coeficientes de parcelamento padrão do Mercado Pago (taxa repassada ao comprador quando há juros).
 * Baseado na tabela oficial de juros do Mercado Pago para parcelamento em cartão de crédito.
 */
const MP_INTEREST_FACTORS: Record<number, number> = {
  1: 1.0,
  2: 1.0459,
  3: 1.0597,
  4: 1.0733,
  5: 1.0866,
  6: 1.0996,
  7: 1.1124,
  8: 1.1249,
  9: 1.1372,
  10: 1.1492,
  11: 1.1610,
  12: 1.1728,
};

export interface InstallmentOption {
  installments: number;
  installmentAmountCents: number;
  totalCents: number;
  hasInterest: boolean;
  label: string;
}

/**
 * Retorna o número máximo de parcelas sem juros de acordo com a política da loja:
 * - Até R$ 600,00: até 3x sem juros.
 * - Acima de R$ 600,00: até 6x sem juros.
 */
export function getMaxInterestFreeInstallments(totalCents: number): number {
  return totalCents > 60000 ? 6 : 3;
}

/**
 * Gera as 12 opções de parcelamento no cartão de crédito:
 * - 1x a 12x disponíveis.
 * - Até 3x sem juros (pedidos até R$ 600) ou até 6x sem juros (pedidos acima de R$ 600).
 * - Demais parcelas calculadas com transparência de valores e taxas.
 */
export function getInstallmentOptions(totalCents: number): InstallmentOption[] {
  if (!totalCents || totalCents <= 0) return [];

  const maxInterestFree = getMaxInterestFreeInstallments(totalCents);
  const options: InstallmentOption[] = [];

  for (let n = 1; n <= 12; n++) {
    const isInterestFree = n <= maxInterestFree;

    if (isInterestFree) {
      const installmentAmountCents = Math.round(totalCents / n);
      options.push({
        installments: n,
        installmentAmountCents,
        totalCents,
        hasInterest: false,
        label: `${n}x de ${formatBRL(installmentAmountCents)} sem juros`,
      });
    } else {
      const factor = MP_INTEREST_FACTORS[n] ?? 1.18;
      const totalWithInterest = Math.round(totalCents * factor);
      const installmentAmountCents = Math.round(totalWithInterest / n);
      options.push({
        installments: n,
        installmentAmountCents,
        totalCents: totalWithInterest,
        hasInterest: true,
        label: `${n}x de ${formatBRL(installmentAmountCents)} (total ${formatBRL(totalWithInterest)})`,
      });
    }
  }

  return options;
}

/**
 * Texto de destaque para vitrines, PDPs e cards de produtos.
 * Ex: "ou até 3x de R$ 99,00 sem juros" ou "ou até 6x de R$ 150,00 sem juros"
 */
export function getInstallmentTeaser(priceCents: number | null | undefined): string | null {
  if (!priceCents || priceCents <= 0) return null;

  const maxInterestFree = getMaxInterestFreeInstallments(priceCents);
  const installmentCents = Math.round(priceCents / maxInterestFree);

  return `ou até ${maxInterestFree}x de ${formatBRL(installmentCents)} sem juros`;
}
