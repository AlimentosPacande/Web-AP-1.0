// =======================================================
// SECCIÓN 1: EJECUCIÓN INICIAL (OPTIMIZADA)
// =======================================================

/**
 * Inicializa configuraciones rápidas (menús, desplazamiento, etc.).
 */
function inicializarConfiguracionesRapidas() {
    configurarMenu(); // Configuración inicial del menú
    configurarDesplazamientoGeneral(); // Ajustes de desplazamiento general
    configurarDesplazamientoCategorias(); // Ajustes para submenú de categorías
    configurarDesplazamientoTienda(); // Ajustes para la sección de tienda
}

/**
 * Procesa tareas pesadas como cargar datos desde archivos Excel de manera diferida.
 */
function inicializarTareasPesadas() {
    setTimeout(() => {
        cargarProductosEnBloques(); // Procesar productos en bloques
        cargarEnlacesExternos(); // Cargar enlaces externos
    }, 0); // Diferido al siguiente ciclo de eventos
}

/**
 * Divide el procesamiento de productos en bloques para evitar el bloqueo del hilo principal.
 */
async function cargarProductosEnBloques() {
    const archivo = './data/catalogo.xlsx'; // Ruta del archivo Excel

    try {
        const response = await fetch(archivo);
        if (!response.ok) throw new Error("No se pudo cargar el archivo Excel.");

        const data = await response.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const hoja = workbook.Sheets[workbook.SheetNames[0]];
        if (!hoja) throw new Error("El archivo Excel no contiene datos válidos.");

        const productos = XLSX.utils.sheet_to_json(hoja);
        procesarEnBloques(productos, 50, (bloque) => {
            renderProductosDestacados(bloque);
            renderCategorias(bloque);
        }, () => {
            generarSubmenuCategorias(productos);
            console.log("Todos los productos procesados.");
        });
    } catch (error) {
        console.error("Error al cargar el catálogo de productos:", error);
    }
}

/**
 * Procesa datos en bloques para evitar bloqueo del hilo principal.
 * @param {Array} datos - Datos a procesar.
 * @param {number} tamanoBloque - Tamaño de cada bloque.
 * @param {Function} procesarBloque - Función para procesar cada bloque.
 * @param {Function} finalizado - Función a ejecutar cuando se procesen todos los bloques.
 */
function procesarEnBloques(datos, tamanoBloque, procesarBloque, finalizado) {
    let indice = 0;

    function siguienteBloque() {
        const bloque = datos.slice(indice, indice + tamanoBloque);
        procesarBloque(bloque);
        indice += tamanoBloque;

        if (indice < datos.length) {
            requestAnimationFrame(siguienteBloque); // Liberar el hilo principal de manera más eficiente
        } else if (finalizado) {
            finalizado();
        }
    }

    siguienteBloque();
}




// =======================================================
// FUNCIÓN GENÉRICA: DEBOUNCE
// =======================================================

/**
 * Limita la frecuencia de ejecución de una función al ser llamada repetidamente.
 * @param {Function} func - Función a ser controlada.
 * @param {number} delay - Tiempo en milisegundos para retrasar la ejecución.
 * @returns {Function} - Función optimizada.
 */
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// =======================================================
// SECCIÓN 2: INTEGRACIÓN DE ENLACES DE TIENDAS EN EL MENÚ
// =======================================================

/**
 * Carga los enlaces de tiendas desde un archivo Excel y los integra dinámicamente en el menú principal.
 */
async function integrarEnlacesTiendaEnMenu() {
    const archivo = './data/enlaces_externos.xlsx'; // Ruta del archivo Excel
    const submenuTienda = document.getElementById('submenu-categorias'); // ID del contenedor de enlaces

    if (!submenuTienda) {
        console.warn("El contenedor 'submenu-categorias' no existe en el DOM.");
        return;
    }

    try {
        // Cargar el archivo Excel
        const response = await fetch(archivo);
        if (!response.ok) {
            throw new Error("No se pudo cargar el archivo Excel.");
        }

        const data = await response.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const hoja = workbook.Sheets[workbook.SheetNames[0]];
        if (!hoja) {
            throw new Error("El archivo Excel no contiene datos válidos.");
        }

        const enlaces = XLSX.utils.sheet_to_json(hoja);

        // Filtrar enlaces activos de la categoría "Tienda" (ignorar mayúsculas/minúsculas)
        const tiendas = enlaces.filter(enlace =>
            enlace.CATEGORÍA?.trim().toLowerCase() === "tienda" &&
            enlace.ESTADO?.trim().toLowerCase() === "activo"
        );

        if (tiendas.length === 0) {
            submenuTienda.innerHTML = `
                <li>
                    <p class="dropdown-item text-center text-muted">No hay tiendas disponibles.</p>
                </li>`;
            return;
        }

        // Crear enlaces dinámicos solo con datos válidos (NOMBRE y URL no vacíos)
        const html = tiendas.map(tienda => {
            if (!tienda.NOMBRE?.trim() || !tienda.URL?.trim()) {
                console.warn(`Tienda con datos incompletos encontrada: ${JSON.stringify(tienda)}`);
                return '';
            }

            return `
                <li>
                    <a class="dropdown-item" href="${tienda.URL.trim()}" target="_blank">
                        ${tienda.NOMBRE.trim()}
                    </a>
                </li>`;
        }).join('');

        // Insertar el HTML generado en el menú
        submenuTienda.innerHTML = html;

    } catch (error) {
        console.error("Error al integrar los enlaces de la tienda en el menú:", error);

        // Mostrar mensaje de error en el menú
        submenuTienda.innerHTML = `
            <li>
                <p class="dropdown-item text-center text-danger">Error al cargar las tiendas.</p>
            </li>`;
    }
}

