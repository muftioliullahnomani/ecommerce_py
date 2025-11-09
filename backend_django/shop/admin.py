from django.contrib import admin, messages
from django.contrib.admin.helpers import ActionForm
from .models import Product, Category, SiteSetting, HomeSection, CarouselItem, Carousel, CarouselSlide, HomeCarouselSection, CarouselCategorySource, ProductStyleTemplate, Order, OrderItem, Menu, MenuItem, PaymentSetting, PaymentGateway
from django.utils.html import format_html
from django import forms
from django.http import HttpResponseRedirect
from django.urls import reverse

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("id", "thumb", "name", "price", "category", "category_fk", "in_stock", "stock_qty", "low_stock_threshold", "notify_on_low_stock", "style_template")
    list_display_links = ("id", "thumb", "name")
    list_editable = ("price", "category", "category_fk", "in_stock", "stock_qty", "low_stock_threshold", "notify_on_low_stock", "style_template")
    search_fields = ("name", "description", "category", "category_fk__name", "category_fk__parent__name")
    list_filter = ("category", "category_fk", "category_fk__parent", "in_stock")
    autocomplete_fields = ("category_fk",)
    actions = ["clone_products", "bulk_update"]

    class Media:
        css = {
            'all': ('shop/admin.css',)
        }

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        try:
            if obj.notify_on_low_stock and obj.in_stock and obj.stock_qty is not None:
                thr = max(0, int(obj.low_stock_threshold or 0))
                if 0 < obj.stock_qty <= thr:
                    self.message_user(request, f"Low stock: {obj.stock_qty} remaining (threshold {thr})", level=messages.WARNING)
                if obj.stock_qty == 0:
                    self.message_user(request, "Out of stock: quantity is 0", level=messages.ERROR)
        except Exception:
            pass

    def thumb(self, obj: Product):
        url = obj.image.url if obj.image else (obj.image_url or "")
        if not url:
            return ""
        return format_html('<img src="{}" style="height:40px;width:40px;object-fit:cover;border-radius:4px;"/>', url)
    thumb.short_description = "Image"

    def clone_products(self, request, queryset):
        created_objs = []
        for obj in queryset:
            clone = Product(
                name=f"{obj.name} (Copy)",
                description=obj.description,
                price=obj.price,
                image_url=obj.image_url,
                image=obj.image,
                category=obj.category,
                category_fk=obj.category_fk,
                in_stock=obj.in_stock,
            )
            created_objs.append(clone)
        if created_objs:
            Product.objects.bulk_create(created_objs)
        self.message_user(request, f"Cloned {len(created_objs)} product(s)")
    clone_products.short_description = "Clone selected products"

    def bulk_update(self, request, queryset):
        category_id = request.POST.get('category_fk')
        in_stock_val = request.POST.get('in_stock')
        price_val = request.POST.get('price')
        updates = {}
        if category_id:
            try:
                updates['category_fk'] = Category.objects.get(pk=category_id)
            except Category.DoesNotExist:
                pass
        if in_stock_val in ('true', 'false'):
            updates['in_stock'] = (in_stock_val == 'true')
        if price_val not in (None, ""):
            try:
                updates['price'] = price_val
            except Exception:
                pass
        if updates:
            count = queryset.update(**updates)
            self.message_user(request, f"Updated {count} product(s)")
        else:
            self.message_user(request, "No changes applied", level=messages.WARNING)
    bulk_update.short_description = "Bulk update: set Category / In Stock / Price"

class BulkActionForm(ActionForm):
    category_fk = forms.ModelChoiceField(queryset=Category.objects.all(), required=False, label="Set Category")
    in_stock = forms.ChoiceField(choices=(("", "----"), ("true", "In Stock"), ("false", "Out of Stock")), required=False, label="Set Stock")
    price = forms.DecimalField(required=False, max_digits=10, decimal_places=2, label="Set Price")


