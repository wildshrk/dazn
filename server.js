const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const express = require('express');
const app = express();
const port = 8000; // Puerto en el que se sirve el archivo

// Servir archivos estáticos
app.use(express.static('public')); // Supongamos que index.html está en la carpeta 'public'

// Configuración de CORS
const corsOptions = {
  origin: 'http://localhost:8000', // Asegúrate de que esto coincida con el puerto de tu cliente
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
};


// Habilitar CORS para todas las rutas
app.use(cors(corsOptions));


//INDEX HTML NO PROBLEMAS DE CORS?
const path = require('path');

// Servir el archivo HTML estático desde el servidor
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint adicional para servir el archivo index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


app.get('/get', async (req, res) => {
  try {
    const baseUrl = 'https://tiroalpaloes.net'; // URL base de la página que se va a recuperar
    const response = await axios.get(baseUrl);

    // Cargar el HTML con cheerio para poder seleccionarlo
    const $ = cheerio.load(response.data);

    // Crear arrays para almacenar los enunciados, enlaces y títulos
    let processedContent = [];
    let h3Titles = [];
    let genres = [];

    // PASO 1 - BUSCAR LOS TITULOS, GENEROS Y ENLACES EN SECTION
    const section = $('#section-id-1713020745456');

    // Recorrer los artículos y procesar los enunciados, géneros y enlaces
    section.find('.sppb-addon-article').each((i, element) => {
      // Encontrar el título h3 dentro del artículo
      const titleElement = $(element).find('h3 a');
      const genreElement = $(element).find('span.sppb-meta-category a[itemprop="genre"]');
      const linkElement = $(element).find('a.sppb-article-img-wrap');

      // Obtener el texto del título
      const titleText = titleElement.text().trim();
      h3Titles.push(titleText);
      console.log('Enunciado: ', titleText);

      // Obtener el género
      const genreText = genreElement.text().trim();
      genres.push(genreText);
      console.log('Género encontrado: ', genreText);

      // Obtener el enlace
      let href = linkElement.attr('href');
      if (href && !href.startsWith('http')) {
        href = new URL(href, baseUrl).href; // Convertir a enlace absoluto
      }

      // Asegurarse de que el enlace esté completo antes de agregarlo a processedContent
      if (href) {
        processedContent.push({
          text: titleText,
          href: href
        }); // Guardar el enlace en el array
        console.log('Enlace encontrado: ', href);
        console.log('----------------------------------');
      }
    });


    // PASO 2 - SI HAY DIRECTO, NOS DEVUELVE LA PAGINA DE LOS ENLACES
    console.log('Processed Content Lenght: ', processedContent.length);

    if (processedContent.length > 0) {

      let allModContent = []; // Array para almacenar los enlaces de todas las páginas de DIRECTO

      // Recorrer todos los enlaces "DIRECTO"
      for (const item of processedContent) {
        const directLink = item.href;

        try {
          // Hacer la solicitud para el enlace del "DIRECTO"
          const directResponse = await axios.get(directLink);
          
          // Cargar el HTML de la página del enlace con cheerio
          const $ = cheerio.load(directResponse.data);

          // Crear un array para almacenar los enlaces válidos
          let modContent = [];

          // Seleccionar la sección con id "cs-1528971561366"
          $('section.astroid-section.astroid-component-section.uk-margin-medium#cs-1528971561366 a').each((i, element) => {
            let link = $(element).attr('href');
            
            // Verificar si el enlace es completo (https://) y evitar imágenes y redirecciones internas
            if (link && link.startsWith('https://')) {
              modContent.push(link);
            }
          });

          // Agregar los enlaces encontrados para este enlace "DIRECTO" al array principal
          allModContent.push({
            directo: directLink,
            enlaces: modContent
          });

          console.log(`Enlaces encontrados en ${directLink}:`, modContent); // Depuración
        } catch (error) {
          console.error(`Error al procesar el enlace ${directLink}:`, error);
        }
      }

      // Devolver los enlaces de todas las páginas "DIRECTO" y los títulos h3
      res.json({
        enlaces: allModContent,
        titulos: h3Titles,
        generos: genres
      });

    } else { // No hay directos encontrados  
      let noLiveEventWarning = [];
      noLiveEventWarning.push('No live events were found. Try again later.');
      res.json({
        enlaces: [], // Enviar un JSON vacío si no se encuentran enlaces "DIRECTO"
        titulos: noLiveEventWarning, // Incluir títulos aunque no haya enlaces
        generos: []
      });
    }

  } catch (error) {
    console.error('Error al procesar la solicitud:', error);
    res.status(500).send('Error al procesar la solicitud.');
  }
});



// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
