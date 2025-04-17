const { google } = require("googleapis");

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Method not allowed" });
    }

    const { login, password } = req.body;

    try {
        const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
        });

        const sheets = google.sheets({ version: "v4", auth });

        const result = await sheets.spreadsheets.values.get({
            spreadsheetId: "1XOe29zxWW0mgVrZQSAu-9TQ4i7dfvYOBkq7-VvWg2nY",
            range: "Admins!A:B",
        });

        const rows = result.data.values || [];
        const headers = rows[0];
        const loginIndex = headers.indexOf("login");
        const passwordIndex = headers.indexOf("password");

        const found = rows.slice(1).find(row =>
            row[loginIndex] === login && row[passwordIndex] === password
        );

        if (found) {
            res.status(200).json({ success: true });
        } else {
            res.status(401).json({ success: false, message: "Неверный логин или пароль." });
        }

    } catch (error) {
        console.error("Ошибка при входе:", error);
        res.status(500).json({ success: false, message: "Ошибка сервера" });
    }
};
