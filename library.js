'use strict';
const User = require.main.require('./src/user');
const Messaging = require.main.require('./src/messaging');
const plugin = {};

plugin.init = async function (params) {
    const router = params.router;
    const middleware = params.middleware;

    router.get('/user-chats-viewer/:targetUid', middleware.ensureLoggedIn, async (req, res) => {
        try {
            // 1. בדיקת מנהל
            const isAdmin = await User.isAdministrator(req.uid);
            if (!isAdmin) {
                return res.status(403).send('Error: You are not authorized.');
            }

            const targetUid = req.params.targetUid;
            const callerUid = req.uid;

            const userData = await User.getUserFields(targetUid, ['username']);
            const username = userData.username || 'User ' + targetUid;

            // 2. קריאה לפונקציה
            const result = await Messaging.getRecentChats(callerUid, targetUid, 0, 49);
            
            // 3. חילוץ הנתונים הנכונים (התיקון לשגיאה)
            // הפונקציה מחזירה אובייקט { rooms: [...] }, אז ניקח את ה-rooms משם.
            // החדרים האלו כבר מלאים בנתונים, לא צריך getRoomsData נוסף.
            const roomsData = result.rooms || []; 
            
            let html = `
            <!DOCTYPE html>
            <html lang="he" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>צ'אטים של ${username}</title>
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.rtl.min.css">
                <style>
                    body { background-color: #f8f9fa; padding: 20px; font-family: system-ui, -apple-system, sans-serif; }
                    .container { max-width: 900px; }
                    .chat-card { transition: all 0.2s; border: 1px solid #dee2e6; margin-bottom: 15px; border-radius: 8px; background: white; }
                    .chat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-color: #cbd3da; }
                    .msg-preview { background: #f1f3f5; padding: 12px; border-radius: 6px; margin: 10px 0; font-size: 0.95rem; color: #495057; white-space: pre-wrap; }
                    .meta-info { font-size: 0.85rem; color: #adb5bd; }
                    .header-box { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header-box d-flex justify-content-between align-items-center border">
                        <div>
                            <h4 class="mb-0 text-primary">צ'אטים של <strong>${username}</strong></h4>
                            <small class="text-muted">UID: ${targetUid} | ${roomsData.length} שיחות</small>
                        </div>
                        <button onclick="window.close()" class="btn btn-outline-secondary btn-sm">סגור</button>
                    </div>
            `;
            
            if (!roomsData || roomsData.length === 0) {
                html += '<div class="alert alert-warning text-center">לא נמצאו שיחות למשתמש זה (או שאין לך הרשאה לצפות בהן).</div>';
            } else {
                html += '<div class="row">';
                roomsData.forEach(room => {
                    let content = '<i>(אין תוכן זמין)</i>';
                    
                    // ניסיון לחלץ תוכן בטוח
                    if (room.teaser) {
                        content = room.teaser.content 
                            ? room.teaser.content.replace(/</g, "&lt;").replace(/>/g, "&gt;") 
                            : '<i>(תמונה או קובץ)</i>';
                    }
                    
                    // המרה לתאריך קריא
                    let dateStr = '';
                    if (room.teaser && room.teaser.timestamp) {
                        dateStr = new Date(room.teaser.timestamp).toLocaleString('he-IL');
                    }
                    
                    html += `
                    <div class="col-12">
                        <div class="chat-card p-3">
                            <div class="d-flex justify-content-between border-bottom pb-2 mb-2">
                                <div>
                                    <strong>חדר #${room.roomId}</strong>
                                    ${room.groupChat ? '<span class="badge bg-info me-2">קבוצתי</span>' : ''}
                                </div>
                                <span class="meta-info">${dateStr}</span>
                            </div>
                            <div class="msg-preview">${content}</div>
                            <div class="text-end">
                                <a href="/chats/${room.roomId}" target="_blank" class="btn btn-primary btn-sm">
                                    <i class="fa fa-external-link"></i> כניסה לחדר
                                </a>
                            </div>
                        </div>
                    </div>`;
                });
                html += '</div></div></div></body></html>';
            }

            res.send(html);

        } catch (err) {
            console.error(err);
            res.status(500).send("System Error: " + err.message);
        }
    });
};

module.exports = plugin;