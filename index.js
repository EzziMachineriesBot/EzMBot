const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');

const app = express();
app.use(bodyParser.json());

const PROJECT_ID = process.env.PROJECT_ID;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

// ✅ 1. Google access token for Dialogflow
async function getAccessToken() {
  const auth = new GoogleAuth({
    keyFile: '/etc/secrets/dialogflow-key.json', // ✅ uploaded to Render secret
    scopes: 'https://www.googleapis.com/auth/cloud-platform',
  });

  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();
  return accessToken.token;
}

// ✅ 2. Send message to Dialogflow
async function sendToDialogflow(message, sessionId) {
  const accessToken = await getAccessToken();
  const dialogflowUrl = https://dialogflow.googleapis.com/v2/projects/${PROJECT_ID}/agent/sessions/${sessionId}:detectIntent;

  const response = await axios.post(
    dialogflowUrl,
    {
      queryInput: {
        text: {
          text: message,
          languageCode: 'en-US',
        },
      },
    },
    {
      headers: {
        Authorization: Bearer ${accessToken},
      },
    }
  );

  return response.data.queryResult.fulfillmentText;
}

// ✅ 3. Send WhatsApp message back
async function sendMessageToWhatsApp(recipient, message) {
  const url = https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages;

  await axios.post(
    url,
    {
      messaging_product: 'whatsapp',
      to: recipient,
      text: {
        body: message,
      },
    },
    {
      headers: {
        Authorization: Bearer ${WHATSAPP_TOKEN},
        'Content-Type': 'application/json',
      },
    }
  );
}

// ✅ 4. Log to Google Sheets
async function logToSheet(user, message, reply) {
  const jwtClient = new google.auth.JWT(
    GOOGLE_CLIENT_EMAIL,
    null,
    GOOGLE_PRIVATE_KEY,
    ['https://www.googleapis.com/auth/spreadsheets']
  );

  await jwtClient.authorize();

  const sheets = google.sheets({ version: 'v4', auth: jwtClient });

  const now = new Date().toISOString();

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Sheet1!A:D',
    valueInputOption: 'RAW',
    requestBody: {
      values: [[now, user, message, reply]],
    },
  });
}

// ✅ 5. Webhook to receive messages
app.post('/webhook', async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const messageData = changes?.value?.messages?.[0];

    if (messageData && messageData.type === 'text') {
      const userMessage = messageData.text.body;
      const senderNumber = messageData.from;
      const sessionId = senderNumber;

      const dfReply = await sendToDialogflow(userMessage, sessionId);
      await sendMessageToWhatsApp(senderNumber, dfReply);
      await logToSheet(senderNumber, userMessage, dfReply);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Webhook error:', err.message);
    res.sendStatus(500);
  }
});

// ✅ 6. Webhook verification
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook Verified!');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ✅ 7. Server start
app.get('/', (req, res) => {
  res.send('✅ WhatsApp bot is live');
});

app.listen(PORT, () => {
  console.log(🚀 Server running on port ${PORT});
});


