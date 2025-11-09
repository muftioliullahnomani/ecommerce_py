from django.db import models, transaction


class Category(models.Model):
    name = models.CharField(max_length=100)
    parent = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='children'
    )

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["name", "parent"], name="uniq_category_name_parent")
        ]

    def __str__(self) -> str:
        return self.name


class Menu(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self) -> str:
        return self.name


class MenuItem(models.Model):
    menu = models.ForeignKey(Menu, on_delete=models.CASCADE, related_name='items')
    label = models.CharField(max_length=100)
    url = models.CharField(max_length=300)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ("order", "id")

    def __str__(self) -> str:
        return f"{self.label}"


class ProductStyleTemplate(models.Model):
    name = models.CharField(max_length=100)
    card_bg_color = models.CharField(max_length=20, blank=True, default='#ffffff')
    price_color = models.CharField(max_length=20, blank=True, default='#2563eb')
    button_variant = models.CharField(max_length=20, choices=(('primary','Primary'),('outline','Outline')), default='primary')
    primary_color = models.CharField(max_length=20, blank=True, default='#2563eb')
    outline_color = models.CharField(max_length=20, blank=True, default='#2563eb')
    rounded_px = models.PositiveIntegerField(default=10)
    image_height_px = models.PositiveIntegerField(default=200)
    show_badges = models.BooleanField(default=True)

    class Meta:
        ordering = ["name", "id"]
        verbose_name = "Product style template"
        verbose_name_plural = "Product style templates"

    def __str__(self) -> str:
        return self.name

class Product(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    image_url = models.URLField(blank=True, default='')
    image = models.ImageField(upload_to='products/', null=True, blank=True)
    # Keep string category for frontend compatibility
    category = models.CharField(max_length=100, blank=True, default='')
    # Optional FK to managed categories in Admin
    category_fk = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products'
    )
    in_stock = models.BooleanField(default=True)
    popularity = models.PositiveIntegerField(default=0)
    trend_score = models.PositiveIntegerField(default=0)
    stock_qty = models.PositiveIntegerField(default=0)
    low_stock_threshold = models.PositiveIntegerField(default=5)
    notify_on_low_stock = models.BooleanField(default=True)
    style_template = models.ForeignKey('ProductStyleTemplate', on_delete=models.SET_NULL, null=True, blank=True, related_name='products')

    def __str__(self) -> str:
        return self.name


class SiteSetting(models.Model):
    home_product_limit = models.PositiveIntegerField(default=12)
    home_columns = models.PositiveIntegerField(default=4)
    home_order = models.PositiveIntegerField(default=0)
    # Floating cart styling
    floating_cart_bg = models.CharField(max_length=20, blank=True, default='#2563eb')
    floating_cart_text = models.CharField(max_length=20, blank=True, default='#ffffff')
    floating_cart_border = models.CharField(max_length=20, blank=True, default='#2563eb')
    floating_cart_position = models.CharField(max_length=2, choices=(('br','Bottom Right'),('bl','Bottom Left')), default='br')
    floating_cart_radius = models.PositiveIntegerField(default=999)
    # Primary menu for frontend
    primary_menu = models.ForeignKey('Menu', null=True, blank=True, on_delete=models.SET_NULL, related_name='sites')
    # Menu styling (header nav)
    menu_bg_color = models.CharField(max_length=20, blank=True, default='')
    menu_text_color = models.CharField(max_length=20, blank=True, default='')
    menu_hover_bg_color = models.CharField(max_length=20, blank=True, default='')
    menu_hover_text_color = models.CharField(max_length=20, blank=True, default='')
    menu_link_gap_px = models.PositiveIntegerField(default=12)
    menu_radius_px = models.PositiveIntegerField(default=8)
    # Menu card container options
    menu_card_enabled = models.BooleanField(default=False)
    menu_card_bg_color = models.CharField(max_length=20, blank=True, default='')
    menu_card_border_color = models.CharField(max_length=20, blank=True, default='')
    menu_card_border_px = models.PositiveIntegerField(default=1)
    menu_card_padding_px = models.PositiveIntegerField(default=8)
    menu_card_radius_px = models.PositiveIntegerField(default=12)
    menu_card_shadow = models.BooleanField(default=True)
    CAROUSEL_ANIM_CHOICES = (
        ("none", "None"),
        ("slide", "Slide"),
        ("fade", "Fade"),
        ("slide_fade", "Slide + Fade"),
        ("zoom_in", "Zoom In"),
        ("zoom_out", "Zoom Out"),
        ("skew", "Skew"),
        ("kenburns", "Ken Burns"),
    )
    carousel_animation = models.CharField(max_length=16, choices=CAROUSEL_ANIM_CHOICES, default="slide")
    carousel_speed_ms = models.PositiveIntegerField(default=3000)
    selected_carousel = models.ManyToManyField('CarouselItem', blank=True, related_name='sites_selected')
    selected_carousels = models.ManyToManyField('Carousel', blank=True, related_name='sites_selected')
    # Order numbering
    order_prefix = models.CharField(max_length=20, blank=True, default='ORD-')
    order_counter = models.PositiveIntegerField(default=0)


