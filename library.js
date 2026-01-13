'use strict';

const User = require.main.require('./src/user');
const Messaging = require.main.require('./src/messaging');
const db = require.main.require('./src/database');
const _ = require('lodash');

const plugin = {};

plugin.init = async function (params) {
    
    overrideMessagingFunctions();
};


plugin.addProfileLink = async function (data) {
    try {
        const userSlug = data.user ? data.user.userslug : (data.userData ? data.userData.userslug : null);
        
        if (userSlug) {
            data.links.push({
                id: 'admin-view-chats',
                route: 'user/' + userSlug + '/chats',
                icon: 'fa-comments',
                name: 'צפה בצ\'אטים',
                visibility: {
                    self: false,
                    other: true,
                    moderator: false,
                    globalMod: false,
                    admin: true,
                }
            });
        }
    } catch (e) {
        console.error('[Super Admin Chats] Error adding profile link:', e);
    }
    return data;
};

plugin.isRoomOwner = async function (payload) {
    const isAdmin = await User.isAdministrator(payload.uid);
    if (isAdmin) {
        payload.isOwner = true;
    }
    return payload;
};

plugin.isUserInRoom = async function (payload) {
    const isAdmin = await User.isAdministrator(payload.uid);
    if (isAdmin) {
        payload.inRoom = true;
    }
    return payload;
};

plugin.canReply = async function (payload) {
    const isAdmin = await User.isAdministrator(payload.uid);
    if (isAdmin) {
        payload.canReply = true;
    }
    return payload;
};

plugin.canGetMessages = async function (payload) {
    const isAdmin = await User.isAdministrator(payload.callerUid);
    if (isAdmin) {
        payload.canGet = true;
    }
    return payload;
};

plugin.canGetRecentChats = async function (payload) {
    const isAdmin = await User.isAdministrator(payload.callerUid);
    if (isAdmin) {
        payload.canGet = true;
    }
    return payload;
};

plugin.canGetPublicChats = async function (payload) {
    const isAdmin = await User.isAdministrator(payload.callerUid);
    if (isAdmin) {
        payload.canGet = true;
    }
    return payload;
};

plugin.onLoadRoom = async function (payload) {
    const { uid, room } = payload;
    const isAdmin = await User.isAdministrator(uid);

    if (!isAdmin || !room) return payload;

    const isOfficialMember = await db.isSortedSetMember(`chat:room:${room.roomId}:uids`, uid);

    if (!isOfficialMember) {
        await db.sortedSetRemove(`chat:room:${room.roomId}:uids:online`, uid);
        
        if (Array.isArray(room.users)) {
            room.users = room.users.filter(user => user && parseInt(user.uid, 10) !== parseInt(uid, 10));
        }

        if (room.userCount > 0) {
            room.userCount -= 1;
        }
        room.groupChat = room.userCount > 2;

        const allMids = await db.getSortedSetRevRange(`chat:room:${room.roomId}:mids`, 0, 49);
        
        if (allMids.length > 0) {
            const messages = await Messaging.getMessagesData(allMids, uid, room.roomId, false);
            const messageCount = await db.getObjectField(`chat:room:${room.roomId}`, 'messageCount');
            const count = parseInt(messageCount, 10) || 0;
            
            messages.forEach((msg, index) => {
                msg.index = count - index - 1;
            });
            
            room.messages = messages.reverse();
        }

        room.isAdmin = true;
        room.isOwner = true;
    } else {
        room.isAdmin = true;
    }

    return payload;
};

function overrideMessagingFunctions() {
    
    const originalCanEdit = Messaging.canEdit;
    const originalCanDelete = Messaging.canDelete;
    const originalCanViewMessage = Messaging.canViewMessage;

    Messaging.canEdit = async function (messageId, uid) {
        if (await User.isAdministrator(uid)) {
            return true;
        }
        return await originalCanEdit(messageId, uid);
    };

    Messaging.canDelete = async function (messageId, uid) {
        if (await User.isAdministrator(uid)) {
            return true;
        }
        return await originalCanDelete(messageId, uid);
    };

    Messaging.canViewMessage = async function (mids, roomId, uid) {
        if (await User.isAdministrator(uid)) {
            return Array.isArray(mids) ? mids.map(() => true) : true;
        }
        return await originalCanViewMessage(mids, roomId, uid);
    };
}

module.exports = plugin;
