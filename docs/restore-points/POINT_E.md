# POINT E — Состояние после настройки сервера и логина

**Дата создания:** 2 марта 2025  
**Статус:** ✅ Работоспособная версия, логин протестирован  
**Домен:** https://assetmanagement.team  
**Сервер:** 5.8.10.197

***

## Изменения относительно POINT D

### Сервер и инфраструктура
| Параметр | Было | Стало |
|----------|------|-------|
| IP сервера | 5.101.67.195 | **5.8.10.197** |
| Backend для assetmanagement.team | amt (порт 8010) → 404 на /api/auth/login/ | **arenda** (порт 8000) |
| Nginx proxy_pass | 127.0.0.1:8010 | **127.0.0.1:8000** |

### Исправления
1. **Nginx** — был остановлен; включён и запущен: `systemctl enable nginx && systemctl start nginx`
2. **Несоответствие backend** — фронт и статика от arenda, API проксировался на amt (другой проект без auth). Запущен arenda backend, nginx переведён на порт 8000.
3. **Явные auth-маршруты** — в `backend/amt/urls.py` добавлены маршруты `api/auth/login/`, `api/auth/logout/`, `api/auth/me/` в начало urlpatterns (на случай альтернативных конфигураций).

### Учётные записи админов
| Логин | Пароль |
|-------|--------|
| nimdaSan | nimdaParol |
| Bahi | BPHolding |

Создание/обновление: `docker compose exec backend python manage.py create_login_users`

***

## Текущая архитектура на сервере

```
assetmanagement.team
├── Статика: /var/www/assetmanagement.team (из arenda admin-frontend build)
├── API /api/* → Nginx proxy → 127.0.0.1:8000 (arenda backend)
└── SSL: Let's Encrypt
```

### Docker (сервер)
| Контейнер | Проект | Порт | Используется для assetmanagement.team |
|-----------|--------|------|--------------------------------------|
| infra-db-1 | arenda | 5432 | ✅ БД |
| infra-backend-1 | arenda | **8000** | ✅ API |
| amt-backend | amt | 8010 | ❌ не используется |
| amt-frontend | amt | 8082 | ❌ не используется |
| amt-db | amt | — | — |

### Пути на сервере
- **arenda:** `/root/arenda` — основной проект для assetmanagement.team
- **amt:** `/root/amt/app` — отдельный проект (rent-platform), не используется для этого домена

***

## Файлы, изменённые в POINT E

### backend/amt/urls.py
Добавлены явные auth-маршруты:
```python
from core.auth_views import LoginView, LogoutView, me

path('api/auth/login/', LoginView.as_view(), name='api-login'),
path('api/auth/logout/', LogoutView.as_view(), name='api-logout'),
path('api/auth/me/', me, name='api-me'),
```

### backend/amt/settings.py
- ALLOWED_HOSTS: `5.8.10.197` (вместо 5.101.67.195)
- CORS_ORIGIN: `http://5.8.10.197:3000`

### docs/setup/*, docs/fixes/*, scripts/*
- Все вхождения IP `5.101.67.195` заменены на `5.8.10.197`

### docs/SITE_AUDIT.md
- Обновлён аудит на 02.03.2025

***

## Команды для восстановления состояния

### Запуск arenda backend (если остановлен)
```bash
ssh root@5.8.10.197
cd /root/arenda/infra
docker compose up -d db backend
```

### Проверка Nginx
```bash
grep proxy_pass /etc/nginx/sites-available/assetmanagement.team
# Должно быть: proxy_pass http://127.0.0.1:8000;
```

### Создание/обновление админов
```bash
cd /root/arenda/infra
docker compose exec backend python manage.py create_login_users
```

### Проверка логина
```bash
curl -X POST "https://assetmanagement.team/api/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{"username":"nimdaSan","password":"nimdaParol"}'
# Ожидается: {"token":"...","user":{...}}
```

***

## Чеклист после восстановления

- [ ] https://assetmanagement.team открывается
- [ ] Логин nimdaSan / nimdaParol работает
- [ ] Редирект на /dashboard после входа
- [ ] Дашборд отображает данные
- [ ] Меню по ролям работает