// =======================================================
// SECCIÓN 3: MENÚ
// =======================================================

/**
 * Configura el comportamiento del menú principal y los logos.
 */
function configurarMenu() {
    const navbar = document.querySelector('.navbar');
    const logoGrande = document.querySelector('.logo-grande'); // Referencia al único logo
    const navLinks = document.querySelectorAll('.nav-link');
    const dropdownMenus = document.querySelectorAll('.dropdown-menu');

    if (!navbar || !logoGrande || navLinks.length === 0) {
        console.warn("El menú principal, el logo o los enlaces no existen en el DOM.");
        return;
    }

    // Cambiar estilo al hacer scroll
    const manejarScroll = () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    };
    window.addEventListener('scroll', manejarScroll);

    // Cambiar los textos del menú según el tamaño de pantalla
    const ajustarTextosMenu = () => {
        const anchoPantalla = window.innerWidth;

        navLinks.forEach((link) => {
            // Ignorar enlaces específicos como "Tienda"
            if (link.classList.contains('tienda-link')) {
                return;
            }

            const fullText = link.getAttribute('data-full');
            const shortText = link.getAttribute('data-short');

            // Si los atributos no existen, deja el texto original del enlace
            if (!fullText || !shortText) {
                return; // Sin advertencia
            }

            // Cambiar el texto dependiendo del tamaño de pantalla
            link.textContent = anchoPantalla <= 425 ? shortText : fullText;
        });
    };

    // Ajustar comportamiento de dropdowns en móviles
    const ajustarDropdowns = () => {
        dropdownMenus.forEach((menu) => {
            const parent = menu.closest('.dropdown');
            if (!parent) return;

            parent.addEventListener('show.bs.dropdown', () => {
                if (window.innerWidth <= 425) {
                    parent.style.position = 'static'; // Evitar que el dropdown afecte la altura del navbar
                }
            });

            parent.addEventListener('hide.bs.dropdown', () => {
                if (window.innerWidth <= 425) {
                    parent.style.position = ''; // Restaurar posición original
                }
            });
        });
    };

    // Ejecutar ajustes al cargar y redimensionar
    const ejecutarAjustes = () => {
        ajustarTextosMenu();
        ajustarDropdowns();
    };

    ejecutarAjustes();

    window.addEventListener('resize', debounce(ejecutarAjustes, 200));
}


// =======================================================
// SECCIÓN 4: SUBMENÚ
// =======================================================

/**
 * Genera dinámicamente el submenú de categorías basado en los productos activos.
 * @param {Array} productos - Lista de productos obtenidos del catálogo Excel.
 */
function generarSubmenuCategorias(productos) {
    const submenu = document.getElementById('submenu-categorias');
    if (!submenu) {
        console.warn("El submenú 'submenu-categorias' no existe en el DOM.");
        return;
    }

    const categorias = [...new Set(
        productos
            .filter(producto => producto.ESTADO?.toLowerCase() === "activo")
            .map(producto => producto.CATEGORIA?.trim() || "Sin Categoría")
    )];

    if (categorias.length === 0) {
        submenu.innerHTML = `<li><p class="dropdown-item text-center">No hay categorías disponibles</p></li>`;
        return;
    }

    submenu.innerHTML = categorias.map(categoria => {
        const idCategoria = categoria.replace(/\s+/g, '-').toLowerCase();
        return `<li><a class="dropdown-item" href="#${idCategoria}">${categoria}</a></li>`;
    }).join('');
}


/**
 * Carga el catálogo de productos y genera el submenú dinámico.
 */
