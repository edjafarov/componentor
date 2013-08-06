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
        fs.readJson(origin + "package.json", pkgRead);
        function pkgRead(err, pkg){
          for (var dep in pkg.devDependencies){
            var ver = pkg.devDependencies[dep];
            var specific = pkg.devDependencies[dep].replace(/[><=]/,"");
            if(specific){
              ver = specific;
            }
            pkg.devDependencies[dep]=ver;
          }
          fs.writeJson(origin + "package.json", pkg, pkgDone);
        }
        function pkgDone(){
          npm(["install"],{cwd: origin}, packagesInstalled);
        }
      }

      function packagesInstalled(){
        grunt(['selector','build'], {cwd: origin}, patchJquery);
        function patchJquery(){
          fs.readFile(origin + 'dist/jquery.js', function(err, data){
            var newJquery = data.toString().replace(/\nwindow.jQuery = .+?\n/,"\nmodule.exports = jQuery;\n");
            fs.outputFile(origin + 'dist/jquery.js', newJquery, jqueryPatched);
          });
        }
      }

      function jqueryPatched(){
        fs.copy(origin + 'dist/jquery.js', destination + "index.js", function(){
          fs.outputJson(destination + "component.json", pkg, function(){
            fs.remove(origin + 'dist', function(){
              fs.remove(origin + 'node_modules', cb);
            });
          })
        });
      }
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
