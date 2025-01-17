// Variables globales
let propiedades = [];
let vendedores = [];
let searchableItems = [];
let currentTab = 'alquilar';

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await cargarDatos();
        initSearchSystem();
        setupEventListeners();
        cargarSecciones();
    } catch (error) {
        console.error('Error al inicializar:', error);
    }
});

// Cargar datos desde los archivos JSON
async function cargarDatos() {
    try {
        const [propiedadesResponse, vendedoresResponse] = await Promise.all([
            fetch('../propiedades.json'),  // Añadimos ../ para subir un nivel
            fetch('../vendedores.json')    // Añadimos ../ para subir un nivel
        ]);

        const propiedadesData = await propiedadesResponse.json();
        const vendedoresData = await vendedoresResponse.json();

        propiedades = propiedadesData.propiedades;
        vendedores = vendedoresData.vendedores;

        prepareSearchableItems();
    } catch (error) {
        console.error('Error cargando datos:', error);
        throw error;
    }
}

// Preparar items buscables
function prepareSearchableItems() {
    const items = new Set();
    
    propiedades.forEach(prop => {
        if (prop.ubicacion) {
            const [ciudad, region] = prop.ubicacion.split(',').map(s => s.trim());
            items.add({
                text: prop.ubicacion,
                searchText: prop.ubicacion.toLowerCase(),
                type: 'location',
                icon: 'fa-map-marker-alt',
                ciudad: ciudad,
                region: region
            });
        }
    });

    const caracteristicas = [
        { text: 'piscina', icon: 'fa-water' },
        { text: 'jardín', icon: 'fa-tree' },
        { text: 'terraza', icon: 'fa-umbrella-beach' },
        { text: 'balcón', icon: 'fa-door-open' },
        { text: 'cochera', icon: 'fa-car' },
        { text: 'amoblado', icon: 'fa-couch' }
    ];

    caracteristicas.forEach(({ text, icon }) => {
        items.add({
            text: text,
            searchText: text.toLowerCase(),
            type: 'feature',
            icon: icon
        });
    });

    searchableItems = Array.from(items);
}

// Inicializar sistema de búsqueda
function initSearchSystem() {
    const searchInput = document.querySelector('.location-input');
    const listboxId = 'location-listbox';
    
    let listbox = document.getElementById(listboxId);
    if (!listbox) {
        listbox = document.createElement('div');
        listbox.id = listboxId;
        listbox.className = 'location-listbox';
        listbox.setAttribute('role', 'listbox');
        searchInput.parentNode.appendChild(listbox);
    }

    searchInput.addEventListener('input', debounce((e) => {
        const value = e.target.value.toLowerCase().trim();
        handleSearch(value, listbox);
    }, 300));

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !listbox.contains(e.target)) {
            listbox.style.display = 'none';
        }
    });

    searchInput.addEventListener('keydown', (e) => {
        handleKeyboardNavigation(e, listbox, searchInput);
    });
}

// Manejar búsqueda
function handleSearch(query, listbox) {
    if (query.length < 2) {
        listbox.style.display = 'none';
        return;
    }

    const matches = searchableItems
        .filter(item => item.searchText.includes(query))
        .slice(0, 6);

    if (matches.length > 0) {
        renderSuggestions(matches, query, listbox);
        listbox.style.display = 'block';
    } else {
        listbox.style.display = 'none';
    }
}

// Renderizar sugerencias
function renderSuggestions(matches, query, listbox) {
    listbox.innerHTML = '';
    matches.forEach(item => {
        const option = document.createElement('div');
        option.className = 'listbox-option';
        option.setAttribute('role', 'option');

        const highlightedText = item.text.replace(
            new RegExp(query, 'gi'),
            match => `<strong>${match}</strong>`
        );

        option.innerHTML = `
            <i class="fas ${item.icon} suggestion-icon"></i>
            <div class="suggestion-text">${highlightedText}</div>
        `;

        option.addEventListener('click', () => selectSuggestion(item, listbox));
        listbox.appendChild(option);
    });
}

