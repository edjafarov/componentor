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
         "name"          : "underscore",
         "description"   : "JavaScript's functional programming helper library.",
         "homepage"      : "http://documentcloud.github.com/underscore/",
         "keywords"      : ["util", "functional", "server", "client", "browser"],
         "author"        : "Jeremy Ashkenas <jeremy@documentcloud.org>",
         "repository"    : {"type": "git", "url": "git://github.com/documentcloud/underscore.git"},
         "version"       : sha.version,
         "scripts"       : ["index.js"]
      }
      
      if(fs.existsSync(origin + "package.json")){
        var packageJson = require(origin + "package.json");
      }
      if(!fs.existsSync(origin + "underscore.js")) return cb(new Error('no underscore.js found'))
      fs.copy(origin + 'underscore.js', destination + "index.js", function(){
        fs.outputJson(destination + "component.json", pkg, cb) 
      });
    }
  }
}
