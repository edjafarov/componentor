var contextify = require('contextify');
var fs = require('fs-extra');
module.exports = function(config){
  var destination = config.dir + "/destination/";
  return {
    run: function(cb){
      var source = fs.readFileSync(destination + "index.js");
      var modulesReq = {};
      var sandbox = {
        module:{
          exports:{}
        },
        require: function(module){
          modulesReq[module] = true;
          return {extend:function(){}, each:function(){},bindAll:function(){}}
        }
      }
      sandbox.exports = sandbox.module.exports;
      contextify(sandbox);
      sandbox.run(source.toString());
      if(!sandbox.exports.VERSION){
        return cb(new Error('couldnt find VERSION in exports test failed'));
      }
      if(!modulesReq['underscore']){
        return cb(new Error('underscore was not required as rependency'));
      }
      return cb();
    }
  }
}
