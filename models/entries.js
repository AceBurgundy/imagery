const { DataTypes } = require('sequelize');
const database = require('../src/scripts/utilities/views/sequelize.js');
const Location = require('./location.js');
const { logError } = require('../src/scripts/utilities/views/helpers.js');

const Entries = database.define('entries', {
  index: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  destination: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  isMedia: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  path: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  thumbnailType: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  thumbnailPath: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  cachedThumbnail: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  size: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  dateCreated: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  dateModified: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  dateTaken: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

//  Location has many Entries
Entries.belongsTo(Location, {
  foreignKey: 'locationID',
  as: 'entries',
  onDelete: 'CASCADE'
});

Location.hasMany(Entries, {
  foreignKey: 'locationID',
  as: 'entries'
});

Entries.sync()
  .catch(error =>
    logError(error)
  );

module.exports = Entries;