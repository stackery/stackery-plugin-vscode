/*
Copyright 2019 Stackery, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

const fs = require('fs');
const os = require('os');
const { spawn, spawnSync } = require('child_process');
const zlib = require('zlib');

const hasbin = require('hasbin');
const request = require('request');
const semver = require('semver');
const vscode = require('vscode');

const stackeryEnv = require('../stackeryEnv');

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
  return startDevServer();
};

const warnAndStop = message => {
  vscode.window.showWarningMessage(message, { modal: true });

  throw new Error(message);
};

const errorAndStop = message => {
  vscode.window.showErrorMessage(message, { modal: true });

  throw new Error(message);
};

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
};

const installCli = async () => {
  const hasCli = await new Promise(resolve => hasbin('stackery', resolve));

  if (hasCli) {
    let { stdout: version } = await cli({
      args: [ 'version' ],
      errorMessagePrefix: 'Failed to get current version of Stackery CLI, skipping version check.'
    });

    version = version.trim().replace(/-beta.*$/, '');

    if (!version || !semver.satisfies(version, '>=2.8.0')) {
      await cli({
        args: [ 'upgrade' ],
        errorMessagePrefix: 'Run `stackery upgrade` to upgrade the Stackery CLI.',
        throwOnFailure: true
      });
    }

    return;
  }

  try {
    fs.accessSync('/usr/local/bin', fs.constants.W_OK | fs.constants.X_OK);
  } catch (err) {
    warnAndStop('Missing Stackery CLI. You can find installation instructions at https://docs.stackery.io/docs/using-stackery/cli/#install-the-cli.');
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
    warnAndStop();
    await vscode.window.showWarningMessage('Missing Stackery CLI. You can find installation instructions at https://docs.stackery.io/docs/using-stackery/cli/#install-the-cli.');
  }

  try {
    fs.chmodSync(
      '/usr/local/bin/stackery',
      fs.constants.S_IRUSR | fs.constants.S_IRGRP | fs.constants.S_IROTH |
      fs.constants.S_IWUSR |
      fs.constants.S_IXUSR | fs.constants.S_IXGRP | fs.constants.S_IXOTH
    );
  } catch (err) {
    errorAndStop('Failed to make Stackery CLI executable (/usr/local/bin/stackery). Please resolve this issue then try again.');
  }

  console.log('Successfully installed Stackery CLI to /usr/local/bin');
};

const DOWNLOAD_PREFIX = 'https://ga.cli.stackery.io';
function cliDownloadPath () {
  switch (os.type()) {
    case 'Linux':
      return `${DOWNLOAD_PREFIX}/linux/stackery`;

    case 'Darwin':
      return `${DOWNLOAD_PREFIX}/osx/stackery`;

    case 'Windows_NT':
      return `${DOWNLOAD_PREFIX}/windows/stackery.exe`;
  }
}

const startDevServer = async () => {
  const workspace = vscode.workspace.workspaceFolders[0].uri.fsPath;

  return vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: 'Loading Stackery files...'
  },
  progress => {
    progress.report({ increment: 33 });
    return new Promise((resolve, reject) => {
      console.log(`Starting dev-server for workspace ${workspace}`);

      // TODO - switch to shared secret auth once available
      const devServerProcess = spawn(
        'stackery',
        [ 'dev-server', '--disable-auth', '--workspace', workspace ],
        {
          env: {
            ...process.env,
            ...stackeryEnv()
          },
          stdio: [
            'pipe', // stdin
            'pipe', // stdout
            'pipe', // stderr
            'pipe' // dev-server reports the port it opened on fd 3
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
        await vscode.window.showErrorMessage(`Failed to start Stackery dev-server\n\n${stderr}`);
        reject(`Failed to start Stackery dev-server\n\n${stderr}`);
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
  });
};
