from django.db import models
from django.contrib.auth.models import User
from django.core.validators import validate_ipv4_address
from django.utils import timezone


class DeviceCategory(models.Model):
    """裝置類別模型，定義不同類型的裝置（如印表機、電腦等）"""
    FIELD_TYPES = [
        ('text', '文字'),
        ('number', '數字'),
        ('date', '日期'),
        ('boolean', '布林值'),
        ('choice', '選項'),
    ]
    
    name = models.CharField(max_length=100, unique=True, verbose_name='類別名稱')
    description = models.TextField(blank=True, null=True, verbose_name='描述')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='建立時間')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新時間')
    
    class Meta:
        verbose_name = '裝置類別'
        verbose_name_plural = '裝置類別'
        ordering = ['name']
    
    def __str__(self):
        return self.name


class PropertyDefinition(models.Model):
    """屬性定義模型，定義每個裝置類別可以擁有的動態屬性"""
    FIELD_TYPES = [
        ('text', '文字'),
        ('number', '數字'),
        ('date', '日期'),
        ('boolean', '布林值'),
        ('choice', '選項'),
    ]
    
    category = models.ForeignKey(
        DeviceCategory, 
        on_delete=models.CASCADE, 
        related_name='property_definitions',
        verbose_name='所屬類別'
    )
    name = models.CharField(max_length=100, verbose_name='屬性名稱')
    field_type = models.CharField(
        max_length=20, 
        choices=FIELD_TYPES,
        verbose_name='屬性型態'
    )
    is_required = models.BooleanField(default=False, verbose_name='是否必填')
    default_value = models.CharField(
        max_length=255, 
        blank=True, 
        null=True,
        verbose_name='預設值'
    )
    choices = models.JSONField(
        blank=True, 
        null=True,
        help_text='當型態為選項時，填入可選值的 JSON 陣列',
        verbose_name='選項值'
    )
    help_text = models.TextField(blank=True, null=True, verbose_name='說明文字')
    order = models.IntegerField(default=0, verbose_name='排序')
    
    class Meta:
        verbose_name = '屬性定義'
        verbose_name_plural = '屬性定義'
        ordering = ['category', 'order', 'name']
        unique_together = ['category', 'name']
    
    def __str__(self):
        return f'{self.category.name} - {self.name}'


class Device(models.Model):
    """裝置模型，儲存裝置基本資訊和動態屬性"""
    STATUS_CHOICES = [
        ('active', '使用中'),
        ('inactive', '閒置'),
        ('maintenance', '維修中'),
        ('retired', '已報廢'),
    ]
    
    # 基本資訊
    serial_number = models.CharField(
        max_length=100, 
        unique=True,
        verbose_name='序號'
    )
    name = models.CharField(max_length=200, verbose_name='裝置名稱')
    category = models.ForeignKey(
        DeviceCategory,
        on_delete=models.PROTECT,
        related_name='devices',
        verbose_name='裝置類別'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active',
        verbose_name='狀態'
    )
    responsible_person = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='responsible_devices',
        verbose_name='責任人'
    )
    
    # 動態屬性（使用 JSONB 儲存）
    custom_properties = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='自訂屬性'
    )
    
    # 財產管理
    purchase_date = models.DateField(null=True, blank=True, verbose_name='購買日期')
    cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='成本'
    )
    department = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name='所屬部門'
    )
    location = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name='放置位置'
    )
    depreciation_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='年折舊率（百分比）',
        verbose_name='折舊率'
    )
    warranty_end_date = models.DateField(
        null=True,
        blank=True,
        verbose_name='保固到期日'
    )
    supplier = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name='供應商'
    )
    maintenance_info = models.TextField(
        blank=True,
        null=True,
        verbose_name='維護資訊'
    )
    retirement_date = models.DateField(
        null=True,
        blank=True,
        verbose_name='報廢日期'
    )
    
    # 時間戳記
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='建立時間')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新時間')
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_devices',
        verbose_name='建立者'
    )
    
    class Meta:
        verbose_name = '裝置'
        verbose_name_plural = '裝置'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['serial_number']),
            models.Index(fields=['status']),
            models.Index(fields=['department']),
            models.Index(fields=['location']),
        ]
    
    def __str__(self):
        return f'{self.name} ({self.serial_number})'
    
    def get_current_depreciation(self):
        """計算當前折舊值"""
        if not self.cost or not self.depreciation_rate or not self.purchase_date:
            return None
        
        years_passed = (timezone.now().date() - self.purchase_date).days / 365.25
        depreciation_amount = float(self.cost) * float(self.depreciation_rate) / 100 * years_passed
        current_value = float(self.cost) - depreciation_amount
        return max(current_value, 0)


class IPRecord(models.Model):
    """IP 記錄模型，管理裝置的 IP 和 MAC 位址"""
    device = models.ForeignKey(
        Device,
        on_delete=models.CASCADE,
        related_name='ip_records',
        verbose_name='所屬裝置'
    )
    ip_address = models.GenericIPAddressField(
        protocol='IPv4',
        verbose_name='IP 位址'
    )
    mac_address = models.CharField(
        max_length=17,
        help_text='格式：XX:XX:XX:XX:XX:XX',
        verbose_name='MAC 位址'
    )
    assigned_date = models.DateTimeField(
        default=timezone.now,
        verbose_name='分配日期'
    )
    is_active = models.BooleanField(default=True, verbose_name='是否啟用')
    notes = models.TextField(blank=True, null=True, verbose_name='備註')
    
    # 歷史記錄
    history = models.JSONField(
        default=list,
        blank=True,
        help_text='IP/MAC 異動歷史記錄',
        verbose_name='異動歷史'
    )
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='建立時間')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新時間')
    
    class Meta:
        verbose_name = 'IP 記錄'
        verbose_name_plural = 'IP 記錄'
        ordering = ['-assigned_date']
        indexes = [
            models.Index(fields=['ip_address']),
            models.Index(fields=['mac_address']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f'{self.device.name} - {self.ip_address}'
    
    def add_to_history(self, action, user=None):
        """添加異動記錄到歷史"""
        history_entry = {
            'timestamp': timezone.now().isoformat(),
            'action': action,
            'ip_address': self.ip_address,
            'mac_address': self.mac_address,
            'user': user.username if user else None,
        }
        if self.history is None:
            self.history = []
        self.history.append(history_entry)
        self.save()


class AuditLog(models.Model):
    """操作日誌模型，記錄所有重要的操作"""
    ACTION_CHOICES = [
        ('create', '建立'),
        ('update', '更新'),
        ('delete', '刪除'),
        ('view', '查看'),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
        verbose_name='操作用戶'
    )
    action = models.CharField(
        max_length=20,
        choices=ACTION_CHOICES,
        verbose_name='操作類型'
    )
    model_name = models.CharField(max_length=100, verbose_name='模型名稱')
    object_id = models.CharField(max_length=100, verbose_name='物件 ID')
    object_repr = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name='物件表示'
    )
    changes = models.JSONField(
        blank=True,
        null=True,
        verbose_name='變更內容'
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name='操作 IP'
    )
    user_agent = models.TextField(blank=True, null=True, verbose_name='用戶代理')
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name='操作時間')
    
    class Meta:
        verbose_name = '操作日誌'
        verbose_name_plural = '操作日誌'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['model_name', '-timestamp']),
            models.Index(fields=['action', '-timestamp']),
        ]
    
    def __str__(self):
        return f'{self.user} - {self.action} - {self.model_name} ({self.timestamp})'

