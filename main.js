import { Client, GatewayIntentBits } from "discord.js";
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
// this is the entrypoint for discord-player based application
const player = new Player(client, {
  ytdlOptions: {
    filter: "audioonly", // Solo descarga el audio
    quality: "lowestaudio", // La calidad más baja de audio disponible
    highWaterMark: 1 << 18, // Tamaño del buffer a 256 KB
    dlChunkSize: 64 * 1024, // Fragmentos de descarga de 64 KB
    requestOptions: {
      // Opciones adicionales para el módulo request si es necesario
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
// Now, lets load all the default extractors, except 'YouTubeExtractor'. You can remove the filter if you want to load all the extractors.
await player.extractors.loadDefault();
