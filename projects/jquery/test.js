var contextify = require('contextify');
var fs = require('fs-extra');
var jsdom = require('jsdom');
module.exports = function(config){
  var destination = config.dir + "/destination/";
  return {
    run: function(cb){
      var source = fs.readFileSync(destination + "index.js");
      var modulesReq = {};
      var before = "window.module = module = {exports:{}}"
      jsdom.env({html:"<html><head></head><body></body></html>",src:[before, source],
        done: function(err, window){
          if(!window.module || typeof(window.module.exports) != 'function'){
            return cb(new Error('fail to find module exports'));
          }
          return cb();
        }
      })
    }
  }
}
