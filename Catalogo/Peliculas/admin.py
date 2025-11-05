from django.contrib import admin
from .models import Pelicula, ListaPersonalizada

# 1. Registro del modelo Pelicula
@admin.register(Pelicula)
class PeliculaAdmin(admin.ModelAdmin):
    # Campos que se muestran en la tabla de listado
    list_display = ('titulo', 'anioLanzamiento', 'portada')
    # Permite buscar por título
    search_fields = ('titulo', 'descripcion') 

# 2. Registro del modelo ListaPersonalizada
@admin.register(ListaPersonalizada)
class ListaPersonalizadaAdmin(admin.ModelAdmin):
    # Campos que se muestran en la tabla de listado
    list_display = ('nombre', 'usuario', 'pelicula_count', 'fecha_creacion')
    # Permite filtrar por usuario
    list_filter = ('usuario', 'fecha_creacion')
    # Permite buscar por nombre de lista
    search_fields = ('nombre',)
    
    # Método personalizado para contar el número de películas
    def pelicula_count(self, obj):
        return obj.peliculas.count()
    pelicula_count.short_description = 'Películas'

    # Opción para ver las películas asociadas en el formulario de edición
    filter_horizontal = ('peliculas',)