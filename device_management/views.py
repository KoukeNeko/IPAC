from django.shortcuts import render
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Sum
from django.utils import timezone
from .models import (
    DeviceCategory,
    PropertyDefinition,
    Device,
    IPRecord,
    AuditLog
)
from .serializers import (
    DeviceCategorySerializer,
    PropertyDefinitionSerializer,
    DeviceSerializer,
    DeviceListSerializer,
    IPRecordSerializer,
    AuditLogSerializer,
    DeviceStatisticsSerializer
)
from .permissions import IsAdminOrReadOnly, IsOwnerOrAdmin


class DeviceCategoryViewSet(viewsets.ModelViewSet):
    """裝置類別的 ViewSet"""
    queryset = DeviceCategory.objects.prefetch_related('property_definitions')
    serializer_class = DeviceCategorySerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at', 'updated_at']
    ordering = ['name']
    
    def perform_create(self, serializer):
        """建立類別時記錄日誌"""
        instance = serializer.save()
        self._log_action('create', instance)
    
    def perform_update(self, serializer):
        """更新類別時記錄日誌"""
        instance = serializer.save()
        self._log_action('update', instance)
    
    def perform_destroy(self, instance):
        """刪除類別時記錄日誌"""
        self._log_action('delete', instance)
        instance.delete()
    
    def _log_action(self, action, instance):
        """記錄操作日誌"""
        AuditLog.objects.create(
            user=self.request.user,
            action=action,
            model_name='DeviceCategory',
            object_id=str(instance.id),
            object_repr=str(instance),
            ip_address=self._get_client_ip(),
            user_agent=self.request.META.get('HTTP_USER_AGENT', '')
        )
    
    def _get_client_ip(self):
        """獲取客戶端 IP"""
        x_forwarded_for = self.request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = self.request.META.get('REMOTE_ADDR')
        return ip


class PropertyDefinitionViewSet(viewsets.ModelViewSet):
    """屬性定義的 ViewSet"""
    queryset = PropertyDefinition.objects.select_related('category')
    serializer_class = PropertyDefinitionSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['category', 'field_type', 'is_required']
    ordering_fields = ['order', 'name', 'category']
    ordering = ['category', 'order', 'name']
    
    def perform_create(self, serializer):
        """建立屬性定義時記錄日誌"""
        instance = serializer.save()
        self._log_action('create', instance)
    
    def perform_update(self, serializer):
        """更新屬性定義時記錄日誌"""
        instance = serializer.save()
        self._log_action('update', instance)
    
    def perform_destroy(self, instance):
        """刪除屬性定義時記錄日誌"""
        self._log_action('delete', instance)
        instance.delete()
    
    def _log_action(self, action, instance):
        """記錄操作日誌"""
        AuditLog.objects.create(
            user=self.request.user,
            action=action,
            model_name='PropertyDefinition',
            object_id=str(instance.id),
            object_repr=str(instance),
            ip_address=self._get_client_ip(),
            user_agent=self.request.META.get('HTTP_USER_AGENT', '')
        )
    
    def _get_client_ip(self):
        """獲取客戶端 IP"""
        x_forwarded_for = self.request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = self.request.META.get('REMOTE_ADDR')
        return ip


