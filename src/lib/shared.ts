import fs from 'fs';

const errorExit = (msg: string, code: number = 1): never => {
  console.error('ERROR: ' + msg);
  process.exit(code);
};

export { errorExit };
