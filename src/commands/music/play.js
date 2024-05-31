import { Context, useMainPlayer } from "discord-player";
import { ApplicationCommandOptionType } from "discord.js";

export default {
  name: "play",
  global: true,
  description: "🎵 Play song with YT links or without links",
  options: [
    {
      name: "query",
      description:
        "🎵 Enter the name or url of the song if not just type a hint",
      type: ApplicationCommandOptionType.String,
      required: true,
      autocomplete: true,
    },
  ],
  async autocomplete(interaction) {
    const player = useMainPlayer();
    const query = interaction.options.getString("query", true);

    if (!query) {
      return interaction.respond([]);
    }

    try {
      const results = await player.search(query);

      // Discord's character limit for autocompletion responses is 100 characters per option name.
      const MAX_LENGTH = 100;

      return interaction.respond(
        results.tracks.slice(0, 10).map((t) => {
          let name = `🎵 ${t.title}`;
          if (name.length > MAX_LENGTH) {
            name = `${name.substring(0, MAX_LENGTH - 3)}...`;
          }
          return {
            name: name,
            value: t.url,
          };
        })
      );
    } catch (error) {
      console.error(error);
      return interaction.respond([]);
    }
  },
  async run(interaction) {
    const player = useMainPlayer();
    const channel = interaction.member.voice.channel;
    if (!channel) {
      return interaction.reply("You are not connected to a voice channel!");
    }

    const query = interaction.options.getString("query", true);

    try {
      const { track } = await player.play(channel, query, {
        nodeOptions: {
          metadata: interaction,
        },
      });

      return interaction.reply(`**${track.title}** enqueued!`);
    } catch (e) {
      console.error(e);
      return interaction.reply(`Something went wrong: ${e.message}`);
    }
  },
};
