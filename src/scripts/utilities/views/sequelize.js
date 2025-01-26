const { Sequelize } = require('sequelize');

const database = new Sequelize({
  dialect: 'sqlite',
  storage: './Imagery.sqlite3',
  define: {
    freezeTableName: true
  },
  logging: false
});

database.sync()
    .then(() =>
      console.log('Database synced successfully')
    )
    .catch(error =>
      console.error('Database sync failed:', error)
    );

module.exports = database;