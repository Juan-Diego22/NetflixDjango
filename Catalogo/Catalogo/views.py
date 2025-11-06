from django.shortcuts import render, redirect
from django.contrib.auth.models import User 
from django.contrib import messages
from django.contrib.auth import authenticate, login 
from django.contrib.auth.decorators import login_required
from django.db.models import Q


# LÓGICA DE INICIO DE SESIÓN
def loginView(request):
    if request.method == 'POST':
        # 1. Obtener el input (que puede ser Email o Username)
        login_input = request.POST.get('username')
        password = request.POST.get('password')

        user = None
        try:
            # Buscamos al usuario por su nombre de usuario O su email
            # El campo del formulario es 'username', pero el usuario ingresa su email
            user = User.objects.get(Q(username__iexact=login_input) | Q(email__iexact=login_input))
        except User.DoesNotExist:
            # Si el usuario no existe con ese email/username, user es None
            pass

        authenticated_user = None
        if user is not None:
            # 2. Autenticar: Usamos el nombre de usuario REAL del usuario encontrado
            # Esto es necesario porque authenticate por defecto solo usa el campo 'username'
            authenticated_user = authenticate(request, username=user.username, password=password)

        if authenticated_user is not None:
            # 3. Iniciar sesión y redirigir
            login(request, authenticated_user) 
            messages.success(request, f'¡Bienvenido de nuevo, {authenticated_user.username}!')
            return redirect('index') 
        else:
            # 4. Credenciales inválidas (falla en el lookup o contraseña incorrecta)
            messages.error(request, 'Credenciales inválidas. Inténtalo de nuevo.')
            return render(request, 'login.html')

    # Si es una petición GET, simplemente muestra el formulario
    return render(request, 'login.html')

# LÓGICA DE REGISTRO
def registro(request):
    if request.method == 'POST':
        # 1. Obtener datos del formulario
        username = request.POST['username']
        email = request.POST['email']
        password = request.POST['password']
        password2 = request.POST['password2']

        # 2. Validaciones
        if password != password2:
            messages.error(request, 'Las contraseñas no coinciden.')
            return render(request, 'registro.html')

        if User.objects.filter(username=username).exists():
            messages.error(request, 'El nombre de usuario ya está registrado.')
            return render(request, 'registro.html')
        
        if User.objects.filter(email=email).exists():
            messages.error(request, 'El correo electrónico ya está en uso.')
            return render(request, 'registro.html')

        # 3. Creación del usuario (USA EL MODELO USER DE DJANGO)
        # El método create_user se encarga de aplicar el HASH a la contraseña.
        user = User.objects.create_user(username=username, email=email, password=password)
        user.save()

        # 4. Mensaje de éxito y redirección
        messages.success(request, 'Registro exitoso. ¡Ya puedes iniciar sesión!')
        return redirect('login') # Redirige al login 

    else:
        # Si es una petición GET, simplemente muestra el formulario
        return render(request, 'registro.html')

def recuperarContraseña(request):
    return render(request, 'recuperarContraseña.html')

@login_required(login_url='login') # Obliga a iniciar sesión, redirige a la URL 'login'
def index(request):
    return render(request, 'index.html')

@login_required(login_url='login')
def movies(request):
    return render(request, 'movies.html')

@login_required(login_url='login')
def myList(request):
    return render(request, 'myList.html')



