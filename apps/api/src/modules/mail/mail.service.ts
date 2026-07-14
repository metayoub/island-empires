import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendEmailVerification(email: string, token: string): Promise<void> {
    const appBaseUrl = this.configService.get<string>('app.url', 'http://localhost:5173');
    const link = `${appBaseUrl}/verify-email?token=${encodeURIComponent(token)}`;
    await this.send({
      to: email,
      subject: 'Verify your Island Empires account',
      text: `Welcome to Island Empires.\n\nClick the link below to verify your email address.\n\n${link}`,
    });
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    const appBaseUrl = this.configService.get<string>('app.url', 'http://localhost:5173');
    const link = `${appBaseUrl}/reset-password?token=${encodeURIComponent(token)}`;
    await this.send({
      to: email,
      subject: 'Reset your Island Empires password',
      text: [
        'We received a request to reset your password.',
        'Click the link below to choose a new password.',
        'If you did not request this, you can ignore this email.',
        '',
        link,
      ].join('\n'),
    });
  }

  async sendPremiumPurchaseReceipt(
    email: string,
    purchase: {
      itemName: string;
      premiumCurrencyAmount: number;
      premiumCurrencyCost: number;
      moneyAmountCents: number;
      currencyCode: string;
      purchaseId: string;
    },
  ): Promise<void> {
    const paidAmount =
      purchase.moneyAmountCents > 0
        ? `${(purchase.moneyAmountCents / 100).toFixed(2)} ${purchase.currencyCode}`
        : `${purchase.premiumCurrencyCost.toLocaleString()} Gems`;
    const granted =
      purchase.premiumCurrencyAmount > 0
        ? `\nGems added: ${purchase.premiumCurrencyAmount.toLocaleString()}`
        : '';
    await this.send({
      to: email,
      subject: `Receipt for ${purchase.itemName}`,
      text: [
        'Thank you for your Island Empires purchase.',
        '',
        `Item: ${purchase.itemName}`,
        `Paid: ${paidAmount}${granted}`,
        `Receipt ID: ${purchase.purchaseId}`,
        '',
        'Premium purchases are limited to convenience and cosmetics.',
      ].join('\n'),
    });
  }

  async sendSupporterReceipt(
    email: string,
    donation: {
      donationId: string;
      supporterPackName: string;
      amountCents: number;
      currency: string;
    },
  ): Promise<void> {
    await this.send({
      to: email,
      subject: 'Your Island Empires support receipt',
      text: [
        'Thank you for supporting Island Empires.',
        '',
        `Contribution: ${(donation.amountCents / 100).toFixed(2)} ${donation.currency}`,
        `Support pack: ${donation.supporterPackName}`,
        `Donation ID: ${donation.donationId}`,
        '',
        'Your supporter items have been added to your inventory.',
        '',
        'Island Empires remains free to play, and your contribution helps fund hosting and future development.',
      ].join('\n'),
    });
  }

  private async send(input: { to: string; subject: string; text: string }): Promise<void> {
    const from = this.configService.get<string>(
      'mail.from',
      'Island Empires <no-reply@islandempires.local>',
    );
    this.logger.log(
      `Email queued from ${from} to ${input.to}: ${input.subject}\n${input.text}`,
    );
  }
}
