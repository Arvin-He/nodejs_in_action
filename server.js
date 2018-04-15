var http = require('http');
var fs = require('fs');
var path = require('path');
var mime = require('mime');
var cache = {};


function send404(response) {
    response.writeHead(404, {'Content-Type': 'text/plain'});
    response.write('Error 404: resource not found.');
    response.end();
}


function sendFile(response, filePath, fileContents) {
    response.writeHead(200, {"content-type": mime.lookup(path.basename(filePath))});
    response.end(fileContents);
}


function serveStatic(response, cache, absPath) {
    if (cache[absPath]) {
        sendFile(response, absPath, cache[absPath]);
    } else {
        fs.exists(absPath, function(exists) {
            if (exists) {
                fs.readFile(absPath, function(err, data) {
                    if (err) {
                        send404(response);
                    } else {
                        cache[absPath] = data;
                        sendFile(response, absPath, data)
                    }
                });
            } else {
                send404(response);
            }
        });
    }
}

// 创建http服务
var server = http.createServer(function(request, response) {
    var filePath = false;

    if (request.url === '/') {
        filePath = 'public/index.html';
    } else {
        filePath = 'public' + request.url;
    }

    var absPath = './' + filePath;
    serveStatic(response, cache, absPath);
});

// 启动http服务
server.listen(3000, function() {
    console.log("server listening on port 3000.")
});

// 加载自定义node模块,该模块用于处理基于socket.io的服务端聊天功能
var chatServer = require('./lib/chat_server');
// 启动socket.io服务,并给它提供一个已经定义好的http服务,这样就能与http服务共用同一个端口
chatServer.listen(server);
