# Точка восстановления Point B

**Дата создания:** 2026-01-25 00:55 (UTC)

## Описание состояния проекта

### Основные изменения в Point B:
1. ✅ Реализована уникальность номера телефона для контрагентов (один номер = один контрагент)
2. ✅ Исправлена логика арендаторов - правильное меню и фильтрация данных
3. ✅ Исправлена проблема CSRF при входе через WhatsApp OTP
4. ✅ Создана детальная страница контрагента с договорами и недвижимостью
5. ✅ Исправлены права доступа - арендаторы не видят админские функции
6. ✅ Администратор защищен от удаления
7. ✅ Номер телефона отображается в боковом меню и профиле

### Структура резервной копии:
- `backend.tar.gz` - весь backend код (Django)
- `admin-frontend.tar.gz` - весь frontend код (React/TypeScript)
- `infra.tar.gz` - конфигурации Docker, Nginx
- `database_dump.sql` - дамп базы данных PostgreSQL

### Как восстановить:

1. **Восстановить файлы:**
   ```bash
   cd /root/arenda
   tar -xzf backups/Point_B/backend.tar.gz
   tar -xzf backups/Point_B/admin-frontend.tar.gz
   tar -xzf backups/Point_B/infra.tar.gz
   ```

2. **Восстановить базу данных:**
   ```bash
   cd /root/arenda/infra
   docker compose up -d db
   sleep 5
   docker compose exec -T db psql -U amt_user amt_db < /root/arenda/backups/Point_B/database_dump.sql
   ```

3. **Пересобрать и запустить:**
   ```bash
   cd /root/arenda/infra
   docker compose build
   docker compose up -d
   ```

4. **Пересобрать frontend:**
   ```bash
   cd /root/arenda/admin-frontend
   npm install
   npm run build
   sudo cp -r build/* /var/www/assetmanagement.team/
   ```

### Важные файлы и изменения:

**Backend:**
- `backend/core/models.py` - модель Tenant с unique phone
- `backend/core/serializers.py` - валидация уникальности номера
- `backend/core/whatsapp_auth_views.py` - исправлен CSRF для OTP логина
- `backend/core/mixins.py` - data scoping для арендаторов
- `backend/core/views.py` - защита от удаления администратора

**Frontend:**
- `admin-frontend/src/hooks/useUserMenu.ts` - правильное меню для ролей
- `admin-frontend/src/pages/TenantDetailPage.tsx` - детальная страница контрагента
- `admin-frontend/src/pages/LoginPageOTP.tsx` - вход через OTP код
- `admin-frontend/src/pages/ContractsPage.tsx` - ограничения для арендаторов
- `admin-frontend/src/pages/AccrualsPage.tsx` - ограничения для арендаторов
- `admin-frontend/src/pages/NotificationsPage.tsx` - доступ только для админов

**Infrastructure:**
- `infra/nginx.conf` - конфигурация для assetmanagement.team
- `infra/docker-compose.yml` - настройки контейнеров

### Миграции базы данных:
- `0007_add_admin_type_to_tenant` - добавлен тип 'admin' для контрагентов
- `0008_add_unique_phone_to_tenant` - уникальность номера телефона
- `0009_fix_unique_phone_nullable` - исправление nullable
- `0010_fix_phone_unique_properly` - финальное исправление уникальности

### Текущее состояние БД:
- Контрагентов: 5
- Все номера телефонов уникальны
- Дубликаты объединены
- Администратор защищен от удаления

