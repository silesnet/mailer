import { Arguments, createMailer, parseArguments, parseMail, RawMail } from './lib/send';
import { Queue } from './lib/shared';
import { performance } from 'perf_hooks';

const args = parseArguments(process.argv.slice(2));

if (!args.input || !args.host || !Number.isFinite(args.pause)) {
  console.log(`\
    mail-send: send mails form raw mail files via SMTP

    Usage:
      node mail-send.js --input|-i <FOLDER> --pause|-s <PAUSE-IN-MILLIS> [--host|-h <SMTP>] [--port|-t <PORT>] [--user|-u <USER>] [--password|-p <PASSWORD>]
  `);
  process.exit(1);
}

console.log(`\
Send mail
  input                  ${args.input}
  SMTP host              ${args.host}
  port                   ${args.port}
  user                   ${args.user}
  password               ${args.password ? '***' : undefined}
  pause                  ${args.pause} ms\n`);

interface Counter {
  sent: number;
  failed: number;
}

const send = async ({ input, host, port, user, password, pause }: Arguments): Promise<Counter> => {
  console.log('configuring...');

  const queue = new Queue(input, { processed: 'sent', failed: 'failed' });
  console.log(`... ${queue.status.size} mails found.`);

  if (queue.empty) {
    return { sent: 0, failed: 0 };
  }

  const mailer = await createMailer({ host, port, user, password });
  console.log(`... mailer configured.`);

  console.log('sending...');
  for (const item of queue) {
    let mail: RawMail | undefined = undefined;

    // parse
    try {
      mail = await parseMail(item.path);
    } catch (error) {
      item.failed(() => console.log(`... failed parsing mail '${item.file}': '${error.message}'.`));
      continue;
    }

    // send and pause
    try {
      await mailer.send(mail);
      item.succeded(() => console.log(`... mail '${item.file}' send.`));
    } catch (error) {
      item.failed(() => console.log(`... failed sending mail '${item.file}': '${error.message}'.`));
    } finally {
      await new Promise((resolve) => setTimeout(resolve, pause));
    }
  }

  return { sent: queue.status.processed, failed: queue.status.failed };
};

// main
const start = performance.now();
send(args).then(({ sent, failed }) => {
  console.log(`\nSent ${sent} of ${sent + failed} mails (${failed} failed).`);
  console.log(`Finished mail sending in ${Math.round(performance.now() - start) / 1000} seconds.`);
});
