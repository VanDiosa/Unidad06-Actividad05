let currentPageData = {
    x: window.screenX,
    y: window.screenY,
    width: window.innerWidth,
    height: window.innerHeight
}

let previousPageData = {
    x: window.screenX,
    y: window.screenY,
    width: window.innerWidth,
    height: window.innerHeight
};

let remotePageData = { x: 0, y: 0, width: 100, height: 100 };
let point1 = [currentPageData.width / 2, currentPageData.height / 2];
let socket;
let isConnected = false;
let hasRemoteData = false;
let isFullySynced = false;
let connectionTimeout;

function setup() {
    createCanvas(windowWidth, windowHeight);
    frameRate(60);
    socket = io();

    socket.on('connect', () => {
        console.log('Connected with ID:', socket.id);
        isConnected = true;
        socket.emit('win1update', currentPageData, socket.id);
        
        // Solicitar sincronización después de un breve delay
        setTimeout(() => {
            socket.emit('requestSync');
        }, 500);
    });

    socket.on('getdata', (response) => {
        if (response && response.data && isValidRemoteData(response.data)) {
            remotePageData = response.data;
            hasRemoteData = true;
            console.log('Received valid remote data:', remotePageData);
            socket.emit('confirmSync');
        }
    });

    socket.on('fullySynced', (synced) => {
        isFullySynced = synced;
        console.log('Sync status:', synced ? 'SYNCED' : 'NOT SYNCED');
    });

    socket.on('peerDisconnected', () => {
        hasRemoteData = false;
        isFullySynced = false;
        console.log('Peer disconnected, waiting for reconnection...');
    });

    socket.on('disconnect', () => {
        isConnected = false;
        hasRemoteData = false;
        isFullySynced = false;
        console.log('Disconnected from server');
    });
}

function isValidRemoteData(data) {
    return data && 
           typeof data.x === 'number' && 
           typeof data.y === 'number' && 
           typeof data.width === 'number' && data.width > 0 &&
           typeof data.height === 'number' && data.height > 0;
}

function checkWindowPosition() {
    currentPageData = {
        x: window.screenX,
        y: window.screenY,
        width: window.innerWidth,
        height: window.innerHeight
    };

    if (currentPageData.x !== previousPageData.x || currentPageData.y !== previousPageData.y || 
        currentPageData.width !== previousPageData.width || currentPageData.height !== previousPageData.height) {

        point1 = [currentPageData.width / 2, currentPageData.height / 2]
        socket.emit('win1update', currentPageData, socket.id);
        previousPageData = currentPageData;
    }
}


function draw() {
    background(220);
    
    if (!isConnected) {
        showStatus('Conectando al servidor...', color(255, 165, 0));
        return;
    }
    
    if (!hasRemoteData) {
        showStatus('Esperando conexión de la otra ventana...', color(255, 165, 0));
        return;
    }
    
    if (!isFullySynced) {
        showStatus('Sincronizando datos...', color(255, 165, 0));
        return;
    }

    // Solo dibujar cuando esté completamente sincronizado
    drawCircle(point1[0], point1[1]);
    checkWindowPosition();
    
    let vector1 = createVector(currentPageData.x, currentPageData.y);
    let vector2 = createVector(remotePageData.x, remotePageData.y);
    let resultingVector = createVector(vector2.x - vector1.x, vector2.y - vector1.y);
    
    stroke(50);
    strokeWeight(20);
    drawCircle(resultingVector.x + remotePageData.width / 2, resultingVector.y + remotePageData.height / 2);
    line(point1[0], point1[1], resultingVector.x + remotePageData.width / 2, resultingVector.y + remotePageData.height / 2);
}

function showStatus(message, statusColor) {
    textSize(24);
    textAlign(CENTER, CENTER);
    noStroke();
    // Dibujar rectángulo de fondo para el texto
    fill(0, 0, 0, 150); // Negro semi-transparente
    rectMode(CENTER);
    let textW = textWidth(message) + 40;
    let textH = 40;
    rect(width / 2, 1*height / 6, textW, textH, 10);
    // Dibujar el texto
    fill(statusColor);
    text(message, width / 2, 1*height / 6);
}

function drawCircle(x, y) {
    fill(255, 0, 0);
    ellipse(x, y, 150, 150);
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}
