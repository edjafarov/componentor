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
      var filename = origin + "src/css.js";
      var pkg ={
        "name": "jqcomp/css",
        "description": "JavaScript library for DOM operations",
        "homepage": "http://jquery.com",
        "author": "jQuery Foundation and other contributors",
        "repository": {
          "type": "git",
          "url": "https://github.com/jquery/jquery.git"
        },
        "version": sha.version,
        "dependencies":{
          "jqcomp/core": sha.version
        },
        "main": "index.js",
        "scripts": [
          "index.js"
        ]
      }
      var src = [injectVarsFromDep([origin + "src/core.js"],fs.readFileSync(filename))];

      src.unshift("var jQuery = require('jqcomp/core')");
      src.push("module.exports = jQuery;");
      src = src.join("\n");
      fs.writeFile(destination + "index.js", src, function(){
        fs.outputJson(destination + "component.json", pkg, cb)
      });
    }
  }
}

function injectVarsFromDep(depsfiles, src){
  src = src.toString();
  var varCommon = "";
  depsfiles.forEach(function(depfile){
    var depsrc = fs.readFileSync(depfile).toString();
    var vars = depsrc.match(/\n\t([^=\n\t\(]+)\s=\s([^\n]+)./g);
    vars.forEach(function(v){
      var varmix = v.match(/\n\t([^=\n\t\(]+)\s=\s([^\n]+)./);
      if(varmix && !!~src.indexOf(varmix[1]) && varmix[1] !== 'jQuery' && !~varmix[2].indexOf("function") && !~varmix[2].indexOf("var ")){
        varCommon += "var " + varmix[1] + " = " + varmix[2] + ";"
      }
    });
  })
  return varCommon + "\n" + src;
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
