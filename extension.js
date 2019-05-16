const vscode = require('vscode');

const edit = require('./commands/edit');

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
	let disposable = vscode.commands.registerCommand('extension.edit', edit(context));

	context.subscriptions.push(disposable);
}
exports.activate = activate;

module.exports = {
	activate
};