ProductAdmin.action_form = BulkActionForm


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "parent")
    search_fields = ("name", "parent__name")
    list_filter = ("parent",)
    autocomplete_fields = ("parent",)


@admin.register(ProductStyleTemplate)
class ProductStyleTemplateAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "button_variant", "rounded_px", "image_height_px", "show_badges")
    search_fields = ("name",)
    list_editable = ("button_variant", "rounded_px", "image_height_px", "show_badges")
    readonly_fields = ("preview",)

    fieldsets = (
        (None, {"fields": ("name",)}),
        ("Colors", {"fields": ("card_bg_color", "price_color", "primary_color", "outline_color", "preview")}),
        ("Layout", {"fields": ("button_variant", "rounded_px", "image_height_px", "show_badges")}),
    )

    class Form(forms.ModelForm):
        class Meta:
            model = ProductStyleTemplate
            fields = "__all__"
            widgets = {
                "card_bg_color": forms.TextInput(attrs={"type": "color"}),
                "price_color": forms.TextInput(attrs={"type": "color"}),
                "primary_color": forms.TextInput(attrs={"type": "color"}),
                "outline_color": forms.TextInput(attrs={"type": "color"}),
            }

    form = Form

    class Media:
        css = {"all": ("shop/admin.css",)}
        js = ("shop/template_preview.js",)

    def preview(self, obj: ProductStyleTemplate):
        bg = getattr(obj, 'card_bg_color', '#ffffff') or '#ffffff'
        price = getattr(obj, 'price_color', '#2563eb') or '#2563eb'
        primary = getattr(obj, 'primary_color', '#2563eb') or '#2563eb'
        outline = getattr(obj, 'outline_color', '#2563eb') or '#2563eb'
        radius = getattr(obj, 'rounded_px', 10) or 10
        img_h = getattr(obj, 'image_height_px', 200) or 200
        btn_outline = (getattr(obj, 'button_variant', 'primary') == 'outline')
        return format_html(
            """
            <div id="tpl-preview" class="tpl-preview" data-bg="{}" data-price="{}" data-primary="{}" data-outlinec="{}" data-radius="{}" data-imgh="{}" data-outline="{}">
              <div class="tpl-card" style="background:{};border-radius:{}px">
                <div class="tpl-img" style="height:{}px"></div>
                <div class="tpl-body">
                  <div class="tpl-title">Product Title</div>
                  <div class="tpl-price" style="color:{}">$99.00</div>
                  <div class="tpl-actions">
                    <button class="tpl-btn {}" style="background:{};color:#fff;border-color:{}">🛒 <span class="tpl-label">Add to Cart</span></button>
                    <button class="tpl-btn {}" style="background:{};color:#fff;border-color:{}">♡ <span class="tpl-label">Favorite</span></button>
                  </div>
                </div>
              </div>
            </div>
            """,
            bg, price, primary, outline, radius, img_h, "1" if btn_outline else "0",
            bg, radius,
            img_h,
            price,
            "outline" if btn_outline else "", primary, primary,
            "outline" if btn_outline else "", primary, primary,
        )
    preview.short_description = "Live preview"

    def response_change(self, request, obj):
        return HttpResponseRedirect(reverse('admin:shop_productstyletemplate_change', args=[obj.pk]))


class HomeSectionInline(admin.TabularInline):
    model = HomeSection
    extra = 0
    autocomplete_fields = ("category",)
    fields = ("title", "kind", "category", "limit", "columns", "order")


## Removed legacy CarouselItem admin and inline


class CarouselSlideInline(admin.TabularInline):
    model = CarouselSlide
    extra = 0
    fields = ("title", "image_url", "link_url", "order")


class CarouselCategorySourceInline(admin.TabularInline):
    model = CarouselCategorySource
    extra = 0
    fields = ("category", "limit", "ordering", "order")
    verbose_name = "Carousel from category"
    verbose_name_plural = "Carousel from category"


