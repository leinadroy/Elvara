import { Injectable, NotFoundException } from '@nestjs/common';
import type { BuildingView, SchoolView } from '@smart-school/contracts';
import { CreateBuildingSchema, CreateFloorSchema, CreateRoomSchema, UpdateRoomSchema, UpdateSchoolSchema } from '@smart-school/contracts';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service.js';
import type { AuthContext } from '../auth/auth.types.js';
import { conflict } from '../common/api-exception.filter.js';
import type { RequestMeta } from '../common/request-meta.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SchoolService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async get(auth: AuthContext): Promise<SchoolView> {
    const s = await this.prisma.school.findUniqueOrThrow({ where: { id: auth.schoolId } });
    return { id: s.id, name: s.name, npsn: s.npsn, address: s.address, timezone: s.timezone };
  }

  async update(auth: AuthContext, input: z.infer<typeof UpdateSchoolSchema>, meta: RequestMeta): Promise<SchoolView> {
    if (input.npsn) {
      const taken = await this.prisma.school.findFirst({ where: { npsn: input.npsn, id: { not: auth.schoolId } } });
      if (taken) throw conflict('NPSN sudah dipakai.', { npsn: ['NPSN sudah dipakai sekolah lain.'] });
    }
    await this.prisma.$transaction(async (tx) => {
      const before = await tx.school.findUniqueOrThrow({ where: { id: auth.schoolId } });
      await tx.school.update({ where: { id: auth.schoolId }, data: input });
      await this.audit.record(
        {
          schoolId: auth.schoolId,
          actorUserId: auth.userId,
          action: 'school.update',
          entityType: 'school',
          entityId: auth.schoolId,
          requestId: meta.requestId,
          metadata: { before: { name: before.name, npsn: before.npsn, address: before.address }, after: input },
        },
        tx,
      );
    });
    return this.get(auth);
  }

  async buildings(auth: AuthContext): Promise<BuildingView[]> {
    const rows = await this.prisma.building.findMany({
      where: { schoolId: auth.schoolId },
      orderBy: { code: 'asc' },
      include: { floors: { orderBy: { level: 'asc' }, include: { rooms: { orderBy: { code: 'asc' } } } } },
    });
    return rows.map((b) => ({
      id: b.id,
      code: b.code,
      name: b.name,
      floors: b.floors.map((f) => ({
        id: f.id,
        level: f.level,
        name: f.name,
        rooms: f.rooms.map((r) => ({ id: r.id, code: r.code, name: r.name, type: r.type, capacity: r.capacity, isActive: r.isActive })),
      })),
    }));
  }

  async createBuilding(auth: AuthContext, input: z.infer<typeof CreateBuildingSchema>, meta: RequestMeta) {
    const exists = await this.prisma.building.findUnique({ where: { schoolId_code: { schoolId: auth.schoolId, code: input.code } } });
    if (exists) throw conflict('Kode gedung sudah dipakai.', { code: ['Kode gedung sudah dipakai.'] });
    return this.prisma.$transaction(async (tx) => {
      const b = await tx.building.create({ data: { ...input, schoolId: auth.schoolId } });
      await this.audit.record(
        { schoolId: auth.schoolId, actorUserId: auth.userId, action: 'building.create', entityType: 'building', entityId: b.id, requestId: meta.requestId, metadata: input },
        tx,
      );
      return { id: b.id };
    });
  }

  async createFloor(auth: AuthContext, buildingId: string, input: z.infer<typeof CreateFloorSchema>, meta: RequestMeta) {
    const building = await this.prisma.building.findFirst({ where: { id: buildingId, schoolId: auth.schoolId } });
    if (!building) throw new NotFoundException('Gedung tidak ditemukan.');
    const exists = await this.prisma.floor.findUnique({ where: { buildingId_level: { buildingId, level: input.level } } });
    if (exists) throw conflict('Lantai tersebut sudah ada di gedung ini.', { level: ['Lantai sudah ada.'] });
    return this.prisma.$transaction(async (tx) => {
      const f = await tx.floor.create({ data: { ...input, buildingId } });
      await this.audit.record(
        { schoolId: auth.schoolId, actorUserId: auth.userId, action: 'floor.create', entityType: 'floor', entityId: f.id, requestId: meta.requestId, metadata: { buildingId, ...input } },
        tx,
      );
      return { id: f.id };
    });
  }

  async createRoom(auth: AuthContext, input: z.infer<typeof CreateRoomSchema>, meta: RequestMeta) {
    const floor = await this.prisma.floor.findFirst({ where: { id: input.floorId, building: { schoolId: auth.schoolId } } });
    if (!floor) throw new NotFoundException('Lantai tidak ditemukan.');
    const exists = await this.prisma.room.findUnique({ where: { buildingId_code: { buildingId: floor.buildingId, code: input.code } } });
    if (exists) throw conflict('Kode ruang sudah dipakai di gedung ini.', { code: ['Kode ruang sudah dipakai di gedung ini.'] });
    return this.prisma.$transaction(async (tx) => {
      const r = await tx.room.create({
        data: { buildingId: floor.buildingId, floorId: floor.id, code: input.code, name: input.name, type: input.type, capacity: input.capacity ?? null },
      });
      await this.audit.record(
        { schoolId: auth.schoolId, actorUserId: auth.userId, action: 'room.create', entityType: 'room', entityId: r.id, requestId: meta.requestId, metadata: input },
        tx,
      );
      return { id: r.id };
    });
  }

  async updateRoom(auth: AuthContext, roomId: string, input: z.infer<typeof UpdateRoomSchema>, meta: RequestMeta) {
    const room = await this.prisma.room.findFirst({ where: { id: roomId, floor: { building: { schoolId: auth.schoolId } } } });
    if (!room) throw new NotFoundException('Ruang tidak ditemukan.');
    await this.prisma.$transaction(async (tx) => {
      await tx.room.update({ where: { id: roomId }, data: input });
      await this.audit.record(
        {
          schoolId: auth.schoolId,
          actorUserId: auth.userId,
          action: 'room.update',
          entityType: 'room',
          entityId: roomId,
          requestId: meta.requestId,
          metadata: { before: { name: room.name, type: room.type, capacity: room.capacity, isActive: room.isActive }, after: input },
        },
        tx,
      );
    });
  }
}
