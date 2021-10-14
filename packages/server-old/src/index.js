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
const { makeRemoteExecutableSchema } = require('graphql-tools')
const ws = require('ws')
const { HttpLink } = require('@apollo/client/link/http')
const { getMainDefinition } = require('@apollo/client/utilities')
const { split } = require('@apollo/client')
const { WebSocketLink } = require('@apollo/client/link/ws')
const fetch = require('node-fetch')

const mainSchema = makeExecutableSchema({
    typeDefs,
    resolvers,
})

const getMessagingSchema = async () => {
    try {
        const messagingSchema = await loadSchema(
            'http://localhost:3011/graphql',
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

const messagingWSLink = (operation) => {
    const context = operation.getContext()
    const userId = context.graphqlContext.user._id

    const subscriptionClient = new WebSocketLink({
        uri: 'http://localhost:3011/graphql',
        options: {
            timeout: 5000, // 5 seconds
            inactivityTimeout: 10000, // 10 seconds
            reconnect: true,
            connectionParams: {
                userId,
            },
        },
        webSocketImpl: ws,
    })

    return subscriptionClient.request(operation)
}
const remoteMessagingHttpLink = new HttpLink({
    uri: 'http://localhost:3011/graphql',
    fetch,
})
const remoteMessagingServerLink = split(
    // split based on operation type
    ({ query }) => {
        const { kind, operation } = getMainDefinition(query)

        return kind === 'OperationDefinition' && operation === 'subscription'
    },
    messagingWSLink,
    remoteMessagingHttpLink
)

const getMessagingSchema_old = async () => {
    return makeRemoteExecutableSchema({
        schema: makeExecutableSchema({
            typeDefs: messagingSchema,
        }),
        link: remoteMessagingServerLink,
    })
}

const getSchemas = (schemas) => schemas.filter(Boolean)

async function startApolloServer() {
    const app = express()
    const httpServer = http.createServer(app)

    const messagingSchema = await getMessagingSchema_old()

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
