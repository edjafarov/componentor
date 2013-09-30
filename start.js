var git = require('./gitUtils.js')
var fs = require('fs');
var util = require('util');
var _ = require('underscore');
var moment = require('moment');
var async = require('async');
var log = require('winston');
log = console;
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
 
  if(this.config.test){
    this.test = require(this.config.dir + "/" + this.config.test);
  }
  
  var that = this;

  function checkLocalRepo(type){
    return fs.existsSync(that.config.dir + "/" + type);
  }
  /*
  * returns difference between origin and destination tags
  */
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
          if(that.config.ignore && !!~that.config.ignore.indexOf(tag.version)){
            return true;
          }
          return !!_(destTagsArray).findWhere({ version: tag.version});
        });
        cb([origTagsArray, destTagsArray, diff]);
      }
    }
  }

  this.validate = function(sha, cbtrue, cbfalse){
    if(!this.validator) return cbfalse();
    this.validator(this.config).validate(sha, function(valid){
      if(!valid) return cbfalse();
      if(!that.processor) throw new Error(' no processor to process ');
      that.processor(that.config).process(sha, processed);
    });
    function processed(err){
      if(err) return cbtrue(err);
      if(that.test) {
        return that.test(config).run(cbtrue);
      }
      cbtrue();
    }
  }

  this.getASha = function(sha,inDir, cb){
    if(!inDir) inDir = 'origin';
    log.info(util.format("get to ver %s in  %s", sha.version, inDir));
    git.exec(['reset','--hard', sha.version], {cwd: this.config.dir + "/" + inDir}, done);
    function done(err){
      that.submoduleUpdate(inDir, function(){
        cb(sha);
      })
    }
  }

  this.applySha = function(ver, cb){
    this.commitAndTag('destination',ver ,function(){
      that.push('origin','destination' ,cb);
    });
  }


  this.commitAndTag = function(inDir,ver ,cb){
    log.info(util.format("git add all files in ", inDir));
    git.exec(["add", "."], {cwd: this.config.dir + "/" + inDir}, function(){
      log.info(util.format("commit files of %s version", ver.version));
      git.exec(["commit", "-am", ver.date+'  version:'+ ver.version], 
      {cwd: that.config.dir + "/" + inDir}, committed)
    })
    function committed(){
      log.info(util.format("tag files of %s version", ver.version));
      git.exec(["tag", "-a",ver.version,"-m",ver.date+'" version:"'+ ver.version], 
      {cwd: that.config.dir + "/" + inDir}, cb);
    }
  }


  this.resetHardTo = function(orig, inDir ,cb){
    log.info(util.format("reser %s to %s", inDir, orig));
    git.exec(["reset","--hard", orig], {cwd: this.config.dir + "/" + inDir}, cb)
  }

  this.push = function(orig, inDir ,cb){
    log.info(util.format("push %s to %s", inDir, orig));
    git.exec(["push", orig], {cwd: this.config.dir + "/" + inDir}, function(){
      git.exec(["push", orig, "--tags"], {cwd: that.config.dir + "/" + inDir}, cb)
    })
  }

  this.getAllTags = function(type,cb){
    log.info(util.format("get tags for %s", type));
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
        var ver = parsed[2].match(/(\d+\.\d+\.\d+)/);
        if (!ver) return null;
        return {date: parsed[1], version: ver[1]}
      })
      cb(_(data).without(null));
    }
  }

  this.submoduleInit = function(toDir, cb){
    log.info(util.format("submodule init %s", toDir));
    git.exec(["submodule", "init"], {cwd: this.config.dir + "/" + toDir}, cb)
  }

  this.submoduleUpdate = function(toDir, cb){
    log.info(util.format("submodule update %s", toDir));
    git.exec(["submodule", "update", "--init","--recursive"], {cwd: this.config.dir + "/" + toDir}, cb)
  }



  this.cloneRepo = function(type, toDir, cb){
    if(!this.config[type]) throw new Error('config ' + type +' has no repo');
    log.info(util.format("clone %s %s",this.config[type], type));
    git.exec(["clone", this.config[type], toDir||type], {cwd: this.config.dir}, function(){
      that.submoduleInit(toDir||type, cb);
    })
  }

  this.pullRepo = function(type, toDir, cb){
    if(!this.config[type]) throw new Error('config ' + type +' has no repo');
    log.info(util.format("pull %s %s", type, this.config.dir + "/" + toDir||type));
    git.exec(["reset", "--hard","HEAD"], {cwd: this.config.dir + "/" + (toDir||type)}, function(){
      git.exec(["pull", type], {cwd: that.config.dir + "/" + (toDir||type)}, cb)
    });
  }
}
var directories = fs.readdirSync(__dirname + '/projects');

async.eachSeries(directories, doProject, function(err){
  if(err) throw new Error(err);
  console.log("PROJECTS DONE");
});
//doProject('jquery-ajax-xhr')

function doProject(d, done){
  var dir = __dirname + "/projects/" + d;
  var config = require(dir);
  config.dir = dir;
  var current = new library(config);

  var repoDiff;

  current.getDifference(function(diff){
    repoDiff = diff;
    log.info(util.format("origin: %s, destination: %s, difference: %s", diff[0].length, diff[1].length, diff[2].length));
    diff = diff[2];
    diff.reverse();
    async.eachSeries(diff, applyOneVer, function(err){
      if(err) return log.error(err);
      log.info("All updates done");
      done();
    })
  });


  function applyOneVer(ver, cb){
    current.getASha(ver, null, gotSha);
    function gotSha(ver){
      current.validate(ver, valid, notvalid);
      function valid(err){
        if(err) return cb(err);
        current.applySha(ver, shaApplied)
      }
      function notvalid(){
        log.info(util.format("version %s PASSED", ver.version));
        cb();
      }
    }
    function shaApplied(err){
      if(err){
        return log.error(err);
      }
      log.info(util.format("version %s APPLIED", ver.version));
      cb();
    }
  }
}

//curl -u 'edjafarov' https://api.github.com/orgs/bscomp/repos -d '{"name":"test"}'
/*
git push --tags origin && \
git tag | xargs -n1 git tag -d && \
git fetch --tags*/
