from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    DeviceCategory,
    PropertyDefinition,
    Device,
    IPRecord,
    AuditLog
)
from datetime import datetime


class PropertyDefinitionSerializer(serializers.ModelSerializer):
    """屬性定義序列化器"""
    
    class Meta:
        model = PropertyDefinition
        fields = [
            'id', 'category', 'name', 'field_type', 'is_required',
            'default_value', 'choices', 'help_text', 'order'
        ]
    
    def validate_choices(self, value):
        """驗證選項值必須是列表"""
        if value is not None and not isinstance(value, list):
            raise serializers.ValidationError('選項值必須是列表格式')
        return value


class DeviceCategorySerializer(serializers.ModelSerializer):
    """裝置類別序列化器"""
    property_definitions = PropertyDefinitionSerializer(many=True, read_only=True)
    device_count = serializers.SerializerMethodField()
    
    class Meta:
        model = DeviceCategory
        fields = [
            'id', 'name', 'description', 'created_at', 'updated_at',
            'property_definitions', 'device_count'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_device_count(self, obj):
        """獲取該類別的裝置數量"""
        return obj.devices.count()


class UserSerializer(serializers.ModelSerializer):
    """用戶序列化器"""
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


class IPRecordSerializer(serializers.ModelSerializer):
    """IP 記錄序列化器"""
    device_name = serializers.CharField(source='device.name', read_only=True)
    
    class Meta:
        model = IPRecord
        fields = [
            'id', 'device', 'device_name', 'ip_address', 'mac_address',
            'assigned_date', 'is_active', 'notes', 'history',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'history']
    
    def validate_mac_address(self, value):
        """驗證 MAC 位址格式"""
        import re
        pattern = r'^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$'
        if not re.match(pattern, value):
            raise serializers.ValidationError(
                'MAC 位址格式不正確，應為 XX:XX:XX:XX:XX:XX'
            )
        return value.upper()
    
    def create(self, validated_data):
        """建立 IP 記錄並記錄到歷史"""
        instance = super().create(validated_data)
        request = self.context.get('request')
        user = request.user if request else None
        instance.add_to_history('IP 記錄建立', user)
        return instance
    
    def update(self, instance, validated_data):
        """更新 IP 記錄並記錄變更到歷史"""
        old_ip = instance.ip_address
        old_mac = instance.mac_address
        instance = super().update(instance, validated_data)
        
        request = self.context.get('request')
        user = request.user if request else None
        
        if old_ip != instance.ip_address or old_mac != instance.mac_address:
            action = f'IP 從 {old_ip} 變更為 {instance.ip_address}, MAC 從 {old_mac} 變更為 {instance.mac_address}'
            instance.add_to_history(action, user)
        
        return instance


class DeviceSerializer(serializers.ModelSerializer):
    """裝置序列化器，支援動態屬性驗證"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    responsible_person_name = serializers.CharField(
        source='responsible_person.username',
        read_only=True,
        allow_null=True
    )
    created_by_name = serializers.CharField(
        source='created_by.username',
        read_only=True,
        allow_null=True
    )
    ip_records = IPRecordSerializer(many=True, read_only=True)
    current_value = serializers.SerializerMethodField()
    
    class Meta:
        model = Device
        fields = [
            'id', 'serial_number', 'name', 'category', 'category_name',
            'status', 'responsible_person', 'responsible_person_name',
            'custom_properties', 'purchase_date', 'cost', 'department',
            'location', 'depreciation_rate', 'warranty_end_date',
            'supplier', 'maintenance_info', 'retirement_date',
            'created_at', 'updated_at', 'created_by', 'created_by_name',
            'ip_records', 'current_value'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by']
    
    def get_current_value(self, obj):
        """獲取當前折舊後的價值"""
        return obj.get_current_depreciation()
    
    def validate_custom_properties(self, value):
        """驗證動態屬性是否符合類別定義"""
        # 在更新時，從 instance 獲取 category
        if self.instance:
            category = self.instance.category
        # 在建立時，從 initial_data 獲取 category
        elif 'category' in self.initial_data:
            try:
                category = DeviceCategory.objects.get(id=self.initial_data['category'])
            except DeviceCategory.DoesNotExist:
                raise serializers.ValidationError('指定的裝置類別不存在')
        else:
            # 如果沒有提供 category，跳過驗證（將由其他驗證處理）
            return value
        
        # 獲取該類別的所有屬性定義
        property_definitions = category.property_definitions.all()
        
        # 驗證必填屬性
        for prop_def in property_definitions:
            if prop_def.is_required and prop_def.name not in value:
                raise serializers.ValidationError(
                    f'必填屬性 "{prop_def.name}" 未提供'
                )
        
        # 驗證屬性型態
        for prop_name, prop_value in value.items():
            try:
                prop_def = property_definitions.get(name=prop_name)
            except PropertyDefinition.DoesNotExist:
                # 允許額外的屬性，但發出警告
                continue
            
            # 根據型態驗證值
            if prop_def.field_type == 'number':
                try:
                    float(prop_value)
                except (ValueError, TypeError):
                    raise serializers.ValidationError(
                        f'屬性 "{prop_name}" 必須是數字'
                    )
            elif prop_def.field_type == 'boolean':
                if not isinstance(prop_value, bool):
                    raise serializers.ValidationError(
                        f'屬性 "{prop_name}" 必須是布林值'
                    )
            elif prop_def.field_type == 'date':
                try:
                    datetime.fromisoformat(str(prop_value))
                except (ValueError, TypeError):
                    raise serializers.ValidationError(
                        f'屬性 "{prop_name}" 必須是有效的日期格式'
                    )
            elif prop_def.field_type == 'choice':
                if prop_def.choices and prop_value not in prop_def.choices:
                    raise serializers.ValidationError(
                        f'屬性 "{prop_name}" 的值必須是 {prop_def.choices} 中的一個'
                    )
        
        return value
    
    def validate(self, data):
        """整體驗證"""
        # 驗證報廢日期必須在購買日期之後
        if data.get('retirement_date') and data.get('purchase_date'):
            if data['retirement_date'] < data['purchase_date']:
                raise serializers.ValidationError(
                    '報廢日期不能早於購買日期'
                )
        
        # 驗證成本必須為正數
        if data.get('cost') and data['cost'] < 0:
            raise serializers.ValidationError('成本必須為正數')
        
        # 驗證折舊率範圍
        if data.get('depreciation_rate'):
            if data['depreciation_rate'] < 0 or data['depreciation_rate'] > 100:
                raise serializers.ValidationError('折舊率必須在 0-100 之間')
        
        return data


class DeviceListSerializer(serializers.ModelSerializer):
    """裝置列表序列化器（簡化版，提高列表查詢效能）"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    responsible_person_name = serializers.CharField(
        source='responsible_person.username',
        read_only=True,
        allow_null=True
    )
    
    class Meta:
        model = Device
        fields = [
            'id', 'serial_number', 'name', 'category_name',
            'status', 'responsible_person_name', 'department',
            'location', 'created_at', 'updated_at'
        ]


class AuditLogSerializer(serializers.ModelSerializer):
    """操作日誌序列化器"""
    user_name = serializers.CharField(source='user.username', read_only=True, allow_null=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_name', 'action', 'model_name',
            'object_id', 'object_repr', 'changes', 'ip_address',
            'user_agent', 'timestamp'
        ]
        read_only_fields = ['timestamp']


class DeviceStatisticsSerializer(serializers.Serializer):
    """裝置統計序列化器"""
    total_devices = serializers.IntegerField()
    active_devices = serializers.IntegerField()
    inactive_devices = serializers.IntegerField()
    maintenance_devices = serializers.IntegerField()
    retired_devices = serializers.IntegerField()
    devices_by_category = serializers.DictField()
    devices_by_department = serializers.DictField()
    total_cost = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_current_value = serializers.DecimalField(max_digits=15, decimal_places=2)
