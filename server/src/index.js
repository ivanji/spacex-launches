const { ApolloServer } = require("apollo-server");
const typeDefs = require("./schema");

// Set up and create Database
const { createStore } = require("./utils");

const resolvers = require("./resolvers");

// Set up our Data Sources
const LaunchAPI = require("./datasources/launch");
const UserAPI = require("./datasources/user");

const store = createStore();

const server = new ApolloServer({
  typeDefs,
  resolvers,
  dataSources: () => ({
    launchAPI: new LaunchAPI(),
    userAPI: new UserAPI({ store }) // we pass the store as
  })
});

server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});
