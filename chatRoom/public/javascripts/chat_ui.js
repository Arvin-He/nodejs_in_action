// chat_ui.js

// 客户端连接到服务器 var socket = io.connect('http://localhost');的简写
var socket = io.connect();

$(document).ready(function () {
    var chatApp = new Chat(socket);
    // 监听服务消息, 显示更名尝试的结果
    socket.on('nameResult', function (result) {
        var message;
        if (result.success) {
            message = 'You are now known as ' + result.name + '.';
        } else {
            message = result.message;
        }
        $('#messages').append(divSystemContentElement(message));
    });

    // 显示房间变更的结果
    socket.on('joinResult', function (result) {
        $('#room').text(result.room);
        $('#messages').append(divSystemContentElement('Room changed'));
    });

    // 显示接收到的消息
    socket.on('message', function (message) {
        var newElement = $('<div></div>').text(message.text);
        $('#messages').append(newElement);
    });

    // 显示可用房间的列表
    socket.on('rooms', function (rooms) {
        $('#room-list').empty();

        for (var room in rooms) {
            // substring() 方法用于提取字符串中介于两个指定下标之间的字符
            room = room.substring(1, room.length);
            if (room !== '') {
                $('#room-list').append(divEscapedContentElement(room));
            }
        }

        // 点击房间名可以切换到那个房间那里
        $('#room-list div').click(function () {
            chatApp.processCommand('/join ' + $(this).text());
            $('#send-message').focus();
        });
    });

    // 定期请求可用房间列表
    setInterval(function () {
        socket.emit('rooms');
    }, 1000);

    $('#send-message').focus();

    // 提交表单发送聊天消息
    $('#send-form').submit(function () {
        processUserInput(chatApp, socket);
        return false;
    });
});


// 净化文本，将特殊字符转化为HTMl实体。这样浏览器就会按输入的样子显示它们，而不会试图按HTML标签解释它们
function divEscapedContentElement(message) {
    return $('<div></div>').text(message);
}

// 该函数用来显示系统创建的受信内容，而不是其他用户创建的。
function divSystemContentElement(message) {
    return $('<div></div>').html('<i>' + message + '</i>');
}


function processUserInput(chatApp, socket) {
    var message = $('#send-message').val();
    var systemMessage;
    // 如果以（/）开头，则作为聊天命令处理
    if (message.charAt(0) === '/') {
        systemMessage = chatApp.processCommand(message);
        if (systemMessage) {
            $('#messages').append(divSystemContentElement(systemMessage));
        }
    } else { // 如果不是（/）开头，则作为聊天消息处理
        chatApp.sendMessage($('#room').text(), message); // 将非命令输入广播给其他用户
        $('#messages').append(divEscapedContentElement(message));
        $('#messages').scrollTop($('#messages').prop('scrollHeight'));
    }

    $('#send-message').val('');
}