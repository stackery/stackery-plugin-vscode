// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

const setup = require('./setup');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
	let localStorage = {};

	//await setup();

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('extension.edit', function () {
		// The code you place here will be executed every time your command is executed

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

		const escapedLocalStorage = JSON.stringify(localStorage).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

		let location = 'http://localhost:3002/editor/visual';
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
	});

	context.subscriptions.push(disposable);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
