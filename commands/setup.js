const fs = require('fs');
const os = require('os');
const { spawn, spawnSync } = require('child_process');
const zlib = require('zlib');

const hasbin = require('hasbin');
const request = require('request');
const semver = require('semver');
const vscode = require('vscode');

const stackeryEnv = require('./stackeryEnv');

const STACKERY_INFO_URI = vscode.Uri.parse('https://www.stackery.io/product/');
const SIGNUP_URI = vscode.Uri.parse('https://app.stackery.io/sign-up');

/**
 * @typedef {Object} DevServer
 * @property {Object} process - Node.js child process
 * @property {Number} port - Server port
 */

/**
 * Starts dev-server. Installs CLI and logs in if necessary.
 * 
 * @returns {DevServer} - Dev server instance
 */
module.exports = async () => {
  await installCli();

  await login();

  return startDevServer();
}

const warnAndStop = message => {
  vscode.window.showWarningMessage(message, { modal: true });

  throw new Error(message);
}

const errorAndStop = message => {
  vscode.window.showErrorMessage(message, { modal: true });

  throw new Error(message);
}

const cli = async ({ args, errorMessagePrefix, throwOnFailure }) => {
  const results = spawnSync('stackery', args, { env: { ...process.env, ...stackeryEnv() } });

  results.stdout = results.stdout.toString();
  results.stderr = results.stderr.toString().replace(/Your Stackery CLI is out of date\nRun 'stackery update' to update v[0-9a-zA-Z-.]+ -> v[0-9a-zA-Z-.]+\n/, '');

  if (results.error || results.status === 1) {
    const message = `${errorMessagePrefix}\n\n${results.error ? results.error.message : results.stderr.toString()}`;

    if (throwOnFailure) {
      errorAndStop(message);
    } else {
      await vscode.window.showErrorMessage(message, { modal: true });
    }
  }

  return {
    ...results,
    stdout: results.stdout.toString(),
    stderr: results.stderr.toString()
  };
}

const installCli = async () => {
  const hasCli = await new Promise(resolve => hasbin('stackery', resolve));

	if (hasCli) {
    let { stdout: version } = await cli({
      args: [ 'version' ],
      errorMessagePrefix: 'Failed to get current version of Stackery CLI, skipping version check.'
    });

    version = version.replace(/-beta.*$/, '');

    if (!version || !semver.satisfies(version, '>=2.8.0')) {
      const upgrade = await vscode.window.showInformationMessage(
        'Installed Stackery CLI must be upgraded to work with this extension. Upgrade the CLI now?',
        { modal: true },
        'Cancel', 'Ok'
      )

      if (upgrade !== 'Ok') {
        errorAndStop('Please manually upgrade the Stackery CLI and try again.');
      }

      await cli({
        args: [ 'upgrade' ],
        errorMessagePrefix: 'Failed to upgrade Stackery CLI. Please manually upgrade the CLI and try again.',
        throwOnFailure: true
      });
    }

    return;
  }

  while (true) {
    const install = await vscode.window.showInformationMessage(
      'Stackery helps you architect your serverless infrastructure, develop function code, and deploy into environments in your AWS accounts. We will walk through a few steps to get started.\n\nThe Stackery CLI must be installed. Install the CLI to /usr/local/bin?',
      { modal: true },
      'Learn more...', 'Ok'
    );
    
    if (!install) {
      warnAndStop('Please manually install the Stackery CLI. You can find installation instructions at https://docs.stackery.io/docs/using-stackery/cli/#install-the-cli.');
    }

    if (install === 'Tell me more...') {
      if (!(await vscode.env.openExternal(STACKERY_INFO_URI))) {
        errorAndStop('Failed to open Stackery info in your browser. Check it out at https://www.stackery.io/product/.');
      }
    } else {
      break;
    }
  }

  try {
    fs.accessSync('/usr/local/bin', fs.constants.W_OK | fs.constants.X_OK);
  } catch (err) {
    warnAndStop('Please install the Stackery CLI first. You can find installation instructions at https://docs.stackery.io/docs/using-stackery/cli/#install-the-cli.');
  }
  
  try {
    await new Promise((resolve, reject) =>
      request.get(cliDownloadPath(), { followRedirect: true })
        .on('error', err => reject(err))
        .pipe(zlib.createGunzip())
        .pipe(fs.createWriteStream('/usr/local/bin/stackery'))
        .on('finish', resolve)
    );
  } catch (err) {
    warnAndStop()
    await vscode.window.showWarningMessage('Failed to download Stackery CLI. Please manually install the Stackery CLI. You can find installation instructions at https://docs.stackery.io/docs/using-stackery/cli/#install-the-cli.');
  }

  try {
    fs.chmodSync(
      '/usr/local/bin/stackery',
      fs.constants.S_IRUSR | fs.constants.S_IRGRP | fs.constants.S_IROTH |
      fs.constants.S_IWUSR |
      fs.constants.S_IXUSR | fs.constants.S_IXGRP | fs.constants.S_IXOTH
    );
  } catch (err) {
    errorAndStop('Failed to make Stackery CLI executable (/usr/local/bin/stackery). Please resolve this issue then try again.')
  }

  console.log('Successfully installed Stackery CLI to /usr/local/bin');
}

