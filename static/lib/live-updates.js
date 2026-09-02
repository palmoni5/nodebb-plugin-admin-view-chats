'use strict';

// Pushes room-lock changes to anyone with that room open, instead of the
// previous approach of polling every open chat window on a timer. The
// server emits event:admin-chats.roomLockChanged to chat_room_<roomId> from
// lib/routes.js's lock endpoint (mirrors core's own room broadcast pattern
// in src/messaging/notifications.js).
$(document).ready(function () {
    function refreshIfOpen(roomId) {
        const activeRoomId = parseInt($('[component="chat/main-wrapper"]').attr('data-roomid'), 10) || 0;
        if (activeRoomId !== parseInt(roomId, 10)) {
            return;
        }

        require(['forum/chats'], function (Chats) {
            if (Chats && Chats.switchChat) {
                Chats.switchChat(roomId);
            }
        });
    }

    if (window.socket) {
        socket.removeListener('event:admin-chats.roomLockChanged', refreshIfOpen);
        socket.on('event:admin-chats.roomLockChanged', function (data) {
            refreshIfOpen(data && data.roomId);
        });
    }
});
