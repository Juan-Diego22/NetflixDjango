"""
URL configuration for Catalogo project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from Catalogo.views import *
from django.conf import settings
from django.conf.urls.static import static

# DRF router for API endpoints
from rest_framework.routers import DefaultRouter
from Peliculas.views import PeliculaViewSet, ListaPersonalizadaViewSet

router = DefaultRouter()
router.register(r'peliculas', PeliculaViewSet, basename='pelicula')
router.register(r'listas', ListaPersonalizadaViewSet, basename='lista')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('login/', login),
    path('registro/', registro),
    path('recuperarContraseña/', recuperarContraseña),
    path('index/', index),
    path('movies/', movies),
    path('lista/', myList),
    path('api/', include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATICFILES_DIRS[0])
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

    

