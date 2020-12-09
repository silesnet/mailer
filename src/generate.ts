import {
  parseArguments,
  createEmptyFolder,
  createTemplate,
  createCsvDataStream,
  normalizeText,
  saveFile,
} from './lib/generate';
import { performance } from 'perf_hooks';

const args = parseArguments(process.argv.slice(2));

if (!args.template || !args.data) {
  console.log(`\
    mail-gen: generate email content files based on CSV data and Handlebars email template

    Usage
      $ mail-gen --data|-d <CSV-FILE> --template|-t <HANDLEBARS-TEMPLATE-FILE> [--output|-o <MAIL-FOLDER> [--clear-output|-c]
  `);
  process.exit(1);
}

console.log(`\
Generate mail...
  Handlebars template    ${args.template}
  CSV data               ${args.data}
  output folder          ${args.output}
  clear output           ${args.clearOutput}\n`);

console.log('configuring...');
const template = createTemplate(args.template);
console.log('... template compiled.');

const customers = createCsvDataStream(args.data);
console.log('... data stream opened.');

const output = createEmptyFolder(args.output, { clear: args.clearOutput });
console.log('... output folder created.');

console.log('generating...');
let emailsCount = 0;
const start = performance.now();
customers
  .on('data', (customer: { id: string; name: string; email: string; agreement: string }) => {
    const file = customer.id + '_' + normalizeText(customer.name) + '.eml';
    const email = template(customer);
    saveFile(`${output}/${file}`, email);
    console.log(`... mail generated to '${file}'.`);
    emailsCount++;
  })
  .on('end', () =>
    console.log(
      `\nFinished generating of ${emailsCount} mails in ${Math.round(performance.now() - start) / 1000} seconds.`
    )
  );
