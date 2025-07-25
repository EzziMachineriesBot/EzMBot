const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { GoogleAuth } = require('google-auth-library');
const { appendLog } = require('./sheets');

const app = express();
app.use(bodyParser.json());

const PROJECT_ID = process.env.PROJECT_ID;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PORT = process.env.PORT || 3000;

async function getAccessToken() {
  const auth = new GoogleAuth({
    keyFile: '/etc/secrets/dialogflow-key.json',
    scopes: 'https://www.googleapis.com/auth/cloud-platform',
  });

  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();
  return accessToken.token;
}

async function sendToDialogflow(message, sessionId) {
  const accessToken = await getAccessToken();
  const url = \`https://dialogflow.googleapis.com/v2/projects/\${PROJECT_ID}/agent/sessions/\${sessionId}:detectIntent\`;

  const response = await axios.post(url, {
    queryInput: {
      text: {
        text: message,
        languageCode: 'en-US',
      },
    },
  }, {
    headers: {
      Authorization: \`Bearer \${accessToken}\`,
    },
  });

  return response.data.queryResult.fulfillmentText;
}

async function sendMessageToWhatsApp(recipient, message) {
  const url = \`https://graph.facebook.com/v19.0/\${PHONE_NUMBER_ID}/messages\`;

  await axios.post(url, {
    messaging_product: 'whatsapp',
    to: recipient,
    text: { body: message },
  }, {
    headers: {
      Authorization: \`Bearer \${WHATSAPP_TOKEN}\`,
      'Content-Type': 'application/json',
    },
  });
}

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
      await appendLog([new Date().toISOString(), senderNumber, userMessage, dfReply]);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.sendStatus(500);
  }
});

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.listen(PORT, () => {
  console.log(\`✅ Server is live on port \${PORT}\`);
});
