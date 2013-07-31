var spawn = require('child_process').spawn;

module.exports = {
  exec: function(cmd, options, cb){
    var git = spawn('git', cmd, options);
    var output = "";
    git.stdout.on('data', function (data) {
        output+=data;
        //console.log('stdout: ' + data);
    });

    git.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
    });

    git.on('close', function (code) {
        console.log('child process exited with code ' + code);
        cb(output)
    });
  },
  syncBackTime:function(){
    //sync back exact time
    //get rev
  },
  getRefsToHead: function(){
    //git rev-list --all
  },
  syncToRef: function(){}
}