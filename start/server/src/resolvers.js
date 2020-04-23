const { paginateResults } = require("./utils");

module.exports = {
  /* 
  fieldName: (parent, args, context, info) => data;

        A resolver function accepts four arguments:
        Parent: An object that contains the result returned from the resolver on the parent type
        args: An object that contains args pass to the field
        context: An object shared by all resolvers in a GraphQL operation. It's used to contain per-request state.
        info: info about the execution state of the operation which should only be used in advanced cases.
    */

  Query: {
    // first arg is empty cuz it refers to the root of our graph
    /* 
      launches: (_, __, { dataSources }) => {
      console.log(dataSources.launchAPI.getAllLaunches());
      return dataSources.launchAPI.getAllLaunches(); // This is the actual data!
    }, */

    launches: async (_, { pageSize = 20, after }, { dataSources }) => {
      const allLaunches = await dataSources.launchAPI.getAllLaunches();
      // we want these in reverse chronological order
      allLaunches.reverse();
      const launches = paginateResults({
        after,
        pageSize,
        results: allLaunches
      });
      return {
        launches,
        cursor: launches.length ? launches[launches.length - 1].cursor : null,
        // if the cursor of the end of the paginated results is the same as the
        // last item in _all_ results, then there are no more results after this
        hasMore: launches.length
          ? launches[launches.length - 1].cursor !==
            allLaunches[allLaunches.length - 1].cursor
          : false
      };
    },

    // second arg is passed into our query
    launch: (_, { id }, { dataSources }) =>
      dataSources.launchAPI.getLaunchById({ launchId: id }),
    // we destructure our data sources in the third arg (context)
    me: (_, __, { dataSources }) => dataSources.userAPI.findOrCreateUser()
  },

  Mission: {
    // make sure the default size is 'large' in case user doesn't specify
    missingPatch: (mission, { size } = { size: "LARGE" }) => {
      return size === "SMALL"
        ? mission.missionPatchSmall
        : mission.missionPatchLarge;
    }
  }
};
