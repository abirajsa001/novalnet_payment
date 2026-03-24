// ✅ Move this to TOP (important)
export type SupportedLocale = "en" | "de";

/**
 * NOTE:
 * Keep PaymentMethod as string to avoid strict publish failures.
 * If you already have a strict type elsewhere, you can reuse it.
 */
export type PaymentMethod = string;

/**
 * Represents the payment enabler.
 */
export interface PaymentEnabler {
  createComponentBuilder: (
    type: string
  ) => Promise<PaymentComponentBuilder | never>;

  createDropinBuilder: (
    type: DropinType
  ) => Promise<PaymentDropinBuilder | never>;
}

/**
 * Payment Component
 */
export interface PaymentComponent {
  mount(selector: string): void;
  submit(): void;
  showValidation?(): void;
  isValid?(): boolean;

  getState?(): {
    card?: {
      endDigits?: string;
      brand?: string;
      expiryDate?: string;
    };
  };

  isAvailable?(): Promise<boolean>;
}

/**
 * Component Builder
 */
export interface PaymentComponentBuilder {
  componentHasSubmit?: boolean;
  build(config: ComponentOptions): PaymentComponent;
}

/**
 * Enabler Options
 */
export type EnablerOptions = {
  processorUrl: string;
  sessionId: string;
  locale?: SupportedLocale;

  onActionRequired?: () => Promise<void>;
  onComplete?: (result: PaymentResult) => void;

  onError?: (
    error: any,
    context?: { paymentReference?: string }
  ) => void;
};

/**
 * ✅ SAFE: Use Partial<Record<...>> to avoid strict mismatch failures
 */
export const PaymentMethodLabels: Record<
  SupportedLocale,
  Partial<Record<PaymentMethod, string>>
> = {
  en: {
    applepay: "Apple Pay",
    bancontactcard: "Bancontact Card",
    eps: "EPS",
    googlepay: "Google Pay",
    ideal: "iDEAL",
    invoice: "Invoice",
    klarna_pay_later: "Klarna Pay Later",
    klarna_pay_now: "Klarna Pay Now",
    klarna_pay_overtime: "Klarna Pay Over Time",
    paypal: "PayPal",
    prepayment: "Prepayment",
    GuaranteedInvoice: "Guaranteed Invoice",
    GuaranteedSepa: "Guaranteed SEPA Direct Debit",
    twint: "TWINT",
    sepa: "Direct Debit SEPA",
    ach: "ACH Direct Debit",
    creditcard: "Credit Card",
    onlinebanktransfer: "Online Bank Transfer",
    alipay: "Alipay",
    bancontact: "Bancontact",
    blik: "BLIK",
    mbway: "MB Way",
    multibanco: "Multibanco",
    payconiq: "Payconiq",
    postfinance: "PostFinance",
    postfinancecard: "PostFinance Card",
    przelewy24: "Przelewy24",
    trustly: "Trustly",
    wechatpay: "WeChat Pay"
  },

  de: {
    applepay: "Apple Pay",
    bancontactcard: "Bancontact Karte",
    eps: "EPS Überweisung",
    googlepay: "Google Pay",
    ideal: "iDEAL",
    invoice: "Rechnung",
    klarna_pay_later: "Klarna Rechnung",
    klarna_pay_now: "Klarna Sofort bezahlen",
    klarna_pay_overtime: "Klarna Ratenkauf",
    paypal: "PayPal",
    prepayment: "Vorkasse",
    GuaranteedInvoice: "Garantierte Rechnung",
    GuaranteedSepa: "Garantierte SEPA-Lastschrift",
    twint: "TWINT",
    sepa: "SEPA-Lastschrift",
    ach: "ACH-Lastschrift",
    creditcard: "Kreditkarte",
    onlinebanktransfer: "Online-Überweisung",
    alipay: "Alipay",
    bancontact: "Bancontact",
    blik: "BLIK",
    mbway: "MB Way",
    multibanco: "Multibanco",
    payconiq: "Payconiq",
    postfinance: "PostFinance",
    postfinancecard: "PostFinance Karte",
    przelewy24: "Przelewy24",
    trustly: "Trustly",
    wechatpay: "WeChat Pay"
  }
};

/**
 * ✅ Safe label getter (no runtime crash)
 */
export function getPaymentMethodLabel(
  method: PaymentMethod,
  locale?: SupportedLocale
) {
  const safeLocale: SupportedLocale =
    locale === "de" ? "de" : "en";

  return (
    PaymentMethodLabels[safeLocale][method] ||
    method ||
    "Unknown"
  );
}

/**
 * Payment Result
 */
export type PaymentResult =
  | {
      isSuccess: true;
      paymentReference: string;
    }
  | {
      isSuccess: false;
      paymentReference?: string;
    };

/**
 * Component Options
 */
export type ComponentOptions = {
  showPayButton?: boolean;
  onPayButtonClick?: () => Promise<void>;
};

/**
 * Drop-in Types
 */
export enum DropinType {
  embedded = "embedded",
  hpp = "hpp",
}

/**
 * Drop-in Component
 */
export interface DropinComponent {
  submit(): void;
  mount(selector: string): void;
}

/**
 * Drop-in Options
 */
export type DropinOptions = {
  showPayButton?: boolean;
  onDropinReady?: () => Promise<void>;
  onPayButtonClick?: () => Promise<void>;
};

/**
 * Drop-in Builder
 */
export interface PaymentDropinBuilder {
  dropinHasSubmit: boolean;
  build(config: DropinOptions): DropinComponent;
}