// Cargar secciones
function cargarSecciones() {
    // Publicaciones recientes
    const recientes = propiedades
        .filter(p => p.estado === 'Activa')
        .sort((a, b) => new Date(b.fecha_publicacion) - new Date(a.fecha_publicacion));
    renderizarSeccionPropiedades(recientes, 'recentProperties', 
        'Publicaciones más recientes', '/publicaciones-recientes');

    // Casas
    const casas = propiedades
        .filter(p => p.tipo === 'casa' && p.estado === 'Activa');
    renderizarSeccionPropiedades(casas, 'houses', 
        'Busca tu Próxima Casa', '/casas');

    // Departamentos
    const departamentos = propiedades
        .filter(p => p.tipo === 'departamento' && p.estado === 'Activa');
    renderizarSeccionPropiedades(departamentos, 'apartments', 
        'Tu Próximo Depa', '/departamentos');

    // Proyectos 2025
    const proyectos = propiedades
        .filter(p => p.tipo === 'terreno' && new Date(p.fecha_publicacion).getFullYear() === 2025);
    renderizarSeccionPropiedades(proyectos, 'futureProjects', 
        'Proyectos 2025', '/proyectos-2025');

    // Inmobiliarias
    renderizarSeccionInmobiliarias(vendedores, 'agencies');
}

// Renderizar sección de propiedades
function renderizarSeccionPropiedades(propiedades, containerId, titulo, verMasLink) {
    const container = document.getElementById(containerId);
    const elementosPorSlide = 3;
    const maxPropiedades = 5;
    
    const propiedadesLimitadas = propiedades.slice(0, maxPropiedades);
    const totalSlides = Math.ceil((propiedadesLimitadas.length + 1) / elementosPorSlide);
    let currentSlide = 0;

    container.innerHTML = `
        <div class="carousel-container">
            <div class="carousel-header">
                <h2 class="section-title">${titulo}</h2>
                <div class="carousel-controls">
                    <button class="carousel-control prev" disabled>
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <button class="carousel-control next">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
            <div class="carousel-track">
                <div class="carousel-slides" style="transform: translateX(0px);">
                    ${generarSlides(propiedadesLimitadas, verMasLink)}
                </div>
            </div>
        </div>
    `;

    setupCarouselControls(container, elementosPorSlide, totalSlides);
    setupFavoritos(container);
}

// Generar slides
function generarSlides(propiedades, verMasLink) {
    let slides = '';
    const elementosPorSlide = 3;
    
    const cards = [
        ...propiedades.map(prop => generarTarjetaPropiedad(prop)),
        generarTarjetaVerMas(verMasLink)
    ];

    for (let i = 0; i < cards.length; i += elementosPorSlide) {
        const slideCards = cards.slice(i, i + elementosPorSlide).join('');
        slides += `<div class="carousel-slide">${slideCards}</div>`;
    }

    return slides;
}

// Setup controles del carrusel
function setupCarouselControls(container, elementosPorSlide, totalSlides) {
    const track = container.querySelector('.carousel-slides');
    const prevBtn = container.querySelector('.prev');
    const nextBtn = container.querySelector('.next');
    let currentSlide = 0;

    function updateSlidePosition() {
        const slideWidth = container.querySelector('.carousel-slide').offsetWidth;
        track.style.transform = `translateX(-${currentSlide * slideWidth}px)`;
        
        prevBtn.disabled = currentSlide === 0;
        nextBtn.disabled = currentSlide === totalSlides - 1;
    }

    prevBtn.addEventListener('click', () => {
        if (currentSlide > 0) {
            currentSlide--;
            updateSlidePosition();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentSlide < totalSlides - 1) {
            currentSlide++;
            updateSlidePosition();
        }
    });

    // Inicializar posición
    updateSlidePosition();
}

