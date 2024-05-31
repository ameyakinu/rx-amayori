
/**
* @param {import('../../core/types/interactionTypes').CustomCommandInteraction} interaction
*/
export default async function executeAutocomplete(interaction) {
    const command = await interaction.client.commands.get(interaction.commandName)
    command.autocomplete(interaction)
}