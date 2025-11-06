document.addEventListener('DOMContentLoaded', function () {
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

    /**
     * Obtiene el valor del token CSRF del cookie 'csrftoken'.
     * Necesario para peticiones que modifican datos (POST, PUT, PATCH, DELETE).
     */
    function getCsrfToken() {
        // Busca el token en las cookies del navegador
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            let cookie = cookies[i].trim();
            // ¿Comienza este cookie con csrftoken=?
            if (cookie.startsWith('csrftoken=')) {
                return cookie.substring('csrftoken='.length, cookie.length);
            }
        }
        return null;
    }

    /**
     * Prepara las cabeceras para las peticiones. 
     * Incluye Content-Type y el token CSRF para métodos que lo requieran.
     */
    function getRequestHeaders(method = 'GET', contentType = 'application/json') {
        const headers = { 'Content-Type': contentType };

        // Solo incluimos el CSRF para peticiones que modifican el estado (CSRF-safe methods)
        if (!['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method.toUpperCase())) {
            const csrfToken = getCsrfToken();
            if (csrfToken) {
                headers['X-CSRFToken'] = csrfToken;
            } else {
                console.warn("CSRF token is missing for a non-safe request!");
            }
        }

        // ¡IMPORTANTE! Eliminamos la lógica de Bearer Token. 
        // Django usará automáticamente la cookie 'sessionid' para la autenticación.
        // const token = localStorage.getItem('accessToken'); 
        // if (token) { headers['Authorization'] = `Bearer ${token}`; }

        return headers;
    }


    // FUNCIONES DE RENDERIZADO

    /**
     * Dibuja todas las tarjetas de lista en el contenedor principal.
     * @param {Array<Object>} lists - El array de objetos de lista obtenidos del API.
     */
    function renderLists(lists) {
        LISTS_CONTAINER.innerHTML = ''; // Limpiar el contenedor

        if (lists.length === 0) {
            LISTS_CONTAINER.innerHTML = '<p class="info-msg">No tienes listas aún. ¡Crea una!</p>';
            return;
        }

        lists.forEach(list => {
            const card = renderListCard(list);
            LISTS_CONTAINER.appendChild(card);
        });
    }

    /**
     * Crea un elemento HTML (tarjeta) para una lista individual.
     * @param {Object} list - Objeto de una lista.
     * @returns {HTMLElement} La tarjeta de la lista.
     */
    
    function renderListCard(list) {
        const card = document.createElement('div');
        card.className = 'list-card';
        card.dataset.listId = list.id;

        // Crear el collage de portadas (primeras 4 películas)
        const coverImages = list.peliculas.map(p =>
            `<img src="${p.portada || 'https://placehold.co/100x150/000/fff?text=No+Cover'}" 
          alt="${p.titulo}" 
          class="list-cover-img" 
          onerror="this.onerror=null; this.src='https://placehold.co/100x150/000/fff?text=No+Cover';" />`
        ).join('');

        // Rellenar las portadas si hay menos de 4
        const emptyCovers = Array(4 - list.peliculas.length).fill(0).map(() =>
            `<div class="empty-cover-placeholder">?</div>`
        ).join('');

        card.innerHTML = `
        <div class="list-cover-collage">
            ${coverImages}${emptyCovers}
        </div>
        <div class="list-info">
            <h3 class="list-title">${list.nombre}</h3>
            <p class="list-count">${list.pelicula_count} Películas</p>
        </div>
        <div class="list-actions">
            <button class="edit-list-btn action-btn" title="Editar Lista">
                <i class="fas fa-edit"></i>
            </button>
            <button class="delete-list-btn action-btn" title="Eliminar Lista">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `;

        return card;
    }

    // Renderiza una película para el modal de edición
    function renderMovieInEditModal(movie) {
        const movieCard = document.createElement('div');
        movieCard.className = 'edit-movie-card';
        // El objeto película tiene un 'id', 'titulo' y 'poster_url'
        movieCard.dataset.movieId = movie.id;

        // NOTA: Tu PeliculaSerializer devuelve 'portada', no 'poster_url'. Ajusta aquí si es necesario.
        const posterUrl = movie.portada || 'https://placehold.co/120x180/444444/FFFFFF?text=';

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
        // Las cabeceras GET no necesitan CSRF ni Content-Type
        const headers = getRequestHeaders('GET');

        try {
            // El navegador enviará automáticamente la cookie 'sessionid'
            const response = await fetch(LISTS_API_URL, {
                method: 'GET',
                headers: headers,
                credentials: 'include'
            });

            // Si la respuesta es 403/401, informamos al usuario
            if (response.status === 403 || response.status === 401) {
                LISTS_CONTAINER.innerHTML = '<p class="error-msg">Por favor, inicia sesión para ver tus listas.</p>';
                return;
            }

            if (!response.ok) throw new Error('Error de red al obtener listas.');

            const lists = await response.json();

            LISTS_CONTAINER.innerHTML = '';

            if (lists.length === 0) {
                LISTS_CONTAINER.innerHTML = '<p class="empty-msg">Aún no tienes listas. ¡Crea una ahora!</p>';
            } else {
                // NOTA: Aquí asumo que la respuesta de DRF contiene los campos list.count y list.last_movie_poster
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
        const headers = getRequestHeaders('GET');

        try {
            const response = await fetch(`${LISTS_API_URL}${listId}/`, {
                method: 'GET',
                headers: headers,
                credentials: 'include'
            });

            if (response.status === 403 || response.status === 401) {
                alert("Sesión expirada o no iniciada. Redirigiendo a login...");
                // Podrías redirigir aquí si tienes la URL de login
                window.location.href = '/login/'; 
                return;
            }

            if (!response.ok) throw new Error('Error al cargar detalles de la lista.');

            const listDetails = await response.json();

            // 1. Llenar el modal con la información
            currentListId = listId;
            EDIT_LIST_NAME_INPUT.value = listDetails.nombre;

            // NOTA: Tu ListaPersonalizadaSerializer devuelve 'peliculas' con los 4 objetos preview.
            // Para la edición, podrías necesitar una vista o un serializador diferente 
            // que devuelva *todas* las películas con sus detalles completos.
            MOVIE_COUNT_DISPLAY.textContent = listDetails.peliculaCount || listDetails.peliculas.length;

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
        const listName = prompt("Ingresa el nombre de la nueva lista:");
        if (!listName) return; // Si el usuario cancela o deja vacío, salir.

        // Obtenemos cabeceras con CSRF para POST
        const headers = getRequestHeaders('POST');
        if (!headers['X-CSRFToken']) {
            alert("Error: Token CSRF no encontrado. Asegúrate de que estás logueado.");
            return;
        }

        try {
            const response = await fetch(LISTS_API_URL, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ nombre: listName }),
                credentials: 'include'
            });

            if (response.status === 403 || response.status === 401) {
                alert("Debes iniciar sesión para crear listas o tu sesión ha expirado.");
                return;
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Detalles del error:', errorData);
                throw new Error('Error al crear la lista: ' + response.statusText);
            }

            fetchUserLists();

        } catch (error) {
            console.error('Error al crear lista:', error);
            alert("Hubo un error al crear la lista. Revisa la consola.");
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

        // Obtenemos cabeceras con CSRF para PATCH
        const headers = getRequestHeaders('PATCH');
        if (!headers['X-CSRFToken']) {
            alert("Error: Token CSRF no encontrado. Asegúrate de que estás logueado.");
            return;
        }

        try {
            const response = await fetch(`${LISTS_API_URL}${currentListId}/`, {
                method: 'PATCH',
                headers: headers,
                body: JSON.stringify({ nombre: newName }),
                credentials: 'include'
            });

            if (response.status === 403 || response.status === 401) {
                alert("Debes iniciar sesión para actualizar listas o tu sesión ha expirado.");
                return;
            }

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

            // Obtenemos cabeceras con CSRF para DELETE
            const headers = getRequestHeaders('DELETE');
            if (!headers['X-CSRFToken']) {
                alert("Error: Token CSRF no encontrado. Asegúrate de que estás logueado.");
                return;
            }

            try {
                const response = await fetch(`${LISTS_API_URL}${listId}/`, {
                    method: 'DELETE',
                    headers: headers,
                    credentials: 'include'
                });

                if (response.status === 403 || response.status === 401) {
                    alert("Debes iniciar sesión para eliminar listas o tu sesión ha expirado.");
                    return;
                }

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

        // ✅ CORRECCIÓN: Asegurarse de que movieId es un número entero
        const numericMovieId = parseInt(movieId, 10);

        if (isNaN(numericMovieId)) {
            console.error('El ID de la película a eliminar no es un número válido.');
            alert('Error: ID de película inválido.');
            return;
        }

        if (!confirm("¿Estás seguro de que quieres quitar esta película de la lista?")) return;

        const headers = getRequestHeaders('POST');
        if (!headers['X-CSRFToken']) {
            alert("Error: Token CSRF no encontrado. Asegúrate de que estás logueado.");
            return;
        }

        try {
            console.log('🎬 Enviando pelicula_id:', numericMovieId); // Para debug
            
            const response = await fetch(`${LISTS_API_URL}${currentListId}/remove-movie/`, {
                method: 'POST',
                headers: headers,
                // ✅ CORRECCIÓN: Enviar el número directamente, no en array
                body: JSON.stringify({ pelicula_id: numericMovieId }),
                credentials: 'include'
            });

            if (response.status === 403 || response.status === 401) {
                alert("Debes iniciar sesión para modificar listas o tu sesión ha expirado.");
                return;
            }

            if (response.status === 200 || response.status === 204) {
                // Remover la tarjeta de la UI
                movieCard.remove();
                
                // Actualizar el contador
                const newCount = parseInt(MOVIE_COUNT_DISPLAY.textContent) - 1;
                MOVIE_COUNT_DISPLAY.textContent = newCount;
                
                // Recargar el grid principal
                fetchUserLists();
                
                alert('Película eliminada de la lista exitosamente.');
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('Error de API al quitar película:', errorData);
                throw new Error('Error al quitar la película: ' + response.statusText);
            }

        } catch (error) {
            console.error('Error al quitar la película:', error);
            alert("Hubo un error al intentar quitar la película: " + error.message);
        }
    }
});

    // FUNCIÓN DE GESTIÓN DE PELÍCULAS (MANTENIDA DEL CÓDIGO ORIGINAL)

    async function addMovieToList(listId, movieId) {
        // Obtenemos cabeceras con CSRF para POST
        const headers = getRequestHeaders('POST');
        if (!headers['X-CSRFToken']) {
            alert("Error: Token CSRF no encontrado. Asegúrate de que estás logueado.");
            return;
        }

        try {
            const response = await fetch(`${LISTS_API_URL}${listId}/add-movie/`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ pelicula_id: movieId }),
                credentials: 'include'
            });

            if (response.status === 403 || response.status === 401) {
                alert("Debes iniciar sesión para añadir películas o tu sesión ha expirado.");
                return;
            }

            if (!response.ok) throw new Error('Error al añadir la película.');

        } catch (error) {
            console.error('Error al añadir película:', error);
            alert("Hubo un error al añadir la película a la lista.");
        }
    }


    // INICIALIZACIÓN

    // Inicia la carga de listas al cargar la página
    fetchUserLists();
});