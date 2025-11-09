from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import ProductViewSet, CategoryViewSet, HomeConfigView, RegisterView, LoginView, LogoutView, MeView, OrderViewSet, CsrfView, BootstrapSuperuserView, PaymentSettingView, PaymentGatewayView

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'orders', OrderViewSet, basename='order')

urlpatterns = [
    path('', include(router.urls)),
    path('home/', HomeConfigView.as_view()),
    path('auth/register/', RegisterView.as_view()),
    path('auth/login/', LoginView.as_view()),
    path('auth/logout/', LogoutView.as_view()),
    path('auth/me/', MeView.as_view()),
    path('auth/csrf/', CsrfView.as_view()),
    path('auth/bootstrap-superuser/', BootstrapSuperuserView.as_view()),
    path('payment/settings/', PaymentSettingView.as_view()),
    path('payment/gateways/', PaymentGatewayView.as_view()),
]
