const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { GoogleAuth } = require('google-auth-library');

const app = express();
app.use(bodyParser.json());

// 🔐 Environment variables
const PROJECT_ID = process.env.PROJECT_ID;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PORT = process.env.PORT || 3000;

// 📌 Step 1: Get Dialogflow access token
async function getAccessToken() {
  const auth = new GoogleAuth({
    keyFile: '/etc/secrets/ezzimachineries-mscw-697bf82feaf1.json',
    scopes: 'https://www.googleapis.com/auth/cloud-platform',
  });

  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();
  return accessToken.token;
}

// 📌 Step 2: Send message to Dialogflow
async function sendToDialogflow(message, sessionId) {
  const accessToken = await getAccessToken();

  const dialogflowUrl = https://dialogflow.googleapis.com/v2/projects/${PROJECT_ID}/agent/sessions/${sessionId}:detectIntent;

  const response = await axios.post(dialogflowUrl, {
    queryInput: {
      text: {
        text: message,
        languageCode: 'en-US',
      },
    },
  }, {
    headers: {
      Authorization: Bearer ${accessToken},
    },
  });

  return response.data.queryResult.fulfillmentText;
}

// 📌 Step 3: Send message to WhatsApp
async function sendMessageToWhatsApp(recipient, message) {
  const url = https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages;

  await axios.post(url, {
    messaging_product: 'whatsapp',
    to: recipient,
    text: { body: message },
  }, {
    headers: {
      Authorization: Bearer ${WHATSAPP_TOKEN},
      'Content-Type': 'application/json',
    },
  });
}

// 📌 Step 4: Webhook for Meta
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verified!');
    res.status(200).send(challenge);
  } else {
    console.log('❌ Webhook verification failed');
    res.sendStatus(403);
  }
});

// 📌 Step 5: Webhook for incoming messages
app.post('/webhook', async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];

    if (message && message.type === 'text') {
      const userMessage = message.text.body;
      const senderNumber = message.from;
      const sessionId = senderNumber;

      const reply = await sendToDialogflow(userMessage, sessionId);
      await sendMessageToWhatsApp(senderNumber, reply);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Webhook error:', err.message);
    res.sendStatus(500);
  }
});

// ✅ Start the server
app.listen(PORT, () => {
  console.log(🚀 WhatsApp bot is live on port ${PORT});
});
  
