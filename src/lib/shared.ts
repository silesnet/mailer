import fs from 'fs';
import path from 'path';
import 'core-js/features/array';

export const errorExit = (msg: string, code: number = 1): never => {
  console.error('ERROR: ' + msg);
  process.exit(code);
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

const move = (source: string, target: string): void => {
  try {
    createFolderIfNotExist(path.dirname(target));
    fs.renameSync(source, target);
  } catch (error) {
    errorExit(`failed to move '${source}' to '${target}': '${error.message}'`);
  }
};

export interface Item {
  file: string;
  path: string;
  succeded(done?: () => void): void;
  failed(done?: () => void): void;
}

export interface Status {
  size: number;
  processed: number;
  failed: number;
}

export class Queue {
  private processed = 0;
  private failed = 0;
  private items: Item[];

  constructor(input: string, { processed = 'processed', failed = 'failed' } = {}) {
    if (!fs.existsSync(input) || !fs.statSync(input).isDirectory()) {
      errorExit(`folder does not exist '${input}'`);
    }
    this.items = fs
      .readdirSync(input)
      .filter((file) => fs.statSync(`${input}/${file}`).isFile())
      .map(
        (file) =>
          ({
            file,
            path: `${input}/${file}`,
            succeded: (done) => {
              move(`${input}/${file}`, `${input}/${processed}/${file}`);
              this.processed++;
              if (done) {
                done();
              }
            },
            failed: (done) => {
              move(`${input}/${file}`, `${input}/${failed}/${file}`);
              this.failed++;
              if (done) {
                done();
              }
            },
          } as Item)
      );
  }

  get empty(): boolean {
    return this.items.length === 0;
  }

  get status(): Status {
    return { size: this.items.length, processed: this.processed, failed: this.failed };
  }

  [Symbol.iterator]() {
    return this.items.values();
  }
}
