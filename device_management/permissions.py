from rest_framework import permissions


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    自訂權限：管理員可以進行所有操作，一般用戶只能讀取
    """
    
    def has_permission(self, request, view):
        # 允許所有已認證用戶讀取
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # 只有管理員可以寫入
        return request.user and (request.user.is_staff or request.user.is_superuser)


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    自訂權限：物件擁有者或管理員可以編輯
    """
    
    def has_object_permission(self, request, view, obj):
        # 允許所有已認證用戶讀取
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # 管理員有完整權限
        if request.user and (request.user.is_staff or request.user.is_superuser):
            return True
        
        # 檢查是否為物件擁有者
        if hasattr(obj, 'responsible_person'):
            return obj.responsible_person == request.user
        
        if hasattr(obj, 'created_by'):
            return obj.created_by == request.user
        
        return False


class IsAdminUser(permissions.BasePermission):
    """
    自訂權限：只有管理員可以存取
    """
    
    def has_permission(self, request, view):
        return request.user and (request.user.is_staff or request.user.is_superuser)
