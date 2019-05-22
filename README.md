<h1 align="center"><img src="https://s3-us-west-2.amazonaws.com/vscode-readme/img/icon.png" alt="Logo" height="128" /></h1>
<h2 align="center">Stackery Serverless Tools</h2>
<div align="center">
</div>

Stackery extension for Visual Studio Code. Provides local template and visual editing for serverless applications built using Stackery.

## Installation

1. Open the extension palette (`Cmd+Shift+X` or `Ctrl+Shift+X`)
2. Search for, and select __Stackery Serverless Tools__
3. Select __Install__

## Features

* Visual Editing of infrastructure-as-code templates, including:
  * AWS CloudFormation templates
  * AWS SAM (Serverless Application Model)
  * Serverless Framework
* Visualization of stack architecture
* Integration with the Stackery CLI for deployments and cloudlocal function development

## Usage

The Stackery extension allows you to visualize and configure the AWS resources defined in your `template.yaml` or `serverless.yml` file. Configuring a resource using the Stackery visual editor renders the appropriate YAML in the `template.yaml` or `serverless.yml` file.

![stackery-vscode-split-screen](https://s3-us-west-2.amazonaws.com/vscode-readme/img/split-screen-1.png)

### Visual Editing

There are two ways to start using the Stackery visual editor to configure your stack resources:

1. Right-click on `template.yaml` to access the context menu, and select __Open in Stackery__

    ![right-click-screenshot](https://s3-us-west-2.amazonaws.com/vscode-readme/img/right-click-screenshot-1.png)

    __or__

2. While in the `template.yaml` file, select the Stackery logo on the top-right corner of the window

    ![stackery-button-screenshot](https://s3-us-west-2.amazonaws.com/vscode-readme/img/logo-button-screenshot-1.png)

### Configure resources

<!-- ![VS Code](https://s3-us-west-2.amazonaws.com/vscode-readme/gifs/vscode.gif) -->
<img src="https://s3-us-west-2.amazonaws.com/vscode-readme/gifs/vscode.gif" width="600">

To configure stack resources:

1. Select `Add Resource` in the top-right corner of the visual editor
2. Choose from a list of available resources
3. Drag (or double-click) a resource onto the visual editor
4. Double-click the resource to open its configuration panel

> For details on configurable properties of each resource, visit the <a href="https://docs.stackery.io/docs/api/nodes/Function/" target="_blank" alt="Stackery Cloud Resources Reference">Stackery Cloud Resources Reference</a>

### Event subscription

Subscribe compute resources to events emitted by other resources using a __event subscription wire__ (solid wire), e.g. an __Edge Function__ triggered by a __CDN__ lifecycle event.

<!-- ![VS Code clip 1](https://s3-us-west-2.amazonaws.com/vscode-readme/gifs/vscode-clip1.gif) -->
<img src="https://s3-us-west-2.amazonaws.com/vscode-readme/gifs/vscode-clip1.gif" width="600">


### Service discovery

Connect a compute resource (Function, Edge Function, or Docker Task) to another resource using a __service discovery wire__ (dashed wire) to populate the IAM policies and environment variables required for it to interact with that resource, e.g. a __Function__ accessing an __Object Store__.

<!-- ![VS Code clip 2](https://s3-us-west-2.amazonaws.com/vscode-readme/gifs/vscode-clip2.gif) -->
<img src="https://s3-us-west-2.amazonaws.com/vscode-readme/gifs/vscode-clip2.gif" width="200">


## Workflow Example

Let's try an example of visually editing an existing stack in VS Code. In this example, we'll use a [simple serverless CRUD](https://github.com/stackery/sam-crud-demo) stack in NodeJS, but you can use one of your own existing stacks or [create a new one](https://docs.stackery.io/docs/api/cli/stackery_create) in the Stackery CLI with this command:

```bash
stackery create -n simple-serverless-crud -p github --github-org MyUsername --blueprint-git-url https://github.com/stackery/sam-crud-demo
```

1. Open VS Code, and install the __Stackery Serverless Tools__ extension from the Extensions Marketplace if you have not already done so
2. Clone your stack from your Git provider
3. In VS Code, select __Add workspace folder__ from the menu or welcome screen

    ![open workspace folder](https://s3-us-west-2.amazonaws.com/vscode-readme/img/open-workspace.png)

4. Open the `template.yaml` file from the sidebar
5. Click the Stackery icon in the top right corner

    ![open template.yaml](https://s3-us-west-2.amazonaws.com/vscode-readme/img/open-template.png)

6. The first time you use the Stackery extension in a new workspace in VS Code, you will be prompted to log in to Stackery. Use the same username and password you would use in the app

    ![login](https://s3-us-west-2.amazonaws.com/vscode-readme/img/login.png)

7. (Optional) Pull your template to the side of the visual editor if you want a side-by-side view

    ![side-by-side view](https://s3-us-west-2.amazonaws.com/vscode-readme/img/view.png)

8.  Click the __Add Resource__ button in the top right of the visual editor
9.  Click the __Function__ resource to add it to the editor _(you will see the relevant code added to the `template.yaml` file as you use the visual editor)_
10. Click the __Object Store__ resource to add it to the editor
11. (Optional) Name your function and object store by double-clicking the new resources, filling in the relevant fields, and clicking the green __Save__ button
12. Right-click on your stack's root directory, and select __Open in Terminal__
13. In the terminal, `git add`, `commit`, and `push` your changes to your Git repository. You will see your changes reflected in the Stackery app if it's open in your browser

The video below shows steps 4-13:

<!-- ![VS Code workflow](https://s3-us-west-2.amazonaws.com/vscode-readme/gifs/vscode-workflow.gif){:width="400px"} -->
<img src="https://s3-us-west-2.amazonaws.com/vscode-readme/gifs/vscode-workflow.gif" width="600">

## Troubleshooting

### Missing Stackery CLI or CLI out of date

In order to use the Stackery VS Code extension, you need to have the [Stackery CLI](https://docs.stackery.io/docs/using-stackery/cli/) installed and updated to at least version 2.8.0. Check your version by entering `stackery version` in your the terminal or shell. If you need to update, run `stackery update`, then try the extension again.

### Template file is not being updated

Before using the VS Code extension, make sure that your `template.yaml` file is part of a workspace in VS Code. Follow the instructions in the Workflow Example above to open a workspace.

## Next Steps

Once your VS Code development environment is set up, it's easy to integrate with Stackery's other features, such as cloudlocal development and the CLI tool. Read the docs below to get started:

  * [Set up your cloudlocal development environment](https://docs.stackery.io/docs/workflow/local-development)
  * [Local invoke from the VS Code terminal](https://docs.stackery.io/docs/api/cli/stackery_local_invoke)
  * [Run a server for local template editing in the browser](https://docs.stackery.io/docs/api/cli/stackery_dev-server)

## Releases

<hr>

See `CHANGELOG.MD`.
