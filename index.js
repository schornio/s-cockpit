'use strict';
/* jslint node: true */

var LOG_ENTRY_SEPERATOR = '\n';

var net = require('net');
var fs = require('fs');
var winston = require('winston');

var JSONStream = require('JSONStream');
var eventStream = require('event-stream');

var log = initLog();

function SCockpit(config) {
  this.config = config;
}

SCockpit.prototype.listen = function (callback) {
  log.info('Initialize ...');

  var config = this.config;

  var sCockpitSocket = this.sCockpitSocket = net.createServer();
  var sCockpitServer = this.sCockpitServer = net.connect(config.server.port, config.server.host);

  sCockpitSocket.on('connection', function (connection) {
    var connectionId = guid();
    log.info('Client connected. Id: %s', connectionId);

    var extendLogEntryStream = eventStream.mapSync(function (logEntry) {
      logEntry.cid = connectionId;
      return logEntry;
    });

    connection
      .pipe(JSONStream.parse())
      .pipe(extendLogEntryStream)
      .pipe(JSONStream.stringify(LOG_ENTRY_SEPERATOR, LOG_ENTRY_SEPERATOR, LOG_ENTRY_SEPERATOR))
      .pipe(sCockpitServer);
  });

  sCockpitSocket.listen(config.socket, function () {
    log.debug('Listen to socket "%s"', config.socket);


    fs.chmod(config.socket, '622', function () {
      log.debug('Socket permissions changed to 622');

      log.info('Initialized');
      callback();
    });

  });
};

SCockpit.prototype.close = function () {
  this.sCockpitSocket.close();
  log.debug('Socket closed');

  this.sCockpitServer.destroy();
  log.debug('Server connection closed');

  log.info('Closed');
};

function guid() {
  // http://stackoverflow.com/a/2117523
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
  });
}

/* istanbul ignore next */
function initLog() {
  return new winston.Logger({
      transports: [
        new winston.transports.Console({ level: process.env.LOG_LEVEL || 'info', colorize: true })
      ]
    });
}

module.exports = SCockpit;
