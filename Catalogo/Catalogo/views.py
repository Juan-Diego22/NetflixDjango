from django.shortcuts import render


def login(request):
    return render(request, 'login.html')

def registro(request):
    return render(request, 'registro.html')

def recuperarContraseña(request):
    return render(request, 'recuperarContraseña.html')

def index(request):
    return render(request, 'index.html')

def movies(request):
    return render(request, 'movies.html')

def myList(request):
    return render(request, 'myList.html')



