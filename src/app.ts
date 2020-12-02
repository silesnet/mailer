import {
  parseArguments,
  createTemplate,
  createEmptyFolder,
  createCsvDataStream,
  normalizeText,
  saveFile,
} from './lib';
import { performance } from 'perf_hooks';

const args = parseArguments();

console.log(`\
Generating emails...
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

console.log('generating emails...');
let emailsCount = 0;
const start = performance.now();
customers
  .on(
    'data',
    (customer: {
      customerName: string;
      customerEmail: string;
      agreementNumber: string;
    }) => {
      const file =
        normalizeText(customer.customerName) +
        '_' +
        normalizeText(customer.agreementNumber) +
        '.eml';
      const path = `${output}/${file}`;
      const email = template(customer);
      saveFile(path, email);
      console.log(
        `...email generated for '${customer.customerName}' to '${path}'.`
      );
    }
  )
  .on('end', () =>
    console.log(
      `\nFinished generating ${emailsCount} emails in ${
        Math.round(((performance.now() - start) / 1000) * 100) / 100
      } seconds.`
    )
  );
