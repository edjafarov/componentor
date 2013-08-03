var contextify = require('contextify');
var fs = require('fs-extra');
module.exports = function(config){
  var destination = config.dir + "/destination/";
  return {
    run: function(cb){
      var source = fs.readFileSync(destination + "index.js");
      var sandbox = {
        module:{
          exports:{}
          }
      }
      sandbox.exports = sandbox.module.exports;
      contextify(sandbox);
      sandbox.run(source.toString());
      if(!sandbox.exports.VERSION){
        return cb(new Error('couldnt find VERSION in exports test failed'));
      }
      return cb();
    }
  }
}
