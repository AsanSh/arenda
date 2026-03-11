# Настройка автодеплоя через GitHub Actions

При каждом `git push` в ветку `main` проект автоматически деплоится на production.

## 1. Добавить секреты в GitHub

Репозиторий → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.

Добавьте три секрета:

| Имя | Описание | Пример |
|-----|----------|--------|
| `DEPLOY_HOST` | IP или домен сервера | `5.8.10.197` или `assetmanagement.team` |
| `DEPLOY_USER` | SSH-пользователь (должен иметь право на sudo deploy) | `root` |
| `DEPLOY_SSH_KEY` | Приватный SSH-ключ для доступа к серверу | Содержимое `~/.ssh/id_rsa` (без пароля) |

## 2. SSH-доступ

- На сервере в `~/.ssh/authorized_keys` должен быть **публичный** ключ, соответствующий приватному из `DEPLOY_SSH_KEY`.
- Пользователь `DEPLOY_USER` должен иметь право выполнять `sudo /root/arenda/infra/deploy.sh` без пароля, если вы используете не `root`.

Для пользователя root достаточно корректного SSH-ключа.

## 3. Как работает

1. Push в `main` → запуск workflow.
2. GitHub Actions подключается по SSH к серверу.
3. Выполняется `sudo /root/arenda/infra/deploy.sh` (git pull, build, migrate, copy static, nginx reload).

## 4. Ручной запуск

**Actions** → **Deploy to production** → **Run workflow**.

## 5. Проверка

После push откройте **Actions** в репозитории — там будет лог последнего деплоя.

## 6. OOM при деплое

Если деплой падает с ошибкой out-of-memory (OOM) на этапе frontend build, увеличьте swap на сервере или добавьте RAM. Логи будут в **Actions**.
