var webappengine = require('webappengine');
var cncserver = require('./dist/app/cncserver');

module.exports = function(options) {
    webappengine(options)
        .on('ready', cncserver);
};
