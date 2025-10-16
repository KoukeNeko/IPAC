from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DeviceCategoryViewSet,
    PropertyDefinitionViewSet,
    DeviceViewSet,
    IPRecordViewSet,
    AuditLogViewSet
)

# 建立路由器
router = DefaultRouter()
router.register(r'categories', DeviceCategoryViewSet, basename='devicecategory')
router.register(r'properties', PropertyDefinitionViewSet, basename='propertydefinition')
router.register(r'devices', DeviceViewSet, basename='device')
router.register(r'ip-records', IPRecordViewSet, basename='iprecord')
router.register(r'audit-logs', AuditLogViewSet, basename='auditlog')

app_name = 'device_management'

urlpatterns = [
    path('', include(router.urls)),
]
