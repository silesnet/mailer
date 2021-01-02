import {
  parseArguments,
  createEmptyFolder,
  createTemplate,
  createCsvDataStream,
  saveFile,
  leftPad,
} from './lib/generate';
import { performance } from 'perf_hooks';
import { errorExit } from './lib/shared';

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
  .on('data', (data: {}) => {
    const file = leftPad(emailsCount.toString(), '0', 10) + '.eml';
    const email = (() => {
      try {
        return template(data);
      } catch (error) {
        return errorExit(`failed generating mail for ${JSON.stringify(data)}: '${error.message}'`);
      }
    })();
    saveFile(`${output}/${file}`, email);
    console.log(`... mail generated to '${file}'.`);
    emailsCount++;
  })
  .on('end', () =>
    console.log(
      `\nFinished generating of ${emailsCount} mails in ${Math.round(performance.now() - start) / 1000} seconds.`
    )
  );
