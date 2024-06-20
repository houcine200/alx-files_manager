import dbClient from '../utils/db';
import crypto from 'crypto';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).send({ error: 'Missing email' });
    }

    if (!password) {
      return res.status(400).send({ error: 'Missing password' });
    }

    const collection = dbClient.dbClient.collection('users');
    const user = await collection.findOne({ email });

    if (user) {
      return res.status(400).send({ error: 'Already exist' });
    }

    const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');
    const result = await collection.insertOne({ email, password: hashedPassword });

    return res.status(201).send({ id: result.insertedId, email });
  }
}

export default UsersController;
