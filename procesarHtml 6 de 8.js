const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Define los colores que se deben eliminar
const coloresParaEliminar = ['#F00', '#EF403C']; // Agrega aquí todos los colores que quieres eliminar

// Obtiene solo las clases con el color específico
function obtenerClasesConColor(document) {
    const clasesABorrar = [];
    const styleTags = document.querySelectorAll('style');

    styleTags.forEach(tag => {
        const cssText = tag.textContent;
        coloresParaEliminar.forEach(color => {
            const regex = new RegExp(`\\.([\\w-]+)\\s*{[^}]*color\\s*:\\s*${color};[^}]*}`, 'g');
            let match;
            while ((match = regex.exec(cssText)) !== null) {
                clasesABorrar.push(match[1]);
            }
        });
    });

    console.log('Clases con color:', clasesABorrar); // Agregado para depuración
    return clasesABorrar;
}

// Obtiene solo las etiquetas con el color específico
function obtenerEtiquetasConColor(document) {
    const etiquetasABorrar = [];
    const styleTags = document.querySelectorAll('style');

    styleTags.forEach(tag => {
        const cssText = tag.textContent;
        coloresParaEliminar.forEach(color => {
            const regex = new RegExp(`(?:^|[^.])\\b([a-zA-Z]+)\\b\\s*{[^}]*color\\s*:\\s*${color};[^}]*}`, 'g');
            let match;
            while ((match = regex.exec(cssText)) !== null) {
                if (match[1]) {
                    etiquetasABorrar.push(match[1]);
                }
            }
        });
    });

    console.log('Etiquetas con color:', etiquetasABorrar); // Agregado para depuración
    return etiquetasABorrar;
}

// Obtiene clases y etiquetas cuando ambos están presentes en la misma regla CSS
function obtenerClasesYEtiquetasConColor(document) {
    const clasesYEtiquetasABorrar = [];
    const styleTags = document.querySelectorAll('style');

    styleTags.forEach(tag => {
        const cssText = tag.textContent;
        coloresParaEliminar.forEach(color => {
            // Regex para encontrar todas las clases y etiquetas con color específico
            const regex = new RegExp(
                `([\\w-]+|[a-zA-Z]+)\\s*,?\\s*([\\w-]+|[a-zA-Z]+)?\\s*{[^}]*color\\s*:\\s*${color};[^}]*}`, 
                'g'
            );
            let match;
            while ((match = regex.exec(cssText)) !== null) {
                // Captura las clases y etiquetas, pero excluye las clases con la estructura .s#
                const [first, second] = [match[1], match[2]];
                
                if (first && !/^s\d{1,2}$/.test(first)) {
                    clasesYEtiquetasABorrar.push(first);
                }
                if (second && second !== first && !/^s\d{1,2}$/.test(second)) {
                    clasesYEtiquetasABorrar.push(second);
                }
            }
        });
    });

    console.log('Clases y Etiquetas con color (en combinación):', clasesYEtiquetasABorrar); // Agregado para depuración
    return clasesYEtiquetasABorrar;
}

function eliminarEtiquetasYClasesConColor(document) {
    const clasesYEtiquetasABorrar = obtenerClasesYEtiquetasConColor(document);
    const etiquetasConColor = obtenerEtiquetasConColor(document);

    console.log('Clases con color:', clasesYEtiquetasABorrar);
    console.log('Etiquetas con color:', etiquetasConColor);

    // Elimina las etiquetas con clases especificadas si ninguna de las clases es excluida
    document.querySelectorAll('[class]').forEach(tag => {
        const classes = tag.className.split(' ');
        const classesToDelete = classes.filter(clase => clasesYEtiquetasABorrar.includes(clase));
        if (classesToDelete.length > 0 && !classes.some(clase => !clasesYEtiquetasABorrar.includes(clase))) {
            tag.remove();
        }
    });

    // Elimina las etiquetas con nombres especificados en estilos en el head
    document.querySelectorAll('*').forEach(tag => {
        const tagName = tag.tagName.toLowerCase();
        if (etiquetasConColor.includes(tagName) && !tag.classList.some(clase => !clasesYEtiquetasABorrar.includes(clase))) {
            tag.remove();
        }
    });

    // Elimina las etiquetas con estilos en línea con colores predefinidos
    document.querySelectorAll('[style]').forEach(tag => {
        const style = tag.getAttribute('style');
        coloresParaEliminar.forEach(color => {
            if (style.includes(`color: ${color}`)) {
                // Verifica si la etiqueta tiene una clase no incluida en la lista de clases a eliminar
                const classes = tag.className.split(' ');
                if (classes.every(clase => clasesYEtiquetasABorrar.includes(clase))) {
                    tag.remove();
                }
            }
        });
    });
}

