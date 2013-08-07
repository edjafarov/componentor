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
      if(moment().diff(moment(sha.date), 'days') > 365){
        return cb(false);
      }
      cb(true);
    }
  }
}


