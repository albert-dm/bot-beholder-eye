const express = require('express')
const http = require('http')
const bodyParser = require('body-parser')
var cors = require('cors')
const socketIO = require('socket.io')

// our localhost port
const port = process.env.PORT || 8080

const app = express()

app.use(cors())

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

// our server instance
const server = http.createServer(app)

// This creates our socket using the instance of the server
const io = socketIO(server)

const tracing = {};

let saveTrace = (botId, data) => {
  if (!tracing[botId]) {
    tracing[botId] = [];
  }
  tracing[botId] = [data, ...tracing[botId]].slice(0, 20);
}

app.get('/', function (req, res) {
  res.send('Server running');
})

app.post("/tracing/:botId", function (req, res) {
  let botId = req.params.botId;
  let trace = req.body;
  if (trace.elapsedMilliseconds > 7000) {
    console.warn(`${botId}: Demorando para responder. Tempo gasto: ${trace.elapsedMilliseconds}`)
  }
  if (trace.error) {
    console.error(`${botId}: Erro detectado: ${trace.error}`)
  }
  saveTrace(botId, trace);
  io.to(botId).emit("tracing", trace);
  res.send({});
});

// This is what the socket.io syntax is like, we will work this later
io.on('connection', socket => {
  console.log('User connected')
  let botId = socket.handshake.query.botid
  socket.join(botId);
  socket.emit("start", tracing[botId] || []);
  socket.on('disconnect', () => {
    console.log('user disconnected')
  })
})

server.listen(port, () => console.log(`Listening on port ${port}`))