from rest_framework import serializers
from django.contrib.auth.models import User
from django.conf import settings
from .models import Product, Category, HomeSection, CarouselItem, SiteSetting, Carousel, CarouselSlide, HomeCarouselSection, ProductStyleTemplate, Order, OrderItem, Menu, MenuItem, PaymentSetting, PaymentGateway

class ProductStyleTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductStyleTemplate
        fields = [
            "id",
            "name",
            "card_bg_color",
            "price_color",
            "primary_color",
            "outline_color",
            "button_variant",
            "rounded_px",
            "image_height_px",
            "show_badges",
        ]


class ProductSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(read_only=True)
    image_url = serializers.SerializerMethodField()
    is_available = serializers.SerializerMethodField()
    is_low_stock = serializers.SerializerMethodField()
    style_template = ProductStyleTemplateSerializer(read_only=True)

    def get_image_url(self, obj: Product):
        try:
            if obj.image:
                return obj.image.url
        except Exception:
            pass
        if obj.image_url:
            return obj.image_url
        return getattr(settings, 'PLACEHOLDER_IMAGE_URL', 'https://via.placeholder.com/800x800?text=No+Image')

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "description",
            "price",
            "image_url",  # effective URL (uploaded image preferred)
            "image",      # raw uploaded file path (read-only)
            "category",
            "in_stock",
            "stock_qty",
            "low_stock_threshold",
            "notify_on_low_stock",
            "is_available",
            "is_low_stock",
            "style_template",
        ]

    def get_is_available(self, obj: Product) -> bool:
        return bool(obj.in_stock and (obj.stock_qty is None or obj.stock_qty > 0))

    def get_is_low_stock(self, obj: Product) -> bool:
        try:
            return obj.stock_qty is not None and obj.stock_qty <= max(0, int(obj.low_stock_threshold)) and obj.stock_qty > 0
        except Exception:
            return False


class CategoryChildSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "parent"]


class CategoryTreeSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "name", "parent", "children"]

    def get_children(self, obj: Category):
        qs = obj.children.all().order_by("name")
        return CategoryTreeSerializer(qs, many=True).data


class CarouselItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CarouselItem
        fields = ["id", "title", "image_url", "link_url", "order"]


class HomeSectionSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    products = serializers.SerializerMethodField()

    class Meta:
        model = HomeSection
        fields = ["id", "title", "kind", "category", "category_name", "limit", "columns", "order", "products"]

    def get_products(self, obj: HomeSection):
        qs = Product.objects.all()
        if obj.kind == 'category' and obj.category_id:
            qs = qs.filter(category_fk=obj.category).order_by('-id')
        elif obj.kind == 'popular':
            qs = qs.order_by('-popularity', '-id')
        elif obj.kind == 'trend':
            qs = qs.order_by('-trend_score', '-id')
        else:  # newest or default
            qs = qs.order_by('-id')
        qs = qs[: obj.limit]
        return ProductSerializer(qs, many=True).data


class CarouselSlideSerializer(serializers.ModelSerializer):
    class Meta:
        model = CarouselSlide
        fields = ["id", "title", "image_url", "link_url", "order"]


class CarouselSerializer(serializers.ModelSerializer):
    slides = serializers.SerializerMethodField()

    class Meta:
        model = Carousel
        fields = ["id", "title", "animation", "speed_ms", "single_slider", "slider_height_px", "order", "slides"]

    def get_slides(self, obj: Carousel):
        # Manual slides first
        manual = list(CarouselSlideSerializer(obj.slides.all().order_by('order', 'id'), many=True).data)
        # Then slides generated from category sources
        gen = []
        for src in getattr(obj, 'category_sources', []).all().order_by('order', 'id'):
            qs = Product.objects.filter(category_fk=src.category)
            ordkey = src.ordering
            if ordkey == 'popular':
                qs = qs.order_by('-popularity', '-id')
            elif ordkey == 'trend':
                qs = qs.order_by('-trend_score', '-id')
            elif ordkey == 'price_asc':
                qs = qs.order_by('price', 'id')
            elif ordkey == 'price_desc':
                qs = qs.order_by('-price', '-id')
            else:
                qs = qs.order_by('-id')
            qs = qs[: src.limit]
            for p in qs:
                try:
                    img = p.image.url if p.image else (p.image_url or '')
                except Exception:
                    img = p.image_url or ''
                gen.append({
                    'id': p.id,
                    'title': p.name,
                    'image_url': img,
                    'link_url': f"/product/{p.id}",
                    'order': 0,
                })
        return manual + gen


