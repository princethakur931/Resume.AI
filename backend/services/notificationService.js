const { getFirebaseAdmin } = require('./firebaseAdmin');
const User = require('../models/User');

function toStringDataMap(data = {}) {
  const entries = Object.entries(data || {});
  return entries.reduce((acc, [key, value]) => {
    if (value === undefined || value === null) return acc;
    acc[key] = String(value);
    return acc;
  }, {});
}

function buildMessage(notification = {}, data = {}) {
  const title = String(notification.title || 'Notification');
  const body = String(notification.body || '');
  const icon = notification.icon || '/job-icon.jpg';
  const badge = notification.badge || icon;
  const tag = notification.tag || 'default';
  const requireInteraction = Boolean(notification.requireInteraction);
  const link = data.jobId ? `/?jobId=${String(data.jobId)}` : '/';

  return {
    notification: { title, body },
    data: toStringDataMap(data),
    android: {
      ttl: 3600,
      priority: 'high'
    },
    webpush: {
      headers: {
        TTL: '3600'
      },
      notification: {
        title,
        body,
        icon,
        badge,
        tag,
        requireInteraction
      },
      fcmOptions: {
        link
      }
    }
  };
}

class NotificationService {
  /**
   * Send push notification to specific users
   * @param {Array<string>} userIds - Array of user IDs to notify
   * @param {Object} notification - { title, body, icon, badge, tag }
   * @param {Object} data - Additional data to include in notification
   */
  static async sendToUsers(userIds, notification, data = {}) {
    if (!userIds || userIds.length === 0) return;

    try {
      const users = await User.find({ _id: { $in: userIds }, notificationToken: { $ne: '' } });
      
      if (users.length === 0) {
        console.log('No users with notification tokens found');
        return;
      }

      const tokens = users.map(u => u.notificationToken).filter(Boolean);
      if (tokens.length === 0) return;

      const admin = getFirebaseAdmin();
      const message = buildMessage(notification, data);

      // Send to all tokens
      const results = await Promise.allSettled(
        tokens.map(token => admin.messaging().send({ ...message, token }))
      );

      // Remove invalid tokens
      const invalidTokens = [];
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const error = result.reason;
          if (error.code === 'messaging/invalid-registration-token' || 
              error.code === 'messaging/registration-token-not-registered' ||
              error.code === 'messaging/mismatched-credential') {
            invalidTokens.push(tokens[index]);
          }
        }
      });

      if (invalidTokens.length > 0) {
        await User.updateMany(
          { notificationToken: { $in: invalidTokens } },
          { $set: { notificationToken: '' } }
        );
      }

      const failedCount = results.filter(result => result.status === 'rejected').length;
      console.log(`Notification send summary: success=${tokens.length - failedCount}, failed=${failedCount}`);

      return {
        sent: tokens.length - failedCount,
        failed: failedCount
      };
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  }

  /**
   * Send notification to all users
   */
  static async sendToAll(notification, data = {}) {
    try {
      const allUsers = await User.find({ notificationToken: { $ne: '' } });
      return this.sendToUsers(allUsers.map(u => u._id), notification, data);
    } catch (error) {
      console.error('Error sending notifications to all users:', error);
    }
  }

  /**
   * Update user's notification token
   */
  static async updateToken(userId, token) {
    try {
      if (!token || token.trim() === '') {
        await User.findByIdAndUpdate(userId, { $set: { notificationToken: '' } });
        return { success: true, message: 'Token cleared' };
      }

      await User.findByIdAndUpdate(userId, { $set: { notificationToken: token } });
      return { success: true, message: 'Token updated' };
    } catch (error) {
      console.error('Error updating notification token:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = NotificationService;
