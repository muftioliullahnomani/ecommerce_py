from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import os


class Command(BaseCommand):
    help = "Create an initial superuser from environment variables if none exists."

    def handle(self, *args, **options):
        User = get_user_model()
        if User.objects.filter(is_superuser=True).exists():
            self.stdout.write(self.style.SUCCESS("Superuser already exists. Skipping."))
            return

        username = os.environ.get("ADMIN_USERNAME") or os.environ.get("DJANGO_SUPERUSER_USERNAME")
        email = os.environ.get("ADMIN_EMAIL") or os.environ.get("DJANGO_SUPERUSER_EMAIL")
        password = os.environ.get("ADMIN_PASSWORD") or os.environ.get("DJANGO_SUPERUSER_PASSWORD")

        if not username or not password:
            self.stdout.write(self.style.WARNING("ADMIN_USERNAME/ADMIN_PASSWORD not provided. Skipping superuser creation."))
            return

        if not email:
            # Provide a fallback email if not set
            email = f"{username}@example.com"

        user = User.objects.create_superuser(username=username, email=email, password=password)
        self.stdout.write(self.style.SUCCESS(f"Created superuser '{user.username}'."))
