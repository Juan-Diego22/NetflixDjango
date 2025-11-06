document.addEventListener('DOMContentLoaded', function() {
    // LÓGICA DE MENÚ 
    const menuToggle = document.getElementById('menu-toggle');
    const navLinks = document.getElementById('nav-links');
    const kebabMenu = document.querySelector('.kebab-menu');
    const kebabDropdown = document.querySelector('.kebab-dropdown');

    function toggleMenu() {
        navLinks.classList.toggle('active');
        document.body.classList.toggle('no-scroll', navLinks.classList.contains('active'));
    }

    // Inicialización de eventos del menú
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation(); 
            toggleMenu();
            
        });

        document.addEventListener('click', (e) => {
            if (navLinks.classList.contains('active') && 
                !navLinks.contains(e.target) && 
                !menuToggle.contains(e.target)) 
            {
                toggleMenu();
            }
        });

        navLinks.querySelectorAll('a').forEach(link => {
            if (!link.classList.contains('dropbtn')) {
                link.addEventListener('click', () => {
                    if (navLinks.classList.contains('active')) toggleMenu();
                });
            }
        });
    }
});

