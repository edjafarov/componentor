var git = require('./gitUtils.js')
var fs = require('fs');
var util = require('util');
var _ = require('underscore');
var moment = require('moment');
var async = require('async');
// get all projects in folder
//get first

function library(config){
  this.config = config;

  if(this.config.validator){
    this.validator = require(this.config.dir + "/" + this.config.validator);
  }

  if(this.config.processor){
    this.processor = require(this.config.dir + "/" + this.config.processor);
  }
  
  var that = this;
  function checkLocalRepo(type){
    return fs.existsSync(that.config.dir + "/" + type);
  }

  this.getDifference = function(cb){
    if(checkLocalRepo('origin')){
      that.pullRepo('origin', null, function(){
        that.getAllTags('origin', gotOrigSha);
      })
    }else{
      this.cloneRepo('origin', null, function(){
        that.getAllTags('origin', gotOrigSha);
      })
    }
    function gotOrigSha(origTagsArray){
      if(checkLocalRepo('destination')){
        that.pullRepo('origin', 'destination', function(){
          that.getAllTags('destination', gotDestSha);
        })
      }else{
        that.cloneRepo('destination', null, function(){
          that.getAllTags('destination', gotDestSha);
        })
      }
      function gotDestSha(destTagsArray){
        var diff = _(origTagsArray).reject(function(tag){
          return !!_(destTagsArray).findWhere({ version: tag.version});
        });
        cb([origTagsArray, destTagsArray, diff]);
      }
    }
  }

  this.prepareRepo = function(diff, cb){
    console.log("PREPARATION DONE");
    cb();
  }

  this.validate = function(sha, cb){
    if(!this.validator) return cb();
    this.validator(this.config).validate(sha, function(valid){
      if(!valid) return cb("none");
      if(!that.processor) throw new Error(' no processor to process ');
      that.processor(that.config).process(sha, cb)
    });
  }

  this.getASha = function(sha,inDir, cb){
    if(!inDir) inDir = 'origin';
    console.log(util.format("get to ver %s %s", inDir, sha.version));
    git.exec(['reset','--hard', sha.version], {cwd: this.config.dir + "/" + inDir}, done);
    function done(err){
      cb(sha);
    }
  }

  this.applySha = function(ver, cb){
    this.commitAndTag('destination',ver ,function(){
      that.push('origin','destination' ,cb);
    });
  }


  this.commitAndTag = function(inDir,ver ,cb){
    git.exec(["add", "."], {cwd: this.config.dir + "/" + inDir}, function(){
      git.exec(["commit", "-am", ver.date+'" version:"'+ ver.version], 
      {cwd: that.config.dir + "/" + inDir}, committed)
    })
    function committed(){
      git.exec(["tag", "-a",ver.version,"-m",ver.date+'" version:"'+ ver.version], 
      {cwd: that.config.dir + "/" + inDir}, cb);

    }
  }


  this.resetHardTo = function(orig, inDir ,cb){
    console.log('reset --hard to ' + orig);
    git.exec(["reset","--hard", orig], {cwd: this.config.dir + "/" + inDir}, cb)
  }

  this.push = function(orig, inDir ,cb){
    console.log('push ' + orig);
    git.exec(["push", orig], {cwd: this.config.dir + "/" + inDir}, function(){
      git.exec(["push", orig, "--tags"], {cwd: that.config.dir + "/" + inDir}, cb)
    })
  }



  this.fetchFrom = function(orig, inDir ,cb){
    console.log('fetch ' + orig);
    git.exec(["fetch", orig], {cwd: this.config.dir + "/" + inDir}, cb)
  }

  this.getAllSha = function(type, pattern,cb){
    //git rev-list --all --after="2012-09-27 13:37" before timestamp
    console.log(util.format("getAllSha %s for a year", type));
    var query = ['rev-list',
    '--all'];
    pattern && query.push("--pretty=format:"+pattern);
    git.exec(
    query, 
    {
      cwd: this.config.dir + "/" + type
    },
    gotShaData);
    function gotShaData(data){
      cb(data);
    }
  }

  this.getAllTags = function(type,cb){
    //git log --tags --simplify-by-decoration --pretty="format:%ai %d"
    console.log(util.format("getAllTags for %s", type));
    var query = ['log',
    '--tags',
    '--simplify-by-decoration',
    '--pretty=%ai %d'];
    git.exec(
    query,
    {
      cwd: this.config.dir + "/" + type
    },
    gotShaData);
    function gotShaData(data){
      var data = _(data.split("\n")).without("");
      data = data.map(function(line){
        var parsed = line.match(/^([^\(]*)\s{2}\((.*)\)/);
        if (!parsed) return null;
        var ver = parsed[2].match(/([\d\.]*)/);
        if (!ver) return null;
        return {date: parsed[1], version: ver[1]}
      })
      cb(_(data).without(null));
    }
  }

  this.cloneRepo = function(type, toDir, cb){
    if(!this.config[type]) throw new Error('config ' + type +' has no repo');
    console.log(util.format("clone %s %s",this.config[type], type));
    git.exec(["clone", this.config[type], toDir||type], {cwd: this.config.dir}, cb)
  }
  this.pullRepo = function(type, toDir, cb){
    if(!this.config[type]) throw new Error('config ' + type +' has no repo');
    console.log(util.format("pull %s %s", type, this.config.dir + "/" + toDir||type));
    git.exec(["pull", type], {cwd: this.config.dir + "/" + (toDir||type)}, cb)
  }

  this.addRemote = function(toDir, remote, cb){
    console.log(util.format("add remote to  %s %s",toDir, remote));
    git.exec(["remote","add",remote, this.config[remote]], {cwd: this.config.dir + "/" + toDir}, cb);
  }
}


var dir = __dirname + "/projects/underscore";
var config = require(dir);
config.dir = dir;
var current = new library(config);

var repoDiff;
current.getDifference(function(diff){
  repoDiff = diff;
  console.log(diff[0].length, diff[1].length," difference: ", diff[2].length)
  current.prepareRepo(diff, repoPrepared);
});

function repoPrepared(){
  var diff = repoDiff[2];
  //console.log(repoDiff);
  //var sha = diff[diff.length - 1];
  diff.reverse();
  async.eachSeries(diff, applyOneVer, function(){
    console.log("DONEALL");
  })
}
function applyOneVer(ver, cb){
  current.getASha(ver, null, gotSha);
  function gotSha(ver){
    current.validate(ver, validated);
    function validated(result){
      if(result == "none") return shaApplied(result);
      current.applySha(ver, shaApplied)
    }
  }

  function shaApplied(result){
    if(result=="none") {console.log("SHA passed");}
    else{console.log("SHA applied");}
    cb();
  }
}
