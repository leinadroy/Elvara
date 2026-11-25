import { createHash } from 'node:crypto';
import type { Readable } from 'node:stream';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PersonDocumentView, UploadDocumentSchema } from '@smart-school/contracts';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service.js';
import type { AuthContext } from '../auth/auth.types.js';
import { validationFailed } from '../common/api-exception.filter.js';
import type { RequestMeta } from '../common/request-meta.js';
import type { Env } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { safeFileName, sniffMime, type UploadedFile } from './files.js';
import { StorageService } from './storage.service.js';

export type { UploadedFile } from './files.js';

@Injectable()
export class DocumentsService {
  private readonly maxBytes: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    config: ConfigService<Env, true>,
  ) {
    this.maxBytes = config.get('MAX_UPLOAD_MB', { infer: true }) * 1024 * 1024;
  }

  private async findPerson(auth: AuthContext, personId: string) {
    const person = await this.prisma.person.findFirst({ where: { id: personId, schoolId: auth.schoolId } });
    if (!person) throw new NotFoundException('Data orang tidak ditemukan.');
    return person;
  }

  /** Pemilik data boleh melihat dokumennya sendiri; selain itu perlu izin documents:read. */
  private canRead(auth: AuthContext, personId: string): boolean {
    return auth.permissions.has('documents:read') || auth.personId === personId;
  }

  async list(auth: AuthContext, personId: string): Promise<PersonDocumentView[]> {
    if (!this.canRead(auth, personId)) throw new NotFoundException('Data orang tidak ditemukan.');
    await this.findPerson(auth, personId);
    const docs = await this.prisma.personDocument.findMany({
      where: { personId, schoolId: auth.schoolId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    const uploaderIds = [...new Set(docs.map((d) => d.uploadedById).filter((v): v is string => !!v))];
    const uploaders = await this.prisma.user.findMany({ where: { id: { in: uploaderIds } }, select: { id: true, email: true } });
    const byId = new Map(uploaders.map((u) => [u.id, u.email]));
    return docs.map((d) => ({
      id: d.id,
      category: d.category,
      title: d.title,
      originalName: d.originalName,
      mimeType: d.mimeType,
      sizeBytes: d.sizeBytes,
      uploadedBy: d.uploadedById ? (byId.get(d.uploadedById) ?? null) : null,
      createdAt: d.createdAt.toISOString(),
    }));
  }

  async upload(auth: AuthContext, personId: string, input: z.infer<typeof UploadDocumentSchema>, file: UploadedFile | undefined, meta: RequestMeta) {
    await this.findPerson(auth, personId);
    if (!file || file.size === 0) throw validationFailed('Pilih file yang akan diunggah.', { file: ['File wajib dipilih.'] });
    if (file.size > this.maxBytes) {
      throw validationFailed(`Ukuran file maksimal ${this.maxBytes / 1024 / 1024} MB.`, { file: ['File terlalu besar.'] });
    }
    const mimeType = sniffMime(file.buffer);
    if (!mimeType) throw validationFailed('Jenis file tidak didukung.', { file: ['Hanya PDF, JPG, atau PNG.'] });

    const sha256 = createHash('sha256').update(file.buffer).digest('hex');
    const storageKey = await this.storage.put(file.buffer);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const doc = await tx.personDocument.create({
          data: {
            schoolId: auth.schoolId,
            personId,
            category: input.category,
            title: input.title,
            originalName: safeFileName(file.originalname, mimeType),
            mimeType,
            sizeBytes: file.size,
            sha256,
            storageKey,
            uploadedById: auth.userId,
          },
        });
        await this.audit.record(
          {
            schoolId: auth.schoolId,
            actorUserId: auth.userId,
            action: 'document.upload',
            entityType: 'person',
            entityId: personId,
            requestId: meta.requestId,
            metadata: { documentId: doc.id, category: doc.category, mimeType, sizeBytes: file.size },
          },
          tx,
        );
        return { id: doc.id };
      });
    } catch (err) {
      await this.storage.remove(storageKey);
      throw err;
    }
  }

  /** Mengembalikan isi file. Setiap unduhan dicatat di audit karena dokumen berisi data pribadi. */
  async open(auth: AuthContext, documentId: string, meta: RequestMeta): Promise<{ stream: Readable; size: number; mimeType: string; fileName: string }> {
    const doc = await this.prisma.personDocument.findFirst({ where: { id: documentId, schoolId: auth.schoolId, deletedAt: null } });
    if (!doc || !this.canRead(auth, doc.personId)) throw new NotFoundException('Dokumen tidak ditemukan.');
    const file = await this.storage.open(doc.storageKey).catch(() => {
      throw new NotFoundException('Isi dokumen tidak ditemukan di penyimpanan.');
    });
    await this.audit.record({
      schoolId: auth.schoolId,
      actorUserId: auth.userId,
      action: 'document.download',
      entityType: 'person',
      entityId: doc.personId,
      requestId: meta.requestId,
      ip: meta.ip,
      metadata: { documentId: doc.id, own: auth.personId === doc.personId },
    });
    return { ...file, mimeType: doc.mimeType, fileName: doc.originalName };
  }

  async remove(auth: AuthContext, documentId: string, meta: RequestMeta): Promise<void> {
    const doc = await this.prisma.personDocument.findFirst({ where: { id: documentId, schoolId: auth.schoolId, deletedAt: null } });
    if (!doc) throw new NotFoundException('Dokumen tidak ditemukan.');
    await this.prisma.$transaction(async (tx) => {
      await tx.personDocument.update({ where: { id: doc.id }, data: { deletedAt: new Date(), deletedById: auth.userId } });
      await this.audit.record(
        {
          schoolId: auth.schoolId,
          actorUserId: auth.userId,
          action: 'document.delete',
          entityType: 'person',
          entityId: doc.personId,
          requestId: meta.requestId,
          metadata: { documentId: doc.id, title: doc.title },
        },
        tx,
      );
    });
    await this.storage.remove(doc.storageKey);
  }
}
