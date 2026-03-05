# POINT E — PDF договоры, удаление недвижимости, media в production

**Дата создания:** 5 марта 2026  
**Статус:** ✅ Работоспособная версия  
**Домен:** https://assetmanagement.team  
**Git tag:** `point-e` (коммит ca3f648)

***

## Что добавлено / исправлено

### Договоры — файлы (PDF)
- **Загрузка:** исправлен Content-Type для FormData (убрана ручная установка без boundary), лимит 50 MB
- **Скачивание:** endpoint `/api/contracts/{id}/files/{file_id}/download/` с авторизацией; фронт скачивает через API
- **Media:** раздача `/media/` в production (раньше только при DEBUG); nginx проксирует на backend

### Недвижимость — удаление
- Кнопка «Удалить» для administrator и owner
- Обработка ProtectedError: при наличии связанных договоров — понятное сообщение
- Права: `properties.delete` для administrator, owner

### Инфраструктура
- Nginx: `client_max_body_size` 50M
- Django: `FILE_UPLOAD_MAX_MEMORY_SIZE` 50 MB

***

## Восстановление POINT E

### Git
```bash
cd /root/arenda
git fetch origin
git checkout point-e
# или
git checkout ca3f648
```

### Деплой
```bash
# Backend
cd /root/arenda/infra
docker compose build backend --no-cache
docker compose up -d backend

# Frontend
cd /root/arenda
docker run --rm -v "$(pwd)/admin-frontend:/app" -w /app node:18-alpine npm run build
sudo cp -r admin-frontend/build/* /var/www/assetmanagement.team/
sudo chown -R www-data:www-data /var/www/assetmanagement.team/

# Nginx (проверить client_max_body_size 50M и location /media/)
sudo nginx -t && sudo systemctl reload nginx
```

### Проверка
- [ ] Загрузка PDF в договор (до 50 MB)
- [ ] Скачивание PDF (кнопка по имени файла)
- [ ] Удаление недвижимости без договоров

***

## Файлы для восстановления

| Путь | Описание |
|------|----------|
| backend/contracts/views.py | download_file action, destroy ProtectedError |
| backend/amt/urls.py | media в production |
| backend/amt/settings.py | FILE_UPLOAD_MAX_MEMORY_SIZE |
| backend/core/permissions.py | properties.delete для owner |
| admin-frontend/src/api/contracts.ts | downloadContractFile, FormData fix |
| admin-frontend/src/api/client.ts | FormData Content-Type interceptor |
| admin-frontend/src/components/ContractForm.tsx | handleDownloadFile |
| admin-frontend/src/pages/ContractDetailPage.tsx | handleDownloadFile |
| admin-frontend/src/pages/PropertiesPage.tsx | canDelete, handleDelete |
| infra/nginx.conf | client_max_body_size 50M |
