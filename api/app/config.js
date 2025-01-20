module.exports = {
  development: {
    type: 'development',
    port: 3000,
    mongodb: 'mongodb+srv://dbUser:admin@cluster0.fxg17.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0/db'
  },
  production: {
    type: 'production',
    port: 3000,
    mongodb: 'mongodb+srv://dbUser:admin@cluster0.fxg17.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0/db'
  }
};