async function cargarCatalogoYGenerarSubmenu() {
    const archivo = './data/catalogo.xlsx'; // Ruta del archivo Excel

    try {
        // Cargar datos del archivo Excel
        const response = await fetch(archivo);
        if (!response.ok) {
            throw new Error(`No se pudo cargar el archivo: ${archivo}`);
        }

        const data = await response.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const hoja = workbook.Sheets[workbook.SheetNames[0]];

        if (!hoja) {
            throw new Error("El archivo Excel no contiene hojas válidas.");
        }

        const productos = XLSX.utils.sheet_to_json(hoja);

        if (!productos || productos.length === 0) {
            throw new Error("El archivo Excel está vacío o no contiene datos utilizables.");
        }

        // Generar submenú con las categorías activas
        generarSubmenuCategorias(productos);

    } catch (error) {
        console.error("Error al cargar el catálogo de productos:", error);

        const submenu = document.getElementById('submenu-categorias');
        if (submenu) {
            submenu.innerHTML = `<li><p class="dropdown-item text-danger">Error al cargar las categorías.</p></li>`;
        }
    }
}


// =======================================================
// SECCIÓN 5: BANNERS PUBLICITARIOS
// =======================================================

/**
 * Configuración inicial y funcionalidad de los banners publicitarios.
 * Por ahora, los banners son gestionados estáticamente en el HTML.
 */

// Si necesitas implementar alguna funcionalidad adicional para los banners, se agregaría aquí.


// Renderizado y funcionalidad de los banners iniciales
// Esta sección asume que los banners iniciales ya están gestionados y no requiere código adicional aquí.


// =======================================================
// SECCIÓN 4: CARGA DE DATOS DESDE ARCHIVOS EXCEL (CORREGIDO Y OPTIMIZADO)
// =======================================================

/**
 * Función para cargar y procesar el catálogo de productos desde un archivo Excel.
 */
async function cargarProductos() {
    const archivo = './data/catalogo.xlsx'; // Ruta del archivo Excel
    try {
        // Fetch del archivo Excel
        const response = await fetch(archivo);
        if (!response.ok) throw new Error(`Error al cargar el archivo: ${archivo}`);

        // Leer datos como ArrayBuffer y procesarlos con SheetJS
        const data = await response.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const hoja = workbook.Sheets[workbook.SheetNames[0]];

        if (!hoja) throw new Error("El archivo Excel no contiene hojas válidas.");

        // Convertir los datos en un array JSON
        const productos = XLSX.utils.sheet_to_json(hoja);

        // Validar columnas requeridas en los datos
        if (!productos.every(producto => 'PRECIO' in producto && 'PRECIO_DESCUENTO' in producto)) {
            throw new Error("Faltan columnas requeridas como PRECIO o PRECIO_DESCUENTO en el archivo.");
        }

        // Procesar productos en bloques para evitar bloquear el hilo principal
        procesarEnBloques(productos, 100, (bloque) => {
            renderProductosDestacados(bloque);
            renderCategorias(bloque);
        }, () => {
            generarSubmenuCategorias(productos);
            console.log("Todos los productos se procesaron correctamente.");
        });

    } catch (error) {
        // Manejo de errores específicos para cada sección
        manejarErrorCarga(error, 'productosDestacadosGrid', "Error al cargar los productos destacados.");
        manejarErrorCarga(error, 'categoriasContainer', "Error al cargar las categorías.");
        manejarErrorCarga(error, 'submenu-categorias', "No se encontraron categorías disponibles.");
    }
}


/**
 * Renderiza dinámicamente las categorías y productos desde el archivo Excel.
 * @param {Array} productos - Lista de productos obtenidos del catálogo.
 */
