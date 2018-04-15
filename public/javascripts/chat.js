// 客户端js

var Chat = function (socket) {
    this.socket = socket;
};

Chat.prototype.sendMessage = function (room, text) {
    var message = {
        room: room,
        text: text
    };
    this.socket.emit('message', message);
};

Chat.prototype.changeRoom = function (room) {
    this.socket.emit('join', {
        newRoom: room
    });
};

Chat.prototype.processCommand = function (command) {
    var words = command.split(' ');
    // 从第一个单词开始解析命令
    var cmd = words[0].substring(1, words[0].length).toLowerCase();
    var message = false;

    switch (cmd) {
        case 'join':
            // shift() 方法用于把数组的第一个元素从其中删除，并返回第一个元素的值。
            words.shift();
            var room = words.join(' ');
            this.changeRoom(room);
            break;
        case 'nick':
            words.shift();
            var name = words.join(' ');
            this.socket.emit('nameAttempt', name);
            break;
        default:
            message = 'Unrecognized command.';
            break;
    }
    return message;
};




