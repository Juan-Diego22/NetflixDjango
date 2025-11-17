document.addEventListener('DOMContentLoaded', function() {
    // 1. CONFIGURACIÓN Y VARIABLES GLOBALES
    const API_BASE_URL = 'http://127.0.0.1:8000/api/'; 
    const MOVIES_API_URL = `${API_BASE_URL}peliculas/`;
    const LISTS_API_URL = `${API_BASE_URL}listas/`;
    
    // Elementos del DOM - Catálogo
    const MOVIE_CATALOG_CONTAINER = document.getElementById('movie-catalog');
    
    // Elementos del DOM - Modal de Detalles
    const MOVIE_DETAILS_MODAL = document.getElementById('movie-details-modal');
    const DETAILS_MODAL_BODY = document.getElementById('details-modal-body');
    const DETAILS_CLOSE_BTN = document.getElementById('details-close-btn');
    
    // Elementos del DOM - Modal de Añadir a Lista
    const ADD_TO_LIST_MODAL = document.getElementById('add-to-list-modal');
    const MODAL_MOVIE_TITLE = document.getElementById('modal-movie-title');
    const MODAL_LIST_OPTIONS = document.getElementById('modal-list-options');
    const CONFIRM_ADD_BTN = document.getElementById('confirm-add-btn');
    const MODAL_CLOSE_BTN = document.querySelector('#add-to-list-modal .close-btn');

    // Variables de estado
    let selectedMovieId = null;

    // 2. FUNCIONES DE UTILIDAD Y CONFIGURACIÓN
    
    /* Obtiene el token CSRF de las cookies */
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    /**
     * Obtiene las cabeceras con CSRF token para Django
     * @param {string} contentType - Tipo de contenido
     * @returns {Object} Objeto con headers
     */
    function getAuthHeaders(contentType = 'application/json') {
        const headers = {
            'X-CSRFToken': getCookie('csrftoken')
        };
        
        if (contentType) {
            headers['Content-Type'] = contentType;
        }
        return headers;
    }
    
    // 3. FUNCIONES DE RENDERIZADO 

    /* Renderiza una tarjeta de película en el catálogo */
    function renderMovieCard(movie) {
        const card = document.createElement('div');
        card.classList.add('poster-item');
        
        const posterUrl = movie.portadaUrl || '../static/img/default-poster.png'; 

        card.dataset.movieId = movie.id; 
        card.dataset.movieTitle = movie.title; 

        card.innerHTML = `
            <img src="${posterUrl}" alt="${movie.title}" class="grid-poster">
            <p class="movie-title-label">${movie.title}</p>
        `;
        return card;
    }

    // 4. FUNCIONES DE CARGA DE DATOS

    /* Carga todas las películas desde la API y las renderiza */
    async function fetchAllMovies() {
        try {
            const response = await fetch(MOVIES_API_URL);
            
            if (!response.ok) {
                throw new Error(`Error en el servidor: ${response.status} ${response.statusText}`);
            }
            
            const movies = await response.json();
            
            MOVIE_CATALOG_CONTAINER.innerHTML = '';
            
            if (movies && movies.length > 0) {
                movies.forEach(movie => {
                    const movieCard = renderMovieCard(movie);
                    MOVIE_CATALOG_CONTAINER.appendChild(movieCard);
                });
            } else {
                MOVIE_CATALOG_CONTAINER.innerHTML = `<p class="empty-msg">El catálogo está vacío.
                ¡Añade películas desde el administrador de Django!</p>`;
            }

        } catch (error) {
            console.error('Error al cargar películas:', error);
            MOVIE_CATALOG_CONTAINER.innerHTML = `<p class="error-msg">No se pudo cargar el catálogo. 
                Verifica que tu servidor de Django esté corriendo. Detalle: ${error.message}</p>`;
        }
    }

    /* Carga las listas del usuario en el modal */
    async function loadUserListsForModal() {
        const headers = getAuthHeaders(null);

        MODAL_LIST_OPTIONS.innerHTML = '';
        CONFIRM_ADD_BTN.disabled = true;

        try {
            // Agregamos credentials: 'include' para enviar cookies de sesión
            const response = await fetch(LISTS_API_URL, { 
                headers,
                credentials: 'include' 
            });
            
            if (response.status === 401 || response.status === 403) {
                MODAL_LIST_OPTIONS.innerHTML = '<p class="error-msg">Debes iniciar sesión para ver tus listas.</p>';
                return;
            }

            if (!response.ok) {
                throw new Error('Error al cargar listas.');
            }

            const lists = await response.json();
            
            if (lists.length === 0) {
                MODAL_LIST_OPTIONS.innerHTML = '<p>No tienes listas. ¡Crea una!</p>';
                return;
            }

            lists.forEach(list => {
                const radioDiv = document.createElement('div');
                radioDiv.classList.add('list-option');

                const radioInput = document.createElement('input');
                radioInput.type = 'radio';
                radioInput.name = 'list-selection';
                radioInput.value = list.id;
                radioInput.id = `list-${list.id}`;

                const radioLabel = document.createElement('label');
                radioLabel.htmlFor = `list-${list.id}`;
                radioLabel.textContent = list.nombre || list.name;

                radioDiv.appendChild(radioInput);
                radioDiv.appendChild(radioLabel);
                MODAL_LIST_OPTIONS.appendChild(radioDiv);
            });

        } catch (error) {
            console.error('Error al cargar listas para modal:', error);
            MODAL_LIST_OPTIONS.innerHTML = '<p class="error-msg">Error al cargar tus listas.</p>';
        }
    }

    // 5. FUNCIONES DE LÓGICA

    /* Añade la película a la lista seleccionada */
    async function handleAddMovie() {
        const selectedListId = document.querySelector('input[name="list-selection"]:checked')?.value;

        if (!selectedListId || !selectedMovieId) {
            alert('Por favor, selecciona una lista y una película.');
            return;
        }

        const numericMovieId = parseInt(selectedMovieId); // Convertir a número entero

        if (isNaN(numericMovieId)) {
            console.error('El ID de la película no es un número válido.');
            alert('Error: ID de película no válido.');
            return;
        }

        const headers = getAuthHeaders();
        
        CONFIRM_ADD_BTN.disabled = true;

        try {
            const response = await fetch(`${LISTS_API_URL}${selectedListId}/add-movie/`, {
                method: 'POST',
                headers: headers,
                credentials: 'include', 
                body: JSON.stringify({ pelicula_id: numericMovieId })
            });

            if (response.status === 401 || response.status === 403) {
                alert("Debes iniciar sesión para añadir películas.");
                return;
            }

            if (!response.ok) {
                const errorData = response.status === 400 ? await response.json() : { detail: 'Error desconocido.' };
                throw new Error(errorData.detail || 'Error al añadir la película.');
            }

            alert('¡Película añadida con éxito a tu lista!');

        } catch (error) {
            console.error('Error al añadir película:', error);
            alert(`Hubo un error al añadir la película: ${error.message}`);
        } finally {
            ADD_TO_LIST_MODAL.classList.add('hidden');
            selectedMovieId = null;
            CONFIRM_ADD_BTN.disabled = true;
        }
    }

    // 6. FUNCIONES DE CONTROL DE MODALES

    /**
     * Muestra el modal con los detalles de una película
     * @param {number} movieId - ID de la película
     */
    async function showMovieDetailsModal(movieId) { 
        if (!MOVIE_DETAILS_MODAL || !DETAILS_MODAL_BODY) {
            console.warn('Modal de detalles no encontrado en el DOM');
            return;
        }

        try {
            const response = await fetch(`${MOVIES_API_URL}${movieId}/`);
            
            if (!response.ok) {
                throw new Error(`Error al cargar detalles: ${response.status}`);
            }
            
            const movie = await response.json();
            
            console.log('🎬 Datos de película:', movie);
            
            const posterUrl = movie.portadaUrl || '../media/default-poster.png';
            const title = movie.title || 'Título no disponible';
            const description = movie.description || 'Sin descripción disponible.';
            const year = movie.year || 'N/A';
            const genero = movie.nombre || 'N/A';
            
            DETAILS_MODAL_BODY.innerHTML = `
                <div class="details-poster-column">
                    <img src="${posterUrl}" alt="${title}" class="details-poster-image">
                </div>
                <div class="details-info-column">
                    <h2 class="details-movie-title">${title}</h2>
                    
                    <button class="details-add-to-list-btn" id="add-to-list-from-details">
                        <i class="fas fa-plus"></i>
                        Añadir a Lista
                    </button>
                    
                    <p class="details-description">${description}</p>
                    
                    <div class="details-additional-info">
                        <div class="details-info-row">
                            <span class="details-info-label">Año:</span>
                            <span class="details-info-value">${year}</span>
                            <span class="details-info-label">Género:</span>
                            <span class="details-info-value">${genero}</span>
                        </div>
                    </div>
                </div>
            `;
            
            MOVIE_DETAILS_MODAL.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            const addBtn = document.getElementById('add-to-list-from-details');
            if (addBtn) {
                addBtn.addEventListener('click', () => {
                    closeMovieDetailsModal(); 
                    selectedMovieId = movie.id;
                    openAddToListModal(movie.title);
                });
            }

        } catch (error) {
            console.error('Error al cargar detalles de la película:', error);
            alert('No se pudieron cargar los detalles de la película.');
        }
    }

    // Cierra el modal de detalles de película
    function closeMovieDetailsModal() {
        if (MOVIE_DETAILS_MODAL) {
            MOVIE_DETAILS_MODAL.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    /**
     * Abre el modal para añadir película a una lista
     * @param {string} movieTitle - Título de la película
     */
    async function openAddToListModal(movieTitle) {
        MODAL_MOVIE_TITLE.textContent = movieTitle;
        await loadUserListsForModal();
        ADD_TO_LIST_MODAL.classList.remove('hidden');
    }

    // Cierra el modal de añadir a la lista
    function closeAddToListModal() {
        ADD_TO_LIST_MODAL.classList.add('hidden');
        selectedMovieId = null;
        CONFIRM_ADD_BTN.disabled = true; 
    }

    //7. EVENT LISTENERS

    // Click en tarjeta de película
    MOVIE_CATALOG_CONTAINER.addEventListener('click', (e) => {
        const posterItem = e.target.closest('.poster-item');
        if (posterItem) {
            const movieId = posterItem.dataset.movieId;
            if (movieId) {
                showMovieDetailsModal(movieId);
            }
        }
    });

    // Cerrar modal de detalles de película
    if (DETAILS_CLOSE_BTN) {
        DETAILS_CLOSE_BTN.addEventListener('click', closeMovieDetailsModal);
    }

    if (MOVIE_DETAILS_MODAL) {
        MOVIE_DETAILS_MODAL.addEventListener('click', (e) => {
            if (e.target === MOVIE_DETAILS_MODAL) {
                closeMovieDetailsModal();
            }
        });
    }

    // Cerrar modales con la tecla Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (MOVIE_DETAILS_MODAL.classList.contains('active')) {
                closeMovieDetailsModal();
            }
            if (!ADD_TO_LIST_MODAL.classList.contains('hidden')) {
                closeAddToListModal();
            }
        }
    });

    // Confirma añadir película
    CONFIRM_ADD_BTN.addEventListener('click', handleAddMovie);

    // Habilita el botón al seleccionar lista
    MODAL_LIST_OPTIONS.addEventListener('change', (e) => {
        if (e.target.name === 'list-selection') {
            CONFIRM_ADD_BTN.disabled = false;
        }
    });
    
    // Cerrar modal de añadir a lista
    if (MODAL_CLOSE_BTN) {
        MODAL_CLOSE_BTN.addEventListener('click', closeAddToListModal);
    }
    
    if (ADD_TO_LIST_MODAL) {
        ADD_TO_LIST_MODAL.addEventListener('click', (e) => {
            if (e.target === ADD_TO_LIST_MODAL) {
                closeAddToListModal();
            }
        });
    }

    // INICIALIZACIÓN
    fetchAllMovies(); 
    
});