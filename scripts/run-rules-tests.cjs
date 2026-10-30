const path = require('path');
const { spawn } = require('child_process');

const javaHome = path.join(process.env.USERPROFILE, '.jdk21', 'jdk-21.0.4+7');
const javaBin = path.join(javaHome, 'bin');

const env = {
  ...process.env,
  JAVA_HOME: javaHome,
  PATH: `${javaBin}${path.delimiter}${process.env.PATH}`
};

const fbBin = require.resolve('firebase-tools/lib/bin/firebase.js');

const child = spawn(process.execPath, [
  fbBin,
  'emulators:exec',
  '--only',
  'firestore',
  '--project',
  'axe-hours-test',
  'npx tsx --test tests/firestore.rules.test.ts'
], { env, stdio: 'inherit' });

child.on('exit', (code) => {
  process.exit(code || 0);
});

