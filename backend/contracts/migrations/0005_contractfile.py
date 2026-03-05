# Generated manually for ContractFile model

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('contracts', '0004_contract_landlord'),
    ]

    operations = [
        migrations.CreateModel(
            name='ContractFile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('file_type', models.CharField(choices=[('contract', 'Договор'), ('supplement', 'Дополнительное соглашение'), ('other', 'Прочее')], default='contract', max_length=20, verbose_name='Тип файла')),
                ('file', models.FileField(upload_to='contracts/%Y/%m/', verbose_name='Файл')),
                ('title', models.CharField(blank=True, max_length=255, verbose_name='Название')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('contract', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='files', to='contracts.contract', verbose_name='Договор')),
            ],
            options={
                'verbose_name': 'Файл договора',
                'verbose_name_plural': 'Файлы договоров',
                'db_table': 'contract_files',
                'ordering': ['-created_at'],
            },
        ),
    ]
