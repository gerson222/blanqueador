const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// Define las clases adicionales a eliminar
const clasesAdicionales = [
   'nav', 'top-nav', 'top_nav'  // Añade aquí las clases que desees eliminar
];

// Lee el JSON generado por colores.js
function leerColores() {
   return JSON.parse(fs.readFileSync('resultado.json', 'utf8'));
}

// Elimina una etiqueta de un documento HTML
function eliminarEtiqueta($, selector) {
   $(selector).remove();
}

// Modifica el texto de las etiquetas específicas si contienen "Respuesta"
function modificarTextoRespuesta($) {
   // Selecciona las etiquetas p, h1, h2, h3, h4 dentro del body
   $('body').find('p, h1, h2, h3, h4').each((index, element) => {
      const texto = $(element).text();
      if (texto.includes('Respuesta')) {
         $(element).text('Respuesta:..........................');
      }
   });
}

// Elimina líneas completamente vacías dentro del body
function eliminarLineasEnBlanco($) {
   const body = $('body');

   // Buscar todas las líneas en el body
   body.contents().each((index, element) => {
      if (!$(element).closest('table').length) {
         // Verifica si el nodo es una línea en blanco (espacios y tabulaciones no cuentan)
         if (element.nodeType === 3 && !$(element).text().trim()) {
            $(element).remove();
         }
      }
   });

   // Elimina líneas vacías solo si son completamente vacías (sin etiquetas)
   body.find('*').each((index, element) => {
      if (!$(element).closest('table').length) {
         const elementHtml = $(element).html().trim();
         if (elementHtml === '' && $(element).children().length === 0) {
            $(element).remove();
         }
      }
   });
}

// Elimina líneas repetidas y reemplaza combinaciones específicas dentro del body, excepto en <table>
function procesarLineasRepetidasYReemplazo($) {
   const body = $('body');

   // Función auxiliar para procesar el contenido excluyendo las tablas
   function procesarContenido(elementos) {
      elementos.each((index, element) => {
         if (!$(element).closest('table').length) {
            // Define la cadena a reemplazar y la cadena de reemplazo
            const lineaObjetivo = '<p style="text-indent: 0pt;text-align: left;"><br></p>';
            const regexLineaObjetivo = new RegExp(lineaObjetivo, 'g');

            // Reemplaza combinaciones de líneas
            $(element).find('p').each((index, pElement) => {
               let contenido = $(pElement).prop('outerHTML');
               if (contenido.includes(lineaObjetivo) || contenido.includes('<p style="text-indent: 0pt;text-align: left;"></p>')) {
                  $(pElement).replaceWith(lineaObjetivo);
               }
            });

            // Elimina líneas repetidas
            let bodyHtml = $(element).html();
            bodyHtml = bodyHtml.replace(new RegExp(`(${regexLineaObjetivo.source})(\\s*${regexLineaObjetivo.source})+`, 'g'), `$1`);
            $(element).html(bodyHtml);
         }
      });
   }

   // Procesa el contenido del body excluyendo tablas
   procesarContenido(body);

   // Procesa cada elemento del body que no esté dentro de una tabla
   body.find('*').each((index, element) => {
      if (!$(element).closest('table').length) {
         procesarContenido($(element));
      }
   });
}

// Elimina etiquetas basadas en los arrays obtenidos
function procesarHtml(archivoHtml, colores) {
   const { clasesConColor, coloresRojos, clasesNegro, clasesSinColor } = colores;
   const html = fs.readFileSync(archivoHtml, 'utf8');
   const $ = cheerio.load(html);

   // Eliminar etiquetas con atributos class que contienen clases con color
   $('*[class]').each((index, element) => {
      if (!$(element).closest('table').length) {
         const clases = $(element).attr('class').split(/\s+/);
         const tieneColor = clases.some(clase => clasesConColor.includes(clase));
         const tieneClaseExtra = clases.some(clase => clasesAdicionales.includes(clase));
         if (tieneColor || tieneClaseExtra) {
            eliminarEtiqueta($, element);
         }
      }
   });

   // Eliminar etiquetas sin clase pero con style que contenga colores rojos
   $('*[style]').each((index, element) => {
      if (!$(element).closest('table').length) {
         const style = $(element).attr('style');
         const tieneColorRojo = coloresRojos.some(color => new RegExp(`color\\s*:\\s*${color}\\b`, 'i').test(style));
         if (tieneColorRojo) {
            eliminarEtiqueta($, element);
         }
      }
   });

   // Eliminar imágenes con archivos faltantes
   $('img').each((index, element) => {
      if (!$(element).closest('table').length) {
         const src = $(element).attr('src');
         if (src) {
            const rutaImagen = path.join(path.dirname(archivoHtml), src);
            if (!fs.existsSync(rutaImagen)) {
               eliminarEtiqueta($, element);
            }
         }
      }
   });

   // Eliminar etiquetas con clases no incluidas en clasesNegro, clasesSinColor o clasesConColor
   $('*').each((index, element) => {
      if (!$(element).closest('table').length) {
         const clases = $(element).attr('class');
         if (clases && !clases.split(/\s+/).some(clase => clasesNegro.includes(clase) || clasesSinColor.includes(clase) || clasesConColor.includes(clase))) {
            eliminarEtiqueta($, element);
         }
      }
   });

   // Modificar texto de etiquetas específicas dentro del body
   modificarTextoRespuesta($);

   // Eliminar líneas en blanco dentro del body
   eliminarLineasEnBlanco($);

   // Procesar líneas repetidas y reemplazos dentro del body, excepto en <table>
   procesarLineasRepetidasYReemplazo($);

   // Guarda el HTML modificado
   fs.writeFileSync(archivoHtml, $.html(), 'utf8');
}

// Procesa todos los archivos HTML en la carpeta base
function procesarHtmlsEnCarpeta(carpeta) {
   const colores = leerColores();

   fs.readdir(carpeta, (err, archivos) => {
      if (err) {
         console.error('Error al leer la carpeta:', err);
         return;
      }

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
