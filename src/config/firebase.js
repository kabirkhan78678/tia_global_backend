const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let firebaseApp = null;

try {
  const serviceAccountPath = path.resolve(__dirname, '../../firebase-service-account.json');

  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log('\x1b[32m[FIREBASE]\x1b[0m Initialized successfully for project:', serviceAccount.project_id);
  } else {
    console.warn('\x1b[33m[FIREBASE]\x1b[0m firebase-service-account.json not found at:', serviceAccountPath);
  }
} catch (error) {
  console.error('\x1b[31m[FIREBASE_INIT_ERROR]\x1b[0m Failed to initialize Firebase Admin SDK:', error.message);
}

/**
 * Send push notification to one or multiple device tokens
 * @param {Object} options
 * @param {string|string[]} options.fcmTokens - Single token string or array of tokens
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification body/message
 * @param {Object} [options.dataPayload] - Custom key-value pairs (will be converted to strings)
 * @param {string} [options.imageUrl] - Optional image URL for rich notification
 * @returns {Promise<{ success: boolean, successCount: number, failureCount: number, invalidTokens: string[] }>}
 */
const sendPushNotification = async ({ fcmTokens, title, body, dataPayload = {}, imageUrl = null }) => {
  if (!firebaseApp) {
    console.warn('[FIREBASE_PUSH] Skipped: Firebase Admin SDK not initialized');
    return { success: false, successCount: 0, failureCount: 0, invalidTokens: [] };
  }

  const rawTokens = Array.isArray(fcmTokens) ? fcmTokens : [fcmTokens];
  const tokens = rawTokens.filter((t) => typeof t === 'string' && t.trim().length > 0);

  if (tokens.length === 0) {
    return { success: false, successCount: 0, failureCount: 0, invalidTokens: [] };
  }

  // Ensure all data payload values are strings (required by Firebase FCM)
  const safeData = {};
  for (const [key, value] of Object.entries(dataPayload || {})) {
    if (value !== undefined && value !== null) {
      safeData[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
    }
  }

  const notificationPayload = {
    title: String(title || 'Notification'),
    body: String(body || ''),
  };

  if (imageUrl) {
    notificationPayload.imageUrl = String(imageUrl);
  }

  const invalidTokens = [];
  let successCount = 0;
  let failureCount = 0;

  try {
    if (tokens.length === 1) {
      // Single token send
      try {
        await admin.messaging().send({
          token: tokens[0],
          notification: notificationPayload,
          data: safeData,
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              channelId: 'high_importance_channel',
            },
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
              },
            },
          },
        });
        successCount = 1;
      } catch (err) {
        failureCount = 1;
        const errCode = err.code || '';
        if (
          errCode === 'messaging/invalid-registration-token' ||
          errCode === 'messaging/registration-token-not-registered'
        ) {
          invalidTokens.push(tokens[0]);
        }
        console.warn(`[FIREBASE_PUSH_SINGLE_ERROR] (${tokens[0].substring(0, 15)}...):`, err.message);
      }
    } else {
      // Multicast batch send (up to 500 tokens per batch)
      const batchSize = 500;
      for (let i = 0; i < tokens.length; i += batchSize) {
        const batch = tokens.slice(i, i + batchSize);
        const response = await admin.messaging().sendEachForMulticast({
          tokens: batch,
          notification: notificationPayload,
          data: safeData,
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              channelId: 'high_importance_channel',
            },
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
              },
            },
          },
        });

        successCount += response.successCount;
        failureCount += response.failureCount;

        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errCode = resp.error?.code || '';
            if (
              errCode === 'messaging/invalid-registration-token' ||
              errCode === 'messaging/registration-token-not-registered'
            ) {
              invalidTokens.push(batch[idx]);
            }
          }
        });
      }
    }

    return {
      success: successCount > 0,
      successCount,
      failureCount,
      invalidTokens,
    };
  } catch (error) {
    console.error('[FIREBASE_PUSH_FAILED] Error sending push notification:', error.message);
    return {
      success: false,
      successCount: 0,
      failureCount: tokens.length,
      invalidTokens,
    };
  }
};

module.exports = {
  admin,
  firebaseApp,
  sendPushNotification,
};
