# ADR — Telegram Support Bot Service

> **Статус:** Принято  
> **Дата:** 2026-07-14  
> **Контекст:** Сервис для приёма сообщений с веб-сайта `https://fuenex.de` и отправки их в Telegram-чат техподдержки.

---

## 1. Назначение

Сервис **fuenex_bun_bot** — это микросервис на NestJS + Bun, который:

- Принимает сообщения от посетителей сайта `https://fuenex.de` через REST API
- Форматирует и отправляет их в Telegram-чат техподдержки (ID из `TELEGRAM_CHAT_ID` в `.env`)
- Обеспечивает базовую защиту от несанкционированного доступа через API-ключ

Бот **не обрабатывает входящие сообщения из Telegram**. Он работает только в режиме отправки (outbound).

---

## 2. Архитектура системы

```
┌──────────────────────┐
│  Сайт fuenex.de      │
│  (веб-клиент)        │
│                      │
│  POST /api/telegram/ │
│       send           │
│  x-api-key: ***      │
│  { name, email,      │
│    message }         │
└─────────┬────────────┘
          │ HTTPS / CORS
          ▼
┌──────────────────────────────────────┐
│         fuenex_bun_bot              │
│                                      │
│  ┌──────────────────────────────┐   │
│  │  ApiKeyGuard                 │   │
│  │  проверяет x-api-key         │   │
│  │  против KEY_FOR_CONTROLLERS  │   │
│  ├──────────┬───────────────────┤   │
│  │ ❌ 401    │  ✅              │   │
│  └──────────┘                   │   │
│               ▼                  │   │
│  ┌──────────────────────────┐   │   │
│  │  BotController           │   │   │
│  │  POST /api/telegram/send │   │   │
│  └──────────┬───────────────┘   │   │
│             │                    │   │
│  ┌──────────▼───────────────┐   │   │
│  │  BotService              │   │   │
│  │  форматирование +        │   │   │
│  │  отправка в Telegram     │   │   │
│  └──────────┬───────────────┘   │   │
│             │                    │   │
│  ┌──────────▼───────────────┐   │   │
│  │  Telegram Bot API        │   │   │
│  │  (grammy)               │   │   │
│  └─────────────────────────┘   │   │
└──────────────────────────────────────┘
          │
          ▼
┌──────────────────────┐
│  Telegram Chat       │
│  ID: 5238002828      │
│  (чат техподдержки)  │
│                      │
│  📩 Новое сообщение  │
│  👤 Имя: ...         │
│  📧 Email: ...       │
│  💬 Сообщение: ...   │
└──────────────────────┘
```

---

## 3. Стек технологий

| Компонент | Технология |
|---|---|
| Рантайм | **Bun** v1.3.14+ |
| Фреймворк | **NestJS** 11 |
| Telegram API | **grammy** (библиотека) |
| Язык | **TypeScript** (strict mode) |
| Конфигурация | `.env` через `@nestjs/config` |
| Документация API | Swagger (`/api/docs`) |

---

## 4. API Endpoints

### 4.1 `POST /api/telegram/send`

Отправляет сообщение с сайта в Telegram-чат техподдержки.

#### Headers

| Header | Тип | Обязательный | Описание |
|---|---|---|---|
| `Content-Type` | `string` | ✅ | `application/json` |
| `x-api-key` | `string` | ✅ | API-ключ для авторизации |

#### Request Body

```json
{
  "name": "Иван Петров",
  "email": "ivan@example.com",
  "message": "Здравствуйте! Нужна помощь с настройкой личного кабинета."
}
```

#### Success Response (200 OK)

```json
{
  "success": true
}
```

#### Error Responses

**401 Unauthorized** — неверный или отсутствующий API-ключ:

```json
{
  "message": "Invalid or missing API Key",
  "error": "Unauthorized",
  "statusCode": 401
}
```

**400 Bad Request** — невалидное тело запроса:

```json
{
  "message": ["name must be a string", "email must be a string"],
  "error": "Bad Request",
  "statusCode": 400
}
```

### 4.2 `GET /`

Проверка, что сервер запущен.

```text
Hello from NestJS + Bun! 🚀
```

### 4.3 `GET /health`

Health-check для мониторинга.

```json
{
  "status": "ok",
  "timestamp": "2026-07-14T12:00:00.000Z"
}
```

### 4.4 `GET /api/docs`

Swagger UI с документацией API (защищён Basic Auth).

| Логин | Пароль |
|---|---|
| `admin` | `Abc!1234` |

---

## 5. DTO и типы

### `SendMessageDto`

```ts
// src/telegram/dto/send_message.dto.ts

export interface SendMessageDto {
  /** Имя отправителя */
  name: string;
  /** Email отправителя */
  email: string;
  /** Текст сообщения */
  message: string;
}
```

### Response Types

