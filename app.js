import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { z } from 'zod';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const app = express();

// ---------- Env ----------
const {
  AWS_REGION = 'us-east-1',
  TABLE_NAME = 'users',
  BUCKET_NAME,
  APP_PORT = '3000',
  CORS_ORIGIN = '*'
} = process.env;

if (!BUCKET_NAME) {
  console.error('BUCKET_NAME env var is required');
  process.exit(1);
}

// ---------- Middleware ----------
app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

// ---------- AWS Clients ----------
const ddb = new DynamoDBClient({ region: AWS_REGION });
const ddbDoc = DynamoDBDocumentClient.from(ddb, {
  marshallOptions: { removeUndefinedValues: true, convertClassInstanceToMap: true }
});

const s3 = new S3Client({ region: AWS_REGION });

// ---------- Schemas ----------
const UserCreateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  age: z.number().int().nonnegative(),
  avatar: z.string().url().optional() // S3 URL (can be set after upload)
});

const UserUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  age: z.number().int().nonnegative().optional(),
  avatar: z.string().url().optional()
}).refine(obj => Object.keys(obj).length > 0, { message: 'At least one field required' });

// ---------- Helpers ----------
const s3ObjectUrl = (bucket, region, key) =>
  `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(key)}`;

// ---------- Routes ----------

// Health
app.get('/health', (_, res) => res.json({ ok: true }));

// Create user
app.post('/users', async (req, res) => {
  try {
    const input = UserCreateSchema.parse(req.body);
    await ddbDoc.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: input,
      ConditionExpression: 'attribute_not_exists(#id)',
      ExpressionAttributeNames: { '#id': 'id' }
    }));
    return res.status(201).json(input);
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      return res.status(409).json({ error: 'User with this id already exists' });
    }
    if (err?.issues) return res.status(400).json({ error: err.issues });
    console.error(err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// List users (basic scan; for production add pagination)
app.get('/users', async (req, res) => {
  try {
    const data = await ddbDoc.send(new ScanCommand({
      TableName: TABLE_NAME,
      Limit: 100
    }));
    return res.json({ items: data.Items ?? [] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// Get user by id
app.get('/users/:id', async (req, res) => {
  try {
    const data = await ddbDoc.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { id: req.params.id }
    }));
    if (!data.Item) return res.status(404).json({ error: 'Not found' });
    return res.json(data.Item);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// Update user
app.put('/users/:id', async (req, res) => {
  try {
    const patch = UserUpdateSchema.parse(req.body);

    const names = {};
    const values = {};
    const sets = [];

    if (patch.name !== undefined) {
      names['#name'] = 'name'; values[':name'] = patch.name; sets.push('#name = :name');
    }
    if (patch.age !== undefined) {
      names['#age'] = 'age'; values[':age'] = patch.age; sets.push('#age = :age');
    }
    if (patch.avatar !== undefined) {
      names['#avatar'] = 'avatar'; values[':avatar'] = patch.avatar; sets.push('#avatar = :avatar');
    }

    const data = await ddbDoc.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { id: req.params.id },
      UpdateExpression: `SET ${sets.join(', ')}`,
      ConditionExpression: 'attribute_exists(#id)',
      ExpressionAttributeNames: { '#id': 'id', ...names },
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW'
    }));

    return res.json(data.Attributes);
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      return res.status(404).json({ error: 'User not found' });
    }
    if (err?.issues) return res.status(400).json({ error: err.issues });
    console.error(err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// Delete user
app.delete('/users/:id', async (req, res) => {
  try {
    await ddbDoc.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { id: req.params.id },
      ConditionExpression: 'attribute_exists(#id)',
      ExpressionAttributeNames: { '#id': 'id' }
    }));
    return res.status(204).send();
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      return res.status(404).json({ error: 'User not found' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// --- Avatar upload helper endpoints ---

// 1) Get a presigned PUT URL to upload the avatar directly to S3 from the client
//    Client sends: {key, contentType}  (key can be e.g. "avatars/<userId>.jpg")
app.post('/uploads/avatar-url', async (req, res) => {
  try {
    const bodySchema = z.object({
      key: z.string().min(1),
      contentType: z.string().min(3)
    });
    const { key, contentType } = bodySchema.parse(req.body);

    const cmd = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType
    });

    const url = await getSignedUrl(s3, cmd, { expiresIn: 900 }); // 15 minutes
    const objectUrl = s3ObjectUrl(BUCKET_NAME, AWS_REGION, key);

    return res.json({ uploadUrl: url, s3Url: objectUrl });
  } catch (err) {
    if (err?.issues) return res.status(400).json({ error: err.issues });
    console.error(err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

app.listen(Number(APP_PORT), () => {
  console.log(`API listening on http://0.0.0.0:${APP_PORT}`);
});