class DeviceViewSet(viewsets.ModelViewSet):
    """裝置的 ViewSet，支援動態屬性和權限控制"""
    queryset = Device.objects.select_related(
        'category',
        'responsible_person',
        'created_by'
    ).prefetch_related('ip_records')
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'status', 'department', 'location', 'responsible_person']
    search_fields = ['serial_number', 'name', 'department', 'location', 'supplier']
    ordering_fields = ['created_at', 'updated_at', 'name', 'purchase_date', 'cost']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """根據動作選擇序列化器"""
        if self.action == 'list':
            return DeviceListSerializer
        return DeviceSerializer
    
    def get_queryset(self):
        """根據用戶權限過濾查詢集"""
        queryset = super().get_queryset()
        user = self.request.user
        
        # 管理員可以查看所有裝置
        if user.is_staff or user.is_superuser:
            return queryset
        
        # 一般用戶只能查看自己負責的裝置
        return queryset.filter(responsible_person=user)
    
    def perform_create(self, serializer):
        """建立裝置時設定建立者並記錄日誌"""
        instance = serializer.save(created_by=self.request.user)
        self._log_action('create', instance)
    
    def perform_update(self, serializer):
        """更新裝置時記錄日誌"""
        old_instance = self.get_object()
        instance = serializer.save()
        
        # 記錄變更內容
        changes = {}
        for field in serializer.validated_data:
            old_value = getattr(old_instance, field, None)
            new_value = getattr(instance, field, None)
            if old_value != new_value:
                changes[field] = {
                    'old': str(old_value),
                    'new': str(new_value)
                }
        
        self._log_action('update', instance, changes)
    
    def perform_destroy(self, instance):
        """刪除裝置時記錄日誌"""
        self._log_action('delete', instance)
        instance.delete()
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """獲取裝置統計資訊"""
        queryset = self.filter_queryset(self.get_queryset())
        
        stats = {
            'total_devices': queryset.count(),
            'active_devices': queryset.filter(status='active').count(),
            'inactive_devices': queryset.filter(status='inactive').count(),
            'maintenance_devices': queryset.filter(status='maintenance').count(),
            'retired_devices': queryset.filter(status='retired').count(),
            'devices_by_category': dict(
                queryset.values('category__name')
                .annotate(count=Count('id'))
                .values_list('category__name', 'count')
            ),
            'devices_by_department': dict(
                queryset.exclude(department__isnull=True)
                .values('department')
                .annotate(count=Count('id'))
                .values_list('department', 'count')
            ),
            'total_cost': queryset.aggregate(total=Sum('cost'))['total'] or 0,
            'total_current_value': sum(
                [d.get_current_depreciation() or 0 for d in queryset if d.cost]
            ),
        }
        
        serializer = DeviceStatisticsSerializer(stats)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """獲取裝置的操作歷史"""
        device = self.get_object()
        logs = AuditLog.objects.filter(
            model_name='Device',
            object_id=str(device.id)
        ).order_by('-timestamp')
        
        serializer = AuditLogSerializer(logs, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def search_by_ip(self, request):
        """根據 IP 位址搜尋裝置"""
        ip = request.query_params.get('ip', None)
        if not ip:
            return Response(
                {'error': '請提供 IP 參數'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        devices = self.get_queryset().filter(
            ip_records__ip_address=ip,
            ip_records__is_active=True
        ).distinct()
        
        serializer = self.get_serializer(devices, many=True)
        return Response(serializer.data)
    
    def _log_action(self, action, instance, changes=None):
        """記錄操作日誌"""
        AuditLog.objects.create(
            user=self.request.user,
            action=action,
            model_name='Device',
            object_id=str(instance.id),
            object_repr=str(instance),
            changes=changes,
            ip_address=self._get_client_ip(),
            user_agent=self.request.META.get('HTTP_USER_AGENT', '')
        )
    
    def _get_client_ip(self):
        """獲取客戶端 IP"""
        x_forwarded_for = self.request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = self.request.META.get('REMOTE_ADDR')
        return ip


class IPRecordViewSet(viewsets.ModelViewSet):
    """IP 記錄的 ViewSet"""
    queryset = IPRecord.objects.select_related('device')
    serializer_class = IPRecordSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['device', 'is_active']
    search_fields = ['ip_address', 'mac_address', 'device__name']
    ordering_fields = ['assigned_date', 'created_at', 'updated_at']
    ordering = ['-assigned_date']
    
    def get_queryset(self):
        """根據用戶權限過濾查詢集"""
        queryset = super().get_queryset()
        user = self.request.user
        
        # 管理員可以查看所有 IP 記錄
        if user.is_staff or user.is_superuser:
            return queryset
        
        # 一般用戶只能查看自己負責裝置的 IP 記錄
        return queryset.filter(device__responsible_person=user)
    
    def perform_create(self, serializer):
        """建立 IP 記錄時記錄日誌"""
        instance = serializer.save()
        self._log_action('create', instance)
    
    def perform_update(self, serializer):
        """更新 IP 記錄時記錄日誌"""
        instance = serializer.save()
        self._log_action('update', instance)
    
    def perform_destroy(self, instance):
        """刪除 IP 記錄時記錄日誌"""
        self._log_action('delete', instance)
        instance.delete()
    
    @action(detail=False, methods=['get'])
    def check_ip_available(self, request):
        """檢查 IP 是否可用"""
        ip = request.query_params.get('ip', None)
        if not ip:
            return Response(
                {'error': '請提供 IP 參數'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        is_available = not IPRecord.objects.filter(
            ip_address=ip,
            is_active=True
        ).exists()
        
        return Response({
            'ip_address': ip,
            'is_available': is_available
        })
    
    def _log_action(self, action, instance):
        """記錄操作日誌"""
        AuditLog.objects.create(
            user=self.request.user,
            action=action,
            model_name='IPRecord',
            object_id=str(instance.id),
            object_repr=str(instance),
            ip_address=self._get_client_ip(),
            user_agent=self.request.META.get('HTTP_USER_AGENT', '')
        )
    
    def _get_client_ip(self):
        """獲取客戶端 IP"""
        x_forwarded_for = self.request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = self.request.META.get('REMOTE_ADDR')
        return ip


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """操作日誌的 ViewSet（唯讀）"""
    queryset = AuditLog.objects.select_related('user')
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['user', 'action', 'model_name']
    search_fields = ['object_repr', 'model_name']
    ordering_fields = ['timestamp']
    ordering = ['-timestamp']
    
    def get_queryset(self):
        """根據用戶權限過濾查詢集"""
        queryset = super().get_queryset()
        user = self.request.user
        
        # 管理員可以查看所有日誌
        if user.is_staff or user.is_superuser:
            return queryset
        
        # 一般用戶只能查看自己的操作日誌
        return queryset.filter(user=user)

