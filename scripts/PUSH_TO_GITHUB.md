# Инструкция по отправке проекта на GitHub

## Текущий статус
✅ Git репозиторий инициализирован
✅ Все файлы добавлены в коммит
✅ Создан коммит: "Проект №1: Начальная версия системы управления арендой (ZAKUP.ONE)"
✅ Создан тег: "project-1" для восстановления этой версии
✅ Remote настроен: https://github.com/AsanSh/arenda.git

## Для отправки на GitHub выполните одну из команд:

### Вариант 1: Использование SSH (рекомендуется)
```bash
# Переключите remote на SSH
git remote set-url origin git@github.com:AsanSh/arenda.git

# Отправьте код
git push -u origin main
git push origin project-1  # Отправьте тег
```

### Вариант 2: Использование Personal Access Token
```bash
# GitHub попросит ввести username и password
# В качестве password используйте Personal Access Token
# Получить токен: GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)
git push -u origin main
git push origin project-1  # Отправьте тег
```

### Вариант 3: Использование GitHub CLI
```bash
gh auth login
git push -u origin main
git push origin project-1
```

## Восстановление проекта №1

Если нужно восстановить эту версию в будущем:

```bash
# Клонировать репозиторий
git clone https://github.com/AsanSh/arenda.git
cd arenda

# Переключиться на тег project-1
git checkout project-1

# Или создать новую ветку из тега
git checkout -b restore-project-1 project-1
```

## Проверка текущего состояния

```bash
# Проверить статус
git status

# Посмотреть коммиты
git log --oneline

# Посмотреть теги
git tag -l

# Посмотреть remote
git remote -v
```
