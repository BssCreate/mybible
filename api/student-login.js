import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ status: "error", message: "Метод не поддерживается" });
  }

  const { phone, password } = req.body;

  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth: await auth.getClient() });

  try {
    const sheet = await sheets.spreadsheets.values.get({
      spreadsheetId: "Database",
      range: "List1",
    });

    const [headers, ...rows] = sheet.data.values;

    for (const row of rows) {
      const record = Object.fromEntries(headers.map((h, i) => [h, row[i] || ""]));
      let students = {};
      try {
        students = JSON.parse(record.students_json || "{}");
      } catch {}

      for (const className in students) {
        for (const student of students[className]) {
          if (student["Номер телефона"] === phone && student["Пароль"] === password) {
            return res.status(200).json({
              status: "success",
              student: { ...student, Класс: className },
              school: record.school,
              address: record.address
            });
          }
        }
      }
    }

    res.status(404).json({ status: "error", message: "Ученик не найден" });

  } catch (e) {
    res.status(500).json({ status: "error", message: e.message });
  }
}
