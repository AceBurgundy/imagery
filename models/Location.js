const { DataTypes } = require('sequelize');
const database = require('../src/scripts/utilities/views/sequelize.js');

const Location = database.define('path_metadata', {
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
  sortBy: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "name"
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