// Función para eliminar etiquetas repetidas y combinaciones específicas
function eliminarLineasRepetidas(html) {
    // Elimina combinaciones de etiquetas específicas
    const regex = /(\s*<p\s+style="text-indent:\s*0pt;\s*text-align:\s*left;"><br\s*\/?><\/p>\s*){2,}/g;
    html = html.replace(regex, match => {
        return match.trim().split('\n').slice(0, 1).join('\n');
    });

    // Reduce combinaciones de líneas que incluyen <p style="text-indent: 0pt;text-align: left;"></p>
    const regexCombo = /(\s*<p\s+style="text-indent:\s*0pt;\s*text-align:\s*left;"><br\s*\/?><\/p>\s*){1,}(\s*<p\s+style="text-indent:\s*0pt;\s*text-align:\s*left;"><\/p>\s*){1,}/g;
    html = html.replace(regexCombo, '<p style="text-indent: 0pt;text-align: left;"><br></p>');

    return html;
}

// Función para eliminar las líneas con <img> en las primeras 5 líneas dentro del body
function eliminarLineasImgEnBody(html) {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const body = document.querySelector('body');
    if (body) {
        const lines = body.innerHTML.split('\n');
        const linesToKeep = [];
        let imgCount = 0;

        for (let i = 0; i < lines.length; i++) {
            if (i < 5 && lines[i].includes('<img')) {
                imgCount++;
            } else {
                linesToKeep.push(lines[i]);
            }
        }

        if (imgCount > 0) {
            body.innerHTML = linesToKeep.join('\n');
        }
    }

    return dom.serialize();
}

function procesarHtml(rutaArchivo, callback) {
    // Lee el archivo HTML
    fs.readFile(rutaArchivo, 'utf8', (err, html) => {
        if (err) {
            console.error('Error al leer el archivo:', err);
            return;
        }

        // Analiza el HTML
        const dom = new JSDOM(html);
        const document = dom.window.document;

        // Elimina las etiquetas y clases con colores específicos
        eliminarEtiquetasYClasesConColor(document);

        // Elimina las líneas vacías y las combinaciones de etiquetas específicas
        let updatedHtml = document.documentElement.outerHTML;
        updatedHtml = updatedHtml.replace(/^\s*[\r\n]/gm, '');
        updatedHtml = eliminarLineasRepetidas(updatedHtml);

        // Elimina las líneas que contienen <img> en las primeras 5 líneas dentro del body
        updatedHtml = eliminarLineasImgEnBody(updatedHtml);

        // Guarda el HTML modificado
        fs.writeFile(rutaArchivo, updatedHtml, 'utf8', err => {
            if (err) {
                console.error('Error al escribir el archivo:', err);
            } else {
                console.log(`Archivo procesado con éxito: ${rutaArchivo}`);
            }
            // Llama al callback para continuar con el siguiente archivo
            if (callback) callback();
        });
    });
}

function procesarCarpeta(carpeta) {
    fs.readdir(carpeta, (err, files) => {
        if (err) {
            console.error('Error al leer la carpeta:', err);
            return;
        }

        let index = 0;

        function procesarSiguienteArchivo() {
            if (index >= files.length) return;

            const file = files[index++];
            const rutaArchivo = path.join(carpeta, file);

            if (path.extname(rutaArchivo) === '.html') {
                procesarHtml(rutaArchivo, procesarSiguienteArchivo);
            } else {
                procesarSiguienteArchivo();
            }
        }

        procesarSiguienteArchivo();
    });
}

// Especifica la ruta de la carpeta
const rutaCarpeta = 'parcialesABlanquear';
procesarCarpeta(rutaCarpeta);
