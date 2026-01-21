#!/bin/bash
# Скрипт для отправки проекта на GitHub

echo "=== Отправка проекта на GitHub ==="
echo ""

# Проверка SSH подключения
echo "1. Проверка SSH подключения к GitHub..."
if ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
    echo "✅ SSH подключение работает"
else
    echo "❌ SSH ключ не добавлен в GitHub"
    echo ""
    echo "Публичный ключ для добавления:"
    echo "---"
    cat ~/.ssh/id_ed25519_github.pub
    echo "---"
    echo ""
    echo "Добавьте этот ключ на: https://github.com/settings/keys"
    echo "Затем запустите этот скрипт снова."
    exit 1
fi

echo ""
echo "2. Отправка основной ветки..."
cd /root/arenda
git push -u origin main

if [ $? -eq 0 ]; then
    echo "✅ Основная ветка отправлена"
else
    echo "❌ Ошибка при отправке основной ветки"
    exit 1
fi

echo ""
echo "3. Отправка тега project-1..."
git push origin project-1

if [ $? -eq 0 ]; then
    echo "✅ Тег отправлен"
else
    echo "❌ Ошибка при отправке тега"
    exit 1
fi

echo ""
echo "=== ✅ Проект успешно отправлен на GitHub ==="
echo "Репозиторий: https://github.com/AsanSh/arenda"
echo "Тег для восстановления: project-1"
