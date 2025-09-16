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

export class IdealBuilder implements PaymentComponentBuilder {
  public componentHasSubmit = true;
  constructor(private baseOptions: BaseOptions) {}

  build(config: ComponentOptions): PaymentComponent {
    return new Ideal(this.baseOptions, config);
  }
}

export class Ideal extends BaseComponent {
  private showPayButton: boolean;

  constructor(baseOptions: BaseOptions, componentOptions: ComponentOptions) {
    super(PaymentMethod.ideal, baseOptions, componentOptions);
    this.showPayButton = componentOptions?.showPayButton ?? false;
  }

  mount(selector: string) {
    document
      .querySelector(selector)
      ?.insertAdjacentHTML("afterbegin", this._getTemplate());

    //  Handle Novalnet redirect return immediately on page load
    // this._handleReturnFromRedirect();

    if (this.showPayButton) {
      document
        .querySelector("#purchaseOrderForm-paymentButton")
        ?.addEventListener("click", (e) => {
          e.preventDefault();
          this.submit();
        });
    }
  }

  /**
   * Called when the user clicks Pay (first step).
   * This requests a redirect URL from your backend/processor.
   */
  async submit() {
    this.sdk.init({ environment: this.environment });
    console.log("submit-triggered");

    try {
      // Prepare the payload
      const requestData: PaymentRequestSchemaDTO = {
        paymentMethod: {
          type: this.paymentMethod,
          // returnUrl is where Novalnet will send the shopper back
          returnUrl: window.location.href,
        },
        paymentOutcome: PaymentOutcome.AUTHORIZED,
      };

      // Ask your processor to create the Novalnet redirect session
      const response = await fetch(this.processorUrl + "/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": this.sessionId,
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();
      console.log("redirect-session-response", data);

      // Redirect the shopper to Novalnet's page
      if (data.paymentReference) {
        window.location.href = data.paymentReference;
      } else {
        this.onError?.("Could not start redirect payment.");
      }
    } catch (e) {
      console.error("submit-error", e);
      this.onError?.("Some error occurred. Please try again.");
    }
  }

  /**
   * Runs automatically when the page is re-loaded after Novalnet redirects back.
   * Reads query params and sends them to your backend for final verification.
   */
  // private async _handleReturnFromRedirect() {
  //   if (typeof window === "undefined") return;
    
  //   const params = new URLSearchParams(window.location.search);

  //   // Check for the Novalnet return parameters
  //   if (params.has("tid") && params.has("checksum")) {
  //     const tid        = params.get("tid");
  //     const checksum   = params.get("checksum");
  //     const status     = params.get("status");
  //     const paymentId  = params.get("step");  // or decode as needed
  //     const txnSecret  = params.get("txn_secret");

  //     console.log("Novalnet redirect detected", { tid, checksum, status, paymentId, txnSecret });

  //     try {
  //       const verifyResponse = await fetch(this.processorUrl + "/novalnet/callback", {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json",
  //           "X-Session-Id": this.sessionId,
  //         },
  //         body: JSON.stringify({
  //           tid,
  //           checksum,
  //           status,
  //           paymentId,
  //           txnSecret
  //         }),
  //       });

  //       const result = await verifyResponse.json();
  //       console.log("verification-result", result);

  //       if (result.success) {
  //         this.onComplete?.({
  //           isSuccess: true,
  //           paymentReference: result.paymentReference ?? tid,
  //         });
  //       } else {
  //         this.onError?.("Payment verification failed.");
  //       }
  //     } catch (err) {
  //       console.error("verification-error", err);
  //       this.onError?.("Error verifying payment with backend.");
  //     }
  //   }
  // }

  private _getTemplate() {
    return this.showPayButton
      ? `
      <div class="${styles.wrapper}">
        <p>Pay easily with iDEAL and transfer the shopping amount within the specified date.</p>
        <button class="${buttonStyles.button} ${buttonStyles.fullWidth} ${styles.submitButton}" id="purchaseOrderForm-paymentButton">Pay</button>
      </div>
    `
      : "";
  }
}
