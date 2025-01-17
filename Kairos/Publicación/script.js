// Variables globales
let map;
let lastScroll = 0;

document.addEventListener('DOMContentLoaded', () => {
    inicializar();
    setupActionButtons();
    setupNavigationButtons();
    setupScrollHeader();
});

// Inicialización principal
async function inicializar() {
    try {
        const [propiedad, vendedor] = await cargarDatos();
        renderizarPropiedad(propiedad);
        renderizarMapa(propiedad.mapa_direccion);
        renderizarInfoVendedor(vendedor);
    } catch (error) {
        console.error("Error en la inicialización:", error);
        mostrarMensaje("Ocurrió un error al cargar o mostrar los datos.");
    }
}

// Configuración del header con scroll
function setupScrollHeader() {
    const header = document.querySelector('header');
    const main = document.querySelector('main');

    main.addEventListener('scroll', () => {
        const currentScroll = main.scrollTop;
        
        if (currentScroll > lastScroll && currentScroll > 100) {
            // Scrolling down
            header.classList.add('header-hidden');
        } else {
            // Scrolling up
            header.classList.remove('header-hidden');
        }
        
        lastScroll = currentScroll;
    });
}

// Configuración de botones de acción
function setupActionButtons() {
    const favoritoBtn = document.querySelector('.favorito');
    const compartirBtn = document.querySelector('.compartir');
    let isFavorite = false;

    favoritoBtn.addEventListener('click', () => {
        isFavorite = !isFavorite;
        favoritoBtn.classList.toggle('active');
        
        const icon = favoritoBtn.querySelector('i');
        icon.style.color = isFavorite ? '#E74C3C' : '#333';
        mostrarMensaje(isFavorite ? "Añadido a favoritos" : "Eliminado de favoritos");
    });

    compartirBtn.addEventListener('click', async () => {
        compartirBtn.classList.add('active');
        
        setTimeout(() => {
            compartirBtn.classList.remove('active');
        }, 200);

        if (navigator.share) {
            try {
                await navigator.share({
                    title: document.getElementById('titulo').textContent,
                    text: document.getElementById('descripcion-corta').textContent,
                    url: window.location.href
                });
            } catch (error) {
                console.error('Error al compartir:', error);
                copiarAlPortapapeles();
            }
        } else {
            copiarAlPortapapeles();
        }
    });
}

// Copiar al portapapeles
async function copiarAlPortapapeles() {
    try {
        await navigator.clipboard.writeText(window.location.href);
        mostrarMensaje("¡Enlace copiado al portapapeles!");
    } catch (error) {
        console.error('Error al copiar:', error);
        mostrarMensaje("No se pudo copiar el enlace");
    }
}

