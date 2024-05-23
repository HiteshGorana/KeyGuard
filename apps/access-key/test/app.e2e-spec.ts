import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AccessKeyModule } from '../src/access-key.module';

describe('Access Key Management Service (e2e)', () => {
  let app: INestApplication;
  let createdKey: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AccessKeyModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/POST admin/access-keys (Create Access Key)', () => {
    return request(app.getHttpServer())
      .post('/admin/access-keys')
      .send({ rateLimit: 100, expiresInMs: 3600000 })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('key');
        createdKey = res.body.key;
      });
  });

  it('/GET admin/access-keys (List All Access Keys)', () => {
    return request(app.getHttpServer())
      .get('/admin/access-keys')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it('/GET access-keys/:key (Get Access Key Details)', () => {
    return request(app.getHttpServer())
      .get(`/access-keys/${createdKey}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('key', createdKey);
      });
  });

  it('/PATCH admin/access-keys/:key (Update Access Key)', () => {
    return request(app.getHttpServer())
      .patch(`/admin/access-keys/${createdKey}`)
      .send({ rateLimit: 150, expiresInMs: 7200000, isDisabled: false })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('updated', true);
      });
  });

  it('/PATCH access-keys/:key/disable (Disable Access Key)', () => {
    return request(app.getHttpServer())
      .patch(`/access-keys/${createdKey}/disable`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('disabled', true);
      });
  });

  it('/DELETE admin/access-keys/:key (Delete Access Key)', () => {
    return request(app.getHttpServer())
      .delete(`/admin/access-keys/${createdKey}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('deleted', true);
      });
  });
});
