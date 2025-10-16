from django.contrib import admin
from django.utils.html import format_html
from .models import (
    DeviceCategory,
    PropertyDefinition,
    Device,
    IPRecord,
    AuditLog
)
from .forms import (
    DeviceCategoryForm,
    PropertyDefinitionInlineForm,
    DeviceForm,
    IPRecordForm,
    AuditLogForm
)


class PropertyDefinitionInline(admin.TabularInline):
    """屬性定義內聯"""
    model = PropertyDefinition
    form = PropertyDefinitionInlineForm
    extra = 1
    fields = ['name', 'field_type', 'is_required', 'default_value', 'choices', 'help_text', 'order']


@admin.register(DeviceCategory)
class DeviceCategoryAdmin(admin.ModelAdmin):
    """裝置類別管理"""
    form = DeviceCategoryForm
    list_display = ['name', 'description', 'device_count', 'created_at', 'updated_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [PropertyDefinitionInline]
    
    def device_count(self, obj):
        """顯示裝置數量"""
        count = obj.devices.count()
        return format_html('<span style="color: blue;">{}</span>', count)
    device_count.short_description = '裝置數量'


@admin.register(PropertyDefinition)
class PropertyDefinitionAdmin(admin.ModelAdmin):
    """屬性定義管理"""
    form = PropertyDefinitionInlineForm
    list_display = ['name', 'category', 'field_type', 'is_required', 'order']
    list_filter = ['category', 'field_type', 'is_required']
    search_fields = ['name', 'category__name']
    ordering = ['category', 'order', 'name']


class IPRecordInline(admin.TabularInline):
    """IP 記錄內聯"""
    model = IPRecord
    form = IPRecordForm
    extra = 0
    fields = ['ip_address', 'mac_address', 'assigned_date', 'is_active', 'notes']
    readonly_fields = []


@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    """裝置管理"""
    form = DeviceForm
    list_display = [
        'serial_number', 'name', 'category', 'status', 
        'responsible_person', 'department', 'location',
        'cost_display', 'current_value_display', 'created_at'
    ]
    list_filter = ['category', 'status', 'department', 'location']
    search_fields = ['serial_number', 'name', 'department', 'location', 'supplier']
    readonly_fields = ['created_at', 'updated_at', 'created_by', 'current_value_display']
    fieldsets = (
        ('基本資訊', {
            'fields': ('serial_number', 'name', 'category', 'status', 'responsible_person')
        }),
        ('動態屬性', {
            'fields': ('custom_properties',),
            'classes': ('collapse',)
        }),
        ('財產管理', {
            'fields': (
                'purchase_date', 'cost', 'department', 'location',
                'depreciation_rate', 'current_value_display', 'warranty_end_date',
                'supplier', 'maintenance_info', 'retirement_date'
            )
        }),
        ('系統資訊', {
            'fields': ('created_at', 'updated_at', 'created_by'),
            'classes': ('collapse',)
        }),
    )
    inlines = [IPRecordInline]
    
    def save_model(self, request, obj, form, change):
        """儲存時設定建立者"""
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
    
    def cost_display(self, obj):
        """顯示成本"""
        if obj.cost:
            return format_html('<span style="color: green;">NT$ {:,.2f}</span>', obj.cost)
        return '-'
    cost_display.short_description = '成本'
    
    def current_value_display(self, obj):
        """顯示當前價值"""
        value = obj.get_current_depreciation()
        if value is not None:
            return format_html('<span style="color: blue;">NT$ {:,.2f}</span>', value)
        return '-'
    current_value_display.short_description = '當前價值'


@admin.register(IPRecord)
class IPRecordAdmin(admin.ModelAdmin):
    """IP 記錄管理"""
    form = IPRecordForm
    list_display = [
        'device', 'ip_address', 'mac_address', 
        'assigned_date', 'is_active_display', 'created_at'
    ]
    list_filter = ['is_active', 'assigned_date']
    search_fields = ['ip_address', 'mac_address', 'device__name', 'device__serial_number']
    readonly_fields = ['created_at', 'updated_at', 'history']
    fieldsets = (
        ('基本資訊', {
            'fields': ('device', 'ip_address', 'mac_address', 'assigned_date', 'is_active', 'notes')
        }),
        ('系統資訊', {
            'fields': ('history', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def is_active_display(self, obj):
        """顯示啟用狀態"""
        if obj.is_active:
            return format_html('<span style="color: green;">✓ 啟用</span>')
        return format_html('<span style="color: red;">✗ 停用</span>')
    is_active_display.short_description = '狀態'


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """操作日誌管理（唯讀）"""
    form = AuditLogForm
    list_display = [
        'timestamp', 'user', 'action_display', 
        'model_name', 'object_repr', 'ip_address'
    ]
    list_filter = ['action', 'model_name', 'timestamp']
    search_fields = ['user__username', 'model_name', 'object_repr', 'ip_address']
    readonly_fields = [
        'user', 'action', 'model_name', 'object_id', 
        'object_repr', 'changes', 'ip_address', 'user_agent', 'timestamp'
    ]
    
    def action_display(self, obj):
        """顯示操作類型"""
        colors = {
            'create': 'green',
            'update': 'blue',
            'delete': 'red',
            'view': 'gray'
        }
        color = colors.get(obj.action, 'black')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_action_display()
        )
    action_display.short_description = '操作'
    
    def has_add_permission(self, request):
        """禁止新增日誌"""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """禁止刪除日誌"""
        return False

