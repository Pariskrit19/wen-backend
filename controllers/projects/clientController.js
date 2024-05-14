const Client = require('../../models/projects/clientModel');
const { CLIENT_KEY } = require('../../utils/crypto');
const factory = require('../factoryController');

exports.getClient = factory.getOne(Client);
exports.getAllClients = factory.getAll(Client, CLIENT_KEY);
exports.createClient = factory.createOne(Client);
exports.updateClient = factory.updateOne(Client);
exports.deleteClient = factory.deleteOne(Client);
