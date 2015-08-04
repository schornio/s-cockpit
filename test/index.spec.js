'use strict';
/* jslint node: true, exp:true */
/* global describe, it, beforeEach, afterEach */

process.env.LOG_LEVEL = 'off';

var SOCKET_PATH = __dirname + '/test.socket';
var SERVER_PORT = 1338;
var SERVER_HOST = '127.0.0.1';

var expect = require('chai').expect;
var net = require('net');
var fs = require('fs');

describe('s-cockpit', function () {
  var SCockpit = require(__dirname + '/../index.js');
  var sCockpitConfig = { socket: SOCKET_PATH, server: { host: SERVER_HOST, port: SERVER_PORT } };
  var fakeServer;
  var fakeServerInitialized;

  beforeEach(function (done) {
    fakeServerInitialized = false;
    fakeServer = initFakeServer(sCockpitConfig.server, done);
    fakeServer.on('listening', function () {
      fakeServerInitialized = true;
    });
    fakeServer.on('error', function () {
      fakeServerInitialized = false;
    });
  });

  afterEach(function () {
    if (fakeServerInitialized) {
      fakeServer.close();
    }
  });

  it('should listen to s-cockpit instances and pipe logs to server', function (done) {
    var sCockpitInstance = new SCockpit(sCockpitConfig);

    fakeServer.on('connection', function (connection) {
      connection.on('readable', function () {
        var chunkBuffer = connection.read();

        if(!chunkBuffer) {
          return;
        }

        var chunkString = chunkBuffer.toString();
        var chunkObject = JSON.parse(chunkString);

        expect(chunkObject.cs).to.be.equal('Hallo Welt');
        expect(chunkObject.cid).to.match(/.{8}-.{4}-.{4}-.{4}-.{12}/);

        sCockpitInstance.close();

        done();
      });
    });

    sCockpitInstance.listen(function () {
      var fakeClient = initFakeClient(sCockpitConfig.socket);
      fakeClient.write(JSON.stringify({ cs: 'Hallo Welt' }));
    });
  });

  it('should set socket access rights correctly', function (done) {
    var sCockpitInstance = new SCockpit(sCockpitConfig);
    sCockpitInstance.listen(function () {
      fs.stat(SOCKET_PATH, function (error, stat) {
        sCockpitInstance.close();
        expect(stat.mode.toString(8).substr(3)).to.be.equal('622');
        done();
      });
    });
  });

  it('should buffer chunk until JSON object is complete', function (done) {
    var sCockpitInstance = new SCockpit(sCockpitConfig);

    fakeServer.on('connection', function (connection) {
      connection.on('readable', function () {
        var chunkBuffer = connection.read();

        if(!chunkBuffer) {
          return;
        }

        var chunkString = chunkBuffer.toString();
        var chunkObject = JSON.parse(chunkString);

        expect(chunkObject.cs).to.be.equal('Hallo Welt');
        expect(chunkObject.cid).to.match(/.{8}-.{4}-.{4}-.{4}-.{12}/);

        sCockpitInstance.close();

        done();
      });
    });

    sCockpitInstance.listen(function () {
      var fakeClient = initFakeClient(sCockpitConfig.socket);
      var logString = JSON.stringify({ cs: 'Hallo Welt' });
      fakeClient.write(logString.substring(0, logString.length / 2));
      fakeClient.pause();
      setTimeout(function () {
        fakeClient.resume();
        fakeClient.write(logString.substring(logString.length / 2, logString.length));
      }, 0);
    });
  });

  it('should slice chunk into single JSON objects', function (done) {
    var sCockpitInstance = new SCockpit(sCockpitConfig);

    fakeServer.on('connection', function (connection) {
      connection.on('readable', function () {
        var chunkBuffer = connection.read();

        if(!chunkBuffer) {
          return;
        }

        var chunkString = chunkBuffer.toString();

        expect(chunkString).to.match(/\{"cs":"Hallo Welt","cid":".{8}-.{4}-.{4}-.{4}-.{12}"\}/);

        sCockpitInstance.close();

        done();
      });
    });

    sCockpitInstance.listen(function () {
      var fakeClient = initFakeClient(sCockpitConfig.socket);
      var logString = JSON.stringify({ cs: 'Hallo Welt' });
      fakeClient.write(logString + logString);
    });
  });

  it('should reduce buffer if possible', function (done) {
    var sCockpitInstance = new SCockpit(sCockpitConfig);

    fakeServer.on('connection', function (connection) {
      connection.on('readable', function () {
        var chunkBuffer = connection.read();

        if(!chunkBuffer) {
          return;
        }

        var chunkString = chunkBuffer.toString();

        expect(chunkString).to.match(/\{"cs":"Hallo Welt","cid":".{8}-.{4}-.{4}-.{4}-.{12}"\}/);

        sCockpitInstance.close();

        done();
      });
    });

    sCockpitInstance.listen(function () {
      var fakeClient = initFakeClient(sCockpitConfig.socket);
      var logString = JSON.stringify({ cs: 'Hallo Welt' });
      fakeClient.write(logString);
      fakeClient.write(logString.substring(0, logString.length / 2));
      fakeClient.pause();
      setTimeout(function () {
        fakeClient.resume();
        fakeClient.write(logString.substring(logString.length / 2, logString.length));
      }, 0);
    });
  });

  function initFakeServer(server, callback) {
    var fakeServer = net.createServer(server.host);
    fakeServer.listen(server.port, callback);
    return fakeServer;
  }

  function initFakeClient(socket) {
    var fakeClient = net.connect(socket);
    return fakeClient;
  }

});
