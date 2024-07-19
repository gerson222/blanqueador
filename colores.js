const fs = require('fs');
const path = require('path');

function isBlack(hex) {
   // Elimina el símbolo de hash si está presente
   hex = hex.replace(/^#/, '');

   // Asegúrate de que el formato sea hexadecimal corto
   if (hex.length === 3) {
      hex = hex.split('').map(function(hex) {
         return hex + hex;
      }).join('');
   }

   // Convierte el color hexadecimal a valores RGB
   const r = parseInt(hex.substring(0, 2), 16);
   const g = parseInt(hex.substring(2, 4), 16);
   const b = parseInt(hex.substring(4, 6), 16);

   // Define un umbral para considerar un color como negro
   const threshold = 64; // Un valor entre 0 y 255, ajusta según sea necesario

   // Considera el color como negro si todos los componentes RGB son menores que el umbral
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

// Función principal para obtener todas las clases
function obtenerDatosCSS(cssText) {
   const todasLasClases = obtenerTodasClases(cssText);
   return {
      todasLasClases: todasLasClases
   };
}

// Procesa un archivo CSS para obtener los datos
function procesarCss(rutaArchivo) {
   fs.readFile(rutaArchivo, 'utf8', (err, cssText) => {
      if (err) {
            console.error('Error al leer el archivo:', err);
            return;
      }

      // Obtiene los datos CSS
      const { todasLasClases } = obtenerDatosCSS(cssText);

      console.log('Combinaciones de clases y etiquetas definidas a la vez:', todasLasClases);
   });
}

// Especifica la ruta del archivo CSS que quieres procesar
const rutaArchivoCss = path.join(__dirname, 'pruebaGrupo/base/document.css');
procesarCss(rutaArchivoCss);

