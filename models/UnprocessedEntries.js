const { DataTypes } = require('sequelize');
const database = require('../src/scripts/utilities/views/sequelize.js');

const UnprocessedEntries = database.define('UnprocessedEntries', {
  index: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  isFile: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  isCompatibleFile: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  isDirectory: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  }
});

//  Location has many Entries
UnprocessedEntries.belongsTo(Location, {
  foreignKey: 'locationID',
  as: 'unprocessedEntries',
  onDelete: 'CASCADE'
});

Location.hasMany(UnprocessedEntries, {
  foreignKey: 'locationID',
  as: 'unprocessedEntries'
});

// Sync model with database
UnprocessedEntries.sync()
  .catch(error => {
    console.error('Error syncing UnprocessedEntries model:', error);
  });

module.exports = UnprocessedEntries;
