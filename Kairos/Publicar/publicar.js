// Variables globales
let imageFiles = [];
const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB en bytes

// Configuración de tipos de cambio
const EXCHANGE_RATES = {
    USD_TO_PEN: 3.80,
    PEN_TO_USD: 1 / 3.80
};

// Configuración de API de Google Places
const GOOGLE_PLACES_API_KEY = 'AIzaSyDVuIFw3X4rVHrn6kNUqSpn4utka1p_aSU';

// Función para cargar el script de Google Places
function loadGooglePlacesScript() {
    return new Promise((resolve, reject) => {
        if (window.google && window.google.maps) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_PLACES_API_KEY}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Event Listeners cuando el DOM está cargado
document.addEventListener('DOMContentLoaded', () => {
    setupImageUpload();
    setupFormSubmission();
    setupSearchBar();
    setupCurrencyConversion();
    addLocationAutocompleteStyles();
    setupLocationAutocomplete();
});

// Configuración de la barra de búsqueda
function setupSearchBar() {
    const searchBox = document.querySelector('.search-box');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.querySelector('.search-btn');

    searchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        searchBox.classList.toggle('active');
        if (searchBox.classList.contains('active')) {
            searchInput.focus();
        }
    });

    document.addEventListener('click', (e) => {
        if (!searchBox.contains(e.target)) {
            searchBox.classList.remove('active');
            searchInput.value = '';
        }
    });
}

// Configuración de conversión de moneda
function setupCurrencyConversion() {
    const precioSoles = document.getElementById('precio_soles');
    const precioDolares = document.getElementById('precio_dolares');
    
    // Manejar input en soles
    precioSoles.addEventListener('input', function(e) {
        // Obtener solo los números del input
        let value = e.target.value.replace(/[^\d]/g, '');
        e.target.value = value;
        
        // Convertir a dólares si hay un valor
        if (value) {
            convertCurrency('soles');
        } else {
            precioDolares.value = '';
        }
    });
    
    // Manejar input en dólares
    precioDolares.addEventListener('input', function(e) {
        // Obtener solo los números del input
        let value = e.target.value.replace(/[^\d]/g, '');
        e.target.value = value;
        
        // Convertir a soles si hay un valor
        if (value) {
            convertCurrency('dolares');
        } else {
            precioSoles.value = '';
        }
    });
}

// Función de conversión de moneda
function convertCurrency(sourceField) {
    const precioSoles = document.getElementById('precio_soles');
    const precioDolares = document.getElementById('precio_dolares');

    if (sourceField === 'soles') {
        const valorSoles = parseInt(precioSoles.value) || 0;
        if (valorSoles > 0) {
            const valorDolares = Math.ceil(valorSoles * EXCHANGE_RATES.PEN_TO_USD);
            precioDolares.value = valorDolares;
        }
    } else if (sourceField === 'dolares') {
        const valorDolares = parseInt(precioDolares.value) || 0;
        if (valorDolares > 0) {
            const valorSoles = Math.ceil(valorDolares * EXCHANGE_RATES.USD_TO_PEN);
            precioSoles.value = valorSoles;
        }
    }
}

// Configuración de autocompletado de ubicación
async function setupLocationAutocomplete() {
    try {
        await loadGooglePlacesScript();

        const ubicacionInput = document.getElementById('ubicacion');
        
        let suggestionsContainer = document.querySelector('.location-suggestions');
        if (!suggestionsContainer) {
            suggestionsContainer = document.createElement('div');
            suggestionsContainer.className = 'location-suggestions';
            ubicacionInput.parentNode.insertBefore(suggestionsContainer, ubicacionInput.nextSibling);
        }

        const service = new google.maps.places.AutocompleteService();

        ubicacionInput.addEventListener('input', async (e) => {
            const query = e.target.value.trim();
            
            if (query.length === 0) {
                suggestionsContainer.innerHTML = '';
                suggestionsContainer.style.display = 'none';
                return;
            }

            try {
                const predictions = await getPredictions(service, query);
                displaySuggestions(predictions.slice(0, 3), suggestionsContainer, ubicacionInput);
            } catch (error) {
                console.error('Error getting predictions:', error);
            }
        });

        document.addEventListener('click', (e) => {
            if (!ubicacionInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
                suggestionsContainer.style.display = 'none';
            }
        });

    } catch (error) {
        console.error('Error setting up location autocomplete:', error);
    }
}

