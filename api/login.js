import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send({ message: 'Only POST requests allowed' });
  }

  try {
    console.log('Запрос получен');

    const { phone, password } = req.body;
    console.log('Получены данные:', phone, password);

    const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    const spreadsheetId = '1XOe29zxWW0mgVrZQSAu-9TQ4i7dfvYOBkq7-VvWg2nY';
    const range = 'List1!A1:Z1000';

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Нет данных' });
    }

    const headers = rows[0];
    const studentsIndex = headers.indexOf('students_json');
    if (studentsIndex === -1) {
      return res.status(500).json({ message: 'students_json не найден' });
    }

    for (let i = 1; i < rows.length; i++) {
      try {
        const json = JSON.parse(rows[i][studentsIndex]);
        for (let student of json) {
          if (
            student['Номер телефона'].replace(/\D/g, '') === phone &&
            student['Пароль'] === password
          ) {
            return res.status(200).json({ success: true, student });
          }
        }
      } catch (e) {
        console.log('Ошибка парсинга JSON:', e.message);
      }
    }

    return res.status(401).json({ message: 'Неверные данные' });
  } catch (err) {
    console.error('Ошибка в login.js:', err);
    return res.status(500).json({ message: 'Ошибка сервера' });
  }
}
