import parseArgs from 'minimist';
import { simpleParser } from 'mailparser';
import fs from 'fs';
import nodemailer from 'nodemailer';
import { errorExit } from './shared';

export interface Arguments {
  input: string;
  host: string;
  port: number;
  user: string;
  password: string;
  pause: number;
  testRecipient: string;
}

export interface RawMail {
  from: string;
  to: string;
  raw: any;
}

export interface MailerConfig {
  host: string;
  port: number;
  user: string;
  password: string;
}

export interface Mailer {
  send(mail: RawMail): Promise<any>;
}

export const parseArguments = (argv: string[]): Arguments => {
  const args = parseArgs(argv, {
    alias: { input: 'i', host: 'h', port: 't', user: 'u', password: 'p', pause: 's' },
    default: { port: 25, host: 'localhost' },
  });

  return {
    input: args.input,
    host: args.host,
    port: args.port,
    user: args.user,
    password: args.password,
    pause: args.pause,
    testRecipient: args['test-recipient'],
  };
};

export const createMailer = async ({ host, port, user, password: pass }: MailerConfig): Promise<Mailer> => {
  const transport = nodemailer.createTransport({
    host,
    port,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
  try {
    await transport.verify();
  } catch (error) {
    errorExit(`failed creating mailer: '${error.message}`);
  }
  return {
    send: (mail) => {
      // TODO override raw mail to: with to in case those differ (--test-recipient)
      // should perhaps also remove Cc and Bcc!
      return transport.sendMail({
        envelope: { from: mail.from, to: mail.to },
        raw: mail.raw,
      });
    },
  };
};

export const parseMail = async (path: string): Promise<RawMail> => {
  const raw = fs.readFileSync(path, 'utf-8');
  const mail = await simpleParser(raw);
  return { from: mail.from!.text, to: mail.to!.text, raw: raw };
};