// Función para obtener predicciones de lugares
function getPredictions(service, query) {
    return new Promise((resolve, reject) => {
        service.getPlacePredictions({
            input: query,
            types: ['(cities)'],
            componentRestrictions: { country: 'pe' }
        }, (predictions, status) => {
            if (status !== google.maps.places.PlacesServiceStatus.OK) {
                resolve([]);
                return;
            }
            resolve(predictions || []);
        });
    });
}

// Función para mostrar sugerencias
function displaySuggestions(predictions, container, input) {
    container.innerHTML = '';
    
    if (predictions.length === 0) {
        container.style.display = 'none';
        return;
    }

    predictions.forEach(prediction => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.textContent = formatPrediction(prediction);
        
        div.addEventListener('click', () => {
            input.value = formatPrediction(prediction);
            container.style.display = 'none';
        });

        container.appendChild(div);
    });

    container.style.display = 'block';
}

// Función para formatear la predicción
function formatPrediction(prediction) {
    const parts = prediction.description.split(', ');
    const city = parts[0];
    const region = parts[1] || '';
    const country = parts[parts.length - 1];
    
    return `${city}${region ? `, ${region}` : ''}, ${country}`;
}

// Añadir estilos para autocompletado
function addLocationAutocompleteStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .location-suggestions {
            position: absolute;
            width: 100%;
            max-height: 200px;
            overflow-y: auto;
            background: white;
            border: 1px solid var(--border-color);
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 1000;
            display: none;
        }

        .suggestion-item {
            padding: 10px;
            cursor: pointer;
            border-bottom: 1px solid var(--border-color);
        }

        .suggestion-item:last-child {
            border-bottom: none;
        }

        .suggestion-item:hover {
            background-color: var(--background-color);
        }
    `;
    document.head.appendChild(style);
}

// Configuración de carga de imágenes
function setupImageUpload() {
    const uploadBtn = document.getElementById('uploadBtn');
    const imageInput = document.getElementById('imagenes');
    const previewContainer = document.getElementById('imagePreview');

    uploadBtn.addEventListener('click', () => imageInput.click());

    imageInput.addEventListener('change', () => {
        const files = Array.from(imageInput.files);
        
        if (imageFiles.length + files.length > MAX_IMAGES) {
            showError(`Máximo ${MAX_IMAGES} imágenes permitidas`);
            return;
        }

        files.forEach(file => {
            if (!file.type.startsWith('image/')) {
                showError(`${file.name} no es una imagen válida`);
                return;
            }

            if (file.size > MAX_FILE_SIZE) {
                showError(`${file.name} excede el tamaño máximo de 5MB`);
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = createImagePreview(e.target.result, file);
                previewContainer.appendChild(preview);
            };
            reader.readAsDataURL(file);

            imageFiles.push(file);
        });

        if (imageFiles.length >= MAX_IMAGES) {
            imageInput.disabled = true;
            uploadBtn.disabled = true;
        }
    });
}

// Crear preview de imagen
function createImagePreview(src, file) {
    const wrapper = document.createElement('div');
    wrapper.className = 'image-preview';

    const img = document.createElement('img');
    img.src = src;
    img.alt = file.name;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
    removeBtn.onclick = () => removeImage(wrapper, file);

    wrapper.appendChild(img);
    wrapper.appendChild(removeBtn);
    return wrapper;
}

// Remover imagen
function removeImage(previewElement, file) {
    imageFiles = imageFiles.filter(f => f !== file);
    previewElement.remove();
    
    const imageInput = document.getElementById('imagenes');
    const uploadBtn = document.getElementById('uploadBtn');
    
    imageInput.disabled = false;
    uploadBtn.disabled = false;
    imageInput.value = '';
}

// Configuración del envío del formulario
function setupFormSubmission() {
    const form = document.getElementById('propiedadForm');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!validateForm()) return;

        const formData = new FormData(form);
        const propertyData = await preparePropertyData(formData);

        try {
            await saveProperty(propertyData);
            showSuccess('Propiedad publicada exitosamente');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        } catch (error) {
            showError('Error al publicar la propiedad: ' + error.message);
        }
    });
}

// Validación del formulario
function validateForm() {
    const requiredFields = [
        'titulo', 'precio_soles', 'precio_dolares', 'ubicacion',
        'mapa_direccion', 'area_ocupada', 'area_techada',
        'habitaciones', 'banos', 'antiguedad', 'proyeccion_aerea',
        'descripcion_corta'
    ];

    let isValid = true;

    requiredFields.forEach(field => {
        const input = document.getElementById(field);
        if (!input.value.trim()) {
            showFieldError(input, 'Este campo es requerido');
            isValid = false;
        } else {
            clearFieldError(input);
        }
    });

    if (imageFiles.length === 0) {
        showError('Debe subir al menos una imagen');
        isValid = false;
    }

    const lugaresSeleccionados = document.querySelectorAll('input[name="lugares_cercanos"]:checked');
    const serviciosSeleccionados = document.querySelectorAll('input[name="servicios_basicos"]:checked');

    if (lugaresSeleccionados.length === 0) {
        showError('Debe seleccionar al menos un lugar cercano');
        isValid = false;
    }

    if (serviciosSeleccionados.length === 0) {
        showError('Debe seleccionar al menos un servicio básico');
        isValid = false;
    }

    return isValid;
}

// Preparar datos de la propiedad
async function preparePropertyData(formData) {
    const imageUrls = await uploadImagesToServer(imageFiles);

    const lugaresCercanos = Array.from(document.querySelectorAll('input[name="lugares_cercanos"]:checked'))
        .map(input => input.value);

    const serviciosBasicos = Array.from(document.querySelectorAll('input[name="servicios_basicos"]:checked'))
        .map(input => input.value);

    return {
        id: Date.now(),
        titulo: formData.get('titulo'),
        descripcion_corta: formData.get('descripcion_corta'),
        ubicacion: formData.get('ubicacion'),
        precio_soles: formData.get('precio_soles').replace(/,/g, ''),
        precio_dolares: formData.get('precio_dolares').replace(/,/g, ''),
        imagenes: imageUrls,
        mapa_direccion: formData.get('mapa_direccion'),
        area_ocupada: formData.get('area_ocupada'),
        area_techada: formData.get('area_techada'),
        habitaciones: formData.get('habitaciones'),
        banos: formData.get('banos'),
        estacionamiento: formData.get('estacionamiento') === 'on',
        antiguedad: formData.get('antiguedad'),
        proyeccion_aerea: formData.get('proyeccion_aerea'),
        areas_verdes: formData.get('areas_verdes') || null,
        fecha_publicacion: new Date().toISOString().split('T')[0],
        estado: 'Activa',
        id_vendedor: 1,
        lugares_cercanos: lugaresCercanos,
        servicios_basicos: serviciosBasicos
    };
}

// Subir imágenes al servidor
async function uploadImagesToServer(files) {
    // Simulación de URLs para las imágenes
    return files.map(file => `https://drive.google.com/uc?id=${Date.now()}-${file.name}`);
}

