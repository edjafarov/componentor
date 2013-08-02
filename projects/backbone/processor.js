var git = require('../../gitUtils.js')
var fs = require('fs-extra');
var util = require('util');
var _ = require('underscore');
var moment = require('moment');


module.exports = function(config){
  //check files exists
  //last commit time
  var origin = config.dir + "/origin/";
  var destination = config.dir + "/destination/";
  return {
    process: function(sha, cb){
      
      var pkg ={
        "name": "backbone",
        "description": "Give your JS App some Backbone with Models, Views, Collections, and Events.",
        "homepage": "http://backbonejs.org/",
        "keywords": ["model", "view", "controller", "router", "server", "client", "browser"],
        "author": "Jeremy Ashkenas <jeremy@documentcloud.org>",
        "repository": {
          "type": "git",
          "url": "git://github.com/jashkenas/backbone.git"
        },
        "dependencies": {
          "edjafarov/underscore": "1.4.4"
        },
        "version": sha.version,
        "main": "index.js",
        "scripts": [
          "index.js"
        ]
      }
      
      if(fs.existsSync(origin + "package.json")){
        var packageJson = fs.readJsonSync(origin + "package.json");
        if(packageJson.dependencies && packageJson.dependencies.underscore){
          var ver = packageJson.dependencies.underscore.match(/([\d\.]+)/);
          pkg.dependencies['edjafarov/underscore'] = ver[1];
        }
      }
      fs.copy(origin + 'backbone.js', destination + "index.js", function(){
        fs.outputJson(destination + "component.json", pkg, cb) 
      });
    }
  }
}
