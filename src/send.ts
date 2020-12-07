import { Arguments, createMailer, move, parseArguments, parseMail, RawMail } from './lib/send';
import fs from 'fs';
import { performance } from 'perf_hooks';

const args = parseArguments();

console.log(`\
Sending mails...
  input                  ${args.input}
  SMTP server            ${args.smtp}
  user                   ${args.user}
  password               ${args.password}
  pause                  ${args.pause} ms\n`);

interface Delivery {
  sent: number;
  failed: number;
  duration: number;
}

const send = async ({ input, smtp, user, password, pause }: Arguments): Promise<Delivery> => {
  const mails = fs.readdirSync(input).filter((file) => fs.statSync(`${input}/${file}`).isFile());
  console.log(`...${mails.length} mails found.`);

  let sent = 0;
  let failed = 0;
  const start = performance.now();

  if (mails.length > 0) {
    const mailer = createMailer(smtp, user, password);
    console.log(`...mailer configured.`);

    console.log('sending mails...');
    for (const file of mails) {
      const path = `${input}/${file}`;
      let mail: RawMail | undefined = undefined;

      // parse
      try {
        mail = await parseMail(path);
      } catch (error) {
        move(path, `${input}/failed/${file}`, `...failed to parse mail '${file}': '${error.message}'.`);
        failed++;
        continue;
      }

      // send and pause
      try {
        await mailer.send(mail);
        move(path, `${input}/sent/${file}`, `...mail '${file}' send.`);
        sent++;
      } catch (error) {
        move(path, `${input}/failed/${file}`, `...failed sending mail '${file}': '${error.message}'.`);
        failed++;
      } finally {
        await new Promise((resolve) => setTimeout(resolve, pause));
      }
    }
  }

  return { sent, failed, duration: performance.now() - start };
};

// main
send(args).then(({ sent, failed, duration }) => {
  console.log(`Delivered ${sent} of ${sent + failed} emails (failed: ${failed}).`);
  console.log(`Finished email delivery in ${Math.round(duration) / 1000} seconds.`);
});
