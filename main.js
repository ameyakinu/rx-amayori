import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
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

// Inicializa el cliente de Discord fuera de la función
const client = new Client({
  intents: [
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.Guilds,
  ],
});

// Inicializa el player de Discord fuera de la función
const player = new Player(client, {
  ytdlOptions: {
    filter: "audioonly",
    quality: "lowestaudio",
    highWaterMark: 1 << 18,
    dlChunkSize: 64 * 1024,
    requestOptions: {
      headers: {
        Authorization: `Bearer ${process.env.accessToken}`, // Se actualiza cuando se obtienen tokens
      },
    },
    liveBuffer: 10000,
    begin: "0s",
  },
  quality: "low",
  autoSelfDeaf: true,
  initialVolume: 25,
  bufferingTimeout: 2000,
  leaveOnEnd: true,
  leaveOnStop: true,
  leaveOnEmpty: true,
  deafenOnJoin: true,
});

// Cargar extractores
player.extractors.loadDefault();

const initDiscordBot = async (accessToken) => {
  // Actualiza el token OAuth 2.0 en las opciones de ytdl
  player.options.ytdlOptions.requestOptions.headers.Authorization = `Bearer ${accessToken}`;

  client.commands = await buildCollection("commands");
  client.buttons = await buildCollection("buttons");
  client.commandMessage = await buildCollection("messages");
  client.modals = await buildCollection("modals");
  client.menu = await buildCollection("menus");

  loadEvents(client);
  reloadCommandsUpdateToSlash();

  client.login(process.env.token).then(async () => {
    console.log(`${client.user.displayName} is connected!`);
  });

  // Evento playerStart
  player.events.on("playerStart", (queue, track) => {
    const channel = queue.metadata.channel;
    const requestedBy = queue.metadata.member;

    const embed = new EmbedBuilder()
      .setAuthor({ name: track.author, iconURL: track.thumbnail })
      .setTitle(track.title)
      .setURL(track.url)
      .setDescription(
        `Requested by: ${requestedBy}\nDuration: ${track.duration}\nSongs in queue: ${queue.tracks.length}`
      )
      .setThumbnail(track.thumbnail)
      .setColor(0x1db954);

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("skip")
        .setLabel("Skip")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("stop")
        .setLabel("Stop")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("prev")
        .setLabel("Previous")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId("next")
        .setLabel("Next")
        .setStyle(ButtonStyle.Secondary)
    );

    const message = queue.metadata.send({
      embeds: [embed],
      components: [actionRow],
    });

    const filter = (interaction) =>
      ["skip", "stop", "prev", "next"].includes(interaction.customId);
    const collector = message.createMessageComponentCollector({
      filter,
      time: track.durationMS - 60000,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.customId === "skip") {
        await queue.skip();
      } else if (interaction.customId === "stop") {
        await queue.stop();
      } else if (interaction.customId === "prev") {
        // Implement previous functionality
      } else if (interaction.customId === "next") {
        // Implement next functionality
      }
      await interaction.deferUpdate();
    });

    collector.on("end", async () => {
      const newActionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("skip")
          .setLabel("Skip")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId("stop")
          .setLabel("Stop")
          .setStyle(ButtonStyle.Danger)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId("prev")
          .setLabel("Previous")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId("next")
          .setLabel("Next")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );
      await message.edit({ components: [newActionRow] });
    });

    // Embed pagination logic
    const queueEmbeds = [];
    const tracksPerPage = 4;
    for (let i = 0; i < queue.tracks.length; i += tracksPerPage) {
      const currentTracks = queue.tracks.slice(i, i + tracksPerPage);
      const embedPage = new EmbedBuilder()
        .setAuthor({ name: track.author, iconURL: track.thumbnail })
        .setTitle(track.title)
        .setURL(track.url)
        .setDescription(
          currentTracks
            .map((t, index) => `${i + index + 1}. ${t.title}`)
            .join("\n")
        )
        .setThumbnail(track.thumbnail)
        .setColor(0x1db954);
      queueEmbeds.push(embedPage);
    }

    let currentPage = 0;

    const updatePaginationButtons = () => {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("skip")
          .setLabel("Skip")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("stop")
          .setLabel("Stop")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("prev")
          .setLabel("Previous")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentPage === 0),
        new ButtonBuilder()
          .setCustomId("next")
          .setLabel("Next")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentPage === queueEmbeds.length - 1)
      );
    };

    if (queueEmbeds.length > 1) {
      const paginationMessage = queue.metadata.send({
        embeds: [queueEmbeds[currentPage]],
        components: [updatePaginationButtons()],
      });

      const paginationCollector =
        paginationMessage.createMessageComponentCollector({
          filter,
          time: track.durationMS - 60000,
        });

      paginationCollector.on("collect", async (interaction) => {
        if (interaction.customId === "prev") {
          currentPage -= 1;
        } else if (interaction.customId === "next") {
          currentPage += 1;
        }
        await paginationMessage.edit({
          embeds: [queueEmbeds[currentPage]],
          components: [updatePaginationButtons()],
        });
        await interaction.deferUpdate();
      });

      paginationCollector.on("end", async () => {
        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("skip")
            .setLabel("Skip")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId("stop")
            .setLabel("Stop")
            .setStyle(ButtonStyle.Danger)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId("prev")
            .setLabel("Previous")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId("next")
            .setLabel("Next")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
        );
        await paginationMessage.edit({ components: [disabledRow] });
      });
    }
  });
};
