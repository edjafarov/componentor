var git = require('../../gitUtils.js')
var fs = require('fs-extra');
var util = require('util');
var _ = require('underscore');
var moment = require('moment');
var bower = require('bower');
var spawn = require('child_process').spawn;
var async = require('async');

module.exports = function(config){
  //check files exists
  //last commit time
  var origin = config.dir + "/origin/";
  var destination = config.dir + "/destination/";
  return {
    process: function(sha, cb){
      var filename = origin + "src/ajax.js";
      var pkg ={
        "name": "jquerycomp/ajax",
        "description": "JavaScript library for DOM operations",
        "homepage": "http://jquery.com",
        "author": "jQuery Foundation and other contributors",
        "repository": {
          "type": "git",
          "url": "https://github.com/jquery/jquery.git"
        },
        "version": sha.version,
        "dependencies":{
          "jquerycomp/jquery-core": sha.version
        },
        "main": "index.js",
        "scripts": [
          "index.js"
        ]
      }
      var src = [fs.readFileSync(filename)];
      src.unshift("var jQuery = require('jquery-core')");
      src.push("module.exports = jQuery;");
      src = src.join("\n");
      fs.writeFile(destination + "index.js", src, function(){
        fs.outputJson(destination + "component.json", pkg, cb)
      });
    }
  }
}


function npm(cmd, options, cb){
  var git = spawn('npm', cmd, options);
  var output = "";
  git.stdout.on('data', function (data) {
      output+=data;
      //console.log('stdout: ' + data);
  });

  git.stderr.on('data', function (data) {
      console.log('stderr: ' + data);
  });

  git.on('close', function (code) {
//        console.log('child process exited with code ' + code);
      cb(output)
  });
}

function grunt(cmd, options, cb){
  var git = spawn('node', ['../../../node_modules/.bin/grunt'].concat(cmd), options);
  var output = "";
  git.stdout.on('data', function (data) {
      output+=data;
//      console.log('stdout: ' + data);
  });

  git.stderr.on('data', function (data) {
      console.log('stderr: ' + data);
  });

  git.on('close', function (code) {
 //       console.log('child process exited with code ' + code);
      cb(output)
  });
}