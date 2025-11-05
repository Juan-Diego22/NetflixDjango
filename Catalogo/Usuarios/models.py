from django.db import models

# Create your models here.

class Usuario(models.Model):
    nombre = models.CharField(max_length=50, verbose_name="Nombre")
    email = models.EmailField(max_length=50, verbose_name="Email")
    password = models.CharField(max_length=20, verbose_name="Contraseña")

    def __str__(self):
        return f"{self.nombre} - {self.email} -  {self.password}"