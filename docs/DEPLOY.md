# AMT — Деплой и автодеплой

## Ручной деплой

```bash
sudo /root/arenda/infra/deploy.sh
# или после установки symlink:
sudo amt-deploy
```

**Установка команды amt-deploy:**
```bash
sudo ln -sf /root/arenda/infra/amt-deploy /usr/local/bin/amt-deploy
```

## Автоматический деплой (опционально)

### Вариант A: systemd path (при изменении main)
Срабатывает при изменении `refs/heads/main` (после `git pull origin main`).

```bash
# Включить
sudo cp /root/arenda/infra/systemd/amt-deploy.service /etc/systemd/system/
sudo cp /root/arenda/infra/systemd/amt-deploy.path /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now amt-deploy.path

# Отключить
sudo systemctl disable --now amt-deploy.path
```

### Вариант B: Git post-merge hook
Срабатывает после `git pull` в ветку main.

```bash
cp /root/arenda/infra/git-hooks/post-merge /root/arenda/.git/hooks/post-merge
chmod +x /root/arenda/.git/hooks/post-merge
```

### Отключить автодеплой
- **path:** `sudo systemctl disable --now amt-deploy.path`
- **hook:** `rm /root/arenda/.git/hooks/post-merge`

## Логи

```bash
tail -f /root/arenda/logs/deploy.log
```

## Что делает deploy.sh

1. `git pull origin main`
2. Docker: `db` + `backend` (build, up)
3. Миграции
4. Django collectstatic
5. Frontend: `npm ci` + `npm run build`
6. rsync build → `/var/www/assetmanagement.team`
7. nginx -t && reload
8. Проверки: index.html, static, backend, контейнеры

## Файлы

| Файл | Назначение |
|------|------------|
| /root/arenda/infra/deploy.sh | Основной скрипт |
| /root/arenda/infra/amt-deploy | Обёртка для /usr/local/bin |
| /root/arenda/infra/systemd/amt-deploy.service | systemd unit |
| /root/arenda/infra/systemd/amt-deploy.path | systemd path watcher |
| /root/arenda/infra/git-hooks/post-merge | Git hook |
| /root/arenda/logs/deploy.log | Лог деплоев |
