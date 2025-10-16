from django.test import TestCase
from django.contrib.auth.models import User
from datetime import date, timedelta
from decimal import Decimal
from .models import (
    DeviceCategory,
    PropertyDefinition,
    Device,
    IPRecord,
    AuditLog
)


class DeviceCategoryTestCase(TestCase):
    """測試裝置類別模型"""
    
    def setUp(self):
        self.category = DeviceCategory.objects.create(
            name='印表機',
            description='各種印表機設備'
        )
    
    def test_category_creation(self):
        """測試類別建立"""
        self.assertEqual(self.category.name, '印表機')
        self.assertEqual(str(self.category), '印表機')
    
    def test_category_unique_name(self):
        """測試類別名稱唯一性"""
        with self.assertRaises(Exception):
            DeviceCategory.objects.create(name='印表機')


class PropertyDefinitionTestCase(TestCase):
    """測試屬性定義模型"""
    
    def setUp(self):
        self.category = DeviceCategory.objects.create(name='印表機')
        self.property = PropertyDefinition.objects.create(
            category=self.category,
            name='墨水耗材',
            field_type='choice',
            is_required=True,
            choices=['黑色', '彩色', '混合'],
            order=1
        )
    
    def test_property_creation(self):
        """測試屬性定義建立"""
        self.assertEqual(self.property.name, '墨水耗材')
        self.assertEqual(self.property.field_type, 'choice')
        self.assertTrue(self.property.is_required)
        self.assertEqual(len(self.property.choices), 3)
    
    def test_property_unique_per_category(self):
        """測試屬性名稱在同一類別下唯一"""
        with self.assertRaises(Exception):
            PropertyDefinition.objects.create(
                category=self.category,
                name='墨水耗材',
                field_type='text'
            )


class DeviceTestCase(TestCase):
    """測試裝置模型"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.category = DeviceCategory.objects.create(name='印表機')
        self.device = Device.objects.create(
            serial_number='PRN-001',
            name='辦公室印表機',
            category=self.category,
            status='active',
            responsible_person=self.user,
            purchase_date=date.today() - timedelta(days=365),
            cost=Decimal('15000.00'),
            department='IT部門',
            location='3樓辦公室',
            depreciation_rate=Decimal('20.00'),
            created_by=self.user
        )
    
    def test_device_creation(self):
        """測試裝置建立"""
        self.assertEqual(self.device.serial_number, 'PRN-001')
        self.assertEqual(self.device.name, '辦公室印表機')
        self.assertEqual(self.device.status, 'active')
        self.assertEqual(self.device.responsible_person, self.user)
    
    def test_device_str_representation(self):
        """測試裝置字串表示"""
        self.assertEqual(str(self.device), '辦公室印表機 (PRN-001)')
    
    def test_device_custom_properties(self):
        """測試動態屬性"""
        self.device.custom_properties = {'墨水耗材': '彩色'}
        self.device.save()
        self.assertEqual(self.device.custom_properties['墨水耗材'], '彩色')
    
    def test_device_depreciation(self):
        """測試折舊計算"""
        current_value = self.device.get_current_depreciation()
        self.assertIsNotNone(current_value)
        self.assertLess(current_value, float(self.device.cost))
        self.assertGreater(current_value, 0)
    
    def test_device_serial_number_unique(self):
        """測試序號唯一性"""
        with self.assertRaises(Exception):
            Device.objects.create(
                serial_number='PRN-001',
                name='另一台印表機',
                category=self.category
            )


class IPRecordTestCase(TestCase):
    """測試 IP 記錄模型"""
    
    def setUp(self):
        self.user = User.objects.create_user(username='testuser')
        self.category = DeviceCategory.objects.create(name='電腦')
        self.device = Device.objects.create(
            serial_number='PC-001',
            name='辦公室電腦',
            category=self.category
        )
        self.ip_record = IPRecord.objects.create(
            device=self.device,
            ip_address='192.168.1.100',
            mac_address='AA:BB:CC:DD:EE:FF',
            is_active=True
        )
    
    def test_ip_record_creation(self):
        """測試 IP 記錄建立"""
        self.assertEqual(self.ip_record.ip_address, '192.168.1.100')
        self.assertEqual(self.ip_record.mac_address, 'AA:BB:CC:DD:EE:FF')
        self.assertTrue(self.ip_record.is_active)
    
    def test_ip_record_str_representation(self):
        """測試 IP 記錄字串表示"""
        expected = f'{self.device.name} - {self.ip_record.ip_address}'
        self.assertEqual(str(self.ip_record), expected)
    
    def test_ip_record_history(self):
        """測試歷史記錄"""
        self.ip_record.add_to_history('測試操作', self.user)
        self.assertEqual(len(self.ip_record.history), 1)
        self.assertEqual(self.ip_record.history[0]['action'], '測試操作')
        self.assertEqual(self.ip_record.history[0]['user'], 'testuser')


class AuditLogTestCase(TestCase):
    """測試操作日誌模型"""
    
    def setUp(self):
        self.user = User.objects.create_user(username='testuser')
        self.log = AuditLog.objects.create(
            user=self.user,
            action='create',
            model_name='Device',
            object_id='1',
            object_repr='測試裝置',
            ip_address='127.0.0.1'
        )
    
    def test_audit_log_creation(self):
        """測試日誌建立"""
        self.assertEqual(self.log.user, self.user)
        self.assertEqual(self.log.action, 'create')
        self.assertEqual(self.log.model_name, 'Device')
    
    def test_audit_log_str_representation(self):
        """測試日誌字串表示"""
        self.assertIn('testuser', str(self.log))
        self.assertIn('create', str(self.log))
        self.assertIn('Device', str(self.log))

