import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
  static async postUpload(req, res) {
    try {
      console.log('Request Body:', req.body); // Logging for debugging

      const token = req.header('X-Token');
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { name, type, isPublic, data, parentId } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Missing name' });
      }
      if (!type || !['folder', 'file', 'image'].includes(type)) {
        return res.status(400).json({ error: 'Missing type' });
      }
      if (!data && type !== 'folder') {
        return res.status(400).json({ error: 'Missing data' });
      }

      let parentFile;
      if (parentId) {
        parentFile = await dbClient.collection('files').findOne({ _id: ObjectId(parentId) });
        if (!parentFile) {
          return res.status(400).json({ error: 'Parent not found' });
        }
        if (parentFile.type !== 'folder') {
          return res.status(400).json({ error: 'Parent is not a folder' });
        }
      }

      const folderData = {
        userId,
        name,
        type,
        isPublic: isPublic || false,
        parentId: parentId || 0
      };

      if (type === 'folder') {
        const newFolder = await dbClient.collection('files').insertOne(folderData);
        return res.status(201).json({ id: newFolder.insertedId, ...folderData });
      }

      const folderName = process.env.FOLDER_PATH || '/tmp/files_manager';
      const localPath = path.join(folderName, uuidv4());
      await fs.promises.mkdir(folderName, { recursive: true });
      await fs.promises.writeFile(localPath, Buffer.from(data, 'base64'));

      const newFile = await dbClient.collection('files').insertOne({ localPath, ...folderData });

      return res.status(201).json({ id: newFile.insertedId, localPath, ...folderData });
    } catch (error) {
      console.error('Error in postUpload:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default FilesController;
