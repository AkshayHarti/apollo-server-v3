const { channels } = require('./data')
const { PubSub, withFilter } = require('graphql-subscriptions')

const pubsub = new PubSub()

const resolvers = {
    Query: {
        channel: (_, { channelId }) => {
            const channel = channels.find((channel) => channel.id === channelId)
            if (!channel) {
                return null
            }
            return channel
        },
        channels: () => {
            return channels
        },
    },
    Mutation: {
        addChannel: () => {
            const channel = {
                id: channels.length + 1,
                type: 'PRIVATE_CLIENT_CHANNEL',
                totalMessages: 54,
                lastMessageTime: Date.now().toString(),
            }
            pubsub.publish('CHANNELS_ACCESSED', channel)
            return channel
        },
    },
    Subscription: {
        channelsAccessed: {
            subscribe: withFilter(
                () => pubsub.asyncIterator(['CHANNELS_ACCESSED']),
                () => true
            ),
            resolve: (parent) => {
                console.log({ parent })
                return [parent]
            },
        },
    },
}

module.exports = { resolvers }
