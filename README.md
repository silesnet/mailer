# mailer

Send mass mail generated from CSV data and Handlebars template.

## Build

```bash
$ npm install
$ npm run build
$ npm run dist
```

## Usage

`build/dist/mail-gen.js` and `build/dist/mail-send.js` scripts work with node version 8.17.0 and higher.
See usage detail by running the scripts without any parameters.

```bash
$ ./node mail-gen.js
$ ./node mail-send.js
```

Check test data file and template in the `test` folder.

## Test

```bash
$ npm run test-gen
```

Check generate mail in `build/test/mail` folder.

```bash
$ npm run test-send
```

Check sent mail at https://ethereal.email.

- login using user details found in `package.json`/`test-send` script
- find delivered messages at https://ethereal.email/messages

## Production workflow

`nodejs` (version 8.17.0 or higher) has to be installed on target machine.
You can download binary distribution for your platform from https://nodejs.org/dist/. Extract `node` executable from the package's `bin` folder.

1. open named screen session

   ```bash
   $ screen -S mail
   ```

2. generate mail (save result to log)

   ```bash
   $ ./node mail-gen.js -d customers.csv -t template.hbs > gen.log 2>&1
   ```

3. send mass mail with pause (save result to log)

   ```bash
   $ ./node mail-send.js -i mail -s 5000 > send.log 2>&1
   ```

4. detach from screen session (close putty) letting script running

5. ssh connect to machine and check progress

   ```bash
   $ ps ax | grep mail-send # process is running
   $ tail -f send.log # sending log
   $ ls mail/sent | wc -l # number of sent mails
   $ ls mail/failed | wc -l # nubmer of failed mails
   ```

6. reattach to screen session and close after finish

   ```bash
   $ screen -r mail
   ```
