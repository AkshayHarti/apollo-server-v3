const { ApolloServer, gql } = require('apollo-server-express')
const express = require('express')
const http = require('http')
const { execute, subscribe } = require('graphql')
const { SubscriptionServer } = require('subscriptions-transport-ws')
const { makeExecutableSchema } = require('@graphql-tools/schema')
const { typeDefs } = require('./schemas')
const { resolvers } = require('./resolvers')

const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
})

async function startApolloServer() {
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
    await new Promise((resolve) => httpServer.listen({ port: 3011 }, resolve))
    console.log(`🚀 Server ready at http://localhost:3011${server.graphqlPath}`)
}

startApolloServer()
