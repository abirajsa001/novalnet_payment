import {
  ComponentOptions,
  PaymentComponent,
  PaymentComponentBuilder,
  PaymentMethod,
} from '../../../payment-enabler/payment-enabler';
import { BaseComponent } from '../../base';
import styles from '../../../style/style.module.scss';
import buttonStyles from '../../../style/button.module.scss';
import {
  PaymentOutcome,
  PaymentRequestSchemaDTO,
} from '../../../dtos/mock-payment.dto';
import { BaseOptions } from '../../../payment-enabler/payment-enabler-mock';

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

  async mount(selector: string) {
    const root = document.querySelector(selector);
    if (!root) {
      console.error('Mount selector not found:', selector);
      return;
    }

    root.insertAdjacentHTML('afterbegin', this._getTemplate());

    const payButton = document.querySelector(
      '#purchaseOrderForm-paymentButton'
    ) as HTMLButtonElement | null;
    if (this.showPayButton && payButton) {
      payButton.disabled = true;
      payButton.addEventListener('click', async (e) => {
        e.preventDefault();
        const success = await this._triggerPanHash();
        if (success) {
          this.submit();
        }
      });
    }

    const form = document.getElementById('purchaseOrderForm');
    if (form) {
      form.onsubmit = async (e) => {
        const panHash = (document.getElementById('pan_hash') as HTMLInputElement)?.value;
        if (!panHash) {
          e.preventDefault();
          e.stopImmediatePropagation();
          const success = await this._triggerPanHash();
          if (success) {
            form.submit(); // resubmit if hash now present
          }
        }
      };
    }

    await this._loadNovalnetScriptOnce();
    this._initNovalnetCreditCardForm(payButton);
  }

  private async _triggerPanHash(): Promise<boolean> {
    return new Promise((resolve) => {
      const NovalnetUtility = (window as any).NovalnetUtility;
      if (!NovalnetUtility) {
        console.error('NovalnetUtility not loaded');
        resolve(false);
      }

      NovalnetUtility.getPanHash();
      const checkInterval = setInterval(() => {
        const panhash = (document.getElementById('pan_hash') as HTMLInputElement)?.value;
        if (panhash) {
          clearInterval(checkInterval);
          resolve(true);
        }
      }, 200);

      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(false);
      }, 5000);
    });
  }

  async submit() {
    this.sdk.init({ environment: this.environment });

    try {
      const panhash = (document.getElementById('pan_hash') as HTMLInputElement)?.value;
      const uniqueId = (document.getElementById('unique_id') as HTMLInputElement)?.value;

      if (!panhash || !uniqueId) {
        throw new Error('Missing panhash or unique_id');
      }

      console.log('PAN HASH:', panhash);
      console.log('UNIQUE ID:', uniqueId);

      const requestData: PaymentRequestSchemaDTO = {
        paymentMethod: {
          type: 'CREDITCARD',
        },
        paymentOutcome: PaymentOutcome.AUTHORIZED,
      };

      const response = await fetch(this.processorUrl + '/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': this.sessionId,
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
        this.onError('Some error occurred. Please try again.');
      }
    } catch (error) {
      console.error('Submit error:', error);
      this.onError('Error submitting payment. Check console.');
    }
  }

  private _getTemplate(): string {
    const payButtonHTML = this.showPayButton
      ? `<button class="${buttonStyles.button} ${buttonStyles.fullWidth} ${styles.submitButton}" id="purchaseOrderForm-paymentButton">Pay</button>`
      : '';

    return `
      <div class="${styles.wrapper}">
        <form class="${styles.paymentForm}" id="purchaseOrderForm">
          <iframe id="novalnet_iframe" frameborder="0" scrolling="no"></iframe>
          <input type="hidden" id="pan_hash" name="pan_hash"/>
          <input type="hidden" id="unique_id" name="unique_id"/>
          <input type="hidden" id="do_redirect" name="do_redirect"/>
          ${payButtonHTML}
        </form>
      </div>
    `;
  }

  private async _loadNovalnetScriptOnce(): Promise<void> {
    if ((window as any).NovalnetUtility) return;

    const scriptSrc = 'https://cdn.novalnet.de/js/v2/NovalnetUtility-1.1.2.js';
    if (document.querySelector(`script[src="${scriptSrc}"]`)) return;

    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = scriptSrc;
      script.crossOrigin = 'anonymous';
      script.onload = () => resolve();
      script.onerror = (e) => reject(e);
      document.head.appendChild(script);
    });
  }

  private _initNovalnetCreditCardForm(payButton: HTMLButtonElement | null): void {
    const NovalnetUtility = (window as any).NovalnetUtility;
    if (!NovalnetUtility) return;

    NovalnetUtility.setClientKey('88fcbbceb1948c8ae106c3fe2ccffc12');

    const config = {
      callback: {
        on_success: (data: any) => {
          (document.getElementById('pan_hash') as HTMLInputElement).value = data['hash'];
          (document.getElementById('unique_id') as HTMLInputElement).value = data['unique_id'];
          (document.getElementById('do_redirect') as HTMLInputElement).value = data['do_redirect'];
          if (payButton) payButton.disabled = false;
          return true;
        },
        on_error: (data: any) => {
          alert(data?.error_message ?? 'Unknown error');
          if (payButton) payButton.disabled = true;
          return false;
        },
        on_show_overlay: () => {
          document.getElementById('novalnet_iframe')?.classList.add('overlay');
        },
        on_hide_overlay: () => {
          document.getElementById('novalnet_iframe')?.classList.remove('overlay');
        },
      },
      iframe: {
        id: 'novalnet_iframe',
        inline: 1,
        style: { container: '', input: '', label: '' },
        text: {
          lang: 'EN',
          error: 'Your credit card details are invalid',
          card_holder: { label: 'Card holder name', place_holder: 'Name on card', error: 'Please enter the valid card holder name' },
          card_number: { label: 'Card number', place_holder: 'XXXX XXXX XXXX XXXX', error: 'Please enter the valid card number' },
          expiry_date: { label: 'Expiry date', error: 'Please enter the valid expiry month / year' },
          cvc: { label: 'CVC/CVV/CID', place_holder: 'XXX', error: 'Please enter the valid CVC/CVV/CID' },
        },
      },
      customer: {
        first_name: 'Max',
        last_name: 'Mustermann',
        email: 'test@novalnet.de',
        billing: {
          street: 'Musterstr, 2',
          city: 'Musterhausen',
          zip: '12345',
          country_code: 'DE',
        },
        shipping: {
          same_as_billing: 1,
        },
      },
      transaction: {
        amount: 123,
        currency: 'EUR',
        test_mode: 1,
      },
      custom: { lang: 'EN' },
    };

    NovalnetUtility.createCreditCardForm(config);
  }
}
