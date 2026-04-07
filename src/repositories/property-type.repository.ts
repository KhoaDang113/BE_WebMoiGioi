import prisma from "../config/database.js";
import { Prisma } from "@prisma/client";

export class PropertyTypeRepository {
  async findAll() {
    return prisma.propertyType.findMany({
      orderBy: {
        name: "asc",
      },
    });
  }

  async findById(id: number) {
    return prisma.propertyType.findUnique({
      where: { id },
    });
  }

  async findByName(name: string) {
    return prisma.propertyType.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });
  }

  async create(data: { name: string }) {
    return prisma.propertyType.create({
      data,
    });
  }

  async update(id: number, data: { name: string }) {
    return prisma.propertyType.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return prisma.propertyType.delete({
      where: { id },
    });
  }

  async getCountListingsAssigned(id: number) {
    return prisma.listing.count({
      where: {
        propertyTypeId: id
      }
    });
  }
}