function renderCategorias(productos) {
    const contenedorCategorias = document.getElementById('categoriasContainer');

    if (!contenedorCategorias) {
        console.warn("El contenedor 'categoriasContainer' no existe en el DOM.");
        return;
    }

    // Agrupar productos por categoría
    const categoriasAgrupadas = productos.reduce((categorias, producto) => {
        if (producto.ESTADO?.toLowerCase() === "activo") {
            const categoriaLimpia = producto.CATEGORIA?.trim() || "Sin Categoría";
            categorias[categoriaLimpia] = categorias[categoriaLimpia] || [];
            categorias[categoriaLimpia].push(producto);
        }
        return categorias;
    }, {});

    if (Object.keys(categoriasAgrupadas).length === 0) {
        mostrarErrorEnSeccion('categoriasContainer', "No hay categorías disponibles en este momento.");
        return;
    }

    // Generar el HTML para las categorías y sus productos
    const html = Object.entries(categoriasAgrupadas).map(([categoria, productos]) => {
        const idCategoria = categoria.replace(/\s+/g, '-').toLowerCase();

        const productosHtml = productos.map(producto => {
            const enOferta = producto['¿OFERTA?']?.toLowerCase() === "sí";
            const precioOriginal = parseFloat(producto.PRECIO) || 0;
            const precioConDescuento = parseFloat(producto.PRECIO_DESCUENTO) || precioOriginal;
            const comentarioOferta = producto.COMENTARIO_OFERTA || '';

            // HTML del precio
            const precioHtml = enOferta
                ? `<div class="precio-contenedor d-flex align-items-baseline gap-2">
                       <span class="precio-original">$${precioOriginal.toLocaleString()}</span>
                       <span class="precio-descuento">$${precioConDescuento.toLocaleString()}</span>
                   </div>`
                : `<p class="text-success fw-bold">$${precioOriginal.toLocaleString()}</p>`;

            // HTML del comentario de oferta
            const comentarioHtml = comentarioOferta
                ? `<p class="comentario-oferta text-success">${comentarioOferta}</p>`
                : '';

            // Generar el HTML del producto
            const botonHtml = producto.LINK_COMPRA
                ? `<a href="${producto.LINK_COMPRA}" target="_blank" class="btn btn-primary">
                       ${enOferta ? 'Comprar Oferta' : 'Comprar'}
                   </a>`
                : `<button class="btn btn-secondary" disabled>Sin enlace disponible</button>`;

            return `
                <div class="col-md-3 categoria-item">
                    <img src="./data/tienda/${producto.IMAGEN || 'default.jpg'}" 
                         alt="${producto.NOMBRE_PRODUCTO || 'Producto sin nombre'}" 
                         class="img-fluid rounded" 
                         onerror="this.src='./data/tienda/default.jpg';">
                    <h5 class="mt-2">${producto.NOMBRE_PRODUCTO || 'Producto sin nombre'}</h5>
                    <p class="text-muted">${producto.DESCRIPCION || 'Sin descripción disponible'}</p>
                    ${comentarioHtml}
                    ${precioHtml}
                    <div class="btn-container">${botonHtml}</div>
                </div>`;
        }).join('');

        return `
            <div class="categoria-section mb-5" id="${idCategoria}">
                <h3 class="text-primary">${categoria}</h3>
                <div class="categoria-grid row">
                    ${productosHtml}
                </div>
            </div>`;
    }).join('');

    contenedorCategorias.innerHTML = html;
}


function mostrarErrorEnSeccion(idSeccion, mensaje) {
    const contenedor = document.getElementById(idSeccion);
    if (contenedor) {
        contenedor.innerHTML = `
            <div class="text-center alert alert-warning">
                <p>${mensaje}</p>
            </div>`;
    }
}
// =======================================================
// SECCIÓN 5: PRODUCTOS (CORREGIDO Y OPTIMIZADO)
// =======================================================

/**
 * Renderiza los productos destacados en la sección correspondiente.
 * @param {Array} productos - Lista de productos obtenidos del archivo Excel.
 */
function renderProductosDestacados(productos) {
    const contenedor = document.getElementById('productosDestacadosGrid');
    if (!contenedor) {
        console.warn("El contenedor para productos destacados no existe en el DOM.");
        return;
    }

    // Filtrar productos destacados
    const destacados = productos.filter(
        producto => producto.ESTADO?.toLowerCase() === "activo" && producto.DESTACADO?.toLowerCase() === "sí"
    );

    if (destacados.length === 0) {
        mostrarErrorEnSeccion('productosDestacadosGrid', "No hay productos destacados disponibles en este momento.");
        return;
    }

    // Generar HTML para productos destacados
    const html = destacados.map(producto => {
        const enOferta = producto['¿OFERTA?']?.toLowerCase() === "sí";
        const precioOriginal = parseFloat(producto.PRECIO) || 0;
        const precioConDescuento = parseFloat(producto.PRECIO_DESCUENTO) || precioOriginal;
        const comentarioOferta = producto.COMENTARIO_OFERTA || '';

        const precioHtml = enOferta
            ? `<div class="precio-contenedor d-flex align-items-baseline gap-2">
                   <span class="precio-original">$${precioOriginal.toLocaleString()}</span>
                   <span class="precio-descuento">$${precioConDescuento.toLocaleString()}</span>
               </div>`
            : `<p class="text-success fw-bold">$${precioOriginal.toLocaleString()}</p>`;

        const comentarioHtml = comentarioOferta
            ? `<p class="comentario-oferta text-success">${comentarioOferta}</p>`
            : '';

        const botonHtml = producto.LINK_COMPRA
            ? `<a href="${producto.LINK_COMPRA}" target="_blank" class="btn btn-primary">
                   ${enOferta ? 'Comprar Oferta' : 'Comprar Ahora'}
               </a>`
            : `<button class="btn btn-secondary" disabled>Sin enlace disponible</button>`;

        return `
            <div class="destacado-item">
                <img src="./data/tienda/${producto.IMAGEN || 'default.jpg'}" 
                     alt="${producto.NOMBRE_PRODUCTO || 'Producto sin nombre'}" 
                     class="img-fluid rounded" 
                     onerror="this.src='./data/tienda/default.jpg';">
                <h5 class="mt-3 text-primary">${producto.NOMBRE_PRODUCTO || 'Producto sin nombre'}</h5>
                <p class="text-muted">${producto.DESCRIPCION || 'Sin descripción disponible'}</p>
                ${comentarioHtml}
                ${precioHtml}
                <div class="btn-container">${botonHtml}</div>
            </div>`;
    }).join('');

    contenedor.innerHTML = html;
}