class Order(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('shipped', 'Shipped'),
        ('canceled', 'Canceled'),
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    customer_name = models.CharField(max_length=200)
    customer_email = models.EmailField(blank=True)
    customer_phone = models.CharField(max_length=50, blank=True)
    address = models.CharField(max_length=300, blank=True)
    city = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)

    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    # Human-friendly unique order number
    order_number = models.CharField(max_length=30, unique=True, blank=True, null=True)

    def __str__(self) -> str:
        num = self.order_number or f"#{self.pk}"
        return f"Order {num} - {self.customer_name}"

    def save(self, *args, **kwargs):
        if not self.order_number:
            # Atomic generation to ensure uniqueness
            with transaction.atomic():
                site = SiteSetting.objects.select_for_update().first()
                if site is None:
                    site = SiteSetting.objects.create(home_product_limit=12)
                site.order_counter = (site.order_counter or 0) + 1
                prefix = site.order_prefix or ''
                candidate = f"{prefix}{site.order_counter:06d}"
                # In very rare case of conflict, increment until unique
                while Order.objects.filter(order_number=candidate).exists():
                    site.order_counter += 1
                    candidate = f"{prefix}{site.order_counter:06d}"
                self.order_number = candidate
                site.save(update_fields=["order_counter"])
        super().save(*args, **kwargs)


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey('Product', on_delete=models.PROTECT, related_name='order_items')
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2)

    def line_total(self):
        try:
            return (self.price or 0) * (self.quantity or 0)
        except Exception:
            return 0

    def __str__(self) -> str:
        return f"{self.product} x {self.quantity}"


class HomeSection(models.Model):
    site = models.ForeignKey(SiteSetting, on_delete=models.CASCADE, related_name="sections")
    title = models.CharField(max_length=100)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    limit = models.PositiveIntegerField(default=8)
    order = models.PositiveIntegerField(default=0)
    columns = models.PositiveIntegerField(default=4)
    KIND_CHOICES = (
        ("category", "By Category"),
        ("newest", "Newest Products"),
        ("popular", "Popular Products"),
        ("trend", "Trend Products"),
    )
    kind = models.CharField(max_length=20, choices=KIND_CHOICES, default="category")

    class Meta:
        ordering = ["order", "id"]
        verbose_name_plural = "Home sections"

    def __str__(self) -> str:
        return self.title


class HomeCarouselSection(models.Model):
    site = models.ForeignKey(SiteSetting, on_delete=models.CASCADE, related_name="carousel_sections")
    carousel = models.ForeignKey('Carousel', on_delete=models.CASCADE)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]
        verbose_name = "Home section from carousel"
        verbose_name_plural = "Home sections from carousels"

    def __str__(self) -> str:
        return f"Carousel section: {self.carousel.title}"

class CarouselItem(models.Model):
    site = models.ForeignKey(SiteSetting, on_delete=models.CASCADE, related_name="carousel_items")
    title = models.CharField(max_length=150, blank=True, default="")
    image_url = models.URLField()
    link_url = models.URLField(blank=True, default="")
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]
        verbose_name_plural = "Carousel items"

    def __str__(self) -> str:
        return self.title or f"Carousel #{self.pk}"


