import { clientID, token } from "./config";
import { client, Discord } from "./discordclient";
import { buttoncontrols, weedButtonIDs, weedstart } from "./weed";
import getDatabase from "./postgres";
import { intro } from "./intromenu";
import { sql } from "slonik";
const rest = new Discord.REST().setToken(token);

const commands: Discord.RESTPostAPIChatInputApplicationCommandsJSONBody[] = [
    {
        name: "create",
        description: "Create your character!",
    },
    {
        name: "weed",
        description: "Start your weed farm!",
    },
    {
        name: "lifeinvader",
        description: "the LifeInvader social network",
        options: [
            {
                name: "follow",
                description: "follow a user",
                type: Discord.ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "user",
                        description: "the user to follow",
                        type: Discord.ApplicationCommandOptionType.User,
                        required: true,
                    },
                ],
            },
            {
                name: "unfollow",
                description: "unfollow a user",
                type: Discord.ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "user",
                        description: "the user to unfollow",
                        type: Discord.ApplicationCommandOptionType.User,
                        required: true,
                    },
                ],
            },
            {
                name: "followers",
                description: "see your followers",
                type: Discord.ApplicationCommandOptionType.Subcommand,
            },
            {
                name: "following",
                description: "see who your following",
                type: Discord.ApplicationCommandOptionType.Subcommand,
            },
            {
                name: "post",
                description: "post a message",
                type: Discord.ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "message",
                        description: "the message to post",
                        type: Discord.ApplicationCommandOptionType.String,
                        required: true,
                    },
                ],
            },
        ],
    },
];

console.log(commands);

client.on("guildCreate", async (guild) => {
    console.log("joined a guild!");
    console.table({
        name: guild.name,
        id: guild.id,
        membercount: guild.memberCount,
    });
    const owner = await guild.fetchOwner();
    console.table({
        owner: owner.user.tag,
        ownerid: owner.id,
    });
    try {
        console.log(
            `Started refreshing ${commands.length} application (/) commands.`
        );

        // The put method is used to fully refresh all commands in the guild with the current set
        await rest
            .get(Discord.Routes.applicationGuildCommands(clientID, guild.id))
            .then((data: any) => {
                const promises = [];
                for (const command of data) {
                    const deleteUrl: `/${string}` = `${Discord.Routes.applicationGuildCommands(
                        clientID,
                        guild.id
                    )}/${command.id}`;
                    promises.push(rest.delete(deleteUrl));
                }
                return Promise.all(promises);
            });
        const data: any = await rest.put(
            Discord.Routes.applicationGuildCommands(clientID, guild.id),
            { body: commands }
        );

        console.log(
            `Successfully reloaded ${data.length} application (/) commands.`
        );
    } catch (error) {
        // And of course, make sure you catch and log any errors!
        console.error(error);
    }
    guild.channels.cache.forEach((channel) => {
        console.log(channel.name, channel.id, channel.type);
    });
});

client.on("ready", async () => {
    console.log(`Logged in as ${client.user?.tag}!`);
    console.log("connecting database...");
    await getDatabase();
    console.log("connected!");

    process
        .on("unhandledRejection", console.error)
        .on("uncaughtException", console.error);
});

client.on("interactionCreate", async (interaction) => {
    const pool = await getDatabase();
    if (interaction.type == Discord.InteractionType.ApplicationCommand) {
        const account = await pool.maybeOne(sql`
            SELECT * FROM accounts WHERE id = ${interaction.user.id}
        `);
        switch (interaction.commandName) {
            case "create":
                if (!account) {
                    intro({ message: interaction, args: [] });
                } else {
                    interaction.reply({
                        embeds: [
                            new Discord.EmbedBuilder()
                                .setAuthor({
                                    name: interaction.user.tag,
                                    iconURL:
                                        interaction.user.avatarURL() ||
                                        undefined,
                                })
                                .setTitle("You already have an account!")
                                .setThumbnail(
                                    "https://github.com/Ugric/lamar-bot-js/blob/main/images/infomation%20icon.png?raw=true"
                                )
                                .setImage(
                                    "https://github.com/Ugric/lamar-bot-js/blob/main/images/no%20no%20no.gif?raw=true"
                                ),
                        ],
                        ephemeral: true,
                    });
                }
                return;
            case "weed":
                if (account) {
                    weedstart({ message: interaction, args: [] });
                    return;
                }
        }
        if (account) {
            interaction.reply({
                embeds: [
                    new Discord.EmbedBuilder()
                        .setAuthor({
                            name: interaction.user.tag,
                            iconURL: interaction.user.avatarURL() || undefined,
                        })
                        .setTitle("command not found!")
                        .setThumbnail(
                            "https://github.com/Ugric/lamar-bot-js/blob/main/images/infomation%20icon.png?raw=true"
                        )
                        .setImage(
                            "https://github.com/Ugric/lamar-bot-js/blob/main/images/no%20no%20no.gif?raw=true"
                        ),
                ],
                ephemeral: true,
            });
        } else {
            interaction.reply({
                embeds: [
                    new Discord.EmbedBuilder()
                        .setAuthor({
                            name: interaction.user.tag,
                            iconURL: interaction.user.avatarURL() || undefined,
                        })
                        .setTitle("You don't have an account!")
                        .setThumbnail(
                            "https://github.com/Ugric/lamar-bot-js/blob/main/images/infomation%20icon.png?raw=true"
                        )
                        .setImage(
                            "https://github.com/Ugric/lamar-bot-js/blob/main/images/no%20no%20no.gif?raw=true"
                        )
                        .setDescription("Use `/create` to create an account!"),
                ],
                ephemeral: true,
            });
        }
        return;
    } else if (interaction.type != Discord.InteractionType.MessageComponent)
        return;
    const button = interaction;
    if (button.member?.user) {
        button.deferUpdate().catch(console.error);
        if (weedButtonIDs.includes(button.customId)) {
            buttoncontrols(button);
        } else {
            button
                .reply({
                    embeds: [
                        new Discord.EmbedBuilder()
                            .setAuthor({
                                name: button.user.tag,
                                iconURL: button.user.avatarURL() || undefined,
                            })
                            .setTitle("unknown button!")
                            .setThumbnail(
                                "https://github.com/Ugric/lamar-bot-js/blob/main/images/infomation%20icon.png?raw=true"
                            )
                            .setImage(
                                "https://github.com/Ugric/lamar-bot-js/blob/main/images/no%20no%20no.gif?raw=true"
                            ),
                    ],
                })
                .catch(console.error);
        }
    } else {
        button.deferUpdate().catch(console.error);
    }
});

client.login(token);
