import { Context, useMainPlayer } from "discord-player";
import { ApplicationCommandOptionType } from "discord.js";

export default {
  name: "play",
  global: true,
  description: "play song",
  options: [
    {
      name: "query",
      description: "name of the music",
      type: ApplicationCommandOptionType.String,
    },
  ],
  async run(interaction) {
    const player = useMainPlayer();
    const channel = interaction.member.voice.channel;
    if (!channel)
      return interaction.reply("You are not connected to a voice channel!"); // make sure we have a voice channel
    const query = interaction.options.getString("query", true); // we need input/query to pla

    try {
      const { track } = await player.play(channel, query, {
        nodeOptions: {
          // nodeOptions are the options for guild node (aka your queue in simple word)
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
