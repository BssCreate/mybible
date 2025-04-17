const { google } = require("googleapis");

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        console.log("Ошибка: неверный метод запроса");
        return res.status(405).json({ message: "Method not allowed" });
    }

    try {
        let body = '';

        await new Promise((resolve) => {
            req.on('data', chunk => {
                body += chunk;
            });
            req.on('end', resolve);
        });

        const { login, password } = JSON.parse(body);
        console.log("Полученные данные:", { login, password });

        const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
        console.log("Используемые креды:", credentials);

        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
        });

        const sheets = google.sheets({ version: "v4", auth });

        const result = await sheets.spreadsheets.values.get({
            spreadsheetId: "1XOe29zxWW0mgVrZQSAu-9TQ4i7dfvYOBkq7-VvWg2nY",
            range: "Admins!A:B",
        });

        console.log("Результаты запроса:", result.data.values);

        const rows = result.data.values || [];
        const headers = rows[0];
        const loginIndex = headers.indexOf("login");
        const passwordIndex = headers.indexOf("password");

        console.log("Индексы столбцов:", { loginIndex, passwordIndex });

        const found = rows.slice(1).find(row =>
            row[loginIndex] === login && row[passwordIndex] === password
        );

        if (found) {
            console.log("Пользователь найден, вход успешен");
            res.status(200).json({ success: true });
        } else {
            console.log("Ошибка: неверный логин или пароль");
            res.status(401).json({ success: false, message: "Неверный логин или пароль." });
        }

    } catch (error) {
        console.error("Ошибка при входе:", error);
        res.status(500).json({ success: false, message: "Ошибка сервера" });
    }
};