class Carousel(models.Model):
    site = models.ForeignKey(SiteSetting, on_delete=models.CASCADE, related_name="carousels")
    title = models.CharField(max_length=150)
    animation = models.CharField(max_length=16, choices=SiteSetting.CAROUSEL_ANIM_CHOICES, default="slide")
    speed_ms = models.PositiveIntegerField(default=3000)
    # Single-image slider mode (always shows one image at a time)
    single_slider = models.BooleanField(default=False)
    slider_height_px = models.PositiveIntegerField(default=360)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]
        verbose_name = "Carousel"
        verbose_name_plural = "Carousels"

    def __str__(self) -> str:
        return self.title

    def get_preview_image_url(self) -> str:
        first_slide = self.slides.all().order_by('order', 'id').first()
        if first_slide and first_slide.image_url:
            return first_slide.image_url
        src = self.category_sources.all().order_by('order', 'id').first()
        if src and src.category_id:
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
            p = qs.first()
            if p:
                try:
                    if p.image:
                        return p.image.url
                except Exception:
                    pass
                if p.image_url:
                    return p.image_url
        return ""


class CarouselSlide(models.Model):
    carousel = models.ForeignKey(Carousel, on_delete=models.CASCADE, related_name="slides")
    title = models.CharField(max_length=150, blank=True, default="")
    image_url = models.URLField()
    link_url = models.URLField(blank=True, default="")
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]
        verbose_name = "Carousel slide"
        verbose_name_plural = "Carousel slides"

    def __str__(self) -> str:
        return self.title or f"Slide #{self.pk}"


class CarouselCategorySource(models.Model):
    carousel = models.ForeignKey(Carousel, on_delete=models.CASCADE, related_name="category_sources")
    category = models.ForeignKey('Category', on_delete=models.CASCADE)
    limit = models.PositiveIntegerField(default=8)
    ORDERING_CHOICES = (
        ("newest", "Newest"),
        ("popular", "Popular"),
        ("trend", "Trend"),
        ("price_asc", "Price: Low to High"),
        ("price_desc", "Price: High to Low"),
    )
    ordering = models.CharField(max_length=20, choices=ORDERING_CHOICES, default="newest")
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]
        verbose_name = "Carousel from category"
        verbose_name_plural = "Carousels from category"

    def __str__(self) -> str:
        return f"{self.category} ({self.limit}, {self.ordering})"


class PaymentSetting(models.Model):
    title = models.CharField(max_length=150, blank=True, default='Payment')
    description = models.TextField(blank=True, default='Demo payment form. Integrate your gateway later.')
    button_label = models.CharField(max_length=100, blank=True, default='Pay')
    success_message = models.CharField(max_length=200, blank=True, default='Payment successful! Thank you for your order.')
    enabled = models.BooleanField(default=True)
    require_login = models.BooleanField(default=False)
    test_mode = models.BooleanField(default=True)
    gateway_name = models.CharField(max_length=100, blank=True, default='Demo')
    currency = models.CharField(max_length=10, blank=True, default='USD')
    fixed_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    fee_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    class Meta:
        verbose_name = 'Payment setting'
        verbose_name_plural = 'Payment settings'

    def __str__(self) -> str:
        return f"Payment settings"


class PaymentGateway(models.Model):
    name = models.CharField(max_length=100, unique=True)
    display_name = models.CharField(max_length=150, blank=True, default='')
    code = models.CharField(max_length=50, unique=True)
    enabled = models.BooleanField(default=True)
    test_mode = models.BooleanField(default=True)
    button_label = models.CharField(max_length=100, blank=True, default='Pay')
    order = models.PositiveIntegerField(default=0)
    config_json = models.TextField(blank=True, default='')  # store API keys or settings (dev only)

    class Meta:
        ordering = ["order", "id"]
        verbose_name = 'Payment gateway'
        verbose_name_plural = 'Payment gateways'

    def __str__(self) -> str:
        return self.display_name or self.name
