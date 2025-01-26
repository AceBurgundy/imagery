const { DataTypes } = require('sequelize');
const database = require('../src/scripts/utilities/views/sequelize.js');

const Location = database.define('Location', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  path: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  lastVisited: {
    type: DataTypes.STRING,
    allowNull: true,
  }
});

Location.sync()
  .catch(error =>
    logError(error)
  );


module.exports = Location;