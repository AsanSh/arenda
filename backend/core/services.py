import requests
from bs4 import BeautifulSoup
from decimal import Decimal
from datetime import date
from .models import ExchangeRate


class ExchangeRateService:
    """Сервис для получения курсов валют с valuta.kg"""
    
    @staticmethod
    def fetch_rates_from_valuta_kg():
        """
        Получает курсы валют с сайта valuta.kg
        Возвращает словарь с курсами: {currency: {'nbkr': rate, 'average': rate, 'best': rate}}
        """
        try:
            url = 'https://valuta.kg/'
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            rates = {}
            
            # Парсим курс НБКР
            nbkr_table = soup.find('table')
            if nbkr_table:
                rows = nbkr_table.find_all('tr')
                currencies = ['USD', 'EUR', 'RUB']
                for i, row in enumerate(rows[1:4]):  # Пропускаем заголовок
                    cells = row.find_all('td')
                    if len(cells) >= 2:
                        currency = currencies[i] if i < len(currencies) else None
                        if currency:
                            try:
                                rate = Decimal(cells[1].get_text(strip=True))
                                if currency not in rates:
                                    rates[currency] = {}
                                rates[currency]['nbkr'] = rate
                            except (ValueError, IndexError):
                                pass
            
            # Парсим средний курс
            avg_table = soup.find_all('table')
            if len(avg_table) > 1:
                avg_rows = avg_table[1].find_all('tr')
                for i, row in enumerate(avg_rows[1:4]):
                    cells = row.find_all('td')
                    if len(cells) >= 2:
                        currency = currencies[i] if i < len(currencies) else None
                        if currency:
                            try:
                                rate = Decimal(cells[0].get_text(strip=True))
                                if currency not in rates:
                                    rates[currency] = {}
                                rates[currency]['average'] = rate
                            except (ValueError, IndexError):
                                pass
            
            # Парсим лучший курс
            best_table = soup.find_all('table')
            if len(best_table) > 2:
                best_rows = best_table[2].find_all('tr')
                for i, row in enumerate(best_rows[1:4]):
                    cells = row.find_all('td')
                    if len(cells) >= 2:
                        currency = currencies[i] if i < len(currencies) else None
                        if currency:
                            try:
                                rate = Decimal(cells[0].get_text(strip=True))
                                if currency not in rates:
                                    rates[currency] = {}
                                rates[currency]['best'] = rate
                            except (ValueError, IndexError):
                                pass
            
            return rates
            
        except Exception as e:
            print(f"Error fetching rates from valuta.kg: {e}")
            return {}
    
    @staticmethod
    def update_rates():
        """Обновляет курсы валют в базе данных"""
        rates = ExchangeRateService.fetch_rates_from_valuta_kg()
        today = date.today()
        
        for currency, rate_data in rates.items():
            for source, rate_value in rate_data.items():
                ExchangeRate.objects.update_or_create(
                    currency=currency,
                    source=source,
                    date=today,
                    defaults={'rate': rate_value}
                )
        
        return rates
    
    @staticmethod
    def get_rate(currency: str, source: str = 'nbkr') -> Decimal:
        """Получить курс валюты на сегодня"""
        today = date.today()
        try:
            rate_obj = ExchangeRate.objects.get(
                currency=currency,
                source=source,
                date=today
            )
            return rate_obj.rate
        except ExchangeRate.DoesNotExist:
            # Если курса нет, пытаемся обновить
            ExchangeRateService.update_rates()
            try:
                rate_obj = ExchangeRate.objects.get(
                    currency=currency,
                    source=source,
                    date=today
                )
                return rate_obj.rate
            except ExchangeRate.DoesNotExist:
                # Возвращаем примерный курс, если не удалось получить
                default_rates = {
                    'USD': Decimal('87.50'),
                    'EUR': Decimal('101.60'),
                    'RUB': Decimal('1.120'),
                }
                return default_rates.get(currency, Decimal('1'))
    
    @staticmethod
    def convert_to_kgs(amount: Decimal, currency: str, source: str = 'nbkr') -> Decimal:
        """Конвертировать сумму в сомы"""
        if currency == 'KGS':
            return amount
        rate = ExchangeRateService.get_rate(currency, source)
        return amount * rate
