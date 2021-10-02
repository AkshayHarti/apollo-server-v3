const { ApolloServer, gql } = require('apollo-server-express')
// const { ApolloServerPluginDrainHttpServer } = require('apollo-server-core')
const express = require('express')
const http = require('http')
const { execute, subscribe, buildSchema } = require('graphql')
const { SubscriptionServer } = require('subscriptions-transport-ws')
const { makeExecutableSchema } = require('@graphql-tools/schema')
const { PubSub, withFilter } = require('graphql-subscriptions')
const ws = require('ws') // yarn add ws
const { useServer } = require('graphql-ws/lib/use/ws')

const pubsub = new PubSub()

const typeDefs = gql`
    type Book {
        title: String
        author: String
    }

    type Query {
        books: [Book]
    }

    type Mutation {
        addBook(title: String, author: String): [Book]
    }

    type Subscription {
        booksAdded: [Book]
    }
`

const books = [
    {
        title: 'The Awakening',
        author: 'Kate Chopin',
    },
    {
        title: 'City of Glass',
        author: 'Paul Auster',
    },
]

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

const roots = {
    query: {
        books: () => books,
    },
    mutation: {
        addBook: (_, { title, author }) => {
            pubsub.publish('POST_CREATED', {
                title,
                author,
            })
            return [...books, { title, author }]
        },
    },
    subscription: {
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

const schema = makeExecutableSchema({ typeDefs, resolvers })
const schema1 = buildSchema(`
type Book {
    title: String
    author: String
}

type Query {
    books: [Book]
}

type Mutation {
    addBook(title: String, author: String): [Book]
}

type Subscription {
    booksAdded: [Book]
}
`)

async function startApolloServer(typeDefs, resolvers) {
    const app = express()
    const httpServer = http.createServer(app)

    const server = new ApolloServer({
        schema,
        plugins: [
            {
                async serverWillStart() {
                    return {
                        async drainServer() {
                            subscriptionServer.dispose()
                        },
                    }
                },
            },
        ],
    })
    console.log(JSON.stringify({ server }))
    const subscriptionServer = SubscriptionServer.create(
        {
            schema,
            execute,
            subscribe,
            onConnect(connectionParams, webSocket, context) {
                console.log('Connected! ws')
            },
            onDisconnect(webSocket, context) {
                console.log('Disconnected! ws')
            },
        },
        {
            server: httpServer,
            path: server.graphqlPath,
        }
    )
    await server.start()
    server.applyMiddleware({ app })
    await new Promise((resolve) => httpServer.listen({ port: 3000 }, resolve))
    console.log(`🚀 Server ready at http://localhost:3000${server.graphqlPath}`)
}

startApolloServer(typeDefs, resolvers)
