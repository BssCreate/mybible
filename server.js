const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const os = require('os');
const filePath = __dirname + '/public/users.json';
const { getSheetData, updateSheetData } = require('./google_sheets_api'); // Импортируем функции

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors({ origin: '*' }));
app.use(express.static(path.join(__dirname, 'public')));
// Пример ID таблицы Google Sheets и диапазона
const spreadsheetId = 'YOUR_SPREADSHEET_ID';
const requestsRange = 'Requests!A2:F'; // Диапазон, в котором хранятся заявки

// Проверка на одинаковые заявки с одним `name`
function checkIfRequestExists(name) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                return reject('Ошибка при чтении файла');
            }

            const usersData = JSON.parse(data);
            for (let school in usersData) {
                for (let grade in usersData[school].classes) {
                    const classData = usersData[school].classes[grade];
                    for (let student of classData) {
                        if (student["Роль"] === "Администратор" && student["Заявки"]) {
                            const existingRequest = student["Заявки"].find(req => req.name === name && (req.status === 'На рассмотрении' || req.status === 'Принята'));
                            if (existingRequest) {
                                return resolve(true);  // Если такая заявка уже существует
                            }
                        }
                    }
                }
            }
            resolve(false);  // Если заявка не найдена
        });
    });
}

// Эндпоинт для отправки заявки
app.post('/submit-request', async (req, res) => {
    const requestData = req.body;
    const name = requestData.name;

    // Проверка на дублирующуюся заявку
    try {
        const exists = await checkIfRequestExists(name);
        if (exists) {
            return res.status(403).send('Заявка с таким названием уже находится на рассмотрении или принята');
        }

        // Читаем текущие данные из файла
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                return res.status(500).send('Ошибка при чтении файла');
            }

            const usersData = JSON.parse(data);

            // Присваиваем уникальный номер заявке
            let maxNumZav = 0;
            for (let school in usersData) {
                for (let grade in usersData[school].classes) {
                    const classData = usersData[school].classes[grade];
                    for (let student of classData) {
                        if (student["Роль"] === "Администратор" && student["Заявки"]) {
                            student["Заявки"].forEach(request => {
                                if (request.numzav && request.numzav > maxNumZav) {
                                    maxNumZav = request.numzav;
                                }
                            });
                        }
                    }
                }
            }
            // Присваиваем следующий номер заявки
            requestData.numzav = maxNumZav + 1;

            // Добавляем заявку к администратору
            let added = false;
            for (let school in usersData) {
                for (let grade in usersData[school].classes) {
                    const classData = usersData[school].classes[grade];
                    for (let student of classData) {
                        if (student["Роль"] === "Администратор") {
                            if (!student["Заявки"]) {
                                student["Заявки"] = [];
                            }
                            student["Заявки"].push(requestData); // Добавляем заявку
                            added = true;
                        }
                    }
                }
            }

            if (!added) {
                return res.status(404).send('Не удалось найти администратора для добавления заявки');
            }

            // Записываем обновленные данные обратно в файл
            fs.writeFile(filePath, JSON.stringify(usersData, null, 2), (err) => {
                if (err) {
                    return res.status(500).send('Ошибка при записи в файл');
                }
                res.status(200).send('Заявка успешно отправлена');
            });
        });
    } catch (err) {
        return res.status(500).send(err);
    }
});

