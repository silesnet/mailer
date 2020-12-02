import parseArgs from 'minimist';
import fs from 'fs';
import csv from 'csv-parser';
import Handlebars from 'handlebars';
import { encode } from 'nodemailer/lib/qp';

interface Arguments {
  template: string;
  data: string;
  output: string;
  clearOutput: boolean;
}

const errorExit = (msg: string, code: number = 1): never => {
  console.error('ERROR: ' + msg);
  process.exit(code);
};

const parseArguments = (): Arguments => {
  const args = parseArgs(process.argv.slice(2), {
    alias: { template: 't', data: 'd', output: 'o', 'clear-output': 'c' },
    default: { output: 'generated-emails', 'clear-output': false },
  });

  if (!args.template || !args.data) {
    console.log(`\
      generate-email: generate email content files based on CSV data and Handlebars email template

      Usage
        $ generate-emails --data data.csv --template template.hbs --output generated-emails --clear-output
    `);
    process.exit(1);
  }
  return {
    template: args.template,
    data: args.data,
    output: args.output,
    clearOutput: args['clear-output'],
  };
};

const createEmptyFolder = (folder: string, { clear = false } = {}): string => {
  if (!fs.existsSync(folder)) {
    try {
      fs.mkdirSync(folder, { recursive: true });
    } catch (error) {
      errorExit(`failed to create folder '${folder}': '${error.message}'`);
      process.exit(1);
    }
  }

  const content = fs.readdirSync(folder);
  const hasContent = content.length > 0;

  if (hasContent && !clear) {
    errorExit(`folder '${folder}' is not empty`);
  }

  if (hasContent) {
    content.forEach((file) => {
      try {
        fs.unlinkSync(`${folder}/${file}`);
      } catch (error) {
        errorExit(`failed deleting file '${folder}/${file}': ${error.meesage}`);
      }
    });
  }

  return folder;
};

const createTemplate = (file: string): HandlebarsTemplateDelegate | never => {
  try {
    Handlebars.registerHelper(
      'mimeEncode',
      (text) => new Handlebars.SafeString('=?UTF-8?Q?' + encode(text) + '?=')
    );
    return Handlebars.compile(fs.readFileSync(file, 'utf8'));
  } catch (error: any) {
    return errorExit(
      `failed to create handlebars template of '${file}': '${error.message}'`
    );
  }
};

const createCsvDataStream = (file: string) => {
  return fs
    .createReadStream(file, { encoding: 'utf8' })
    .on('error', (error) => {
      errorExit(
        `ERROR: failed to create CSV data stream of '${file}': '${error.message}'`
      );
    })
    .setMaxListeners(100)
    .pipe(csv({ separator: '|', strict: true }))
    .on('error', (error) => {
      errorExit(
        `ERROR: failed to read CSV data of '${file}': '${error.message}'`
      );
    });
};

const normalizeText = (text: string): string => {
  return text
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s/g, '-');
};

const saveFile = (file: string, content: string): void => {
  try {
    fs.writeFileSync(file, content, { encoding: 'utf8' });
  } catch (error) {
    errorExit(`failed saving file '${file}'`);
  }
};

export {
  parseArguments,
  createTemplate,
  createEmptyFolder,
  createCsvDataStream,
  normalizeText,
  saveFile,
};
