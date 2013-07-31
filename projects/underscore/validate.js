var git = require('../../gitUtils.js')
var fs = require('fs');
var util = require('util');
var _ = require('underscore');
var moment = require('moment');

module.exports = function(config){
  //check files exists
  //last commit time
  return {
    validate: function(sha, cb){
      //git show -s --format=%ci 42362a274274e18bb03c840fc05bfdf6910c96f1
      getShaDate(sha, 'working', gotShaDate);
      function gotShaDate(date){
        if(moment().diff(moment(date), 'days') > 365){
          return cb(true);
        }
        cb(false);
      }
    }
  }
  
  function getShaDate(sha, toDir, cb){
    console.log(util.format("getting sha date %s %s", sha, config.dir + "/" + toDir||type));
    git.exec(["show", "-s", "--format=%ci", sha], {cwd: config.dir + "/" + toDir}, gotDateLine);
    function gotDateLine(dateLine){
      cb(new Date(dateLine));
    }
  }
}


