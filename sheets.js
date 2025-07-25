const { GoogleSpreadsheet } = require('google-spreadsheet');
const creds = require('/etc/secrets/dialogflow-key.json');

const SHEET_ID = 'your-google-sheet-id';
const SHEET_NAME = 'Logs';

async function appendLog(row) {
  const doc = new GoogleSpreadsheet(SHEET_ID);
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();
  const sheet = doc.sheetsByTitle[SHEET_NAME];
  await sheet.addRow({
    Timestamp: row[0],
    Sender: row[1],
    UserMessage: row[2],
    BotReply: row[3],
  });
}

module.exports = { appendLog };
