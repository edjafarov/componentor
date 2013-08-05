var git = require('../../gitUtils.js')
var fs = require('fs-extra');
var util = require('util');
var _ = require('underscore');
var moment = require('moment');
var bower = require('bower');
var spawn = require('child_process').spawn;

module.exports = function(config){
  //check files exists
  //last commit time
  var origin = config.dir + "/origin/";
  var destination = config.dir + "/destination/";
  return {
    process: function(sha, cb){
      
      var pkg ={
        "name": "jquery",
        "description": "JavaScript library for DOM operations",
        "homepage": "http://jquery.com",
        "author": "jQuery Foundation and other contributors",
        "repository": {
          "type": "git",
          "url": "https://github.com/jquery/jquery.git"
        },
        "version": sha.version,
        "main": "index.js",
        "scripts": [
          "index.js"
        ]
      }
      var install = bower.commands.install();
      install.on('log',function(data){console.log(data)})
      install.on('error',function(data){console.log(data)})
      install.on('end', sizzleDone);
     
      function sizzleDone(){
        npm(["install"],{cwd: origin, uid:0}, packagesInstalled);
      }

      function packagesInstalled(){
        console.log("PKGINST");
      }
      /*
        fs.copy(origin + 'dist/jquery.js', destination + "index.js", function(){
          fs.outputJson(destination + "component.json", pkg, cb) 
        });
*/
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

