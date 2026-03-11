# POINT G — Счета в стиле договоров, KPI, GitHub Actions

**Дата создания:** 11 марта 2026  
**Статус:** ✅ Работоспособная версия  
**Домен:** https://assetmanagement.team  
**Буква по счёту:** G (7-я точка восстановления: A, B, C, D, E, F, **G**)  
**Git tag:** `point-g`

***

## Что добавлено / изменено с POINT F

### Страница «Счета» — единый стиль с договорами
- Таблица: колонка №, zebra-строки (bg-primary-50), компактные ячейки (px-2 py-0.5, text-xs)
- Колонка «Тип»: иконка + текст в одной строке (Landmark — банк, Banknote — наличные)
- 4 KPI-карточки: Всего | Банковские | Наличные | Баланс KGS
- useDensity, useCompactStyles для компактного режима

### Страницы «Контрагенты» и «Недвижимость»
- Стиль таблиц как в договорах (bg-primary-50, px-2 py-0.5, text-xs)
- KPI-карточки (4 штуки в ряд)
- Недвижимость: колонка №
- Контрагенты: колонка «Доп. номер», иконка в колонке «Тип»

### Счета при приёме платежа
- Staff: доступ ко всем Account для выбора счёта
- AcceptPaymentModal, BulkAcceptPaymentModal: fallback по валюте

### GitHub Actions — автодеплой
- `.github/workflows/deploy.yml`: деплой при push в main
- docs/GITHUB_ACTIONS_SETUP.md: настройка секретов (DEPLOY_HOST, DEPLOY_USER, DEPLOY_SSH_KEY)

### Backend
- core/mixins.py: staff видит все счета
- accounts/views.py: pagination_class = None

### Deploy
- NODE_OPTIONS=--max-old-space-size=1536 для frontend build (OOM на сервере)
- Ручной deploy: rsync build/ в /var/www/assetmanagement.team

***

## Восстановление POINT G

### Git
```bash
cd /root/arenda
git fetch origin
git checkout point-g
```

### Деплой
```bash
cd /root/arenda/infra
sudo ./deploy.sh
# При OOM при frontend build: NODE_OPTIONS=--max-old-space-size=1536
```

### Проверка
- [ ] Счета: 4 KPI-карточки, таблица с № и иконками типов
- [ ] Контрагенты: таблица как в договорах
- [ ] Недвижимость: KPI, колонка №
- [ ] Приём платежа: отображаются счета для выбора

***

## Структура

| Компонент | Путь | Порт |
|-----------|------|------|
| Frontend | admin-frontend/ | 3000 (dev) |
| Backend | backend/ | 8000 |
| DB | postgres:15 | 5432 |
| Production static | /var/www/assetmanagement.team | nginx |
