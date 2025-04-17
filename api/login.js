import { google } from 'googleapis';
import { promises as fs } from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const { phone, password } = req.body;

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(
        await fs.readFile(path.join(process.cwd(), 'service_account.json'), 'utf-8')
      ),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const sheetId = '1XOe29zxWW0mgVrZQSAu-9TQ4i7dfvYOBkq7-VvWg2nY'; // замени на свой ID
    const range = 'List1!A:A'; // предположим, что в A — JSON

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows) return res.status(404).json({ message: 'Нет данных' });

    for (let row of rows) {
      try {
        const json = JSON.parse(row[0]); // students_json
        const studentPhone = json['Номер телефона'].replace(/\D/g, '');
        const studentPassword = json['Пароль'];

        if (studentPhone === phone && studentPassword === password) {
          return res.status(200).json({ success: true, user: json });
        }
      } catch (err) {
        continue;
      }
    }

    res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}
