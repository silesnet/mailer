import {
  parseArguments,
  createEmptyFolder,
  createTemplate,
  createCsvDataStream,
  normalizeText,
  saveFile,
} from './lib/generate';
import { performance } from 'perf_hooks';

const args = parseArguments();

console.log(`\
Generating mails...
  Handlebars template    ${args.template}
  CSV data               ${args.data}
  output folder          ${args.output}
  clear output           ${args.clearOutput}\n`);

const template = createTemplate(args.template);
console.log('...template compiled.');

const customers = createCsvDataStream(args.data);
console.log('...data stream opened.');

const output = createEmptyFolder(args.output, { clear: args.clearOutput });
console.log('...output folder created.');

console.log('generating mails...');
let emailsCount = 0;
const start = performance.now();
customers
  .on('data', (customer: { id: string; name: string; email: string; agreement: string }) => {
    const file = customer.id + '_' + normalizeText(customer.name) + '.eml';
    const email = template(customer);
    saveFile(`${output}/${file}`, email);
    console.log(`..mail generated to '${file}'.`);
    emailsCount++;
  })
  .on('end', () =>
    console.log(
      `\nFinished generating ${emailsCount} mails in ${Math.round(performance.now() - start) / 1000} seconds.`
    )
  );
