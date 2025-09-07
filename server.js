// Importamos los módulos necesarios
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// -------------------------------------------------------------
// Configuramos Express para servir archivos estáticos desde la carpeta 'public'
// Esto permite que el navegador acceda a index.html, app.js y style.css
app.use(express.static(path.join(__dirname, 'public')));
console.log('Servidor de archivos estáticos configurado.');

let mazo = [];
const jugadores = {}; // Usaremos un objeto para guardar a los jugadores por su ID
let jugadoresConectados = 0;
const maxJugadores = 4; // Puedes ajustar este número
const cartasPorJugador = 7; // Por ejemplo, para un juego como el Chinchón
let turnoActual = 0; // Usaremos un índice para el turno

// Funciones para la lógica del juego
const crearBarajaEspanola = () => {
    const palos = ['oros', 'copas', 'espadas', 'bastos'];
    const valores = ['1', '2', '3', '4', '5', '6', '7', 'sota', 'caballo', 'rey'];
    const baraja = [];
    for (const palo of palos) {
        for (const valor of valores) {
            baraja.push({ palo, valor });
        }
    }
    return baraja;
};

const barajar = (baraja) => {
    for (let i = baraja.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [baraja[i], baraja[j]] = [baraja[j], baraja[i]];
    }
};

// -------------------------------------------------------------
// Lógica de Socket.IO
io.on('connection', (socket) => {
    console.log(`Un usuario se ha conectado: ${socket.id}`);

    // Asignamos un nuevo jugador a un slot
    if (jugadoresConectados < maxJugadores) {
      jugadores[socket.id] = { mano: [] };
      jugadoresConectados++;
      console.log(`Jugadores conectados: ${jugadoresConectados}`);

      // Si ya tenemos suficientes jugadores, iniciamos la partida
      if (jugadoresConectados === maxJugadores) {
        console.log(
          "Número máximo de jugadores alcanzado. ¡Iniciando partida!"
        );
        mazo = crearBarajaEspanola();
        barajar(mazo);

        // Repartimos las cartas a todos los jugadores
        for (let id in jugadores) {
          const mano = mazo.splice(0, cartasPorJugador);
          jugadores[id].mano = mano;
          // Enviamos las cartas a cada jugador individualmente
          io.to(id).emit("mano", mano);
        }

        // Notificamos a todos que la partida ha comenzado
        io.emit("partida_iniciada");
        // Guardamos los IDs de los jugadores para gestionar el turno
        const jugadoresOrdenados = Object.keys(jugadores);
        io.emit("turno", jugadoresOrdenados[turnoActual]); // Notificamos a todos quién empieza
      }

      // Evento para tirar una carta
      socket.on("tirar_carta", (cartaTirada) => {
        // 1. Validar el turno
        const jugadoresOrdenados = Object.keys(jugadores);
        if (socket.id !== jugadoresOrdenados[turnoActual]) {
          // Si no es su turno, no puede tirar
          socket.emit("error", "No es tu turno.");
          return;
        }

        // 2. Validar si la carta existe en su mano
        const mano = jugadores[socket.id].mano;
        const cartaIndex = mano.findIndex(
          (c) => c.palo === cartaTirada.palo && c.valor === cartaTirada.valor
        );

        if (cartaIndex !== -1) {
          // La carta existe, la quitamos de su mano
          const cartaMovida = mano.splice(cartaIndex, 1)[0];

          // 3. Notificar a todos sobre la carta tirada
          io.emit("carta_tirada", {
            carta: cartaMovida,
            jugadorId: socket.id,
          });

          // 4. Pasar el turno al siguiente jugador
          turnoActual = (turnoActual + 1) % jugadoresOrdenados.length;
          io.emit("turno", jugadoresOrdenados[turnoActual]);
        } else {
          socket.emit("error", "Esa carta no está en tu mano.");
        }
      });
    } else {
        // Manejamos el caso de que ya hay muchos jugadores
        socket.emit('error_partida', 'La partida ya está llena.');
        socket.disconnect(true);
    }

    socket.on('disconnect', () => {
        console.log(`El usuario se ha desconectado: ${socket.id}`);
        // Quita al jugador del objeto
        delete jugadores[socket.id];
        jugadoresConectados--;
    });
});

// -------------------------------------------------------------
// Iniciamos el servidor en el puerto 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
    console.log(`Abre tu navegador y ve a http://localhost:${PORT}`);
});