class HomeCarouselSectionInline(admin.TabularInline):
    model = HomeCarouselSection
    extra = 1
    fields = ("preview", "carousel", "order")
    readonly_fields = ("preview",)
    verbose_name = "carousel"
    verbose_name_plural = "Home carousels"

    def get_formset(self, request, obj=None, **kwargs):
        formset = super().get_formset(request, obj, **kwargs)
        if obj is not None and 'carousel' in formset.form.base_fields:
            formset.form.base_fields['carousel'].queryset = Carousel.objects.filter(site=obj)
        return formset

    def preview(self, obj: HomeCarouselSection):
        if not obj or not obj.carousel_id:
            return ""
        url = obj.carousel.get_preview_image_url()
        if not url:
            return ""
        return format_html('<img src="{}" style="width:80px;height:48px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb;"/>', url)
    preview.short_description = "Preview"


@admin.register(Carousel)
class CarouselAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "site", "animation", "speed_ms", "single_slider", "slider_height_px")
    list_filter = ("site",)
    search_fields = ("title",)
    ordering = ("site", "order", "id")
    fieldsets = (
        (None, {"fields": ("title",)}),
        ("Slider options", {"fields": (("animation", "speed_ms"), ("single_slider", "slider_height_px"))}),
    )
    inlines = [CarouselSlideInline, CarouselCategorySourceInline]

    exclude = ("site", "order",)

    def save_model(self, request, obj, form, change):
        if not obj.site_id:
            # Auto-assign the singleton SiteSetting
            site = SiteSetting.objects.first()
            if not site:
                site = SiteSetting.objects.create(home_product_limit=12)
            obj.site = site
        if not obj.title:
            obj.title = "Carousel"
        super().save_model(request, obj, form, change)

    def response_change(self, request, obj):
        # Stay on the same change page after save
        return HttpResponseRedirect(reverse('admin:shop_carousel_change', args=[obj.pk]))

@admin.register(SiteSetting)
class SiteSettingAdmin(admin.ModelAdmin):
    class Form(forms.ModelForm):
        class Meta:
            model = SiteSetting
            fields = "__all__"
            widgets = {
                "floating_cart_bg": forms.TextInput(attrs={"type": "color"}),
                "floating_cart_text": forms.TextInput(attrs={"type": "color"}),
                "floating_cart_border": forms.TextInput(attrs={"type": "color"}),
                "menu_bg_color": forms.TextInput(attrs={"type": "color"}),
                "menu_text_color": forms.TextInput(attrs={"type": "color"}),
                "menu_hover_bg_color": forms.TextInput(attrs={"type": "color"}),
                "menu_hover_text_color": forms.TextInput(attrs={"type": "color"}),
                "menu_card_bg_color": forms.TextInput(attrs={"type": "color"}),
                "menu_card_border_color": forms.TextInput(attrs={"type": "color"}),
            }

    form = Form
    list_display = ("id", "home_product_limit", "home_columns")
    inlines = [HomeSectionInline, HomeCarouselSectionInline]
    fieldsets = (
        ("Home page products", {"fields": (("home_product_limit", "home_columns", "home_order"),)}),
        ("Floating cart", {"fields": (("floating_cart_bg", "floating_cart_text", "floating_cart_border", "floating_cart_position", "floating_cart_radius"),)}),
        ("Navigation", {"fields": (
            ("primary_menu",),
            ("menu_bg_color", "menu_text_color"),
            ("menu_hover_bg_color", "menu_hover_text_color"),
            ("menu_link_gap_px", "menu_radius_px"),
            # Menu card container
            ("menu_card_enabled",),
            ("menu_card_bg_color", "menu_card_border_color"),
            ("menu_card_border_px", "menu_card_padding_px"),
            ("menu_card_radius_px", "menu_card_shadow"),
        )}),
        ("Order numbering", {"fields": (("order_prefix", "order_counter"),)}),
    )

    def has_add_permission(self, request):
        # allow only one settings row
        if SiteSetting.objects.exists():
            return False
        return super().has_add_permission(request)

    def changelist_view(self, request, extra_context=None):
        # Redirect changelist to the single instance change page
        obj, _ = SiteSetting.objects.get_or_create(defaults={"home_product_limit": 12})
        return HttpResponseRedirect(reverse('admin:shop_sitesetting_change', args=[obj.pk]))


