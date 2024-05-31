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
    },
  ],
  async autocomplete(interaction) {
    const player = useMainPlayer();
    const query = interaction.options.getString("query", true);
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
  },
  async run(interaction) {
    const player = useMainPlayer();
    const channel = interaction.member.voice.channel;
    if (!channel)
      return interaction.reply("You are not connected to a voice channel!"); // make sure we have a voice channel
    const query = interaction.options.getString("query", true); // we need input/query to play

    try {
      const { track } = await player.play(channel, query, {
        nodeOptions: {
          // nodeOptions are the options for guild node (aka your queue in simple words)
          metadata: interaction, // we can access this metadata object using queue.metadata later on
        },
      });

      //return interaction.reply({ content: `**${track.title}** enqueued!` });
    } catch (e) {
      // let's return error if something failed
      return interaction.reply(`Something went wrong: ${e}`);
    }
  },
};