// Configuración de botones de navegación
function setupNavigationButtons() {
    const verMasBtn = document.getElementById('ver-mas');
    const caracteristicasAdicionales = document.getElementById('caracteristicas-adicionales');
    const caracteristicasPrincipales = document.querySelector('.caracteristicas-container.principales');

    if (verMasBtn && caracteristicasAdicionales) {
        verMasBtn.addEventListener('click', () => {
            caracteristicasAdicionales.classList.toggle('visible');
            caracteristicasPrincipales.classList.toggle('compacto');
            verMasBtn.textContent = caracteristicasAdicionales.classList.contains('visible') ? 'Ver menos' : 'Ver todo';
        });
    }

    // Configurar navegación suave
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Cargar datos
async function cargarDatos() {
    try {
        const [propiedadesData, vendedoresData] = await Promise.all([
            fetch('propiedades.json').then(res => res.json()),
            fetch('vendedores.json').then(res => res.json())
        ]);

        if (!propiedadesData?.propiedades || !Array.isArray(propiedadesData.propiedades)) {
            throw new Error("Estructura de propiedades.json incorrecta.");
        }

        if (!vendedoresData?.vendedores || !Array.isArray(vendedoresData.vendedores)) {
            throw new Error("Estructura de vendedores.json incorrecta.");
        }

        const propiedad = propiedadesData.propiedades.find(p => p.id === 3);
        if (!propiedad) {
            throw new Error("No se encontró la propiedad especificada.");
        }

        const vendedor = vendedoresData.vendedores.find(v => v.id === propiedad.id_vendedor);
        if (!vendedor) {
            throw new Error(`No se encontró el vendedor con ID ${propiedad.id_vendedor}.`);
        }

        return [propiedad, vendedor];
    } catch (error) {
        console.error("Error en cargarDatos:", error);
        throw error;
    }
}

// Renderizar propiedad
function renderizarPropiedad(propiedad) {
    const elementos = {
        'titulo': propiedad.titulo || "",
        'descripcion-corta': propiedad.descripcion_corta || "",
        'ubicacion': propiedad.ubicacion || "",
        'precio-soles': propiedad.precio_soles || "",
        'precio-dolares': propiedad.precio_dolares || "",
        'area-ocupada': propiedad.area_ocupada || "",
        'area-techada': propiedad.area_techada || "",
        'habitaciones': propiedad.habitaciones || "",
        'banos': propiedad.banos || ""
    };

    Object.entries(elementos).forEach(([id, valor]) => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = valor;
    });

    document.getElementById('estacionamiento-texto').textContent = 
        propiedad.estacionamiento ? "Cuenta con estacionamiento" : "No cuenta con estacionamiento";

    document.getElementById('antiguedad').textContent = propiedad.antiguedad || "";
    document.getElementById('proyeccion-aerea').textContent = propiedad.proyeccion_aerea || "";
    document.getElementById('areas-verdes-texto').textContent = 
        propiedad.areas_verdes ? `${propiedad.areas_verdes} m²` : "No tiene áreas verdes";

    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(propiedad.mapa_direccion)}`;
    document.getElementById('ver-en-maps').href = mapsUrl;

    renderizarCarrusel(propiedad.imagenes);
}

// Renderizar mapa
function renderizarMapa(direccion) {
    if (!direccion) {
        document.getElementById('map').innerHTML = "<p>Dirección no disponible</p>";
        return;
    }

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ 'address': direccion }, (results, status) => {
        if (status === 'OK') {
            const mapOptions = {
                center: results[0].geometry.location,
                zoom: 15,
                styles: [
                    {
                        featureType: "all",
                        elementType: "all",
                        stylers: [
                            { saturation: -100 }
                        ]
                    }
                ]
            };

            map = new google.maps.Map(document.getElementById("map"), mapOptions);

            new google.maps.Marker({
                map: map,
                position: results[0].geometry.location,
                animation: google.maps.Animation.DROP
            });
        } else {
            console.error('Geocode error:', status);
            document.getElementById('map').innerHTML = `<p>No se pudo cargar el mapa para la dirección: ${direccion}</p>`;
        }
    });
}

// Renderizar información del vendedor
function renderizarInfoVendedor(vendedor) {
    if (!vendedor) return;

    document.getElementById('nombre-vendedor-titulo').textContent = vendedor.nombre || "";
    
    const logoVendedor = document.getElementById('logo-vendedor');
    if (logoVendedor) {
        logoVendedor.src = vendedor.logo || "placeholder.jpg";
        logoVendedor.alt = `Logo de ${vendedor.nombre || "vendedor"}`;
    }

    const enlaces = {
        'facebook-link': vendedor.facebook ? `https://facebook.com/${vendedor.facebook}` : null,
        'instagram-link': vendedor.instagram ? `https://instagram.com/${vendedor.instagram}` : null,
        'twitter-link': vendedor.twitter ? `https://twitter.com/${vendedor.twitter}` : null,
        'telefono-link': vendedor.telefono ? `tel:${vendedor.telefono}` : null,
        'whatsapp-link': vendedor.whatsapp ? `https://wa.me/${vendedor.whatsapp}` : null
    };

    Object.entries(enlaces).forEach(([id, url]) => {
        const elemento = document.getElementById(id);
        if (elemento) {
            if (url) {
                elemento.href = url;
                elemento.style.display = 'block';
            } else {
                elemento.style.display = 'none';
            }
        }
    });
}

// Renderizar carrusel
function renderizarCarrusel(imagenes) {
    if (!Array.isArray(imagenes) || imagenes.length === 0) {
        console.error("No hay imágenes para mostrar en el carrusel");
        return;
    }

    const carouselInner = document.querySelector('.carousel-inner');
    const carouselIndicators = document.querySelector('.carousel-indicators');

    carouselInner.innerHTML = '';
    carouselIndicators.innerHTML = '';

    imagenes.forEach((imagen, index) => {
        const indicatorButton = document.createElement('button');
        indicatorButton.type = "button";
        indicatorButton.dataset.bsTarget = "#carouselExampleIndicators";
        indicatorButton.dataset.bsSlideTo = index;
        indicatorButton.setAttribute('aria-label', `Slide ${index + 1}`);
        
        if (index === 0) {
            indicatorButton.classList.add('active');
            indicatorButton.setAttribute('aria-current', 'true');
        }
        
        carouselIndicators.appendChild(indicatorButton);

        const carouselItem = document.createElement('div');
        carouselItem.classList.add('carousel-item');
        if (index === 0) carouselItem.classList.add('active');

        const img = document.createElement('img');
        img.src = imagen;
        img.classList.add('d-block', 'w-100');
        img.alt = `Imagen ${index + 1} de la propiedad`;
        img.loading = 'lazy';

        carouselItem.appendChild(img);
        carouselInner.appendChild(carouselItem);
    });
}

// Mostrar mensaje
function mostrarMensaje(mensaje, tipo = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.textContent = mensaje;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    });
}

// Función de inicialización para Google Maps
function initMap() {
    // Esta función será llamada por la API de Google Maps
}