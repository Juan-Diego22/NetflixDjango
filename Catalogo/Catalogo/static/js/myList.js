document.addEventListener('DOMContentLoaded', function() {
    // CONFIGURACIÓN Y VARIABLES GLOBALES
    const API_BASE_URL = 'http://127.0.0.1:8000/api/'; 
    const LISTS_API_URL = `${API_BASE_URL}listas/`; 
    
    // Contenedores principales
    const LISTS_CONTAINER = document.getElementById('lists-container');
    const CREATE_LIST_BTN = document.getElementById('create-list-btn');

    // Variables del Modal de Edición 
    const EDIT_LIST_MODAL = document.getElementById('edit-list-modal');
    const EDIT_MODAL_CLOSE_BTN = document.querySelector('.edit-modal-close');
    const EDIT_LIST_NAME_INPUT = document.getElementById('edit-list-name-input');
    const SAVE_LIST_NAME_BTN = document.getElementById('save-list-name-btn');
    const EDIT_MOVIE_LIST_CONTAINER = document.getElementById('edit-movie-list-container');
    const MOVIE_COUNT_DISPLAY = document.getElementById('movie-count-display');

    let currentListId = null; // Variable para guardar el ID de la lista que se está editando

    // Variables del Modal de Agregar Película 
    const ADD_TO_LIST_MODAL = document.getElementById('add-to-list-modal');
    const MODAL_MOVIE_TITLE = document.getElementById('modal-movie-title');
    const MODAL_LIST_OPTIONS = document.getElementById('modal-list-options');
    const CONFIRM_ADD_BTN = document.getElementById('confirm-add-btn');
    // const MODAL_CLOSE_BTN_GENERIC = document.querySelector('#add-to-list-modal .close-btn');
    
    // Función para obtener las cabeceras de autenticación (JWT Bearer)
    function getAuthHeaders(contentType = 'application/json') {
        const token = localStorage.getItem('accessToken'); 
        
        const headers = {};
        if (contentType) {
            headers['Content-Type'] = contentType;
        }
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`; 
            return headers;
        }
        
        return null; 
    }

    // FUNCIONES DE RENDERIZADO

    // Renderiza la tarjeta de lista
    function renderListCard(list) {
        
        const coverUrl = list.last_movie_poster || 'https://placehold.co/400x200/444444/FFFFFF?text='; 
        
        const listCard = document.createElement('div');
        listCard.className = 'list-card';
        listCard.dataset.listId = list.id; // Almacena el ID para las acciones

        listCard.innerHTML = `
            <img src="${coverUrl}" alt="Portada de la lista ${list.nombre}" class="list-cover" 
                 onerror="this.onerror=null;this.src='https://placehold.co/400x200/444444/FFFFFF?text=';">
            <div class="list-content">
                <h3 class="list-name">${list.nombre}</h3>
                <p class="list-count">${list.count} Películas</p>
            </div>
            <div class="list-actions">
                <button class="action-btn edit-list-btn" title="Editar Lista">
                    <i class="fas fa-pencil-alt"></i>
                </button>
                <button class="action-btn delete-list-btn" title="Eliminar Lista">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;
        return listCard;
    }

    // Renderiza una película para el modal de edición
    function renderMovieInEditModal(movie) {
        const movieCard = document.createElement('div');
        movieCard.className = 'edit-movie-card';
        // El objeto película tiene un 'id', 'titulo' y 'poster_url'
        movieCard.dataset.movieId = movie.id; 
        
        const posterUrl = movie.poster_url || 'https://placehold.co/120x180/444444/FFFFFF?text=';

        movieCard.innerHTML = `
            <img src="${posterUrl}" alt="${movie.titulo}" 
                 onerror="this.onerror=null;this.src='https://placehold.co/120x180/444444/FFFFFF?text=';">
            <button class="remove-movie-btn" title="Quitar de la lista">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;
        return movieCard;
    }

    // CRUD DE LISTAS (CREATE, READ ALL, DELETE, READ DETAILS, UPDATE NAME)
    async function fetchUserLists() {
        LISTS_CONTAINER.innerHTML = '<p class="loading-msg">Cargando tus listas...</p>';
        const headers = getAuthHeaders();
        if (!headers) {
            LISTS_CONTAINER.innerHTML = '<p class="error-msg">Por favor, inicia sesión para ver tus listas.</p>';
            return;
        }

        try {
            const response = await fetch(LISTS_API_URL, { headers: headers });
            if (!response.ok) throw new Error('Error de red o de autenticación.');
            
            const lists = await response.json();
            
            LISTS_CONTAINER.innerHTML = ''; 

            if (lists.length === 0) {
                LISTS_CONTAINER.innerHTML = '<p class="empty-msg">Aún no tienes listas. ¡Crea una ahora!</p>';
            } else {
                lists.forEach(list => {
                    LISTS_CONTAINER.appendChild(renderListCard(list));
                });
            }

        } catch (error) {
            console.error('Error al obtener listas:', error);
            LISTS_CONTAINER.innerHTML = '<p class="error-msg">Hubo un error al cargar tus listas. Por favor, inténtalo de nuevo.</p>';
        }
    }

    async function fetchListDetailsAndShowModal(listId) {
        const headers = getAuthHeaders();
        if (!headers) {
            alert("No has iniciado sesión. Redirigiendo a login...");
            window.location.href = '../login/login.html';
            return;
        }

        try {
            const response = await fetch(`${LISTS_API_URL}${listId}/`, {
                method: 'GET',
                headers: headers 
            });
            
            if (!response.ok) throw new Error('Error al cargar detalles de la lista.');
            
            const listDetails = await response.json();
            
            // 1. Llenar el modal con la información
            currentListId = listId;
            EDIT_LIST_NAME_INPUT.value = listDetails.nombre;
            MOVIE_COUNT_DISPLAY.textContent = listDetails.peliculas.length;

            // 2. Renderizar las películas
            EDIT_MOVIE_LIST_CONTAINER.innerHTML = '';
            listDetails.peliculas.forEach(movie => {
                EDIT_MOVIE_LIST_CONTAINER.appendChild(renderMovieInEditModal(movie));
            });
            
            // 3. Mostrar el modal
            EDIT_LIST_MODAL.classList.remove('hidden');

        } catch (error) {
            console.error('Error al cargar detalles de la lista:', error);
            alert("Hubo un error al cargar los detalles de la lista.");
        }
    }


    // CREATE: Crear Nueva Lista 
    CREATE_LIST_BTN.addEventListener('click', async () => {
        const listName = prompt("Introduce el nombre de tu nueva lista:");
        if (!listName || listName.trim() === "") {
            alert("El nombre de la lista no puede estar vacío.");
            return;
        }
        
        const headers = getAuthHeaders();
        if (!headers) {
            alert("Debes iniciar sesión para crear listas.");
            return;
        }

        try {
            const response = await fetch(LISTS_API_URL, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ nombre: listName.trim() })
            });

            if (!response.ok) {
                throw new Error('Error al crear la lista: ' + response.statusText);
            }
            
            fetchUserLists(); 

        } catch (error) {
            console.error('Error al crear lista:', error);
            alert("Hubo un error al crear la lista.");
        }
    });


    // UPDATE NAME: Guardar el nuevo nombre de la lista 
    SAVE_LIST_NAME_BTN.addEventListener('click', async () => {
        if (!currentListId) return;

        const newName = EDIT_LIST_NAME_INPUT.value.trim();
        if (newName === "") {
            alert("El nombre de la lista no puede estar vacío.");
            return;
        }
        
        // Si el nombre no ha cambiado, no hacemos llamada a la API
        // if (newName === document.getElementById('edit-list-name-display').textContent.replace('Editar Lista: ', '')) return;

        const headers = getAuthHeaders();
        if (!headers) {
            alert("No has iniciado sesión.");
            return;
        }

        try {
            const response = await fetch(`${LISTS_API_URL}${currentListId}/`, {
                method: 'PATCH', 
                headers: headers,
                body: JSON.stringify({ nombre: newName })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Error de API al actualizar lista:', errorData);
                throw new Error('Error al actualizar la lista: ' + JSON.stringify(errorData));
            }
            
            alert("Nombre de la lista actualizado con éxito.");
            EDIT_LIST_MODAL.classList.add('hidden');
            fetchUserLists(); 
        } catch (error) {
            console.error('Error al guardar el nombre de la lista:', error);
            alert("Hubo un error al actualizar la lista. Revisa la consola.");
        }
    });


    // MANEJADORES DE EVENTOS DE LISTAS (DELETE LIST, OPEN EDIT MODAL)

    LISTS_CONTAINER.addEventListener('click', async (e) => {
        const listCard = e.target.closest('.list-card');
        if (!listCard) return;

        const listId = listCard.dataset.listId;

        // MANEJADOR PARA ELIMINAR LISTA 
        const deleteBtn = e.target.closest('.delete-list-btn');
        if (deleteBtn) {
            if (!confirm("¿Estás seguro de que quieres eliminar esta lista? Esta acción es irreversible.")) return;

            const headers = getAuthHeaders();
            if (!headers) {
                alert("Debes iniciar sesión para eliminar listas.");
                return;
            }

            try {
                const response = await fetch(`${LISTS_API_URL}${listId}/`, {
                    method: 'DELETE',
                    headers: headers
                });
                
                if (response.status === 204) { 
                    listCard.remove();
                    fetchUserLists(); 
                } else {
                    throw new Error('Error al eliminar la lista: ' + response.statusText);
                }

            } catch (error) {
                console.error('Error al eliminar la lista:', error);
                alert("Hubo un error al eliminar la lista. Por favor, verifica tu conexión o sesión.");
            }
        }
        
        // MANEJADOR PARA ABRIR MODAL DE EDICIÓN 
        const editBtn = e.target.closest('.edit-list-btn');
        if (editBtn) {
            await fetchListDetailsAndShowModal(listId);
        }
        
        // 3. MANEJADOR PARA VER DETALLES DE LISTA (Opcional: si clicas en la tarjeta sin botón)
        // Podrías añadir lógica aquí para redirigir a una página de detalles de la lista si no se hizo clic en un botón.
    });

    // GESTIÓN DEL MODAL DE EDICIÓN (CERRAR Y ELIMINAR PELÍCULA)

    EDIT_MODAL_CLOSE_BTN.addEventListener('click', () => {
        EDIT_LIST_MODAL.classList.add('hidden');
        currentListId = null; 
    });
    
    EDIT_LIST_MODAL.addEventListener('click', (e) => {
        if (e.target === EDIT_LIST_MODAL) {
            EDIT_LIST_MODAL.classList.add('hidden');
            currentListId = null;
        }
    });

    // DELETE MOVIE: Quitar una película de la lista 
    EDIT_MOVIE_LIST_CONTAINER.addEventListener('click', async (e) => {
        const removeBtn = e.target.closest('.remove-movie-btn');
        if (removeBtn && currentListId) {
            
            const movieCard = removeBtn.closest('.edit-movie-card');
            const movieId = movieCard.dataset.movieId;
            
            if (!confirm("¿Estás seguro de que quieres quitar esta película de la lista?")) return;

            const headers = getAuthHeaders();
            if (!headers) {
                alert("No has iniciado sesión.");
                return;
            }
            
            try {
                const response = await fetch(`${LISTS_API_URL}${currentListId}/remove-movie/`, {
                    method: 'POST', 
                    headers: headers,
                    body: JSON.stringify({ movie_id: movieId })
                });

                if (response.status === 200 || response.status === 204) {
                    movieCard.remove(); 
                    const newCount = parseInt(MOVIE_COUNT_DISPLAY.textContent) - 1;
                    MOVIE_COUNT_DISPLAY.textContent = newCount;
                    fetchUserLists(); // Recargar el grid principal para actualizar la portada
                } else {
                    throw new Error('Error al quitar la película: ' + response.statusText);
                }

            } catch (error) {
                console.error('Error al quitar la película:', error);
                alert("Hubo un error al intentar quitar la película.");
            }
        }
    });


    // FUNCIÓN DE GESTIÓN DE PELÍCULAS (MANTENIDA DEL CÓDIGO ORIGINAL)

    // Este es un ejemplo de cómo agregarías una película a una lista (usado por otro modal/vista)
    async function addMovieToList(listId, movieId) {
        const headers = getAuthHeaders();
        if (!headers) {
            alert("Debes iniciar sesión para añadir películas.");
            return;
        }

        try {
            const response = await fetch(`${LISTS_API_URL}${listId}/add-movie/`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ movie_id: movieId })
            });

            if (!response.ok) throw new Error('Error al añadir la película.');
            
            fetchUserLists(); 

        } catch (error) {
            console.error('Error al añadir película:', error);
            alert("Hubo un error al añadir la película a la lista.");
        }
    }


    // INICIALIZACIÓN

    // Inicia la carga de listas al cargar la página
    fetchUserLists(); 
});