// Guardar propiedad en el JSON
async function saveProperty(propertyData) {
    try {
        const response = await fetch('propiedades.json');
        const data = await response.json();
        
        data.propiedades.push(propertyData);

        // Aquí implementarías la lógica para guardar en el archivo
        console.log('Nueva propiedad a guardar:', propertyData);
        
        return propertyData;
    } catch (error) {
        throw new Error('Error al guardar la propiedad');
    }
}

// Funciones de utilidad para mensajes
function showError(message) {
    const toast = createToast(message, 'error');
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function showSuccess(message) {
    const toast = createToast(message, 'success');
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function showFieldError(input, message) {
    const errorDiv = input.parentElement.querySelector('.error-message') ||
        createElement('div', { className: 'error-message' });
    errorDiv.textContent = message;
    input.parentElement.appendChild(errorDiv);
    input.classList.add('error');
}

function clearFieldError(input) {
    const errorDiv = input.parentElement.querySelector('.error-message');
    if (errorDiv) errorDiv.remove();
    input.classList.remove('error');
}

function createToast(message, type) {
    const toast = createElement('div', {
        className: `toast toast-${type}`,
        textContent: message
    });
    return toast;
}

function createElement(tag, options = {}) {
    const element = document.createElement(tag);
    Object.assign(element, options);
    return element;
}