from rest_framework import serializers 
from .models import Pelicula, ListaPersonalizada

# Serializador para la Película
class PeliculaSerializer(serializers.ModelSerializer):
    """Usado para mostrar las películas en el catálogo y dentro de una lista."""
    class Meta:
        model = Pelicula
        fields = ['id', 'titulo', 'portada', 'anioLanzamiento'] 
        read_only_fields = fields 

# Serializador principal para ListaPersonalizada
class ListaPersonalizadaSerializer(serializers.ModelSerializer):
    """Serializador principal para el CRUD de las listas del usuario."""
    peliculas = serializers.SerializerMethodField()
    pelicula_count = serializers.IntegerField(source='peliculas.count', read_only=True)
    
    class Meta:
        model = ListaPersonalizada
        fields = ['id', 'nombre', 'pelicula_count', 'peliculas', 'fecha_creacion', 'fecha_actualizacion']
        read_only_fields = ['usuario', 'peliculas', 'pelicula_count', 'fecha_creacion', 'fecha_actualizacion']

    def get_peliculas(self, obj):
        # Si es una petición de detalle individual, devolver TODAS
        if self.context.get('view') and self.context['view'].action == 'retrieve':
            peliculas = obj.peliculas.all()  # TODAS las películas
        else:
            # Si es una lista de listas, solo las primeras 4
            peliculas = obj.peliculas.all()[:4]
        
        return PeliculaSerializer(peliculas, many=True).data
    
# 3. Serializador para Añadir/Quitar Películas
class MovieIDSerializer(serializers.Serializer):
    """Usado en las acciones 'add-movie' y 'remove-movie'. Solo espera el ID de la película."""
    pelicula_id = serializers.IntegerField(label="ID de Película")