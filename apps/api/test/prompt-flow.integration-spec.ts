import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AuthService } from '../src/modules/auth/auth.service';
import { MediaStorageService } from '../src/modules/common/media-storage/media-storage.service';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { AppModule } from '../src/app.module';

const describeIntegration =
  process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describeIntegration('Prompt workflow integration', () => {
  let app: INestApplication;
  let auth: AuthService;
  let prisma: PrismaService;
  let media: MediaStorageService;
  const userIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    auth = app.get(AuthService);
    prisma = app.get(PrismaService);
    media = app.get(MediaStorageService);

    await prisma.category.upsert({
      where: { slug: 'coding' },
      update: { name: 'Coding' },
      create: { name: 'Coding', slug: 'coding' },
    });
  });

  afterAll(async () => {
    if (userIds.length > 0) {
      const evidence = await prisma.promptEvidenceImage.findMany({
        where: {
          promptVersion: { repository: { ownerId: { in: userIds } } },
        },
        select: { storageKey: true, storageProvider: true },
      });
      await Promise.all(
        evidence.map((image) =>
          media.delete(image.storageKey, image.storageProvider),
        ),
      );
      await prisma.promptRepository.deleteMany({
        where: { ownerId: { in: userIds } },
      });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await app.close();
  });

  it('runs the two-user repository journey with version-scoped evidence', async () => {
    const userA = await auth.authenticateGoogle({
      displayName: `Integration A ${Date.now()}`,
      email: `integration-a-${Date.now()}@example.test`,
      subject: `integration-a-${Date.now()}`,
    });
    const userB = await auth.authenticateGoogle({
      displayName: `Integration B ${Date.now()}`,
      email: `integration-b-${Date.now()}@example.test`,
      subject: `integration-b-${Date.now()}`,
    });
    userIds.push(userA.user.id, userB.user.id);

    await request(app.getHttpServer())
      .patch('/api/v1/profiles/me')
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ displayName: 'Integration Author', bio: 'Test profile' })
      .expect(200);

    const created = await request(app.getHttpServer())
      .post('/api/v1/prompt-repositories')
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({
        categorySlug: 'coding',
        content: 'Write a concise implementation plan.',
        examples: [],
        title: `Integration Prompt ${Date.now()}`,
        visibility: 'PUBLIC',
      })
      .expect(201);
    const slug = created.body.slug as string;
    const versionOneId = created.body.promptVersionId as string;

    await request(app.getHttpServer())
      .post(`/api/v1/prompt-versions/${versionOneId}/evidence-images`)
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .field('altText', 'Version one evidence')
      .attach('file', png, {
        filename: 'version-one.png',
        contentType: 'image/png',
      })
      .expect(201);

    const versionTwo = await request(app.getHttpServer())
      .post(`/api/v1/prompt-repositories/${slug}/versions`)
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({
        changelog: 'Clarify the plan output.',
        content: 'Write a concise implementation plan with risks.',
        publish: true,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/prompt-versions/${versionTwo.body.id}/evidence-images`)
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .field('altText', 'Version two evidence')
      .attach('file', png, {
        filename: 'version-two.png',
        contentType: 'image/png',
      })
      .expect(201);

    const versionOne = await request(app.getHttpServer())
      .get(`/api/v1/prompt-repositories/${slug}/versions/1`)
      .expect(200);
    const versionTwoDetails = await request(app.getHttpServer())
      .get(`/api/v1/prompt-repositories/${slug}/versions/2`)
      .expect(200);
    expect(versionOne.body.evidenceImages).toHaveLength(1);
    expect(versionTwoDetails.body.evidenceImages).toHaveLength(1);
    expect(versionOne.body.evidenceImages[0].altText).toBe(
      'Version one evidence',
    );
    expect(versionTwoDetails.body.evidenceImages[0].altText).toBe(
      'Version two evidence',
    );

    await request(app.getHttpServer())
      .get(`/api/v1/search?q=${encodeURIComponent(slug)}`)
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/prompt-repositories/${slug}/copy`)
      .set('Authorization', `Bearer ${userB.accessToken}`)
      .send({ clientKey: `integration-${Date.now()}` })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/prompt-repositories/${slug}/save`)
      .set('Authorization', `Bearer ${userB.accessToken}`)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/prompt-repositories/${slug}/like`)
      .set('Authorization', `Bearer ${userB.accessToken}`)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/prompt-repositories/${slug}/comments`)
      .set('Authorization', `Bearer ${userB.accessToken}`)
      .send({ content: 'Useful integration note.' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/profiles/${userA.user.username}/follow`)
      .set('Authorization', `Bearer ${userB.accessToken}`)
      .expect(201);

    const collection = await request(app.getHttpServer())
      .post('/api/v1/collections')
      .set('Authorization', `Bearer ${userB.accessToken}`)
      .send({
        name: `Integration Collection ${Date.now()}`,
        visibility: 'PUBLIC',
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/collections/${collection.body.id}/items`)
      .set('Authorization', `Bearer ${userB.accessToken}`)
      .send({ promptRepositoryId: created.body.id })
      .expect(201);

    const variant = await request(app.getHttpServer())
      .post(`/api/v1/prompt-repositories/${slug}/variants`)
      .set('Authorization', `Bearer ${userB.accessToken}`)
      .send({
        content: 'Write a concise implementation plan in five bullets.',
        title: `Integration Variant ${Date.now()}`,
        visibility: 'PUBLIC',
      })
      .expect(201);
    const variantDetails = await request(app.getHttpServer())
      .get(`/api/v1/prompt-repositories/${variant.body.slug}`)
      .expect(200);
    expect(variantDetails.body.sourcePrompt.slug).toBe(slug);
    expect(variantDetails.body.currentVersion.evidenceImages).toHaveLength(0);

    await request(app.getHttpServer())
      .post(
        `/api/v1/prompt-versions/${variant.body.promptVersionId}/evidence-images`,
      )
      .set('Authorization', `Bearer ${userB.accessToken}`)
      .field('altText', 'Variant-owned evidence')
      .attach('file', png, {
        filename: 'variant.png',
        contentType: 'image/png',
      })
      .expect(201);
    const notifications = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .expect(200);
    expect(notifications.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'VARIANT_CREATED' }),
      ]),
    );

    await request(app.getHttpServer())
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${userB.accessToken}`)
      .send({
        reason: 'OTHER',
        targetId: created.body.id,
        targetType: 'REPOSITORY',
      })
      .expect(201);
  });
});
