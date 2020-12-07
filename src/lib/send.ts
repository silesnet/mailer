import parseArgs from 'minimist';
import { simpleParser } from 'mailparser';
import { errorExit } from './shared';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

export interface Arguments {
  input: string;
  smtp: string;
  user: string;
  password: string;
  pause: number;
}

export interface RawMail {
  from: string;
  to: string;
  raw: any;
}

export interface Mailer {
  send(mail: RawMail): Promise<any>;
}

export const parseArguments = (): Arguments => {
  const args = parseArgs(process.argv.slice(2), {
    alias: { input: 'i', smtp: 's', user: 'u', password: 'p' },
    default: { input: 'generated-emails', pause: 0 },
  });

  if (!args.input || !args.smtp) {
    console.log(`\
      send: send emails form input via SMTP

      Usage
        $ send --input generated-emails --smtp smtp.email.server --user test --password password --pause pause-in-millis
    `);
    process.exit(1);
  }
  return {
    input: args.input,
    smtp: args.smtp,
    user: args.user,
    password: args.password,
    pause: args.pause,
  };
};

export const createMailer = (host: string, user: string, pass: string): Mailer => {
  const transport = nodemailer.createTransport({ host, auth: { user, pass } });
  return {
    send: (mail) =>
      transport.sendMail({
        envelope: { from: mail.from, to: mail.to },
        raw: mail.raw,
      }),
  };
};

export const parseMail = async (path: string): Promise<RawMail> => {
  const raw = fs.readFileSync(path, 'utf-8');
  const mail = await simpleParser(raw);
  return { from: mail.from!.text, to: mail.to!.text, raw: raw };
};

const createFolderIfNotExist = (folder: string): void => {
  if (fs.existsSync(folder)) {
    return;
  }
  try {
    fs.mkdirSync(folder, { recursive: true });
  } catch (error) {
    errorExit(`failed to create folder '${folder}': '${error.message}'`);
  }
};

export const move = (source: string, target: string, message: string): void => {
  try {
    createFolderIfNotExist(path.dirname(target));
    fs.renameSync(source, target);
    console.log(message);
  } catch (error) {
    errorExit(`failed to move '${source}' to '${target}': '${error.message}'`);
  }
};
