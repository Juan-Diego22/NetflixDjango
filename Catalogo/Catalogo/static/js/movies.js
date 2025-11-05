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

    // 2. FUNCIONES DE AUTENTICACIÓN
    
    /**
     * Obtiene las cabeceras de autenticación con el token
     * @param {string} contentType - Tipo de contenido (default: 'application/json')
     * @returns {Object|null} Objeto con headers o null si no hay token
     */
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

    // 3. FUNCIONES DE RENDERIZADO DEL CATÁLOGO

    /**
     * Renderiza una tarjeta de película en el catálogo
     * @param {Object} movie - Objeto con datos de la película
     * @returns {HTMLElement} Elemento div con la tarjeta
     */
    function renderMovieCard(movie) {
        const card = document.createElement('div');
        card.classList.add('poster-item');
        
        // AJUSTADO: Usar 'portadaUrl' en lugar de 'portada'
        const posterUrl = movie.portadaUrl || '../static/img/default-poster.png'; 

        card.dataset.movieId = movie.id; 
        // AJUSTADO: Usar 'title' en lugar de 'titulo'
        card.dataset.movieTitle = movie.title; 

        card.innerHTML = `
            <img src="${posterUrl}" alt="${movie.title}" class="grid-poster">
            <p class="movie-title-label">${movie.title}</p>
        `;

        return card;
    }

    /* Carga todas las películas desde la API y las renderiza */
    async function fetchAllMovies() {
        try {
            const response = await fetch(MOVIES_API_URL);
            
            if (!response.ok) {
                throw new Error(`Error en el servidor: ${response.status} ${response.statusText}`);
            }
            
            const movies = await response.json();
            
            // Limpia el contenedor
            MOVIE_CATALOG_CONTAINER.innerHTML = '';
            
            if (movies && movies.length > 0) {
                movies.forEach(movie => {
                    const movieCard = renderMovieCard(movie);
                    MOVIE_CATALOG_CONTAINER.appendChild(movieCard);
                });
            } else {
                MOVIE_CATALOG_CONTAINER.innerHTML = '<p class="empty-msg">El catálogo está vacío. ¡Añade películas desde el administrador de Django!</p>';
            }

        } catch (error) {
            console.error('Error al cargar películas:', error);
            MOVIE_CATALOG_CONTAINER.innerHTML = `<p class="error-msg">No se pudo cargar el catálogo. Verifica que tu servidor de Django esté corriendo. Detalle: ${error.message}</p>`;
        }
    }

    // 4. MODAL DE DETALLES DE PELÍCULA

    /**
     * Muestra el modal de detalles con información completa de una película
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
            // currentMovieData = movie; // Variable no necesaria, eliminada.
            
            console.log('📽️ Datos de película:', movie); // Debug
            
            // Mapear campos correctos de tu API
            const posterUrl = movie.portadaUrl || '../static/img/default-poster.png';
            const title = movie.title || 'Título no disponible';
            const description = movie.description || 'Sin descripción disponible.';
            const year = movie.year || 'N/A';
            const genero = movie.nombre || 'N/A';
            
            // Renderizar contenido del modal (SIMPLIFICADO)
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
                            <span class="details-info-label">Genero:</span>
                            <span class="details-info-value">${genero}</span>
                        </div>
                    </div>
                </div>
            `;
            
            // Mostrar modal
            MOVIE_DETAILS_MODAL.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Event listener para el botón "Añadir a Lista"
            const addBtn = document.getElementById('add-to-list-from-details');
            if (addBtn) {
                addBtn.addEventListener('click', () => {
                    // Cierra el modal de detalles antes de abrir el de lista
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

    /* Cierra el modal de detalles */
    function closeMovieDetailsModal() {
        if (MOVIE_DETAILS_MODAL) {
            MOVIE_DETAILS_MODAL.classList.remove('active');
            document.body.style.overflow = '';
            // currentMovieData = null; 
        }
    }

    // MODAL DE AÑADIR A LISTA

    /**
     * Abre el modal de "Añadir a Lista"
     * @param {string} movieTitle - Título de la película
     */
    async function openAddToListModal(movieTitle) {
        MODAL_MOVIE_TITLE.textContent = movieTitle;
        await loadUserListsForModal();
        ADD_TO_LIST_MODAL.classList.remove('hidden');
    }

    /* Carga las listas del usuario en el modal */
    async function loadUserListsForModal() {
        const headers = getAuthHeaders(null);

        MODAL_LIST_OPTIONS.innerHTML = '';
        CONFIRM_ADD_BTN.disabled = true;

        if (!headers) {
            MODAL_LIST_OPTIONS.innerHTML = '<p class="error-msg">Debes iniciar sesión para ver tus listas.</p>';
            return;
        }

        try {
            const response = await fetch(LISTS_API_URL, { headers });
            
            if (!response.ok) throw new Error('Error al cargar listas.');

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
                radioLabel.textContent = list.nombre || list.name; // Soporta ambos nombres

                radioDiv.appendChild(radioInput);
                radioDiv.appendChild(radioLabel);
                MODAL_LIST_OPTIONS.appendChild(radioDiv);
            });

        } catch (error) {
            console.error('Error al cargar listas para modal:', error);
            MODAL_LIST_OPTIONS.innerHTML = '<p class="error-msg">Error al cargar tus listas.</p>';
        }
    }

    /* Añade la película a la lista seleccionada */
    async function handleAddMovie() {
        const selectedListId = document.querySelector('input[name="list-selection"]:checked')?.value;

        if (!selectedListId || !selectedMovieId) {
            alert('Por favor, selecciona una lista y una película.');
            return;
        }

        const headers = getAuthHeaders();
        if (!headers) {
            alert("Debes iniciar sesión para añadir películas.");
            return;
        }
        
        // Deshabilitar botón para evitar clics dobles
        CONFIRM_ADD_BTN.disabled = true;

        try {
            const response = await fetch(`${LISTS_API_URL}${selectedListId}/add-movie/`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ pelicula_id: selectedMovieId })
            });

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

    /* Cierra el modal de añadir a lista */
    function closeAddToListModal() {
        ADD_TO_LIST_MODAL.classList.add('hidden');
        selectedMovieId = null;
        // Restablece el botón de confirmación por si se cerró antes de seleccionar
        CONFIRM_ADD_BTN.disabled = true; 
    }

    // EVENT LISTENERS

    // Click en póster del catálogo -> Abre modal de detalles
    MOVIE_CATALOG_CONTAINER.addEventListener('click', (e) => {
        const posterItem = e.target.closest('.poster-item');
        if (posterItem) {
            const movieId = posterItem.dataset.movieId;
            if (movieId) {
                showMovieDetailsModal(movieId);
            }
        }
    });

    // Cerrar modal de detalles con botón X
    if (DETAILS_CLOSE_BTN) {
        DETAILS_CLOSE_BTN.addEventListener('click', closeMovieDetailsModal);
    }

    // Cerrar modal de detalles al hacer clic fuera
    if (MOVIE_DETAILS_MODAL) {
        MOVIE_DETAILS_MODAL.addEventListener('click', (e) => {
            if (e.target === MOVIE_DETAILS_MODAL) {
                closeMovieDetailsModal();
            }
        });
    }

    // Cerrar modal con tecla ESC
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

    // Confirmar adición de película a lista
    CONFIRM_ADD_BTN.addEventListener('click', handleAddMovie);

    // Habilitar botón de confirmación cuando se selecciona una lista
    MODAL_LIST_OPTIONS.addEventListener('change', (e) => {
        if (e.target.name === 'list-selection') {
            CONFIRM_ADD_BTN.disabled = false;
        }
    });
    
    // Cerrar modal de "Añadir a Lista" con X
    if (MODAL_CLOSE_BTN) {
        MODAL_CLOSE_BTN.addEventListener('click', closeAddToListModal);
    }
    
    // Cerrar modal de "Añadir a Lista" al hacer clic fuera
    if (ADD_TO_LIST_MODAL) {
        ADD_TO_LIST_MODAL.addEventListener('click', (e) => {
            if (e.target === ADD_TO_LIST_MODAL) {
                closeAddToListModal();
            }
        });
    }

    // ------------------------------------------------------------------
    // 7. INICIALIZACIÓN
    // ------------------------------------------------------------------
    
    fetchAllMovies(); 
    
    console.log('✅ Movies.js cargado correctamente');
});