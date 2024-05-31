import { Client, GatewayIntentBits } from "discord.js";
import "dotenv/config";
import { Player } from "discord-player";
import buildCollection from "./src/core/build/buildCollection.js";
import loadEvents from "./src/core/build/buildEvents.js";
import reloadCommandsUpdateToSlash from "./src/core/api/CommandUpdateToSlash.js";
import { google } from "googleapis";
import express from "express";
import open from "open";

// Configuración OAuth 2.0
const oauth2Client = new google.auth.OAuth2(
  process.env.accessId,
  process.env.secretToken,
  "http://localhost:3000/oauth2callback"
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: ["https://www.googleapis.com/auth/youtube.readonly"],
});

console.log("Authorize this app by visiting this url:", authUrl);
open(authUrl);

// Inicia el servidor Express para manejar la redirección OAuth
const app = express();
const PORT = 3000;

app.get("/oauth2callback", async (req, res) => {
  const { code } = req.query;
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  res.send("Authentication successful! You can close this window.");

  // Inicia el bot de Discord aquí
  initDiscordBot(tokens.access_token);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const initDiscordBot = async (accessToken) => {
  const client = new Client({
    intents: [
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.Guilds,
    ],
  });

  client.commands = await buildCollection("commands");
  client.buttons = await buildCollection("buttons");
  client.commandMessage = await buildCollection("messages");
  client.modals = await buildCollection("modals");
  client.menu = await buildCollection("menus");

  loadEvents(client);
  reloadCommandsUpdateToSlash();

  client.login(process.env.token).then(async () => {
    console.log(`${client.user.displayName} is connect!`);
  });

  // Configuración del player con OAuth 2.0 token
  const player = new Player(client, {
    ytdlOptions: {
      filter: "audioonly", // Solo descarga el audio
      quality: "lowestaudio", // La calidad más baja de audio disponible
      highWaterMark: 1 << 18, // Tamaño del buffer a 256 KB
      dlChunkSize: 64 * 1024, // Fragmentos de descarga de 64 KB
      requestOptions: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      liveBuffer: 10000, // Tamaño del buffer para streams en vivo a 10 segundos
      begin: "0s", // Empezar desde el principio del video
    },
    quality: "low", // Calidad de streaming baja
    autoSelfDeaf: true, // Auto silenciar el bot al unirse a un canal de voz
    initialVolume: 25, // Volumen inicial al 25%
    bufferingTimeout: 2000, // Tiempo de espera para el buffering de audio a 2 segundos
    leaveOnEnd: true, // Dejar el canal de voz cuando la cola termine
    leaveOnStop: true, // Dejar el canal de voz cuando la música se detenga
    leaveOnEmpty: true, // Dejar el canal de voz si está vacío
    deafenOnJoin: true, // Auto-silenciarse al unirse a un canal de voz
  });

  // Cargar extractores
  player.extractors.loadDefault();
};
