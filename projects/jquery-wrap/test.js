var contextify = require('contextify');
var fs = require('fs-extra');
var jsdom = require('jsdom');
module.exports = function(config){
  var destination = config.dir + "/destination/";
  return {
    run: function(cb){
      var source = fs.readFileSync(destination + "index.js");
      return cb();      
      var modulesReq = {};
      var before = "window.module = module = {exports:{}, required:{}};function require(mod){module.required[mod]=true; return {extend:function(){},fn:{extend:function(){}}}};"
      jsdom.env({html:"<html><head></head><body></body></html>",src:[before, source],
        done: function(err, window){
          if(err) return cb(new Error(err))
          if(!window.module || typeof(window.module.exports.fn) != 'object'){
            return cb(new Error('fail to find module exports'));
          }
          if(!window.module.required['jquery-core']){
            return cb(new Error('jQuery is not required properly'));
          }
          return cb();
        }
      })
    }
  }
}
