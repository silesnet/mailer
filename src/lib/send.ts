import parseArgs from 'minimist';
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
  raw: string;
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
    send: async (mail) => {
      return transport.sendMail({ ...mail });
    },
  };
};

const headerEntry = (line: string): { key: string; value: string } => {
  const pair = line.split(':');
  return { key: pair[0]?.toLowerCase(), value: pair[1]?.trim() };
};

export const parseMail = (path: string, onlyRecipient?: string): RawMail => {
  let to = '';
  let from = '';
  let header = true;
  let dropping = false;
  const raw = fs
    .readFileSync(path, 'utf-8')
    .split(/\r?\n|\r/)
    .map((line) => {
      // end of header?
      if (header && line === '') {
        header = false;
        return line;
      }

      // body line?
      if (!header) {
        // FIXME
        return line;
      }

      // header line

      // folded header value that should be dropped?
      if (dropping && line.match(/^\s+/)) {
        return undefined;
      } else {
        dropping = false;
      }

      const entry = headerEntry(line);

      // override recipient if needed
      if (entry.key === 'to') {
        if (onlyRecipient) {
          to = onlyRecipient;
          dropping = true;
          return 'To: ' + onlyRecipient;
        }
        to = entry.value;
        return line;
      }

      // drop cc and bcc when overriding recipient
      if (onlyRecipient && (entry.key === 'cc' || entry.key === 'bcc')) {
        dropping = true;
        return undefined;
      }

      // store from
      if (entry.key === 'from') {
        from = entry.value;
      }

      // unfiltered refular header line, no change
      return line;
    })
    .filter((line) => line !== undefined)
    .join('\n');
  return { from, to, raw };
};
