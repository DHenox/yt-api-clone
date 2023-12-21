// Función para cambiar el modo de búsqueda
function toggleSearchMode() {
    const searchButton = document.getElementById("search-button");

    // Cambia entre los modos "videos", "channels" y "video by ID"
    switch (searchButton.dataset.mode) {
        case "video":
            searchButton.dataset.mode = "channel";
            searchButton.innerHTML = "Searching for channels";
            break;
        case "channel":
            searchButton.dataset.mode = "id";
            searchButton.innerHTML = "Search video by ID";
            break;
        case "id":
            searchButton.dataset.mode = "video";
            searchButton.innerHTML = "Searching for videos";
            break;
        default:
            break;
    }
}

// Se ejecuta updateView() cuando se modifican los inputs de búsqueda
document.getElementById("search-input").addEventListener("input", updateView);
document.getElementById("max-results").addEventListener("input", updateView);

// Función para gestionar el tipo de búsqueda y actualizar la vista
function updateView() {
    const searchButton = document.getElementById("search-button");

    // Obtén el valor del input y del número máximo de resultados
    var searchTerm = document.getElementById("search-input").value;
    var maxResults = document.getElementById("max-results").value;

    // Realiza la solicitud al servidor Express según el modo de búsqueda actual
    if (searchButton.dataset.mode === "id") {
        // Realiza la solicitud al servidor Express para el recurso "videos"
        renderVideoById(searchTerm);
    } else {
        // Realiza la solicitud al servidor Express para el recurso "search"
        renderSearchResults(searchTerm, maxResults, searchButton.dataset.mode);
    }
}

// Función para realizar la solicitud al servidor Express para el recurso "videos"
async function renderVideoById(videoId) {
    try {
        // Realiza la solicitud GET al servidor Express
        const response = await fetch(`/videos?id=${videoId}`);
        const data = await response.json();

        //console.log(data.items);

        // Mostramos los resultados de la busqueda
        document.getElementById("search-results").innerHTML = await Promise.all(data.items.map(
            async item => {
                return `
                    <div class="video-container">
                        <h2>${item.snippet.title}</h2>
                        <p>${item.snippet.description}</p>
                        <iframe src="https://www.youtube.com/embed/${item.id.videoId}" frameborder="0" allowfullscreen></iframe>
                        <button onclick="showComments('${item.id.videoId}')" class="btn btn-dark mt-3">View Comments</button>
                    </div>
                `;
            }
        ));
    } catch (error) {
        console.error("Error al realizar la solicitud al servidor Express:", error);
    }
}

// Función para realizar la solicitud al servidor Express para el recurso "search"
async function renderSearchResults(searchTerm, maxResults, searchType) { 
    try {
        // Realiza la solicitud GET al servidor Express
        const response = await fetch(`/search?q=${searchTerm}&maxResults=${maxResults}`);
        const data = await response.json();

        console.log(data);

        // Insertar código aquí para mostrar los resultados en la página
        document.getElementById("search-results").innerHTML = await Promise.all(data.items.map(
            async item => {
                if (searchType === "video") {
                    return `
                        <div class="video-container">
                            <h2>${item.snippet.title}</h2>
                            <p>${item.snippet.description}</p>
                            <iframe src="https://www.youtube.com/embed/${item.id.videoId}" frameborder="0" allowfullscreen></iframe>
                            <button onclick="showComments('${item.id.videoId}')" class="btn btn-dark mt-3">View Comments</button>
                        </div>
                    `;
                }
                else if(searchType === "channel") {
                    const subscribers = await getChannelSubscribers(item.snippet.channelId);
                    return `
                        <div class="channel-container">
                            <img src="${item.snippet.thumbnails.default.url}" alt="Channel Logo" class="channel-logo">
                            <div class="channel-info">
                                <h2>${item.snippet.title}</h2>
                                <p>${item.snippet.description}</p>
                                <p>Subscribers: ${subscribers}</p>
                            </div>
                        </div>
                    `;
                }
            }
        ));
    } catch (error) {
        console.error("Error al realizar la solicitud al servidor Express:", error);
    }
}

// Función para obtener el número de suscriptores de un canal
function getChannelSubscribers(channelId) {
    // Realiza la solicitud GET al servidor Express
    return fetch(`/channels?id=${channelId}`)
        .then(response => response.json())
        .then(data => {
            // Verifica si se obtuvieron estadísticas y devuelve el número de suscriptores
            if (data.items && data.items.length > 0 && data.items[0].statistics.subscriberCount) {
                return data.items[0].statistics.subscriberCount;
            } else {
                return 'No data';
            }
        })
        .catch(error => {
            console.error("Error al realizar la solicitud para obtener estadísticas del canal:", error);
            return 'Error';
        });
}

// Función para cargar y mostrar comentarios en un modal
async function showComments(videoId) {
    try {
        // Realiza la solicitud GET al servidor Express
        const response = await fetch(`/comments?id=${videoId}`);
        const data = await response.json();

        if (data.error && data.error.errors && data.error.errors.length > 0) {
            const errorReason = data.error.errors[0].reason;
            if (errorReason === 'commentsDisabled') {
                console.log('Los comentarios están deshabilitados para este video.');
                // Puedes mostrar un mensaje al usuario o tomar otra acción según tus necesidades.
                return;
            }
        }

        // Construye el contenido del modal con los comentarios
        const modalBody = document.getElementById("commentsModalBody");
        modalBody.innerHTML = data.items.map(comment => `
            <p><strong>${comment.snippet.topLevelComment.snippet.authorDisplayName}:</strong> ${comment.snippet.topLevelComment.snippet.textOriginal}</p>
        `).join('');

        // Muestra el modal
        var commentsModal = new bootstrap.Modal(document.getElementById('commentsModal'));
        commentsModal.show();
    } catch (error) {
        console.error("Error al cargar los comentarios del video:", error);
    }
}