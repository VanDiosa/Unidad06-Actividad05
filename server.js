const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const app = express();
const server = http.createServer(app); 
const io = socketIO(server); 
const port = 3000;

let page1 = { x: 0, y: 0, width: 100, height: 100 };
let page2 = { x: 0, y: 0, width: 100, height: 100 };
let connectedClients = new Map();
let syncedClients = new Set();

app.use(express.static(path.join(__dirname, 'views')));

app.get('/page1', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'page1.html'));
});

app.get('/page2', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'page2.html'));
});

io.on('connection', (socket) => {
    console.log('A user connected - ID:', socket.id);
    connectedClients.set(socket.id, { page: null, synced: false });
    
    socket.on('disconnect', () => {
        console.log('User disconnected - ID:', socket.id);
        connectedClients.delete(socket.id);
        syncedClients.delete(socket.id);
        // Notificar a otros clientes que se perdió la sincronización
        socket.broadcast.emit('peerDisconnected');
    });

    socket.on('win1update', (window1, sendid) => {
        console.log('Received win1update from ID:', socket.id, 'Data:', window1);
        if (isValidWindowData(window1)) {
            page1 = window1;
            connectedClients.set(socket.id, { page: 'page1', synced: false });
            socket.broadcast.emit('getdata', { data: page1, from: 'page1' });
            checkAndNotifySyncStatus();
        }
    });

    socket.on('win2update', (window2, sendid) => {
        console.log('Received win2update from ID:', socket.id, 'Data:', window2);
        if (isValidWindowData(window2)) {
            page2 = window2;
            connectedClients.set(socket.id, { page: 'page2', synced: false });
            socket.broadcast.emit('getdata', { data: page2, from: 'page2' });
            checkAndNotifySyncStatus();
        }
    });

    socket.on('requestSync', () => {
        const clientInfo = connectedClients.get(socket.id);
        if (clientInfo?.page === 'page1') {
            socket.emit('getdata', { data: page2, from: 'page2' });
        } else if (clientInfo?.page === 'page2') {
            socket.emit('getdata', { data: page1, from: 'page1' });
        }
    });

    socket.on('confirmSync', () => {
        syncedClients.add(socket.id);
        const clientInfo = connectedClients.get(socket.id);
        if (clientInfo) {
            connectedClients.set(socket.id, { ...clientInfo, synced: true });
        }
        checkAndNotifySyncStatus();
    });    
});

function isValidWindowData(data) {
    return data && 
           typeof data.x === 'number' && 
           typeof data.y === 'number' && 
           typeof data.width === 'number' && data.width > 0 &&
           typeof data.height === 'number' && data.height > 0;
}

function checkAndNotifySyncStatus() {
    const page1Clients = Array.from(connectedClients.entries()).filter(([id, info]) => info.page === 'page1');
    const page2Clients = Array.from(connectedClients.entries()).filter(([id, info]) => info.page === 'page2');
    
    const bothPagesConnected = page1Clients.length > 0 && page2Clients.length > 0;
    const allClientsSynced = Array.from(connectedClients.keys()).every(id => syncedClients.has(id));
    const hasMinimumClients = connectedClients.size >= 2;

    console.log(`Debug - Connected clients: ${connectedClients.size}, Page1: ${page1Clients.length}, Page2: ${page2Clients.length}, Synced: ${syncedClients.size}`);

    
    if (bothPagesConnected && allClientsSynced && hasMinimumClients) {
        io.emit('fullySynced', true);
        console.log('All clients are fully synced');
    } else {
        io.emit('fullySynced', false);
        console.log(`Sync status: pages=${bothPagesConnected}, synced=${allClientsSynced}, clients=${connectedClients.size}`);
    }
}

server.listen(port, () => {
    console.log(`Server is listening on http://localhost:${port}`);
});