```ts
// Success
interface SendMessageResponse {
  success: true;
}

// Health
interface HealthResponse {
  status: "ok";
  timestamp: string; // ISO 8601
}

// Error
interface ErrorResponse {
  message: string | string[];
  error: string;
  statusCode: number;
}
```

---

## 6. Аутентификация

Все запросы к `POST /api/telegram/send` защищены **ApiKeyGuard**.

### Принцип работы

1. Клиент передаёт API-ключ в HTTP-заголовке `x-api-key`
2. Guard сравнивает его со значением из `.env` → `KEY_FOR_CONTROLLERS`
3. При несовпадении возвращается `401 Unauthorized`

### Пример интеграции на клиенте

```js
// JavaScript / на сайте fuenex.de
const response = await fetch('https://your-server.com/api/telegram/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your-secret-key',
  },
  body: JSON.stringify({
    name: 'Иван Петров',
    email: 'ivan@example.com',
    message: 'Нужна помощь',
  }),
});

const data = await response.json();
// data.success === true
```

---

## 7. Переменные окружения (`.env`)

| Переменная | Обязательная | Описание |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | ✅ | Токен бота от [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_CHAT_ID` | ✅ | ID Telegram-чата техподдержки (число) |
| `KEY_FOR_CONTROLLERS` | ✅ | Секретный ключ для `x-api-key` (любая строка) |
| `PORT` | ❌ | Порт сервера (по умолчанию `3000`) |

### Пример `.env`

```env
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklmNOPqrStuVWXyz
TELEGRAM_CHAT_ID=5238002828
KEY_FOR_CONTROLLERS=supersecret123
PORT=3000
```

---

## 8. CORS

Разрешённые origin (настроено в `src/main.ts`):

- `https://fuenex.de`
- `https://chsm.shk.solutions`
- `https://serv.chsm.pro`
- `http://localhost:5173`
- `http://localhost:5174`
- `http://localhost:3000`
- `http://localhost:3001`

При необходимости добавить новый origin — отредактировать массив `allowedOrigins` в `src/main.ts`.

---

## 9. Запуск

```sh
# Установка зависимостей
bun install

# Разработка (с hot-reload)
bun run dev

# Production
bun run start

# Сборка в бинарник
bun run build
```

---

## 10. Telegram: подготовка чата

1. Создать бота через [@BotFather](https://t.me/BotFather) и получить токен
2. Добавить бота в чат техподдержки
3. Назначить бота **администратором** чата (иначе бот не сможет отправлять сообщения)
4. Узнать ID чата: написать любое сообщение в чат, затем запросить `https://api.telegram.org/bot<TOKEN>/getUpdates` — ID будет в `message.chat.id`
5. Прописать `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID=5238002828` в `.env`

---

## 11. Структура проекта

```
fuenex_bun_bot/
├── src/
│   ├── main.ts                         # точка входа + CORS + Swagger
│   ├── app.module.ts                   # корневой модуль
│   ├── app.controller.ts               # GET /, GET /health
│   ├── app.service.ts                  # hello-world
│   └── telegram/
│       ├── telegram.module.ts          # TelegramModule (глобальный)
│       ├── bot/
│       │   └── bot.service.ts          # отправка сообщений в Telegram
│       ├── controller/
│       │   ├── bot.controller.ts       # POST /api/telegram/send
│       │   └── api-key.guard.ts        # проверка x-api-key
│       └── dto/
│           └── send_message.dto.ts     # SendMessageDto
├── .env                                # переменные окружения
├── tsconfig.json
├── package.json
└── INSTRUCTIONS.md                     # данный документ
```

---

## 12. Пример полного цикла интеграции

### Клиент (сайт fuenex.de)

```ts
// sendToSupport.ts
interface SendMessageDto {
  name: string;
  email: string;
  message: string;
}

interface SendMessageResponse {
  success: true;
}

async function sendToSupport(
  data: SendMessageDto,
  apiKey: string
): Promise<SendMessageResponse> {
  const res = await fetch('https://your-server.com/api/telegram/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message ?? 'Unknown error');
  }

  return res.json();
}
```

### Что получает техподдержка в Telegram

```
📩 Новое сообщение с сайта

👤 Имя: Иван Петров
📧 Email: ivan@example.com
💬 Сообщение:
Здравствуйте! Нужна помощь с настройкой личного кабинета.
```

---

## 13. Решение проблем

| Проблема | Причина | Решение |
|---|---|---|
| `TELEGRAM_BOT_TOKEN not found` | Не указан токен в `.env` | Заполнить `.env` |
| `401 Unauthorized` | Неверный или отсутствует `x-api-key` | Проверить заголовок запроса и `KEY_FOR_CONTROLLERS` |
| Бот не отправляет в Telegram | Бот не админ чата | Назначить бота администратором |
| CORS ошибка | Origin не в белом списке | Добавить origin в `main.ts` |
