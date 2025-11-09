from rest_framework import viewsets, decorators, response, status, permissions
from rest_framework.views import APIView
from django.db import models
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.utils.decorators import method_decorator
from django.conf import settings
from .models import Product, Category, SiteSetting, Order, PaymentSetting, PaymentGateway
from .serializers import ProductSerializer, CategoryTreeSerializer, HomeConfigSerializer, UserSerializer, OrderSerializer, PaymentSettingSerializer, PaymentGatewaySerializer


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().order_by('id')
    serializer_class = ProductSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        q = self.request.query_params.get('q')
        if q:
            qs = qs.filter(models.Q(name__icontains=q) | models.Q(description__icontains=q))
        category_id = self.request.query_params.get('category_id')
        if category_id and str(category_id).isdigit():
            qs = qs.filter(category_fk_id=int(category_id))
        category_name = self.request.query_params.get('category')
        if category_name:
            qs = qs.filter(models.Q(category__iexact=category_name) | models.Q(category_fk__name__iexact=category_name))
        min_price = self.request.query_params.get('min_price')
        if min_price not in (None, ""):
            try:
                qs = qs.filter(price__gte=min_price)
            except Exception:
                pass
        max_price = self.request.query_params.get('max_price')
        if max_price not in (None, ""):
            try:
                qs = qs.filter(price__lte=max_price)
            except Exception:
                pass
        ordering = (self.request.query_params.get('ordering') or '').lower()
        if ordering == 'newest':
            qs = qs.order_by('-id')
        elif ordering == 'oldest':
            qs = qs.order_by('id')
        elif ordering == 'price_asc':
            qs = qs.order_by('price', 'id')
        elif ordering == 'price_desc':
            qs = qs.order_by('-price', '-id')
        return qs

    @decorators.action(detail=True, methods=['post'])
    def clone(self, request, pk=None):
        try:
            src = self.get_object()
        except Exception:
            return response.Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        src.pk = None
        src.name = f"{src.name} (Copy)"
        src.save()
        return response.Response(ProductSerializer(src).data, status=status.HTTP_201_CREATED)


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.filter(parent__isnull=True).order_by('name')
    serializer_class = CategoryTreeSerializer

    @decorators.action(detail=False, methods=['get'], url_path='tree')
    def tree(self, request):
        roots = Category.objects.filter(parent__isnull=True).order_by('name')
        data = CategoryTreeSerializer(roots, many=True).data
        return response.Response(data)


class HomeConfigView(APIView):
    def get(self, request):
        site = SiteSetting.objects.first()
        if not site:
            site = SiteSetting.objects.create(home_product_limit=12)
        serializer = HomeConfigSerializer(instance=site)
        return response.Response(serializer.data)


@method_decorator(csrf_exempt, name="dispatch")
class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = request.data or {}
        email = (data.get('email') or '').strip()
        username = (data.get('username') or '').strip() or email
        password = data.get('password') or ''
        first_name = (data.get('first_name') or '').strip()
        last_name = (data.get('last_name') or '').strip()
        if not email or not password:
            return response.Response({"detail": "Email and password required"}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(models.Q(username__iexact=username) | models.Q(email__iexact=email)).exists():
            return response.Response({"detail": "User already exists"}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.create_user(username=username, email=email, password=password, first_name=first_name, last_name=last_name)
        return response.Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


@method_decorator(csrf_exempt, name="dispatch")
class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = request.data or {}
        email_or_username = (data.get('email') or data.get('username') or '').strip()
        password = data.get('password') or ''
        if not email_or_username or not password:
            return response.Response({"detail": "Credentials required"}, status=status.HTTP_400_BAD_REQUEST)
        # Try username first, then email
        user = authenticate(request, username=email_or_username, password=password)
        if not user:
            try:
                user_obj = User.objects.filter(email__iexact=email_or_username).first()
                if user_obj:
                    user = authenticate(request, username=user_obj.username, password=password)
            except Exception:
                user = None
        if not user:
            return response.Response({"detail": "Invalid credentials"}, status=status.HTTP_400_BAD_REQUEST)
        login(request, user)
        return response.Response(UserSerializer(user).data)


class MeView(APIView):
    def get(self, request):
        if not request.user or not request.user.is_authenticated:
            return response.Response({"detail": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
        return response.Response(UserSerializer(request.user).data)


@method_decorator(csrf_exempt, name="dispatch")
class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return response.Response({"ok": True})


@method_decorator(csrf_exempt, name="dispatch")
class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all().order_by('-id')
    serializer_class = OrderSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = super().get_queryset()
        email = (self.request.query_params.get('email') or '').strip()
        if email:
            qs = qs.filter(customer_email__iexact=email)
        return qs


class CsrfView(APIView):
    @method_decorator(ensure_csrf_cookie)
    def get(self, request):
        return response.Response({"ok": True})


@method_decorator(csrf_exempt, name="dispatch")
class BootstrapSuperuserView(APIView):
    """Create a superuser only if none exists. DEBUG-only safeguard."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        if not settings.DEBUG:
            return response.Response({"detail": "Not allowed"}, status=403)
        if User.objects.filter(is_superuser=True).exists():
            return response.Response({"detail": "Superuser already exists"}, status=400)
        data = request.data or {}
        username = (data.get("username") or "admin").strip() or "admin"
        email = (data.get("email") or "admin@example.com").strip()
        password = (data.get("password") or "admin123").strip() or "admin123"
        if not username:
            username = "admin"
        user = User.objects.create_user(username=username, email=email or None, password=password)
        user.is_staff = True
        user.is_superuser = True
        user.save()
        return response.Response({"ok": True, "username": user.username, "email": user.email})


class PaymentSettingView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        obj, _ = PaymentSetting.objects.get_or_create(defaults={"enabled": True})
        data = PaymentSettingSerializer(obj).data
        return response.Response(data)


class PaymentGatewayView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        qs = PaymentGateway.objects.filter(enabled=True).order_by('order', 'id')
        return response.Response(PaymentGatewaySerializer(qs, many=True).data)
