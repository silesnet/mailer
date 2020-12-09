import parseArgs from 'minimist';
import fs from 'fs';
import csv from 'csv-parser';
import Handlebars from 'handlebars';
import { encode } from 'nodemailer/lib/qp';
import { errorExit } from './shared';

export interface Arguments {
  template: string;
  data: string;
  output: string;
  clearOutput: boolean;
}

export const parseArguments = (argv: string[]): Arguments => {
  const args = parseArgs(argv, {
    alias: { template: 't', data: 'd', output: 'o', 'clear-output': 'c' },
    default: { output: 'mail', 'clear-output': false },
  });

  return {
    template: args.template,
    data: args.data,
    output: args.output,
    clearOutput: args['clear-output'],
  };
};

export const createEmptyFolder = (folder: string, { clear = false } = {}): string => {
  if (!fs.existsSync(folder)) {
    try {
      fs.mkdirSync(folder, { recursive: true });
      return folder;
    } catch (error) {
      errorExit(`failed to create folder '${folder}': '${error.message}'`);
    }
  }

  const content = fs.readdirSync(folder).filter((entry) => fs.statSync(`${folder}/${entry}`).isFile());
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

export const createTemplate = (file: string): HandlebarsTemplateDelegate | never => {
  try {
    Handlebars.registerHelper('mimeEncode', (text) => new Handlebars.SafeString('=?UTF-8?Q?' + encode(text) + '?='));
    return Handlebars.compile(fs.readFileSync(file, 'utf8'));
  } catch (error: any) {
    return errorExit(`failed to create handlebars template of '${file}': '${error.message}'`);
  }
};

export const createCsvDataStream = (file: string) => {
  return fs
    .createReadStream(file, { encoding: 'utf8' })
    .on('error', (error) => {
      errorExit(`ERROR: failed to create CSV data stream of '${file}': '${error.message}'`);
    })
    .setMaxListeners(100)
    .pipe(csv({ separator: '|', strict: true }))
    .on('error', (error) => {
      errorExit(`ERROR: failed to read CSV data of '${file}': '${error.message}'`);
    });
};

export const normalizeText = (text: string): string => {
  return text
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s/g, '-');
};

export const saveFile = (file: string, content: string): void => {
  try {
    fs.writeFileSync(file, content, { encoding: 'utf8' });
  } catch (error) {
    errorExit(`failed saving file '${file}'`);
  }
};
