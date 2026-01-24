# Настройка SSH для отправки на GitHub

## Текущий статус
✅ Remote настроен: `git@github.com:AsanSh/arenda.git`
✅ Коммит создан: "Проект №1: Начальная версия системы управления арендой (ZAKUP.ONE)"
✅ Тег создан: `project-1`
❌ SSH ключ не настроен

## Для отправки нужно настроить SSH ключ:

### Вариант 1: Создать новый SSH ключ

```bash
# Создать SSH ключ
ssh-keygen -t ed25519 -C "your_email@example.com" -f ~/.ssh/id_ed25519

# Показать публичный ключ для добавления в GitHub
cat ~/.ssh/id_ed25519.pub
```

Затем:
1. Скопируйте публичный ключ (вывод команды выше)
2. Перейдите: https://github.com/settings/keys
3. Нажмите "New SSH key"
4. Вставьте ключ и сохраните

После этого выполните:
```bash
cd /root/arenda
git push -u origin main
git push origin project-1
```

### Вариант 2: Использовать существующий ключ

Если у вас уже есть SSH ключ на другом компьютере:
```bash
# Скопируйте приватный ключ в ~/.ssh/id_ed25519 или ~/.ssh/id_rsa
# Установите правильные права
chmod 600 ~/.ssh/id_ed25519
chmod 644 ~/.ssh/id_ed25519.pub

# Добавьте ключ в ssh-agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Проверьте подключение
ssh -T git@github.com

# Отправьте код
cd /root/arenda
git push -u origin main
git push origin project-1
```

### Вариант 3: Использовать HTTPS с токеном

Если SSH не подходит, можно вернуться на HTTPS:

```bash
cd /root/arenda
git remote set-url origin https://github.com/AsanSh/arenda.git
git push -u origin main
# При запросе пароля используйте Personal Access Token
```

## Проверка после настройки

```bash
# Проверить подключение к GitHub
ssh -T git@github.com

# Должно вывести: "Hi AsanSh! You've successfully authenticated..."
```