app.post('/timeout-request', (req, res) => {
    const { numzav, timeout } = req.body;

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send('Ошибка при чтении файла');
        }

        const usersData = JSON.parse(data);
        let requestUpdated = false;

        // Обрабатываем тайм-аут заявки
        for (let school in usersData) {
            for (let grade in usersData[school].classes) {
                const classData = usersData[school].classes[grade];
                for (let student of classData) {
                    if (student["Роль"] === "Администратор" && student["Заявки"]) {
                        const requestIndex = student["Заявки"].findIndex(req => req.numzav === numzav); // Ищем по numzav
                        if (requestIndex !== -1) {
                            // Устанавливаем время тайм-аута в формате ISO
                            const timeoutDate = new Date(Date.now() + timeout);  // timeout в миллисекундах
                            student["Заявки"][requestIndex].status = 'Тайм-аут';
                            student["Заявки"][requestIndex].timeoutAt = timeoutDate.toISOString(); // сохраняем в ISO
                            requestUpdated = true;
                            break;
                        }
                    }
                }
            }
            if (requestUpdated) break;
        }

        if (requestUpdated) {
            // Записываем обратно в файл
            fs.writeFile(filePath, JSON.stringify(usersData, null, 2), (err) => {
                if (err) {
                    return res.status(500).send('Ошибка при записи в файл');
                }
                res.status(200).send('Тайм-аут для заявки установлен');
            });
        } else {
            res.status(404).send('Заявка не найдена');
        }
    });
});


setInterval(async () => {
    try {
        const data = await fs.promises.readFile(filePath, 'utf8');
        const usersData = JSON.parse(data);
        const now = new Date(); // текущее время

        let updatedData = false;

        for (let school in usersData) {
            for (let grade in usersData[school].classes) {
                const classData = usersData[school].classes[grade];
                for (let student of classData) {
                    if (student["Роль"] === "Администратор" && student["Заявки"]) {
                        student["Заявки"] = student["Заявки"].filter(request => {
                            if (request.status === 'Тайм-аут' && request.timeoutAt) {
                                const timeoutDate = new Date(request.timeoutAt);  // создаем объект Date
                                if (timeoutDate <= now) {
                                    updatedData = true;
                                    return false; // Удаляем заявку
                                }
                            }
                            return true;
                        });
                    }
                }
            }
        }

        if (updatedData) {
            await fs.promises.writeFile(filePath, JSON.stringify(usersData, null, 2));
            console.log('Заявки с истекшим тайм-аутом удалены');
        }
    } catch (err) {
        console.error('Ошибка при чтении или записи файла', err);
    }
}, 60000); // Проверка каждую минуту




// Функция для получения локального IP
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const interfaceName in interfaces) {
        for (const iface of interfaces[interfaceName]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}


app.get('/get-requests', (req, res) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Ошибка при чтении файла');
        }

        const usersData = JSON.parse(data);
        let requests = [];

        // Собираем заявки всех администраторов
        for (let school in usersData) {
            for (let grade in usersData[school].classes) {
                usersData[school].classes[grade].forEach(student => {
                    if (student["Роль"] === "Администратор" && student["Заявки"]) {
                        requests = requests.concat(student["Заявки"]);
                    }
                });
            }
        }

        res.json(requests);
    });
});

// Эндпоинт для обновления заявки
app.post('/update-request', (req, res) => {
    const updatedRequest = req.body;

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Ошибка при чтении файла');
        }

        const usersData = JSON.parse(data);
        let requestUpdated = false;

        // Обрабатываем обновление заявки
        for (let school in usersData) {
            for (let grade in usersData[school].classes) {
                const classData = usersData[school].classes[grade];
                for (let student of classData) {
                    if (student["Роль"] === "Администратор" && student["Заявки"]) {
                        const requestIndex = student["Заявки"].findIndex(req => req.numzav === updatedRequest.numzav); // Ищем по numzav
                        if (requestIndex !== -1) {
                            // Обновляем заявку
                            student["Заявки"][requestIndex] = updatedRequest;
                            requestUpdated = true;
                            break;
                        }
                    }
                }
            }
            if (requestUpdated) break;
        }

        if (requestUpdated) {
            // Записываем обратно в файл
            fs.writeFile(filePath, JSON.stringify(usersData, null, 2), (err) => {
                if (err) {
                    console.log(err);
                    return res.status(500).send('Ошибка при записи в файл');
                }
                res.status(200).send('Заявка обновлена');
            });
        } else {
            res.status(404).send('Заявка не найдена');
        }
    });
});

// Запуск сервера
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://${getLocalIP()}:${port}`);
});
