# Точка восстановления Point C

**Дата создания:** 2026-01-25 (UTC)

## Описание состояния проекта

### Основные изменения в Point C:
1. ✅ Добавлено отображение типа контрагента в боковом меню (между номером телефона и выходом)
2. ✅ Улучшена структура проекта - организованы директории docs/ и scripts/
3. ✅ Создан единый файл для истории исправлений (fixes-log.md)
4. ✅ Обновлен README.md с новой структурой проекта
5. ✅ Все изменения закоммичены и отправлены в GitHub

### Структура резервной копии:
- `backend.tar.gz` - весь backend код (Django)
- `admin-frontend.tar.gz` - весь frontend код (React/TypeScript)
- `infra.tar.gz` - конфигурации Docker, Nginx
- `database_dump.sql` - дамп базы данных PostgreSQL
- `project.zip` - полный архив проекта

### Как восстановить:

1. **Восстановить файлы:**
   ```bash
   cd /root/arenda
   tar -xzf backups/Point_C/backend.tar.gz
   tar -xzf backups/Point_C/admin-frontend.tar.gz
   tar -xzf backups/Point_C/infra.tar.gz
   ```

2. **Восстановить базу данных:**
   ```bash
   cd /root/arenda/infra
   docker compose up -d db
   sleep 5
   docker compose exec -T db psql -U amt_user amt_db < /root/arenda/backups/Point_C/database_dump.sql
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
   docker run --rm -v $(pwd):/app -w /app node:18-alpine sh -c "npm install --legacy-peer-deps && npm run build"
   sudo cp -r build/* /var/www/assetmanagement.team/
   sudo chown -R www-data:www-data /var/www/assetmanagement.team
   sudo systemctl reload nginx
   ```

### Важные файлы и изменения:

**Backend:**
- Без изменений в backend для Point C

**Frontend:**
- `admin-frontend/src/components/Layout.tsx` - добавлено отображение типа контрагента в боковом меню
- Иконка `Tag` из lucide-react для типа контрагента
- Тип контрагента отображается из `user.counterparty?.type_display` или `user.role_display`

**Структура проекта:**
- `docs/` - вся документация проекта
  - `docs/setup/` - инструкции по настройке
  - `docs/fixes/` - история исправлений (fixes-log.md)
  - `docs/refactoring/` - документация по рефакторингу
  - `docs/restore-points/` - точки восстановления
- `scripts/` - утилиты и скрипты
  - `scripts/setup/` - скрипты настройки
  - `scripts/fixes/` - скрипты исправлений

**Инфраструктура:**
- `infra/nginx.conf` - конфигурация для assetmanagement.team
- `infra/docker-compose.yml` - настройки контейнеров

### UI изменения:

**Боковое меню (Desktop):**
1. Профиль (ссылка на /settings)
2. Номер телефона (если доступен)
3. **Тип контрагента** (новое) - отображается с иконкой Tag
4. Выход

Тип контрагента показывает:
- Арендатор
- Арендодатель
- Инвестор
- Сотрудник
- Администратор

### Git коммит:
- Все изменения закоммичены в ветку `main`
- Отправлено в GitHub: `git@github.com:AsanSh/arenda.git`

### Текущее состояние:
- Проект структурирован и организован
- Документация централизована
- Все изменения сохранены в Git
- Фронтенд пересобран и развернут
