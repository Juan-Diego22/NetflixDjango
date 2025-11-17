from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import Pelicula, ListaPersonalizada
from .serializer import PeliculaSerializer, ListaPersonalizadaSerializer, MovieIDSerializer


# ViewSet para Películas (Catálogo)
class PeliculaViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para ver el catálogo de películas.
    Solo lectura (GET).
    """
    queryset = Pelicula.objects.all()
    serializer_class = PeliculaSerializer
    permission_classes = []  # Acceso público

    def list(self, request, *args, **kwargs):
        """
        Lista todas las películas con todos los campos necesarios
        """
        peliculas = self.get_queryset()
        data = []

        for pelicula in peliculas:
            portada_url = None
            if pelicula.portada:
                portada_url = request.build_absolute_uri(pelicula.portada.url)

            data.append({
                'id': pelicula.id,
                'titulo': pelicula.titulo,
                'title': pelicula.titulo,  
                'descripcion': pelicula.descripcion,
                'description': pelicula.descripcion,  
                'portadaUrl': portada_url,
                'year': pelicula.anioLanzamiento,
            })

        return Response(data)

    def retrieve(self, request, *args, **kwargs):
        """
        Obtiene los detalles de una película específica
        """
        pelicula = self.get_object()
        
        portada_url = None
        if pelicula.portada:
            portada_url = request.build_absolute_uri(pelicula.portada.url)

        data = {
            'id': pelicula.id,
            'title': pelicula.titulo,
            'description': pelicula.descripcion,
            'portadaUrl': portada_url,
            'year': pelicula.anioLanzamiento,
            'nombre': pelicula.nombre,
        }

        return Response(data)


# ViewSet para Listas Personalizadas
class ListaPersonalizadaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar las listas personalizadas del usuario.
    """
    serializer_class = ListaPersonalizadaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Solo devuelve las listas del usuario autenticado."""
        return ListaPersonalizada.objects.filter(usuario=self.request.user)

    def perform_create(self, serializer):
        """Asigna el usuario actual al crear una lista."""
        serializer.save(usuario=self.request.user)

    @action(detail=True, methods=['post'], url_path='add-movie')
    def add_movie(self, request, pk=None):
        """
        Acción personalizada para añadir una película a la lista.
        Endpoint: POST /api/listas/{id}/add-movie/
        Body: {"pelicula_id": 1}
        """
        lista = self.get_object()
        serializer = MovieIDSerializer(data=request.data)

        if serializer.is_valid():
            pelicula_id = serializer.validated_data['pelicula_id']
            pelicula = get_object_or_404(Pelicula, id=pelicula_id)

            if pelicula in lista.peliculas.all():
                return Response(
                    {'detail': 'La película ya está en esta lista.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            lista.peliculas.add(pelicula)
            return Response(
                {'detail': f'Película "{pelicula.titulo}" añadida a la lista.'},
                status=status.HTTP_200_OK
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='remove-movie')
    def remove_movie(self, request, pk=None):
        """
        Acción personalizada para quitar una película de la lista.
        Endpoint: POST /api/listas/{id}/remove-movie/
        Body: {"pelicula_id": 1}
        """
        lista = self.get_object()
        serializer = MovieIDSerializer(data=request.data)

        if serializer.is_valid():
            pelicula_id = serializer.validated_data['pelicula_id']
            pelicula = get_object_or_404(Pelicula, id=pelicula_id)

            if pelicula not in lista.peliculas.all():
                return Response(
                    {'detail': 'La película no está en esta lista.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            lista.peliculas.remove(pelicula)
            return Response(
                {'detail': f'Película "{pelicula.titulo}" eliminada de la lista.'},
                status=status.HTTP_200_OK
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
