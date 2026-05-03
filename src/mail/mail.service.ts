import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get<string>('SMTP_HOST'),
      port: config.get<number>('SMTP_PORT'),
      auth: {
        user: config.get<string>('SMTP_USER'),
        pass: config.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendPasswordReset(email: string, name: string, token: string): Promise<void> {
    const resetUrl = `${this.config.get('FRONTEND_URL')}/reset-password?token=${token}`;
    const template = fs.readFileSync(
      path.join(__dirname, 'templates', 'reset-password.html'),
      'utf8',
    );
    const html = template
      .replace('{{name}}', name)
      .replace('{{resetUrl}}', resetUrl);

    await this.transporter.sendMail({
      from: this.config.get<string>('SMTP_FROM'),
      to: email,
      subject: 'Redefinição de senha — Kora Events',
      html,
    });
  }
}
