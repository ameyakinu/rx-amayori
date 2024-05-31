import { ActivityType, Events } from "discord.js";

export default {
  name: Events.ClientReady,
  /**
   * @param {import('../core/types/interactionTypes').CustomBaseInteraction} client
   */
  async execute(client) {
    client.user.setActivity({
      name: "Updating for now!",
      type: ActivityType.Listening,
    });
  },
};
