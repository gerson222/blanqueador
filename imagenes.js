const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const Color = require('color');

// Lista de colores rojos en RGB y hexadecimal
const coloresRojos = [
  '#FF0000', '#FF6347', '#FF4500', '#FE7E7E', '#FFBFBF', '#FE1818', '#ff3333', // hexadecimal
  'rgb(255, 0, 0)', 'rgb(255, 99, 71)', 'rgb(255, 69, 0)' // RGB
];

// Convertir colores a un formato uniforme (RGB)
const coloresRojosRGB = coloresRojos.map(color => Color(color).rgb().array());

// Función para verificar si un color está en la lista de colores rojos
function esColorRojo(color) {
  const [r, g, b] = color;
  return coloresRojosRGB.some(([cr, cg, cb]) => {
    // Verifica si el color está dentro de un rango cercano al rojo
    const tolerancia = 20;
    return (
      Math.abs(r - cr) <= tolerancia &&
      Math.abs(g - cg) <= tolerancia &&
      Math.abs(b - cb) <= tolerancia
    );
  });
}

// Función para calcular el porcentaje de un color en función de los píxeles con color
function calcularPorcentaje(pixeles, totalColorPixels) {
  return (pixeles / totalColorPixels) * 100;
}

// Función para analizar la imagen
function analizarImagen(filePath) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(new PNG())
      .on('parsed', function() {
        let totalColorPixels = 0;
        let colorCount = new Map();
        let coloresRojosEncontrados = new Map();

        for (let y = 0; y < this.height; y++) {
          for (let x = 0; x < this.width; x++) {
            const idx = (this.width * y + x) << 2;
            const r = this.data[idx];
            const g = this.data[idx + 1];
            const b = this.data[idx + 2];
            const alpha = this.data[idx + 3];
            
            if (alpha > 0) { // Considerar solo píxeles con color (no completamente transparentes)
              const color = [r, g, b].toString();
              
              // Contar todos los colores presentes en la imagen
              if (colorCount.has(color)) {
                colorCount.set(color, colorCount.get(color) + 1);
              } else {
                colorCount.set(color, 1);
              }

              totalColorPixels++;
            }
          }
        }

        // Evaluar porcentajes para colores en la lista de colores rojos
        colorCount.forEach((count, color) => {
          const [r, g, b] = color.split(',').map(Number);
          const porcentaje = calcularPorcentaje(count, totalColorPixels);
          
          if (coloresRojosRGB.some(([cr, cg, cb]) => r === cr && g === cg && b === cb)) {
            coloresRojosEncontrados.set(color, porcentaje);
          } else if (esColorRojo([r, g, b])) {
            coloresRojosEncontrados.set(color, porcentaje);
          }
        });

        // Sumar porcentajes de todos los colores rojos encontrados
        const porcentajeTotalRojo = Array.from(coloresRojosEncontrados.values())
                                        .reduce((acc, curr) => acc + curr, 0);
        
        resolve({
          imagen: path.basename(filePath),
          porcentajeTotalRojo: porcentajeTotalRojo.toFixed(2)
        });
      })
      .on('error', reject);
  });
}

// Función para mover una imagen a una carpeta
function moverImagen(filePath, carpetaDestino) {
  const nombreArchivo = path.basename(filePath);
  const rutaDestino = path.join(carpetaDestino, nombreArchivo);

  fs.rename(filePath, rutaDestino, (err) => {
    if (err) {
      console.error(`Error moviendo el archivo ${nombreArchivo}: ${err.message}`);
    } else {
      console.log(`Imagen movida: ${nombreArchivo}`);
    }
  });
}

// Función para evaluar todos los archivos PNG en una carpeta
function evaluarCarpeta(carpeta) {
  const carpetaDestino = path.join(carpeta, 'rojo');
  
  // Crear la carpeta destino si no existe
  if (!fs.existsSync(carpetaDestino)) {
    fs.mkdirSync(carpetaDestino);
  }

  let imagenesMovidas = 0;
  let imagenesNoMovidas = 0;

  fs.readdir(carpeta, (err, files) => {
    if (err) {
      console.error(`Error leyendo la carpeta: ${err.message}`);
      return;
    }

    const imagenes = files.filter(file => path.extname(file).toLowerCase() === '.png');
    const promesas = imagenes.map(file => {
      const filePath = path.join(carpeta, file);
      return analizarImagen(filePath).then(({ imagen, porcentajeTotalRojo }) => {
        console.log(`Imagen: ${imagen} - Porcentaje total de color rojo: ${porcentajeTotalRojo}%`);
        
        if (parseFloat(porcentajeTotalRojo) > 60) {
          moverImagen(filePath, carpetaDestino);
          imagenesMovidas++;
        } else {
          imagenesNoMovidas++;
        }
      }).catch(console.error);
    });

    // Esperar a que se resuelvan todas las promesas
    Promise.all(promesas).then(() => {
      console.log(`Total de imágenes movidas: ${imagenesMovidas}`);
      console.log(`Total de imágenes no movidas: ${imagenesNoMovidas}`);
    });
  });
}

// Carpeta que contiene las imágenes PNG
const carpetaImagenes = 'base';
evaluarCarpeta(carpetaImagenes);
