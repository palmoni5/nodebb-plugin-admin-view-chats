# Super Admin Chat Control for NodeBB

A professional administration plugin for NodeBB that allows administrators to monitor, manage, and interact with any chat room on the forum, regardless of membership.

## Main Features

* **Global Chat Access**: Administrators can view any private or group conversation.
* **Management Privileges**: Grants admins the ability to edit or delete any message in any room.
* **Profile Integration**: Adds a "View Chats" button to the user profile menu for administrators to quickly audit a user's interactions.
* **Non-Intrusive Monitoring**: Admins can load and view room history without being added as permanent members, maintaining a clean member list.
* **UI Enhancements**: Replaces generic "no chats" messages with helpful instructions for admins and supports both English and Hebrew interfaces.

## Technical Overview

### Plugin Information
* **Name**: Super Admin Chat Control
* **ID**: `nodebb-plugin-admin-chats`
* **Compatibility**: NodeBB versions `^3.0.0` or `^4.0.0`

### Implemented Hooks
The plugin utilizes several filters to elevate administrator permissions:

| Hook | Method | Functionality |
| :--- | :--- | :--- |
| `filter:messaging.isRoomOwner` | `isRoomOwner` | Treats admins as owners for permission checks. |
| `filter:messaging.canReply` | `canReply` | Allows admins to send messages in any room. |
| `filter:messaging.canGetMessages` | `canGetMessages` | Allows admins to fetch chat history. |
| `filter:messaging.loadRoom` | `onLoadRoom` | Manages room loading logic for non-member admins. |
| `filter:user.accountMenu` | `addProfileLink` | Injects the admin link into the profile menu. |

### Function Overrides
The plugin overrides core messaging functions to ensure full administrative control:
* **Edit/Delete**: `Messaging.canEdit` and `Messaging.canDelete` are bypassed for administrators.
* **Visibility**: `Messaging.canViewMessage` is modified to always return `true` for admins.

## Installation

1. Install the plugin via terminal:
   ```bash
   npm install nodebb-plugin-admin-chats
   ```
2. Activate the plugin in the NodeBB Admin Control Panel (ACP).
3. Restart NodeBB.

## Client-Side Support
The plugin includes a `client.js` script that:
* Detects the system language (English or Hebrew).
* Dynamically injects action buttons into the account sub-links menu.
* Cleans up the chat UI empty states for a better admin experience.

---
*Developed by [palmoni5](https://github.com/palmoni5/nodebb-plugin-admin-chats).*