// Generar tarjeta de propiedad
function generarTarjetaPropiedad(propiedad) {
    return `
        <div class="property-card">
            <div class="property-image">
                <img src="${propiedad.imagenes[0]}" alt="${propiedad.titulo}">
                <button class="property-favorite" data-id="${propiedad.id}">
                    <i class="far fa-heart"></i>
                </button>
            </div>
            <div class="property-info">
                <div class="property-price">S/ ${formatearPrecio(propiedad.precio_soles)}</div>
                <div class="property-location">
                    <i class="fas fa-map-marker-alt"></i>
                    ${propiedad.ubicacion}
                </div>
                <div class="property-details">
                    <span><i class="fas fa-ruler-combined"></i> ${propiedad.area_ocupada}m²</span>
                    <span><i class="fas fa-bed"></i> ${propiedad.habitaciones}</span>
                    <span><i class="fas fa-bath"></i> ${propiedad.banos}</span>
                </div>
            </div>
        </div>
    `;
}

// Generar tarjeta "Ver más"
function generarTarjetaVerMas(link) {
    return `
        <div class="property-card view-more-card">
            <a href="${link}" class="view-more-content">
                <i class="fas fa-arrow-right"></i>
                <span>Ver más</span>
            </a>
        </div>
    `;
}

// Renderizar sección de inmobiliarias
function renderizarSeccionInmobiliarias(vendedores, containerId) {
    const container = document.getElementById(containerId);
    const elementosPorSlide = 3;
    const maxVendedores = 5;
    
    const vendedoresLimitados = vendedores.slice(0, maxVendedores);
    const totalSlides = Math.ceil((vendedoresLimitados.length + 1) / elementosPorSlide);

    container.innerHTML = `
        <div class="carousel-container">
            <div class="carousel-header">
                <h2 class="section-title">Inmobiliarias</h2>
                <div class="carousel-controls">
                    <button class="carousel-control prev" disabled>
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <button class="carousel-control next">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
            <div class="carousel-track">
                <div class="carousel-slides">
                    ${generarSlidesInmobiliarias(vendedoresLimitados)}
                </div>
            </div>
        </div>
    `;

    setupCarouselControls(container, elementosPorSlide, totalSlides);
    setupFavoritos(container);
}

// Generar slides para inmobiliarias
function generarSlidesInmobiliarias(vendedores) {
    let slides = '';
    const elementosPorSlide = 3;
    
    const cards = [
        ...vendedores.map(vendedor => `
            <div class="agency-card">
                <button class="property-favorite" data-id="agency-${vendedor.id}">
                    <i class="far fa-heart"></i>
                </button>
                <img src="${vendedor.logo}" alt="${vendedor.nombre}" class="agency-logo">
                <h3 class="agency-name">${vendedor.nombre}</h3>
                <div class="agency-stats">
                    <span class="active-listings">
                        ${contarPropiedadesActivas(vendedor.id)} publicaciones activas
                    </span>
                </div>
            </div>
        `),
        `<div class="agency-card view-more-card">
            <a href="/inmobiliarias" class="view-more-content">
                <i class="fas fa-arrow-right"></i>
                <span>Ver más</span>
            </a>
        </div>`
    ];

    for (let i = 0; i < cards.length; i += elementosPorSlide) {
        const slideCards = cards.slice(i, i + elementosPorSlide).join('');
        slides += `<div class="carousel-slide">${slideCards}</div>`;
    }

    return slides;
}

// Setup de favoritos
function setupFavoritos(container) {
    container.querySelectorAll('.property-favorite').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleFavorito(btn);
        });
    });
}

// Toggle favorito
function toggleFavorito(button) {
    const icon = button.querySelector('i');
    icon.classList.toggle('far');
    icon.classList.toggle('fas');
    icon.classList.toggle('text-danger');
}

// Formatear precio
function formatearPrecio(precio) {
    return parseInt(precio).toLocaleString('es-PE');
}

// Contar propiedades activas
function contarPropiedadesActivas(vendedorId) {
    return propiedades.filter(p => 
        p.id_vendedor === vendedorId && p.estado === 'Activa'
    ).length;
}

