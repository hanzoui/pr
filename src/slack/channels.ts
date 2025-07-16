import sflow from "sflow";

if (import.meta.main) {
  console.log(JSON.stringify(await getSlackChannel("general")))
}

/**
 * 
 * @author: snomiao <snomiao@gmail.com>
 */
export async function getSlackChannel(name: string) {
  return (await sflow(slack.conversations.list({
    types: "public_channel,private_channel",
    limit: 1000,
  }))
    .map(e => e.channels)
    .filter()
    .flat()
    .filter(ch => ch.name === name)
    .mapAddField('url', ch => `https://slack.com/app_redirect?channel=${ch.id}`)
    // .forEach(channel => {
    //   console.log(`Channel: ${channel.name} (${channel.id})`);
    //   console.log(`URL: ${channel.url}`);
    // })
    .toAtLeastOne())
};