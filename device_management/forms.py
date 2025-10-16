from django import forms
from django.contrib import admin
from .models import (
    DeviceCategory,
    PropertyDefinition,
    Device,
    IPRecord,
    AuditLog
)


class PropertyDefinitionInlineForm(forms.ModelForm):
    """屬性定義的內聯表單"""
    
    class Meta:
        model = PropertyDefinition
        fields = '__all__'
        widgets = {
            'choices': forms.Textarea(attrs={'rows': 3}),
            'help_text': forms.Textarea(attrs={'rows': 2}),
        }
    
    def clean_choices(self):
        """驗證選項值格式"""
        choices = self.cleaned_data.get('choices')
        field_type = self.cleaned_data.get('field_type')
        
        if field_type == 'choice' and not choices:
            raise forms.ValidationError('當型態為選項時，必須提供選項值')
        
        if choices and not isinstance(choices, list):
            raise forms.ValidationError('選項值必須是列表格式')
        
        return choices


class DeviceCategoryForm(forms.ModelForm):
    """裝置類別表單"""
    
    class Meta:
        model = DeviceCategory
        fields = '__all__'
        widgets = {
            'description': forms.Textarea(attrs={'rows': 3}),
        }


class DeviceForm(forms.ModelForm):
    """裝置表單"""
    
    class Meta:
        model = Device
        fields = '__all__'
        widgets = {
            'custom_properties': forms.Textarea(attrs={
                'rows': 5,
                'placeholder': '{"屬性名稱": "值", ...}'
            }),
            'maintenance_info': forms.Textarea(attrs={'rows': 3}),
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # 如果是編輯模式且有類別，顯示該類別的屬性定義
        if self.instance and self.instance.category:
            category = self.instance.category
            properties = category.property_definitions.all()
            
            if properties:
                help_text = "該類別的屬性定義：\n"
                for prop in properties:
                    required = "（必填）" if prop.is_required else ""
                    help_text += f"- {prop.name} ({prop.get_field_type_display()}){required}\n"
                self.fields['custom_properties'].help_text = help_text
    
    def clean_custom_properties(self):
        """驗證自訂屬性"""
        custom_properties = self.cleaned_data.get('custom_properties', {})
        category = self.cleaned_data.get('category') or (
            self.instance.category if self.instance else None
        )
        
        if not category:
            return custom_properties
        
        # 獲取該類別的屬性定義
        property_definitions = category.property_definitions.all()
        
        # 驗證必填屬性
        for prop_def in property_definitions:
            if prop_def.is_required and prop_def.name not in custom_properties:
                raise forms.ValidationError(
                    f'必填屬性 "{prop_def.name}" 未提供'
                )
        
        return custom_properties
    
    def clean(self):
        """整體驗證"""
        cleaned_data = super().clean()
        
        # 驗證報廢日期
        retirement_date = cleaned_data.get('retirement_date')
        purchase_date = cleaned_data.get('purchase_date')
        
        if retirement_date and purchase_date and retirement_date < purchase_date:
            raise forms.ValidationError('報廢日期不能早於購買日期')
        
        # 驗證成本
        cost = cleaned_data.get('cost')
        if cost and cost < 0:
            raise forms.ValidationError('成本必須為正數')
        
        # 驗證折舊率
        depreciation_rate = cleaned_data.get('depreciation_rate')
        if depreciation_rate:
            if depreciation_rate < 0 or depreciation_rate > 100:
                raise forms.ValidationError('折舊率必須在 0-100 之間')
        
        return cleaned_data


class IPRecordForm(forms.ModelForm):
    """IP 記錄表單"""
    
    class Meta:
        model = IPRecord
        fields = '__all__'
        widgets = {
            'notes': forms.Textarea(attrs={'rows': 3}),
            'mac_address': forms.TextInput(attrs={
                'placeholder': 'XX:XX:XX:XX:XX:XX'
            }),
        }
    
    def clean_mac_address(self):
        """驗證 MAC 位址格式"""
        import re
        mac_address = self.cleaned_data.get('mac_address')
        
        pattern = r'^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$'
        if not re.match(pattern, mac_address):
            raise forms.ValidationError(
                'MAC 位址格式不正確，應為 XX:XX:XX:XX:XX:XX'
            )
        
        return mac_address.upper()


class AuditLogForm(forms.ModelForm):
    """操作日誌表單（唯讀）"""
    
    class Meta:
        model = AuditLog
        fields = '__all__'
        widgets = {
            'changes': forms.Textarea(attrs={'rows': 5}),
            'user_agent': forms.Textarea(attrs={'rows': 2}),
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # 將所有欄位設為唯讀
        for field in self.fields:
            self.fields[field].disabled = True
