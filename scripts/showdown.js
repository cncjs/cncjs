#!/usr/bin/env node

/* eslint import/no-dynamic-require: 0 */
const fs = require('fs');
const path = require('path');
const program = require('commander');
const showdown = require('showdown');
const pkg = require('../package.json');

program
    .usage('[options]')
    .option('-c, --config <filename>', 'Path to JSON config file', '')
    .option('-i, --input <filename>', 'Input sorce. Usually a md file.', false)
    .option('-o, --output <filename>', 'Output target. Usually a html file.', false);

if (process.argv.length > 1) {
    program.parse(process.argv);
}

const outputFilter = (html) => `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv-"X-UA-Compatible" content="IE=edge">
<title>${pkg.name}</title>
<meta name="description" content="">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="shortcut icon" href="favicon.ico">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/normalize/5.0.0/normalize.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.7/css/bootstrap.min.css">
<style>
html, body {
    color: #222;
    font-family: Arial, Helvetica, sans-serif;
}
table.table {
    width: auto;
}
img {
    max-width: 100%;
}
</style>
</head>
<body>
    <nav class="navbar navbar-default" style="margin-bottom: 0">
        <div class="container-fluid">
            <div class="navbar-header">
                <button type="button" class="navbar-toggle collapsed" data-toggle="collapse" data-target="#bs-example-navbar-collapse-1" aria-expanded="false">
                    <span class="sr-only">Toggle navigation</span>
                    <span class="icon-bar"></span>
                    <span class="icon-bar"></span>
                    <span class="icon-bar"></span>
                </button>
                <a
                    class="navbar-brand"
                    href="https://cnc.js.org"
                    style="padding: 5px 10px">
                    <img src="logo.png" style="width: 40px; height: 40px">
                </a>
            </div>
            <div class="navbar-right" style="margin: 0">
                <a
                    class="btn btn-default navbar-btn"
                    href="https://github.com/cncjs/cncjs"
                >
                    <i class="fa fa-github fa-fw" style="font-size: 16px"></i>
                    GitHub
                </a>
            </div>
        </div>
    </nav>
    <div class="container-fluid">
        ${html}
    <div>
</body>
</html>
`;
let config = {};
const extensions = [
    {
        type: 'output',
        filter: (html, converter, options) => {
            html = html.replace(/<table>/g, '<table class="table">');
            return outputFilter(html);
        }
    }
];

if (program.config) {
    config = Object.assign(require(path.resolve(program.config)));
}

const converter = new showdown.Converter(Object.assign({}, config, {
    extensions: extensions
}));

if (!program.input) {
    let text = '';
    process.stdin.on('data', (data) => {
        text += data;
    });
    process.stdin.on('end', () => {
        const html = converter.makeHtml(text);
        program.output
            ? fs.writeFileSync(program.output, html, 'utf8')
            : process.stdout.write(html);
    });
} else {
    const text = fs.readFileSync(program.input, 'utf8');
    const html = converter.makeHtml(text);
    program.output
        ? fs.writeFileSync(program.output, html, 'utf8')
        : process.stdout.write(html);
}
