const express = require("express");
const { google } = require("googleapis");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

const SHEET_ID = "1XOe29zxWW0mgVrZQSAu-9TQ4i7dfvYOBkq7-VvWg2nY";
const SHEET_NAME = "Admins";

async function authorize() {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    });
    const sheets = google.sheets({ version: "v4", auth });
    return sheets;
}

app.post("/login", async (req, res) => {
    const { login, password } = req.body;
    try {
        const sheets = await authorize();
        const result = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: `${SHEET_NAME}!A:B`,
        });

        const rows = result.data.values || [];
        const headers = rows[0];
        const loginIndex = headers.indexOf("login");
        const passwordIndex = headers.indexOf("password");

        const found = rows.slice(1).find(row =>
            row[loginIndex] === login && row[passwordIndex] === password
        );

        if (found) {
            res.json({ success: true });
        } else {
            res.status(401).json({ success: false, message: "Неверный логин или пароль." });
        }
    } catch (error) {
        console.error("Ошибка входа:", error);
        res.status(500).json({ success: false, message: "Ошибка сервера" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
