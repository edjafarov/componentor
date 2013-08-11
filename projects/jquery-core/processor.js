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
      
      var pkg ={
        "name": "jqcomp/core",
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
      var coreFiles = [
        "src/core.js",
        ["src/selector.js", "src/selector-sizzle.js"],
        "src/callbacks.js",
        "src/deferred.js",
        "src/support.js",
        "src/data.js",
        "src/queue.js",
        "src/attributes.js",
        "src/event.js",
        "src/traversing.js",
        "src/manipulation.js",
        "src/serialize.js"
      ].map(function(el){
        if(_(el).isArray()){
          return el.map(function(el){
            return origin + el;
          })
        }
        return origin + el;
      });


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
          npm(["install"],{cwd: origin}, function(){
            grunt(['selector'], {cwd: origin}, packagesInstalled);
          });
        }
      }

      function packagesInstalled(){
        function readFile(el, cb){
          if(_(el).isArray()){
            return _(el).find(function(file){
              if(fs.existsSync(file)){
                fs.readFile(file, cb);
                return true;
              }
            })
          }
          fs.readFile(el, cb);
        }
        async.mapSeries(coreFiles, readFile, function(err, results){
          results = _(results).map(function(el){
            return el.toString();
          })
          results.push("module.exports = jQuery;");
          var src = results.join("\n");
          fs.writeFile(destination + "index.js", src, function(){
            fs.outputJson(destination + "component.json", pkg, cb)
          });
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
