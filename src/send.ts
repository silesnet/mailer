import { Arguments, createMailer, listMails, move, parseArguments, parseMail, RawMail } from './lib/send';
import { performance } from 'perf_hooks';

const args = parseArguments();

console.log(`\
Sending mails...
  input                  ${args.input}
  SMTP server            ${args.smtp}
  user                   ${args.user}
  password               ${args.password}
  pause                  ${args.pause} ms\n`);

interface Counter {
  sent: number;
  failed: number;
}

const send = async ({ input, smtp, user, password, pause }: Arguments): Promise<Counter> => {
  const mails = listMails(input);
  console.log(`...${mails.length} mails found.`);

  const counter: Counter = { sent: 0, failed: 0 };
  if (mails.length === 0) {
    return counter;
  }

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
      counter.failed++;
      continue;
    }

    // send and pause
    try {
      await mailer.send(mail);
      move(path, `${input}/sent/${file}`, `...mail '${file}' send.`);
      counter.sent++;
    } catch (error) {
      move(path, `${input}/failed/${file}`, `...failed sending mail '${file}': '${error.message}'.`);
      counter.failed++;
    } finally {
      await new Promise((resolve) => setTimeout(resolve, pause));
    }
  }

  return counter;
};

// main
const start = performance.now();
send(args).then(({ sent, failed }) => {
  console.log(`\nDelivered ${sent} of ${sent + failed} emails (failed: ${failed}).`);
  console.log(`Finished email delivery in ${Math.round(performance.now() - start) / 1000} seconds.`);
});
