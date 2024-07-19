const fs = require('fs');
const path = require('path');

// Verifica si un color es negro o no
function isBlack(hex) {
    hex = hex.replace(/^#/, '');

    if (hex.length === 3) {
        hex = hex.split('').map(function(hex) {
            return hex + hex;
        }).join('');
    }

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    const threshold = 64;

    return r < threshold && g < threshold && b < threshold;
}

// Obtiene todas las clases y etiquetas definidas en el CSS
function obtenerTodasClases(cssText) {
    const combinaciones = new Set();
    const regexCombinacion = /([a-zA-Z][a-zA-Z0-9]*)(?:(?:\.\w+|\s*,\s*\w+))*\s*\{/g;
    let match;
    while ((match = regexCombinacion.exec(cssText)) !== null) {
        const elementos = match[0].replace(/{.*/, '').split(/\s*,\s*/);
        for (const elemento of elementos) {
            combinaciones.add(elemento.trim());
        }
    }
    return Array.from(combinaciones);
}

// Obtiene las reglas CSS para una clase específica
function obtenerReglasParaClase(cssText, clase) {
    const regex = new RegExp(`(?:\\.\\b${clase}\\b|\\b${clase}\\b)\\s*{([^}]*)}`, 'i');
    const match = cssText.match(regex);
    return match ? match[1] : '';
}

// Clasifica las clases en base a si tienen color o no
function clasificarClasesPorColor(cssText, clases) {
    const clasesConColor = [];
    const clasesSinColor = [];

    for (const clase of clases) {
        const reglas = obtenerReglasParaClase(cssText, clase);
        
        // Busca la propiedad color con valores distintos a negro o vacíos
        const colorMatch = /color\s*:\s*(#[0-9a-fA-F]{3,6}|(?:rgb|hsl)a?\([^\)]*\)|[a-zA-Z]+)\s*;/i.exec(reglas);
        
        if (colorMatch && !isBlack(colorMatch[1])) {
            clasesConColor.push(clase);
        } else {
            clasesSinColor.push(clase);
        }
    }

    return {
        clasesConColor,
        clasesSinColor
    };
}

// Función principal para obtener y clasificar las clases
function obtenerDatosCSS(cssText) {
    const todasLasClases = obtenerTodasClases(cssText);
    const clasificaciones = clasificarClasesPorColor(cssText, todasLasClases);

    return {
        clasesConColor: clasificaciones.clasesConColor,
        clasesSinColor: clasificaciones.clasesSinColor
    };
}

// Procesa un archivo CSS para obtener y clasificar las clases
function procesarCss(rutaArchivo) {
    fs.readFile(rutaArchivo, 'utf8', (err, cssText) => {
        if (err) {
            console.error('Error al leer el archivo:', err);
            return;
        }

        const { clasesConColor, clasesSinColor } = obtenerDatosCSS(cssText);

        console.log('Clases con color:', clasesConColor);
        console.log('Clases sin color:', clasesSinColor);
    });
}

// Especifica la ruta del archivo CSS que quieres procesar
const rutaArchivoCss = path.join(__dirname, 'pruebaGrupo/base/document.css');
procesarCss(rutaArchivoCss);
