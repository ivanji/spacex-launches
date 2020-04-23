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
    // In this case we're passing the 'mission' object as the parent argument
    missionPatch: (mission, { size } = { size: "LARGE" }) => {
      return size === "SMALL"
        ? mission.missionPatchSmall
        : mission.missionPatchLarge;
    }
  },

  Launch: {
    isBooked: async (launch, _, { dataSources }) =>
      dataSources.userAPI.isBookedonLaunch({ launchId: launch.id })
  },

  User: {
    trips: async (_, __, { dataSources }) => {
      const launchIds = await dataSources.userAPI.getLaunchIdsByUser();

      if (!launchIds.length) return [];

      // look up those launches by their ids
      return (
        dataSources.launchAPI.getLaunchesByIds({
          launchIds
        }) || []
      );
    }
  },

  Mutation: {
    // receive an email and return a token if user exists
    login: async (_, { email }, { dataSources }) => {
      const user = await dataSources.userAPI.findOrCreateUser({ email });
      if (user) return Buffer.from(email).toString("base64");
    },
    bookTrips: async (_, { launchIds }, { dataSources }) => {
      const results = await dataSources.userAPI.bookTrips({ launchIds });
      const launches = await dataSources.launchAPI.getLaunchesByIds({
        launchIds
      });

      return {
        success: results && results.length === launchIds.length,
        message:
          results.length === launchIds.length
            ? "trips booked successfully"
            : `the following launches couldn't be booked: ${launchIds.filter(
                id => !results.includes(id)
              )}`,
        launches
      };
    },
    cancelTrip: async (_, { launchId }, { dataSources }) => {
      const result = await dataSources.userAPI.cancelTrip({ launchId });

      if (!result)
        return {
          success: false,
          message: "failed to cancel trip"
        };

      const launch = await dataSources.launchAPI.getLaunchById({ launchId });
      return {
        success: true,
        message: "trip cancelled",
        launches: [launch]
      };
    }
  }
};
