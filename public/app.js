// Conexión con el servidor de Socket.IO
const socket = io();
const mensajesDiv = document.getElementById('mensajes');
let miId = '';
let turnoActualId = '';

socket.on('connect', () => {
    miId = socket.id;
});

socket.on('turno', (jugadorId) => {
    turnoActualId = jugadorId;
    const mensaje = (miId === turnoActualId) ? '¡Es tu turno!' : 'Esperando el turno del otro jugador...';
    console.log(mensaje);
    // Opcional: podrías mostrar este mensaje en la interfaz
});

// Escuchamos el evento 'mensaje' del servidor
socket.on('mensaje', (msg) => {
    console.log('Mensaje del servidor:', msg);

    // Creamos un nuevo elemento y lo añadimos al div
    const p = document.createElement('p');
    p.textContent = msg;
    mensajesDiv.appendChild(p);
});

socket.on("mano", (mano) => {
  const manoDiv = document.createElement("div");
  mano.forEach((carta) => {
    const cartaEl = document.createElement("p");
    cartaEl.textContent = `${carta.valor} de ${carta.palo}`;
    cartaEl.classList.add("carta");

    // Aquí agregas el evento de clic
    cartaEl.addEventListener("click", () => {
      // Si es tu turno, puedes tirar la carta
      if (miId === turnoActualId) {
        console.log("Tiraste:", carta);
        socket.emit("tirar_carta", carta);
      } else {
        alert("No es tu turno.");
      }
    });
    manoDiv.appendChild(cartaEl);
  });

  mensajesDiv.appendChild(manoDiv);
});

socket.on('carta_tirada', ({ carta, jugadorId }) => {
    console.log(`El jugador ${jugadorId} tiró: ${carta.valor} de ${carta.palo}`);
    // Aquí podrías agregar lógica para mostrar la carta en el "montón" de descarte
});

// Opcional: Escuchamos el evento de inicio de partida
socket.on('partida_iniciada', () => {
    console.log('¡La partida ha comenzado!');
    const p = document.createElement('p');
    p.textContent = '¡La partida ha comenzado! Esperando a que todos reciban sus cartas...';
    mensajesDiv.appendChild(p);
});