// =======================================================
// SECCIÓN 6: CONÓCENOS ("FALTA")
// =======================================================

// Renderizado y funcionalidad para los banners de esta sección.
// Falta implementar.

// =======================================================
// SECCIÓN 7: CONTÁCTANOS (CORREGIDO Y OPTIMIZADO)
// =======================================================

/**
 * Renderiza los botones flotantes de contacto.
 * @param {Array} contactanos - Lista de contactos a renderizar.
 */
function renderBotonesFlotantes(contactanos) {
    if (!Array.isArray(contactanos) || contactanos.length === 0) {
        console.warn("No hay datos para los botones flotantes.");
        return;
    }

    contactanos.forEach((contacto, index) => {
        if (!contacto.URL || !contacto.NOMBRE) {
            console.warn(`Contacto inválido en índice ${index}:`, contacto);
            return;
        }

        const boton = document.createElement('div');
        boton.className = `boton-flotante ${contacto.NOMBRE.toLowerCase()}`;
        boton.innerHTML = `
            <a href="${contacto.URL}" target="_blank" title="${contacto.NOMBRE}">
                <img src="./img/${contacto.NOMBRE.toLowerCase()}.png" 
                     alt="${contacto.NOMBRE}" 
                     style="display: block;" 
                     onerror="this.src='./img/default.png';">
            </a>`;
        document.body.appendChild(boton);
    });
}


/**
 * Renderiza la lista de enlaces de contacto.
 * @param {Array} contactanos - Lista de contactos a renderizar.
 */
function renderContactanos(contactanos) {
    const contenedor = document.getElementById('contactanos-links');
    if (!contenedor) {
        console.warn("El contenedor para los contactos no existe en el DOM.");
        return;
    }

    contenedor.innerHTML = '';

    if (!Array.isArray(contactanos) || contactanos.length === 0) {
        contenedor.innerHTML = '<p class="text-center">No hay información de contacto disponible.</p>';
        return;
    }

    contactanos.forEach(contacto => {
        if (!contacto.URL || !contacto.NOMBRE || !contacto.DESCRIPCIÓN) {
            console.warn("Datos de contacto incompletos:", contacto);
            return;
        }

        const enlace = document.createElement('div');
        enlace.className = 'contacto-item';
        enlace.innerHTML = `
            <a href="${contacto.URL}" target="_blank">
                <img src="./img/${contacto.NOMBRE.toLowerCase()}.png" 
                     alt="${contacto.NOMBRE}" 
                     onerror="this.src='./img/default.png';">
                <span>${contacto.DESCRIPCIÓN}</span>
            </a>`;
        contenedor.appendChild(enlace);
    });
}

// =======================================================
// SECCIÓN 8: REDES SOCIALES (CORREGIDO Y OPTIMIZADO)
// =======================================================

/**
 * Renderiza la lista de redes sociales activas en la sección correspondiente.
 * @param {Array} redes - Lista de redes sociales a renderizar.
 */
function renderRedesSociales(redes) {
    const contenedor = document.getElementById('social-media-links');
    if (!contenedor) {
        console.warn("El contenedor para redes sociales no existe en el DOM.");
        return;
    }

    contenedor.innerHTML = '';

    if (!Array.isArray(redes) || redes.length === 0) {
        contenedor.innerHTML = '<p class="text-center">No hay redes sociales activas disponibles.</p>';
        return;
    }

    redes.forEach((red, index) => {
        if (!red.URL || !red.NOMBRE) {
            console.warn(`Datos de red social inválidos en índice ${index}:`, red);
            return;
        }

        const enlace = document.createElement('a');
        enlace.href = red.URL;
        enlace.target = '_blank';
        enlace.title = `Visitar ${red.NOMBRE}`;
        enlace.innerHTML = `
            <img src="./img/${red.NOMBRE.toLowerCase()}.png" 
                 alt="${red.NOMBRE}" 
                 onerror="this.src='./img/default.png';">
        `;
        contenedor.appendChild(enlace);
    });
}


// =======================================================
// SECCIÓN 9: TIENDA (USANDO EXCEL) - CORREGIDO Y OPTIMIZADO
// =======================================================

/**
 * Función principal para cargar y renderizar la sección de tiendas.
 * @async
 */
