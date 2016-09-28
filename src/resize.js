// Description
//   Resize images
//
// Configuration:
//   HUBOT_RESIZE_SERVER_URL
//   HUBOT_RESIZE_DEFAULT_SIZE
//
// Notes:
//   Install imagemagic, glhf ¯\_(ツ)_/¯
//
// Author:
//   Andreas Göth <a@hrhr.se>
'use strict'

var fs = require('fs');
var path = require("path");
var mkdirp = require('mkdirp');
var request = require('request');
var crypto = require('crypto');
var gm = require('gm').subClass({imageMagick: true});

module.exports = function(robot) {

  const urlRegex = /resize.+(https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b(?:[-a-zA-Z0-9@:%_\+.~#?&\/=]*)).?\s?(\d.+)?/;
  const defaultSize = process.env.HUBOT_RESIZE_DEFAULT_SIZE
  const serverUrl = process.env.HUBOT_RESIZE_SERVER_URL
  const tmpFolder = '/tmp/hubot/resize/tmp/';
  const outputFolder = '/tmp/hubot/resize/';
  const serverPath = '/hubot/resize/';

  function getFileExt(filename) {
    return filename.split('.').pop();
  }

  robot.hear(urlRegex, function(res) {
    let imageUrl = res.match[1];
    let sizeArg = res.match[2]
    let maxSize = (typeof sizeArg === 'undefined') ? defaultSize : sizeArg;
    let fileExt = '.' + getFileExt(imageUrl);

    // Create folder
    mkdirp(tmpFolder, function(err) {
      if (err) {
        console.error(err);
        return;
      }

      // Download to tmp
      let urlHash = crypto.createHash('md5').update(imageUrl).digest("hex");
      let newFilename = urlHash + '_' + maxSize + fileExt;
      let outputTo = tmpFolder + newFilename;
      request(imageUrl)
      .pipe(fs.createWriteStream(outputTo))
      .on('close', function() {

        // Resize image
        let resizedImg = gm(tmpFolder + newFilename).coalesce().resize(maxSize, maxSize);
        resizedImg.write(outputFolder + newFilename, function(err) {

          // Send path
          res.send(serverUrl + serverPath + newFilename);
        });
      });
    });
  });

  // Serve images
  robot.router.get(serverPath+':key', function(req, res) {
    var tmp = path.join(outputFolder, req.params.key);
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
