const { gql } = require('apollo-server-express')

const typeDefs = gql`
    enum ChannelTypes {
        PRIVATE_FIRM_CHANNEL
        PRIVATE_CLIENT_CHANNEL
        CLIENT_TO_FIRM_CHANNEL
    }

    type Channel {
        id: ID!
        type: ChannelTypes!
        totalMessages: Int! # Not including bot comments
        lastMessageTime: String # Date/time - Does not count bot comments
    }

    type Query {
        channel(channelId: ID!): Channel
        channels: [Channel]!
    }

    type Mutation {
        addChannel: Channel!
    }

    type Subscription {
        channelsAccessed: [Channel]!
    }
`

module.exports = { typeDefs }
