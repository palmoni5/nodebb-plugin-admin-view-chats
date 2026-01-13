'use strict';
const User = require.main.require('./src/user');
const Messaging = require.main.require('./src/messaging');
const plugin = {};

// --- Hook חדש: עקיפת בדיקת ההרשאות של NodeBB ---
plugin.allowAdminAccess = async function (data) {
    // data.callerUid הוא המזהה של מי שמבקש את המידע (אתה)
    const isAdmin = await User.isAdministrator(data.callerUid);
    
    if (isAdmin) {
        // אם המבקש הוא אדמין, אנחנו משנים את ההרשאה ל-TRUE
        data.canGet = true;
    }
    
    return data;
};
// ------------------------------------------------

plugin.init = async function (params) {
    const router = params.router;
    const middleware = params.middleware;

    router.get('/user-chats-viewer/:targetUid', middleware.ensureLoggedIn, async (req, res) => {
        try {
            // בדיקת אבטחה כפולה (לוודא שרק אדמין ניגש ל-API הזה)
            const isAdmin = await User.isAdministrator(req.uid);
            if (!isAdmin) {
                return res.status(403).send('Error: You are not authorized.');
            }

            const targetUid = req.params.targetUid;
            const callerUid = req.uid;

            const userData = await User.getUserFields(targetUid, ['username']);
            const username = userData.username || 'User ' + targetUid;

            // כעת הקריאה הזו תעבוד כי ה-Hook למעלה יאשר אותה
            const result = await Messaging.getRecentChats(callerUid, targetUid, 0, 49);
            
            // חילוץ הנתונים (תלוי בגרסת הליבה, לפעמים זה באובייקט rooms ולפעמים ישירות)
            const roomsData = result.rooms || result || []; 
            
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
                    .badge-group { background-color: #17a2b8; color: white; font-size: 0.7em; padding: 2px 5px; border-radius: 4px; margin-right: 5px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="d-flex justify-content-between align-items-center mb-4 p-3 bg-white rounded shadow-sm border">
                        <div>
                            <h4 class="mb-0 text-primary">צ'אטים של <strong>${username}</strong></h4>
                            <small class="text-muted">UID: ${targetUid} | ${roomsData.length} שיחות</small>
                        </div>
                        <button onclick="window.close()" class="btn btn-outline-secondary btn-sm">סגור</button>
                    </div>
            `;
            
            if (!roomsData || roomsData.length === 0) {
                html += '<div class="alert alert-warning text-center">לא נמצאו שיחות.</div>';
            } else {
                html += '<div class="row">';
                roomsData.forEach(room => {
                    let content = '<i>(אין תוכן זמין)</i>';
                    if (room.teaser) {
                        content = room.teaser.content 
                            ? room.teaser.content.replace(/</g, "&lt;").replace(/>/g, "&gt;") 
                            : '<i>(תמונה או קובץ)</i>';
                    }
                    
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
                                    ${room.groupChat ? '<span class="badge-group">קבוצתי</span>' : ''}
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

plugin.addProfileLink = async function (data) {
    // השארנו את הקוד הזה כפי שהיה
    try {
        let targetUid;
        if (data.uid) targetUid = data.uid;
        else if (data.user && data.user.uid) targetUid = data.user.uid;
        
        if (!targetUid) return data;

        // הכפתור הזה משמש רק גיבוי, הסקריפט בצד לקוח הוא העיקרי
        data.links.push({
            id: 'admin-view-chats',
            route: '/user-chats-viewer/' + targetUid,
            icon: 'fa-comments',
            name: 'View Chats (Admin)',
            visibility: { other: true, admin: true }
        });
    } catch (e) { }
    return data;
};

module.exports = plugin;