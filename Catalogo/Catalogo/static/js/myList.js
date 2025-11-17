document.addEventListener('DOMContentLoaded', function () {
    // 1. CONFIGURACIÓN Y VARIABLES GLOBALES
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

    // 2. FUNCIONES DE UTILIDAD
    
    /**
     * Obtiene el valor del token CSRF del cookie 'csrftoken'.
     * Necesario para peticiones que modifican datos (POST, PUT, PATCH, DELETE).
     * @param {string} name - Nombre de la cookie (por defecto 'csrftoken')
     * @returns {string|null} El valor del token CSRF o null si no existe
     */
    function getCsrfToken() {
        // Busca el token en las cookies del navegador
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            let cookie = cookies[i].trim();
            if (cookie.startsWith('csrftoken=')) {
                return cookie.substring('csrftoken='.length, cookie.length);
            }
        }
        return null;
    }

    /**
     * Prepara las cabeceras para las peticiones HTTP.
     * Incluye Content-Type y el token CSRF para métodos que lo requieran.
     * @param {string} method - Método HTTP (GET, POST, PATCH, DELETE, etc.)
     * @param {string} contentType - Tipo de contenido
     * @returns {Object} Objeto con las cabeceras configuradas
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

        // ⚠️ Eliminamos la lógica de Bearer Token. 
        // Django usará automáticamente la cookie 'sessionid' para la autenticación.
        // const token = localStorage.getItem('accessToken'); 
        // if (token) { headers['Authorization'] = `Bearer ${token}`; }

        return headers;
    }

    // 3. FUNCIONES DE RENDERIZADO

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

    /**
     * Renderiza una película para el modal de edición
     * @param {Object} movie - Objeto con datos de la película
     * @returns {HTMLElement} Tarjeta de película para el modal
     */
    function renderMovieInEditModal(movie) {
        const movieCard = document.createElement('div');
        movieCard.className = 'edit-movie-card';
        movieCard.dataset.movieId = movie.id;

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

    /**
     * Dibuja todas las tarjetas de lista en el contenedor principal.
     * @param {Array<Object>} lists - El array de objetos de lista obtenidos del API.
     */
    function renderLists(lists) {
        LISTS_CONTAINER.innerHTML = ''; 

        if (lists.length === 0) {
            LISTS_CONTAINER.innerHTML = '<p class="info-msg">No tienes listas aún. ¡Crea una!</p>';
            return;
        }

        lists.forEach(list => {
            const card = renderListCard(list);
            LISTS_CONTAINER.appendChild(card);
        });
    }

    // 4. FUNCIONES DE CARGA DE DATOS

    // Obtiene todas las listas del usuario desde la API
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
                // Aquí asumimos que la respuesta de DRF contiene los campos list.count y list.last_movie_poster
                lists.forEach(list => {
                    LISTS_CONTAINER.appendChild(renderListCard(list));
                });
            }

        } catch (error) {
            console.error('Error al obtener listas:', error);
            LISTS_CONTAINER.innerHTML = '<p class="error-msg">Hubo un error al cargar tus listas. Por favor, inténtalo de nuevo.</p>';
        }
    }

    /**
     * Obtiene los detalles de una lista específica
     * @param {number} listId - ID de la lista a consultar
     */
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

            // Llenar el modal con la información
            currentListId = listId;
            EDIT_LIST_NAME_INPUT.value = listDetails.nombre;
            MOVIE_COUNT_DISPLAY.textContent = listDetails.peliculaCount || listDetails.peliculas.length;

            // Renderizar las películas
            EDIT_MOVIE_LIST_CONTAINER.innerHTML = '';
            listDetails.peliculas.forEach(movie => {
                EDIT_MOVIE_LIST_CONTAINER.appendChild(renderMovieInEditModal(movie));
            });

            // Mostrar el modal
            EDIT_LIST_MODAL.classList.remove('hidden');

        } catch (error) {
            console.error('Error al cargar detalles de la lista:', error);
            alert("Hubo un error al cargar los detalles de la lista.");
        }
    }

    // 5. FUNCIONES DE LÓGICA (CRUD)

    /**
    * Crea una nueva lista
    * @param {string} listName - Nombre de la nueva lista
    */ 
    async function createNewList(listName) {
        if (!listName) return;

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
    }


    /**
    * Actualiza el nombre de una lista existente
    * @param {number} listId - ID de la lista a actualizar
    * @param {string} newName - Nuevo nombre para la lista
    */
    async function updateListName(listId, newName) {
        if (!listId || !newName.trim()) {
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
            const response = await fetch(`${LISTS_API_URL}${listId}/`, {
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
    }


    /**
     * Elimina una lista
     * @param {number} listId - ID de la lista a eliminar
     * @param {HTMLElement} listCard - Elemento DOM de la tarjeta de lista
     */
    async function deleteList(listId, listCard) {
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
        

    
    /**
    * Añade una película a una lista
    * @param {number} listId - ID de la lista
    * @param {number} movieId - ID de la película a añadir
    */
    async function addMovieToList(listId, movieId) {
        const headers = getRequestHeaders('POST');
        if (!headers['X-CSRFToken']) {
            alert("Error: Token CSRF no encontrado. Asegúrate de que estás logueado.");
            return;
        }
        try {

            const response = await fetch(`${LISTS_API_URL}${listId}/remove-movie/`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ pelicula_id: movieId }),
                credentials: 'include'
            });

            if (response.status === 403 || response.status === 401) {
                alert("Debes iniciar sesión para modificar listas o tu sesión ha expirado.");
                return;
            }

            if (!response.ok) throw new Error('Error al añadir la película.');

        } catch (error) {
            console.error('Error al añadir película:', error);
            alert("Hubo un error al añadir la película a la lista.");
        }
    }


    /**
    * Elimina una película de una lista
    * @param {number} listId - ID de la lista
    * @param {number} movieId - ID de la película a eliminar
    * @param {HTMLElement} movieCard - Elemento DOM de la tarjeta de película
    */
    async function removeMovieFromList(listId, movieId, movieCard) {
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
    
            const response = await fetch(`${LISTS_API_URL}${listId}/remove-movie/`, {
                method: 'POST',
                headers: headers,
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
    
    // 6. FUNCIONES DE CONTROL DE MODALES
    
    /* Cierra el modal de edición de lista */
    function closeEditModal() {
        EDIT_LIST_MODAL.classList.add('hidden');
        currentListId = null;
    }

    
    // 7. EVENT LISTENERS
    
    // Crear nueva lista
    CREATE_LIST_BTN.addEventListener('click', async () => {
        const listName = prompt("Ingresa el nombre de la nueva lista:");
        await createNewList(listName);
    });

    // Guardar nombre de lista editado
    SAVE_LIST_NAME_BTN.addEventListener('click', async () => {
        const newName = EDIT_LIST_NAME_INPUT.value.trim();
        await updateListName(currentListId, newName);
    });

    // Acciones sobre las tarjetas de lista (editar/eliminar)
    LISTS_CONTAINER.addEventListener('click', async (e) => {
        const listCard = e.target.closest('.list-card');
        if (!listCard) return;

        const listId = listCard.dataset.listId;

        // Eliminar lista
        const deleteBtn = e.target.closest('.delete-list-btn');
        if (deleteBtn) {
            await deleteList(listId, listCard);
            return;
        }

        // Abrir modal de edición
        const editBtn = e.target.closest('.edit-list-btn');
        if (editBtn) {
            await fetchListDetailsAndShowModal(listId);
        }
    });

    // Cerrar modal de edición
    EDIT_MODAL_CLOSE_BTN.addEventListener('click', closeEditModal);

    EDIT_LIST_MODAL.addEventListener('click', (e) => {
        if (e.target === EDIT_LIST_MODAL) {
            closeEditModal();
        }
    });

    // Eliminar película de la lista
    EDIT_MOVIE_LIST_CONTAINER.addEventListener('click', async (e) => {
        const removeBtn = e.target.closest('.remove-movie-btn');
        if (removeBtn && currentListId) {
            const movieCard = removeBtn.closest('.edit-movie-card');
            const movieId = movieCard.dataset.movieId;
            await removeMovieFromList(currentListId, movieId, movieCard);
        }
    });

    // INICIALIZACIÓN
    fetchUserLists();
});