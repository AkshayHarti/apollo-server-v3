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
            pubsub.publish('CHANNELS_ACCESSED')
            return channels
        },
    },
    Subscription: {
        channelsAccessed: {
            subscribe: withFilter(
                () => pubsub.asyncIterator(['CHANNELS_ACCESSED']),
                () => true
            ),
            resolve: () => channels,
        },
    },
}

module.exports = { resolvers }
