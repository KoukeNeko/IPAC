from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from device_management.models import (
    DeviceCategory,
    PropertyDefinition,
    Device,
    IPRecord
)
from datetime import date, timedelta
from decimal import Decimal


class Command(BaseCommand):
    help = '建立範例資料用於測試系統功能'

    def handle(self, *args, **options):
        self.stdout.write('開始建立範例資料...')
        
        # 建立測試使用者
        admin_user, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'is_staff': True,
                'is_superuser': True,
                'email': 'admin@example.com'
            }
        )
        if created:
            admin_user.set_password('admin123')
            admin_user.save()
            self.stdout.write(self.style.SUCCESS('✓ 建立管理員帳號: admin / admin123'))
        
        user1, created = User.objects.get_or_create(
            username='user1',
            defaults={'email': 'user1@example.com'}
        )
        if created:
            user1.set_password('user123')
            user1.save()
            self.stdout.write(self.style.SUCCESS('✓ 建立使用者帳號: user1 / user123'))
        
        # 建立裝置類別
        printer_category, _ = DeviceCategory.objects.get_or_create(
            name='印表機',
            defaults={'description': '各種印表機設備'}
        )
        
        computer_category, _ = DeviceCategory.objects.get_or_create(
            name='電腦',
            defaults={'description': '桌上型電腦和筆記型電腦'}
        )
        
        network_category, _ = DeviceCategory.objects.get_or_create(
            name='網路設備',
            defaults={'description': '交換器、路由器等網路設備'}
        )
        
        self.stdout.write(self.style.SUCCESS('✓ 建立裝置類別'))
        
        # 建立屬性定義 - 印表機
        PropertyDefinition.objects.get_or_create(
            category=printer_category,
            name='墨水耗材',
            defaults={
                'field_type': 'choice',
                'is_required': True,
                'choices': ['黑色', '彩色', '混合'],
                'order': 1
            }
        )
        
        PropertyDefinition.objects.get_or_create(
            category=printer_category,
            name='列印速度',
            defaults={
                'field_type': 'number',
                'is_required': False,
                'help_text': '每分鐘頁數（PPM）',
                'order': 2
            }
        )
        
        # 建立屬性定義 - 電腦
        PropertyDefinition.objects.get_or_create(
            category=computer_category,
            name='CPU',
            defaults={
                'field_type': 'text',
                'is_required': True,
                'order': 1
            }
        )
        
        PropertyDefinition.objects.get_or_create(
            category=computer_category,
            name='記憶體',
            defaults={
                'field_type': 'number',
                'is_required': True,
                'help_text': 'GB',
                'order': 2
            }
        )
        
        PropertyDefinition.objects.get_or_create(
            category=computer_category,
            name='作業系統',
            defaults={
                'field_type': 'choice',
                'is_required': True,
                'choices': ['Windows 10', 'Windows 11', 'macOS', 'Linux'],
                'order': 3
            }
        )
        
        # 建立屬性定義 - 網路設備
        PropertyDefinition.objects.get_or_create(
            category=network_category,
            name='連接埠數量',
            defaults={
                'field_type': 'number',
                'is_required': True,
                'order': 1
            }
        )
        
        PropertyDefinition.objects.get_or_create(
            category=network_category,
            name='速度',
            defaults={
                'field_type': 'choice',
                'is_required': True,
                'choices': ['100Mbps', '1Gbps', '10Gbps'],
                'order': 2
            }
        )
        
        self.stdout.write(self.style.SUCCESS('✓ 建立屬性定義'))
        
        # 建立範例裝置
        devices_data = [
            {
                'serial_number': 'PRN-001',
                'name': '辦公室彩色印表機',
                'category': printer_category,
                'status': 'active',
                'responsible_person': user1,
                'custom_properties': {
                    '墨水耗材': '彩色',
                    '列印速度': 30
                },
                'purchase_date': date.today() - timedelta(days=365),
                'cost': Decimal('15000.00'),
                'department': 'IT部門',
                'location': '3樓辦公室',
                'depreciation_rate': Decimal('20.00'),
                'supplier': '辦公設備公司',
                'warranty_end_date': date.today() + timedelta(days=365),
                'created_by': admin_user
            },
            {
                'serial_number': 'PC-001',
                'name': '會計部桌機',
                'category': computer_category,
                'status': 'active',
                'responsible_person': user1,
                'custom_properties': {
                    'CPU': 'Intel Core i5-12400',
                    '記憶體': 16,
                    '作業系統': 'Windows 11'
                },
                'purchase_date': date.today() - timedelta(days=180),
                'cost': Decimal('25000.00'),
                'department': '會計部',
                'location': '2樓財務室',
                'depreciation_rate': Decimal('25.00'),
                'supplier': '電腦專賣店',
                'warranty_end_date': date.today() + timedelta(days=1095),
                'created_by': admin_user
            },
            {
                'serial_number': 'NET-001',
                'name': '主機房核心交換器',
                'category': network_category,
                'status': 'active',
                'responsible_person': admin_user,
                'custom_properties': {
                    '連接埠數量': 48,
                    '速度': '1Gbps'
                },
                'purchase_date': date.today() - timedelta(days=730),
                'cost': Decimal('50000.00'),
                'department': 'IT部門',
                'location': '主機房',
                'depreciation_rate': Decimal('20.00'),
                'supplier': '網路設備商',
                'warranty_end_date': date.today() + timedelta(days=1825),
                'created_by': admin_user
            },
        ]
        
        for device_data in devices_data:
            device, created = Device.objects.get_or_create(
                serial_number=device_data['serial_number'],
                defaults=device_data
            )
            if created:
                self.stdout.write(f'  ✓ 建立裝置: {device.name}')
        
        # 建立 IP 記錄
        ip_records_data = [
            {
                'device_serial': 'PRN-001',
                'ip_address': '192.168.1.100',
                'mac_address': 'AA:BB:CC:DD:EE:01',
                'is_active': True,
                'notes': '辦公室印表機 IP'
            },
            {
                'device_serial': 'PC-001',
                'ip_address': '192.168.1.50',
                'mac_address': 'AA:BB:CC:DD:EE:02',
                'is_active': True,
                'notes': '會計部桌機 IP'
            },
            {
                'device_serial': 'NET-001',
                'ip_address': '192.168.1.1',
                'mac_address': 'AA:BB:CC:DD:EE:03',
                'is_active': True,
                'notes': '主機房核心交換器 IP'
            },
        ]
        
        for ip_data in ip_records_data:
            try:
                device = Device.objects.get(serial_number=ip_data['device_serial'])
                ip_record, created = IPRecord.objects.get_or_create(
                    device=device,
                    ip_address=ip_data['ip_address'],
                    defaults={
                        'mac_address': ip_data['mac_address'],
                        'is_active': ip_data['is_active'],
                        'notes': ip_data['notes']
                    }
                )
                if created:
                    self.stdout.write(f'  ✓ 建立 IP 記錄: {ip_record.ip_address}')
            except Device.DoesNotExist:
                pass
        
        self.stdout.write(self.style.SUCCESS('\n範例資料建立完成！'))
        self.stdout.write('\n可以使用以下帳號登入:')
        self.stdout.write('  管理員: admin / admin123')
        self.stdout.write('  使用者: user1 / user123')
        self.stdout.write('\nAPI 端點:')
        self.stdout.write('  http://localhost:8000/api/')
        self.stdout.write('  http://localhost:8000/admin/')