const DOWNLOAD_PREFIX = 'https://ga.cli.stackery.io';
function cliDownloadPath() {
  switch (os.type()) {
    case 'Linux':
      return `${DOWNLOAD_PREFIX}/linux/stackery`;

    case 'Darwin':
      return `${DOWNLOAD_PREFIX}/osx/stackery`;

    case 'Windows_NT':
      return `${DOWNLOAD_PREFIX}/windows/stackery.exe`;
  }
}

const EMAIL_REGEX = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
const login = async () => {
  const { status } = await cli({
    args: [ 'whoami' ],
    errorMessagePrefix: 'Failed to check if Stackery CLI has been logged in. Please ensure \`stackery whoami\` returns successfully.',
    throwOnFailure: true
  });

  if (status === 0) {
    return;
  }

  const action = await vscode.window.showInformationMessage(
    'Do you have an existing Stackery account?',
    { modal: true },
    'Create Account', 'Login'
  );

  if (!action) {
    warnAndStop('Please create a Stackery account or login via the Stackery CLI manually, then try again.');
  }

  if (action === 'Create Account') {
    if (!(await vscode.env.openExternal(SIGNUP_URI))) {
      await vscode.window.showWarningMessage(
        'Failed to open sign-up page. Please sign up at https://app.stackery.io/sign-up before continuing.',
        { modal: true }
      );
    }
  }

  while (true) {
    const email = await vscode.window.showInputBox({
      ignoreFocusOut: true,
      prompt: 'Please enter your Stackery account email address',
      validateInput: (value) => EMAIL_REGEX.test(value) ? null : 'Please enter a valid email address'
    });

    if (email === undefined) {
      throw new Error('Canceled login');
    }

    const password = await vscode.window.showInputBox({
      ignoreFocusOut: true,
      password: true,
      prompt: 'Please enter your Stackery account password',
      validateInput: (value) => value.length >= 8 ? null : 'Invalid password'
    });

    if (password === undefined) {
      throw new Error('Canceled login');
    }

    const { status } = await cli({
      args: ['login', '--email', email, '--password', password],
      errorMessagePrefix: 'Internal error while attempting to login.'
    });

    if (status === 1) {
      await vscode.window.showErrorMessage(
        `Internal error while attempting to login:\n\n${stderr}`,
        { modal: true }
      );
      continue;
    } else if (status === 2) {
      await vscode.window.showWarningMessage(
        'Invalid Stackery email or password',
        { modal: true }
      );
    } else {
      break;
    }
  }
}

const startDevServer = async () => {
  const workspace = vscode.workspace.workspaceFolders[0].uri.fsPath

  return vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: 'Loading Stackery files...'
  },
  progress => {
    progress.report({ increment: 33 });
    return new Promise((resolve, reject) => {
      console.log(`Starting dev-server for workspace ${workspace}`);

      const devServerProcess = spawn(
        'stackery',
        [ 'dev-server', '--workspace', workspace ],
        {
          env: {
            ...process.env,
            ...stackeryEnv()
          },
          stdio: [
            'pipe', // stdin
            'pipe', // stdout
            'pipe', // stderr
            'pipe'  // dev-server reports the port it opened on fd 3
          ]
        }
      );

      devServerProcess.on('error', async err => {
        startingIndicator.hide();
        await vscode.window.showErrorMessage(`Failed to start Stackery dev-server\n\n${err.message}`);
        reject(new Error(`Failed to start Stackery dev-server\n\n${err.message}`));
      });

      const stderrChunks = [];
      devServerProcess.stderr.on('data', chunk => stderrChunks.push(chunk));

      devServerProcess.on('exit', async code => {
        const stderr = stderrChunks.join('');
        await vscode.window.showErrorMessage(`Failed to start Stackery dev-server\n\n${stderr}`)
        reject(`Failed to start Stackery dev-server\n\n${stderr}`)
      });

      const portChunks = [];
      devServerProcess.stdio[3].on('data', chunk => portChunks.push(chunk));
      devServerProcess.stdio[3].on('end', () => {
        const port = Number(portChunks.join());
        console.log(`Stackery dev-server started on port ${port}`);
        resolve({
          process: devServerProcess,
          port
        });
      });
    });
  })
};