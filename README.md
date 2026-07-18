# BizConnect CRM
> Modern hybrid CRM system integrating a reactive UI with an advanced AI assistant.

-------------------------------------------------------------------------------

## / Overview
Разработана для автоматизации управления клиентами, сделками и задачами. Объединяет классический интерфейс управления с продвинутой маршрутизацией намерений ИИ.

## / Key Features
[+] Умный AI-Ассистент: Понимает естественный язык, самостоятельно создает задачи и сделки, связывает их с клиентами (Function Calling / Intent Routing).
[+] Реактивный UI: Использование Zustand для мгновенного обновления таблиц, канбан-досок и дашбордов без перезагрузок.
[+] Бесперебойная безопасность: Система Silent Token Refresh с Mutex-очередью. Незаметное обновление JWT сессий.
[+] Аналитический Дашборд: Агрегация данных на стороне БД, визуализация метрик и воронки продаж.
[+] Интерактивный Канбан: Drag & Drop управление сделками с оптимистичным обновлением состояния.

-------------------------------------------------------------------------------

## / Tech Stack
* Frontend: Next.js (React 18), Tailwind CSS, TypeScript, Zustand, Axios, @hello-pangea/dnd, Recharts
* Backend: Python 3, Django 5, Django REST Framework (DRF), SimpleJWT, OpenAI API

-------------------------------------------------------------------------------

## / Architecture Notes
* Intent Routing: Бэкенд жестко валидирует JSON Schema от LLM, блокируя галлюцинации нейросети в форматах данных.
* Auto-linking: Автоматический поиск клиента по имени или создание нового "под капотом" при генерации сделок через ИИ.
* Optimistic UI: Мгновенный отклик интерфейса при удалении или изменении статуса карточек до ответа сервера.

-------------------------------------------------------------------------------

## / Build & Launch Instructions

### 1. Backend (Django)
```bash
# В корневой папке проекта
python -m venv venv
venv\Scripts\activate

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

cd frontend
npm install

# Создайте файл .env.local и добавьте ключи (API URL, ключи OpenAI и т.д.)
npm run dev
