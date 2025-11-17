document.addEventListener('DOMContentLoaded', function() {

    // CONFIGURACIÓN DE API Y VARIABLES GLOBALES
    const ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIyMDY0N2FkZDRiYWYzNTRlZDVjMDU3M2E5OTE4MTA5NiIsIm5iZiI6MTc1ODkxOTIxMS4xNzgsInN1YiI6IjY4ZDZmYTJiODExMGVhZmFmMDJkZGMxOSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.0Xky0QEvpTB8wlP6uO0bEIPQq7LixAEBq_QOd72JsEk'; 
    const BASE_URL = 'https://api.themoviedb.org/3';
    const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original'; 

    const API_URL_TRENDING = `${BASE_URL}/trending/movie/week?language=es-ES`; 
    const API_URL_ACTION = `${BASE_URL}/discover/movie?language=es-ES&with_genres=28`; // 28 = Acción
    const API_URL_COMEDY = `${BASE_URL}/discover/movie?language=es-ES&with_genres=35`; // 35 = Comedia 
    const API_URL_SCIFI = `${BASE_URL}/discover/movie?language=es-ES&with_genres=878`; // 878 = Ciencia Ficción 
    const API_CREDITS_BASE = `${BASE_URL}/movie/`; 

    const options = {
        method: 'GET',
        headers: {
            accept: 'application/json',
            Authorization: `Bearer ${ACCESS_TOKEN}` 
        }
    };

    // Referencias a elementos del DOM para las filas de películas
    const trendingRowContainer = document.querySelector('.row-posters[data-category="trending"]');
    const actionRowContainer = document.querySelector('.row-posters[data-category="action"]');
    const comedyRowContainer = document.querySelector('.row-posters[data-category="comedy"]'); 
    const scifiRowContainer = document.querySelector('.row-posters[data-category="scifi"]'); 

    // Referencias a elementos DOM para la modal de Detalles
    const modal = document.getElementById('movie-details-modal');
    const modalBody = modal ? modal.querySelector('.modal-body') : null;
    const closeBtn = modal ? modal.querySelector('.close-btn') : null;
    

    // FUNCIONES AUXILIARES DE RATING Y DURACIÓN 

    /**
     * Genera el HTML para el sistema de calificación por estrellas.
     * @param {string|number} rating - Calificación numérica (e.g., 6.9).
     * @returns {string} HTML con los íconos de estrellas.
     */
    function generateStars(rating) {
        // Escala la calificación de 10 a 5 estrellas para el sistema visual
        const score = parseFloat(rating) / 2;
        if (isNaN(score)) return '';

        const fullStars = Math.floor(score);
        const halfStar = score - fullStars >= 0.5;
        const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

        let html = '';
        
        // Estrellas llenas (icono sólido)
        for (let i = 0; i < fullStars; i++) {
            html += '<i class="fas fa-star"></i>';
        }
        
        // Media estrella
        if (halfStar) {
            html += '<i class="fas fa-star-half-alt"></i>';
        }
        
        // Estrellas vacías (icono de contorno)
        for (let i = 0; i < emptyStars; i++) {
            html += '<i class="far fa-star"></i>';
        }

        return html;
    }


    // FUNCIONES ASÍNCRONAS DE API Y RENDERIZADO

    /**
     * Obtiene y renderiza una fila de pósters de películas.
     * @param {string} url - URL de la API para la categoría.
     * @param {HTMLElement} container - Contenedor DOM donde se insertarán los pósters.
     */
    async function fetchAndRenderRow(url, container) {
        if (!container) {
            console.warn('Contenedor no encontrado para la URL:', url);
            return;
        }

        try {
            const response = await fetch(url, options);
            if (!response.ok) throw new Error(`Fallo de red: ${response.status}`);
            
            const data = await response.json();
            
            if (!data.results || data.results.length === 0) {
                container.innerHTML = `<p class="error-msg">No hay contenido disponible.</p>`;
                return;
            }
            
            const htmlContent = data.results.map(movie => {
                const imagePath = movie.poster_path || movie.backdrop_path;
                if (!imagePath) return '';
                
                return `
                    <img 
                        src="${IMAGE_BASE_URL}${imagePath}" 
                        alt="${movie.title || movie.name}" 
                        class="poster" 
                        data-movie-id="${movie.id}"
                    />`;
            }).join('');

            container.innerHTML = htmlContent;

        } catch (error) {
            console.error("Error al renderizar la fila:", error);
            container.innerHTML = `<p class="error-msg">¡Ups! Error al cargar contenido.</p>`;
        }
    }

    /*
     Carga el HERO BANNER principal (el grande de arriba)
    */
    async function loadHeroBanner() {
        const heroBanner = document.getElementById('hero-banner');
        if (!heroBanner) {
            console.warn('Hero banner no encontrado');
            return;
        }

        const movieTitle = heroBanner.querySelector('.movie-title');
        const movieDescription = heroBanner.querySelector('.movie-description');
        const movieRating = heroBanner.querySelector('.rating'); // Contenedor padre de rating y duración
        const starring = heroBanner.querySelector('.movie-details p:first-child');
        const genres = heroBanner.querySelector('.movie-details p:last-child');

        try {
            const trendingUrl = `${BASE_URL}/trending/movie/week?language=es-ES`;
            const response = await fetch(trendingUrl, options);
            if (!response.ok) throw new Error(`Fallo de red: ${response.status}`);
            
            const data = await response.json();
            const movie = data.results[0]; // Primera película trending

            if (movie) {
                // Establecer imagen de fondo
                const backdropPath = movie.backdrop_path || movie.poster_path;
                if (backdropPath) {
                    heroBanner.style.backgroundImage = `url(${IMAGE_BASE_URL}${backdropPath})`;
                }

                // Obtener detalles completos
                const detailsUrl = `${BASE_URL}/movie/${movie.id}?language=es-ES&append_to_response=credits`;
                const detailsResponse = await fetch(detailsUrl, options);
                
                if (detailsResponse.ok) {
                    const movieDetails = await detailsResponse.json();

                    // Llenar información
                    if (movieTitle) movieTitle.textContent = movie.title || movie.name;
                    if (movieDescription) movieDescription.textContent = movie.overview || 'Sin descripción disponible.';
                    
                    if (movieRating) {
                        const ratingValue = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
                        const runtime = movieDetails.runtime || 0;
                        
                        // Formato de Duración. Ej. 1h 30min
                        const hours = Math.floor(runtime / 60);
                        const minutes = runtime % 60;
                        const durationText = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
                        
                        const starsHtml = generateStars(ratingValue); 

                        // Inyección de todo el contenido en el contenedor .rating usando innerHTML
                        movieRating.innerHTML = `
                            <div class="hero-stars">${starsHtml}</div>
                            <span class="hero-rating-value">${ratingValue}</span>
                            <span class="hero-duration"><i class="far fa-clock"></i> ${durationText}</span>
                        `;
                    }

                    // Reparto
                    if (starring && movieDetails.credits && movieDetails.credits.cast) {
                        const cast = movieDetails.credits.cast.slice(0, 3).map(c => c.name).join(', ');
                        starring.innerHTML = `<strong>Starring:</strong> ${cast || 'N/A'}`;
                    }
                    
                    // Géneros
                    if (genres && movieDetails.genres) {
                        const genresList = movieDetails.genres.map(g => g.name).join(', ');
                        genres.innerHTML = `<strong>Genres:</strong> ${genresList || 'N/A'}`;
                    }
                }
            }
        } catch (error) {
            console.error("Error al cargar Hero Banner:", error);
            if (movieTitle) movieTitle.textContent = "¡Ups! Error al cargar banner.";
        }
    }

    /* Carga y rellena los datos del banner promocional */
    async function loadPromoBanner() {
        const promoBanner = document.getElementById('promo-banner');
        if (!promoBanner) {
            console.warn('Banner promocional no encontrado');
            return;
        }

        const promoPoster = promoBanner.querySelector('.promo-poster');
        const promoTitle = promoBanner.querySelector('.promo-title');
        const promoDescription = promoBanner.querySelector('.promo-description');
        const promoDurationSpan = promoBanner.querySelector('.promo-duration span');

        const promoStarsDiv = promoBanner.querySelector('.promo-stars');
        const promoRatingValueSpan = promoBanner.querySelector('.promo-rating-value');


        try {
            const trendingUrl = `${BASE_URL}/trending/movie/week?language=es-ES`;
            const response = await fetch(trendingUrl, options);
            if (!response.ok) throw new Error(`Fallo de red al obtener trending: ${response.status}`);
            
            const data = await response.json();
            
            // Seleccionamos la segunda película para el promo banner
            const movie = data.results && data.results.length > 1 ? data.results[1] : data.results[0]; 

            if (movie) {
                const backdropPath = movie.backdrop_path || movie.poster_path;
                if (backdropPath) {
                    promoBanner.style.backgroundImage = `url(${IMAGE_BASE_URL}${backdropPath})`;
                }
                
                if (promoPoster && movie.poster_path) {
                    promoPoster.src = `${IMAGE_BASE_URL}${movie.poster_path}`;
                }

                // Obtener detalles adicionales
                const detailsUrl = `${BASE_URL}/movie/${movie.id}?language=es-ES`;
                const detailsResponse = await fetch(detailsUrl, options);
                
                if (!detailsResponse.ok) throw new Error(`Fallo al cargar detalles: ${detailsResponse.status}`);
                
                const movieDetails = await detailsResponse.json();

                if (promoTitle) promoTitle.textContent = movie.title || movie.name;
                if (promoDescription) promoDescription.textContent = movie.overview;
                
                const ratingValue = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
                const runtime = movieDetails.runtime || 0;

                // Mostrar Rating
                if (promoStarsDiv && promoRatingValueSpan) {
                    promoStarsDiv.innerHTML = generateStars(ratingValue);
                    promoRatingValueSpan.textContent = ratingValue;
                }

                // Mostrar Duración
                if (promoDurationSpan && runtime) {
                    const hours = Math.floor(runtime / 60);
                    const minutes = runtime % 60;
                    const durationText = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
                    promoDurationSpan.textContent = durationText;
                } else if (promoDurationSpan) {
                    promoDurationSpan.textContent = '';
                }
            }
        } catch (error) {
            console.error("Error al cargar el Banner Promo:", error);
            if(promoTitle) promoTitle.textContent = "¡Ups! Error al cargar Banner.";
        }
    }


    /**
     * Muestra la modal de detalles con la información completa de una película.
     * @param {string} movieId - ID de la película.
     */
    async function showMovieDetails(movieId) {
        if (!modal || !modalBody) {
            console.warn('Modal no encontrada en el DOM');
            return;
        }

        try {
            // Se solicitan videos y créditos junto con los detalles básicos
            const detailsUrl = `${BASE_URL}/movie/${movieId}?language=es-ES&append_to_response=videos,credits`;
            const response = await fetch(detailsUrl, options);
            
            if (!response.ok) throw new Error(`Error al cargar detalles: ${response.status}`);
            
            const movie = await response.json();
            
            // Procesar datos para renderizado
            const genres = movie.genres && movie.genres.length > 0 
                ? movie.genres.map(g => g.name).join(', ') 
                : 'N/A';
            const cast = movie.credits && movie.credits.cast && movie.credits.cast.length > 0
                ? movie.credits.cast.slice(0, 5).map(c => c.name).join(', ')
                : 'N/A';

            const director = movie.credits && movie.credits.crew 
                ? movie.credits.crew.find(person => person.job === 'Director') 
                : null;
            const directorName = director ? director.name : 'N/A';
            
            // RATING Y DURACIÓN 
            const runtime = movie.runtime || 0;
            const hours = Math.floor(runtime / 60);
            const minutes = runtime % 60;
            const durationText = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;

            const ratingValue = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
            const starsHTML = generateStars(ratingValue);

            // Generar contenido HTML (Nueva estructura para mejor visualización)
            modalBody.innerHTML = `
                <div class="details-header" style="background-image: url(${IMAGE_BASE_URL}${movie.backdrop_path || movie.poster_path})">
                    <h1 class="movie-title">${movie.title || movie.name}</h1>
                </div>
                <div class="details-content">
                    <div class="details-info" style="flex: 2;">
                        <p class="overview">${movie.overview || 'Sin descripción disponible.'}</p>
                        <div class="meta-data">
                            <div class="modal-rating-info">
                                <div class="hero-stars">${starsHTML}</div>
                                <span class="hero-rating-value">${ratingValue}</span>
                                <span class="modal-duration"><i class="far fa-clock"></i> ${durationText}</span>
                            </div>
                            <p><strong>Director:</strong> ${directorName}</p>
                            <p><strong>Géneros:</strong> ${genres}</p>
                            <p><strong>Reparto:</strong> ${cast}</p>
                        </div>
                        <div class="modal-actions">
                            <button class="play-button"><i class="fas fa-play"></i> Reproducir</button>
                            <button class="add-to-list-button"><i class="fas fa-plus"></i> Mi Lista</button>
                        </div>
                    </div>
                    <div class="details-poster-container" style="flex: 1;">
                         <img src="${IMAGE_BASE_URL}${movie.poster_path}" alt="${movie.title}" style="width: 100%; border-radius: 8px;">
                    </div>
                </div>
            `;

            modal.style.display = "block";
            document.body.classList.add('no-scroll'); 

        } catch (error) {
            console.error("Error al cargar detalles de la película:", error);
            alert("No se pudieron cargar los detalles de la película.");
        }
    }

    // LÓGICA DE CARRUSEL Y EVENTOS

    function setupRowCarousels() {
        document.querySelectorAll('.row-posters-wrapper').forEach(wrapper => {
            const postersContainer = wrapper.querySelector('.row-posters');
            const leftArrow = wrapper.querySelector('.left-arrow');
            const rightArrow = wrapper.querySelector('.right-arrow');
            
            if (!postersContainer || !leftArrow || !rightArrow) return; 

            // La cantidad de scroll es el 80% del ancho visible
            const scrollAmount = postersContainer.clientWidth * 0.8; 

            rightArrow.addEventListener('click', () => {
                postersContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            });

            leftArrow.addEventListener('click', () => {
                postersContainer.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
            });
        });
    }

    // Configura el carrusel del Hero Banner
    function setupHeroBannerCarousel() {
        const heroBanner = document.getElementById('hero-banner');
        if (!heroBanner) return;

        const leftArrow = heroBanner.querySelector('.left-arrow');
        const rightArrow = heroBanner.querySelector('.right-arrow');

        let currentIndex = 0;
        let movies = [];

        // Función para cargar película en el banner
        async function loadMovieAtIndex(index) {
            if (!movies.length) return;

            const movie = movies[index];
            const movieTitle = heroBanner.querySelector('.movie-title');
            const movieDescription = heroBanner.querySelector('.movie-description');
            const movieRating = heroBanner.querySelector('.rating');
            const starring = heroBanner.querySelector('.movie-details p:first-child');
            const genres = heroBanner.querySelector('.movie-details p:last-child');

            // Cambiar fondo
            const backdropPath = movie.backdrop_path || movie.poster_path;
            if (backdropPath) {
                heroBanner.style.backgroundImage = `url(${IMAGE_BASE_URL}${backdropPath})`;
            }

            // Obtener detalles
            try {
                const detailsUrl = `${BASE_URL}/movie/${movie.id}?language=es-ES&append_to_response=credits`;
                const response = await fetch(detailsUrl, options);
                
                if (response.ok) {
                    const movieDetails = await response.json();

                    if (movieTitle) movieTitle.textContent = movie.title || movie.name;
                    if (movieDescription) movieDescription.textContent = movie.overview || 'Sin descripción disponible.';
                    
                    // RATING Y DURACIÓN 
                    if (movieRating) {
                        const ratingValue = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
                        const runtime = movieDetails.runtime || 0;

                        // Generación del HTML para el Rating (Estrellas + Valor)
                        const starsHtml = generateStars(ratingValue);
                        
                        // Formato de Duración 
                        const hours = Math.floor(runtime / 60);
                        const minutes = runtime % 60;
                        const durationText = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;

                        // Generación del HTML para la Duración
                        const durationHtml = runtime ?
                            `<span class="hero-duration"><i class="far fa-clock"></i> ${durationText}</span>` : '';

                        // Inyección de todo el contenido en el contenedor .rating
                        movieRating.innerHTML = `
                            <div class="hero-stars">${starsHtml}</div>
                            <span class="hero-rating-value">${ratingValue}</span>
                            ${durationHtml}`;
                    }
                    
                    if (starring && movieDetails.credits && movieDetails.credits.cast) {
                        const cast = movieDetails.credits.cast.slice(0, 3).map(c => c.name).join(', ');
                        starring.innerHTML = `<strong>Starring:</strong> ${cast || 'N/A'}`;
                    }
                    
                    if (genres && movieDetails.genres) {
                        const genresList = movieDetails.genres.map(g => g.name).join(', ');
                        genres.innerHTML = `<strong>Genres:</strong> ${genresList || 'N/A'}`;
                    }
                }
            } catch (error) {
                console.error("Error al cargar detalles:", error);
            }
        }

        // Obtener películas para el carrusel
        async function loadCarouselMovies() {
            try {
                const response = await fetch(`${BASE_URL}/trending/movie/week?language=es-ES`, options);
                if (!response.ok) return;
                
                const data = await response.json();
                movies = data.results.slice(0, 5); // Primeras 5 películas
                
                if (movies.length > 0) {
                    await loadMovieAtIndex(0);
                }
            } catch (error) {
                console.error("Error al cargar películas del carrusel:", error);
            }
        }

        // Event listeners para las flechas
        if (rightArrow) {
            rightArrow.addEventListener('click', async () => {
                currentIndex = (currentIndex + 1) % movies.length;
                await loadMovieAtIndex(currentIndex);
            });
        }

        if (leftArrow) {
            leftArrow.addEventListener('click', async () => {
                currentIndex = (currentIndex - 1 + movies.length) % movies.length;
                await loadMovieAtIndex(currentIndex);
            });
        }

        loadCarouselMovies();
    }

    // Eventos de la Modal
    if (modal && closeBtn && modalBody) {
        // Abrir modal al hacer clic en el póster
        document.addEventListener('click', (e) => {
            const poster = e.target.closest('.poster');
            const movieId = poster ? poster.dataset.movieId : null;
            if (movieId) {
                showMovieDetails(movieId);
            }
        });

        // Cerrar modal al hacer clic en la X
        closeBtn.onclick = () => {
            modal.style.display = "none";
            document.body.classList.remove('no-scroll');
        };

        // Cerrar modal si el usuario hace clic fuera de ella
        window.onclick = (event) => {
            if (event.target == modal) {
                modal.style.display = "none";
                document.body.classList.remove('no-scroll');
            }
        };
    }

    // INICIALIZACIÓN

    // Cargar todas las secciones de contenido
    loadHeroBanner(); // Banner principal con carrusel
    fetchAndRenderRow(API_URL_TRENDING, trendingRowContainer);
    fetchAndRenderRow(API_URL_ACTION, actionRowContainer);
    loadPromoBanner(); 

    fetchAndRenderRow(API_URL_COMEDY, comedyRowContainer);
    fetchAndRenderRow(API_URL_SCIFI, scifiRowContainer);
    
    // Configurar la funcionalidad de scroll de las filas
    setupRowCarousels();
    setupHeroBannerCarousel(); // Activar carrusel del hero banner
});