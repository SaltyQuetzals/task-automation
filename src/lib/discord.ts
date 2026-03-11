export const sendDiscordNotification = async (webhookUrl: string, message: string, success: boolean) => {
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: '🤖 **task-automation**',
      embeds: [{
        description: message,
        color: success ? 3066993 : 15158332,
      }],
    }),
  });
};
