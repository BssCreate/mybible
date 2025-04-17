import { google } from 'googleapis';

export default async function handler(req, res) {
  console.log("Запрос получен");

  if (req.method !== 'POST') return res.status(405).end();

  const { login, password } = req.body;
  console.log("Получены данные:", login, password);

  try {
    // Разбор строки из переменной окружения
    const raw = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

    // ВОТ ЭТО ВАЖНО: вернём переносы строк
    raw.private_key = raw.private_key.replace(/\\n/g, '\n');

    const auth = new google.auth.GoogleAuth({
      credentials: raw,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Пример запроса — можно адаптировать
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: '1XOe29zxWW0mgVrZQSAu-9TQ4i7dfvYOBkq7-VvWg2nY',
      range: 'List1!A1:E',
    });

    console.log("Данные из таблицы:", response.data.values);
    // Логика логина и пароля тут...

    res.status(200).json({ success: true, message: "Успешный вход" });
  } catch (error) {
    console.error("Ошибка в login.js:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
