const vscode = require('vscode');

const setup = require('./setup');
const edit = require('./commands/edit');

let devServer;

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
	devServer = await setup();

	let disposable = vscode.commands.registerCommand('extension.edit', edit(context, devServer.port));

	context.subscriptions.push(disposable);
}
exports.activate = activate;

function deactivate() {
	if (devServer) {
		devServer.process.kill();
	}
}

module.exports = {
	activate,
	deactivate
};
