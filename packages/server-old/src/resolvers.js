const { books } = require('./data')
const { PubSub, withFilter } = require('graphql-subscriptions')

const pubsub = new PubSub()

const resolvers = {
    Query: {
        books: () => books,
    },
    Mutation: {
        addBook: (_, { title, author }) => {
            pubsub.publish('POST_CREATED', {
                title,
                author,
            })
            return [...books, { title, author }]
        },
    },
    Subscription: {
        booksAdded: {
            // More on pubsub below
            subscribe: withFilter(
                () => pubsub.asyncIterator(['POST_CREATED']),
                () => true
            ),
            resolve: (parent) => [...books, parent],
        },
    },
}

module.exports = { resolvers }
