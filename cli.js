#! /usr/bin/env node

var fs = require('fs');

var SOCKET_PATH = '/var/s-cockpit/';
var SOCKET_FILE = 'log.socket';
var SOCKET_FILE_PATH = SOCKET_PATH + SOCKET_FILE;

var SERVER_HOST = 's-cockpit.net';
var SERVER_PORT = '21001';

var argv = require('minimist')(process.argv.slice(2));

if(argv._.length === 0) {
  fs.createReadStream(__dirname + '/cli-usage.txt').pipe(process.stdout);
  return;
}

if(argv._.length !== 1 || argv._[0] !== 'start') {
  console.log('Invalid argument', argv._[0]);
  return process.exit(1);
}

var sCockpitConfig = {
  socket: argv.socket || SOCKET_FILE_PATH,
  server: {
    host: argv.host || SERVER_HOST,
    port: argv.port || SERVER_PORT
  }
};

var SCockpit = require(__dirname + '/index.js');
var sCockpitInstance = new SCockpit(sCockpitConfig);

sCockpitInstance.listen(function () {});

process.on('SIGINT', function() {
  process.exit();
});

process.on('exit', function () {
  sCockpitInstance.close();
});
