export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

/** Valor em centavos só com dígitos → reais (ex.: "16000000" → 160000) */
export function parseCurrencyDigits(digits: string): number {
  const clean = digits.replace(/\D/g, "");
  if (!clean) return 0;
  return parseInt(clean, 10) / 100;
}

/** Exibe como 160.000,00 (armazene só dígitos/centavos no state) */
export function formatCurrencyDigits(digits: string): string {
  const clean = digits.replace(/\D/g, "");
  if (!clean) return "";
  return (parseInt(clean, 10) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function sanitizeCurrencyDigits(raw: string, maxDigits = 13): string {
  return raw.replace(/\D/g, "").slice(0, maxDigits);
}

/** Colar valor já formatado: 160.000,50 ou 160000,50 */
export function parsePastedCurrency(raw: string): string {
  const t = raw.trim();
  if (!t) return "";

  if (t.includes(",")) {
    const [intPart, decPart = ""] = t.split(",");
    const intDigits = intPart.replace(/\D/g, "");
    const decDigits = decPart.replace(/\D/g, "").padEnd(2, "0").slice(0, 2);
    return (intDigits + decDigits).slice(0, 13);
  }

  const onlyDigits = t.replace(/\D/g, "");
  if (t.includes(".") && onlyDigits.length > 0) {
    const parts = t.split(".");
    const last = parts[parts.length - 1] ?? "";
    if (last.length <= 2 && parts.length > 1) {
      const intDigits = parts.slice(0, -1).join("").replace(/\D/g, "");
      const decDigits = last.replace(/\D/g, "").padEnd(2, "0").slice(0, 2);
      return (intDigits + decDigits).slice(0, 13);
    }
  }

  return onlyDigits.slice(0, 13);
}

type CurrencyInputEvent = {
  key: string;
  preventDefault: () => void;
};

type CurrencyPasteEvent = {
  preventDefault: () => void;
  clipboardData: { getData: (type: string) => string };
};

/** Digitação estilo caixa: cada número entra pela direita (centavos). */
export function createCurrencyInputHandlers(
  digits: string,
  setDigits: (d: string) => void
): {
  onKeyDown: (e: CurrencyInputEvent) => void;
  onPaste: (e: CurrencyPasteEvent) => void;
} {
  return {
    onKeyDown(e) {
      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        const next = ((digits || "") + e.key).replace(/^0+/, "") || e.key;
        setDigits(next.slice(0, 13));
      } else if (e.key === "Backspace") {
        e.preventDefault();
        setDigits(digits.slice(0, -1));
      } else if (e.key === "Delete") {
        e.preventDefault();
        setDigits("");
      }
    },
    onPaste(e) {
      e.preventDefault();
      const text = e.clipboardData.getData("text");
      setDigits(parsePastedCurrency(text));
    },
  };
}

export function reaisToCurrencyDigits(reais: number): string {
  return Math.max(0, Math.round(reais * 100)).toString();
}

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatCompactCurrency(value: number): string {
  if (Math.abs(value) < 1000) return formatCurrency(value);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString("pt-BR");
}