async function renderTiendaVirtual() {
    const archivo = './data/enlaces_externos.xlsx'; // Ruta del archivo Excel

    try {
        // Cargar datos desde el archivo Excel
        const tiendas = await cargarDatosDesdeExcel(archivo);

        console.log('Datos de tiendas:', tiendas); // Log para depuración

        // Filtrar las tiendas activas y de categoría "tienda"
        const tiendasFiltradas = tiendas.filter(tienda =>
            tienda.CATEGORÍA?.trim().toLowerCase() === "tienda" &&
            tienda.ESTADO?.trim().toLowerCase() === "activo"
        );

        if (tiendasFiltradas.length === 0) {
            throw new Error("No hay tiendas activas disponibles.");
        }

        // Renderizar las tiendas en la sección correspondiente
        renderTiendasEnContenedor(tiendasFiltradas, 'tiendaContainer');
    } catch (error) {
        manejarErrorCarga(error, 'tiendaContainer', "Ocurrió un error al cargar las tiendas. Por favor, inténtalo más tarde.");
    }
}

/**
 * Carga los datos desde un archivo Excel utilizando SheetJS.
 * @param {string} archivo - Ruta del archivo Excel.
 * @returns {Array} Lista de datos procesados.
 */
async function cargarDatosDesdeExcel(archivo) {
    try {
        const response = await fetch(archivo);
        if (!response.ok) throw new Error(`No se pudo cargar el archivo Excel desde ${archivo}.`);

        const data = await response.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const hoja = workbook.Sheets[workbook.SheetNames[0]];

        if (!hoja) throw new Error("El archivo Excel no contiene hojas válidas.");

        return XLSX.utils.sheet_to_json(hoja);
    } catch (error) {
        console.error("Error al leer el archivo Excel:", error);
        return [];
    }
}

/**
 * Renderiza las tiendas en el contenedor correspondiente.
 * @param {Array} tiendas - Lista de tiendas activas.
 * @param {string} contenedorId - ID del contenedor donde se renderizarán las tiendas.
 */
function renderTiendasEnContenedor(tiendas, contenedorId) {
    const contenedor = document.getElementById(contenedorId);

    if (!contenedor) {
        console.warn(`El contenedor con ID '${contenedorId}' no existe en el DOM.`);
        return;
    }

    if (!Array.isArray(tiendas) || tiendas.length === 0) {
        contenedor.innerHTML = `<p class="text-center text-warning">No hay tiendas disponibles en este momento.</p>`;
        return;
    }

    // Generar HTML dinámico para las tiendas
    const html = tiendas.map(tienda => {
        // Validar datos obligatorios
        const nombre = tienda.NOMBRE?.trim() || 'Tienda sin nombre';
        const url = tienda.URL?.trim();
        const descripcion = tienda.DESCRIPCIÓN?.trim() || 'Sin descripción disponible';

        if (!url) {
            console.warn(`Tienda omitida por falta de URL: ${JSON.stringify(tienda)}`);
            return ''; // Omitir tiendas sin URL
        }

        const imageName = nombre.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') || 'default';
        const imageUrl = `./img/${imageName}.jpg`;

        return `
            <div class="col-md-4 text-center tienda-item">
                <a href="${url}" target="_blank" class="d-block tienda-link">
                    <img src="${imageUrl}" 
                         alt="${nombre}" 
                         class="img-fluid rounded shadow tienda-imagen"
                         style="height: 200px; object-fit: cover;" 
                         onerror="this.src='./img/default-store.jpg';">
                </a>
                <h5 class="mt-3">${nombre}</h5>
                <p class="text-muted">${descripcion}</p>
            </div>`;
    }).join('');

    // Insertar contenido generado en el contenedor
    contenedor.innerHTML = html || `<p class="text-center text-warning">No hay tiendas válidas para mostrar.</p>`;
}

/**
 * Maneja los errores de carga y muestra un mensaje en el contenedor especificado.
 * @param {Error} error - Objeto de error capturado.
 * @param {string} contenedorId - ID del contenedor donde se mostrará el mensaje de error.
 * @param {string} mensajeError - Mensaje de error personalizado.
 */
function manejarErrorCarga(error, contenedorId, mensajeError = "Ocurrió un error al cargar los datos.") {
    console.error("Error detectado:", error); // Log del error en la consola para depuración

    const contenedor = document.getElementById(contenedorId);
    if (contenedor) {
        contenedor.innerHTML = `
            <div class="text-center alert alert-danger">
                <p>${mensajeError}</p>
                <p class="small text-muted">Detalles técnicos: ${error.message}</p>
            </div>`;
    }
}
// =======================================================
// SECCIÓN 10: MANEJO DE ERRORES (OPTIMIZADA)
// =======================================================

