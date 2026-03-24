/**
 * Supported locales
 */
export type SupportedLocale = 'en' | 'de';

/**
 * Keep PaymentMethod flexible to avoid strict build failures
 */
export type PaymentMethod = string;

/**
 * Payment Enabler
 */
export interface PaymentEnabler {
  createComponentBuilder: (
    type: string
  ) => Promise<PaymentComponentBuilder>;

  createDropinBuilder: (
    type: DropinType
  ) => Promise<PaymentDropinBuilder>;
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
    error: unknown,
    context?: { paymentReference?: string }
  ) => void;
};

/**
 * Payment Method Labels
 * ⚠️ No Record<> (important for commercetools)
 */
export const PaymentMethodLabels = {
  en: {
    applepay: 'Apple Pay',
    bancontactcard: 'Bancontact Card',
    eps: 'EPS',
    googlepay: 'Google Pay',
    ideal: 'iDEAL',
    invoice: 'Invoice',
    klarna_pay_later: 'Klarna Pay Later',
    klarna_pay_now: 'Klarna Pay Now',
    klarna_pay_overtime: 'Klarna Pay Over Time',
    paypal: 'PayPal',
    prepayment: 'Prepayment',
    GuaranteedInvoice: 'Guaranteed Invoice',
    GuaranteedSepa: 'Guaranteed SEPA Direct Debit',
    twint: 'TWINT',
    sepa: 'Direct Debit SEPA',
    ach: 'ACH Direct Debit',
    creditcard: 'Credit Card',
    onlinebanktransfer: 'Online Bank Transfer',
    alipay: 'Alipay',
    bancontact: 'Bancontact',
    blik: 'BLIK',
    mbway: 'MB Way',
    multibanco: 'Multibanco',
    payconiq: 'Payconiq',
    postfinance: 'PostFinance',
    postfinancecard: 'PostFinance Card',
    przelewy24: 'Przelewy24',
    trustly: 'Trustly',
    wechatpay: 'WeChat Pay'
  },

  de: {
    applepay: 'Apple Pay',
    bancontactcard: 'Bancontact Karte',
    eps: 'EPS Überweisung',
    googlepay: 'Google Pay',
    ideal: 'iDEAL',
    invoice: 'Rechnung',
    klarna_pay_later: 'Klarna Rechnung',
    klarna_pay_now: 'Klarna Sofort bezahlen',
    klarna_pay_overtime: 'Klarna Ratenkauf',
    paypal: 'PayPal',
    prepayment: 'Vorkasse',
    GuaranteedInvoice: 'Garantierte Rechnung',
    GuaranteedSepa: 'Garantierte SEPA-Lastschrift',
    twint: 'TWINT',
    sepa: 'SEPA-Lastschrift',
    ach: 'ACH-Lastschrift',
    creditcard: 'Kreditkarte',
    onlinebanktransfer: 'Online-Überweisung',
    alipay: 'Alipay',
    bancontact: 'Bancontact',
    blik: 'BLIK',
    mbway: 'MB Way',
    multibanco: 'Multibanco',
    payconiq: 'Payconiq',
    postfinance: 'PostFinance',
    postfinancecard: 'PostFinance Karte',
    przelewy24: 'Przelewy24',
    trustly: 'Trustly',
    wechatpay: 'WeChat Pay'
  }
} as const;

/**
 * Safe label getter
 */
export function getPaymentMethodLabel(
  method: string,
  locale?: SupportedLocale
): string {
  const safeLocale = locale === 'de' ? 'de' : 'en';

  const labels = PaymentMethodLabels[safeLocale] as Record<string, string>;

  return labels[method] || method || 'Unknown';
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
 * DropinType (⚠️ avoid enum for commercetools)
 */
export const DropinType = {
  embedded: 'embedded',
  hpp: 'hpp'
} as const;

export type DropinType =
  (typeof DropinType)[keyof typeof DropinType];

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