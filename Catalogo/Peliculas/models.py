from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator

# Obtiene el modelo de usuario activo (django.contrib.auth.User)
User = get_user_model() 

# Pelicula (Catálogo del Administrador)
class Pelicula(models.Model):
    """Modelo para las películas subidas y gestionadas por el Administrador."""
    titulo = models.CharField(max_length=255, unique=True, verbose_name="Título")
    descripcion = models.TextField(blank=True, verbose_name="Descripción")
    portada = models.ImageField(max_length=500, blank=True, null=True, verbose_name="Portada")
    anioLanzamiento = models.IntegerField(
        validators=[MinValueValidator(1888)], verbose_name="Año de Lanzamiento", default=2024
    )
    nombre = models.CharField(max_length=50, verbose_name="Genero pelicula", default="desconocido")

    def __str__(self):
        return self.titulo

    class Meta: 
        verbose_name = "Película del Catálogo"
        verbose_name_plural = "Películas del Catálogo"


# Lista Personalizada (Lista del Usuario)
class ListaPersonalizada(models.Model):
    """Modelo para las listas personalizadas de los usuarios."""
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='listas_personalizadas', verbose_name="Usuario")
    nombre = models.CharField(max_length=100, verbose_name="Nombre de la Lista")
    peliculas = models.ManyToManyField(Pelicula, blank=True, related_name='listas', verbose_name="Películas en la Lista")
    fecha_creacion = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Creación")
    fecha_actualizacion = models.DateTimeField(auto_now=True, verbose_name="Última Actualización")

    def _str_(self):
        return f"Lista '{self.nombre}' de {self.usuario.username}"

    class Meta:
        verbose_name = "Lista Personalizada"
        verbose_name_plural = "Listas Personalizadas"
        # Asegura que un usuario no tenga dos listas con el mismo nombre
        unique_together = ('usuario', 'nombre')