/**
 * Función genérica para manejar errores en la carga de datos desde archivos Excel.
 * Muestra un mensaje de error en el contenedor especificado.
 * @param {Error} error - Objeto de error capturado.
 * @param {string} contenedorId - ID del contenedor donde se mostrará el mensaje de error.
 * @param {string} [mensajeError="Ocurrió un error al cargar los datos."] - Mensaje de error personalizado.
 */




/**
 * Función para cargar y procesar los enlaces externos desde un archivo Excel.
 * Incluye manejo de errores y validación de columnas requeridas.
 */
async function cargarEnlacesExternos() {
    const archivo = './data/enlaces_externos.xlsx'; // Ruta del archivo Excel
    try {
        // Fetch del archivo Excel
        const response = await fetch(archivo);
        if (!response.ok) throw new Error(`Error al cargar el archivo: ${archivo}`);

        // Leer datos como ArrayBuffer y procesarlos con SheetJS
        const data = await response.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const hoja = workbook.Sheets[workbook.SheetNames[0]];

        if (!hoja) throw new Error("El archivo Excel no contiene hojas válidas.");

        // Convertir los datos en un array JSON
        const enlaces = XLSX.utils.sheet_to_json(hoja);

        // Validar columnas requeridas en los datos
        if (!enlaces.every(enlace => 'CATEGORÍA' in enlace && 'ESTADO' in enlace && 'URL' in enlace)) {
            throw new Error("Faltan columnas requeridas como CATEGORÍA, ESTADO o URL en el archivo.");
        }

        // Filtrar enlaces activos y renderizar según la categoría
        const enlacesActivos = enlaces.filter(enlace => enlace.ESTADO === "Activo");
        renderRedesSociales(enlacesActivos.filter(e => e.CATEGORÍA === "Red Social"));
        renderBotonesFlotantes(enlacesActivos.filter(e => e.CATEGORÍA === "Contactanos"));
        renderContactanos(enlacesActivos.filter(e => e.CATEGORÍA === "Contactanos"));
    } catch (error) {
        // Manejo de errores específicos para cada sección
        manejarErrorCarga(error, 'social-media-links', "Error al cargar las redes sociales.");
        manejarErrorCarga(error, 'contactanos-links', "Error al cargar los contactos.");
    }
}

// =======================================================
// SECCIÓN 11: OPTIMIZACIÓN Y RESPONSIVIDAD FINAL
// =======================================================

/**
 * Realiza ajustes finales para mejorar la responsividad de la página.
 * Asegura que las nuevas secciones se adapten correctamente a diferentes dispositivos.
 */
function optimizarResponsividad() {
    const ajustarColumnas = () => {
        const anchoPantalla = window.innerWidth;

        // Ajuste dinámico de columnas para categorías y destacados
        document.querySelectorAll('.categoria-item, .destacado-item').forEach(item => {
            if (anchoPantalla < 768) {
                item.classList.remove('col-md-3');
                item.classList.add('col-6');
            } else {
                item.classList.remove('col-6');
                item.classList.add('col-md-3');
            }
        });
    };

    // Detectar cambios de tamaño de pantalla
    window.addEventListener('resize', debounce(ajustarColumnas, 200));


    // Ajuste inicial al cargar la página
    ajustarColumnas();
}


// =======================================================
// SECCIÓN 12: AJUSTES GENERALES DE NAVEGACIÓN
// =======================================================

/**
 * Configura el desplazamiento suave para los enlaces del submenú de categorías.
 * Asegura que el contenedor principal de la categoría sea visible.
 */
function configurarDesplazamientoCategorias() {
    const menuAltura = document.querySelector('.navbar')?.offsetHeight || 0; // Altura del menú fijo
    const offsetAdicional = 40; // Ajuste adicional para visibilidad

    document.querySelectorAll('#submenu-categorias a[href^="#"]').forEach(enlace => {
        const selectorObjetivo = enlace.getAttribute('href'); // Ejemplo: "#categoria-id"

        if (!selectorObjetivo || selectorObjetivo === '#') {
            console.warn(`Enlace con href inválido encontrado en categorías: ${selectorObjetivo}`);
            return;
        }

        const objetivo = document.querySelector(selectorObjetivo);
        if (!objetivo) {
            console.warn(`No se encontró un objetivo en el DOM para el enlace de categorías: ${selectorObjetivo}`);
            return;
        }

        enlace.addEventListener('click', event => {
            event.preventDefault();

            const offset = objetivo.getBoundingClientRect().top + window.scrollY - menuAltura - offsetAdicional;

            window.scrollTo({
                top: offset,
                behavior: 'smooth',
            });
            // Cerrar el submenú después de hacer clic en una categoría
            const dropdown = enlace.closest('.dropdown');
            if (dropdown) {
                dropdown.classList.remove('show');
                const dropdownMenu = dropdown.querySelector('.dropdown-menu');
                if (dropdownMenu) {
                    dropdownMenu.classList.remove('show');
                }
            }
            // Cerrar el submenú en dispositivos móviles
            const navbarCollapse = document.querySelector('.navbar-collapse');
            if (navbarCollapse) {
                navbarCollapse.classList.remove('show');
            }
            // Forzar el cierre del menú en dispositivos móviles
            const navbarToggler = document.querySelector('.navbar-toggler');
            if (navbarToggler && navbarToggler.getAttribute('aria-expanded') === 'true') {
                navbarToggler.click();
            }


        });
    });
}

