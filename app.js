var express = require('express');
const OAuth2Data = require('./credentials.json');   // Credenciales OAuth para la API de YouTube
const { google } = require('googleapis');           // Módulo de Google para acceder a sus APIs
const multer = require('multer');                   // Módulo para subir archivos
const fs = require('fs');
const API_KEY = require('./config/api_key.js');     // API key para la API de YouTube Data

var app = express();

// view engine setup
app.set('view engine', 'ejs');

app.use(express.static('public'));


// Configuramos las credenciales obtenidas de la consola de desarrolladores de Google
const CLIENT_ID = OAuth2Data.web.client_id;
const CLIENT_SECRET = OAuth2Data.web.client_secret;
const REDIRECT_URL = OAuth2Data.web.redirect_uris[0];

const oAuth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URL
);

// Configramos multer para subir el video
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './videos')
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
});

// Configuramos la API de YouTube
const youtube = google.youtube({
    auth: oAuth2Client,
    version: 'v3'
});

var upload = multer({ storage: storage }).single('video');

var authenticated = false
var url = "";
var name = "";
var picture = "";

// Permiso para subir video y para obtener info del usuario(nombre, foto de perfil...)
var scopes = "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/userinfo.profile"

// Ruta para renderizar la página principal
app.get('/', (req, res) => {
    if(!authenticated) {
        // Si no estamos autenticados, iniciamos el proceso de autenticación

        // URL de autorización
        url = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes
        });
        res.render('index', { title: 'YouTube 2', url: url, authenticated: authenticated, name: name, picture: picture});
    }
    else {
        // Si estamos autenticados, renderizamos la página principal

        // Configuramos OAuth2
        var oauth2 = google.oauth2({
            auth: oAuth2Client,
            version: 'v2'
        });

        // Obtenemos la información del usuario
        oauth2.userinfo.get( function(err, res) {
            if (err) throw err;
            
            console.log(res.data);
            name = res.data.name;
            picture = res.data.picture;
        });

        res.render('index', { title: 'YouTube 2', url: url, authenticated: authenticated, name: name, picture: picture});
    }
});

// Ruta para obtener el código de autorización y generar el token
app.get('/google/callback', (req, res) => {
    // Obtenemos token a partir del código de autorización
    const code = req.query.code;

    if(code){
    oAuth2Client.getToken(code, function(err, tokens) {
        if(err) throw err;
        
        oAuth2Client.setCredentials(tokens);
        authenticated = true;
        console.log("Autenticación correcta");

        res.redirect('/');
    });
    }
});

// RUTAS PARA LLAMADAS A LA API DE YOUTUBE
app.post('/upload', (req, res) => {
    upload(req, res, function (err, data) {
        if(err) throw err;

        // Obtenemos la ruta del archivo
        let filePath = req.file.path;
        console.log(filePath);

        // Obtenemos los datos del formulario
        title = req.body.title;
        description = req.body.description;
        tags = req.body.tags.split(',');
        privacy = req.body.privacy;

        // Realizamos la solicitud POST para subir el video
        const response = youtube.videos.insert({
            part: 'snippet, status',
            notifySubscribers: false,
            requestBody: {
            snippet: {
                title: title,
                description: description,
                tags: tags
            },
            status: {
                privacyStatus: privacy
            }
            },
            media: {
            body: fs.createReadStream(filePath)
            }
        }, (err, data) => {
            if(err) throw err;

            console.log(data.data);
            console.log("Video subido correctamente")

            // Eliminamos el archivo del servidor
            fs.unlinkSync(filePath);

            res.redirect('/');
        });
    })
});

app.get('/search', async (req, res) => {
    const searchTerm = req.query.q;
    const maxResults = req.query.maxResults || 10;

    // Construir la URL de la solicitud a la API de YouTube
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${maxResults}&q=${searchTerm}&key=${API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error al realizar la solicitud GET al recurso search de la API de YouTube:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/channels', async (req, res) => {
    const channelId = req.query.id;

    // Construir la URL de la solicitud a la API de YouTube para obtener detalles del canal por ID
    const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error al realizar la solicitud GET al recurso channel de la API de YouTube:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/videos', async (req, res) => {
    const videoId = req.query.id;

    // Construir la URL de la solicitud a la API de YouTube para obtener detalles del video por ID
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error al realizar la solicitud GET al recurso videos de la API de YouTube:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/comments', async (req, res) => {
    const videoId = req.query.id;

    // Construir la URL de la solicitud a la API de YouTube para obtener detalles del video por ID
    const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&key=${API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error al realizar la solicitud a la API de YouTube para obtener comentarios del video por ID:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = app;
