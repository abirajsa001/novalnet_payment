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

    const form = document.getElementById('purchaseOrderForm') as HTMLFormElement;
    const payButton = document.getElementById("purchaseOrderForm-paymentButton") as HTMLButtonElement;

    this._loadNovalnetScriptOnce()
      .then(() => this._initNovalnetCreditCardForm(payButton))
      .catch((err) => console.error("Failed to load Novalnet SDK:", err));

    if (form) {
      form.onsubmit = async (e) => {
        const panhashInput = document.getElementById('pan_hash') as HTMLInputElement;

        if (panhashInput && panhashInput.value === '') {
          e.preventDefault();
          e.stopImmediatePropagation();

          try {
            await (window as any).NovalnetUtility.getPanHash();
            if (panhashInput.value === '') {
              alert("PAN hash could not be generated.");
              return;
            }
            this.submit();
          } catch (err) {
            console.error("Error generating pan_hash:", err);
            alert("Failed to generate PAN hash. Please try again.");
          }
        } else {
          this.submit();
        }
      };
    }
  }

  async submit() {
    this.sdk.init({ environment: this.environment });

    try {
      const panhash = (document.getElementById("pan_hash") as HTMLInputElement)?.value;
      const uniqueId = (document.getElementById("unique_id") as HTMLInputElement)?.value;

      console.log("PAN HASH:", panhash);
      console.log("UNIQUE ID:", uniqueId);

      if (!panhash || !uniqueId) {
        this.onError("Required credit card values are missing.");
        return;
      }

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
        this.onComplete?.({
          isSuccess: true,
          paymentReference: data.paymentReference,
        });
      } else {
        this.onError("Payment failed or no reference returned.");
      }

    } catch (err) {
      console.error("Payment submission failed:", err);
      this.onError("An error occurred during submission.");
    }
  }

  private _getTemplate(): string {
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
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement;
    if (existing) return;

    const script = document.createElement("script");
    script.src = src;
    script.crossOrigin = "anonymous";

    const loadPromise = new Promise<void>((resolve, reject) => {
      script.onload = () => resolve();
      script.onerror = (e) => reject(e);
    });

    document.head.appendChild(script);
    await loadPromise;
  }

  private _initNovalnetCreditCardForm(payButton: HTMLButtonElement | null) {
    const NovalnetUtility = (window as any).NovalnetUtility;
    if (!NovalnetUtility) {
      console.error("NovalnetUtility is not loaded.");
      return;
    }

    NovalnetUtility.setClientKey("88fcbbceb1948c8ae106c3fe2ccffc12");

    NovalnetUtility.createCreditCardForm({
      callback: {
        on_success: (data: any) => {
          (document.getElementById("pan_hash") as HTMLInputElement).value = data.hash;
          (document.getElementById("unique_id") as HTMLInputElement).value = data.unique_id;
          (document.getElementById("do_redirect") as HTMLInputElement).value = data.do_redirect;
          if (payButton) payButton.disabled = false;
          return true;
        },
        on_error: (data: any) => {
          alert(data.error_message || "An error occurred.");
          if (payButton) payButton.disabled = true;
          return false;
        },
        on_show_overlay: () => {
          document.getElementById("novalnet_iframe")?.classList.add("overlay");
        },
        on_hide_overlay: () => {
          document.getElementById("novalnet_iframe")?.classList.remove("overlay");
        },
      },
      iframe: {
        id: "novalnet_iframe",
        inline: 1,
        style: { container: "", input: "", label: "" },
        text: {
          lang: "EN",
          error: "Your credit card details are invalid",
          card_holder: {
            label: "Card holder name",
            place_holder: "Name on card",
            error: "Please enter the valid card holder name",
          },
          card_number: {
            label: "Card number",
            place_holder: "XXXX XXXX XXXX XXXX",
            error: "Please enter the valid card number",
          },
          expiry_date: {
            label: "Expiry date",
            error: "Please enter the valid expiry month / year in the given format",
          },
          cvc: {
            label: "CVC/CVV/CID",
            place_holder: "XXX",
            error: "Please enter the valid CVC/CVV/CID",
          },
        },
      },
      customer: {
        first_name: "Max",
        last_name: "Mustermann",
        email: "test@novalnet.de",
        billing: {
          street: "Musterstr, 2",
          city: "Musterhausen",
          zip: "12345",
          country_code: "DE",
        },
        shipping: {
          same_as_billing: 1,
          first_name: "Max",
          last_name: "Mustermann",
          email: "test@novalnet.de",
          street: "Hauptstr, 9",
          city: "Kaiserslautern",
          zip: "66862",
          country_code: "DE",
        },
      },
      transaction: {
        amount: 123,
        currency: "EUR",
        test_mode: 1,
      },
      custom: {
        lang: "EN",
      },
    });
  }
}