/**
 * Configura el desplazamiento suave para el enlace de la sección de tienda.
 * Asegura que el contenedor de las tiendas quede correctamente visible.
 */
function configurarDesplazamientoTienda() {
    const menuAltura = document.querySelector('.navbar')?.offsetHeight || 0;
    const offsetAdicional = 40;

    const enlaceTienda = document.querySelector('a[href="#tienda-virtual"]');
    const contenedorTienda = document.querySelector('#tiendaContainer'); // ID correcto del contenedor

    if (!enlaceTienda) {
        console.warn("El enlace a la tienda virtual no existe en el DOM.");
        return;
    }

    if (!contenedorTienda) {
        console.warn("El contenedor de la tienda virtual no existe en el DOM.");
        return;
    }

    enlaceTienda.addEventListener('click', event => {
        event.preventDefault();

        const offset = contenedorTienda.getBoundingClientRect().top + window.scrollY - menuAltura - offsetAdicional;

        window.scrollTo({
            top: offset,
            behavior: 'smooth',
        });
    });
}

/**
 * Configura el desplazamiento suave para todos los enlaces internos de la página.
 * Asegura que las secciones y contenedores sean visibles al hacer clic.
 */
function configurarDesplazamientoGeneral() {
    const menuProductos = document.querySelector('#menu-productos'); // Selecciona el enlace "Productos"
    const menuAltura = document.querySelector('.navbar')?.offsetHeight || 0;
    const offsetAdicional = 40;

    document.querySelectorAll('a[href^="#"]').forEach(enlace => {
        const selectorObjetivo = enlace.getAttribute('href');

        if (!selectorObjetivo || selectorObjetivo === '#' || enlace === menuProductos) {
            // Ignorar enlaces inválidos o el enlace principal "Productos"
            return;
        }

        const objetivo = document.querySelector(selectorObjetivo);

        if (!objetivo) {
            console.warn(`No se encontró un objetivo en el DOM para el enlace: ${selectorObjetivo}`);
            return;
        }

        enlace.addEventListener('click', event => {
            event.preventDefault();

            const offset = objetivo.getBoundingClientRect().top + window.scrollY - menuAltura - offsetAdicional;

            window.scrollTo({
                top: offset,
                behavior: 'smooth',
            });
        });
    });

    // Interceptar clic en "Productos" para solo manejar el menú desplegable
    if (menuProductos) {
        menuProductos.addEventListener('click', event => {
            event.preventDefault(); // Evitar el desplazamiento automático
            const submenu = document.querySelector('#submenu-categorias');
            if (submenu) {
                submenu.classList.toggle('show'); // Mostrar/ocultar el submenú
            }
        });
    }

    // Manejar el clic en el menú principal "Productos" para solo mostrar/ocultar el submenú
    if (menuProductos) {
        menuProductos.addEventListener('click', event => {
            event.preventDefault(); // Evitar desplazamiento automático
            const submenu = document.querySelector('#submenu-productos'); // Ajusta el selector al submenú correspondiente
            if (submenu) {
                submenu.classList.toggle('show'); // Mostrar/ocultar el submenú
            }
        });
    }
}

/**
 * Ajusta el comportamiento de desplazamiento para asegurarse de que los enlaces generales,
 * los específicos de las categorías y de la tienda funcionen correctamente.
 */
// =======================================================
// ÚNICA LLAMADA A DOMContentLoaded
// =======================================================
document.addEventListener('DOMContentLoaded', () => {
    // Configuración inicial
    inicializarConfiguracionesRapidas(); // Configuraciones rápidas como menús y desplazamientos
    configurarMenu();                    // Configuración del menú principal

    // Configuración de interfaz de usuario
    optimizarResponsividad();            // Ajustes dinámicos para dispositivos

    // Desplazamientos y navegación
    configurarDesplazamientoCategorias(); // Submenú de categorías
    configurarDesplazamientoTienda();     // Sección de tiendas
    configurarDesplazamientoGeneral();    // Enlaces internos generales

    // Tareas diferidas y renderizado
    inicializarTareasPesadas();          // Tareas diferidas (carga de datos, etc.)
    renderTiendaVirtual();               // Tienda virtual

    // Cargar enlaces externos
    cargarEnlacesExternos();             // Cargar y renderizar enlaces externos desde el archivo Excel
});



