const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// Define las clases adicionales a eliminar
const clasesAdicionales = [
   'nav', 'top-nav', 'top_nav', 'toc'  // Añade aquí las clases que desees eliminar
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
   $('body').find('p, h1, h2, h3, h4').each((index, element) => {
      const texto = $(element).text();
      if (texto.includes('Respuesta')) {
            $(element).text('Respuesta:..........................');
            $(element).removeAttr('class');
            let currentStyle = $(element).attr('style') || '';
            currentStyle += ' color: black; font-family: Calibri, sans-serif; font-style: normal; font-weight: bold; text-decoration: none; font-size: 12pt;';
            $(element).attr('style', currentStyle);
      }
   });
}

// Elimina líneas completamente vacías dentro del body
function eliminarLineasEnBlanco($) {
   const body = $('body');

   body.contents().each((index, element) => {
      if (!$(element).closest('table').length) {
            if (element.nodeType === 3 && !$(element).text().trim()) {
               $(element).remove();
            }
      }
   });

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

   function procesarContenido(elementos) {
      elementos.each((index, element) => {
            if (!$(element).closest('table').length) {
               const lineaObjetivo = '<p style="text-indent: 0pt;text-align: left;"><br></p>';
               const regexLineaObjetivo = new RegExp(lineaObjetivo, 'g');

               $(element).find('p').each((index, pElement) => {
                  let contenido = $(pElement).prop('outerHTML');
                  if (contenido.includes(lineaObjetivo) || contenido.includes('<p style="text-indent: 0pt;text-align: left;"></p>')) {
                        $(pElement).replaceWith(lineaObjetivo);
                  }
               });

               let bodyHtml = $(element).html();
               bodyHtml = bodyHtml.replace(new RegExp(`(${regexLineaObjetivo.source})(\\s*${regexLineaObjetivo.source})+`, 'g'), `$1`);
               $(element).html(bodyHtml);
            }
      });
   }

   procesarContenido(body);

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

   // Eliminar etiquetas basadas en las 5 situaciones especificadas
   $('*').each((index, element) => {
      if (!$(element).closest('table').length) {
            const clases = $(element).attr('class') ? $(element).attr('class').split(/\s+/) : [];
            const style = $(element).attr('style') || '';

            const tieneClaseRoja = clases.some(clase => clasesConColor.includes(clase));
            const tieneClaseNegra = clases.some(clase => clasesNegro.includes(clase));
            const tieneColorRojoEnStyle = coloresRojos.some(color => new RegExp(`color\\s*:\\s*${color}\\b`, 'i').test(style));

            if (
               (tieneClaseRoja && !tieneColorRojoEnStyle) ||
               (!tieneClaseRoja && tieneColorRojoEnStyle) ||
               (!clases.length && tieneColorRojoEnStyle) ||
               (clasesConColor.includes(element.tagName.toLowerCase()) && !tieneColorRojoEnStyle) ||
               (clasesNegro.includes(element.tagName.toLowerCase()) && tieneColorRojoEnStyle)
            ) {
               eliminarEtiqueta($, element);
            }
      }
   });

   // Elimina imágenes con archivos faltantes
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

   modificarTextoRespuesta($);
   eliminarLineasEnBlanco($);
   procesarLineasRepetidasYReemplazo($);

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
