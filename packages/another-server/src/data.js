const channels = [
    {
        id: '1',
        type: 'PRIVATE_CLIENT_CHANNEL',
        totalMessages: 10,
        lastMessageTime: Date.now().toString(),
    },
    {
        id: '2',
        type: 'PRIVATE_FIRM_CHANNEL',
        totalMessages: 4,
        lastMessageTime: Date.now().toString(),
    },
]

module.exports = { channels }
