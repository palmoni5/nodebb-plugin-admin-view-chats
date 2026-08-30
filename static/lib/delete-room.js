'use strict';

// The Delete Room menu item on the admin-all-chats page is rendered
// server-side (templates/partials/chats/options.tpl, gated on the manage
// privilege via room.isAdmin). It deliberately does NOT use core's
// data-action="delete": core's handler calls the admin-only
// DELETE /api/v3/admin/chats/:roomId endpoint, which rejects non-admin
// holders of the admin-chats:manage privilege — so the click goes through
// the plugin's own endpoint, which accepts them too.
$(document).ready(function () {
    async function deleteRoom(roomId) {
        const response = await fetch(`${config.relative_path || ''}/api/admin-chats/${roomId}`, {
            method: 'DELETE',
            headers: {
                'x-csrf-token': config.csrf_token,
            },
            credentials: 'same-origin',
        });

        if (!response.ok) {
            throw new Error('Unable to delete room');
        }

        return await response.json();
    }

    $(document).on('click', '.admin-chat-delete-room-item', function (ev) {
        ev.preventDefault();

        const $button = $(this);
        const roomId = parseInt($button.attr('data-room-id'), 10);

        if (!roomId || $button.hasClass('disabled')) {
            return;
        }

        require(['modals', 'forum/chats'], function (modals, Chats) {
            // Same confirm dialog core shows for its own Delete Room item
            modals.confirm({
                size: 'small',
                title: '[[modules:chat.delete]]',
                message: '<p>[[modules:chat.delete-prompt]]</p>',
                callback: async function (ok) {
                    if (!ok) {
                        return;
                    }

                    $button.addClass('disabled').attr('aria-disabled', 'true');

                    try {
                        await deleteRoom(roomId);
                        // Drop the room from the sidebar lists and close the
                        // open chat window (the patched switchChat renders the
                        // empty state for a falsy roomId)
                        $(`[component="chat/nav-wrapper"] [data-roomid="${roomId}"]`).remove();
                        if (Chats && Chats.switchChat) {
                            Chats.switchChat('');
                        }
                    } catch (err) {
                        app.alertError('[[admin-chats:errors.delete]]');
                        $button.removeClass('disabled').removeAttr('aria-disabled');
                    }
                },
            });
        });
    });
});
