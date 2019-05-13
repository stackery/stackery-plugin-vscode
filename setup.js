const fs = require('fs');
const os = require('os');
const { spawnSync } = require('child_process');
const zlib = require('zlib');

const hasbin = require('hasbin');
const request = require('request');
const vscode = require('vscode');

module.exports = async function setup() {
  await installCli();

  await login();
}

async function installCli() {
  const hasCli = await new Promise(resolve => hasbin('stackery', resolve));

	if (hasCli) {
    return;
  }

  try {
    fs.accessSync('/usr/local/bin', fs.constants.W_OK | fs.constants.X_OK);
  } catch (err) {
    await vscode.window.showWarningMessage('Please install the Stackery CLI first. You can find installation instructions at https://docs.stackery.io/docs/using-stackery/cli/#install-the-cli.', { modal: true });
    throw new Error(`Unable to install Stackery CLI: Not permitted to write to /usr/local/bin: ${err.message}`);
  }
  
  const install = await vscode.window.showInformationMessage(
		'The Stackery CLI must be installed for visual infrastructure editing. Install the CLI to /usr/local/bin?',
		{ modal: true },
		'Ok'
  );
  
  if (!install) {
    await vscode.window.showWarningMessage('Please manually install the Stackery CLI. You can find installation instructions at https://docs.stackery.io/docs/using-stackery/cli/#install-the-cli.', { modal: true });
    throw new Error('Unable to install Stackery CLI: Declined installation');
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
    await vscode.window.showWarningMessage('Failed to download Stackery CLI. Please manually install the Stackery CLI. You can find installation instructions at https://docs.stackery.io/docs/using-stackery/cli/#install-the-cli.', { modal: true });
    throw new Error(`Unable to install Stackery CLI: Download error: ${err.message}`);
  }

  try {
    fs.chmodSync(
      '/usr/local/bin/stackery',
      fs.constants.S_IRUSR | fs.constants.S_IRGRP | fs.constants.S_IROTH |
      fs.constants.S_IWUSR |
      fs.constants.S_IXUSR | fs.constants.S_IXGRP | fs.constants.S_IXOTH
    );
  } catch {
    await vscode.window.showWarningMessage('Failed to make Stackery CLI executable (/usr/local/bin/stackery). Please resolve this issue then try again.', { modal: true });
    throw new Error(`Unable to install Stackery CLI: Failed to make CLI executable: ${err.message}`);
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

async function login() {
  const { status, stderr } = spawnSync('stackery', ['whoami'], { env: { _STACKERY_ENV: 'dev' }});

  if (status === 0) {
    return;
  }

  if (status !== 2) {
    await vscode.window.showWarningMessage('Failed to check if Stackery CLI has been logged in. Please ensure `stackery whoami` returns successfully.', { modal: true });
    throw new Error(`Failed to check if Stackery CLI has been logged in: ${stderr}`);
  }

  const action = await vscode.window.showInformationMessage(
    'Create a Stackery account or login to an existing account?',
    { modal: true },
    'Create Account', 'Login'
  );

  if (!action) {
    await vscode.window.showWarningMessage('Please create a Stackery account or login via the Stackery CLI manually, then try again.', { modal: true });
    throw new Error(`Failed to login: Declined`);
  }

  if (action === 'Create Account') {
    await createAccount();
  } else {
    await login();
  }
}

async function createAccount() {
  const panel = vscode.window.createWebviewPanel(
    'stackery.createAccount',
    'Create Stackery Account',
    vscode.ViewColumn.One,
    {
      retainContextWhenHidden: true,
      enableScripts: true,
      localResourceRoots: []
    }
  );

  panel.iconPath = {
    light: './media/stackery-navy.svg',
    dark: './media/stackery-teal.svg'
  };

  panel.webview.html = `<iframe src="https://app.stackery.io"></iframe>`
}