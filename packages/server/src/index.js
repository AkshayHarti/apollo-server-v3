const { ApolloServer, gql } = require('apollo-server-express')
// const { ApolloServerPluginDrainHttpServer } = require('apollo-server-core')
const express = require('express')
const http = require('http')
const { execute, subscribe } = require('graphql')
const { SubscriptionServer } = require('subscriptions-transport-ws')
const { makeExecutableSchema, mergeSchemas } = require('@graphql-tools/schema')
const { typeDefs } = require('./schemas')
const { resolvers } = require('./resolvers')
const { loadSchema } = require('@graphql-tools/load')
const { UrlLoader } = require('@graphql-tools/url-loader')

const mainSchema = makeExecutableSchema({
    typeDefs,
    resolvers,
})

const getMessagingSchema = async () => {
    try {
        const messagingSchema = await loadSchema(
            ['http://localhost:3011/graphql', 'ws://localhost:3011/graphql'],
            {
                // load from endpoint
                loaders: [new UrlLoader()],
            }
        )
        return messagingSchema
    } catch (error) {
        console.error('Messaging server down')
        return
    }
}

const getSchemas = (schemas) => schemas.filter(Boolean)

async function startApolloServer() {
    const app = express()
    const httpServer = http.createServer(app)

    const messagingSchema = await getMessagingSchema()

    const schema = mergeSchemas({
        schemas: getSchemas([mainSchema, messagingSchema]),
    })

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
    await new Promise((resolve) => httpServer.listen({ port: 3010 }, resolve))
    console.log(`🚀 Server ready at http://localhost:3010${server.graphqlPath}`)
}

startApolloServer()

// const schema1 = buildSchema(`
// type Book {
//     title: String
//     author: String
// }

// type Query {
//     books: [Book]
// }

// type Mutation {
//     addBook(title: String, author: String): [Book]
// }

// type Subscription {
//     booksAdded: [Book]
// }
// `)

// const roots = {
//     query: {
//         books: () => books,
//     },
//     mutation: {
//         addBook: (_, { title, author }) => {
//             pubsub.publish('POST_CREATED', {
//                 title,
//                 author,
//             })
//             return [...books, { title, author }]
//         },
//     },
//     subscription: {
//         booksAdded: {
//             // More on pubsub below
//             subscribe: withFilter(
//                 () => pubsub.asyncIterator(['POST_CREATED']),
//                 () => true
//             ),
//             resolve: (parent) => [...books, parent],
//         },
//     },
// }
