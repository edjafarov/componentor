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
        that.getAllSha('origin',null, gotOrigSha);
      })
    }else{
      this.cloneRepo('origin', null, function(){
        that.getAllSha('origin',null, gotOrigSha);
      })
    }
    function gotOrigSha(origCommitsArray){
      origCommitsArray =  _(origCommitsArray.split("\n")).without("");
      if(checkLocalRepo('destination')){
        that.pullRepo('origin', 'destination', function(){
          that.getAllSha('destination','{--%B--}', gotDestSha);
        })
      }else{
        that.cloneRepo('destination', null, function(){
          that.getAllSha('destination','{--%B--}', gotDestSha);
        })
      }
      function gotDestSha(destCommitsArray){
        destCommitsArray = destCommitsArray.split(/[\n]commit\s/);
        destCommitsArray = destCommitsArray.map(function(commit){
          if(/cherry picked from commit ([^\)]*)/.test(commit)){
            return commit.match(/cherry picked from commit ([^\)]*)/)[1];
          }
          return commit.split("\n")[0].replace("commit ","");
        });
        cb([origCommitsArray, destCommitsArray, _.difference(origCommitsArray, destCommitsArray)]);
      }
    }
  }

  this.prepareRepo = function(diff, cb){
    //cleanup
    if(checkLocalRepo('working')){
      repoExists()
    }else{
      this.cloneRepo('origin', 'working', repoExists)
    }
    function repoExists(){
      that.addRemote('working', 'destination', remoteAdded);
    }
    function remoteAdded(){
      that.fetchFrom('destination','working', dataFetched);
    }
    function dataFetched(){
      that.resetHardTo('destination/master', 'working', repoIsReseted);
    }
    function repoIsReseted(){
      console.log("PREPARATION DONE");
      cb();
    }
  }

  this.validate = function(sha, cb){
    if(!this.validator) return cb();
    this.validator(this.config).validate(sha, function(valid){
      if(valid) return cb();
      if(!that.processor) throw new Error('current revision is invalid - and couldnt process');
      that.processor(that.config).process(cb)
    });
  }

  this.getASha = function(sha,inDir, cb){
    if(!inDir) inDir = 'working';
    console.log(util.format("cherry-pick %s %s", inDir, sha));
    git.exec(['cherry-pick','-x', sha], {cwd: this.config.dir + "/" + inDir}, done);
    function done(err){
      cb(sha);
    }
  }

  this.applySha = function(cb){
    this.push('destination','working' ,cb);
  }

  this.resetHardTo = function(orig, inDir ,cb){
    console.log('reset --hard to ' + orig);
    git.exec(["reset","--hard", orig], {cwd: this.config.dir + "/" + inDir}, cb)
  }

  this.push = function(orig, inDir ,cb){
    console.log('push ' + orig);
    git.exec(["push", orig], {cwd: this.config.dir + "/" + inDir}, cb)
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
  console.log(diff[0].length, diff[1].length, diff[2].length)
  current.prepareRepo(diff, repoPrepared);
});

function repoPrepared(){
  var diff = repoDiff[2];
  //console.log(repoDiff);
  //var sha = diff[diff.length - 1];
  diff.reverse();
  async.eachSeries(diff, applyOneSha, function(){
    console.log("DONEALL");
  })
}
function applyOneSha(sha, cb){
  current.getASha(sha, null, gotSha);
  function gotSha(sha){
    current.validate(sha, validated);
  }

  function validated(){
    current.applySha(shaApplied)
  }

  function shaApplied(){
    console.log("SHA applied");
    cb();
  }
}
/*
function project(config){
  this.config = config;
}


project.prototype.checkLocalRepo = function(type){
  return fs.existsSync(this.config.dir + "/" + type);
}
project.prototype.cloneRepo = function(type, cb){
  if(!this.config[type]) throw new Error('config ' + type +' has no repo');
  console.log(util.format("clone %s %s",this.config[type], type));
  git.exec(["clone", this.config[type], type], {cwd: this.config.dir}, cb)
}
project.prototype.getHeadSha = function(type,cb){
  console.log(util.format("rev-parse HEAD %s", type));
  git.exec(["rev-parse","HEAD"], {cwd: this.config.dir + "/" + type}, gotHead);
  function gotHead(data){
    cb(data);
  }

}
project.prototype.getAllSha = function(type, cb){
  //git rev-list --all --after="2012-09-27 13:37" before timestamp
  console.log(util.format("getAllSha %s %s", type));
  git.exec(['rev-list','--all','--after="' + moment().subtract('years',1).format("YYYY-MM-DD h:mm") +'"'], {cwd: this.config.dir + "/" + type}, gotShaData);
  function gotShaData(data){
    cb(data.split("\n"));
  }
}

project.prototype.resetToSha = function(type,sha,cb){
  console.log(util.format("reset --hard %s %s", type, sha));
  git.exec(['reset','--hard', sha], {cwd: this.config.dir + "/" + type}, done);
  function done(err){
    cb();
  }
}

project.prototype.cherryPickSha = function(type,sha,cb){
  console.log(util.format("cherry-pick %s %s", type, sha));
  git.exec(['cherry-pick', sha], {cwd: this.config.dir + "/" + type}, done);
  function done(err){
    cb();
  }
}

project.prototype.push = function(type,cb){
  console.log(util.format("push %s", type));
  git.exec(['push', type,'master'], {cwd: this.config.dir + "/" + type}, done);
  function done(err){
    cb();
  }
}
project.prototype.addRemote = function(type, remote, cb){
  console.log(util.format("add remote %s", type));
  git.exec(['remote', type,'master'], {cwd: this.config.dir + "/" + type}, done);
  function done(err){
    cb();
  }
}
*/
/*
var commitIds, head;

if(current.checkLocalRepo('origin')){
  current.getAllSha('origin', gotAllRevSha);
}else{
  current.cloneRepo('origin', function(err, stderr, stdout){
    current.getAllSha('origin', gotAllRevSha);
  })
}

function gotAllRevSha(arr){
  commitIds = _(arr).without("");

  if(current.checkLocalRepo('destination')){
    current.getHeadSha('destination', gotHeadSha);
  }else{
    current.cloneRepo('destination', function(err, stderr, stdout){
      current.getHeadSha('destination', gotHeadSha);
    })
  }

}

function gotHeadSha(arr){
  head = arr;
  var index = _(commitIds).indexOf(head);
  if(!!~index){
    commitIds = commitIds.slice(0, index - 1);
  }
}
/*
function (commitId){
  current.resetTo()
}
*/

/*
var dest = current.getRepo('destination');

var destHeadSha = current.getHeadSha('destination');
var allOrigSha = current.getAllSha('origin');

function isEmpty(dir){
  console.log(readdirSync(dir));
}
*/
// create temporary folders for origin and target
// if they are created - pull both
// get HEAD commit id of target
// get all commitids from origin
// form list of commits to be verified and updated
// pull each commit and verify it
// if verification fails, process it and verify again
// if processing works out - commit and push to target
// if it fails - mail out about failure 
// and do not update the package untill forced