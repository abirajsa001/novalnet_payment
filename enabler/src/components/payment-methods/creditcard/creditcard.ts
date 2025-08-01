import {
  ComponentOptions,
  PaymentComponent,
  PaymentComponentBuilder,
  PaymentMethod
} from '../../../payment-enabler/payment-enabler';
import { BaseComponent } from "../../base";
import styles from '../../../style/style.module.scss';
import buttonStyles from "../../../style/button.module.scss";
import {
  PaymentOutcome,
  PaymentRequestSchemaDTO,
} from "../../../dtos/mock-payment.dto";
import { BaseOptions } from "../../../payment-enabler/payment-enabler-mock";

export class CreditcardBuilder implements PaymentComponentBuilder {
  public componentHasSubmit = true;
  constructor(private baseOptions: BaseOptions) {}

  build(config: ComponentOptions): PaymentComponent {
    return new Creditcard(this.baseOptions, config);
  }
}

export class Creditcard extends BaseComponent {
  private showPayButton: boolean;

  constructor(baseOptions: BaseOptions, componentOptions: ComponentOptions) {
    super(PaymentMethod.creditcard, baseOptions, componentOptions);
    this.showPayButton = componentOptions?.showPayButton ?? false;
  }

  mount(selector: string) {
    const root = document.querySelector(selector);
    if (!root) {
      console.error("Mount selector not found:", selector);
      return;
    }

    root.insertAdjacentHTML("afterbegin", this._getTemplate());

    const payButton = document.querySelector("#purchaseOrderForm-paymentButton") as HTMLButtonElement | null;
    if (this.showPayButton && payButton) {
      payButton.disabled = true;
      payButton.addEventListener("click", async (e) => {
        e.preventDefault();
        await (window as any).NovalnetUtility?.getPanHash();
        this.submit();
      });
    }

    const form = document.getElementById('purchaseOrderForm');
    if (form) {
      form.onsubmit = async (e) => {
        const panhashInput = document.getElementById('pan_hash') as HTMLInputElement;
        if (panhashInput && panhashInput.value === '') {
          e.preventDefault();
          e.stopImmediatePropagation();
          await (window as any).NovalnetUtility?.getPanHash();
        }
      };
    }

    this._loadNovalnetScriptOnce()
      .then(() => this._initNovalnetCreditCardForm(payButton))
      .catch((err) => console.error("Failed to load Novalnet SDK:", err));
  }

  async submit() {
    this.sdk.init({ environment: this.environment });

    try {
      const panhashInput = document.getElementById('pan_hash') as HTMLInputElement;
      const uniqueIdInput = document.getElementById('unique_id') as HTMLInputElement;

      const panhash = panhashInput?.value.trim();
      const uniqueId = uniqueIdInput?.value.trim();

      console.log('PAN HASH:', panhash);
      console.log('UNIQUE ID:', uniqueId);

      const requestData: PaymentRequestSchemaDTO = {
        paymentMethod: {
          type: "CREDITCARD",
        },
        paymentOutcome: PaymentOutcome.AUTHORIZED,
      };

      const response = await fetch(this.processorUrl + "/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": this.sessionId,
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();
      if (data.paymentReference) {
        this.onComplete &&
          this.onComplete({
            isSuccess: true,
            paymentReference: data.paymentReference,
          });
      } else {
        this.onError("Some error occurred. Please try again.");
      }

    } catch (e) {
      console.error(e);
      this.onError("Some error occurred. Please try again.");
    }
  }

  private _getTemplate() {
    const payButton = this.showPayButton
      ? `<button class="${buttonStyles.button} ${buttonStyles.fullWidth} ${styles.submitButton}" id="purchaseOrderForm-paymentButton">Pay</button>`
      : "";

    return `
      <div class="${styles.wrapper}">
        <form class="${styles.paymentForm}" id="purchaseOrderForm">
          <iframe id="novalnet_iframe" frameborder="0" scrolling="no"></iframe>
          <input type="hidden" id="pan_hash" name="pan_hash"/>
          <input type="hidden" id="unique_id" name="unique_id"/>
          <input type="hidden" id="do_redirect" name="do_redirect"/>
          ${payButton}
        </form>
      </div>
    `;
  }

  private async _loadNovalnetScriptOnce(): Promise<void> {
    if ((window as any).NovalnetUtility) return;

    const src = "https://cdn.novalnet.de/js/v2/NovalnetUtility-1.1.2.js";
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
      if ((existing as any)._nnLoadingPromise) {
        await (existing as any)._nnLoadingPromise;
        return;
      }
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.crossOrigin = "anonymous";

    const loadPromise = new Promise<
