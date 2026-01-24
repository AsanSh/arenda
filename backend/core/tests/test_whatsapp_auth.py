"""
Тесты для WhatsApp авторизации
"""
from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from core.models import LoginAttempt, Tenant

User = get_user_model()


class WhatsAppAuthTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Создаем тестовых контрагентов
        self.tenant = Tenant.objects.create(
            name='Тестовый Арендатор',
            type='tenant',
            phone='+996557903999'
        )
        
        self.landlord = Tenant.objects.create(
            name='Тестовый Арендодатель',
            type='landlord',
            phone='+996700123456'
        )
        
        self.investor = Tenant.objects.create(
            name='Тестовый Инвестор',
            type='investor',
            phone='+996700654321'
        )
        
        self.admin_tenant = Tenant.objects.create(
            name='Администратор',
            type='admin',
            phone='+996700750606'
        )

    def test_start_login_attempt(self):
        """Тест создания попытки входа"""
        response = self.client.post('/api/auth/whatsapp/start/')
        
        self.assertEqual(response.status_code, 201)
        self.assertIn('attemptId', response.data)
        self.assertIn('loginMessage', response.data)
        self.assertIn('expiresAt', response.data)
        
        # Проверяем, что попытка создана в БД
        attempt = LoginAttempt.objects.get(attempt_id=response.data['attemptId'])
        self.assertEqual(attempt.status, 'NEW')
        self.assertIsNone(attempt.verified_phone)
        self.assertIsNone(attempt.user)

    def test_status_new_attempt(self):
        """Тест проверки статуса новой попытки"""
        attempt = LoginAttempt.objects.create(
            attempt_id='test-attempt-123',
            status='NEW',
            expires_at=timezone.now() + timedelta(minutes=5)
        )
        
        response = self.client.get(f'/api/auth/whatsapp/status/?attemptId={attempt.attempt_id}')
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'NEW')
        self.assertEqual(response.data['attemptId'], attempt.attempt_id)

    def test_status_expired_attempt(self):
        """Тест истекшей попытки"""
        attempt = LoginAttempt.objects.create(
            attempt_id='expired-attempt',
            status='NEW',
            expires_at=timezone.now() - timedelta(minutes=1)
        )
        
        response = self.client.get(f'/api/auth/whatsapp/status/?attemptId={attempt.attempt_id}')
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'FAILED')
        self.assertEqual(response.data['failureReason'], 'ATTEMPT_EXPIRED')
        
        # Проверяем, что статус обновлен в БД
        attempt.refresh_from_db()
        self.assertEqual(attempt.status, 'FAILED')
        self.assertEqual(attempt.failure_reason, 'ATTEMPT_EXPIRED')

    def test_webhook_tenant_login(self):
        """Тест входа арендатора через webhook"""
        attempt = LoginAttempt.objects.create(
            attempt_id='test-tenant-login',
            status='NEW',
            expires_at=timezone.now() + timedelta(minutes=5)
        )
        
        webhook_data = {
            'typeWebhook': 'incomingMessageReceived',
            'senderData': {
                'sender': '996557903999@c.us',
            },
            'messageData': {
                'textMessageData': {
                    'textMessage': f'AMT LOGIN {attempt.attempt_id}'
                }
            }
        }
        
        response = self.client.post('/api/webhooks/greenapi/incoming/', webhook_data, format='json')
        
        self.assertEqual(response.status_code, 200)
        
        # Проверяем, что попытка завершена
        attempt.refresh_from_db()
        self.assertEqual(attempt.status, 'COMPLETED')
        self.assertEqual(attempt.verified_phone, '+996557903999')
        self.assertIsNotNone(attempt.user)
        self.assertEqual(attempt.user.role, 'tenant')
        self.assertEqual(attempt.user.counterparty, self.tenant)

    def test_webhook_landlord_login(self):
        """Тест входа арендодателя через webhook"""
        attempt = LoginAttempt.objects.create(
            attempt_id='test-landlord-login',
            status='NEW',
            expires_at=timezone.now() + timedelta(minutes=5)
        )
        
        webhook_data = {
            'typeWebhook': 'incomingMessageReceived',
            'senderData': {
                'sender': '996700123456@c.us',
            },
            'messageData': {
                'textMessageData': {
                    'textMessage': f'AMT LOGIN {attempt.attempt_id}'
                }
            }
        }
        
        response = self.client.post('/api/webhooks/greenapi/incoming/', webhook_data, format='json')
        
        self.assertEqual(response.status_code, 200)
        
        attempt.refresh_from_db()
        self.assertEqual(attempt.status, 'COMPLETED')
        self.assertEqual(attempt.user.role, 'landlord')
        self.assertEqual(attempt.user.counterparty, self.landlord)

    def test_webhook_investor_login(self):
        """Тест входа инвестора через webhook"""
        attempt = LoginAttempt.objects.create(
            attempt_id='test-investor-login',
            status='NEW',
            expires_at=timezone.now() + timedelta(minutes=5)
        )
        
        webhook_data = {
            'typeWebhook': 'incomingMessageReceived',
            'senderData': {
                'sender': '996700654321@c.us',
            },
            'messageData': {
                'textMessageData': {
                    'textMessage': f'AMT LOGIN {attempt.attempt_id}'
                }
            }
        }
        
        response = self.client.post('/api/webhooks/greenapi/incoming/', webhook_data, format='json')
        
        self.assertEqual(response.status_code, 200)
        
        attempt.refresh_from_db()
        self.assertEqual(attempt.status, 'COMPLETED')
        self.assertEqual(attempt.user.role, 'investor')
        self.assertEqual(attempt.user.counterparty, self.investor)

    def test_webhook_user_not_found(self):
        """Тест ошибки USER_NOT_FOUND"""
        attempt = LoginAttempt.objects.create(
            attempt_id='test-not-found',
            status='NEW',
            expires_at=timezone.now() + timedelta(minutes=5)
        )
        
        webhook_data = {
            'typeWebhook': 'incomingMessageReceived',
            'senderData': {
                'sender': '996999999999@c.us',  # Несуществующий номер
            },
            'messageData': {
                'textMessageData': {
                    'textMessage': f'AMT LOGIN {attempt.attempt_id}'
                }
            }
        }
        
        response = self.client.post('/api/webhooks/greenapi/incoming/', webhook_data, format='json')
        
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['failureReason'], 'USER_NOT_FOUND')
        
        attempt.refresh_from_db()
        self.assertEqual(attempt.status, 'FAILED')
        self.assertEqual(attempt.failure_reason, 'USER_NOT_FOUND')

    def test_webhook_phone_not_unique(self):
        """Тест ошибки PHONE_NOT_UNIQUE (несколько пользователей с одним номером)"""
        # Создаем двух пользователей с одним номером (не должно быть в реальной системе)
        user1 = User.objects.create(
            username='user1',
            phone='+996557903999',
            role='tenant',
            counterparty=self.tenant
        )
        user2 = User.objects.create(
            username='user2',
            phone='+996557903999',
            role='tenant',
            counterparty=self.tenant
        )
        
        attempt = LoginAttempt.objects.create(
            attempt_id='test-not-unique',
            status='NEW',
            expires_at=timezone.now() + timedelta(minutes=5)
        )
        
        webhook_data = {
            'typeWebhook': 'incomingMessageReceived',
            'senderData': {
                'sender': '996557903999@c.us',
            },
            'messageData': {
                'textMessageData': {
                    'textMessage': f'AMT LOGIN {attempt.attempt_id}'
                }
            }
        }
        
        response = self.client.post('/api/webhooks/greenapi/incoming/', webhook_data, format='json')
        
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['failureReason'], 'PHONE_NOT_UNIQUE')
        
        attempt.refresh_from_db()
        self.assertEqual(attempt.status, 'FAILED')
        self.assertEqual(attempt.failure_reason, 'PHONE_NOT_UNIQUE')

    def test_webhook_attempt_expired(self):
        """Тест истекшей попытки в webhook"""
        attempt = LoginAttempt.objects.create(
            attempt_id='test-expired',
            status='NEW',
            expires_at=timezone.now() - timedelta(minutes=1)
        )
        
        webhook_data = {
            'typeWebhook': 'incomingMessageReceived',
            'senderData': {
                'sender': '996557903999@c.us',
            },
            'messageData': {
                'textMessageData': {
                    'textMessage': f'AMT LOGIN {attempt.attempt_id}'
                }
            }
        }
        
        response = self.client.post('/api/webhooks/greenapi/incoming/', webhook_data, format='json')
        
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['message'], 'Attempt expired')
        
        attempt.refresh_from_db()
        self.assertEqual(attempt.status, 'FAILED')
        self.assertEqual(attempt.failure_reason, 'ATTEMPT_EXPIRED')

    def test_status_completed_with_user(self):
        """Тест статуса COMPLETED с данными пользователя"""
        user = User.objects.create(
            username='test_user',
            phone='+996557903999',
            role='tenant',
            counterparty=self.tenant
        )
        user.set_unusable_password()
        user.save()
        
        attempt = LoginAttempt.objects.create(
            attempt_id='test-completed',
            status='COMPLETED',
            verified_phone='+996557903999',
            user=user,
            expires_at=timezone.now() + timedelta(minutes=5)
        )
        
        response = self.client.get(f'/api/auth/whatsapp/status/?attemptId={attempt.attempt_id}')
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'COMPLETED')
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['id'], user.id)
        self.assertEqual(response.data['user']['role'], 'tenant')
        self.assertEqual(response.data['user']['phone'], '+996557903999')
