# WhatsApp Chatbot with Dialogflow + Google Sheets Logging

This bot integrates:
- WhatsApp Cloud API (via Meta)
- Dialogflow agent for AI conversation
- Google Sheets for logging

## 🌐 How it works

1. User sends WhatsApp message
2. Webhook receives → sends to Dialogflow
3. Dialogflow replies → Bot sends response
4. Logs conversation to Google Sheet

## ⚙️ Environment Variables

Create a `.env` file or set in Render:

```
PROJECT_ID=your-dialogflow-project-id
WHATSAPP_TOKEN=your-whatsapp-api-token
PHONE_NUMBER_ID=your-whatsapp-phone-number-id
VERIFY_TOKEN=ezzi-whatsapp-bot
```

## 🔐 Secret File

In Render, upload your service account JSON as:

```
dialogflow-key.json
```

## 📝 Google Sheets Logging

Update `sheets.js` with your Google Sheet ID and sheet name.

## 🚀 Deploy on Render

1. Push code to GitHub
2. Create new Node app on Render
3. Add environment variables
4. Upload secret file in Secrets tab
5. Use Render URL in Meta's Webhook Callback