class MenuItemInline(admin.TabularInline):
    model = MenuItem
    extra = 0
    fields = ("label", "url", "order")


@admin.register(Menu)
class MenuAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)
    inlines = [MenuItemInline]


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    autocomplete_fields = ("product",)
    fields = ("product", "quantity", "price", "line_total_display")
    readonly_fields = ("line_total_display",)

    def line_total_display(self, obj: OrderItem):
        try:
            return f"${(obj.price or 0) * (obj.quantity or 0):.2f}"
        except Exception:
            return "$0.00"
    line_total_display.short_description = "Line total"


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "order_number", "created_at", "status", "customer_name", "customer_phone", "total")
    list_filter = ("status", "created_at")
    search_fields = ("order_number", "customer_name", "customer_email", "customer_phone", "address", "city")
    readonly_fields = ("created_at", "updated_at", "order_number")
    inlines = [OrderItemInline]

    fieldsets = (
        (None, {"fields": ("status",)}),
        ("Customer", {"fields": (("customer_name", "customer_email", "customer_phone"), ("address",), ("city", "postal_code"))}),
        ("Totals", {"fields": ("total",)}),
        ("Identifiers", {"fields": ("order_number",)}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )

    actions = ["mark_paid", "mark_shipped", "mark_canceled"]

    def recalc_total(self, obj: Order):
        total = 0
        for it in obj.items.all():
            try:
                total += (it.price or 0) * (it.quantity or 0)
            except Exception:
                pass
        obj.total = total
        obj.save(update_fields=["total"])

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        self.recalc_total(obj)

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        self.recalc_total(form.instance)

    def mark_paid(self, request, queryset):
        updated = queryset.update(status="paid")
        self.message_user(request, f"Marked {updated} order(s) as paid")
    mark_paid.short_description = "Mark selected orders as Paid"

    def mark_shipped(self, request, queryset):
        updated = queryset.update(status="shipped")
        self.message_user(request, f"Marked {updated} order(s) as shipped")
    mark_shipped.short_description = "Mark selected orders as Shipped"

    def mark_canceled(self, request, queryset):
        updated = queryset.update(status="canceled")
        self.message_user(request, f"Marked {updated} order(s) as canceled")
    mark_canceled.short_description = "Mark selected orders as Canceled"


@admin.register(PaymentSetting)
class PaymentSettingAdmin(admin.ModelAdmin):
    list_display = ("id", "enabled", "gateway_name", "currency", "test_mode")
    fieldsets = (
        (None, {"fields": (("enabled", "require_login", "test_mode"),)}),
        ("Display", {"fields": (("title", "button_label"), ("description",), ("success_message",))}),
        ("Gateway", {"fields": (("gateway_name", "currency"), ("fixed_fee", "fee_percent"))}),
    )

    def has_add_permission(self, request):
        # Only allow a single PaymentSetting row
        if PaymentSetting.objects.exists():
            return False
        return super().has_add_permission(request)

    def changelist_view(self, request, extra_context=None):
        # Redirect changelist to the single instance change page
        obj, _ = PaymentSetting.objects.get_or_create(defaults={"enabled": True})
        return HttpResponseRedirect(reverse('admin:shop_paymentsetting_change', args=[obj.pk]))


@admin.register(PaymentGateway)
class PaymentGatewayAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "code", "display_name", "enabled", "order")
    list_editable = ("display_name", "enabled", "order")
    search_fields = ("name", "code", "display_name")
    fieldsets = (
        (None, {"fields": (("name", "code"), ("display_name", "button_label"), ("enabled", "test_mode"), ("order",))}),
        ("Config (dev)", {"fields": (("config_json",),)}),
    )
