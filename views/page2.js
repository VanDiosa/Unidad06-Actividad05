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
let point2 = [currentPageData.width / 2, currentPageData.height / 2];
let socket;
let isConnected = false;
let hasRemoteData = false;
let isFullySynced = false;
let connectionTimeout;

//cadenas de efectos visuales
let particles = [];
let explosionParticles = [];
let shockwaves = [];   

//estado de la colision
let wasColliding = false;

function setup() {
    createCanvas(windowWidth, windowHeight);
    frameRate(60);
    socket = io();

    socket.on('connect', () => {
        console.log('Connected with ID:', socket.id);
        isConnected = true;
        socket.emit('win2update', currentPageData, socket.id);
        
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

        point2 = [currentPageData.width / 2, currentPageData.height / 2]
        socket.emit('win2update', currentPageData, socket.id);
        previousPageData = currentPageData; 
    }
}

//funcion para q los objetos sean corazones
function drawHeart(x, y, size, col) {
    push();
    translate(x, y - size/3);
    fill(col);
    noStroke();
    beginShape();
    vertex(0, size / 4);
    bezierVertex(size / 2, -size / 2, size, size / 3, 0, size);
    bezierVertex(-size, size / 3, -size / 2, -size / 2, 0, size / 4);
    endShape(CLOSE);
    pop();
}

//particulas
function spawnParticles(x, y, type = "aura", targetX = 0, targetY = 0) {
    if (type === "aura") {
        for (let i = 0; i < 2; i++) {
            let angle = random(TWO_PI);
            let r = random(40, 80);
            particles.push({
                x: x + cos(angle) * r,
                y: y + sin(angle) * r,
                size: random(2, 5),
                life: 200
            });
        }
    } else if (type === "connection") {
        for (let i = 0; i < 3; i++) {
            let t = random();
            let px = lerp(x, targetX, t) + random(-10, 10);
            let py = lerp(y, targetY, t) + random(-10, 10);
            particles.push({ x: px, y: py, size: random(2, 5), life: 200 });
        }
    }
}

function triggerShockwave(x, y) {
    shockwaves.push({ x, y, r: 0, alpha: 255 });
}

function handleParticles() {
    // aura + conexión
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        fill(255, 220, 100, p.life);
        noStroke();
        ellipse(p.x, p.y, p.size);
        p.life -= 3;
        if (p.life <= 0) particles.splice(i, 1);
    }

    // explosiones
    for (let i = explosionParticles.length - 1; i >= 0; i--) {
        let p = explosionParticles[i];
        fill(red(p.col), green(p.col), blue(p.col), p.life);
        noStroke();
        ellipse(p.x, p.y, p.size);
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 5;
        if (p.life <= 0) explosionParticles.splice(i, 1);
    }

    // ondas expansivas
    for (let i = shockwaves.length - 1; i >= 0; i--) {
        let s = shockwaves[i];
        noFill();
        stroke(255, 230, 120, s.alpha);
        strokeWeight(3);
        ellipse(s.x, s.y, s.r * 2);
        s.r += 6;
        s.alpha -= 6;
        if (s.alpha <= 0) shockwaves.splice(i, 1);
    }
}

function draw() {
    //mensajes de estado
    if (!isConnected) {
    showStatus('Buscando latidos…', color(255)); 
    return;
    }

    if (!hasRemoteData) {
        showStatus('Esperando al otro corazón…', color(255));
        return;
    }

    if (!isFullySynced) {
        showStatus('Entrelazando latidos…', color(255,));
        return;
    }

    checkWindowPosition();
    
     //calcular posicion del corazon remoto
    let remoteX = map(remotePageData.x + remotePageData.width / 2, currentPageData.x, currentPageData.x + currentPageData.width, 0, width);
    let remoteY = map(remotePageData.y + remotePageData.height / 2, currentPageData.y, currentPageData.y + currentPageData.height, 0, height);
    
    //distancia entre corazones
    let distBetween = dist(point2[0], point2[1], remoteX, remoteY);

    //fondo gris que se vuelve rojo
    let bgCol = lerpColor(color(80), color(200, 0, 0), map(distBetween, 800, 0, 0, 1, true));
    background(bgCol);

    //tamaño con efecto de palpitar
    let pulse = sin(frameCount * 0.15) * 6;
    let baseSize = map(distBetween, 800, 0, 50, 200, true);
    let currentSize = baseSize + pulse;

    //dibujar corazones
    drawHeart(point2[0], point2[1], currentSize, color(255));
    drawHeart(remoteX, remoteY, currentSize, color(0));

    // partículas aura + conexión con menos frecuencia
    if (frameCount % 2 === 0) {
        spawnParticles(point2[0], point2[1], "aura");
        spawnParticles(remoteX, remoteY, "aura");
    }
    if (frameCount % 4 === 0) {
        spawnParticles(point2[0], point2[1], "connection", remoteX, remoteY);
    }

    handleParticles();

    let colliding = distBetween < 50;

    //mientras esten colisionando, siguen generando ondas expansivas
    if (colliding) {
        if (frameCount % 15 === 0) {
            triggerShockwave((point2[0] + remoteX) / 2, (point2[1] + remoteY) / 2);
        }
    }

    wasColliding = colliding;
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