const fs = require('fs');
const { JSDOM } = require('jsdom');

function procesarHtml(rutaArchivo) {
    // Lee el archivo HTML
    fs.readFile(rutaArchivo, 'utf8', (err, html) => {
        if (err) {
            console.error('Error al leer el archivo:', err);
            return;
        }

        // Analiza el HTML
        const dom = new JSDOM(html);
        const document = dom.window.document;

        // Lista de clases a borrar
        const clasesABorrar = [
            'h1', 'h4',
            's11', 's12', 's13', 's14', 's15', 's16', 's17', 's18', 's19', // s11 al s19
            's21', 's22', 's23', 's24', // s21 al s24
            's26', 's27',
            's31', 's33',
            's35', 's36', 's37', // s35 al s37
            's30' // nueva clase a borrar
        ];

        // Elimina todas las etiquetas con clases especificadas
        document.querySelectorAll('[class]').forEach(tag => {
            const classes = tag.className.split(' ');
            if (classes.some(clase => clasesABorrar.includes(clase))) {
                tag.remove();
            }
        });

        // Elimina las etiquetas <h1>
        document.querySelectorAll('h1').forEach(tag => {
            tag.remove();
        });

        // Elimina las etiquetas con style="color: #F00;"
        document.querySelectorAll('[style]').forEach(tag => {
            if (tag.getAttribute('style').includes('color: #F00')) {
                tag.remove();
            }
        });

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
                console.log('Archivo procesado con éxito.');
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

// Especifica la ruta del archivo HTML
const rutaArchivo = 'TEMA 2 1P2C 2022.html'; // Usa la ruta relativa o completa
procesarHtml(rutaArchivo);
