const { app } = require('electron');
const { Sequelize } = require('sequelize');
const { join } = require('path');

const temporaryDirectory = app.getPath('temp');

const cachedFileDestination = join(
  temporaryDirectory,
  `imagery.sqlite3`
);

const database = new Sequelize({
  dialect: 'sqlite',
  storage: './imagery.sqlite3',
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