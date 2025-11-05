from rest_framework import serializers 
from .models import Pelicula, ListaPersonalizada
# Nota: Si el error persiste en el futuro, es probable que se deba a que 
# la versión del archivo que tienes en el disco aún incluya 'generos' aquí.

# 1. Serializador para la Película
class PeliculaSerializer(serializers.ModelSerializer):
    """Usado para mostrar las películas en el catálogo y dentro de una lista."""
    class Meta:
        model = Pelicula
        # CLAVE: Usamos 'year' para que coincida con el campo del modelo. 
        # Asegúrate de que 'generos' NO esté aquí si no existe en el modelo.
        fields = ['id', 'titulo', 'portada_url', 'year'] 
        read_only_fields = fields 

# 2. Serializador principal para ListaPersonalizada
class ListaPersonalizadaSerializer(serializers.ModelSerializer):
    """Serializador principal para el CRUD de las listas del usuario."""
    peliculas = serializers.SerializerMethodField()
    pelicula_count = serializers.IntegerField(source='peliculas.count', read_only=True)
    
    class Meta:
        model = ListaPersonalizada
        # Asegúrate de que 'usuario' es el nombre del campo ForeignKey
        fields = ['id', 'nombre', 'pelicula_count', 'peliculas', 'usuario', 'fecha_creacion', 'fecha_actualizacion']
        read_only_fields = ['usuario', 'peliculas', 'pelicula_count', 'fecha_creacion', 'fecha_actualizacion']

    # Método para limitar a solo 4 portadas para el collage del frontend
    def get_peliculas(self, obj):
        peliculas_preview = obj.peliculas.all()[:4]
        # NOTA: PeliculaSerializer corregido en la parte superior
        return PeliculaSerializer(peliculas_preview, many=True).data

    # Asigna el usuario actual automáticamente al crear una lista
    def create(self, validated_data):
        user = self.context['request'].user
        return ListaPersonalizada.objects.create(usuario=user, **validated_data)

# 3. Serializador para Añadir/Quitar Películas
class MovieIDSerializer(serializers.Serializer):
    """Usado en las acciones 'add-movie' y 'remove-movie'. Solo espera el ID de la película."""
    pelicula_id = serializers.IntegerField(label="ID de Película")