class HomeConfigSerializer(serializers.ModelSerializer):
    sections = HomeSectionSerializer(many=True)
    carousels = serializers.SerializerMethodField()
    carousel_sections = serializers.SerializerMethodField()
    primary_menu = serializers.SerializerMethodField()

    class Meta:
        model = SiteSetting
        fields = [
            'home_product_limit',
            'home_columns',
            'home_order',
            'floating_cart_bg',
            'floating_cart_text',
            'floating_cart_border',
            'floating_cart_position',
            'floating_cart_radius',
            'menu_bg_color',
            'menu_text_color',
            'menu_hover_bg_color',
            'menu_hover_text_color',
            'menu_link_gap_px',
            'menu_radius_px',
            'menu_card_enabled',
            'menu_card_bg_color',
            'menu_card_border_color',
            'menu_card_border_px',
            'menu_card_padding_px',
            'menu_card_radius_px',
            'menu_card_shadow',
            'primary_menu',
            'sections',
            'carousels',
            'carousel_sections',
        ]

    def get_carousels(self, obj: SiteSetting):
        sections = obj.carousel_sections.all().order_by('order', 'id')
        if not sections:
            return []
        carousel_ids = [s.carousel_id for s in sections]
        carousels = Carousel.objects.filter(id__in=carousel_ids).prefetch_related('slides')
        by_id = {c.id: c for c in carousels}
        ordered = [by_id[cid] for cid in carousel_ids if cid in by_id]
        return CarouselSerializer(ordered, many=True).data

    def get_carousel_sections(self, obj: SiteSetting):
        items = []
        for s in obj.carousel_sections.all().order_by('order', 'id'):
            items.append({
                'id': s.id,
                'order': s.order,
                'carousel': CarouselSerializer(s.carousel).data,
            })
        return items


class MenuItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuItem
        fields = ("id", "label", "url", "order")


class MenuSerializer(serializers.ModelSerializer):
    items = MenuItemSerializer(many=True)

    class Meta:
        model = Menu
        fields = ("id", "name", "items")


def _serialize_menu(menu: Menu | None):
    if not menu:
        return None
    return MenuSerializer(menu).data


class HomeConfigSerializer(HomeConfigSerializer):
    def get_primary_menu(self, obj: SiteSetting):
        try:
            return _serialize_menu(obj.primary_menu)
        except Exception:
            return None


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name")


class PaymentSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentSetting
        fields = (
            "title",
            "description",
            "button_label",
            "success_message",
            "enabled",
            "require_login",
            "test_mode",
            "gateway_name",
            "currency",
            "fixed_fee",
            "fee_percent",
        )


class PaymentGatewaySerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentGateway
        fields = ("id", "name", "display_name", "code", "enabled", "test_mode", "button_label", "order")


class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = OrderItem
        fields = ("id", "product", "product_name", "quantity", "price")


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "order_number",
            "status",
            "customer_name",
            "customer_email",
            "customer_phone",
            "address",
            "city",
            "postal_code",
            "total",
            "created_at",
            "updated_at",
            "items",
        )
        read_only_fields = ("status", "total", "created_at", "updated_at")

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        order = Order.objects.create(**validated_data)
        total = 0
        for it in items_data:
            product = it.get('product')
            qty = int(it.get('quantity') or 1)
            price = it.get('price')
            if price is None and product is not None:
                price = product.price
            oi = OrderItem.objects.create(order=order, product=product, quantity=qty, price=price)
            try:
                total += (oi.price or 0) * (oi.quantity or 0)
            except Exception:
                pass
        order.total = total
        order.save(update_fields=["total"])
        return order
