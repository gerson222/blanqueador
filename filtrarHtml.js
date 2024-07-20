const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// Lee el archivo JSON generado por colores.js
function leerColores() {
   const archivoJson = path.join(__dirname, 'resultado.json');
   const datosJson = fs.readFileSync(archivoJson, 'utf8');
   const colores = JSON.parse(datosJson);
   console.log('Colores leídos:', colores); // Verifica el contenido
   return colores;
}

// Elimina una etiqueta de un documento HTML
function eliminarEtiqueta($, selector) {
   $(selector).remove();
}

// Elimina etiquetas basadas en los arrays obtenidos
function procesarHtml(archivoHtml, colores) {
   const { clasesConColor, coloresRojos } = colores;
   const html = fs.readFileSync(archivoHtml, 'utf8');
   const $ = cheerio.load(html);

   console.log('Contenido original del archivo:', html); // Verifica el HTML original

   // Eliminar etiquetas con atributos class que contienen clases con color
   $('*[class]').each((index, element) => {
      const clases = $(element).attr('class').split(/\s+/);
      const tieneColor = clases.some(clase => clasesConColor.includes(clase));
      if (tieneColor) {
         console.log('Eliminando etiqueta con clase:', clases); // Verifica las clases
         eliminarEtiqueta($, element);
      }
   });

   // Eliminar etiquetas sin clase pero con style que contenga colores rojos
   $('*[style]').each((index, element) => {
      const style = $(element).attr('style');
      const tieneColorRojo = coloresRojos.some(color => new RegExp(`color\\s*:\\s*${color}\\b`, 'i').test(style));
      if (tieneColorRojo) {
         console.log('Eliminando etiqueta con style:', style); // Verifica el style
         eliminarEtiqueta($, element);
      }
   });

   // Eliminar imágenes con archivos faltantes
   $('img').each((index, element) => {
      const src = $(element).attr('src');
      if (src) {
         const rutaImagen = path.join(path.dirname(archivoHtml), src);
         if (!fs.existsSync(rutaImagen)) {
               console.log('Eliminando imagen con src:', src); // Verifica el src
               eliminarEtiqueta($, element);
         }
      }
   });

   // Guarda el HTML modificado
   const htmlModificado = $.html();
   console.log('Contenido modificado del archivo:', htmlModificado); // Verifica el HTML modificado
   fs.writeFileSync(archivoHtml, htmlModificado, 'utf8');
}

// Procesa todos los archivos HTML en la carpeta base
function procesarHtmlsEnCarpeta(carpeta) {
   const colores = leerColores();
   console.log('Colores cargados:', colores); // Verifica los colores

   fs.readdir(carpeta, (err, archivos) => {
      if (err) {
         console.error('Error al leer la carpeta:', err);
         return;
      }

      console.log('Archivos en la carpeta:', archivos); // Verifica los archivos
      
      archivos.forEach(archivo => {
         const rutaArchivo = path.join(carpeta, archivo);
         if (path.extname(archivo) === '.htm') {
               procesarHtml(rutaArchivo, colores);
         }
      });
   });
}

// Ruta de la carpeta base
const carpetaBase = path.join(__dirname, 'base');
procesarHtmlsEnCarpeta(carpetaBase);
