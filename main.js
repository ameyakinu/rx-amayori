import { Client, GatewayIntentBits } from "discord.js";
import express from "express";
import "dotenv/config";
import { Player } from "discord-player";
import buildCollection from "./src/core/build/buildCollection.js";
import loadEvents from "./src/core/build/buildEvents.js";
import reloadCommandsUpdateToSlash from "./src/core/api/CommandUpdateToSlash.js";

export const client = new Client({
  intents: [
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.Guilds,
  ],
});

//! hola como estan
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

const app = new express();
const port = 3000;

// Ruta de ejemplo
app.get("/", (req, res) => {
  res.send("¡Hola, mundo!");
});

// Inicia el servidor
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});

// this is the entrypoint for discord-player based application
const player = new Player(client);

// Now, lets load all the default extractors, except 'YouTubeExtractor'. You can remove the filter if you want to load all the extractors.
await player.extractors.loadDefault();
