from pathlib import Path
import os
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'change-me-in-prod')
DEBUG = os.environ.get('DEBUG', '1') == '1'
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '127.0.0.1,localhost').split(',')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'shop',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'backend_django.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend_django.wsgi.application'
ASGI_APPLICATION = 'backend_django.asgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'ecommerce_dj.sqlite3',
    }
}

# If DATABASE_URL is provided (Render/Postgres), use it
db_url = os.environ.get('DATABASE_URL')
if db_url:
    DATABASES['default'] = dj_database_url.parse(db_url, conn_max_age=600, ssl_require=True)

AUTH_PASSWORD_VALIDATORS = []

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
if not DEBUG:
    STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

CORS_ALLOWED_ORIGINS = [
    'http://127.0.0.1:5173',
    'http://localhost:5173',
]
# Extend CORS from env (comma-separated)
extra_cors = os.environ.get('CORS_ALLOWED_ORIGINS')
if extra_cors:
    CORS_ALLOWED_ORIGINS += [o for o in extra_cors.split(',') if o]
CORS_ALLOW_CREDENTIALS = True

# Allow frontend dev server origins for CSRF origin check
CSRF_TRUSTED_ORIGINS = [
    'http://127.0.0.1:5173',
    'http://localhost:5173',
]
# Trust additional origins from env (comma-separated full scheme+host)
extra_csrf = os.environ.get('CSRF_TRUSTED_ORIGINS')
if extra_csrf:
    CSRF_TRUSTED_ORIGINS += [o for o in extra_csrf.split(',') if o]
# Render automatically provides external hostname; trust it for CSRF
render_host = os.environ.get('RENDER_EXTERNAL_HOSTNAME')
if render_host:
    CSRF_TRUSTED_ORIGINS.append(f'https://{render_host}')

# Railway public domain handling
railway_host = os.environ.get('RAILWAY_PUBLIC_DOMAIN')
if railway_host:
    # Allow host for Django
    ALLOWED_HOSTS.append(railway_host)
    # Trust for CSRF with https scheme
    CSRF_TRUSTED_ORIGINS.append(f'https://{railway_host}')

REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ]
}

# Media (uploads)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Placeholder image (used when a product has no uploaded image or image_url)
PLACEHOLDER_IMAGE_URL = os.environ.get(
    'PLACEHOLDER_IMAGE_URL',
    'https://via.placeholder.com/800x800?text=No+Image'
)
