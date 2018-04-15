//chat-server.js

var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var nameUsed = [];
var currentRoom = {};

// 定义聊天服务函数listen,并把这个函数暴露出去, server.js会调用这个函数
exports.listen = function (server) {
    io = socketio.listen(server);
    io.set('log level', 1);
    io.sockets.on('connection', function (socket) {
        // 在用户链接上时,给予一个访客名
        guestNumber = assignGuestName(socket, guestNumber, nickNames, nameUsed);
        // 在用户链接上来时把他放入聊天室Lobby里
        joinRoom(socket, 'Lobby');
        // 处理用户消息
        handleMessageBroadcasting(socket, nickNames);
        // 处理更名
        handleNameChangeAttempts(socket, nickNames, nameUsed);
        // 处理聊天室的创建和变更
        handleRoomJoining(socket);

        socket.on('rooms', function () {
            socket.emit('rooms', io.sockets.manager.rooms);
        });
        // 定义用户断开链接后的清除逻辑
        handleClientDisconnection(socket, nickNames, nameUsed);
    });
};

// 分配用户昵称
function assignGuestName(socket, guestNumber, nickNames, nameUsed) {
    var name = 'Guest' + guestNumber;
    // 把用户昵称和客户端连接ID关联上
    nickNames[socket.id] = name;
    // 给该socket的客户端发送消息（让用户知道他们自己的昵称）
    socket.emit('nameResult', {
        success: true,
        name: name
    });
    // 收录已被使用的昵称
    nameUsed.push(name);
    return guestNumber + 1;
}

// 在用户连接上时把他放入聊天室Lobby里
function joinRoom(socket, room) {
    // 让用户进入房间
    socket.join(room);
    // 记录用户当前房间
    currentRoom[socket.id] = room;
    // 给该socket的客户端发送消息(让用户知道他们进入了新房间)
    socket.emit('joinResult', {room:room});
    // 给除了自己以外的客户端广播消息(让房间里的其他用户知道有新用户进入房间了)
    socket.broadcast.to(room).emit('message', {
        text: nickNames[socket.id] + ' has joined ' + room + '.'
    });
    // 确定哪些用户在这个房间里
    var usersInRoom = io.sockets.clients(room);
    // 汇总统计在这个房间里的人
    if (usersInRoom.length > 1){
        var usersInRoomSummary = 'Users currently in ' + room + ': ';
        for (var index in usersInRoom) {
            var userSocketId = usersInRoom[index].id;
            if (userSocketId !== socket.id) {
                if (index > 0) {
                    usersInRoomSummary += ', ';
                }
                usersInRoomSummary += nickNames[userSocketId];
            }
        }
        usersInRoomSummary += '.';
        // 给该socket的客户端发送消息(让用户知道自己所在房间有哪些人)
        socket.emit('message', {text: usersInRoomSummary});
    }
}

// 更名逻辑处理
function handleNameChangeAttempts(socket, nickNames, nameUsed) {
    // 添加nameAttempt事件监听器,监听客户端发送的信息
    socket.on('nameAttempt', function (name) {
        // 昵称不能用Guest开头
        if (name.indexOf('Guest') === 0) {
            socket.emit('nameResult', {
                success: false,
                message: 'Names cannot begin with "Guest".'
            });
        } else {
            // 如果该昵称没有被注册,就用这个昵称注册
            if (nameUsed.indexOf(name) === -1) {
                // 删掉之前用过的昵称
                var previousName = nickNames[socket.id];
                var previousNameIndex = nameUsed.indexOf(previousName);
                // 使用新昵称
                nameUsed.push(name);
                nickNames[socket.id] = name;
                delete nameUsed[previousNameIndex];
                // 给该socket客户端发送消息,让他知道他的昵称已经成功修改
                socket.emit('nameResult', {
                   success: true,
                   name: name
                });
                // 给除了自己以外的客户端广播消息,告诉其他用户有人修改了昵称
                socket.broadcast.to(currentRoom[socket.id]).emit('message', {
                    text: previousName + ' is now known as ' + name + '.'
                });
            } else {
                // 如果想要的昵称已经被占用,则给该socket客户端发送消息,让他知道想要修改的昵称已经被占用
                socket.emit('nameResult', {
                    success: false,
                    message: 'That name is already in use.'
                });
            }
        }
    });
}

// 处理用户消息(发送,接手聊天消息)
function handleMessageBroadcasting(socket) {
    // 添加message事件的监听器
    socket.on('message', function (message) {
        // 给除了自己以外的客户端广播消息
        socket.broadcast.to(message.room).emit('message', {
            text: nickNames[socket.id] + ': ' + message.text
        });
    });
}

//处理聊天室创建和变更
function handleRoomJoining(socket) {
    // 添加join事件监听器
    socket.on('join', function (room) {
        // 踢出分组
        socket.leave(currentRoom[socket.id]);
        joinRoom(socket, room.newRoom);
    });
}

//用户断开链接
function handleClientDisconnection(socket) {
    socket.on('disconnect', function () {
        var nameIndex = nameUsed.indexOf(nickNames[socket.id]);
        delete nameUsed[nameIndex];
        delete nickNames[socket.id];
    });
}