// Navegación con teclado en listbox
function handleKeyboardNavigation(event, listbox, searchInput) {
    const options = listbox.querySelectorAll('.listbox-option');
    const activeOption = listbox.querySelector('.listbox-option.active');
    let index = Array.from(options).indexOf(activeOption);

    switch (event.key) {
        case 'ArrowDown':
            event.preventDefault();
            navigateListbox(1, options, index, listbox);
            break;
        case 'ArrowUp':
            event.preventDefault();
            navigateListbox(-1, options, index, listbox);
            break;
        case 'Enter':
            event.preventDefault();
            if (activeOption) {
                const text = activeOption.querySelector('.suggestion-text').textContent;
                searchInput.value = text;
                listbox.style.display = 'none';
            }
            break;
        case 'Escape':
            listbox.style.display = 'none';
            searchInput.blur();
            break;
    }
}

// Navegar por el listbox
function navigateListbox(direction, options, currentIndex, listbox) {
    if (options.length === 0) return;

    options.forEach(opt => opt.classList.remove('active'));

    let newIndex;
    if (currentIndex === -1) {
        newIndex = direction > 0 ? 0 : options.length - 1;
    } else {
        newIndex = (currentIndex + direction + options.length) % options.length;
    }

    options[newIndex].classList.add('active');
    options[newIndex].scrollIntoView({ block: 'nearest' });
}

// Seleccionar sugerencia
function selectSuggestion(item, listbox) {
    const searchInput = document.querySelector('.location-input');
    searchInput.value = item.text;
    listbox.style.display = 'none';
}

// Setup Event Listeners
function setupEventListeners() {
    // Tabs de búsqueda
    const searchTabs = document.querySelectorAll('.search-tab');
    searchTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            searchTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentTab = tab.textContent.toLowerCase().trim();
        });
    });

    // Botón de búsqueda
    const searchButton = document.querySelector('.search-button');
    if (searchButton) {
        searchButton.addEventListener('click', realizarBusqueda);
    }

    // Formulario de búsqueda
    const searchForm = document.querySelector('.search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            realizarBusqueda();
        });
    }
}

// Realizar búsqueda
function realizarBusqueda() {
    const tipoPropiedad = document.querySelector('.property-type').value;
    const ubicacion = document.querySelector('.location-input').value.toLowerCase();
    const tipoOperacion = document.querySelector('.search-tab.active').textContent.toLowerCase();

    const resultados = propiedades.filter(propiedad => {
        const cumpleTipo = !tipoPropiedad || propiedad.tipo === tipoPropiedad;
        const cumpleUbicacion = !ubicacion || 
            propiedad.ubicacion.toLowerCase().includes(ubicacion);
        const cumpleOperacion = true; // Implementar según necesidad

        return cumpleTipo && cumpleUbicacion && cumpleOperacion && propiedad.estado === 'Activa';
    });

    console.log('Resultados de búsqueda:', {
        tipoPropiedad,
        ubicacion,
        tipoOperacion,
        cantidad: resultados.length,
        resultados
    });

    // Aquí puedes implementar la redirección a la página de resultados
    // window.location.href = `/resultados?tipo=${tipoPropiedad}&ubicacion=${encodeURIComponent(ubicacion)}&operacion=${tipoOperacion}`;
}

// Utilidad: Debounce para la búsqueda
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Inicializar carruseles al cambiar el tamaño de la ventana
window.addEventListener('resize', debounce(() => {
    const carousels = document.querySelectorAll('.carousel-container');
    carousels.forEach(carousel => {
        const track = carousel.querySelector('.carousel-slides');
        const currentTransform = track.style.transform;
        const currentSlide = currentTransform ? 
            parseInt(currentTransform.match(/-?\d+/)[0]) / carousel.offsetWidth : 0;
        
        track.style.transform = `translateX(-${currentSlide * carousel.offsetWidth}px)`;
    });
}, 250));

// Función para marcar/desmarcar todos los favoritos
function toggleAllFavorites(containerId, state) {
    const container = document.getElementById(containerId);
    const favButtons = container.querySelectorAll('.property-favorite');
    
    favButtons.forEach(btn => {
        const icon = btn.querySelector('i');
        if (state === 'mark') {
            icon.classList.remove('far');
            icon.classList.add('fas', 'text-danger');
        } else {
            icon.classList.add('far');
            icon.classList.remove('fas', 'text-danger');
        }
    });
}