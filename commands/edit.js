const path = require('path');

const vscode = require('vscode');

const setup = require('./setup');
const stackeryEnv = require('../stackeryEnv');

let localStorage = {};
let devServer;

module.exports = context => async uri => {
  if (!devServer) {
    devServer = await setup();
  }

  const panel = vscode.window.createWebviewPanel(
    'stackery.edit',
    path.basename(uri.path),
    vscode.ViewColumn.One,
    {
      retainContextWhenHidden: true,
      enableScripts: true,
      localResourceRoots: []
    }
  );

  panel.iconPath = {
    light: vscode.Uri.file(path.join(context.extensionPath, 'media', 'stackery-navy.svg')),
    dark: vscode.Uri.file(path.join(context.extensionPath, 'media', 'stackery-teal.svg'))
  };

  let location = editorURL();
  if (Object.keys(localStorage).length > 0) {
    location += `?localstorage=${encodeURIComponent(JSON.stringify(localStorage))}`;
  }

  panel.webview.html =
`<script>
const iframe = top.document.getElementsByTagName('iframe')[0];

iframe.setAttribute('id', 'active-frame');
iframe.style.visibility = "visible";
iframe.contentWindow.focus();
iframe.contentWindow.location = "${location}";
</script>`;

  panel.webview.onDidReceiveMessage(async message => {
    switch (message.type) {
      case 'localStorage.setItem':
        localStorage[message.key] = message.value;
        break;

      case 'localStorage.removeItem':
        delete localStorage[message.key];
        break;

      case 'localStorage.clear':
        localStorage = {};
        break;

      case 'clipboard.copy':
        vscode.env.clipboard.writeText(message.text);
        break;

      case 'clipboard.paste':
        const buffer = await vscode.env.clipboard.readText();
        panel.webview.postMessage({
          type: 'clipboard.paste.buffer',
          buffer
        });
        break;

      default:
        console.warn(`stackery: Received unknown message type ${message.type} from extension webview`);
        break;
    }
  });
};

const EDITOR_PATH = '/editor/visual';
const editorURL = () => {
  const env = stackeryEnv()._STACKERY_ENV;

  switch (env) {
    case 'dev':
      return `http://localhost:3002${EDITOR_PATH}`;

    case 'prod':
    case undefined:
      return `https://app.stackery.io${EDITOR_PATH}`;

    default:
      return `https://${env}-app.stackery.io${EDITOR_PATH}`;
  }
};