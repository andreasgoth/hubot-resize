// Description
//   Resize images
//
// Configuration:
//   HUBOT_RESIZE_SERVER_URL
//
// Notes:
//   Install imagemagic, glhf ¯\_(ツ)_/¯
//
// Author:
//   Andreas Göth <a@hrhr.se>

var fs = require('fs');
var mkdirp = require('mkdirp');
var request = require('request');
var gm = require('gm').subClass({imageMagick: true});

function getFilenameFromUrl(url) {
  return url.match(/(?=\w+\.\w{3,4}$).+/)[0];
}

module.exports = function(robot) {

  var resize_size = process.env.HUBOT_RESIZE_DEFAULT_SIZE
  var urlRegex = /resize-(https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*))/

  robot.hear(urlRegex, function(res) {

    var filename = getFilenameFromUrl(res.match[1]);
    var download = function(uri, filename, callback) {
      request.head(uri, function(err, res, body){
        request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
      });
    };

    mkdirp('/tmp/hubot/resize/tmp/', function(err) {
      if (err) {
        console.error(err);
      } else {
        download(res.match[1], '/tmp/hubot/resize/tmp/' + filename, function() {
          var resizedImg = gm('/tmp/hubot/resize/tmp/' + filename).resize(150, 150)
          resizedImg.write('/tmp/hubot/resize/' + filename, function () {
            return res.send(process.env.HUBOT_RESIZE_SERVER_URL + '/hubot/resize/' + filename);
          });
        })
      }
    });
  });

  robot.router.get('/hubot/resize/:key', function(req, res) {
    var tmp = path.join('/tmp/hubot/resize/', req.params.key);
    return fs.exists(tmp, function(exists) {
      if (exists) {
        return fs.readFile(tmp, function(err, data) {
          res.writeHead(200);
          return res.end(data);
        });
      } else {
        return res.status(404).send('Not found');
      }
    });
  });

};
