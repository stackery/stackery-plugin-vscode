const vscode = require('vscode');

module.exports = () => {
  const config = vscode.workspace.getConfiguration('stackery');

  return {
    _STACKERY_ENV: config.get('_env'),
    STACKERY_USER_POOL_ID: config.get('_userPoolId'),
    STACKERY_USER_POOL_CLIENT_ID: config.get('_userPoolClientId')
  };
};