const fs = require('fs');
const path = require('path');

// Colores predefinidos a mano (añade o modifica según necesites)
const coloresManuales = {
   negros: ['black'], // Colores negros que quieres considerar
   rojos: ['#F00']   // Colores rojos que quieres considerar
};

// Conjuntos para almacenar colores únicos
const coloresNegrosDetectados = new Set([...coloresManuales.negros]);
const coloresRojosDetectados = new Set([...coloresManuales.rojos]);

// Mapa de nombres de colores a hexadecimales
const nombreColorAHex = {
   'black': '#000000',
   'red': '#FF0000',
   'darkred': '#8B0000',
   'firebrick': '#B22222',
   'crimson': '#DC143C',
   // Puedes agregar más colores aquí
};

// Verifica si un color es negro o no
function isBlack(color) {
   color = color.toLowerCase(); // Normaliza el color a minúsculas

   // Maneja colores definidos como palabra
   if (nombreColorAHex[color]) {
      color = nombreColorAHex[color];
   }

   if (color.startsWith('#')) {
      color = color.replace(/^#/, '');

      // Asegúrate de que el formato sea hexadecimal largo
      if (color.length === 3) {
         color = color.split('').map(hex => hex + hex).join('');
      }

      const r = parseInt(color.substring(0, 2), 16);
      const g = parseInt(color.substring(2, 4), 16);
      const b = parseInt(color.substring(4, 6), 16);

      const threshold = 64; // Umbral para considerar un color como negro
      const isNegro = r < threshold && g < threshold && b < threshold;

      if (isNegro) {
         coloresNegrosDetectados.add(`#${color}`);
      } else {
         coloresRojosDetectados.add(`#${color}`);
      }

      return isNegro;
   } else {
      // Si no es un color en formato hexadecimal, no es negro
      return false;
   }
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
   const clasesNegro = [];
   const clasesSinColor = [];

   for (const clase of clases) {
      const reglas = obtenerReglasParaClase(cssText, clase);
      
      // Busca la propiedad color con valores distintos a negro o vacíos
      const colorMatch = /color\s*:\s*(#[0-9a-fA-F]{3,6}|[a-zA-Z]+)\s*;/i.exec(reglas);
      
      if (colorMatch) {
         const color = colorMatch[1].toLowerCase();
         if (color === 'black' || isBlack(color)) {
            clasesNegro.push(clase);
         } else if (coloresManuales.rojos.includes(color) || coloresRojosDetectados.has(`#${color}`)) {
            // Maneja colores predefinidos y detectados
            coloresRojosDetectados.add(color);
            clasesConColor.push(clase);
         } else {
            clasesConColor.push(clase);
         }
      } else {
         clasesSinColor.push(clase);
      }
   }

   return {
      clasesConColor,
      clasesNegro,
      clasesSinColor,
      coloresNegros: Array.from(coloresNegrosDetectados),
      coloresRojos: Array.from(coloresRojosDetectados)
   };
}

// Función principal para obtener y clasificar las clases
function obtenerDatosCSS(cssText) {
   const todasLasClases = obtenerTodasClases(cssText);
   return clasificarClasesPorColor(cssText, todasLasClases);
}

// Procesa un archivo CSS para obtener y clasificar las clases
function procesarCss(rutaArchivo) {
   fs.readFile(rutaArchivo, 'utf8', (err, cssText) => {
      if (err) {
            console.error('Error al leer el archivo:', err);
            return;
      }

      const { clasesConColor, clasesNegro, clasesSinColor, coloresNegros, coloresRojos } = obtenerDatosCSS(cssText);

      const resultado = {
         clasesConColor,
         clasesNegro,
         clasesSinColor,
         coloresNegros,
         coloresRojos
      };

      // Escribe el resultado en un archivo JSON
      fs.writeFile('resultado.json', JSON.stringify(resultado, null, 2), (err) => {
         if (err) {
            console.error('Error al escribir el archivo JSON:', err);
         } else {
            console.log('Datos guardados en resultado.json');
         }
      });
   });
}

// Especifica la ruta del archivo CSS que quieres procesar
const rutaArchivoCss = path.join(__dirname, 'base/document.css');
procesarCss(rutaArchivoCss);
