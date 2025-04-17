const express = require('express');
const { google } = require('googleapis');
const fs = require('fs');
const app = express();
const port = 3000;

app.use(express.json());

const auth = new google.auth.GoogleAuth({
  keyFile: 'service_account.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const SPREADSHEET_ID = 'ТВОЙ_SPREADSHEET_ID';

// Авторизация студента
app.post('/api/login/student', async (req, res) => {
  const { phone, password } = req.body;
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: 1XOe29zxWW0mgVrZQSAu-9TQ4i7dfvYOBkq7-VvWg2nY,
      range: 'List1!A2:A',
    });

    const rows = response.data.values;

    if (!rows) return res.status(404).send('Нет данных');

    for (let row of rows) {
      const studentData = JSON.parse(row[0]);

      for (let school in studentData) {
        for (let grade in studentData[school].classes) {
          for (let student of studentData[school].classes[grade]) {
            const cleanedPhone = student["Номер телефона"].replace(/\D/g, "");
            if (cleanedPhone === phone && student["Пароль"] === password) {
              return res.status(200).json({ message: 'Успешный вход', role: 'student' });
            }
          }
        }
      }
    }

    return res.status(401).send('Неверный номер или пароль');

  } catch (error) {
    console.error('Ошибка при проверке студента:', error);
    return res.status(500).send('Ошибка сервера');
  }
});

// Авторизация администратора
app.post('/api/login/admin', async (req, res) => {
  const { login, password } = req.body;
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Admins!A2:B',
    });

    const rows = response.data.values;

    if (!rows) return res.status(404).send('Нет данных');

    for (let row of rows) {
      const [loginCell, passwordCell] = row;
      if (loginCell === login && passwordCell === password) {
        return res.status(200).json({ message: 'Успешный вход', role: 'admin' });
      }
    }

    return res.status(401).send('Неверный логин или пароль');

  } catch (error) {
    console.error('Ошибка при проверке администратора:', error);
    return res.status(500).send('Ошибка сервера');
  }
});

app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});
