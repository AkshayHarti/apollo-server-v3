const { ApolloServer, gql } = require('apollo-server-express')
// const { ApolloServerPluginDrainHttpServer } = require('apollo-server-core')
const express = require('express')
const http = require('http')
const { execute, subscribe } = require('graphql')
const { SubscriptionServer } = require('subscriptions-transport-ws')
const { makeExecutableSchema, mergeSchemas } = require('@graphql-tools/schema')
const ws = require('ws')
// const ws = require('ws') // yarn add ws
// const { useServer } = require('graphql-ws/lib/use/ws')
const { typeDefs } = require('./schemas')
const { resolvers } = require('./resolvers')
const { loadSchema } = require('@graphql-tools/load')
const { UrlLoader } = require('@graphql-tools/url-loader')
const { wrapSchema, introspectSchema } = require('@graphql-tools/wrap')
const { Executor } = require('@graphql-tools/delegate')
const { fetch } = require('cross-fetch')
const { print } = require('graphql')
const { observableToAsyncIterable } = require('@graphql-tools/utils')
const { createClient } = require('graphql-ws')

const HTTP_GRAPHQL_ENDPOINT = 'http://localhost:3011/graphql'
const WS_GRAPHQL_ENDPOINT = 'ws://localhost:3011/graphql'

const mainExecutor = async ({ document, variables, context }) => {
    const query = print(document)
    const fetchResult = await fetch(HTTP_GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
    })
    return fetchResult.json()
}

const subscriptionClient = createClient({
    url: WS_GRAPHQL_ENDPOINT,
})

const subExecutor = ({ document, variables, context }) => {
    console.log(JSON.stringify({ subscriptionClient }))
    return observableToAsyncIterable({
        subscribe: (observer) => ({
            unsubscribe: subscriptionClient.subscribe(
                {
                    query: document,
                    variables,
                },
                {
                    next: (data) => observer.next && observer.next(data),
                    error: (err) => {
                        if (!observer.error) return
                        if (err instanceof Error) {
                            observer.error(err)
                        } else if (err.constructor.name === 'CloseEvent') {
                            observer.error(
                                new Error(
                                    `Socket closed with event ${err.code}`
                                )
                            )
                        } else {
                            // GraphQLError[]
                            observer.error(
                                new Error(
                                    err.map(({ message }) => message).join(', ')
                                )
                            )
                        }
                    },
                    complete: () => observer.complete && observer.complete(),
                }
            ),
        }),
    })
}

const mainSchema = makeExecutableSchema({
    typeDefs,
    resolvers,
})

const getMessagingSchema = async () => {
    const schema1 = wrapSchema({
        schema: await introspectSchema(mainExecutor),
        executor: mainExecutor,
    })

    const schema2 = wrapSchema({
        schema: await introspectSchema(subExecutor),
        executor: subExecutor,
    })

    return mergeSchemas({ schemas: [schema1, schema2] })
    //     try {
    //         const messagingSchema = await loadSchema(
    //             ['http://localhost:3011/graphql', 'ws://localhost:3011/graphql'],
    //             {
    //                 // load from endpoint
    //                 loaders: [new UrlLoader()],
    //             }
    //         )
    //         return messagingSchema
    //     } catch (error) {
    //         console.error('Messaging server down')
    //         return
    //     }
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
